import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AdminAccess } from "@/lib/auth/admin";
import { isolatedOperationalJobFixture } from "../helpers/isolated-operational-job-fixture";
import { JobRunner } from "@/modules/jobs/runner";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import { createJobHandlers } from "@/modules/jobs/handlers";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { OutboxPayloadCipher, readOutboxCipherConfig } from "@/modules/outbox/cipher";
import { DurableOutboxService } from "@/modules/outbox/service";
import { PrismaOutboxRepository } from "@/modules/outbox/repository";
import { CustomerOutboxSender } from "@/modules/outbox/customer-sender";
import { businessEnvelope, type BusinessKind } from "@/modules/outbox/business-core";
import type { OutboxSender, DeliveryOutcome } from "@/modules/outbox/worker-core";
import { AdminNotificationService } from "@/modules/admin/notifications/service";
import { PrismaAdminNotificationRepository } from "@/modules/admin/notifications/repository";
import { OrderRepository } from "@/modules/order/repository";
import { PaymentWebhookRepository } from "@/modules/payment/webhook-repository";
import { PaymentWebhookService } from "@/modules/payment/webhook-service";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { EmailDeliveryError, type PreparedCustomerEmail } from "@/modules/notifications/email-delivery";
vi.mock("server-only", () => ({}));

let f: Awaited<ReturnType<typeof isolatedOperationalJobFixture>>, owner: AdminAccess;
const policy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1 }, businessPolicy = { maxAgeMs: 3600000 };
const workerPolicy = { leaseMs: 30000, sendTimeoutMs: 10000, retryDelaysMs: [1] };
const publishRequest = { job: "OUTBOX_BUSINESS", mode: "execute", limit: 100 } as const;
const deliveryRequest = { job: "OUTBOX_DELIVERY", mode: "execute", limit: 100 } as const;
const customers: string[] = [], orders: string[] = [], requests: string[] = [], files: string[] = [], rules: string[] = [];
beforeAll(async () => {
  f = await isolatedOperationalJobFixture();
  const id = randomUUID(), user = await f.admin.adminAuthUser.create({ data: { id, email: `business-owner-${id}@example.test`, name: "Synthetic Owner", emailVerified: true, twoFactorEnabled: true, profile: { create: { isActive: true, role: "OWNER" } } }, include: { profile: true } });
  if (!user.profile) throw new Error("Missing fixture profile");
  owner = { authUserId: id, profile: user.profile };
});
afterEach(async () => {
  await f.admin.adminNotificationReceipt.deleteMany(); await f.admin.adminNotificationState.deleteMany();
  await f.admin.auditLog.deleteMany(); await f.admin.operationalJobState.deleteMany(); await f.admin.durableOutboxMessage.deleteMany();
  await f.admin.paymentEvent.deleteMany({ where: { paymentAttempt: { orderId: { in: orders } } } });
  await f.admin.paymentAttempt.deleteMany({ where: { orderId: { in: orders } } });
  await f.admin.shipment.deleteMany({ where: { orderId: { in: orders } } });
  await f.admin.order.deleteMany({ where: { id: { in: orders } } });
  await f.admin.customPrintQuote.deleteMany({ where: { requestId: { in: requests } } });
  await f.admin.customPrintEstimate.deleteMany({ where: { requestId: { in: requests } } });
  await f.admin.customPrintReview.deleteMany({ where: { requestId: { in: requests } } });
  await f.admin.$transaction(async tx => {
    await tx.customPrintRequestFile.deleteMany({ where: { requestId: { in: requests } } });
    await tx.storedFile.deleteMany({ where: { id: { in: files } } });
  });
  await f.admin.customPrintRequest.deleteMany({ where: { id: { in: requests } } });
  await f.admin.pricingRuleVersion.deleteMany({ where: { id: { in: rules } } });
  await f.admin.customer.deleteMany({ where: { id: { in: customers } } });
  customers.length = 0; orders.length = 0; requests.length = 0; files.length = 0; rules.length = 0;
});
afterAll(async () => { await f?.dispose(); });
async function customer() {
  const email = `business-${randomUUID()}@example.test`, row = await f.admin.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date() } });
  customers.push(row.id); return row;
}
async function order() {
  const c = await customer(), suffix = randomUUID();
  const row = await f.admin.order.create({ data: { customerId: c.id, createdAt: new Date(Date.now() - 60000), orderNumber: `TEST-MAIL-${suffix}`, orderType: "CUSTOM_PRINT", customerName: "Synthetic", customerEmail: c.email, customerPhone: "+628000000000", itemsSubtotalRp: "100000", shippingTotalRp: "0", grandTotalRp: "100000", publicTokenHash: randomUUID() } });
  orders.push(row.id); return { order: row, customer: c };
}
async function payment() {
  const p = await order(); await f.admin.order.update({ where: { id: p.order.id }, data: { status: "PAID" } });
  const attempt = await f.admin.paymentAttempt.create({ data: { orderId: p.order.id, purpose: "ORDER_TOTAL", amountRp: "100000", providerOrderId: `TEST-MAIL-PAY-${randomUUID()}`, status: "SETTLED", settledAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 600000) } });
  await f.admin.paymentEvent.create({ data: { provider: "MIDTRANS", providerOrderId: attempt.providerOrderId, paymentAttemptId: attempt.id, eventFingerprint: randomUUID(), processingResult: "SETTLED", payloadJson: { transactionStatus: "settlement" }, processedAt: new Date() } });
  return { ...p, attempt };
}
async function quote() {
  const c = await customer(), suffix = randomUUID();
  const request = await f.admin.customPrintRequest.create({ data: { customerId: c.id, referenceNumber: `TEST-MAIL-MAKE-${suffix}`, customerName: "Synthetic", customerEmail: c.email, customerPhone: "+628000000000", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID(), status: "QUOTE_SENT" } }); requests.push(request.id);
  const rule = await f.admin.pricingRuleVersion.create({ data: { code: `TEST-MAIL-${suffix}`, version: 1, definitionJson: {}, status: "RETIRED" } }); rules.push(rule.id);
  const review = await f.admin.customPrintReview.create({ data: { requestId: request.id, reviewedByAdminId: owner.profile.id, verifiedWeightG: "20", printDurationSeconds: 3600, materialCode: "PLA", quantity: 1, reviewedAt: new Date() } });
  const estimate = await f.admin.customPrintEstimate.create({ data: { requestId: request.id, version: 1, pricingRuleVersionId: rule.id, snapshot: { reviewUpdatedAt: review.updatedAt.toISOString(), pricingRule: { id: rule.id } }, baselineRp: "100000", additionalSubtotalRp: "0", lowerRp: "100000", upperRp: "130000", publishedByAdminId: owner.profile.id } });
  const file = await f.admin.storedFile.create({ data: { bucketScope: "PRIVATE_CUSTOMER", extension: "stl", mimeType: "model/stl", originalName: "synthetic.stl", sizeBytes: BigInt(16), storageKey: `private/synthetic/${suffix}`, uploadStatus: "UPLOADED", uploadedByCustomerId: c.id } }); files.push(file.id);
  await f.admin.customPrintRequestFile.create({ data: { requestId: request.id, fileId: file.id } });
  await f.admin.storedFile.update({ where: { id: file.id }, data: { uploadStatus: "VERIFIED", verifiedAt: new Date() } });
  const data = { requestId: request.id, quoteNumber: `TEST-MAIL-QUOTE-${suffix}`, version: 1, pricingRuleVersionId: rule.id, verifiedWeightG: "20", printDurationSeconds: 3600, materialCode: "PLA", quantity: 1, materialSubtotalRp: "50000", machineSubtotalRp: "50000", unroundedTotalRp: "100000", finalTotalRp: "100000", calculationSnapshot: {}, estimateId: estimate.id, createdByAdminId: owner.profile.id, publicTokenHash: randomUUID() };
  const q = await f.admin.customPrintQuote.create({ data: { ...data, status: "SENT", sentAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 600000) } });
  return { customer: c, request, quote: q, file, review, data };
}
function runner(senderFactory?: () => OutboxSender, source: Readonly<Record<string, string | undefined>> = f.source, policyValue = businessPolicy) {
  return new JobRunner({ bound: f.bound, repository: new PrismaJobRepository(), expectedRole: f.role, policy, handlers: createJobHandlers({ prisma: f.client, bound: f.bound, source, businessPolicy: policyValue, workerPolicy, senderFactory }) });
}
function service() { return new DurableOutboxService({ bound: f.bound, repository: new PrismaOutboxRepository(), cipherFactory: () => new OutboxPayloadCipher(readOutboxCipherConfig(f.source)) }); }
async function message(kind: BusinessKind, proofId: string) { return f.admin.durableOutboxMessage.findUniqueOrThrow({ where: { proofKind_proofId: { proofKind: kind, proofId } } }); }
function sender(outcome: DeliveryOutcome = { kind: "accepted", providerReference: "synthetic-receipt" }) {
  const send = vi.fn<PreparedCustomerEmail["send"]>(async () => {
    if (outcome.kind === "accepted") return { id: outcome.providerReference ?? "synthetic-receipt" };
    throw new EmailDeliveryError(outcome.kind === "retryable" ? "RETRYABLE" : outcome.kind === "permanent" ? "PERMANENT" : "UNKNOWN", outcome.kind === "retryable" ? outcome.retryAfterMs : 0);
  });
  const value: OutboxSender = new CustomerOutboxSender({ auth: null, privacy: null, business: { prepare(input) {
    return { envelope: businessEnvelope({ to: input.to, purpose: input.purpose, content: input.content, from: "fixture@example.test", appOrigin: "http://127.0.0.1:3000" }), send };
  } } });
  return { value, send };
}

describe("business outbox from committed facts", () => {
  it("projects one encrypted order intent across concurrent publishers and retries without auth tokens", async () => {
    const p = await order();
    await Promise.all([runner().run(publishRequest), runner().run(publishRequest)]);
    const row = await message("ORDER", p.order.id);
    expect(await f.admin.durableOutboxMessage.count()).toBe(1); expect(row.state).toBe("PENDING");
    expect(row.createdAt).toEqual(p.order.createdAt); expect(row.expiresAt.getTime()).toBe(p.order.createdAt.getTime() + businessPolicy.maxAgeMs);
    expect(row.sealedPayload).not.toContain(p.customer.email);
    expect(await runner().run(publishRequest)).toMatchObject({ state: "completed", counts: { enqueued: 0 } });
    const mail = sender(); expect(await runner(() => mail.value).run(deliveryRequest)).toMatchObject({ state: "completed", counts: { accepted: 1 } });
    expect((await message("ORDER", p.order.id)).sealedPayload).toBeNull();
    expect(mail.send).toHaveBeenCalledTimes(1); expect(JSON.stringify(mail.send.mock.calls)).not.toMatch(/token=|\/quote\/|storageKey|customerName|private\/synthetic/);
    expect(await f.admin.customerEmailToken.count()).toBe(0); expect(await f.admin.customerPrivacyConfirmation.count()).toBe(0);
    await runner(() => mail.value).run(deliveryRequest); expect(mail.send).toHaveBeenCalledTimes(1);
  });
  it("dry-runs without inserting an intent or allocating cipher/sender and rejects a missing runtime policy", async () => {
    await order(); const factory = vi.fn(() => { throw new Error("must not allocate"); });
    expect(await runner(factory, { ...f.source, NIUVA_OUTBOX_ENCRYPTION_KEY: undefined }).run({ ...publishRequest, mode: "dry-run" })).toMatchObject({ counts: { scanned: 1, enqueued: 0 } });
    expect(await f.admin.durableOutboxMessage.count()).toBe(0); expect(factory).not.toHaveBeenCalled();
    await expect(createOperationalJobRuntime({ prisma: f.client, source: f.source }).run(publishRequest, policy)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("leaves the committed order intact when cipher or mailer setup fails and persists one failure transition", async () => {
    const p = await order(), source = { ...f.source, NIUVA_OUTBOX_ENCRYPTION_KEY: undefined };
    expect(await runner(undefined, source).run(publishRequest)).toMatchObject({ state: "failed" });
    expect(await f.admin.order.findUnique({ where: { id: p.order.id } })).not.toBeNull(); expect(await f.admin.durableOutboxMessage.count()).toBe(0);
    await runner(undefined, source).run(publishRequest);
    expect(await f.admin.auditLog.count({ where: { action: "outbox.job.failed" } })).toBe(1);
    await runner().run(publishRequest);
    expect(await f.admin.auditLog.count({ where: { action: "outbox.job.recovered" } })).toBe(1);
    expect(await runner(() => new CustomerOutboxSender({ auth: null, privacy: null })).run(deliveryRequest)).toMatchObject({ state: "failed" });
    expect((await message("ORDER", p.order.id)).state).toBe("PENDING");
  });
  it("records expired/invalid candidates once without starving newer facts or retaining recipient payload", async () => {
    const old = await order(), invalid = await payment(), fresh = await order();
    await f.admin.order.update({ where: { id: old.order.id }, data: { createdAt: new Date(Date.now() - 7200000) } });
    await f.admin.paymentEvent.updateMany({ where: { paymentAttemptId: invalid.attempt.id }, data: { processingResult: "AMOUNT_MISMATCH" } });
    expect(await runner().run(publishRequest)).toMatchObject({ counts: { expired: 1, cancelled: 1 } });
    expect(await message("ORDER", old.order.id)).toMatchObject({ state: "EXPIRED", sealedPayload: null });
    expect(await message("PAYMENT", invalid.attempt.id)).toMatchObject({ state: "CANCELLED", sealedPayload: null });
    expect((await message("ORDER", fresh.order.id)).state).toBe("PENDING");
    expect(await runner().run(publishRequest)).toMatchObject({ counts: { scanned: 0, remainingDue: 0 } });
  });
  it("emits one settlement intent despite duplicate verified webhook and includes final shipping separately", async () => {
    const p = await payment(), key = "synthetic-mail-server";
    const body = { order_id: p.attempt.providerOrderId, transaction_id: "test-mail-transaction", status_code: "200", gross_amount: "100000.00", transaction_status: "settlement" };
    const signed = { ...body, signature_key: createHash("sha512").update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest("hex") };
    const webhook = new PaymentWebhookService({ repository: new PaymentWebhookRepository(f.admin), serverKey: key, audit: async () => {}, failureLogger: { record: () => {} } });
    await webhook.handleMidtransNotification(signed); await webhook.handleMidtransNotification(signed);
    const providerOrderId = `TEST-MAIL-SHIP-${randomUUID()}`;
    const shipping = await f.admin.paymentAttempt.create({ data: { orderId: p.order.id, providerOrderId, purpose: "CUSTOM_SHIPPING", status: "SETTLED", settledAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 600000), amountRp: "25000", events: { create: { provider: "MIDTRANS", providerOrderId, eventFingerprint: randomUUID(), processingResult: "SETTLED", payloadJson: { transactionStatus: "settlement" } } } } });
    await runner().run(publishRequest); await runner().run(publishRequest);
    expect(await f.admin.durableOutboxMessage.count({ where: { proofKind: "PAYMENT" } })).toBe(2);
    const mail = sender(); await runner(() => mail.value).run(deliveryRequest);
    expect(mail.send.mock.calls.map(call => call[0].text).join(" ")).toContain("ongkir final sebesar Rp 25.000");
    expect((await message("PAYMENT", shipping.id)).state).toBe("ACCEPTED");
  });
  it.each(["pending", "verification", "refund", "late"])("withholds payment confirmed for %s receipts", async state => {
    const p = await payment();
    if (state === "pending") await f.admin.paymentAttempt.update({ where: { id: p.attempt.id }, data: { status: "PENDING" } });
    if (state === "verification") await f.admin.paymentEvent.create({ data: { provider: "MIDTRANS", providerOrderId: p.attempt.providerOrderId, paymentAttemptId: p.attempt.id, eventFingerprint: randomUUID(), processingResult: "REFUND_REQUIRES_RECONCILIATION", payloadJson: {} } });
    if (state === "refund") await f.admin.paymentEvent.create({ data: { provider: "MIDTRANS", providerOrderId: p.attempt.providerOrderId, paymentAttemptId: p.attempt.id, eventFingerprint: randomUUID(), processingResult: "STALE_SETTLED", payloadJson: { transactionStatus: "partial_refund" } } });
    if (state === "late") await f.admin.order.update({ where: { id: p.order.id }, data: { status: "CANCELLED" } });
    await runner().run(publishRequest);
    expect(await f.admin.durableOutboxMessage.count({ where: { proofKind: "PAYMENT", state: "PENDING" } })).toBe(0);
  });
  it("sends only the current quote version through its account route even after the source pricing rule retires", async () => {
    const q = await quote(); await runner().run(publishRequest);
    const mail = sender(); expect(await runner(() => mail.value).run(deliveryRequest)).toMatchObject({ counts: { accepted: 1 } });
    expect(mail.send.mock.calls[0][0].text).toContain(`/account/make/${q.request.id}`);
    expect(mail.send.mock.calls[0][0].subject).toContain("versi 1");
  });
  it.each(["superseded", "review", "file", "expired"])("cancels queued quote after %s without sending an active offer", async change => {
    const q = await quote(); await runner().run(publishRequest);
    if (change === "superseded") await f.admin.customPrintQuote.create({ data: { ...q.data, version: 2, quoteNumber: `TEST-MAIL-NEW-${randomUUID()}`, publicTokenHash: randomUUID() } });
    if (change === "review") await f.admin.customPrintReview.update({ where: { id: q.review.id }, data: { updatedAt: new Date(Date.now() + 1000) } });
    if (change === "file") await f.admin.storedFile.update({ where: { id: q.file.id }, data: { deletedAt: new Date() } });
    if (change === "expired") await f.admin.customPrintQuote.update({ where: { id: q.quote.id }, data: { status: "EXPIRED" } });
    const mail = sender(); await runner(() => mail.value).run(deliveryRequest); expect(mail.send).not.toHaveBeenCalled();
    expect((await message("QUOTE", q.quote.id)).state).toBe("CANCELLED");
  });
  it("requires committed shipped status, first timestamp and current resi, preserving the first event on edits", async () => {
    const p = await order(); await f.admin.order.update({ where: { id: p.order.id }, data: { status: "READY_TO_SHIP" } });
    const shipment = await f.admin.shipment.create({ data: { orderId: p.order.id, courierCode: "test", trackingNumber: "TEST-RESI" } });
    await runner().run(publishRequest); expect(await f.admin.durableOutboxMessage.count({ where: { proofKind: "SHIPMENT" } })).toBe(0);
    const timestamp = new Date(Date.now() - 1000), repo = new OrderRepository(f.admin);
    await repo.updateStatusIfCurrent(p.order.id, "READY_TO_SHIP", "SHIPPED", timestamp);
    await repo.updateStatusIfCurrent(p.order.id, "SHIPPED", "SHIPPED", new Date());
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: p.order.id } })).shippedAt).toEqual(timestamp);
    await runner().run(publishRequest);
    await f.admin.shipment.update({ where: { id: shipment.id }, data: { trackingNumber: "TEST-CORRECTED" } });
    const mail = sender(); await runner(() => mail.value).run(deliveryRequest);
    expect((await message("SHIPMENT", p.order.id)).state).toBe("ACCEPTED");
    expect(mail.send.mock.calls.map(call => call[0].text).join(" ")).not.toMatch(/TEST-RESI|TEST-CORRECTED|private\/|pasti tiba/);
  });
  it("invalidates queued business proof on destination change, closure and signup without reattaching history", async () => {
    const p = await order(); await runner().run(publishRequest);
    await f.admin.customer.update({ where: { id: p.customer.id }, data: { email: `changed-${p.customer.email}`, normalizedEmail: `changed-${p.customer.email}` } });
    const mail = sender(); await runner(() => mail.value).run(deliveryRequest); expect(mail.send).not.toHaveBeenCalled();
    const next = await order(); await runner().run(publishRequest);
    await f.admin.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, next.customer.id, new Date()); });
    const replacement = await f.admin.customer.create({ data: { email: next.customer.email, normalizedEmail: next.customer.email, emailVerifiedAt: new Date() } }); customers.push(replacement.id);
    await runner(() => mail.value).run(deliveryRequest); await runner().run(publishRequest);
    expect(mail.send).not.toHaveBeenCalled(); expect((await message("ORDER", next.order.id)).state).toBe("CANCELLED");
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: next.order.id } })).customerId).toBeNull();
  });
  it("keeps an unknown delivery terminal and exposes minimal persistent Admin attention with per-account read state", async () => {
    const p = await order(); const notifications = new AdminNotificationService(new PrismaAdminNotificationRepository(f.admin)); await notifications.bootstrap(owner);
    await runner().run(publishRequest); const mail = sender({ kind: "unknown" });
    expect(await runner(() => mail.value).run(deliveryRequest)).toMatchObject({ state: "failed", counts: { unknown: 1 } });
    await runner(() => mail.value).run(deliveryRequest); await runner().run(publishRequest); expect(mail.send).toHaveBeenCalledTimes(1);
    expect(await message("ORDER", p.order.id)).toMatchObject({ state: "FAILED", failureCategory: "OUTCOME_UNKNOWN", sealedPayload: null });
    const feed = await notifications.poll(owner, {}), item = feed.items.find(value => value.title === "Email Customer perlu diperiksa");
    expect(item).toMatchObject({ href: `/admin/orders/${p.order.id}`, requiresAttention: true, isRead: false });
    expect(feed.toastCandidates.some(value => value.id === item?.id)).toBe(true);
    expect(JSON.stringify(feed)).not.toContain(p.customer.email); expect(JSON.stringify(feed)).not.toContain("OUTCOME_UNKNOWN");
    await notifications.markRead(owner, { ids: [item!.id] }); expect((await notifications.poll(owner, {})).items.find(value => value.id === item!.id)?.isRead).toBe(true);
    expect((await notifications.poll(owner, {})).toastCandidates).toEqual([]);
  });
  it("retries only explicit safe failure with the same message key and frozen bytes", async () => {
    const p = await order(); await runner().run(publishRequest);
    const attempts: { subject: string; text: string; key: string }[] = [];
    let preparedCount = 0;
    const value: OutboxSender = { assertReady() {}, prepare(input) {
      if (!("business" in input.payload)) throw new Error("Business fixture expected");
      preparedCount++;
      return { envelope: { from: "fixture@example.test", to: input.payload.to, subject: preparedCount === 1 ? "Original fixture subject" : "Changed fixture subject", text: preparedCount === 1 ? "Original fixture text" : "Changed fixture text" }, async send(saved) {
        attempts.push({ subject: saved.subject, text: saved.text, key: input.metadata.messageKey });
        return attempts.length === 1 ? { kind: "retryable", retryAfterMs: 1 } : { kind: "accepted", providerReference: "synthetic-final" };
      } };
    }, async send() { throw new Error("Prepared delivery required"); } };
    await runner(() => value).run(deliveryRequest); await runner(() => value).run(deliveryRequest);
    expect(attempts).toHaveLength(2); expect(preparedCount).toBe(2); expect(attempts[0]).toEqual(attempts[1]); expect(attempts[1].subject).toBe("Original fixture subject"); expect((await message("ORDER", p.order.id)).state).toBe("ACCEPTED");
  });
  it("rejects business input with an auth token and does not invent a historical shipped timestamp", async () => {
    const p = await order();
    await expect(service().enqueue({ kind: "ORDER", proofId: p.order.id, token: "a".repeat(43), deliveryDeadline: new Date(Date.now() + 60000) })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service().enqueue({ kind: "ORDER", proofId: p.order.id, deliveryDeadline: new Date(p.order.createdAt.getTime() + 86400001) })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await f.admin.order.update({ where: { id: p.order.id }, data: { status: "SHIPPED" } });
    await f.admin.shipment.create({ data: { orderId: p.order.id, courierCode: "test", trackingNumber: "TEST-HISTORY" } });
    await runner().run(publishRequest); expect(await f.admin.durableOutboxMessage.count({ where: { proofKind: "SHIPMENT" } })).toBe(0);
  });
});
