import { describe, expect, it } from "vitest";
import { canRetryRefund, parseRefundStatusProof, refundKeyForAllocation, serializeRefundRequest } from "@/modules/refund/execution-core";

const target = { providerOrderId: "TEST-REFUND-001", providerTransactionId: "test-transaction-001", amountRp: "100000" };
const now = new Date("2026-10-19T05:00:00.000Z");
function status(extra: Record<string, unknown> = {}) {
  return { order_id: target.providerOrderId, transaction_id: target.providerTransactionId, status_code: "200", payment_type: "gopay", transaction_status: "refund", gross_amount: "100000.00", refund_amount: "100000.00", currency: "IDR", ...extra };
}
const item = { refund_key: "rf_test_operation", refund_chargeback_id: "test-refund-1", refund_amount: "100000.00", bank_confirmed_at: "2026-10-19 11:59:00" };
describe("full refund operation identity and final evidence", () => {
  it("uses an allocation-bound stable key and rejects arbitrary key input", () => {
    const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
    expect(refundKeyForAllocation(id)).toBe(refundKeyForAllocation(id)); expect(refundKeyForAllocation(id)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(() => refundKeyForAllocation("foreign-key")).toThrow();
  });
  it("serializes integer rupiah without authoritative floating point or leaking an internal reason", () => {
    const body = serializeRefundRequest({ refundKey: "rf_test_operation", amountRp: "9007199254740993", reason: "Pengembalian dana penuh disetujui" });
    expect(body).toContain('"amount":9007199254740993');
    expect(JSON.parse(serializeRefundRequest({ refundKey: "rf_test", amountRp: "100000", reason: "Pengembalian dana penuh" }))).toEqual({ refund_key: "rf_test", amount: 100000, reason: "Pengembalian dana penuh" });
    for (const amountRp of ["0", "-1", "1.5", "1e5"]) expect(() => serializeRefundRequest({ refundKey: "rf_test", amountRp, reason: "Pengembalian dana penuh" })).toThrow();
    expect(() => serializeRefundRequest({ refundKey: "rf_test", amountRp: "100000", reason: "Bukti https://private.example.test/?token=secret" })).toThrow();
  });
  it("bounds explicit safe reattempts by original first request, count and seven-day key window", () => {
    const operation = { state: "RETRYABLE", firstAttemptAt: new Date("2026-10-18T05:00:00.000Z"), attempts: 1, maxAttempts: 2 };
    expect(canRetryRefund(operation, now)).toBe(true);
    for (const state of ["UNKNOWN", "SUBMITTING", "ACCEPTED", "CONFIRMED", "REJECTED"]) expect(canRetryRefund({ ...operation, state }, now)).toBe(false);
    expect(canRetryRefund({ ...operation, attempts: 2 }, now)).toBe(false);
    expect(canRetryRefund(operation, new Date("2026-10-25T05:00:00.000Z"))).toBe(false);
  });
  it("keeps accepted/refund status pending until complete bank evidence exists", () => {
    expect(parseRefundStatusProof(status(), target, now).kind).toBe("PENDING");
    expect(parseRefundStatusProof(status({ refunds: [{ ...item, bank_confirmed_at: undefined }] }), target, now).kind).toBe("PENDING");
    const proof = parseRefundStatusProof(status({ refunds: [item] }), target, now);
    expect(proof.kind).toBe("CONFIRMED"); expect(proof.refunds[0].confirmedAt?.toISOString()).toBe("2026-10-19T04:59:00.000Z");
  });
  it("does not convert partial, duplicate, mismatched or unconfirmed amounts into a full refund", () => {
    expect(parseRefundStatusProof(status({ transaction_status: "partial_refund", refund_amount: "50000.00", refunds: [{ ...item, refund_amount: "50000.00" }] }), target, now).kind).toBe("PARTIAL");
    for (const raw of [status({ order_id: "foreign" }), status({ gross_amount: "90000.00" }), status({ currency: "USD" }), status({ refunds: [item, item] }), status({ refunds: [{ ...item, bank_confirmed_at: "2026-10-19 12:30:00" }] })]) {
      expect(() => parseRefundStatusProof(raw, target, now)).toThrow();
    }
  });
  it("accepts an authoritative settled observation without treating it as proof an unknown POST never happened", () => {
    expect(parseRefundStatusProof(status({ transaction_status: "settlement", refund_amount: undefined, refunds: undefined }), target, now).kind).toBe("SETTLED");
    expect(parseRefundStatusProof(status({ transaction_status: "settlement", refund_amount: undefined, refunds: undefined, fraud_status: "challenge" }), target, now).kind).toBe("INELIGIBLE");
  });
});
