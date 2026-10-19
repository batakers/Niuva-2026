import { describe, expect, it } from "vitest";
import { buildRefundSnapshot, type RefundPaymentFacts } from "@/modules/refund/core";

const payment = (changes: Partial<RefundPaymentFacts> = {}): RefundPaymentFacts => ({
  id: "a", purpose: "ORDER_TOTAL", provider: "MIDTRANS", providerOrderId: "order-a",
  providerTransactionId: "transaction-a", amountRp: "9007199254740993", status: "SETTLED",
  settledAt: new Date("2026-10-19T00:00:00Z"), events: [], ...changes,
});

describe("full-refund server payment snapshot", () => {
  it("adds production and final shipping without floating-point loss or pending retries", () => {
    const snapshot = buildRefundSnapshot("order", "IDR", [payment(), payment({ id: "b", purpose: "CUSTOM_SHIPPING", amountRp: "10007", providerOrderId: "shipping", providerTransactionId: "transaction-b" }), payment({ id: "c", status: "PENDING", settledAt: null })]);
    expect(snapshot.totalRp).toBe("9007199254751000");
    expect(snapshot.allocations).toHaveLength(2);
  });
  it("keeps the same snapshot across read ordering and detects a different charge", () => {
    const a = payment(), b = payment({ id: "b", amountRp: "2000" });
    expect(buildRefundSnapshot("order", "IDR", [a, b]).hash).toBe(buildRefundSnapshot("order", "IDR", [b, a]).hash);
    expect(buildRefundSnapshot("order", "IDR", [a]).hash).not.toBe(buildRefundSnapshot("order", "IDR", [a, b]).hash);
  });
  it("accepts a verified late settlement without changing its cancelled/expired status", () => {
    const snapshot = buildRefundSnapshot("cancelled", "IDR", [payment({ status: "EXPIRED", settledAt: null, events: [{ processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED" }] })]);
    expect(snapshot.allocations[0].source).toBe("LATE_SETTLEMENT");
  });
  it("requires reconciliation before a legacy full or partial refund can be submitted again", () => {
    for (const p of [payment({ status: "REFUNDED" }), payment({ events: [{ processingResult: "PARTIAL_REFUND_REQUIRES_EXCEPTION" }] }), payment({ events: [{ processingResult: "REFUNDED_AFTER_LATE_SETTLEMENT" }] }), payment({ events: [{ processingResult: "REFUND_REQUIRES_RECONCILIATION" }, { processingResult: "STALE_SETTLED" }] })]) {
      expect(() => buildRefundSnapshot("order", "IDR", [p])).toThrow();
    }
  });
  it("rejects unpaid orders, unsupported currency and invalid server monetary facts", () => {
    expect(() => buildRefundSnapshot("order", "IDR", [payment({ status: "PENDING", settledAt: null })])).toThrow();
    expect(() => buildRefundSnapshot("order", "USD", [payment()])).toThrow();
    for (const amountRp of ["0", "-1", "1.5", "NaN", "1000000000000000000"]) {
      expect(() => buildRefundSnapshot("order", "IDR", [payment({ amountRp })])).toThrow();
    }
  });
  it("holds an unresolved payment verification exception until a verified receipt supersedes it", () => {
    expect(() => buildRefundSnapshot("order", "IDR", [payment({ events: [{ processingResult: "AMOUNT_MISMATCH" }] })])).toThrow();
    expect(buildRefundSnapshot("order", "IDR", [payment({ events: [{ processingResult: "AMOUNT_MISMATCH" }, { processingResult: "SETTLED" }] })]).totalRp).toBe("9007199254740993");
    expect(buildRefundSnapshot("order", "IDR", [payment({ status: "EXPIRED", settledAt: null, events: [{ processingResult: "AMOUNT_MISMATCH" }, { processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED" }] })]).allocations[0].source).toBe("LATE_SETTLEMENT");
  });
});
