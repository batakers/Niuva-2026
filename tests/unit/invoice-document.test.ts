import { describe, expect, it } from "vitest";
import { buildInvoiceFinancialSnapshot } from "@/modules/finance/invoice-document";
describe("immutable invoice financial document", () => {
  it("rejects an inconsistent total and keeps payment out of the issue snapshot", () => {
    const source = { source: { kind: "ORDER_TOTAL" as const, orderId: "fixture" }, sourceKey: "fixture", sourceVersion: "fixture", customerId: null, totalRp: "1000", buyer: { name: "Fixture", email: "fixture@example.test", phone: "+628000000" }, reference: "TEST", items: [{ name: "Fixture", amountRp: "1000" }], needsReview: false };
    const issuer = { issuerName: "Synthetic TEST", issuerAddress: "Synthetic TEST address", issuerEmail: "fixture@example.test", bankName: "TEST Bank", accountName: "TEST account", accountNumber: "000000000", transferInstructions: "Synthetic instructions for TEST only." };
    const terms = { mode: "FULL" as const, depositRp: null, depositDueDate: null, balanceDueDate: null };
    const snapshot = buildInvoiceFinancialSnapshot(source, issuer, terms);
    expect(snapshot.totalRp).toBe("1000"); expect(snapshot).not.toHaveProperty("paidRp"); expect(snapshot).not.toHaveProperty("buyer");
    expect(() => buildInvoiceFinancialSnapshot({ ...source, totalRp: "1001" }, issuer, terms)).toThrow();
  });
});
