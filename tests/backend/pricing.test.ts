import { describe, expect, it } from "vitest";

import { calculatePrintQuote } from "@/modules/pricing/calculator";
import {
  CUSTOM_PRINT_V1_PER_UNIT_POLICY,
  type CustomPrintPricingPolicy,
} from "@/modules/pricing/policy";
import { MoneyDecimal, roundFinalTotal } from "@/modules/pricing/rounding";

const approvedPolicy = CUSTOM_PRINT_V1_PER_UNIT_POLICY;

function expectPricingNotApproved(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code: "PRICING_RULE_NOT_APPROVED" });
    return;
  }

  throw new Error("Expected pricing policy to reject the calculation.");
}

describe("custom-print pricing", () => {
  it("calculates every documented standard-material tier boundary", () => {
    const cases = [
      { expected: "0", material: "PLA" as const, weightGrams: "0" },
      { expected: "199000", material: "PLA" as const, weightGrams: "199" },
      { expected: "200000", material: "PLA" as const, weightGrams: "200" },
      { expected: "200900", material: "PLA" as const, weightGrams: "201" },
      { expected: "469100", material: "PLA" as const, weightGrams: "499" },
      { expected: "470000", material: "PLA" as const, weightGrams: "500" },
      { expected: "470800", material: "PLA" as const, weightGrams: "501" },
      { expected: "0", material: "ABS" as const, weightGrams: "0" },
      { expected: "238800", material: "ABS" as const, weightGrams: "199" },
      { expected: "240000", material: "ABS" as const, weightGrams: "200" },
      { expected: "241100", material: "ABS" as const, weightGrams: "201" },
      { expected: "568900", material: "ABS" as const, weightGrams: "499" },
      { expected: "570000", material: "ABS" as const, weightGrams: "500" },
      { expected: "571000", material: "ABS" as const, weightGrams: "501" },
    ];

    for (const testCase of cases) {
      const calculation = calculatePrintQuote({
        filamentSource: "NIUVA_STOCK",
        material: testCase.material,
        policy: approvedPolicy,
        printDurationSeconds: 0,
        quantity: 1,
        weightGrams: testCase.weightGrams,
      });

      expect(calculation.materialSubtotalRp.toString()).toBe(testCase.expected);
      expect(calculation.finalTotalRp.toString()).toBe(testCase.expected);
    }
  });

  it("keeps decimal grams and partial-hour duration until final HALF_UP", () => {
    const calculation = calculatePrintQuote({
      filamentSource: "NIUVA_STOCK",
      material: "ABS",
      policy: approvedPolicy,
      printDurationSeconds: 1_800,
      quantity: 1,
      weightGrams: "200.5",
    });

    expect(calculation.materialSubtotalRp.toString()).toBe("240550");
    expect(calculation.machineSubtotalRp.toString()).toBe("2500");
    expect(calculation.unroundedTotalRp.toString()).toBe("243050");
    expect(roundFinalTotal(new MoneyDecimal("1.5")).toString()).toBe("2");
  });

  it("uses the documented own-filament rates", () => {
    const calculation = calculatePrintQuote({
      filamentSource: "CUSTOMER_OWN",
      material: "ABS",
      policy: approvedPolicy,
      printDurationSeconds: 3_600,
      quantity: 2,
      weightGrams: "50",
    });

    expect(calculation.materialSubtotalRp.toString()).toBe("70000");
    expect(calculation.machineSubtotalRp.toString()).toBe("0");
  });

  it("requires an explicit quantity semantic instead of choosing one", () => {
    const common = {
      filamentSource: "NIUVA_STOCK" as const,
      material: "PLA" as const,
      printDurationSeconds: 0,
      quantity: 2,
      weightGrams: "201",
    };

    expect(
      calculatePrintQuote({
        ...common,
        policy: { ...approvedPolicy, quantitySemantics: "PER_UNIT" },
      }).materialSubtotalRp.toString(),
    ).toBe("401800");
    expect(
      calculatePrintQuote({
        ...common,
        policy: { ...approvedPolicy, quantitySemantics: "AGGREGATE" },
      }).materialSubtotalRp.toString(),
    ).toBe("381800");
  });

  it("applies the owner-approved 1–49 g and communal ABS rules", () => {
    const smallStandard = calculatePrintQuote({
      filamentSource: "NIUVA_STOCK",
      material: "PLA",
      policy: approvedPolicy,
      printDurationSeconds: 0,
      quantity: 1,
      weightGrams: "1",
    });
    const communalAbs = calculatePrintQuote({
      filamentSource: "COMMUNAL",
      material: "ABS",
      policy: approvedPolicy,
      printDurationSeconds: 3_600,
      quantity: 1,
      weightGrams: "50",
    });

    expect(smallStandard.materialSubtotalRp.toString()).toBe("1000");
    expect(communalAbs.materialSubtotalRp.toString()).toBe("35000");
    expect(communalAbs.machineSubtotalRp.toString()).toBe("0");
    expect(communalAbs.finalTotalRp.toString()).toBe("35000");
  });

  it("fails closed for a malformed active Pricing v1 definition", () => {
    const malformedPolicy = {
      ...approvedPolicy,
      communalFilamentRateRpPerGram: {
        ...approvedPolicy.communalFilamentRateRpPerGram,
        ABS: 500,
      },
    } as unknown as CustomPrintPricingPolicy;

    expectPricingNotApproved(() =>
      calculatePrintQuote({
        filamentSource: "COMMUNAL",
        material: "ABS",
        policy: malformedPolicy,
        printDurationSeconds: 0,
        quantity: 1,
        weightGrams: "50",
      }),
    );
  });
});
