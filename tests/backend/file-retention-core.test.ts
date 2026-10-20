import { describe, expect, it } from "vitest";
import { decideFileRetention, type FileRetentionFacts } from "@/modules/files/retention-core";

const now = new Date("2026-10-19T00:00:00Z"), day = 86400000;
const ago = (days: number) => new Date(now.getTime() - days * day);
const file = (changes: Partial<FileRetentionFacts> = {}): FileRetentionFacts => ({
  bucketScope: "PRIVATE_CUSTOMER", purpose: "CUSTOMER_UPLOAD", uploadStatus: "VERIFIED", storageKey: "private/customer/fixture",
  createdAt: ago(200), uploadedAt: ago(200), verifiedAt: ago(200), hasFinancialOwner: false, hasHistoricalOwner: false,
  held: false, retentionClass: null, retentionEligibleAt: null, request: null, ...changes,
});
const request = (changes: Partial<NonNullable<FileRetentionFacts["request"]>> = {}): NonNullable<FileRetentionFacts["request"]> => ({
  status: "CANCELLED", updatedAt: ago(61), quotes: [], orders: [], ...changes,
});
describe("Customer binary retention decisions", () => {
  it("waits 14 full days from the latest upload activity and includes the boundary", () => {
    expect(decideFileRetention(file({ createdAt: ago(14), uploadedAt: null, verifiedAt: null }), now)).toMatchObject({ state: "due", retentionClass: "ABANDONED_OR_REJECTED_UPLOAD", eligibleAt: now });
    expect(decideFileRetention(file({ uploadedAt: new Date(ago(14).getTime() + 1) }), now).state).toBe("not-due");
  });
  it("starts the 60-day clock from terminal activity rather than old upload creation", () => {
    expect(decideFileRetention(file({ request: request({ updatedAt: ago(60) }) }), now)).toMatchObject({ state: "due", retentionClass: "CANCELLED_OR_UNPAID_REQUEST", eligibleAt: now });
    expect(decideFileRetention(file({ request: request({ updatedAt: ago(59) }) }), now).state).toBe("not-due");
  });
  it("waits 60 days after the unpaid quote expires and protects a new draft", () => {
    const quotes = [{ status: "SENT", expiresAt: ago(60), createdAt: ago(70), sentAt: ago(70) }];
    expect(decideFileRetention(file({ request: request({ status: "QUOTE_SENT", updatedAt: ago(70), quotes }) }), now)).toMatchObject({ state: "due", eligibleAt: now });
    expect(decideFileRetention(file({ request: request({ status: "QUOTE_SENT", quotes: [...quotes, { ...quotes[0], status: "DRAFT" }] }) }), now).state).toBe("protected");
  });
  it("retains completed models for 90 days after completion", () => {
    const order = { status: "COMPLETED", completedAt: ago(90), cancelledAt: null, updatedAt: ago(90), pendingPayment: false, settledPayment: true };
    expect(decideFileRetention(file({ request: request({ status: "APPROVED", updatedAt: ago(100), orders: [order] }) }), now)).toMatchObject({ state: "due", retentionClass: "COMPLETED_CUSTOM_ORDER", eligibleAt: now });
    expect(decideFileRetention(file({ request: request({ status: "APPROVED", updatedAt: ago(1), orders: [order] }) }), now)).toMatchObject({ state: "due", eligibleAt: now });
    expect(decideFileRetention(file({ request: request({ orders: [{ ...order, completedAt: null }] }) }), now).state).toBe("protected");
  });
  it("protects every active order and unresolved payment even on a previously claimed file", () => {
    const order = { status: "WAITING_PAYMENT", completedAt: null, cancelledAt: null, updatedAt: ago(100), pendingPayment: false, settledPayment: false };
    for (const changes of [{}, { status: "CANCELLED", pendingPayment: true }, { status: "CANCELLED", settledPayment: true }]) {
      expect(decideFileRetention(file({ uploadStatus: "DELETE_PENDING", retentionClass: "CANCELLED_OR_UNPAID_REQUEST", retentionEligibleAt: ago(1), request: request({ orders: [{ ...order, ...changes }] }) }), now).state).toBe("protected");
    }
  });
  it("keeps holds until explicit release and excludes financial, public and historical ownership", () => {
    expect(decideFileRetention(file({ held: true }), now).state).toBe("held");
    for (const changes of [{ purpose: "FINANCIAL_EVIDENCE" }, { bucketScope: "PUBLIC_MEDIA" }, { hasFinancialOwner: true }, { hasHistoricalOwner: true }, { storageKey: "private/financial/fixture" }, { uploadStatus: "DELETED" }]) {
      expect(decideFileRetention(file(changes), now).state).toBe("protected");
    }
  });
  it("does not infer a terminal clock for a request still being reviewed", () => {
    expect(decideFileRetention(file({ request: request({ status: "UNDER_REVIEW" }) }), now).state).toBe("protected");
  });
  it("retries a durable deletion claim only with a valid policy snapshot", () => {
    expect(decideFileRetention(file({ uploadStatus: "DELETE_PENDING" }), now).state).toBe("protected");
    expect(decideFileRetention(file({ uploadStatus: "DELETE_PENDING", retentionClass: "COMPLETED_CUSTOM_ORDER", retentionEligibleAt: ago(1) }), now)).toMatchObject({ state: "due", retentionClass: "COMPLETED_CUSTOM_ORDER" });
  });
});
