import { describe, expect, it } from "vitest";

import { getPaymentIssues } from "@/modules/payment/operational-state";

const receivedAt = new Date("2026-10-06T08:00:00.000Z");
const attempt = {
  events: [],
  id: "attempt-1",
  providerOrderId: "PAY-1",
  purpose: "ORDER_TOTAL" as const,
  status: "SETTLED" as const,
  updatedAt: receivedAt,
};
const event = (processingResult: string, offset = 0) => ({
  processingResult, receivedAt: new Date(receivedAt.getTime() + offset),
});

describe("payment operational holds", () => {
  it("holds an active order after refund but closes that queue work for a closed order", () => {
    const refunded = { ...attempt, status: "REFUNDED" as const };
    expect(getPaymentIssues("PAID", [refunded])).toMatchObject([{ kind: "FULL_REFUND", providerOrderId: "PAY-1" }]);
    expect(getPaymentIssues("CANCELLED", [refunded])).toEqual([]);
    expect(getPaymentIssues("COMPLETED", [refunded])).toEqual([]);
  });

  it("deduplicates partial refunds and keeps the hold until a verified full refund", () => {
    const partial = { ...attempt, events: [event("PARTIAL_REFUND_REQUIRES_EXCEPTION"), event("PARTIAL_REFUND_REQUIRES_EXCEPTION", 1)] };
    expect(getPaymentIssues("PAID", [partial])).toMatchObject([{ kind: "PARTIAL_REFUND" }]);
    expect(getPaymentIssues("PAID", [{ ...partial, status: "REFUNDED" as const }])).toMatchObject([{ kind: "FULL_REFUND" }]);
  });

  it("keeps a cancelled order's late payment visible until a verified full refund receipt", () => {
    const late = { ...attempt, status: "EXPIRED" as const, events: [event("LATE_SETTLEMENT_REFUND_REQUIRED")] };
    expect(getPaymentIssues("CANCELLED", [late])).toMatchObject([{ kind: "LATE_SETTLEMENT" }]);
    expect(getPaymentIssues("CANCELLED", [{ ...late, events: [...late.events, event("REFUNDED_AFTER_LATE_SETTLEMENT", 1)] }])).toEqual([]);
  });

  it.each(["AMOUNT_MISMATCH", "PROVIDER_TRANSACTION_CONFLICT", "SETTLEMENT_STATUS_CODE_INVALID"])("holds %s until a later verified settlement", (processingResult) => {
    const mismatch = { ...attempt, status: "PENDING" as const, events: [event(processingResult)] };
    expect(getPaymentIssues("PENDING_PAYMENT", [mismatch])).toMatchObject([{ kind: "PAYMENT_VERIFICATION" }]);
    expect(getPaymentIssues("PAID", [{ ...attempt, events: [...mismatch.events, event("SETTLED", 1)] }])).toEqual([]);
  });

  it("does not mistake historical settlement replays for an unrefunded late payment", () => {
    expect(getPaymentIssues("PAID", [{ ...attempt, events: [event("SETTLED"), event("LATE_SETTLEMENT_REFUND_REQUIRED", 1)] }])).toEqual([]);
  });

  it("ignores pending and stale events while keeping shipping-payment issues separate", () => {
    expect(getPaymentIssues("PAID", [{ ...attempt, events: [event("PENDING"), event("STALE_SETTLED")] }])).toEqual([]);
    expect(getPaymentIssues("READY_TO_SHIP", [attempt, {
      ...attempt, id: "shipping-1", purpose: "CUSTOM_SHIPPING" as const,
      events: [event("PARTIAL_REFUND_REQUIRES_EXCEPTION")],
    }])).toMatchObject([{ kind: "PARTIAL_REFUND", paymentAttemptId: "shipping-1", purpose: "CUSTOM_SHIPPING" }]);
  });
});
