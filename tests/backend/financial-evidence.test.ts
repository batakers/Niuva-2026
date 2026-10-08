import { describe, expect, it } from "vitest";
import { FINANCIAL_EVIDENCE_MAX_BYTES, validateFinancialEvidenceContent } from "@/modules/finance/evidence-policy";
import { fileDeletionEligibleAt } from "@/modules/policy/privacy";
describe("financial proof content and separate lifecycle", () => {
  it("admits actual PDF signature at the limit and rejects disguised executable or overflow", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    expect(() => validateFinancialEvidenceContent("pdf", "application/pdf", pdf, FINANCIAL_EVIDENCE_MAX_BYTES)).not.toThrow();
    expect(() => validateFinancialEvidenceContent("pdf", "application/pdf", pdf, FINANCIAL_EVIDENCE_MAX_BYTES + 1)).toThrow();
    expect(() => validateFinancialEvidenceContent("pdf", "application/pdf", new TextEncoder().encode("MZ executable"), 500)).toThrow();
    expect(() => validateFinancialEvidenceContent("png", "image/png", pdf, 500)).toThrow();
  });
  it("never applies CAD retention to financial evidence", () => {
    expect(fileDeletionEligibleAt(new Date("2000-01-01"), "ABANDONED_OR_REJECTED_UPLOAD", "FINANCIAL_EVIDENCE")).toBeNull();
    expect(fileDeletionEligibleAt(new Date("2000-01-01"), "COMPLETED_CUSTOM_ORDER", "FINANCIAL_EVIDENCE")).toBeNull();
  });
});
