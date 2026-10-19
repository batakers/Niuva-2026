import { createHash } from "node:crypto";
import { MoneyDecimal } from "../finance/money";
import { appError } from "../shared/errors";

export type RefundPaymentFacts = Readonly<{
  id: string; purpose: string; provider: string; providerOrderId: string;
  providerTransactionId: string | null; amountRp: string; status: string;
  settledAt: Date | null; events: readonly Readonly<{ processingResult: string | null }>[];
}>;
export type RefundAllocationSnapshot = Readonly<{
  paymentAttemptId: string; purpose: string; provider: string; providerOrderId: string;
  providerTransactionId: string | null; amountRp: string; source: "SETTLED" | "LATE_SETTLEMENT";
}>;
export type RefundSnapshot = Readonly<{ totalRp: string; hash: string; allocations: readonly RefundAllocationSnapshot[] }>;
export function refundHash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export function assertRefundVersion(row: Readonly<{ version: number; status: string }>, expectedVersion: number, allowed: readonly string[]): void {
  if (row.version !== expectedVersion || !allowed.includes(row.status)) throw appError("CONFLICT", { message: "Kasus sudah diperbarui. Muat ulang sebelum melanjutkan." });
}
export function assertRefundSnapshot(snapshotHash: string, snapshot: RefundSnapshot): void {
  if (snapshot.hash !== snapshotHash) throw appError("CONFLICT", { message: "Pembayaran berubah. Perbarui rincian kasus dan tinjau ulang persetujuan." });
}
export function assertPendingRefundReturn(approval: Readonly<{ returnState: string; hasReceipt: boolean }> | undefined): void {
  if (!approval || approval.returnState !== "PENDING" || approval.hasReceipt) throw appError("CONFLICT");
}

export function buildRefundSnapshot(orderId: string, currency: string, payments: readonly RefundPaymentFacts[]): RefundSnapshot {
  if (currency !== "IDR") throw appError("CONFLICT", { message: "Mata uang pembayaran belum didukung untuk refund." });
  const allocations: RefundAllocationSnapshot[] = [];
  for (const payment of payments) {
    const results = payment.events.map(event => event.processingResult);
    let verificationIssue = false;
    for (const result of results) {
      if (result === "SETTLED" || result === "STALE_SETTLED") verificationIssue = false;
      else if (result === "AMOUNT_MISMATCH" || result === "PROVIDER_TRANSACTION_CONFLICT" || result === "SETTLEMENT_STATUS_CODE_INVALID") verificationIssue = true;
    }
    if (verificationIssue) throw appError("CONFLICT", { message: "Exception pembayaran perlu diperiksa sebelum refund." });
    if (payment.status === "REFUNDED" || results.includes("REFUNDED_AFTER_LATE_SETTLEMENT") || results.includes("PARTIAL_REFUND_REQUIRES_EXCEPTION")) {
      throw appError("CONFLICT", { message: "Hasil refund pembayaran perlu direkonsiliasi sebelum membuat atau menyetujui pengembalian lain." });
    }
    const late = results.includes("LATE_SETTLEMENT_REFUND_REQUIRED");
    if (!(payment.status === "SETTLED" && payment.settledAt !== null) && !late) continue;
    if (!/^[1-9]\d{0,17}$/.test(payment.amountRp)) throw appError("CONFLICT", { message: "Nominal pembayaran server tidak valid." });
    allocations.push({ paymentAttemptId: payment.id, purpose: payment.purpose, provider: payment.provider,
      providerOrderId: payment.providerOrderId, providerTransactionId: payment.providerTransactionId,
      amountRp: payment.amountRp, source: late && payment.status !== "SETTLED" ? "LATE_SETTLEMENT" : "SETTLED" });
  }
  if (allocations.length === 0) throw appError("CONFLICT", { message: "Belum ada pembayaran masuk terverifikasi yang dapat diajukan untuk refund." });
  allocations.sort((left, right) => left.paymentAttemptId.localeCompare(right.paymentAttemptId));
  const totalRp = allocations.reduce((total, allocation) => total.plus(allocation.amountRp), new MoneyDecimal(0)).toFixed(0);
  if (totalRp.length > 18) throw appError("CONFLICT", { message: "Total pembayaran memerlukan pemeriksaan keuangan." });
  return { totalRp, allocations, hash: refundHash({ orderId, currency, allocations }) };
}
