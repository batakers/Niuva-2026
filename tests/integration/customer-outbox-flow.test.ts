import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { BoundDatabaseService } from "@/modules/database-binding/service";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import { DurableOutboxService } from "@/modules/outbox/service";
import { PrismaOutboxRepository } from "@/modules/outbox/repository";
import { PrismaOutboxWorkerRepository } from "@/modules/outbox/worker-repository";
import { DurableOutboxWorker } from "@/modules/outbox/worker";
import { CustomerOutboxProducer } from "@/modules/outbox/producer";
import { createCustomerAuthProofDelivery, createCustomerPrivacyProofDelivery } from "@/modules/outbox/runtime";
import { preparedOutboxSender } from "../helpers/prepared-outbox-sender";

const prisma = getPrismaClient(), bindingId = randomUUID();
const auth = new CustomerEmailRepository(prisma), privacy = new CustomerPrivacyRepository(prisma);
const cipher = new OutboxPayloadCipher({ activeKeyId: "fixture", keys: { fixture: Buffer.alloc(32, 11).toString("base64") } });
const customers: string[] = [], pendingIds: string[] = [], proofIds: string[] = [];
let ownsMarker = false;
const source = () => ({ NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock", NIUVA_CUSTOMER_AUTH_MOCK: "true", APP_URL: "http://127.0.0.1:3000", DATABASE_URL: process.env.TEST_DATABASE_URL, NIUVA_DATABASE_BINDING_ID: bindingId, RESEND_API_KEY: "synthetic-only", EMAIL_FROM: "fixture@example.test", NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "fixture", NIUVA_OUTBOX_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString("base64") });
function bound(env = source()) { return new BoundDatabaseService({ context: { env }, repositoryFactory: () => new PrismaDatabaseBindingRepository(prisma) }); }
function producer(cipherFactory = () => cipher) { return new CustomerOutboxProducer({ outbox: new DurableOutboxService({ bound: bound(), repository: new PrismaOutboxRepository(), cipherFactory }), authRepository: auth, privacyRepository: privacy }); }
async function pending() {
  const now = new Date(), email = `queue-${randomUUID()}@example.test`;
  const row = await auth.createPending({ email, normalizedEmail: email, displayName: "Queue fixture", passwordHash: "synthetic-hash", handleHash: randomUUID(), termsVersion: "TEST", privacyVersion: "TEST", consentAt: now, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now, expiresAt: new Date(now.getTime() + 86400000) });
  pendingIds.push(row.id); return row;
}
async function account() {
  const token = createOpaqueToken(), email = `queue-${randomUUID()}@example.test`;
  const row = await prisma.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date(), passwordCredential: { create: { passwordHash: "synthetic-hash" } }, sessions: { create: { tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 86400000) } } } });
  customers.push(row.id); return { row, actor: { customerId: row.id, sessionHash: hashOpaqueToken(token) } };
}
async function record() { const row = await prisma.durableOutboxMessage.findFirstOrThrow({ where: { proofId: { in: proofIds } }, orderBy: { createdAt: "desc" } }); return row; }
beforeAll(async () => { getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }); if (await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })) throw new Error("Foreign test marker"); await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "local-test" } }); ownsMarker = true; });
afterEach(async () => {
  vi.unstubAllEnvs(); vi.restoreAllMocks();
  const authProofs = await prisma.customerEmailToken.findMany({ where: { OR: [{ pendingId: { in: pendingIds } }, { customerId: { in: customers } }] }, select: { id: true } });
  const privacyProofs = await prisma.customerPrivacyConfirmation.findMany({ where: { customerId: { in: customers } }, select: { id: true } });
  await prisma.durableOutboxMessage.deleteMany({ where: { proofId: { in: [...proofIds, ...authProofs.map(r => r.id), ...privacyProofs.map(r => r.id)] } } });
  await prisma.customerPrivacyConfirmation.deleteMany({ where: { id: { in: proofIds } } });
  await prisma.customerPendingRegistration.deleteMany({ where: { id: { in: pendingIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: customers } } });
  pendingIds.length = 0; customers.length = 0; proofIds.length = 0;
});
afterAll(async () => { if (ownsMarker) await prisma.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } }); });

describe("Customer producer to durable worker", () => {
  it.each(["verify", "reset"] as const)("atomically queues %s without claiming delivery or calling a provider", async purpose => {
    const owner = purpose === "verify" ? await pending() : (await account()).row, token = createOpaqueToken();
    expect(await producer().auth({ to: owner.email, token, purpose, returnTo: "https://untrusted.example", owner: purpose === "verify" ? { pendingId: owner.id } : { customerId: owner.id } })).toBe("queued");
    const proof = await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } }); proofIds.push(proof.id);
    const row = await record(); expect(row).toMatchObject({ state: "PENDING", attempts: 0, sealedEnvelope: null });
    expect(row.sealedPayload).not.toContain(token); expect(proof.returnTo).toBe("/account");
    if (purpose === "verify") expect((await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: owner.id } })).deliveryConfirmed).toBe(false);
    const worker = new DurableOutboxWorker({ bound: bound(), repository: new PrismaOutboxWorkerRepository(), cipherFactory: () => cipher, policy: { leaseMs: 60000, sendTimeoutMs: 1000, retryDelaysMs: [] }, senderFactory: () => preparedOutboxSender(message => { expect(message.payload).toMatchObject({ to: owner.email, token }); return { envelope: { from: "fixture@example.test", to: owner.email, subject: "fixture", text: "fixture" }, async send() { return { kind: "accepted", providerReference: "synthetic-receipt" }; } }; }) });
    expect(await worker.run({ mode: "execute", limit: 10 })).toMatchObject({ accepted: 1 });
    expect((await record()).state).toBe("ACCEPTED");
  });
  it.each(["EXPORT", "CLOSE"] as const)("queues %s without giving privacy authority before worker acceptance", async purpose => {
    const { actor } = await account(), token = createOpaqueToken();
    expect(await producer().privacy(actor, purpose, token)).toBe("queued");
    const proof = await prisma.customerPrivacyConfirmation.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } }); proofIds.push(proof.id);
    expect(proof.delivered).toBe(false); expect((await record()).purpose).toBe(`PRIVACY_${purpose}`);
    await expect(privacy.complete(actor, token, purpose, new Date())).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rolls back proof creation, old proof revocation and resend reservation when encryption fails", async () => {
    const owner = await pending(), token = createOpaqueToken();
    const old = await auth.issueToken({ tokenHash: hashOpaqueToken(token), purpose: "verify", pendingId: owner.id, returnTo: "/account", expiresAt: new Date(Date.now() + 86400000) }, new Date(Date.now() - 61000)); proofIds.push(old.id);
    const before = await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: owner.id } });
    await expect(producer(() => { throw new Error("synthetic cipher failure"); }).auth({ to: owner.email, token: createOpaqueToken(), purpose: "verify", returnTo: "/account", owner: { pendingId: owner.id } })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect((await prisma.customerEmailToken.findUniqueOrThrow({ where: { id: old.id } })).consumedAt).toBeNull();
    expect((await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: owner.id } })).sentAt).toEqual(before.sentAt);
    expect(await prisma.customerEmailToken.count({ where: { pendingId: owner.id } })).toBe(1);
  });
  it("uses the default runtime delivery for the actual auth service", async () => {
    for (const [key, value] of Object.entries(source())) if (value !== undefined) vi.stubEnv(key, value);
    const owner = await pending(), service = new CustomerEmailService(auth);
    await expect(service.send("verify", owner.email, "/account", { pendingId: owner.id })).resolves.toBe("queued");
    const proof = await prisma.customerEmailToken.findFirstOrThrow({ where: { pendingId: owner.id } }); proofIds.push(proof.id);
    expect((await record()).state).toBe("PENDING");
  });
  it("uses the default runtime delivery for the actual privacy service", async () => {
    for (const [key, value] of Object.entries(source())) if (value !== undefined) vi.stubEnv(key, value);
    const { actor } = await account();
    expect(await new CustomerPrivacyService(privacy, undefined, undefined, () => {}).sendConfirmation(actor, "EXPORT")).toEqual({ status: "queued" });
    const proof = await prisma.customerPrivacyConfirmation.findFirstOrThrow({ where: { customerId: actor.customerId } }); proofIds.push(proof.id);
    expect((await record()).state).toBe("PENDING");
  });
  it.each(["NIUVA_OUTBOX_ENCRYPTION_KEY", "NIUVA_DATABASE_BINDING_ID", "APP_URL"])("fails closed before proof issuance without %s", async missing => {
    const env = { ...source(), [missing]: undefined };
    expect(createCustomerAuthProofDelivery(auth, env)).toBeNull(); expect(createCustomerPrivacyProofDelivery(privacy, env)).toBeNull();
  });
});
