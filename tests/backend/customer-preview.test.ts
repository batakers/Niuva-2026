import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  calculateCustomerPreviewSnapshot,
  customerPreviewInputSchema,
  customerPreviewRequestSchema,
  isCustomerPreviewMesh,
  readCustomerPreviewSnapshot,
} from "@/modules/custom-print/customer-preview";
import { customPrintRequestInputSchema } from "@/modules/custom-print/schema";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";

const fileId = randomUUID();
const ruleId = randomUUID();
const slicerInput = {
  source: "CUSTOMER_DECLARED_SLICER" as const,
  weightGramsPerUnit: "18.4",
  printDurationSecondsPerUnit: 6_120,
};
const rule = { id: ruleId, code: "CUSTOM_PRINT_V1", version: 1,
  definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY };

function snapshot(overrides: Partial<Parameters<typeof calculateCustomerPreviewSnapshot>[0]> = {}) {
  return calculateCustomerPreviewSnapshot({ fileId, fileExtension: "stl", materialRequested: "PLA",
    quantity: 3, customerPreviewInput: slicerInput, rule, ...overrides });
}

describe("customer pre-review simulation", () => {
  it("validates positive decimal unit weight and safe positive unit duration", () => {
    for (const weight of ["0", "-1", "NaN", "Infinity", "1e3", "1,5", "", "1.1234567"]) {
      expect(customerPreviewInputSchema.safeParse({ ...slicerInput, weightGramsPerUnit: weight }).success, weight).toBe(false);
    }
    for (const seconds of [0, -1, NaN, Infinity, 1.2, Number.MAX_SAFE_INTEGER + 1]) {
      expect(customerPreviewInputSchema.safeParse({ ...slicerInput, printDurationSecondsPerUnit: seconds }).success, String(seconds)).toBe(false);
    }
    expect(customerPreviewInputSchema.safeParse({ ...slicerInput, weightGramsPerUnit: "0.000001", printDurationSecondsPerUnit: 1 }).success).toBe(true);
    expect(customerPreviewRequestSchema.safeParse({ fileId, materialRequested: "PLA", quantity: 0,
      customerPreviewInput: slicerInput }).success).toBe(false);
  });

  it("limits the preview to mesh extensions while keeping CAD eligible for manual intake", () => {
    for (const extension of ["stl", "obj", "3mf"]) expect(isCustomerPreviewMesh(extension)).toBe(true);
    for (const extension of ["step", "stp", "jpg", "png"]) {
      expect(isCustomerPreviewMesh(extension)).toBe(false);
      expect(snapshot({ fileExtension: extension })).toBeNull();
    }
    expect(customPrintRequestInputSchema.safeParse({ customerName: "Test", customerEmail: "test@example.com",
      customerPhone: "+628000000000", intakeMode: "MODEL_READY", fileIds: [fileId],
      materialRequested: "PLA", quantity: 1 }).success).toBe(true);
  });

  it("uses per-unit Decimal arithmetic and rounds only the final total", () => {
    const pla = snapshot();
    expect(pla?.result).toMatchObject({ materialSubtotalRp: "55200", machineSubtotalRp: "25500",
      unroundedTotalRp: "80700", finalTotalRp: "80700" });
    const abs = snapshot({ materialRequested: "ABS", quantity: 2,
      customerPreviewInput: { ...slicerInput, weightGramsPerUnit: "2", printDurationSecondsPerUnit: 3_600 } });
    expect(abs?.result).toMatchObject({ materialSubtotalRp: "4800", machineSubtotalRp: "10000", finalTotalRp: "14800" });
    const fractional = snapshot({ quantity: 2,
      customerPreviewInput: { ...slicerInput, weightGramsPerUnit: "1", printDurationSecondsPerUnit: 1 } });
    expect(fractional?.result.finalTotalRp).toBe("2003");
    expect(fractional?.result.unroundedTotalRp).not.toBe("2003");
    expect(pla?.pricingRule).toMatchObject({ id: ruleId, version: 1, definition: CUSTOM_PRINT_V1_PER_UNIT_POLICY });
    expect(readCustomerPreviewSnapshot(pla)).toEqual(pla);
  });

  it("fails closed for unsupported material and invalid or aggregate pricing rules", () => {
    expect(snapshot({ materialRequested: "PETG" })).toBeNull();
    expect(snapshot({ rule: { ...rule, version: 2 } })).toBeNull();
    expect(snapshot({ rule: { ...rule, definitionJson: { ...CUSTOM_PRINT_V1_PER_UNIT_POLICY,
      quantitySemantics: "AGGREGATE" } } })).toBeNull();
    expect(readCustomerPreviewSnapshot({ kind: "CUSTOMER_PRE_REVIEW_V1" })).toBeNull();
  });
});
