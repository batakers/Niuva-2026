import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { CustomerPrivacyRepository, serializePrivacyExport } from "@/modules/customer-privacy/repository";
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { CustomerPrivacyCleanupRepository } from "@/modules/customer-privacy/cleanup";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { DAY_MS, closureIdentityHash, privacyRequestSchema, privacyOwnerSchema } from "@/modules/customer-privacy/core";
import { eraseCustomerAccount, lockCustomerLifecycle, lockCustomerBusinessWrite } from "@/modules/customer-privacy/lifecycle";
import { googleRegistrationProof } from "./customer-auth-fixtures";
const prisma = getPrismaClient();
const repository = new CustomerPrivacyRepository(prisma);
const now = new Date("2026-10-02T05:00:00Z");
const emails: string[] = [];
async function fixture(google = false) {
  const email = `privacy-${randomUUID()}@example.test`; emails.push(email);
  const session = createOpaqueToken();
  const customer = await prisma.customer.create({ data: { email, normalizedEmail: email, displayName: "Privacy Fixture", emailVerifiedAt: now, ...(google ? { googleSubject: randomUUID() } : { passwordCredential: { create: { passwordHash: "SECRET-PASSWORD-HASH" } } }), consents: { create: { termsVersion: "TEST", privacyVersion: "TEST", acceptedAt: now } }, sessions: { create: { tokenHash: hashOpaqueToken(session), expiresAt: new Date(now.getTime() + 60 * DAY_MS) } } } });
  return { customer, actor: { customerId: customer.id, sessionHash: hashOpaqueToken(session) }, session };
}
async function proof(actor: { customerId: string; sessionHash: string }, purpose: "EXPORT" | "CLOSE", at = now) {
  const token = createOpaqueToken(); const row = await repository.issue(actor, purpose, token, at); await repository.delivery(row.id, true, at); return token;
}
const request = () => privacyRequestSchema.parse({ submissionKey: randomUUID(), kind: "CORRECTION", details: "Nama profil saya salah.", correction: "Nama yang benar" });
const ownerId = randomUUID();
const handle = (id: string, overrides: Record<string, unknown> = {}) => privacyOwnerSchema.parse({ id, status: "RESOLVED", response: "Data sudah diperiksa dan hasil telah disampaikan.", outcome: "FULFILLED", fulfilled: "on", ...overrides });
afterEach(async () => {
  await prisma.customerPrivacyRequest.deleteMany({ where: { referenceNumber: { startsWith: "PRV-" }, OR: [{ contactEmail: { in: emails } }, { customer: { normalizedEmail: { in: emails } } }] } });
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: "PRIVACY-TEST-" } } });
  await prisma.b2BInquiry.deleteMany({ where: { referenceNumber: { startsWith: "PRIVACY-TEST-" } } });
  await prisma.customPrintRequest.deleteMany({ where: { referenceNumber: { startsWith: "PRIVACY-TEST-" } } });
  await prisma.storedFile.deleteMany({ where: { storageKey: { startsWith: "privacy-test/" } } });
  await prisma.customer.deleteMany({ where: { normalizedEmail: { in: emails } } });
  await prisma.customerClosureFence.deleteMany({ where: { identityHash: { in: emails.map(closureIdentityHash) } } });
  emails.length = 0;
});
describe("Customer privacy PostgreSQL lifecycle (isolated fixtures)", () => {
  it("persists privacy rate limits across service instances without sending on rejected attempts", async () => {
    const { actor } = await fixture(); let deliveries = 0;
    const mailer = { async send() { deliveries++; } };
    for (let attempt = 0; attempt < 3; attempt++) await new CustomerPrivacyService(repository, mailer, () => now, () => {}).sendConfirmation(actor, "EXPORT");
    await expect(new CustomerPrivacyService(repository, mailer, () => now, () => {}).sendConfirmation(actor, "EXPORT")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(deliveries).toBe(3);
  });
  it("cleans expired temporary records at seven days while preserving active sessions and pending registrations", async () => {
    const { customer, actor } = await fixture();
    const expiredAt = new Date(now.getTime() - 7 * DAY_MS);
    const staleSession = await prisma.customerSession.create({ data: { customerId: customer.id, tokenHash: randomUUID(), expiresAt: expiredAt } });
    const staleProof = await prisma.customerPrivacyConfirmation.create({ data: { customerId: customer.id, sessionHash: actor.sessionHash, tokenHash: randomUUID(), purpose: "EXPORT", expiresAt: expiredAt } });
    const freshToken = await prisma.customerEmailToken.create({ data: { customerId: customer.id, tokenHash: randomUUID(), purpose: "reset", expiresAt: new Date(now.getTime() + DAY_MS), returnTo: "/account" } });
    const staleToken = await prisma.customerEmailToken.create({ data: { customerId: customer.id, tokenHash: randomUUID(), purpose: "reset", expiresAt: expiredAt, returnTo: "/account" } });
    const cleanup = new CustomerPrivacyCleanupRepository(prisma);
    await cleanup.cleanup(now, true); expect(await prisma.customerSession.findUnique({ where: { id: staleSession.id } })).not.toBeNull();
    await cleanup.cleanup(now, false);
    expect(await prisma.customerSession.findUnique({ where: { id: staleSession.id } })).toBeNull();
    expect(await prisma.customerPrivacyConfirmation.findUnique({ where: { id: staleProof.id } })).toBeNull();
    expect(await prisma.customerEmailToken.findUnique({ where: { id: staleToken.id } })).toBeNull();
    expect(await prisma.customerEmailToken.findUnique({ where: { id: freshToken.id } })).not.toBeNull();
    expect(await prisma.customerSession.findUnique({ where: { tokenHash: actor.sessionHash } })).not.toBeNull();
  });
  it("exports explicit own-data projections without credentials, capabilities or another Customer", async () => {
    const first = await fixture(); const other = await fixture();
    await prisma.order.create({ data: { customerId: first.customer.id, orderNumber: `PRIVACY-TEST-${randomUUID()}`, orderType: "RETAIL", customerName: "Privacy Fixture", customerEmail: first.customer.email, customerPhone: "TEST", publicTokenHash: "SECRET-ORDER-TOKEN", grandTotalRp: "100", itemsSubtotalRp: "100", shippingTotalRp: "0" } });
    await prisma.storedFile.create({ data: { uploadedByCustomerId: first.customer.id, storageKey: `privacy-test/${randomUUID()}`, originalName: "test.stl", extension: "stl", mimeType: "model/stl", sizeBytes: BigInt(100), bucketScope: "PRIVATE_CUSTOMER" } });
    const token = await proof(first.actor, "EXPORT");
    expect(await repository.preview(first.actor, token, "EXPORT", now)).not.toBeNull();
    const result = await repository.complete(first.actor, token, "EXPORT", now);
    const json = serializePrivacyExport(result.data);
    expect(json).toContain("niuva.customer-data.v1"); expect(json).toContain(first.customer.email); expect(json).toContain("test.stl");
    for (const forbidden of [other.customer.email, "SECRET-PASSWORD-HASH", "SECRET-ORDER-TOKEN", "storageKey", "tokenHash", "passwordCredential", "sessionHash", "redirectUrl"]) expect(json).not.toContain(forbidden);
    await expect(repository.complete(first.actor, token, "EXPORT", now)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("binds confirmation to owner, session, purpose, delivery and exact expiry; GET preview never consumes", async () => {
    const one = await fixture(); const two = await fixture(); const token = await proof(one.actor, "EXPORT");
    for (const actor of [two.actor, { ...one.actor, sessionHash: "different" }]) {
      expect(await repository.preview(actor, token, "EXPORT", now)).toBeNull();
      await expect(repository.complete(actor, token, "EXPORT", now)).rejects.toMatchObject({ code: actor === two.actor ? "VALIDATION_ERROR" : "UNAUTHORIZED" });
    }
    await expect(repository.complete(one.actor, token, "CLOSE", now)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const expiry = new Date(now.getTime() + 900000);
    expect(await repository.preview(one.actor, token, "EXPORT", expiry)).toBeNull();
    await expect(repository.complete(one.actor, token, "EXPORT", expiry)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await repository.preview(one.actor, token, "EXPORT", now)).not.toBeNull();
    expect(await repository.preview(one.actor, token, "EXPORT", now)).not.toBeNull();
    const failed = createOpaqueToken(); await repository.issue(one.actor, "CLOSE", failed, now);
    await expect(repository.complete(one.actor, failed, "CLOSE", now)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("provider failure never authorizes action, and resend invalidates previous confirmation", async () => {
    const { actor } = await fixture(); let sentToken = "";
    const service = new CustomerPrivacyService(repository, { async send(mail) { sentToken = mail.token; throw new Error("fixture failure"); } }, () => now, () => {});
    await expect(service.sendConfirmation(actor, "CLOSE")).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(await repository.preview(actor, sentToken, "CLOSE", now)).toBeNull();
    const old = await proof(actor, "EXPORT"); const newer = await proof(actor, "EXPORT");
    await expect(repository.complete(actor, old, "EXPORT", now)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await repository.preview(actor, newer, "EXPORT", now)).not.toBeNull();
  });
  it.each([false, true])("permanently closes password/Google=%s without deleting active business, sessions or restoring old history", async google => {
    const { customer, actor } = await fixture(google);
    const order = await prisma.order.create({ data: { customerId: customer.id, orderNumber: `PRIVACY-TEST-${randomUUID()}`, orderType: "RETAIL", status: "PROCESSING", customerName: "Fixture", customerEmail: customer.email, customerPhone: "TEST", publicTokenHash: randomUUID(), grandTotalRp: "100", itemsSubtotalRp: "100", shippingTotalRp: "0" } });
    const inquiry = await prisma.b2BInquiry.create({ data: { customerId: customer.id, referenceNumber: `PRIVACY-TEST-${randomUUID()}`, name: "Fixture", email: customer.email, phone: "TEST", projectGoal: "Test", currentStage: "IDEA", description: "Test", targetQuantity: "1", confidentialityAck: true, publicTokenHash: randomUUID() } });
    const custom = await prisma.customPrintRequest.create({ data: { customerId: customer.id, referenceNumber: `PRIVACY-TEST-${randomUUID()}`, customerName: "Fixture", customerEmail: customer.email, customerPhone: "TEST", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID() } });
    const privacy = await repository.createRequest(actor, request(), now);
    const token = await proof(actor, "CLOSE");
    await repository.complete(actor, token, "CLOSE", now);
    expect(await prisma.customer.findUnique({ where: { id: customer.id } })).toBeNull();
    expect(await prisma.customerSession.count({ where: { customerId: customer.id } })).toBe(0);
    await expect(prisma.$transaction(tx => lockCustomerBusinessWrite(tx, customer.id))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await prisma.customerPasswordCredential.count({ where: { customerId: customer.id } })).toBe(0);
    const retained = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(retained.status).toBe("PROCESSING"); expect(retained.accountClosedAt).toEqual(now); expect(retained.customerId).toBeNull(); expect(retained.publicTokenHash).not.toBe(order.publicTokenHash);
    const openCase = await prisma.customerPrivacyRequest.findUniqueOrThrow({ where: { id: privacy.id } });
    expect(openCase.customerId).toBeNull(); expect(openCase.contactEmail).toBe(customer.email); expect(openCase.dueAt).toEqual(new Date(now.getTime() + 3 * DAY_MS));
    const auth = new CustomerAuthRepository(prisma);
    const preservedCustom = await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: custom.id } });
    expect(preservedCustom.customerId).toBeNull(); expect(preservedCustom.accountClosedAt).toEqual(now); expect(preservedCustom.publicTokenHash).not.toBe(custom.publicTokenHash);
    await expect(auth.upsertGoogleCustomer({ email: customer.email, normalizedEmail: customer.email, googleSubject: customer.googleSubject ?? randomUUID() }, new Date(now.getTime() + 1000), true, undefined, now)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const freshIdentity = { email: customer.email, normalizedEmail: customer.email, googleSubject: customer.googleSubject ?? randomUUID() };
    const freshAt = new Date(now.getTime() + 1000);
    const fresh = await auth.upsertGoogleCustomer(freshIdentity, freshAt, true, await googleRegistrationProof(prisma, freshIdentity, freshAt));
    expect(fresh.id).not.toBe(customer.id); expect((await auth.getAccount(fresh.id))!.orders).toHaveLength(0);
    await expect(new CustomerWorkRepository(prisma).claim({ customerId: fresh.id, kind: "B2B_INQUIRY", token: `${inquiry.id}.wrong` })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await repository.handle(handle(privacy.id), ownerId, new Date(now.getTime() + 2000));
  });
  it("serializes session/reset/verification issuance against closure; replay cannot recreate erased Customer", async () => {
    const { customer, actor } = await fixture(); const email = new CustomerEmailRepository(prisma); const auth = new CustomerAuthRepository(prisma);
    const reset = createOpaqueToken(); await email.issueToken({ tokenHash: hashOpaqueToken(reset), purpose: "reset", customerId: customer.id, expiresAt: new Date(now.getTime() + 1800000), returnTo: "/account" }, now);
    const token = await proof(actor, "CLOSE");
    const race = await Promise.allSettled([repository.complete(actor, token, "CLOSE", now), email.consumeReset(reset, "NEXT-HASH", now), auth.createSession({ customerId: customer.id, tokenHash: randomUUID(), expiresAt: new Date(now.getTime() + DAY_MS) })]);
    expect(race[0].status).toBe("fulfilled"); expect(await prisma.customer.findUnique({ where: { id: customer.id } })).toBeNull();
    expect(await prisma.customerSession.count({ where: { customerId: customer.id } })).toBe(0);
    await expect(email.consumeReset(reset, "NEXT", now)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(email.issueToken({ tokenHash: randomUUID(), purpose: "reset", customerId: customer.id, expiresAt: new Date(now.getTime() + DAY_MS), returnTo: "/account" }, now)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(email.createPending({ handleHash: randomUUID(), email: customer.email, normalizedEmail: customer.email, displayName: "Fixture", passwordHash: "HASH", termsVersion: "TEST", privacyVersion: "TEST", consentAt: now, expiresAt: new Date(now.getTime() + DAY_MS) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); expect(await eraseCustomerAccount(tx, customer.id, now)).toBe(false); });
  });
  it("idempotent requests keep original 72h deadline; resolution and hold edits never reset retention", async () => {
    const { actor } = await fixture(); const input = request();
    const first = await repository.createRequest(actor, input, now);
    const ownerCorrection = await repository.handle(handle(first.id, { applyProfileCorrection: "on", correctedDisplayName: "Nama Fixture Diperbaiki" }), ownerId, now);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: actor.customerId } })).displayName).toBe("Nama Fixture Diperbaiki");
    expect(ownerCorrection.outcome).toBe("FULFILLED");
    const second = await repository.createRequest(actor, input, new Date(now.getTime() + DAY_MS)); expect(second.id).toBe(first.id); expect(second.dueAt).toEqual(first.dueAt);
    const later = new Date(now.getTime() + DAY_MS);
    const resolved = await repository.handle(handle(first.id), ownerId, later);
    const repeated = await repository.handle(handle(first.id), ownerId, new Date(later.getTime() + DAY_MS));
    expect(repeated.contentDeleteAt).toEqual(resolved.contentDeleteAt); expect(repeated.dueAt).toEqual(first.dueAt);
    await expect(repository.handle(handle(first.id, { status: "IN_REVIEW" }), ownerId, later)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(repository.handle(handle(first.id, { holdCategory: "DISPUTE", holdReason: "Documented fixture hold", holdReviewAt: "2027-01-01" }), ownerId, later)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("cleanup applies exact 7/30-day bounds, documented holds, dry-run and repeat safely, protecting active accounts/transactions", async () => {
    const { customer, actor } = await fixture();
    const normal = await repository.createRequest(actor, request(), now);
    const held = await repository.createRequest(actor, request(), now);
    await repository.handle(handle(normal.id), ownerId, now);
    await repository.handle(handle(held.id, { holdCategory: "DISPUTE", holdReason: "Documented fixture dispute", holdReviewAt: "2026-10-20" }), ownerId, now);
    const cleanup = new CustomerPrivacyCleanupRepository(prisma);
    await cleanup.cleanup(new Date(now.getTime() + 7 * DAY_MS - 1), false);
    expect((await prisma.customerPrivacyRequest.findUniqueOrThrow({ where: { id: normal.id } })).details).not.toBeNull();
    await cleanup.cleanup(new Date(now.getTime() + 7 * DAY_MS), true);
    expect((await prisma.customerPrivacyRequest.findUniqueOrThrow({ where: { id: normal.id } })).details).not.toBeNull();
    await cleanup.cleanup(new Date(now.getTime() + 7 * DAY_MS), false);
    const purged = await prisma.customerPrivacyRequest.findUniqueOrThrow({ where: { id: normal.id } });
    expect(purged.details).toBeNull(); expect(purged.response).toBeNull(); expect(purged.contactEmail).toBeNull(); expect(purged.outcome).toBe("FULFILLED");
    expect((await prisma.customerPrivacyRequest.findUniqueOrThrow({ where: { id: held.id } })).details).not.toBeNull();
    await cleanup.cleanup(new Date(now.getTime() + 30 * DAY_MS - 1), false);
    expect(await prisma.customerPrivacyRequest.findUnique({ where: { id: normal.id } })).not.toBeNull();
    await cleanup.cleanup(new Date(now.getTime() + 30 * DAY_MS), false);
    expect(await prisma.customerPrivacyRequest.findUnique({ where: { id: normal.id } })).toBeNull(); expect(await prisma.customerPrivacyRequest.findUnique({ where: { id: held.id } })).toBeNull();
    expect(await prisma.customer.findUnique({ where: { id: customer.id } })).not.toBeNull();
    expect((await cleanup.cleanup(new Date(now.getTime() + 30 * DAY_MS), false)).caseReceipts).toBe(0);
  });
});
