import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { isolatedOperationalJobFixture } from "../helpers/isolated-operational-job-fixture";
import { createJobHandlers } from "@/modules/jobs/handlers";
import { JobRunner } from "@/modules/jobs/runner";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { MidtransStatusGateway } from "@/modules/payment/status-gateway";
import { PaymentWebhookService } from "@/modules/payment/webhook-service";
import { PaymentWebhookRepository } from "@/modules/payment/webhook-repository";
import { PaymentReconciliationRepository } from "@/modules/payment/reconciliation-repository";
import { createPaymentReconciliationHandler } from "@/modules/payment/reconciliation-job";
import { readOrderPaymentIssues } from "@/modules/payment/operational-repository";
import { RefundRepository } from "@/modules/refund/repository";
import { PrismaActivityTargetReader } from "@/modules/admin/notifications/target-repository";
import { requiresNotificationAttention } from "@/modules/admin/notifications/service";
import type { PaymentAttemptStatus } from "@/generated/prisma/client";
vi.mock("server-only", () => ({}));

let f: Awaited<ReturnType<typeof isolatedOperationalJobFixture>>;
const orders: string[] = [], products: string[] = [], customers: string[] = [];
const key = "synthetic-status-server-key", policy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1 };
const request = { job: "PAYMENT_RECONCILIATION", mode: "execute", limit: 10 } as const;
beforeAll(async () => {
  f = await isolatedOperationalJobFixture();
  if (!/^niuva_job_[a-f0-9]{32}$/.test(f.role)) throw new Error("Invalid fixture role");
  await f.admin.$executeRawUnsafe(`REVOKE ALL ON refund_cases, refund_allocations, refund_approvals, refund_return_receipts, refund_case_revisions, customers, customer_sessions FROM "${f.role}"`);
  await f.admin.$executeRawUnsafe(`REVOKE DELETE ON payment_attempts, payment_events, payment_reconciliation_checks, orders, stock_movements FROM "${f.role}"`);
});
afterEach(async () => {
  await f.admin.operationalJobState.deleteMany();
  await f.admin.auditLog.deleteMany({ where: { entityId: { in: orders } } });
  await f.admin.paymentReconciliationCheck.deleteMany({ where: { paymentAttempt: { orderId: { in: orders } } } });
  await f.admin.paymentEvent.deleteMany({ where: { paymentAttempt: { orderId: { in: orders } } } });
  await f.admin.paymentAttempt.deleteMany({ where: { orderId: { in: orders } } });
  await f.admin.stockMovement.deleteMany({ where: { orderId: { in: orders } } });
  await f.admin.stockReservation.deleteMany({ where: { orderId: { in: orders } } });
  await f.admin.orderItem.deleteMany({ where: { orderId: { in: orders } } });
  await f.admin.order.deleteMany({ where: { id: { in: orders } } });
  await f.admin.productVariant.deleteMany({ where: { productId: { in: products } } });
  await f.admin.product.deleteMany({ where: { id: { in: products } } });
  await f.admin.customer.deleteMany({ where: { id: { in: customers } } });
  orders.length = 0; products.length = 0; customers.length = 0;
});
afterAll(async () => { await f?.dispose(); });
async function fixture(status: PaymentAttemptStatus = "PENDING") {
  const suffix = randomUUID(), email = `status-${suffix}@example.test`;
  const customer = await f.admin.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date() } }); customers.push(customer.id);
  const product = await f.admin.product.create({ data: { name: "Synthetic reconciliation", slug: `status-${suffix}`, description: "Synthetic fixture" } }); products.push(product.id);
  const variant = await f.admin.productVariant.create({ data: { productId: product.id, name: "Fixture", sku: `STATUS-${suffix}`, stockOnHand: 4, priceRp: "100000", weightGrams: "10" } });
  const createdAt = new Date(Date.now() - 120000);
  const order = await f.admin.order.create({ data: { createdAt, customerId: customer.id, orderNumber: `TEST-STATUS-${suffix}`, orderType: "RETAIL", status: status === "PENDING" ? "PENDING_PAYMENT" : "CANCELLED",
    customerName: "Synthetic Customer", customerEmail: email, customerPhone: "+628000000000", itemsSubtotalRp: "100000", shippingTotalRp: "0", grandTotalRp: "100000", publicTokenHash: randomUUID() } }); orders.push(order.id);
  const expiresAt = new Date(Date.now() + (status === "PENDING" ? 600000 : -60000));
  await f.admin.orderItem.create({ data: { orderId: order.id, variantId: variant.id, itemType: "PRODUCT", nameSnapshot: "Fixture", quantity: 1, unitPriceRp: "100000", lineTotalRp: "100000" } });
  const reservation = await f.admin.stockReservation.create({ data: { createdAt, orderId: order.id, variantId: variant.id, quantity: 1, status: status === "PENDING" ? "ACTIVE" : "RELEASED", expiresAt } });
  const payment = await f.admin.paymentAttempt.create({ data: { createdAt, orderId: order.id, providerOrderId: `TEST-${suffix}`, purpose: "ORDER_TOTAL", amountRp: "100000", status, expiresAt } });
  return { customer, order, variant, reservation, payment, transactionId: `txn-${payment.id}` };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
function payload(p: Fixture, extra: Record<string, unknown> = {}) {
  const body = { order_id: p.payment.providerOrderId, transaction_id: p.transactionId, status_code: "200", gross_amount: "100000.00", transaction_status: "settlement", ...extra };
  return { ...body, signature_key: createHash("sha512").update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest("hex") };
}
function runner(fetcher: typeof fetch, leaseMs = policy.leaseMs) {
  const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: fetcher });
  return new JobRunner({ bound: f.bound, repository: new PrismaJobRepository(), expectedRole: f.role, policy: { ...policy, leaseMs }, handlers: createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source, paymentStatusFactory: () => gateway }) });
}
describe("persistent payment reconciliation", () => {
  it("settles once across a racing webhook and repeated polls without a second stock movement", async () => {
    const p = await fixture(); let started!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; }), paused = new Promise<void>(resolve => { release = resolve; });
    const fetcher = vi.fn<typeof fetch>(async () => { started(); await paused; return Response.json(payload(p)); });
    const first = runner(fetcher).run(request); await entered;
    const webhook = new PaymentWebhookService({ repository: new PaymentWebhookRepository(f.admin), serverKey: key, failureLogger: { record: () => {} }, audit: async () => {} });
    try { await webhook.handleMidtransNotification(payload(p)); } finally { release(); }
    expect(await first).toMatchObject({ state: "completed", counts: { accepted: 1 } });
    expect(await runner(fetcher).run(request)).toMatchObject({ state: "completed", counts: { scanned: 0 } });
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: p.order.id } })).status).toBe("PAID");
    expect((await f.admin.productVariant.findUniqueOrThrow({ where: { id: p.variant.id } })).stockOnHand).toBe(3);
    expect(await f.admin.stockMovement.count({ where: { orderId: p.order.id } })).toBe(1);
    expect(await f.admin.paymentReconciliationCheck.count({ where: { paymentAttemptId: p.payment.id } })).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["EXPIRED", "CANCELLED", "FAILED"] as const)("records verified late settlement for %s without reopening an order or adding stock", async status => {
    const p = await fixture(status);
    expect(await runner(async () => Response.json(payload(p))).run(request)).toMatchObject({ state: "failed", counts: { unknown: 1 } });
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe(status);
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: p.order.id } })).status).toBe("CANCELLED");
    expect(await f.admin.stockMovement.count({ where: { orderId: p.order.id } })).toBe(0);
    expect(await f.admin.paymentEvent.findFirst({ where: { paymentAttemptId: p.payment.id, processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED" } })).not.toBeNull();
    expect(await runner(async () => { throw new Error("must not poll resolved late payment"); }).run(request)).toMatchObject({ counts: { scanned: 0 } });
  });
  it("does not turn provider 404 or timeout into an expired or failed payment", async () => {
    const p = await fixture();
    await runner(async () => Response.json({ status_code: "404" })).run(request);
    await f.admin.operationalJobState.deleteMany();
    await runner(async () => Response.json({ status_code: "404" })).run(request);
    await f.admin.operationalJobState.deleteMany();
    await runner(async () => { throw new Error("synthetic network failure"); }).run(request);
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe("PENDING");
    expect((await f.admin.stockReservation.findUniqueOrThrow({ where: { id: p.reservation.id } })).status).toBe("ACTIVE");
    expect(await f.admin.paymentEvent.count({ where: { paymentAttemptId: p.payment.id } })).toBe(0);
    expect((await f.admin.paymentReconciliationCheck.findMany({ where: { paymentAttemptId: p.payment.id } })).map(c => c.outcome)).toEqual(expect.arrayContaining(["NOT_FOUND", "UNAVAILABLE"]));
    expect(await f.admin.paymentReconciliationCheck.count({ where: { paymentAttemptId: p.payment.id } })).toBe(3);
    expect(await f.admin.auditLog.count({ where: { entityId: p.order.id, action: "payment.reconciliation.processed" } })).toBe(2);
  });
  it("rejects wrong amounts and invalid signatures without settlement or stock movement", async () => {
    const p = await fixture();
    await runner(async () => Response.json(payload(p, { gross_amount: "99999.00" }))).run(request);
    await f.admin.operationalJobState.deleteMany();
    await runner(async () => Response.json({ ...payload(p), signature_key: "0".repeat(128) })).run(request);
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe("PENDING");
    expect(await f.admin.stockMovement.count({ where: { orderId: p.order.id } })).toBe(0);
    expect(await f.admin.paymentEvent.count({ where: { paymentAttemptId: p.payment.id, processingResult: "AMOUNT_MISMATCH" } })).toBe(1);
  });
  it("keeps capture challenge pending and rejects an invalid settlement status code", async () => {
    const p = await fixture();
    await runner(async () => Response.json(payload(p, { transaction_status: "capture", fraud_status: "challenge" }))).run(request);
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe("PENDING");
    await runner(async () => Response.json(payload(p, { status_code: "201" }))).run(request);
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: p.order.id } })).status).toBe("PENDING_PAYMENT");
    expect(await f.admin.stockMovement.count({ where: { orderId: p.order.id } })).toBe(0);
    expect(await f.admin.paymentEvent.count({ where: { paymentAttemptId: p.payment.id, processingResult: "SETTLEMENT_STATUS_CODE_INVALID" } })).toBe(1);
  });
  it("holds an unconfirmed refund report and blocks a new refund case without marking money refunded", async () => {
    const p = await fixture(); await runner(async () => Response.json(payload(p))).run(request);
    await f.admin.paymentEvent.create({ data: { provider: "MIDTRANS", paymentAttemptId: p.payment.id, providerOrderId: p.payment.providerOrderId, eventFingerprint: randomUUID(), processingResult: "AMOUNT_MISMATCH" } });
    await runner(async () => Response.json(payload(p, { transaction_status: "refund" }))).run(request);
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe("SETTLED");
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: p.order.id } })).status).toBe("PAID");
    expect(await readOrderPaymentIssues(f.admin, p.order.id, "PAID")).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "REFUND_RECONCILIATION" })]));
    await expect(new RefundRepository(f.admin).request(p.customer.id, { orderId: p.order.id, submissionKey: randomUUID(), category: "OTHER", reason: "Synthetic duplicate refund must be held." })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await f.admin.stockMovement.count({ where: { orderId: p.order.id } })).toBe(1);
  });
  it("uses the same run/attempt identity as an idempotent receipt inside a caller transaction", async () => {
    const p = await fixture(), runId = randomUUID(), repo = new PaymentReconciliationRepository(f.client);
    const result = await new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: async () => Response.json(payload(p)) }).getStatus({ providerOrderId: p.payment.providerOrderId, providerTransactionId: null }, AbortSignal.timeout(1000));
    const target = { id: p.payment.id, orderId: p.order.id, providerOrderId: p.payment.providerOrderId, providerTransactionId: null };
    for (let i = 0; i < 2; i++) await f.client.$transaction(tx => repo.applyIn(tx, target, runId, result, new Date()));
    expect(await f.admin.paymentReconciliationCheck.count({ where: { runId } })).toBe(1);
    expect(await f.admin.stockMovement.count({ where: { orderId: p.order.id } })).toBe(1);
  });
  it("dry-run does not fetch or create state; restricted role and binding still gate the runner", async () => {
    await fixture(); const fetcher = vi.fn<typeof fetch>();
    expect(await runner(fetcher).run({ ...request, mode: "dry-run" })).toMatchObject({ counts: { scanned: 1 } });
    expect(fetcher).not.toHaveBeenCalled(); expect(await f.admin.operationalJobState.count()).toBe(0); expect(await f.admin.paymentReconciliationCheck.count()).toBe(0);
    const handlers = createJobHandlers({ prisma: f.admin, bound: f.bound, source: f.source, paymentStatusFactory: () => { throw new Error("unreachable"); } });
    const unbound = new JobRunner({ bound: f.bound, repository: new PrismaJobRepository(), expectedRole: "not_this_role", policy, handlers });
    await expect(unbound.run(request)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
  it("fences an expired lease before applying a completed provider response", async () => {
    const p = await fixture();
    const result = await runner(async () => { await f.admin.operationalJobState.update({ where: { name: request.job }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } }); return Response.json(payload(p)); }).run(request);
    expect(result.state).toBe("lost-lease"); expect(await f.admin.paymentReconciliationCheck.count()).toBe(0);
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe("PENDING"); expect(await f.admin.stockMovement.count()).toBe(0);
  });
  it("rolls settlement, stock, event and receipt back if the lease is lost inside the apply transaction", async () => {
    const p = await fixture();
    class ExpiringRepository extends PaymentReconciliationRepository {
      override async applyIn(...args: Parameters<PaymentReconciliationRepository["applyIn"]>): Promise<string> {
        const value = await super.applyIn(...args);
        await f.admin.operationalJobState.update({ where: { name: request.job }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
        return value;
      }
    }
    const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: async () => Response.json(payload(p)) });
    const handlers = { ...createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source }), PAYMENT_RECONCILIATION: createPaymentReconciliationHandler(() => gateway, new ExpiringRepository(f.client)) };
    const job = new JobRunner({ bound: f.bound, repository: new PrismaJobRepository(), expectedRole: f.role, policy, handlers });
    expect(await job.run(request)).toMatchObject({ state: "lost-lease" });
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: p.payment.id } })).status).toBe("PENDING");
    expect((await f.admin.productVariant.findUniqueOrThrow({ where: { id: p.variant.id } })).stockOnHand).toBe(4);
    expect(await f.admin.paymentEvent.count({ where: { paymentAttemptId: p.payment.id } })).toBe(0);
    expect(await f.admin.paymentReconciliationCheck.count()).toBe(0);
    expect(await f.admin.stockMovement.count()).toBe(0);
    expect(await f.admin.auditLog.count({ where: { action: "payment.reconciliation.processed" } })).toBe(0);
  });
  it("prevents overlapping launchers and persists provider cooldown", async () => {
    await fixture(); let started!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; }), paused = new Promise<void>(resolve => { release = resolve; });
    const job = runner(async () => { started(); await paused; return new Response(null, { status: 429, headers: { "retry-after": "60" } }); });
    const first = job.run(request); await entered;
    try { expect(await job.run(request)).toMatchObject({ state: "busy" }); } finally { release(); }
    expect(await first).toMatchObject({ state: "failed", cooldownMs: 60000 });
    expect(await job.run(request)).toMatchObject({ state: "cooldown" });
  });
  it("rotates bounded polls and exposes lag without private provider payloads", async () => {
    const a = await fixture(), b = await fixture(), refs: string[] = [];
    const job = runner(async url => { refs.push(String(url)); return Response.json({ status_code: "404", status_message: "private response must not be persisted" }); });
    await job.run({ ...request, limit: 1 }); await f.admin.operationalJobState.deleteMany(); await job.run({ ...request, limit: 1 });
    expect(refs).toHaveLength(2); expect(refs[0]).not.toBe(refs[1]);
    expect(await f.admin.paymentReconciliationCheck.count({ where: { paymentAttemptId: { in: [a.payment.id, b.payment.id] } } })).toBe(2);
    const inspection = await createOperationalJobRuntime({ prisma: f.client, source: f.source }).inspect({ maxLagMs: 1 });
    expect(inspection.payment.remainingDue).toBe(2); expect(JSON.stringify(inspection)).not.toContain("private response");
    const audit = await f.admin.auditLog.findFirstOrThrow({ where: { action: "payment.reconciliation.processed", entityId: a.order.id } });
    expect(requiresNotificationAttention(audit)).toBe(true);
    const reader = new PrismaActivityTargetReader(f.admin);
    expect(await reader.lookup(audit)).toEqual({ kind: "order", id: a.order.id });
    await f.admin.order.update({ where: { id: a.order.id }, data: { customerId: null, accountClosedAt: new Date() } });
    expect(await reader.lookup(audit)).toBeNull();
  });
});
