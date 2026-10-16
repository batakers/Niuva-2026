import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type DurableOutboxMessage } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { closureIdentityHash } from "@/modules/customer-privacy/core";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { BoundDatabaseService } from "@/modules/database-binding/service";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";
import { outboxIdentity, type OutboxInput, type OutboxPurpose, type ProofProjection } from "@/modules/outbox/core";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import { PrismaOutboxRepository } from "@/modules/outbox/repository";
import { DurableOutboxService, type OutboxTransaction } from "@/modules/outbox/service";

const prisma = getPrismaClient(), repository = new PrismaOutboxRepository();
const bindingId = randomUUID();
const cipher = new OutboxPayloadCipher({ activeKeyId: "integration-v1", keys: { "integration-v1": Buffer.alloc(32, 11).toString("base64") } });
let ownsMarker = false;
const customers: string[] = [], pendings: string[] = [], proofs: string[] = [], fences: string[] = [];
type Fixture = OutboxInput & { ownerId: string; to: string; purpose: OutboxPurpose; expiresAt: Date; sessionHash: string | null };

async function fixture(purpose: OutboxPurpose = "AUTH_VERIFY"): Promise<Fixture> {
  const now = new Date(), ownerId = randomUUID(), to = `outbox-${ownerId}@example.test`, token = createOpaqueToken();
  const expiresAt = new Date(now.getTime() + (purpose.startsWith("PRIVACY") ? 900_000 : 1_800_000));
  if (purpose === "AUTH_VERIFY") {
    pendings.push(ownerId);
    await prisma.customerPendingRegistration.create({ data: { id: ownerId, email: to, normalizedEmail: to, displayName: "Outbox fixture", passwordHash: "synthetic-password-hash", handleHash: hashOpaqueToken(randomUUID()), termsVersion: "fixture-terms", privacyVersion: "fixture-privacy", consentAt: now, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now, expiresAt } });
    const record = await prisma.customerEmailToken.create({ data: { pendingId: ownerId, purpose: "verify", tokenHash: hashOpaqueToken(token), returnTo: "/checkout", expiresAt } });
    proofs.push(record.id);
    return { kind: "AUTH", proofId: record.id, token, ownerId, to, purpose, expiresAt, sessionHash: null };
  }
  customers.push(ownerId);
  await prisma.customer.create({ data: { id: ownerId, email: to, normalizedEmail: to, emailVerifiedAt: now, passwordCredential: { create: { passwordHash: "synthetic-password-hash" } } } });
  if (purpose === "AUTH_RESET") {
    const record = await prisma.customerEmailToken.create({ data: { customerId: ownerId, purpose: "reset", tokenHash: hashOpaqueToken(token), returnTo: "/account", expiresAt } });
    proofs.push(record.id);
    return { kind: "AUTH", proofId: record.id, token, ownerId, to, purpose, expiresAt, sessionHash: null };
  }
  const sessionHash = hashOpaqueToken(randomUUID());
  await prisma.customerSession.create({ data: { customerId: ownerId, tokenHash: sessionHash, expiresAt: new Date(now.getTime() + 3_600_000) } });
  const record = await prisma.customerPrivacyConfirmation.create({ data: { customerId: ownerId, sessionHash, tokenHash: hashOpaqueToken(token), purpose: purpose === "PRIVACY_EXPORT" ? "EXPORT" : "CLOSE", expiresAt } });
  proofs.push(record.id);
  return { kind: "PRIVACY", proofId: record.id, token, ownerId, to, purpose, expiresAt, sessionHash };
}
function projection(f: Fixture): ProofProjection {
  return { kind: f.kind, proofId: f.proofId, purpose: f.purpose, to: f.to, tokenHash: hashOpaqueToken(f.token), returnTo: f.purpose === "AUTH_VERIFY" ? "/checkout" : f.purpose === "AUTH_RESET" ? "/account" : null, ownerId: f.ownerId, sessionHash: f.sessionHash, expiresAt: f.expiresAt };
}
function dataFor(p: ProofProjection) {
  const now = new Date();
  const meta = { id: randomUUID(), ...outboxIdentity(p), proofKind: p.kind, proofId: p.proofId, purpose: p.purpose, templateVersion: "v1" as const, expiresAt: p.expiresAt };
  return { ...meta, createdAt: now, dueAt: now, sealedPayload: cipher.seal({ to: p.to, token: "a".repeat(43), returnTo: p.returnTo }, meta) };
}
async function readProof(f: Fixture) { return prisma.$transaction(tx => repository.proof(tx, f, new Date())); }
async function rowFor(f: Fixture) { return prisma.durableOutboxMessage.create({ data: dataFor(projection(f)) }); }
function input(f: Fixture) { return { kind: f.kind, proofId: f.proofId, token: f.token }; }
function service(overrides: Record<string, string | undefined> = {}, capabilities = ["emailDelivery", "scheduledJobs"], cipherFactory = () => cipher) {
  const bound = new BoundDatabaseService({ context: {
    env: { NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "sandbox", APP_URL: "https://staging.example.test", DATABASE_URL: process.env.TEST_DATABASE_URL, NIUVA_DATABASE_BINDING_ID: bindingId, RESEND_API_KEY: "synthetic-config", EMAIL_FROM: "fixture@example.test", ...overrides },
    hasActivationGrant: (tier, capability) => tier === "staging" && capabilities.includes(capability),
  }, repositoryFactory: () => new PrismaDatabaseBindingRepository(prisma) });
  return new DurableOutboxService({ bound, repository, cipherFactory });
}
function metadata(row: DurableOutboxMessage) {
  return { id: row.id, messageKey: row.messageKey, proofKind: row.proofKind as OutboxInput["kind"], proofId: row.proofId, purpose: row.purpose as OutboxPurpose, templateVersion: "v1" as const, fingerprint: row.fingerprint, expiresAt: row.expiresAt };
}
async function makeExpired(row: DurableOutboxMessage) {
  const createdAt = new Date(Date.now() - 10_000);
  await prisma.durableOutboxMessage.update({ where: { id: row.id }, data: { createdAt, dueAt: createdAt, expiresAt: new Date(Date.now() - 1000) } });
}
function sqlState(error: unknown, depth = 0): string | undefined {
  if (depth > 6 || typeof error !== "object" || error === null) return undefined;
  const value = error as Record<string, unknown>;
  for (const key of ["code", "originalCode"]) if (typeof value[key] === "string" && /^[0-9A-Z]{5}$/.test(value[key]) && !value[key].startsWith("P")) return value[key];
  for (const key of ["meta", "cause", "driverAdapterError"]) { const code = sqlState(value[key], depth + 1); if (code) return code; }
}
async function rejectsConstraint(work: Promise<unknown>) {
  await work.then(() => expect.fail("database invariant must reject write"), (error: unknown) => expect(sqlState(error)).toBe("23514"));
}
beforeAll(async () => {
  getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
  if (await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })) throw new Error("Foreign database marker; use an isolated test database.");
  await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "staging" } }); ownsMarker = true;
});
afterEach(async () => {
  await prisma.durableOutboxMessage.deleteMany({ where: { proofId: { in: proofs } } });
  await prisma.customerPrivacyConfirmation.deleteMany({ where: { id: { in: proofs } } });
  await prisma.customerEmailToken.deleteMany({ where: { id: { in: proofs } } });
  await prisma.customerPendingRegistration.deleteMany({ where: { id: { in: pendings } } });
  await prisma.customer.deleteMany({ where: { id: { in: customers } } });
  await prisma.customerClosureFence.deleteMany({ where: { identityHash: { in: fences } } });
  customers.length = 0; pendings.length = 0; proofs.length = 0; fences.length = 0;
});
afterAll(async () => { if (ownsMarker) await prisma.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } }); });

describe("outbox proof authority", () => {
  it.each(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"] as const)("derives %s destination and expiry from the database", async purpose => {
    const f = await fixture(purpose), p = await readProof(f);
    expect(p).toMatchObject({ purpose, proofId: f.proofId, to: f.to, expiresAt: f.expiresAt, ownerId: f.ownerId });
  });
  it("rejects consumed, expired and wrong-kind proofs", async () => {
    const f = await fixture();
    await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { consumedAt: new Date() } }); expect(await readProof(f)).toBeNull();
    await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { consumedAt: null, expiresAt: new Date(0) } }); expect(await readProof(f)).toBeNull();
    expect(await readProof({ ...f, kind: "PRIVACY" })).toBeNull();
  });
  it("rejects a completed pending registration and an unrecorded age declaration", async () => {
    const f = await fixture();
    await prisma.customerPendingRegistration.update({ where: { id: f.ownerId }, data: { completedAt: new Date() } }); expect(await readProof(f)).toBeNull();
    await prisma.customerPendingRegistration.update({ where: { id: f.ownerId }, data: { completedAt: null, ageDeclarationVersion: null } }); expect(await readProof(f)).toBeNull();
  });
  it("rejects an intent created before account closure", async () => {
    const f = await fixture(), identityHash = closureIdentityHash(f.to); fences.push(identityHash);
    await prisma.customerClosureFence.create({ data: { identityHash, closedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) } });
    expect(await readProof(f)).toBeNull();
  });
  it("rejects an unsafe return destination", async () => {
    const f = await fixture(); await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { returnTo: "//external.example.test" } });
    expect(await readProof(f)).toBeNull();
  });
  it("requires an active password account for reset", async () => {
    const f = await fixture("AUTH_RESET");
    await prisma.customerPasswordCredential.delete({ where: { customerId: f.ownerId } }); expect(await readProof(f)).toBeNull();
  });
  it("caps expiry at the session and rejects revocation", async () => {
    const f = await fixture("PRIVACY_EXPORT"), expiresAt = new Date(Date.now() + 60_000);
    await prisma.customerSession.update({ where: { tokenHash: f.sessionHash! }, data: { expiresAt } });
    expect(await readProof(f)).toMatchObject({ expiresAt });
    await prisma.customerSession.update({ where: { tokenHash: f.sessionHash! }, data: { revokedAt: new Date() } }); expect(await readProof(f)).toBeNull();
  });
  it("caps expiry at the internal account deadline and rejects expiry", async () => {
    const f = await fixture("AUTH_RESET"), expiresAt = new Date(Date.now() + 60_000);
    await prisma.customer.update({ where: { id: f.ownerId }, data: { internalTestExpiresAt: expiresAt } }); expect(await readProof(f)).toMatchObject({ expiresAt });
    await prisma.customer.update({ where: { id: f.ownerId }, data: { internalTestExpiresAt: new Date(0) } }); expect(await readProof(f)).toBeNull();
  });
  it("does not attach a closed account proof to a new account with the same email", async () => {
    const f = await fixture("PRIVACY_CLOSE"); await prisma.customer.delete({ where: { id: f.ownerId } });
    const replacement = await prisma.customer.create({ data: { email: f.to, normalizedEmail: f.to, emailVerifiedAt: new Date() } }); customers.push(replacement.id);
    expect(await readProof(f)).toBeNull();
  });
});

describe("outbox database persistence", () => {
  it.each(["UTC", "Asia/Jakarta", "America/New_York"])("reads database time as UTC epoch in %s", async timezone => {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('TimeZone', ${timezone}, true)`;
      const epoch = await tx.$queryRaw<{ epoch: string }[]>`SELECT (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text AS "epoch"`;
      const now = await repository.now(tx);
      expect(Math.abs(now.getTime() - Number(epoch[0].epoch))).toBeLessThan(1000);
    });
  });
  it("stores one immutable row for duplicate proof identity", async () => {
    const f = await fixture(), data = dataFor(projection(f));
    const first = await prisma.$transaction(tx => repository.insert(tx, data));
    expect(first.row).toMatchObject({ id: data.id, state: "PENDING", attempts: 0, leaseId: null }); expect(first.duplicate).toBe(false);
    const duplicate = await prisma.$transaction(tx => repository.insert(tx, { ...data, id: randomUUID(), sealedPayload: "must-not-replace-original" }));
    expect(duplicate).toMatchObject({ row: { id: data.id, sealedPayload: data.sealedPayload }, duplicate: true });
    expect(await prisma.durableOutboxMessage.count({ where: { proofId: f.proofId } })).toBe(1);
  });
  it("rejects immutable conflicts without overwriting the winner", async () => {
    const f = await fixture(), data = dataFor(projection(f)); await prisma.$transaction(tx => repository.insert(tx, data));
    await expect(prisma.$transaction(tx => repository.insert(tx, { ...data, id: randomUUID(), fingerprint: "f".repeat(64) }))).rejects.toThrow();
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: data.id } })).toMatchObject({ fingerprint: data.fingerprint });
  });
  it("scrubs payload/lease once and preserves the deadline of a terminal message", async () => {
    const f = await fixture(), row = await rowFor(f), now = new Date();
    await prisma.$transaction(tx => repository.finish(tx, row.id, "CANCELLED", now));
    const terminal = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: row.id } });
    expect(terminal).toMatchObject({ state: "CANCELLED", sealedPayload: null, leaseId: null, terminalAt: now, expiresAt: row.expiresAt });
    await prisma.$transaction(tx => repository.finish(tx, row.id, "EXPIRED", new Date(now.getTime() + 1000)));
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: row.id } })).toEqual(terminal);
  });
  it.each([
    { state: "OTHER" }, { attempts: -1 }, { sealedPayload: null }, { state: "CANCELLED" },
    { dueAt: new Date(0) }, { proofKind: "PRIVACY" }, { leaseId: randomUUID() },
  ] satisfies Prisma.DurableOutboxMessageUpdateInput[])("enforces outbox state/lease/clock invariants in SQL %#", async mutation => {
    const row = await rowFor(await fixture());
    await rejectsConstraint(prisma.durableOutboxMessage.update({ where: { id: row.id }, data: mutation }));
  });
});

describe("transaction-bound durable outbox service", () => {
  it.each(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"] as const)("persists encrypted %s without claiming delivery", async purpose => {
    const f = await fixture(purpose), receipt = await service().enqueue(input(f));
    expect(receipt).toMatchObject({ state: "PENDING", duplicate: false, expiresAt: f.expiresAt });
    const row = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: receipt.id } });
    expect(JSON.stringify(row)).not.toContain(f.token); expect(JSON.stringify(row)).not.toContain(f.to);
    expect(cipher.open(row.sealedPayload!, metadata(row))).toEqual({ to: f.to, token: f.token, returnTo: purpose === "AUTH_VERIFY" ? "/checkout" : purpose === "AUTH_RESET" ? "/account" : null });
    if (purpose === "AUTH_VERIFY") expect(await prisma.customerPendingRegistration.findUnique({ where: { id: f.ownerId } })).toMatchObject({ deliveryConfirmed: false });
    if (f.kind === "PRIVACY") expect(await prisma.customerPrivacyConfirmation.findUnique({ where: { id: f.proofId } })).toMatchObject({ delivered: false });
    expect(await service().revalidate(receipt.id)).toMatchObject({ id: receipt.id, state: "PENDING" });
  });
  it("deduplicates concurrent enqueues and retains cipher/deadline after a new service instance", async () => {
    const f = await fixture(), results = await Promise.all(Array.from({ length: 8 }, () => service().enqueue(input(f))));
    expect(results.every(value => Boolean(value?.id))).toBe(true);
    expect(new Set(results.map(row => row.id)).size).toBe(1); expect(results.filter(row => row.duplicate).length).toBe(7);
    const first = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: results[0].id } });
    expect(await service().enqueue(input(f))).toMatchObject({ id: first.id, duplicate: true, expiresAt: f.expiresAt });
    expect(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: first.id } })).toEqual(first);
  });
  it("rejects a different token without creating a message", async () => {
    const f = await fixture(); await expect(service().enqueue({ ...input(f), token: createOpaqueToken() })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.durableOutboxMessage.count({ where: { proofId: f.proofId } })).toBe(0);
  });
  it("rolls back producer proof and queued message together", async () => {
    const f = await fixture(), proofId = randomUUID(), token = createOpaqueToken(); proofs.push(proofId);
    await expect(service().withTransaction(async context => {
      await context.tx.customerEmailToken.create({ data: { id: proofId, pendingId: f.ownerId, purpose: "verify", tokenHash: hashOpaqueToken(token), returnTo: "/checkout", expiresAt: f.expiresAt } });
      const receipt = await context.enqueue({ kind: "AUTH", proofId, token }); expect(receipt.state).toBe("PENDING");
      throw new Error("synthetic producer rollback");
    })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.customerEmailToken.findUnique({ where: { id: proofId } })).toBeNull();
    expect(await prisma.durableOutboxMessage.count({ where: { proofId } })).toBe(0);
  });
  it("uses fresh database time even if a producer mutates its clock snapshot", async () => {
    const f = await fixture();
    const result = await service().withTransaction(async context => { context.now.setUTCFullYear(2099); return context.enqueue(input(f)); });
    expect(result).toMatchObject({ expiresAt: f.expiresAt });
    expect(result.expiresAt).toEqual(f.expiresAt);
    expect((await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: result.id } })).createdAt.getUTCFullYear()).toBe(new Date().getUTCFullYear());
  });
  it("rejects an enqueue callback that escapes its transaction", async () => {
    const f = await fixture(); let escaped: OutboxTransaction["enqueue"] | undefined;
    await service().withTransaction(async context => { escaped = context.enqueue; });
    expect(escaped).toBeDefined(); await expect(escaped!(input(f))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.durableOutboxMessage.count({ where: { proofId: f.proofId } })).toBe(0);
  });
  it.each(["consumed", "resend", "closed", "revoked", "session-expired", "internal-expired", "destination", "returnTo"])("cancels and scrubs a queued message after %s", async change => {
    const f = await fixture(["revoked", "session-expired"].includes(change) ? "PRIVACY_EXPORT" : ["closed", "internal-expired", "destination"].includes(change) ? "AUTH_RESET" : "AUTH_VERIFY");
    const s = service(), queued = await s.enqueue(input(f));
    expect(queued).toMatchObject({ state: "PENDING" });
    if (change === "consumed") await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { consumedAt: new Date() } });
    if (change === "resend") { const replacement = await new CustomerEmailRepository(prisma).issueToken({ pendingId: f.ownerId, purpose: "verify", tokenHash: hashOpaqueToken(createOpaqueToken()), expiresAt: f.expiresAt, returnTo: "/checkout" }, new Date()); proofs.push(replacement.id); }
    if (change === "closed") {
      await prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, f.ownerId, new Date()); });
      const replacement = await prisma.customer.create({ data: { email: f.to, normalizedEmail: f.to } }); customers.push(replacement.id);
    }
    if (change === "revoked") await prisma.customerSession.update({ where: { tokenHash: f.sessionHash! }, data: { revokedAt: new Date() } });
    if (change === "session-expired") await prisma.customerSession.update({ where: { tokenHash: f.sessionHash! }, data: { expiresAt: new Date(0) } });
    if (change === "internal-expired") await prisma.customer.update({ where: { id: f.ownerId }, data: { internalTestExpiresAt: new Date(0) } });
    if (change === "destination") await prisma.customer.update({ where: { id: f.ownerId }, data: { email: `changed-${f.to}`, normalizedEmail: `changed-${f.to}` } });
    if (change === "returnTo") await prisma.customerEmailToken.update({ where: { id: f.proofId }, data: { returnTo: "/account" } });
    expect(await s.revalidate(queued.id)).toMatchObject({ state: "CANCELLED" });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: queued.id } })).toMatchObject({ sealedPayload: null, leaseId: null, failureCategory: "PROOF_INVALID", expiresAt: queued.expiresAt });
  });
  it.each([true, false])("rejects sibling verification after another registration creates the account (queued=%s)", async queuedBeforeVerification => {
    const winner = await fixture(), sibling = await fixture(), s = service();
    await prisma.customerPendingRegistration.update({ where: { id: sibling.ownerId }, data: { email: winner.to, normalizedEmail: winner.to } });
    const queued = queuedBeforeVerification ? await s.enqueue(input(sibling)) : null;
    const emailRepository = new CustomerEmailRepository(prisma);
    expect(await emailRepository.consumeVerification(winner.token, new Date())).toBe("/checkout");
    const created = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: winner.to } }); customers.push(created.id);
    expect(await prisma.customerPendingRegistration.findUnique({ where: { id: sibling.ownerId } })).toMatchObject({ completedAt: null });
    expect(await prisma.customerEmailToken.findUnique({ where: { id: sibling.proofId } })).toMatchObject({ consumedAt: null });
    await expect(emailRepository.consumeVerification(sibling.token, new Date())).rejects.toMatchObject({ code: "CONFLICT" });
    if (queued) {
      expect(await s.revalidate(queued.id)).toMatchObject({ state: "CANCELLED" });
      expect(await prisma.durableOutboxMessage.findUnique({ where: { id: queued.id } })).toMatchObject({ sealedPayload: null, leaseId: null, failureCategory: "PROOF_INVALID", expiresAt: queued.expiresAt });
    }
    await expect(s.enqueue(input(sibling))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.durableOutboxMessage.count({ where: { proofId: sibling.proofId } })).toBe(queued ? 1 : 0);
  });
  it("expires and scrubs payload before returning a receipt", async () => {
    const f = await fixture(), receipt = await service().enqueue(input(f));
    expect(receipt).toMatchObject({ state: "PENDING" });
    await makeExpired(await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { id: receipt.id } }));
    expect(await service().revalidate(receipt.id)).toMatchObject({ state: "EXPIRED" });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: receipt.id } })).toMatchObject({ sealedPayload: null });
  });
  it("bounds expiry cleanup and remains idempotent", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) { const row = await rowFor(await fixture()); ids.push(row.id); await makeExpired(row); }
    const s = service(); expect(await s.expireBatch(2)).toBe(2); expect(await s.expireBatch(2)).toBe(1); expect(await s.expireBatch(2)).toBe(0);
    expect(await prisma.durableOutboxMessage.count({ where: { id: { in: ids }, state: "EXPIRED", sealedPayload: null } })).toBe(3);
  });
  it("cleans with independent job authority when email/key configuration is unavailable", async () => {
    const f = await fixture(), row = await rowFor(f); await makeExpired(row);
    let allocated = false;
    const s = service({ RESEND_API_KEY: undefined, EMAIL_FROM: undefined }, ["scheduledJobs"], () => { allocated = true; throw new Error("synthetic unavailable key"); });
    expect(await s.expireBatch()).toBe(1); expect(allocated).toBe(false);
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: row.id } })).toMatchObject({ state: "EXPIRED", sealedPayload: null });
    await expect(s.enqueue(input(f))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
  it("never resurrects a terminal message on a duplicate enqueue", async () => {
    const f = await fixture(), s = service(), queued = await s.enqueue(input(f));
    expect(queued).toMatchObject({ state: "PENDING" });
    await prisma.$transaction(async tx => repository.finish(tx, queued.id, "CANCELLED", await repository.now(tx)));
    expect(await s.enqueue(input(f))).toMatchObject({ id: queued.id, duplicate: true, state: "CANCELLED" });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: queued.id } })).toMatchObject({ sealedPayload: null });
  });
  it("rejects the wrong database binding before running a producer", async () => {
    let produced = false;
    await expect(service({ NIUVA_DATABASE_BINDING_ID: randomUUID() }).withTransaction(async () => { produced = true; })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(produced).toBe(false);
  });
  it("commits a producer proof and its encrypted message together", async () => {
    const f = await fixture(), proofId = randomUUID(), token = createOpaqueToken(); proofs.push(proofId);
    const receipt = await service().withTransaction(async context => {
      await context.tx.customerEmailToken.create({ data: { id: proofId, pendingId: f.ownerId, purpose: "verify", tokenHash: hashOpaqueToken(token), returnTo: "/checkout", expiresAt: f.expiresAt } });
      return context.enqueue({ kind: "AUTH", proofId, token });
    });
    expect(receipt).toMatchObject({ state: "PENDING" });
    expect(await prisma.customerEmailToken.findUnique({ where: { id: proofId } })).not.toBeNull();
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: receipt.id } })).toMatchObject({ proofId });
  });
  it("serializes enqueue with closure and cancels the now-detached proof", async () => {
    const f = await fixture("AUTH_RESET"), s = service();
    let enter!: () => void, release!: () => void, attempting!: () => void;
    const entered = new Promise<void>(resolve => { enter = resolve; }), hold = new Promise<void>(resolve => { release = resolve; }), attempted = new Promise<void>(resolve => { attempting = resolve; });
    const enqueue = s.withTransaction(async context => { const row = await context.enqueue(input(f)); enter(); await hold; return row; });
    // A missing callback must fail promptly instead of waiting on a barrier forever.
    await Promise.race([entered, enqueue.then(() => expect.fail("producer must execute before commit"))]);
    const closure = prisma.$transaction(async tx => { attempting(); await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, f.ownerId, new Date()); });
    await attempted; release(); const receipt = await enqueue; await closure;
    expect(await s.revalidate(receipt.id)).toMatchObject({ state: "CANCELLED" });
    expect(await prisma.durableOutboxMessage.findUnique({ where: { id: receipt.id } })).toMatchObject({ sealedPayload: null });
  });
});
