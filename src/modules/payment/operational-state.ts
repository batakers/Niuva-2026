import type { OrderStatus, PaymentAttemptStatus, PaymentPurpose } from "@/generated/prisma/client";
import { appError } from "@/modules/shared/errors";

export const PAYMENT_EXCEPTION_RESULTS = [
  "AMOUNT_MISMATCH",
  "LATE_SETTLEMENT_REFUND_REQUIRED",
  "PARTIAL_REFUND_REQUIRES_EXCEPTION",
  "PROVIDER_TRANSACTION_CONFLICT",
  "SETTLEMENT_STATUS_CODE_INVALID",
] as const;

export type PaymentIssue = Readonly<{
  kind: "FULL_REFUND" | "LATE_SETTLEMENT" | "PARTIAL_REFUND" | "PAYMENT_VERIFICATION";
  occurredAt: Date;
  paymentAttemptId: string;
  providerOrderId: string;
  purpose: PaymentPurpose;
}>;

export type OperationalPaymentAttempt = Readonly<{
  events: readonly Readonly<{ processingResult: string | null; receivedAt: Date }>[];
  id: string;
  providerOrderId: string;
  purpose: PaymentPurpose;
  status: PaymentAttemptStatus;
  updatedAt: Date;
}>;

// Derive current work from verified outcomes, rather than treating every
// historical PaymentEvent as an incident that stays open forever.
export function getPaymentIssues(
  orderStatus: OrderStatus,
  attempts: readonly OperationalPaymentAttempt[],
): readonly PaymentIssue[] {
  return attempts.flatMap((attempt): PaymentIssue[] => {
    const events = [...attempt.events].sort((left, right) => left.receivedAt.getTime() - right.receivedAt.getTime());
    const refundReceipt = events.findLast((event) => event.processingResult === "REFUNDED_AFTER_LATE_SETTLEMENT");
    if (attempt.status === "REFUNDED" || refundReceipt !== undefined) {
      if (orderStatus === "CANCELLED" || orderStatus === "COMPLETED") return [];
      return [{
        kind: "FULL_REFUND", occurredAt: refundReceipt?.receivedAt ?? attempt.updatedAt,
        paymentAttemptId: attempt.id, providerOrderId: attempt.providerOrderId, purpose: attempt.purpose,
      }];
    }

    const pending = new Map<PaymentIssue["kind"], Date>();
    const settled = attempt.status === "SETTLED" && events.some((event) => event.processingResult === "SETTLED");
    for (const event of events) {
      const result = event.processingResult;
      if (result === "SETTLED" || result === "STALE_SETTLED") {
        pending.delete("PAYMENT_VERIFICATION");
      } else if (result === "PARTIAL_REFUND_REQUIRES_EXCEPTION") {
        if (!pending.has("PARTIAL_REFUND")) pending.set("PARTIAL_REFUND", event.receivedAt);
      } else if (result === "LATE_SETTLEMENT_REFUND_REQUIRED" && !settled) {
        // Earlier versions classified a replay of an already-settled attempt
        // as late. Its successful settlement receipt is authoritative.
        if (!pending.has("LATE_SETTLEMENT")) pending.set("LATE_SETTLEMENT", event.receivedAt);
      } else if (result === "AMOUNT_MISMATCH" || result === "PROVIDER_TRANSACTION_CONFLICT" || result === "SETTLEMENT_STATUS_CODE_INVALID") {
        if (!pending.has("PAYMENT_VERIFICATION")) pending.set("PAYMENT_VERIFICATION", event.receivedAt);
      }
    }
    return Array.from(pending, ([kind, occurredAt]) => ({
      kind, occurredAt, paymentAttemptId: attempt.id,
      providerOrderId: attempt.providerOrderId, purpose: attempt.purpose,
    }));
  });
}

export function assertNoPaymentIssues(issues: readonly PaymentIssue[]): void {
  if (issues.length === 0) return;
  throw appError("CONFLICT", {
    message: "Proses order ditahan karena refund atau exception pembayaran. Minta Owner memeriksa pembayaran di Midtrans.",
    details: { reason: "PAYMENT_EXCEPTION" },
  });
}

export const PAYMENT_ISSUE_LABELS: Readonly<Record<PaymentIssue["kind"], string>> = {
  FULL_REFUND: "Refund penuh terkonfirmasi; order masih perlu ditangani Owner",
  LATE_SETTLEMENT: "Pembayaran masuk setelah order tidak lagi dapat dibayar",
  PARTIAL_REFUND: "Refund parsial membutuhkan pemeriksaan Owner",
  PAYMENT_VERIFICATION: "Data pembayaran belum cocok dengan catatan NIUVA",
};
