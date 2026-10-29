import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { MoneyDecimal } from "../finance/money";
import { lockPaymentOrder } from "./operational-repository";
import { minimizePaymentEventPayload } from "./payload";
import { PaymentWebhookRepository } from "./webhook-repository";
import type { PaymentStatusResult, PaymentStatusTarget } from "./status-gateway";

export type ReconciliationTarget = PaymentStatusTarget & { id: string; orderId: string };
// Owner Q10 (30 October 2026): an expired attempt that never got a Midtrans
// transaction (abandoned Snap) stops being polled 7 days after it was created;
// Midtrans payment windows are far shorter, so no payment can still arrive.
export const ABANDONED_ATTEMPT_RECONCILIATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const eligible = (now: Date) => Prisma.sql`
  p.provider = 'MIDTRANS' AND p.status <> 'REFUNDED'
  AND NOT (p.status = 'EXPIRED' AND p.provider_transaction_id IS NULL
    AND p.created_at < ${new Date(now.getTime() - ABANDONED_ATTEMPT_RECONCILIATION_WINDOW_MS)})
  AND NOT EXISTS (SELECT 1 FROM payment_events e WHERE e.payment_attempt_id = p.id AND e.processing_result IN ('PARTIAL_REFUND_REQUIRES_EXCEPTION', 'REFUNDED_AFTER_LATE_SETTLEMENT', 'REFUND_REQUIRES_RECONCILIATION'))
  AND (
    (p.status IN ('PENDING', 'FAILED', 'EXPIRED', 'CANCELLED') AND NOT EXISTS
      (SELECT 1 FROM payment_events e WHERE e.payment_attempt_id = p.id AND e.processing_result = 'LATE_SETTLEMENT_REFUND_REQUIRED'))
    OR EXISTS (SELECT 1 FROM payment_events bad WHERE bad.payment_attempt_id = p.id
      AND bad.processing_result IN ('AMOUNT_MISMATCH', 'PROVIDER_TRANSACTION_CONFLICT', 'SETTLEMENT_STATUS_CODE_INVALID')
      AND NOT EXISTS (SELECT 1 FROM payment_events good WHERE good.payment_attempt_id = p.id
        AND good.processing_result IN ('SETTLED', 'STALE_SETTLED', 'LATE_SETTLEMENT_REFUND_REQUIRED')
        AND (good.received_at, good.id) > (bad.received_at, bad.id)))
  )`;
const checked = Prisma.sql`LEFT JOIN LATERAL (SELECT max(c.checked_at) AS last_checked_at FROM payment_reconciliation_checks c WHERE c.payment_attempt_id = p.id) checks ON TRUE`;
export async function paymentReconciliationBacklog(tx: Prisma.TransactionClient, now: Date): Promise<{ remainingDue: number; lagMs: number }> {
  const [row] = await tx.$queryRaw<{ count: bigint; oldest: Date | null }[]>(Prisma.sql`SELECT count(*) AS count, min(COALESCE(checks.last_checked_at, p.created_at)) AS oldest FROM payment_attempts p ${checked} WHERE ${eligible(now)}`);
  return { remainingDue: Number(row?.count ?? 0), lagMs: row?.oldest ? Math.max(0, now.getTime() - row.oldest.getTime()) : 0 };
}
export class PaymentReconciliationRepository {
  private readonly webhook: PaymentWebhookRepository;
  constructor(prisma: PrismaClient) { this.webhook = new PaymentWebhookRepository(prisma); }
  candidates(tx: Prisma.TransactionClient, now: Date, limit: number): Promise<ReconciliationTarget[]> {
    return tx.$queryRaw(Prisma.sql`SELECT p.id, p.order_id AS "orderId", p.provider_order_id AS "providerOrderId", p.provider_transaction_id AS "providerTransactionId"
      FROM payment_attempts p ${checked} WHERE ${eligible(now)} ORDER BY checks.last_checked_at ASC NULLS FIRST, p.created_at, p.id LIMIT ${limit}`);
  }
  async applyIn(tx: Prisma.TransactionClient, target: ReconciliationTarget, runId: string, result: PaymentStatusResult, now: Date): Promise<string> {
    await lockPaymentOrder(tx, target.orderId);
    const prior = await tx.paymentReconciliationCheck.findUnique({ where: { runId_paymentAttemptId: { runId, paymentAttemptId: target.id } } });
    if (prior) return prior.outcome;
    const fingerprint = createHash("sha256").update(`MIDTRANS_STATUS\0${runId}\0${target.id}`).digest("hex");
    let outcome: string, failureCategory: string | null = null;
    if (result.kind === "unavailable") { outcome = "UNAVAILABLE"; failureCategory = result.reason; }
    else if (result.kind === "not-found") outcome = "NOT_FOUND";
    else {
      const notification = result.notification;
      if (["refund", "partial_refund", "chargeback"].includes(notification.transactionStatus)) {
        const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: target.id } });
        const conflict = notification.transactionId ? await tx.paymentAttempt.findFirst({ where: { providerTransactionId: notification.transactionId, NOT: { id: target.id } }, select: { id: true } }) : null;
        outcome = !new MoneyDecimal(attempt.amountRp.toString()).eq(notification.grossAmount) ? "AMOUNT_MISMATCH" :
          conflict !== null || notification.orderId !== attempt.providerOrderId || attempt.providerTransactionId !== null && attempt.providerTransactionId !== notification.transactionId ? "PROVIDER_TRANSACTION_CONFLICT" : "REFUND_REQUIRES_RECONCILIATION";
        await tx.paymentEvent.createMany({ data: [{ id: randomUUID(), provider: "MIDTRANS", paymentAttemptId: target.id, providerOrderId: target.providerOrderId,
          providerTransactionId: notification.transactionId, eventFingerprint: fingerprint, processedAt: now, processingResult: outcome,
          payloadJson: minimizePaymentEventPayload({ orderId: notification.orderId, transactionId: notification.transactionId ?? null, grossAmount: notification.grossAmount,
            statusCode: notification.statusCode, transactionStatus: notification.transactionStatus, fraudStatus: notification.fraudStatus ?? null }) }], skipDuplicates: true });
      } else {
        const processed = await this.webhook.processMidtransWebhookIn(tx, { eventFingerprint: fingerprint, notification, now });
        outcome = processed.processingResult;
      }
    }
    const previous = await tx.paymentReconciliationCheck.findFirst({ where: { paymentAttemptId: target.id }, orderBy: [{ checkedAt: "desc" }, { id: "desc" }], select: { outcome: true, failureCategory: true } });
    await tx.paymentReconciliationCheck.create({ data: { runId, paymentAttemptId: target.id, checkedAt: now, outcome, failureCategory, eventFingerprint: result.kind === "found" ? fingerprint : null } });
    if (!previous || previous.outcome !== outcome || previous.failureCategory !== failureCategory) await tx.auditLog.create({ data: { actorType: "SYSTEM", entityType: "PaymentEvent", entityId: target.orderId, action: "payment.reconciliation.processed", afterJson: { processingResult: outcome }, metadataJson: { provider: "MIDTRANS", failureCategory } } });
    return outcome;
  }
}
