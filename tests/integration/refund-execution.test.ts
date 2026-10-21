import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { AdminAccess } from "@/lib/auth/admin";
import { isolatedOperationalJobFixture } from "../helpers/isolated-operational-job-fixture";
import { RefundRepository } from "@/modules/refund/repository";
import { RefundExecutionRepository } from "@/modules/refund/execution-repository";
import { RefundExecutionService } from "@/modules/refund/execution-service";
import { createRefundReconciliationHandler } from "@/modules/refund/reconciliation-job";
import { databaseNow } from "@/lib/db/clock";
import { exportCustomerData, serializePrivacyExport } from "@/modules/customer-privacy/repository";
import { parseRefundStatusProof } from "@/modules/refund/execution-core";
import type { RefundCommand, RefundGateway, RefundQueryResult, RefundSubmissionResult } from "@/modules/refund/gateway";
import { JobRunner } from "@/modules/jobs/runner";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import { createJobHandlers } from "@/modules/jobs/handlers";
import { JobMonitoring } from "@/modules/jobs/monitoring";
import { readOrderPaymentIssues } from "@/modules/payment/operational-repository";
import { PaymentWebhookRepository } from "@/modules/payment/webhook-repository";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";

let f: Awaited<ReturnType<typeof isolatedOperationalJobFixture>>;
beforeAll(async () => { f = await isolatedOperationalJobFixture(); }, 90000);
afterEach(async () => { if (f) await f.admin.operationalJobState.deleteMany({ where: { name: "REFUND_RECONCILIATION" } }); });
afterAll(async () => { await f?.dispose(); });
const reason = "Pengembalian penuh atas pesanan sesuai pemeriksaan.";
async function fixture(shipping = false) {
  const email = `refund-execute-${randomUUID()}@example.test`;
  const customer = await f.admin.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date() } });
  const profile = await f.admin.adminProfile.create({ data: { role: "OWNER", isActive: true } });
  const access: AdminAccess = { authUserId: randomUUID(), profile: { id: profile.id, role: "OWNER", isActive: true } };
  const order = await f.admin.order.create({ data: { orderNumber: `EXEC-${randomUUID()}`, orderType: shipping ? "CUSTOM_PRINT" : "RETAIL", status: "COMPLETED", customerId: customer.id,
    customerName: "Refund Fixture", customerEmail: email, customerPhone: "+62800000000", publicTokenHash: randomUUID(), grandTotalRp: "100003", itemsSubtotalRp: "100003", shippingTotalRp: "0" } });
  const payment = await f.admin.paymentAttempt.create({ data: { orderId: order.id, providerOrderId: randomUUID(), providerTransactionId: randomUUID(), purpose: "ORDER_TOTAL", amountRp: "100003", status: "SETTLED", createdAt: new Date(Date.now() - 7200000), settledAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() - 1000) } });
  if (shipping) await f.admin.paymentAttempt.create({ data: { orderId: order.id, providerOrderId: randomUUID(), providerTransactionId: randomUUID(), purpose: "CUSTOM_SHIPPING", amountRp: "17003", status: "SETTLED", createdAt: new Date(Date.now() - 7200000), settledAt: new Date(Date.now() - 3600000), expiresAt: new Date(Date.now() - 1000) } });
  const intake = new RefundRepository(f.admin);
  await intake.request(customer.id, { orderId: order.id, submissionKey: randomUUID(), category: "ITEM_ISSUE", reason });
  await intake.approve(access, { orderId: order.id, expectedVersion: 1, submissionKey: randomUUID(), reason, returnState: "NOT_REQUIRED" });
  const row = await f.admin.refundCase.findUniqueOrThrow({ where: { orderId: order.id }, include: { allocations: true } });
  const repository = new RefundExecutionRepository(f.admin), merchantBinding = randomUUID();
  const gateway: RefundGateway = {
    getStatus: vi.fn<RefundGateway["getStatus"]>(async raw => { const target = raw as RefundCommand; return { kind: "found", proof: parseRefundStatusProof({ order_id: target.providerOrderId, transaction_id: target.providerTransactionId, gross_amount: target.amountRp, payment_type: "gopay", status_code: "200", transaction_status: "settlement" }, target, new Date()) }; }),
    submit: vi.fn<RefundGateway["submit"]>(async () => ({ kind: "accepted", reference: "accept-only" })),
  };
  const service = (actor = access) => new RefundExecutionService({ repository, authorizeAdmin: async () => actor, gatewayFactory: () => gateway, source: { NIUVA_REFUND_MERCHANT_BINDING: merchantBinding } });
  const input = { orderId: order.id, expectedVersion: 2, submissionKey: randomUUID(), allocationId: row.allocations.find(item => item.paymentAttemptId === payment.id)!.id, publicReason: reason, eligibilityEvidence: "MERCHANT-BALANCE-REVIEW-TEST" };
  const manual = async () => ({ orderId: order.id, expectedVersion: (await f.admin.refundCase.findUniqueOrThrow({ where: { id: row.id } })).version, submissionKey: randomUUID(), reason,
    providerConfirmedNoPending: true as const, providerResolutionReference: "PROVIDER-SUPPORT-NO-PENDING-TEST", recipientVerificationReference: "RECIPIENT-VERIFIED-TEST" });
  const rule = () => f.admin.refundMerchantRule.create({ data: { merchantBinding, paymentType: "gopay", route: "refund", maxAgeSeconds: 86400, maxAttempts: 3, validFrom: new Date(Date.now() - 3600000), validUntil: new Date(Date.now() + 86400000), evidenceReference: "MERCHANT-SANDBOX-FIXTURE-ONLY", ownerId: profile.id } });
  const execution = () => f.admin.refundExecution.findUniqueOrThrow({ where: { allocationId: input.allocationId } });
  const bank = async (extra: Record<string, unknown> = {}): Promise<RefundQueryResult> => {
    const operation = await execution(), target = { providerOrderId: payment.providerOrderId, providerTransactionId: payment.providerTransactionId!, amountRp: payment.amountRp.toFixed(0) };
    return { kind: "found", proof: parseRefundStatusProof({ order_id: target.providerOrderId, transaction_id: target.providerTransactionId, gross_amount: target.amountRp, payment_type: "gopay", status_code: "200", transaction_status: "refund", refund_amount: target.amountRp,
      refunds: [{ refund_key: operation.refundKey, refund_chargeback_id: `bank-${randomUUID()}`, refund_amount: target.amountRp, bank_confirmed_at: new Date().toISOString() }], ...extra }, target, new Date()) };
  };
  return { access, customer, order, payment, row, input, repository, gateway, service, manual, rule, execution, bank };
}
describe("T23/T25 durable full-refund execution", () => {
  it("uses database epoch without shifting timestamps under a non-UTC database session", async () => {
    await f.admin.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'Asia/Jakarta'");
      const before = Date.now(), value = await databaseNow(tx), after = Date.now();
      expect(value.getTime()).toBeGreaterThanOrEqual(before - 1000); expect(value.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });
  it("holds API submission without verified merchant facts, preserving receivedAt and one stable key", async () => {
    const x = await fixture(); await x.service().submit(x.input);
    expect(x.gateway.submit).not.toHaveBeenCalled();
    expect(await x.execution()).toMatchObject({ state: "READY", attemptCount: 0, firstAttemptAt: null });
    expect((await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).receivedAt).toEqual(x.row.receivedAt);
    expect(await f.admin.refundExecutionAttempt.count({ where: { executionId: (await x.execution()).id } })).toBe(1);
  });
  it("persists intent/POST attempt before provider access and never treats accepted as completed", async () => {
    const x = await fixture(); await x.rule();
    vi.mocked(x.gateway.submit).mockImplementationOnce(async raw => {
      const operation = await x.execution(); expect(operation).toMatchObject({ state: "SUBMITTING", attemptCount: 1 }); expect(operation.firstAttemptAt).not.toBeNull();
      const attempt = await f.admin.refundExecutionAttempt.findUniqueOrThrow({ where: { submissionKey: x.input.submissionKey } }); expect(attempt).toMatchObject({ state: "SUBMITTING", attemptNumber: 1 });
      expect(raw).toMatchObject({ refundKey: operation.refundKey, amountRp: "100003", reason });
      return { kind: "accepted", reference: "not-bank-final" };
    });
    await x.service().submit(x.input);
    expect(await x.execution()).toMatchObject({ state: "ACCEPTED", attemptCount: 1 });
    expect(await f.admin.refundCompletion.count({ where: { executionId: (await x.execution()).id } })).toBe(0);
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: x.payment.id } })).status).toBe("SETTLED");
    expect((await readOrderPaymentIssues(f.admin, x.order.id, "COMPLETED")).map(value => value.kind)).toContain("REFUND_RECONCILIATION");
  });
  it("deduplicates overlapping and replayed submissions; key reuse with changed body conflicts", async () => {
    const x = await fixture(); await x.rule();
    await Promise.all([x.service().submit(x.input), x.service().submit(x.input)]);
    await x.service().submit(x.input); expect(x.gateway.submit).toHaveBeenCalledTimes(1);
    await expect(x.service().submit({ ...x.input, publicReason: "Alasan baru yang tidak boleh mengganti intent." })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("keeps a timeout unknown and never retries it through a new browser submission key", async () => {
    const x = await fixture(); await x.rule(); vi.mocked(x.gateway.submit).mockResolvedValue({ kind: "unknown", reason: "TIMEOUT" });
    await x.service().submit(x.input);
    await expect(x.service().submit({ ...x.input, expectedVersion: 3, submissionKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(x.gateway.submit).toHaveBeenCalledTimes(1); expect(await x.execution()).toMatchObject({ state: "UNKNOWN", attemptCount: 1 });
  });
  it("retries a definite rate limit with identical key/body inside the original first-attempt window", async () => {
    const x = await fixture(); await x.rule(); vi.mocked(x.gateway.submit).mockResolvedValueOnce({ kind: "retryable", retryAfterMs: 0 });
    await x.service().submit(x.input); const first = await x.execution();
    await x.service().submit({ ...x.input, expectedVersion: 3, submissionKey: randomUUID() });
    expect(vi.mocked(x.gateway.submit).mock.calls[0][0]).toEqual(vi.mocked(x.gateway.submit).mock.calls[1][0]);
    expect(await x.execution()).toMatchObject({ attemptCount: 2, firstAttemptAt: first.firstAttemptAt, refundKey: first.refundKey });
  });
  it("honors persisted cooldown and merchant validity/channel binding", async () => {
    const x = await fixture(); await x.rule(); vi.mocked(x.gateway.submit).mockResolvedValue({ kind: "retryable", retryAfterMs: 60000 });
    await x.service().submit(x.input);
    await expect(x.service().submit({ ...x.input, expectedVersion: 3, submissionKey: randomUUID() })).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const y = await fixture(); await y.rule();
    const original = await y.gateway.getStatus({ providerOrderId: y.payment.providerOrderId, providerTransactionId: y.payment.providerTransactionId, amountRp: "100003" }, AbortSignal.timeout(1000));
    if (original.kind !== "found") throw new Error("Fixture status missing");
    vi.mocked(y.gateway.getStatus).mockResolvedValue({ ...original, proof: { ...original.proof, providerChannel: "other-acquirer" } });
    await y.service().submit(y.input); expect(y.gateway.submit).not.toHaveBeenCalled();
  });
  it.each(["unavailable", "not-found", "pending"] as const)("leaves a failed retry preflight %s recoverable without resetting its key or POST window", async kind => {
    const x = await fixture(); await x.rule();
    vi.mocked(x.gateway.submit).mockResolvedValueOnce({ kind: "retryable", retryAfterMs: 0 });
    await x.service().submit(x.input);
    const before = await x.execution();
    const held: RefundQueryResult = kind === "pending" ? await x.bank({ refunds: [{ refund_key: before.refundKey,
      refund_chargeback_id: "TEST-PENDING-RETRY", refund_amount: "100003" }] }) : kind === "not-found" ? { kind: "not-found" } : { kind: "unavailable", reason: "TIMEOUT" };
    vi.mocked(x.gateway.getStatus).mockResolvedValueOnce(held);
    await x.service().submit({ ...x.input, expectedVersion: 3, submissionKey: randomUUID() });
    expect(await x.execution()).toMatchObject({ state: "UNKNOWN", refundKey: before.refundKey, firstAttemptAt: before.firstAttemptAt, attemptCount: 1 });
    expect(x.gateway.submit).toHaveBeenCalledTimes(1);
    vi.mocked(x.gateway.getStatus).mockResolvedValue(await x.bank());
    await x.service().reconcile(x.order.id);
    expect(await x.execution()).toMatchObject({ state: "CONFIRMED", refundKey: before.refundKey, firstAttemptAt: before.firstAttemptAt, attemptCount: 1 });
    expect(await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).toMatchObject({ status: "COMPLETED" });
  });
  it("denies Admin, revoked Owner, stale version, wrong allocation and unready return", async () => {
    const x = await fixture(); await x.rule();
    await expect(x.service({ ...x.access, profile: { ...x.access.profile, role: "ADMIN" } }).submit(x.input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(x.service().submit({ ...x.input, expectedVersion: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(x.service().submit({ ...x.input, allocationId: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    await f.admin.refundCase.update({ where: { id: x.row.id }, data: { readyAt: null } });
    await expect(x.service().submit(x.input)).rejects.toMatchObject({ code: "CONFLICT" });
    await f.admin.adminProfile.update({ where: { id: x.access.profile.id }, data: { isActive: false } });
    await expect(x.service().submit(x.input)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(x.gateway.submit).not.toHaveBeenCalled();
  });
  it("holds a changed authoritative payment snapshot before any POST", async () => {
    const x = await fixture(); await x.rule(); await f.admin.paymentAttempt.create({ data: { orderId: x.order.id, providerOrderId: randomUUID(), providerTransactionId: randomUUID(), purpose: "CUSTOM_SHIPPING", amountRp: "10004", status: "SETTLED", settledAt: new Date(), expiresAt: new Date(Date.now() + 60000) } });
    await expect(x.service().submit(x.input)).rejects.toMatchObject({ code: "CONFLICT" }); expect(x.gateway.getStatus).not.toHaveBeenCalled();
  });
  it("keeps accepted/notification without bank finality open, then confirms once from matching GET bank proof", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    const pending = await x.bank({ refunds: [{ refund_key: (await x.execution()).refundKey, refund_chargeback_id: "pending-ref", refund_amount: "100003" }] });
    vi.mocked(x.gateway.getStatus).mockResolvedValue(pending); await x.service().reconcile(x.order.id);
    expect(await f.admin.refundCompletion.count({ where: { executionId: (await x.execution()).id } })).toBe(0);
    const webhook = await new PaymentWebhookRepository(f.admin).processMidtransWebhook({ eventFingerprint: randomUUID(), now: new Date(), notification: {
      orderId: x.payment.providerOrderId, transactionId: x.payment.providerTransactionId!, transactionStatus: "refund", statusCode: "200", grossAmount: "100003.00", signatureKey: "synthetic" } });
    expect(webhook.processingResult).toBe("REFUND_REQUIRES_RECONCILIATION");
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: x.payment.id } })).status).toBe("SETTLED");
    const final = await x.bank();
    if (final.kind === "found") expect(final.proof.refunds[0].confirmedAt!.getTime(), `bank ${final.proof.refunds[0].confirmedAt!.toISOString()} first ${(await x.execution()).firstAttemptAt!.toISOString()}`).toBeGreaterThanOrEqual((await x.execution()).firstAttemptAt!.getTime());
    vi.mocked(x.gateway.getStatus).mockResolvedValue(final);
    await Promise.all([x.service().reconcile(x.order.id), x.service().reconcile(x.order.id)]);
    expect(await f.admin.refundCompletion.count({ where: { executionId: (await x.execution()).id } })).toBe(1);
    expect((await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).status).toBe("COMPLETED");
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: x.payment.id } })).status).toBe("REFUNDED");
    expect(await f.admin.expenseEntry.count()).toBe(0); expect(await f.admin.stockMovement.count()).toBe(0);
  });
  it("holds partial, wrong key and unavailable results without a second payout", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    vi.mocked(x.gateway.getStatus).mockResolvedValue(await x.bank({ transaction_status: "partial_refund", refund_amount: "1", refunds: [{ refund_key: (await x.execution()).refundKey, refund_chargeback_id: "partial", refund_amount: "1", bank_confirmed_at: new Date().toISOString() }] }));
    await x.service().reconcile(x.order.id); expect(await x.execution()).toMatchObject({ state: "EXCEPTION" });
    vi.mocked(x.gateway.getStatus).mockResolvedValue(await x.bank({ refunds: [{ refund_key: "unknown_external_key", refund_chargeback_id: "foreign", refund_amount: "100003", bank_confirmed_at: new Date().toISOString() }] }));
    await x.service().reconcile(x.order.id);
    expect(await f.admin.refundCompletion.count({ where: { executionId: (await x.execution()).id } })).toBe(0);
    vi.mocked(x.gateway.getStatus).mockResolvedValue({ kind: "not-found" }); await x.service().reconcile(x.order.id); expect(await x.execution()).toMatchObject({ state: "EXCEPTION" });
  });

  it("rechecks an existing matching bank receipt after a later exception without duplicating money", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    const target = (await x.repository.targetsForOwner(x.access, x.order.id))[0], final = await x.bank();
    await x.repository.observe(target, randomUUID(), final);
    const partial = await x.bank({ transaction_status: "partial_refund", refund_amount: "50000", refunds: [{ refund_key: (await x.execution()).refundKey,
      refund_chargeback_id: `partial-${randomUUID()}`, refund_amount: "50000", bank_confirmed_at: new Date().toISOString() }] });
    await x.repository.observe(target, randomUUID(), partial);
    expect(await x.execution()).toMatchObject({ state: "EXCEPTION" });
    await x.repository.observe(target, randomUUID(), final);
    expect(await x.execution()).toMatchObject({ state: "CONFIRMED" });
    expect(await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).toMatchObject({ status: "COMPLETED" });
    expect(await f.admin.refundCompletion.count({ where: { executionId: target.id } })).toBe(1);
    expect(x.gateway.submit).toHaveBeenCalledTimes(1);
  });
  it("keeps verified receipts when a new settlement changes the case total during reconciliation", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    await f.admin.paymentAttempt.create({ data: { orderId: x.order.id, providerOrderId: randomUUID(), providerTransactionId: randomUUID(), purpose: "CUSTOM_SHIPPING", amountRp: "17003", status: "SETTLED", settledAt: new Date(), expiresAt: new Date(Date.now() + 60000) } });
    vi.mocked(x.gateway.getStatus).mockResolvedValue(await x.bank()); await x.service().reconcile(x.order.id);
    expect(await f.admin.refundCompletion.count({ where: { executionId: (await x.execution()).id } })).toBe(1);
    expect((await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).status).toBe("RECONCILING");
  });
  it("keeps mixed MAKE receipts open when another completed allocation still has a financial exception", async () => {
    const x = await fixture(true); await x.rule(); await x.service().submit(x.input);
    const targets = await x.repository.targetsForOwner(x.access, x.order.id);
    const first = targets.find(value => value.target.amountRp === "100003")!;
    const shipping = targets.find(value => value.target.amountRp === "17003")!, final = await x.bank();
    await x.repository.observe(first, randomUUID(), final);
    const authorizationId = await x.service().authorizeManual(await x.manual());
    const authorized = await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } });
    await x.service().confirmManual({ orderId: x.order.id, authorizationId, expectedVersion: authorized.version, submissionKey: randomUUID(),
      transferReference: `TEST-MIXED-${randomUUID()}`, evidenceReference: "TEST-MIXED-SHIPPING-BANK", paidAt: new Date().toISOString() });
    expect(await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).toMatchObject({ status: "COMPLETED" });
    const operation = await f.admin.refundExecution.findUniqueOrThrow({ where: { id: shipping.id } });
    const partial: RefundQueryResult = { kind: "found", proof: parseRefundStatusProof({ order_id: shipping.target.providerOrderId,
      transaction_id: shipping.target.providerTransactionId, gross_amount: shipping.target.amountRp, payment_type: "gopay", status_code: "200",
      transaction_status: "partial_refund", refund_amount: "8000", refunds: [{ refund_key: operation.refundKey,
        refund_chargeback_id: `TEST-SHIPPING-PARTIAL-${randomUUID()}`, refund_amount: "8000", bank_confirmed_at: new Date().toISOString() }] }, shipping.target, new Date()) };
    await x.repository.observe(shipping, randomUUID(), partial);
    await x.repository.observe(first, randomUUID(), final);
    expect(await f.admin.refundExecution.findUniqueOrThrow({ where: { id: shipping.id } })).toMatchObject({ state: "EXCEPTION" });
    expect(await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).toMatchObject({ status: "RECONCILING", completedAt: null });
    expect(await f.admin.refundCompletion.count({ where: { executionId: { in: targets.map(value => value.id) } } })).toBe(2);
    expect(x.gateway.submit).toHaveBeenCalledTimes(1);
  });
  it.each(["partial", "external"] as const)("holds manual authorization after verified %s money movement even after a later settled observation", async kind => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    const operation = await x.execution();
    const result = await x.bank({ transaction_status: kind === "partial" ? "partial_refund" : "refund", refund_amount: kind === "partial" ? "50000" : "100003",
      refunds: [{ refund_key: kind === "partial" ? operation.refundKey : "external_refund_key", refund_chargeback_id: `TEST-${kind}-${randomUUID()}`,
        refund_amount: kind === "partial" ? "50000" : "100003", bank_confirmed_at: new Date().toISOString() }] });
    const target = (await x.repository.targetsForOwner(x.access, x.order.id))[0];
    await x.repository.observe(target, randomUUID(), result);
    await expect(x.service().authorizeManual(await x.manual())).rejects.toMatchObject({ code: "CONFLICT" });
    await x.repository.observe(target, randomUUID(), await x.gateway.getStatus(target.target, new AbortController().signal));
    await expect(x.service().authorizeManual(await x.manual())).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await f.admin.refundManualAuthorization.count({ where: { caseId: x.row.id } })).toBe(0);
    expect(await f.admin.refundCompletion.count({ where: { executionId: operation.id } })).toBe(0);
    expect(await x.execution()).toMatchObject({ state: "EXCEPTION" });
    expect(x.gateway.submit).toHaveBeenCalledTimes(1);
  });
  it("preserves a financial hold through manual revocation and rejects reauthorization or another POST", async () => {
    const x = await fixture(), authorizationId = await x.service().authorizeManual(await x.manual());
    const target = (await x.repository.targetsForOwner(x.access, x.order.id))[0];
    await x.repository.observe(target, randomUUID(), await x.bank({ transaction_status: "partial_refund", refund_amount: "50000",
      refunds: [{ refund_key: (await x.execution()).refundKey, refund_chargeback_id: `TEST-PARTIAL-REVOKE-${randomUUID()}`,
        refund_amount: "50000", bank_confirmed_at: new Date().toISOString() }] }));
    const row = await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } });
    await x.service().revokeManual({ orderId: x.order.id, authorizationId, expectedVersion: row.version, submissionKey: randomUUID(), reason: "Persetujuan dicabut karena ada bukti refund parsial." });
    await expect(x.service().authorizeManual(await x.manual())).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(x.service().submit({ ...x.input, expectedVersion: row.version + 1, submissionKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await x.execution()).toMatchObject({ state: "EXCEPTION" });
    expect(await f.admin.refundManualPayout.count({ where: { authorizationId } })).toBe(0);
    expect(x.gateway.submit).not.toHaveBeenCalled();
  });
  it("does not reuse a provider bank reference already recorded for another operation", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    const first = await x.bank(); vi.mocked(x.gateway.getStatus).mockResolvedValue(first); await x.service().reconcile(x.order.id);
    if (first.kind !== "found") throw new Error("Fixture proof missing");
    const y = await fixture(); await y.rule(); await y.service().submit(y.input);
    vi.mocked(y.gateway.getStatus).mockResolvedValue(await y.bank({ refunds: [{ refund_key: (await y.execution()).refundKey, refund_chargeback_id: first.proof.refunds[0].reference, refund_amount: "100003", bank_confirmed_at: new Date().toISOString() }] }));
    await y.service().reconcile(y.order.id);
    expect(await y.execution()).toMatchObject({ state: "EXCEPTION" }); expect(await f.admin.refundCompletion.count({ where: { executionId: (await y.execution()).id } })).toBe(0);
  });
  it("allows the remaining MAKE allocation after the first bank receipt without changing the approved full total", async () => {
    const x = await fixture(true); await x.rule(); await x.service().submit(x.input);
    const originalStatus = vi.mocked(x.gateway.getStatus).getMockImplementation()!, proof = await x.bank();
    vi.mocked(x.gateway.getStatus).mockImplementation((raw, signal) => (raw as RefundCommand).providerOrderId === x.payment.providerOrderId ? Promise.resolve(proof) : originalStatus(raw, signal));
    await x.service().reconcile(x.order.id);
    const shipping = x.row.allocations.find(item => item.paymentAttemptId !== x.payment.id)!;
    await x.service().submit({ ...x.input, allocationId: shipping.id, expectedVersion: 3, submissionKey: randomUUID() });
    expect(x.gateway.submit).toHaveBeenCalledTimes(2);
    const view = await new RefundRepository(f.admin).readAdmin(x.access, x.order.id);
    expect(view.refund?.amountRp).toBe("117006"); expect(view.snapshotChanged).toBe(false); expect(view.eligibilityIssue).toBeNull();
    const encoded = serializePrivacyExport(await f.admin.$transaction(tx => exportCustomerData(tx, x.customer.id, new Date())));
    expect(encoded).toContain('"source": "PROVIDER"'); expect(encoded).not.toContain((await x.execution()).refundKey); expect(encoded).not.toContain("MERCHANT-BALANCE");
  });
  it("requires explicit no-pending resolution and recipient proof before authorizing manual fallback", async () => {
    const x = await fixture();
    await expect(x.service().authorizeManual({ ...await x.manual(), providerConfirmedNoPending: false })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(x.service().authorizeManual({ ...await x.manual(), providerResolutionReference: "" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const authorization = await x.service().authorizeManual(await x.manual()); expect(authorization).toBeTruthy();
    expect(await x.execution()).toMatchObject({ state: "MANUAL_AUTHORIZED", attemptCount: 0 });
    await expect(x.service().submit({ ...x.input, expectedVersion: 3 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(x.gateway.submit).not.toHaveBeenCalled();
  });

  it("revokes unused manual authorization once, blocks its payout and permits a fresh review", async () => {
    const x = await fixture();
    const authorizationId = await x.service().authorizeManual(await x.manual());
    const current = await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } });
    const input = { orderId: x.order.id, expectedVersion: current.version, submissionKey: randomUUID(), authorizationId,
      reason: "Owner mencabut persetujuan manual karena bukti provider berubah." };
    const admin = await f.admin.adminProfile.create({ data: { role: "ADMIN", isActive: true } });
    await expect(x.service({ authUserId: randomUUID(), profile: admin }).revokeManual(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await x.service().revokeManual(input);
    await x.service().revokeManual(input);
    expect(await f.admin.refundCaseRevision.count({ where: { submissionKey: input.submissionKey } })).toBe(1);
    expect(await x.execution()).toMatchObject({ state: "READY", firstAttemptAt: null, attemptCount: 0 });
    const revised = await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } });
    await expect(x.service().confirmManual({ orderId: x.order.id, authorizationId, expectedVersion: revised.version,
      submissionKey: randomUUID(), transferReference: "TEST-TRANSFER-REVOKED", evidenceReference: "TEST-BANK-REVOKED", paidAt: new Date().toISOString() })).rejects.toMatchObject({ code: "CONFLICT" });
    const view = await new RefundRepository(f.admin).readAdmin(x.access, x.order.id);
    expect(view.manualAuthorizations?.find(value => value.id === authorizationId)?.active).toBe(false);
    const replacement = await x.service().authorizeManual(await x.manual());
    expect(replacement).not.toBe(authorizationId);
    expect(x.gateway.submit).not.toHaveBeenCalled();
  });
  it("records one manual bank transfer across MAKE order and shipping allocations with exact totals and replay safety", async () => {
    const x = await fixture(true), authorizationId = await x.service().authorizeManual(await x.manual());
    const confirmation = { orderId: x.order.id, authorizationId, expectedVersion: 3, submissionKey: randomUUID(), transferReference: `BANK-TRANSFER-${randomUUID()}`, evidenceReference: "BANK-RECEIPT-VERIFIED-TEST", paidAt: new Date().toISOString() };
    const approved = await f.admin.refundManualAuthorization.findUniqueOrThrow({ where: { id: authorizationId } });
    expect(new Date(confirmation.paidAt).getTime(), `paid ${confirmation.paidAt} authorized ${approved.authorizedAt.toISOString()}`).toBeGreaterThanOrEqual(approved.authorizedAt.getTime());
    await Promise.all([x.service().confirmManual(confirmation), x.service().confirmManual(confirmation)]);
    const payout = await f.admin.refundManualPayout.findUniqueOrThrow({ where: { authorizationId }, include: { authorization: true, completions: true } });
    expect(payout.authorization.amountRp.toFixed(0)).toBe("117006"); expect(payout.completions.map(item => item.amountRp.toFixed(0)).sort()).toEqual(["100003", "17003"]);
    expect((await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).status).toBe("COMPLETED");
    await expect(x.service().confirmManual({ ...confirmation, transferReference: "CHANGED-TRANSFER-REFERENCE" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await f.admin.expenseEntry.count()).toBe(0);
  });
  it("rejects manual recording before authorization, future times, stale approvals and missing evidence", async () => {
    const x = await fixture(), authorizationId = await x.service().authorizeManual(await x.manual());
    const input = { orderId: x.order.id, authorizationId, expectedVersion: 3, submissionKey: randomUUID(), transferReference: `BANK-${randomUUID()}`, evidenceReference: "EVIDENCE-RECEIPT-TEST", paidAt: new Date(Date.now() + 60000).toISOString() };
    await expect(x.service().confirmManual(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(x.service().confirmManual({ ...input, expectedVersion: 2 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(x.service().confirmManual({ ...input, evidenceReference: "https://private.example.test/token" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("keeps financial evidence through account closure and never reattaches it on new signup", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    await f.admin.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, x.customer.id, new Date()); });
    vi.mocked(x.gateway.getStatus).mockResolvedValue(await x.bank()); await x.service().reconcile(x.order.id);
    expect((await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).status).toBe("COMPLETED");
    const again = await f.admin.customer.create({ data: { email: x.customer.email!, normalizedEmail: x.customer.normalizedEmail! } });
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: x.order.id } })).customerId).toBeNull();
    await expect(new RefundRepository(f.admin).readCustomer(again.id, x.order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("protects keys, first-attempt clocks and bank/manual evidence against in-place replacement", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input); const operation = await x.execution();
    await expect(f.admin.refundExecution.update({ where: { id: operation.id }, data: { refundKey: "replacement-key" } })).rejects.toThrow();
    await expect(f.admin.refundExecution.update({ where: { id: operation.id }, data: { firstAttemptAt: new Date() } })).rejects.toThrow();
    vi.mocked(x.gateway.getStatus).mockResolvedValue(await x.bank()); await x.service().reconcile(x.order.id);
    await expect(f.admin.refundCompletion.updateMany({ where: { executionId: operation.id }, data: { amountRp: "1" } })).rejects.toThrow();
    await expect(f.admin.refundCompletion.deleteMany({ where: { executionId: operation.id } })).rejects.toThrow();
  });
  it("keeps an uncertain provider operation unknown after its manual authorization is revoked", async () => {
    const x = await fixture(); await x.rule();
    vi.mocked(x.gateway.submit).mockResolvedValue({ kind: "unknown", reason: "TIMEOUT" });
    await x.service().submit(x.input);
    const before = await x.execution(), authorizationId = await x.service().authorizeManual(await x.manual());
    const row = await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } });
    await x.service().revokeManual({ orderId: x.order.id, authorizationId, expectedVersion: row.version, submissionKey: randomUUID(), reason: "Bukti pengecualian dicabut untuk pemeriksaan provider lanjutan." });
    expect(await x.execution()).toMatchObject({ state: "UNKNOWN", refundKey: before.refundKey, firstAttemptAt: before.firstAttemptAt, attemptCount: 1 });
    await expect(x.service().submit({ ...x.input, expectedVersion: row.version + 1, submissionKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(x.gateway.submit).toHaveBeenCalledTimes(1);
  });

  it("holds a late provider acceptance after manual authorization and never records a second payout", async () => {
    const x = await fixture(); await x.rule();
    let entered!: () => void, release!: (value: RefundSubmissionResult) => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const response = new Promise<RefundSubmissionResult>(resolve => { release = resolve; });
    vi.mocked(x.gateway.submit).mockImplementationOnce(() => { entered(); return response; });
    const submitting = x.service().submit(x.input);
    await started;
    try {
      const target = (await x.repository.targetsForOwner(x.access, x.order.id))[0];
      await x.repository.observe(target, randomUUID(), await x.gateway.getStatus(target.target, new AbortController().signal));
      await expect(x.service().authorizeManual(await x.manual())).rejects.toMatchObject({ code: "CONFLICT" });
      await new Promise(resolve => setTimeout(resolve, 8100));
      const authorizationId = await x.service().authorizeManual(await x.manual());
      release({ kind: "accepted", reference: "LATE-PROVIDER-ACCEPTANCE-FIXTURE" });
      await submitting;
      expect(await x.execution()).toMatchObject({ state: "EXCEPTION" });
      const row = await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } });
      expect(row).toMatchObject({ status: "RECONCILING", completedAt: null });
      await expect(x.service().confirmManual({ orderId: x.order.id, authorizationId, expectedVersion: row.version, submissionKey: randomUUID(),
        transferReference: "TEST-LATE-TRANSFER", evidenceReference: "TEST-LATE-BANK-PROOF", paidAt: new Date().toISOString() })).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await f.admin.refundCompletion.count({ where: { executionId: target.id } })).toBe(0);
      expect(await f.admin.refundManualPayout.count({ where: { authorizationId } })).toBe(0);
      expect(x.gateway.submit).toHaveBeenCalledTimes(1);
    } finally { release({ kind: "unknown", reason: "TIMEOUT" }); await submitting; }
  }, 20000);

  it("rolls bank receipt, payment and audit back when the canonical lease is lost during apply", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    const target = (await x.repository.targetsForOwner(x.access, x.order.id))[0], final = await x.bank();
    class ExpiringRepository extends RefundExecutionRepository {
      override async observeIn(...args: Parameters<RefundExecutionRepository["observeIn"]>): Promise<string> {
        const outcome = await super.observeIn(...args);
        await f.admin.operationalJobState.update({ where: { name: "REFUND_RECONCILIATION" }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
        return outcome;
      }
    }
    const repository = new ExpiringRepository(f.client), candidates = repository.candidates.bind(repository);
    vi.spyOn(repository, "candidates").mockImplementation(async (tx, limit) => (await candidates(tx, 100)).filter(value => value.id === target.id).slice(0, limit));
    const gateway: RefundGateway = { submit: vi.fn(), getStatus: vi.fn<RefundGateway["getStatus"]>(async () => final) };
    const handlers = { ...createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source }), REFUND_RECONCILIATION: createRefundReconciliationHandler(() => gateway, repository) };
    const runner = new JobRunner({ bound: f.bound, repository: new PrismaJobRepository(), expectedRole: f.role,
      policy: { leaseMs: 30000, minIntervalMs: 0, failureCooldownMs: 1 }, handlers });
    expect(await runner.run({ job: "REFUND_RECONCILIATION", mode: "execute", limit: 1 })).toMatchObject({ state: "lost-lease" });
    expect(await f.admin.refundCompletion.count({ where: { executionId: target.id } })).toBe(0);
    expect(await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: x.payment.id } })).toMatchObject({ status: "SETTLED" });
    expect(await f.admin.refundCase.findUniqueOrThrow({ where: { id: x.row.id } })).toMatchObject({ status: "RECONCILING", completedAt: null });
    expect(await f.admin.auditLog.count({ where: { entityId: x.row.id, action: "refund.provider-confirmed" } })).toBe(0);
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("reconciles through canonical role/binding/lease, dry-run and lag monitoring without POST", async () => {
    const x = await fixture(); await x.rule(); await x.service().submit(x.input);
    const final = await x.bank();
    const gateway: RefundGateway = { submit: vi.fn(), getStatus: vi.fn<RefundGateway["getStatus"]>(async raw => {
      const target = raw as RefundCommand;
      return target.providerOrderId === x.payment.providerOrderId ? final : { kind: "unavailable", reason: "PROVIDER_ERROR" };
    }) };
    await f.admin.$executeRawUnsafe(`REVOKE SELECT ON customers, customer_sessions, admin_profiles FROM "${f.role}"`);
    await f.admin.$executeRawUnsafe(`REVOKE INSERT, DELETE, TRUNCATE ON refund_executions, refund_execution_attempts, refund_manual_authorizations, refund_manual_payouts, refund_merchant_rules FROM "${f.role}"`);
    await f.admin.$executeRawUnsafe(`REVOKE UPDATE, DELETE, TRUNCATE ON refund_completions, refund_observations FROM "${f.role}"`);
    const scoped = new RefundExecutionRepository(f.client), original = scoped.candidates.bind(scoped);
    vi.spyOn(scoped, "candidates").mockImplementation(async (tx, limit) => (await original(tx, 100)).filter(value => value.id === finalTarget.id).slice(0, limit));
    const finalTarget = (await x.repository.targetsForOwner(x.access, x.order.id))[0];
    const jobRepo = new PrismaJobRepository(), handlers = { ...createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source }), REFUND_RECONCILIATION: createRefundReconciliationHandler(() => gateway, scoped) };
    const runner = new JobRunner({ bound: f.bound, repository: jobRepo, expectedRole: f.role, policy: { leaseMs: 30000, minIntervalMs: 0, failureCooldownMs: 1 }, handlers });
    const dry = await runner.run({ job: "REFUND_RECONCILIATION", mode: "dry-run", limit: 100 }); expect(dry.state).toBe("completed"); expect(gateway.getStatus).not.toHaveBeenCalled();
    const result = await runner.run({ job: "REFUND_RECONCILIATION", mode: "execute", limit: 1 });
    expect(result).toMatchObject({ state: "completed", counts: { accepted: 1, scanned: 1 } }); expect(gateway.submit).not.toHaveBeenCalled();
    expect((await new JobMonitoring(f.bound, jobRepo, f.role).inspect({ maxLagMs: 1 })).refund.remainingDue).toBeGreaterThan(0);
    await expect(f.client.refundCompletion.deleteMany()).rejects.toThrow();
  });
});
