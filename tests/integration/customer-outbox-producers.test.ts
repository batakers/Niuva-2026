import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { hashOpaqueToken } from "@/modules/customer-auth/core";
import { CustomerOutboxProducer } from "@/modules/outbox/producer";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import { PrismaOutboxRepository } from "@/modules/outbox/repository";
import { DurableOutboxService } from "@/modules/outbox/service";
import type { Prisma } from "@/generated/prisma/client";

const prisma = getPrismaClient(), repository = new PrismaOutboxRepository();
const cipher = new OutboxPayloadCipher({ activeKeyId: "producer-fixture", keys: { "producer-fixture": Buffer.alloc(32, 21).toString("base64") } });
const bound = { run: <T>(_operation: "job" | "outbox", work: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(work) };
let outbox: DurableOutboxService;
function deliveries(queue = outbox) {
  const producer = new CustomerOutboxProducer({ outbox: queue, authRepository: new CustomerEmailRepository(prisma), privacyRepository: new CustomerPrivacyRepository(prisma) });
  return { auth: { issue: producer.auth.bind(producer) }, privacy: { issue: producer.privacy.bind(producer) } };
}
let pendingId: string;
let email: string;
async function cleanProducerFixtures() {
  const [pendings, customers] = await Promise.all([
    prisma.customerPendingRegistration.findMany({ where: { normalizedEmail: { startsWith: "producer-" } }, select: { id: true } }),
    prisma.customer.findMany({ where: { normalizedEmail: { startsWith: "privacy-producer-" } }, select: { id: true } }),
  ]);
  const pendingIds = pendings.map((row) => row.id), customerIds = customers.map((row) => row.id);
  const [pendingTokens, customerTokens, confirmations] = await Promise.all([
    pendingIds.length ? prisma.customerEmailToken.findMany({ where: { pendingId: { in: pendingIds } }, select: { id: true } }) : Promise.resolve([]),
    customerIds.length ? prisma.customerEmailToken.findMany({ where: { customerId: { in: customerIds } }, select: { id: true } }) : Promise.resolve([]),
    customerIds.length ? prisma.customerPrivacyConfirmation.findMany({ where: { customerId: { in: customerIds } }, select: { id: true } }) : Promise.resolve([]),
  ]);
  const proofIds = [...pendingTokens.map((row) => row.id), ...customerTokens.map((row) => row.id), ...confirmations.map((row) => row.id)];
  if (proofIds.length) await prisma.durableOutboxMessage.deleteMany({ where: { proofId: { in: proofIds } } });
  if (pendingIds.length) await prisma.customerEmailToken.deleteMany({ where: { pendingId: { in: pendingIds } } });
  if (customerIds.length) {
    await prisma.customerEmailToken.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customerPrivacyConfirmation.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customerSession.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  }
  if (pendingIds.length) await prisma.customerPendingRegistration.deleteMany({ where: { id: { in: pendingIds } } });
}
beforeAll(cleanProducerFixtures);
afterEach(cleanProducerFixtures);
beforeEach(async () => {
  email = `producer-${randomUUID()}@example.test`;
  const now = new Date();
  const pending = await prisma.customerPendingRegistration.create({ data: { email, normalizedEmail: email, displayName: "Outbox producer fixture", handleHash: hashOpaqueToken(randomUUID()), passwordHash: "fixture-hash", termsVersion: "fixture-terms", privacyVersion: "fixture-privacy", ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now, consentAt: now, expiresAt: new Date(now.getTime() + 3_600_000) } });
  pendingId = pending.id;
  outbox = new DurableOutboxService({ bound, repository, cipherFactory: () => cipher });
});

describe("auth and privacy durable outbox producers", () => {
  it("commits the verification proof with one encrypted message and no inline send or account", async () => {
    const service = new CustomerEmailService(new CustomerEmailRepository(prisma), deliveries().auth, null);
    expect(await service.send("verify", email, "/checkout", { pendingId })).toBe("queued");
    const proof = await prisma.customerEmailToken.findFirstOrThrow({ where: { pendingId } });
    const message = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { proofKind_proofId: { proofKind: "AUTH", proofId: proof.id } } });
    expect(message).toMatchObject({ state: "PENDING", purpose: "AUTH_VERIFY" });
    expect(message.sealedPayload).not.toContain(email);
    expect(await prisma.customer.findUnique({ where: { normalizedEmail: email } })).toBeNull();
    expect(await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: pendingId } })).toMatchObject({ deliveryConfirmed: false });
  });
  it("rolls back proof issuance and its cooldown if enqueue fails", async () => {
    const failed = new DurableOutboxService({ bound, repository, cipherFactory: () => { throw new Error("fixture key unavailable"); } });
    const service = new CustomerEmailService(new CustomerEmailRepository(prisma), deliveries(failed).auth, null);
    await expect(service.send("verify", email, "/account", { pendingId })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await prisma.customerEmailToken.count({ where: { pendingId } })).toBe(0);
    expect(await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: pendingId } })).toMatchObject({ sentAt: null, deliveryConfirmed: false });
  });
  it("cancels the old message when resend revokes its proof", async () => {
    const service = new CustomerEmailService(new CustomerEmailRepository(prisma), deliveries().auth, null);
    await service.send("verify", email, "/account", { pendingId });
    const oldProof = await prisma.customerEmailToken.findFirstOrThrow({ where: { pendingId } });
    const oldMessage = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { proofKind_proofId: { proofKind: "AUTH", proofId: oldProof.id } } });
    await prisma.customerPendingRegistration.update({ where: { id: pendingId }, data: { sentAt: new Date(Date.now() - 61_000) } });
    await service.send("verify", email, "/account", { pendingId });
    expect(await outbox.revalidate(oldMessage.id)).toMatchObject({ state: "CANCELLED" });
    expect(await prisma.customerEmailToken.count({ where: { pendingId, consumedAt: null } })).toBe(1);
  });
  it("queues password reset without requiring an inline mailer", async () => {
    const resetEmail = `privacy-producer-reset-${randomUUID()}@example.test`, now = new Date();
    const customer = await prisma.customer.create({ data: { email: resetEmail, normalizedEmail: resetEmail, emailVerifiedAt: now, passwordCredential: { create: { passwordHash: "fixture-password-hash" } } } });
    const service = new CustomerEmailService(new CustomerEmailRepository(prisma), deliveries().auth, null, () => now);
    await service.forgot(resetEmail, "/account", `forgot-${randomUUID()}`);
    const proof = await prisma.customerEmailToken.findFirstOrThrow({ where: { customerId: customer.id, purpose: "reset" } });
    const message = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { proofKind_proofId: { proofKind: "AUTH", proofId: proof.id } } });
    expect(message).toMatchObject({ state: "PENDING", purpose: "AUTH_RESET" });
  });
  it("queues privacy confirmation without granting the action before delivery", async () => {
    const customer = await prisma.customer.create({ data: { email: `privacy-${email}`, normalizedEmail: `privacy-${email}`, emailVerifiedAt: new Date() } });
    const actor = { customerId: customer.id, sessionHash: hashOpaqueToken(randomUUID()) };
    await prisma.customerSession.create({ data: { customerId: customer.id, tokenHash: actor.sessionHash, expiresAt: new Date(Date.now() + 3_600_000) } });
    const service = new CustomerPrivacyService(new CustomerPrivacyRepository(prisma), deliveries().privacy, () => new Date(), () => {});
    expect(await service.sendConfirmation(actor, "EXPORT")).toEqual({ status: "queued" });
    const proof = await prisma.customerPrivacyConfirmation.findFirstOrThrow({ where: { customerId: customer.id } });
    expect(proof.delivered).toBe(false);
    const message = await prisma.durableOutboxMessage.findUniqueOrThrow({ where: { proofKind_proofId: { proofKind: "PRIVACY", proofId: proof.id } } });
    expect(message).toMatchObject({ purpose: "PRIVACY_EXPORT", state: "PENDING" });
    await prisma.customerSession.update({ where: { tokenHash: actor.sessionHash }, data: { revokedAt: new Date() } });
    expect(await outbox.revalidate(message.id)).toMatchObject({ state: "CANCELLED" });
  });
});
