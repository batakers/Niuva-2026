import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma, type DurableOutboxMessage } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { BoundDatabaseService } from "@/modules/database-binding/service";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import { DurableOutboxService } from "@/modules/outbox/service";
import { PrismaOutboxWorkerRepository } from "@/modules/outbox/worker-repository";
import type { LegacyOutboxInput, LegacyOutboxPurpose } from "@/modules/outbox/core";
import { outboxMetadataSchema } from "@/modules/outbox/core";
import { DurableOutboxWorker } from "@/modules/outbox/worker";
import { CustomerOutboxSender } from "@/modules/outbox/customer-sender";
import type { OutboxSender, DeliveryOutcome, WorkerPolicy } from "@/modules/outbox/worker-core";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { closureIdentityHash } from "@/modules/customer-privacy/core";
import { createCustomerAuthMailer } from "@/modules/customer-auth/email-mailer";
import { createPrivacyMailer } from "@/modules/customer-privacy/mailer";

const prisma = getPrismaClient(), repository = new PrismaOutboxWorkerRepository(), bindingId = randomUUID();
const cipher = new OutboxPayloadCipher({ activeKeyId: "worker-fixture", keys: { "worker-fixture": Buffer.alloc(32, 13).toString("base64") } });
const customers: string[] = [], pendings: string[] = [], proofs: string[] = [], fences: string[] = [];
let ownsMarker = false;
type Fixture = LegacyOutboxInput & { ownerId: string; purpose: LegacyOutboxPurpose; to: string; sessionHash: string | null; row: DurableOutboxMessage };
function bound(capabilities = ["emailDelivery", "scheduledJobs"], overrides: Record<string, string | undefined> = {}) {
  return new BoundDatabaseService({ context: { env: { NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "sandbox", APP_URL: "https://staging.example.test", DATABASE_URL: process.env.TEST_DATABASE_URL, NIUVA_DATABASE_BINDING_ID: bindingId, RESEND_API_KEY: "synthetic-worker", EMAIL_FROM: "fixture@example.test", ...overrides }, hasActivationGrant: (tier, capability) => tier === "staging" && capabilities.includes(capability) }, repositoryFactory: () => new PrismaDatabaseBindingRepository(prisma) });
}
async function fixture(purpose: LegacyOutboxPurpose = "AUTH_VERIFY"): Promise<Fixture> {
  const now = new Date(), ownerId = randomUUID(), to = `worker-${ownerId}@example.test`, token = createOpaqueToken(), expiresAt = new Date(now.getTime() + 900_000);
  let proofId: string, sessionHash: string | null = null;
  if (purpose === "AUTH_VERIFY") {
    pendings.push(ownerId);
    await prisma.customerPendingRegistration.create({ data: { id: ownerId, email: to, normalizedEmail: to, displayName: "Worker fixture", passwordHash: "synthetic-password-hash", handleHash: hashOpaqueToken(randomUUID()), termsVersion: "fixture-terms", privacyVersion: "fixture-privacy", consentAt: now, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now, expiresAt } });
    proofId = (await prisma.customerEmailToken.create({ data: { pendingId: ownerId, purpose: "verify", tokenHash: hashOpaqueToken(token), returnTo: "/checkout", expiresAt } })).id;
  } else {
    customers.push(ownerId);
    await prisma.customer.create({ data: { id: ownerId, email: to, normalizedEmail: to, emailVerifiedAt: now, passwordCredential: { create: { passwordHash: "synthetic-password-hash" } } } });
    if (purpose === "AUTH_RESET") proofId = (await prisma.customerEmailToken.create({ data: { customerId: ownerId, purpose: "reset", tokenHash: hashOpaqueToken(token), returnTo: "/account", expiresAt } })).id;
    else {
      sessionHash = hashOpaqueToken(randomUUID());
      await prisma.customerSession.create({ data: { customerId: ownerId, tokenHash: sessionHash, expiresAt: new Date(now.getTime() + 3_600_000) } });
      proofId = (await prisma.customerPrivacyConfirmation.create({ data: { customerId: ownerId, sessionHash, tokenHash: hashOpaqueToken(token), purpose: purpose === "PRIVACY_EXPORT" ? "EXPORT" : "CLOSE", expiresAt } })).id;
    }
  }
  proofs.push(proofId);
  const kind = purpose.startsWith("AUTH") ? "AUTH" : "PRIVACY";
  const receipt = await new DurableOutboxService({ bound: bound(), repository, cipherFactory: () => cipher }).enqueue({ kind, proofId, token });
  const row = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: receipt.id } });
  return { kind, proofId, token, ownerId, purpose, to, sessionHash, row };
}
async function transaction<T>(work: (tx: Prisma.TransactionClient, now: Date) => Promise<T>) {
  return prisma.$transaction(async tx => { await repository.lock(tx); return work(tx, await repository.now(tx)); });
}
async function claim(f: Fixture) { return transaction((tx, now) => repository.claim(tx, f.row, randomUUID(), now, new Date(now.getTime() + 60_000))); }
async function makeExpired(f: Fixture) {
  const createdAt = new Date(Date.now() - 10_000);
  await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { createdAt, dueAt: createdAt, expiresAt: new Date(Date.now() - 1000) } });
}
beforeAll(async () => {
  getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
  if (await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })) throw new Error("Foreign database marker; use an isolated test database.");
  await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "staging" } }); ownsMarker = true;
});
afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.durableOutboxMessage.deleteMany({ where: { proofId: { in: proofs } } });
  await prisma.customerPrivacyConfirmation.deleteMany({ where: { id: { in: proofs } } });
  await prisma.customerEmailToken.deleteMany({ where: { id: { in: proofs } } });
  await prisma.customerPendingRegistration.deleteMany({ where: { id: { in: pendings } } });
  await prisma.customer.deleteMany({ where: { id: { in: customers } } });
  await prisma.customerClosureFence.deleteMany({ where: { identityHash: { in: fences } } });
  customers.length = 0; pendings.length = 0; proofs.length = 0; fences.length = 0;
});
afterAll(async () => { if (ownsMarker) await prisma.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } }); });

describe("outbox worker persistence", () => {
  it("selects due candidates in stable order with a bounded read-only limit", async () => {
    const rows = [await fixture(), await fixture(), await fixture()], now = new Date(), createdAt = new Date(now.getTime() - 10_000);
    for (const [i, f] of rows.entries()) await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { createdAt, dueAt: new Date(now.getTime() - 3000 + i * 100) } });
    const candidates = await transaction((tx, at) => repository.candidates(tx, at, 2, false));
    expect(candidates.map(row => row.id)).toEqual(rows.slice(0, 2).map(f => f.row.id));
    expect(await prisma.durableOutboxMessage.count({ where: { proofId: { in: proofs }, state: "PENDING", attempts: 0 } })).toBe(3);
    await prisma.durableOutboxMessage.update({ where: { id: rows[0].row.id }, data: { dueAt: new Date(now.getTime() + 60_000) } });
    expect((await transaction((tx, at) => repository.candidates(tx, at, 100, false))).map(row => row.id)).toEqual(rows.slice(1).map(f => f.row.id));
  });
  it("skips a candidate locked by another transaction", async () => {
    const first = await fixture(), second = await fixture(); let entered!: () => void, release!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; }), hold = new Promise<void>(resolve => { release = resolve; });
    const holder = prisma.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM durable_outbox_messages WHERE id = ${first.row.id}::uuid FOR UPDATE`; entered(); await hold; });
    await ready;
    try { expect((await transaction((tx, now) => repository.candidates(tx, now, 1, true)))[0]?.id).toBe(second.row.id); }
    finally { release(); await holder; }
  });
  it("claims one lease and attempt without replacing immutable payload or deadline", async () => {
    const f = await fixture(), leased = await claim(f);
    expect(leased).toMatchObject({ id: f.row.id, state: "LEASED", attempts: 1, sealedPayload: f.row.sealedPayload, expiresAt: f.row.expiresAt });
    expect(leased.leaseId).toMatch(/^[a-f0-9-]{36}$/); expect(leased.leaseExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    await expect(claim(f)).rejects.toThrow();
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ leaseId: leased.leaseId, attempts: 1 });
  });
  it("rolls back lease and attempt with the owning transaction", async () => {
    const f = await fixture();
    await expect(transaction(async (tx, now) => { await repository.claim(tx, f.row, randomUUID(), now, new Date(now.getTime() + 1000)); throw new Error("synthetic rollback"); })).rejects.toThrow("synthetic rollback");
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "PENDING", attempts: 0, leaseId: null, sealedPayload: f.row.sealedPayload });
  });
  it("rejects finalize from a different lease without changing the winner", async () => {
    const f = await fixture(), leased = await claim(f);
    expect(await transaction((tx, now) => repository.finishOwned(tx, { ...leased, leaseId: randomUUID() }, now, { state: "ACCEPTED", failureCategory: null, providerReference: "stale" }))).toBe(false);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: leased.id } })).toMatchObject({ state: "LEASED", leaseId: leased.leaseId, providerReference: null });
  });
  it("rejects finalize when the lease has expired", async () => {
    const f = await fixture(), leased = await claim(f), at = new Date();
    await prisma.durableOutboxMessage.update({ where: { id: leased.id }, data: { createdAt: new Date(at.getTime() - 5000), dueAt: new Date(at.getTime() - 4000), leaseExpiresAt: new Date(at.getTime() - 100) } });
    expect(await transaction((tx, now) => repository.finishOwned(tx, leased, now, { state: "ACCEPTED", failureCategory: null }))).toBe(false);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: leased.id } })).toMatchObject({ state: "LEASED", providerReference: null });
  });
  it("accepts once, scrubs payload/lease and never overwrites a terminal result", async () => {
    const f = await fixture(), leased = await claim(f);
    expect(await transaction((tx, now) => repository.finishOwned(tx, leased, now, { state: "ACCEPTED", failureCategory: null, providerReference: "provider-1" }))).toBe(true);
    const terminal = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: leased.id } });
    expect(terminal).toMatchObject({ state: "ACCEPTED", providerReference: "provider-1", sealedPayload: null, leaseId: null, leaseExpiresAt: null, expiresAt: f.row.expiresAt }); expect(terminal.terminalAt).not.toBeNull();
    expect(await transaction((tx, now) => repository.finishOwned(tx, leased, now, { state: "FAILED", failureCategory: "OUTCOME_UNKNOWN" }))).toBe(false);
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: leased.id } })).toEqual(terminal);
    expect(await prisma.customerPendingRegistration.findUnique({ where: { id: f.ownerId } })).toMatchObject({ deliveryConfirmed: false });
  });
  it("reschedules retry without replacing ciphertext, attempts or expiry", async () => {
    const f = await fixture(), leased = await claim(f), dueAt = new Date(Date.now() + 10_000);
    expect(await transaction((tx, now) => repository.finishOwned(tx, leased, now, { state: "PENDING", dueAt, failureCategory: "RETRYABLE" }))).toBe(true);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: leased.id } })).toMatchObject({ state: "PENDING", dueAt, attempts: 1, sealedPayload: f.row.sealedPayload, expiresAt: f.row.expiresAt, leaseId: null, terminalAt: null });
  });
  it.each(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"] as const)("updates only the delivery flag of a still-valid %s proof", async purpose => {
    const f = await fixture(purpose);
    await transaction(async (tx, now) => { const proof = await repository.proof(tx, f, now); expect(proof).not.toBeNull(); await repository.markDelivered(tx, proof!, now); });
    if (purpose === "AUTH_VERIFY") expect(await prisma.customerPendingRegistration.findUnique({ where: { id: f.ownerId } })).toMatchObject({ deliveryConfirmed: true });
    if (f.kind === "PRIVACY") expect(await prisma.customerPrivacyConfirmation.findUnique({ where: { id: f.proofId } })).toMatchObject({ delivered: true, consumedAt: null });
    if (f.kind === "AUTH") expect(await prisma.customerEmailToken.findUnique({ where: { id: f.proofId } })).toMatchObject({ consumedAt: null });
  });
  it.each(["AUTH_VERIFY", "PRIVACY_EXPORT"] as const)("does not authorize a consumed %s proof from an old projection", async purpose => {
    const f = await fixture(purpose), proof = await transaction((tx, now) => repository.proof(tx, f, now));
    if (f.kind === "AUTH") await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { consumedAt: new Date() } });
    else await prisma.customerPrivacyConfirmation.update({ where: { id: f.proofId }, data: { consumedAt: new Date() } });
    await transaction((tx, now) => repository.markDelivered(tx, proof!, now));
    if (f.kind === "AUTH") expect(await prisma.customerPendingRegistration.findUnique({ where: { id: f.ownerId } })).toMatchObject({ deliveryConfirmed: false });
    else expect(await prisma.customerPrivacyConfirmation.findUnique({ where: { id: f.proofId } })).toMatchObject({ delivered: false });
  });
  it("discards an unclaimed message once and scrubs its payload", async () => {
    const f = await fixture();
    expect(await transaction((tx, now) => repository.discard(tx, f.row, now, "FAILED", "RETRY_EXHAUSTED"))).toBe(true);
    const terminal = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } });
    expect(terminal).toMatchObject({ state: "FAILED", failureCategory: "RETRY_EXHAUSTED", sealedPayload: null, leaseId: null });
    expect(await transaction((tx, now) => repository.discard(tx, f.row, now, "EXPIRED", "EXPIRED"))).toBe(false);
    expect(await transaction((tx, now) => repository.discard(tx, terminal, now, "EXPIRED", "EXPIRED"))).toBe(false);
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(terminal);
  });
});

const policy: WorkerPolicy = { leaseMs: 60_000, sendTimeoutMs: 10_000, retryDelaysMs: [60_000] };
function worker(sender: OutboxSender, options: { capabilities?: string[]; env?: Record<string, string | undefined>; policy?: WorkerPolicy; cipherFactory?: () => OutboxPayloadCipher; repository?: PrismaOutboxWorkerRepository } = {}) {
  return new DurableOutboxWorker({ bound: bound(options.capabilities, options.env), repository: options.repository ?? repository, senderFactory: () => sender, cipherFactory: options.cipherFactory ?? (() => cipher), policy: options.policy ?? policy });
}
function fakeSender(send: OutboxSender["send"] = async () => ({ kind: "accepted", providerReference: "provider-fixture" })): OutboxSender {
  return { assertReady() {}, send, prepare(input) { if ("business" in input.payload) throw new Error("Auth/privacy fixture expected"); return { envelope: { from: "fixture@example.test", to: input.payload.to, subject: input.metadata.purpose, text: input.payload.token }, send: (_envelope, signal) => send(input, signal) }; } };
}
async function close(f: Fixture) { fences.push(closureIdentityHash(f.to)); await prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, f.ownerId, new Date()); }); }
async function invalidate(f: Fixture, change: string) {
  if (change === "closed") await close(f);
  if (change === "consumed") await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { consumedAt: new Date() } });
  if (change === "resend") { const replacement = await new CustomerEmailRepository(prisma).issueToken({ pendingId: f.ownerId, purpose: "verify", tokenHash: hashOpaqueToken(createOpaqueToken()), expiresAt: f.row.expiresAt, returnTo: "/checkout" }, new Date()); proofs.push(replacement.id); }
  if (change === "revoked") await prisma.customerSession.update({ where: { tokenHash: f.sessionHash! }, data: { revokedAt: new Date() } });
  if (change === "destination") await prisma.customer.update({ where: { id: f.ownerId }, data: { email: `changed-${f.to}`, normalizedEmail: `changed-${f.to}` } });
}
async function assertNotDelivered(f: Fixture) {
  const row = await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } });
  if (row && !["PENDING", "LEASED"].includes(row.state)) expect(row.sealedEnvelope).toBeNull();
  if (f.purpose === "AUTH_VERIFY") expect(await prisma.customerPendingRegistration.findUnique({ where: { id: f.ownerId } })).toMatchObject({ deliveryConfirmed: false });
  if (f.kind === "PRIVACY") expect(await prisma.customerPrivacyConfirmation.findUnique({ where: { id: f.proofId } })).toMatchObject({ delivered: false });
}

describe("outbox worker job and Customer mailers", () => {
  const mailSource = { NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "sandbox", NIUVA_CUSTOMER_AUTH_MOCK: "false", APP_URL: "http://127.0.0.1:3000", DATABASE_URL: "postgresql://fixture@127.0.0.1:55432/niuva_test?schema=public", RESEND_API_KEY: "synthetic-worker-key", EMAIL_FROM: "fixture@example.test" };
  it.each(["CANCELLED", "EXPIRED"] as const)("scrubs the persisted envelope through the existing %s cleanup boundary", async state => {
    const f = await fixture();
    await worker(fakeSender(async () => ({ kind: "retryable" }))).run({ mode: "execute", limit: 1 });
    expect((await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).sealedEnvelope).not.toBeNull();
    await transaction((tx, now) => repository.finish(tx, f.row.id, state, now));
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toMatchObject({ state, sealedPayload: null, sealedEnvelope: null });
  });
  it.each(["missing", "corrupt"])("preserves a retry row with %s provider envelope instead of rebuilding its body", async change => {
    const f = await fixture(); let sends = 0;
    const sender = fakeSender(async () => { sends++; return { kind: "retryable" }; });
    await worker(sender).run({ mode: "execute", limit: 1 });
    const before = await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { dueAt: f.row.createdAt, sealedEnvelope: change === "missing" ? null : "invalid-envelope" } });
    await expect(worker(sender).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(before); expect(sends).toBe(1);
  });
  it.each(["origin", "capability", "recipient"])("preserves a never-sent message on actual mailer %s rejection", async failure => {
    const f = await fixture(failure === "recipient" ? "PRIVACY_EXPORT" : "AUTH_VERIFY");
    const outbound = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "must-not-send" }));
    const source = failure === "origin" ? { ...mailSource, APP_URL: mailSource.APP_URL + "/path" }
      : failure === "capability" ? { ...mailSource, NIUVA_PROVIDER_MODE: "live" }
        : { ...mailSource, NODE_ENV: "development", NIUVA_RUNTIME_MODE: "live", DATABASE_URL: "postgresql://fixture@127.0.0.1:55433/niuva_dev?schema=public", NIUVA_INTERNAL_AUTH_ENABLED: "true", NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test", NIUVA_INTERNAL_PASSWORD_EMAIL: "other@example.test" };
    const sender = new CustomerOutboxSender({ auth: createCustomerAuthMailer(source), privacy: createPrivacyMailer(source) });
    await expect(worker(sender).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 });
    expect(outbound).not.toHaveBeenCalled();
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(f.row);
    await assertNotDelivered(f);
  });
  it.each(["lease", "proof"])("does not start a sender after a delayed claim exhausts its %s budget", async boundary => {
    const f = await fixture(); let reads = 0, sends = 0;
    class DelayedClaimRepository extends PrismaOutboxWorkerRepository {
      override async now(tx: Prisma.TransactionClient) { const at = await super.now(tx); return ++reads === 2 && boundary === "proof" ? new Date(f.row.expiresAt.getTime() - 80) : at; }
      override async claim(...args: Parameters<PrismaOutboxWorkerRepository["claim"]>) { const row = await super.claim(...args); await new Promise(resolve => setTimeout(resolve, 140)); return row; }
    }
    await worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; }), { repository: new DelayedClaimRepository(), policy: boundary === "lease" ? { ...policy, leaseMs: 80, sendTimeoutMs: 40 } : policy }).run({ mode: "execute", limit: 1 });
    expect(sends).toBe(0); await assertNotDelivered(f);
  });
  it.each(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"] as const)("reuses the encrypted provider body for %s after reconstructing the worker and mailer", async purpose => {
    const f = await fixture(purpose), bodies: string[] = [], keys: string[] = [];
    const outbound = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, options) => {
      bodies.push(String(options?.body)); keys.push(new Headers(options?.headers).get("Idempotency-Key")!);
      return bodies.length === 1 ? Response.json({ name: "concurrent_idempotent_requests" }, { status: 409 })
        : bodies[1] === bodies[0] ? Response.json({ id: "reconstructed-provider" }) : Response.json({ name: "invalid_idempotent_request" }, { status: 409 });
    });
    const source = purpose.startsWith("AUTH") ? mailSource : { ...mailSource, NODE_ENV: "development", NIUVA_RUNTIME_MODE: "live", DATABASE_URL: "postgresql://fixture@127.0.0.1:55433/niuva_dev?schema=public", NIUVA_INTERNAL_AUTH_ENABLED: "true", NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test", NIUVA_INTERNAL_PASSWORD_EMAIL: f.to };
    const sender = (configuration: Record<string, string>) => new CustomerOutboxSender({ auth: createCustomerAuthMailer(configuration), privacy: createPrivacyMailer(configuration) });
    expect(await worker(sender(source)).run({ mode: "execute", limit: 1 })).toMatchObject({ retried: 1 });
    const retry = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } });
    await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { dueAt: f.row.createdAt } });
    expect(await worker(sender({ ...source, APP_URL: "http://127.0.0.1:3001", EMAIL_FROM: "changed@example.test" })).run({ mode: "execute", limit: 1 })).toMatchObject({ accepted: 1, failed: 0 });
    expect(outbound).toHaveBeenCalledTimes(2); expect(bodies[1]).toBe(bodies[0]); expect(keys).toEqual([f.row.messageKey, f.row.messageKey]);
    const sealed = Reflect.get(retry, "sealedEnvelope"); expect(typeof sealed).toBe("string"); expect(String(sealed)).not.toContain(f.token); expect(String(sealed)).not.toContain(f.to);
    expect(Reflect.get(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } }), "sealedEnvelope")).toBeNull();
  });
  it("includes transaction commit/return latency in the pre-send lease budget", async () => {
    const f = await fixture(), authority = bound(); let returns = 0, sends = 0;
    const delayed: Pick<BoundDatabaseService, "run"> = { async run(operation, work) {
      const result = await authority.run(operation, work);
      if (operation === "outbox" && ++returns === 1) await new Promise(resolve => setTimeout(resolve, 140));
      return result;
    } };
    const sender = fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; });
    const job = new DurableOutboxWorker({ bound: delayed, repository, cipherFactory: () => cipher, senderFactory: () => sender, policy: { ...policy, leaseMs: 80, sendTimeoutMs: 40 } });
    expect(await job.run({ mode: "execute", limit: 1 })).toMatchObject({ lostLease: 1, accepted: 0 }); expect(sends).toBe(0); await assertNotDelivered(f);
  });
  it.each(["retryable", "unknown"] as const)("stops the batch after %s and leaves later messages pending", async kind => {
    await fixture(); await fixture(); let sends = 0;
    const sender = fakeSender(async () => { sends++; return kind === "retryable" ? { kind, retryAfterMs: 120_000 } : { kind }; });
    expect(await worker(sender).run({ mode: "execute", limit: 100 })).toMatchObject({ scanned: 1, claimed: 1, cooldownMs: kind === "retryable" ? 120_000 : 0 }); expect(sends).toBe(1);
    expect(await prisma.durableOutboxMessage.count({ where: { proofId: { in: proofs }, state: "PENDING", attempts: 0 } })).toBe(1);
  });
  it("rechecks exact expiry after decryption before authorizing a send", async () => {
    const f = await fixture(); let reads = 0, sends = 0;
    class ExpiringClockRepository extends PrismaOutboxWorkerRepository { override async now(tx: Prisma.TransactionClient) { const at = await super.now(tx); return ++reads === 2 ? f.row.expiresAt : at; } }
    expect(await worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; }), { repository: new ExpiringClockRepository() }).run({ mode: "execute", limit: 1 })).toMatchObject({ expired: 1, claimed: 0 }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "EXPIRED", attempts: 0, sealedPayload: null });
  });
  it("rejects exact lease expiry before finalizing an accepted result", async () => {
    const f = await fixture(); let reads = 0;
    class ExpiredLeaseClockRepository extends PrismaOutboxWorkerRepository {
      override async now(tx: Prisma.TransactionClient) {
        const at = await super.now(tx);
        if (++reads === 3) return (await tx.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).leaseExpiresAt!;
        return at;
      }
    }
    expect(await worker(fakeSender(), { repository: new ExpiredLeaseClockRepository() }).run({ mode: "execute", limit: 1 })).toMatchObject({ lostLease: 1, accepted: 0 }); await assertNotDelivered(f);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "LEASED", providerReference: null });
  });
  it("fences an in-flight receipt when message metadata changes under its lease", async () => {
    const f = await fixture(), sender = fakeSender(async () => { await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { messageKey: `${f.row.messageKey}:changed` } }); return { kind: "accepted", providerReference: "stale-metadata" }; });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ lostLease: 1, accepted: 0 }); await assertNotDelivered(f);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "LEASED", providerReference: null });
  });
  it("rejects a wrong bound database before claiming or invoking sender", async () => {
    const f = await fixture(); let sends = 0;
    await expect(worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; }), { env: { NIUVA_DATABASE_BINDING_ID: randomUUID() } }).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(f.row);
  });
  it("fails an already exhausted pending row without constructing sender or cipher", async () => {
    const f = await fixture(); await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { attempts: 2 } });
    const allocate = () => { throw new Error("must not allocate"); };
    expect(await new DurableOutboxWorker({ bound: bound(), repository, senderFactory: allocate, cipherFactory: allocate, policy }).run({ mode: "execute", limit: 1 })).toMatchObject({ failed: 1, claimed: 0 });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "FAILED", failureCategory: "RETRY_EXHAUSTED", sealedPayload: null, attempts: 2 });
  });
  it.each(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"] as const)("connects queued %s to its Customer mailer and records acceptance atomically", async purpose => {
    const f = await fixture(purpose), received: unknown[] = [];
    const mailer = { async send(input: unknown) { received.push(input); return { id: "customer-provider" }; }, prepare(input: { to: string; token: string }) { return { envelope: { from: "fixture@example.test", to: input.to, subject: purpose, text: input.token }, send: async (_envelope: unknown, idempotencyKey: string, signal?: AbortSignal) => mailer.send({ ...input, idempotencyKey, signal }) }; } };
    const sender = new CustomerOutboxSender({ auth: mailer, privacy: mailer });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ scanned: 1, claimed: 1, accepted: 1, failed: 0 });
    expect(received).toHaveLength(1); expect(received[0]).toMatchObject({ token: f.token, to: f.to, idempotencyKey: f.row.messageKey });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "ACCEPTED", providerReference: "customer-provider", sealedPayload: null, leaseId: null, attempts: 1 });
    if (purpose === "AUTH_VERIFY") expect(await prisma.customerPendingRegistration.findUnique({ where: { id: f.ownerId } })).toMatchObject({ deliveryConfirmed: true });
    if (f.kind === "PRIVACY") expect(await prisma.customerPrivacyConfirmation.findUnique({ where: { id: f.proofId } })).toMatchObject({ delivered: true, consumedAt: null });
  });
  it("dry-runs with job authority alone, without sender/email/key allocation or writes", async () => {
    const f = await fixture(); let allocated = false;
    const allocate = () => { allocated = true; throw new Error("private-key-fixture"); };
    const w = new DurableOutboxWorker({ bound: bound(["scheduledJobs"], { RESEND_API_KEY: undefined, EMAIL_FROM: undefined }), repository, cipherFactory: allocate, senderFactory: allocate, policy });
    expect(await w.run({ mode: "dry-run", limit: 1 })).toMatchObject({ mode: "dry-run", scanned: 1, claimed: 0, accepted: 0 }); expect(allocated).toBe(false);
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(f.row);
    await expect(w.run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" }); expect(allocated).toBe(false);
  });
  it("requires job authority even when email delivery is granted", async () => {
    const f = await fixture(); let sends = 0;
    await expect(worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; }), { capabilities: ["emailDelivery"] }).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ attempts: 0, state: "PENDING" });
  });
  it("bounds each run and never sends accepted messages again after a new worker instance", async () => {
    await fixture(); await fixture(); let sends = 0;
    const sender = fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ scanned: 1, accepted: 1 }); expect(sends).toBe(1);
    expect(await worker(sender).run({ mode: "execute", limit: 100 })).toMatchObject({ scanned: 1, accepted: 1 }); expect(sends).toBe(2);
    expect(await worker(sender).run({ mode: "execute", limit: 100 })).toMatchObject({ scanned: 0, claimed: 0 }); expect(sends).toBe(2);
  });
  it("sends outside database transactions and prevents a concurrent worker from sending the same lease", async () => {
    await fixture(); let entered!: () => void, release!: () => void, sends = 0;
    const ready = new Promise<void>(resolve => { entered = resolve; }), hold = new Promise<void>(resolve => { release = resolve; });
    const sender = fakeSender(async () => { sends++; entered(); await hold; return { kind: "accepted", providerReference: null }; });
    const first = worker(sender).run({ mode: "execute", limit: 1 });
    await Promise.race([ready, first.then(() => expect.fail("sender must start"))]);
    try { expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ scanned: 0, claimed: 0 }); expect(sends).toBe(1); }
    finally { release(); }
    expect(await first).toMatchObject({ accepted: 1 });
  });
  it("retries only when due, retaining key/content/cipher/deadline and provider cooldown", async () => {
    const f = await fixture(), calls: string[] = []; let sends = 0;
    const sender = fakeSender(async input => { calls.push(JSON.stringify(input)); return ++sends === 1 ? { kind: "retryable", retryAfterMs: 120_000 } : { kind: "accepted", providerReference: "second-attempt" }; });
    const before = Date.now(); expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ retried: 1, accepted: 0 });
    const retry = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } });
    expect(retry).toMatchObject({ state: "PENDING", attempts: 1, sealedPayload: f.row.sealedPayload, expiresAt: f.row.expiresAt, leaseId: null }); expect(retry.dueAt.getTime()).toBeGreaterThanOrEqual(before + 120_000); await assertNotDelivered(f);
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ scanned: 0 }); expect(sends).toBe(1);
    await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { dueAt: f.row.createdAt } });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ accepted: 1 }); expect(calls[1]).toBe(calls[0]);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ attempts: 2, expiresAt: f.row.expiresAt });
  });
  it("snapshots the policy and stops when its original attempt budget is exhausted", async () => {
    const f = await fixture(), supplied = { ...policy, retryDelaysMs: [] as number[] };
    const w = worker(fakeSender(async () => ({ kind: "retryable" })), { policy: supplied }); supplied.retryDelaysMs.push(10); supplied.sendTimeoutMs = 1;
    expect(await w.run({ mode: "execute", limit: 1 })).toMatchObject({ failed: 1, retried: 0 });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "FAILED", failureCategory: "RETRY_EXHAUSTED", sealedPayload: null, expiresAt: f.row.expiresAt }); await assertNotDelivered(f);
  });
  it("does not schedule retry at or beyond the original expiry", async () => {
    const f = await fixture();
    expect(await worker(fakeSender(async () => ({ kind: "retryable" })), { policy: { ...policy, retryDelaysMs: [900_000] } }).run({ mode: "execute", limit: 1 })).toMatchObject({ expired: 1, retried: 0 });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "EXPIRED", expiresAt: f.row.expiresAt, sealedPayload: null }); await assertNotDelivered(f);
  });
  it("expires without constructing payload or sender dependencies", async () => {
    const f = await fixture(); await makeExpired(f); let allocated = false;
    const allocate = () => { allocated = true; throw new Error("must not allocate"); };
    const w = new DurableOutboxWorker({ bound: bound(), repository, cipherFactory: allocate, senderFactory: allocate, policy });
    expect(await w.run({ mode: "execute", limit: 1 })).toMatchObject({ expired: 1, claimed: 0 }); expect(allocated).toBe(false);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "EXPIRED", sealedPayload: null, attempts: 0 });
  });
  it("fails an abandoned lease as unknown without a new external send", async () => {
    const f = await fixture(), leased = await claim(f), at = Date.now(); let sends = 0;
    await prisma.durableOutboxMessage.update({ where: { id: leased.id }, data: { createdAt: new Date(at - 5000), dueAt: new Date(at - 4000), leaseExpiresAt: new Date(at - 100) } });
    expect(await worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; })).run({ mode: "execute", limit: 1 })).toMatchObject({ failed: 1, unknown: 1, claimed: 0 }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "FAILED", failureCategory: "OUTCOME_UNKNOWN", sealedPayload: null, attempts: 1 }); await assertNotDelivered(f);
  });
  it.each(["consumed", "resend", "closed", "revoked", "destination"])("cancels before calling sender after %s", async change => {
    const f = await fixture(change === "revoked" ? "PRIVACY_EXPORT" : ["closed", "destination"].includes(change) ? "AUTH_RESET" : "AUTH_VERIFY"); let sends = 0;
    await invalidate(f, change);
    expect(await worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; })).run({ mode: "execute", limit: 1 })).toMatchObject({ cancelled: 1, claimed: 0 }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "CANCELLED", sealedPayload: null });
  });
  it.each(["consumed", "resend", "closed", "revoked", "destination"])("records in-flight acceptance without authorizing changed proof after %s", async change => {
    const f = await fixture(["closed", "revoked"].includes(change) ? "PRIVACY_EXPORT" : change === "destination" ? "AUTH_RESET" : "AUTH_VERIFY");
    const sender = fakeSender(async () => { await invalidate(f, change); return { kind: "accepted", providerReference: "in-flight-receipt" }; });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ accepted: 1 });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "ACCEPTED", failureCategory: "PROOF_INVALID_AFTER_SEND", sealedPayload: null, providerReference: "in-flight-receipt" }); await assertNotDelivered(f);
  });
  it.each(["permanent", "unknown"] as const)("stops %s outcome and never authorizes or resends it", async kind => {
    const f = await fixture("PRIVACY_CLOSE"); let sends = 0;
    const sender = fakeSender(async () => { sends++; return { kind }; });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ failed: 1, unknown: kind === "unknown" ? 1 : 0 });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "FAILED", sealedPayload: null }); await assertNotDelivered(f);
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ scanned: 0 }); expect(sends).toBe(1);
  });
  it("times out an ignoring sender and ignores its late accepted result", async () => {
    const f = await fixture(); let resolve!: (outcome: DeliveryOutcome) => void, captured: AbortSignal | undefined;
    const pending = new Promise<DeliveryOutcome>(done => { resolve = done; });
    const sender = fakeSender(async (_input, signal) => { captured = signal; return pending; });
    expect(await worker(sender, { policy: { ...policy, sendTimeoutMs: 25 } }).run({ mode: "execute", limit: 1 })).toMatchObject({ failed: 1, unknown: 1 }); expect(captured?.aborted).toBe(true);
    const terminal = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } }); resolve({ kind: "accepted", providerReference: "late-success" }); await Promise.resolve();
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(terminal); expect(terminal).toMatchObject({ state: "FAILED", failureCategory: "OUTCOME_UNKNOWN", providerReference: null }); await assertNotDelivered(f);
  });
  it.each(["replaced", "expired", "cancelled"])("fences late success when lease is %s", async change => {
    const f = await fixture(), sender = fakeSender(async () => {
      if (change === "replaced") await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { leaseId: randomUUID() } });
      if (change === "expired") { const at = Date.now(); await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { createdAt: new Date(at - 5000), dueAt: new Date(at - 4000), leaseExpiresAt: new Date(at - 100) } }); }
      if (change === "cancelled") await transaction((tx, now) => repository.finish(tx, f.row.id, "CANCELLED", now));
      return { kind: "accepted", providerReference: "stale-receipt" };
    });
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ lostLease: 1, accepted: 0 });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ providerReference: null }); await assertNotDelivered(f);
  });
  it("preserves an undecryptable payload without a claim, then allows recovery with the correct key", async () => {
    const f = await fixture(); let sends = 0;
    const sender = fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; });
    const wrongCipher = new OutboxPayloadCipher({ activeKeyId: "worker-fixture", keys: { "worker-fixture": Buffer.alloc(32, 14).toString("base64") } });
    await expect(worker(sender, { cipherFactory: () => wrongCipher }).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(f.row);
    expect(await worker(sender).run({ mode: "execute", limit: 1 })).toMatchObject({ accepted: 1 }); expect(sends).toBe(1);
  });
  it("retains the queued message when the selected Customer mailer is unavailable", async () => {
    const f = await fixture(), sender = new CustomerOutboxSender({ auth: null, privacy: null });
    await expect(worker(sender).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: f.row.id } })).toEqual(f.row);
  });
  it.each(["token", "to", "returnTo"])("rejects authenticated ciphertext whose %s disagrees with proof", async field => {
    const f = await fixture(), metadata = outboxMetadataSchema.parse({ id: f.row.id, messageKey: f.row.messageKey, proofKind: f.row.proofKind, proofId: f.row.proofId, purpose: f.row.purpose, templateVersion: f.row.templateVersion, fingerprint: f.row.fingerprint, expiresAt: f.row.expiresAt });
    const payload = { to: f.to, token: f.token, returnTo: "/checkout", [field]: field === "token" ? createOpaqueToken() : field === "to" ? "changed@example.test" : "/account" };
    await prisma.durableOutboxMessage.update({ where: { id: f.row.id }, data: { sealedPayload: cipher.seal(payload, metadata) } }); let sends = 0;
    expect(await worker(fakeSender(async () => { sends++; return { kind: "accepted", providerReference: null }; })).run({ mode: "execute", limit: 1 })).toMatchObject({ cancelled: 1 }); expect(sends).toBe(0);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ sealedPayload: null, state: "CANCELLED" });
  });
  it("rolls back acceptance and proof flags together on a database write failure", async () => {
    const f = await fixture();
    class FailingRepository extends PrismaOutboxWorkerRepository { override async markDelivered() { throw new Error("private-write-fixture"); } }
    await expect(worker(fakeSender(), { repository: new FailingRepository() }).run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: f.row.id } })).toMatchObject({ state: "LEASED", providerReference: null, attempts: 1, sealedPayload: f.row.sealedPayload }); await assertNotDelivered(f);
  });
});
