import { describe, expect, it } from "vitest";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY, parseActiveCustomPrintPricingPolicy } from "@/modules/pricing/policy";
import { calculatePrintQuote } from "@/modules/pricing/calculator";
import { editableRates, policyFromRates } from "@/modules/pricing/tariff-schema";

describe("versioned custom print rates", () => {
  it("keeps legacy v1 exact while a reviewed version uses canonical money strings", () => {
    const rates = editableRates(CUSTOM_PRINT_V1_PER_UNIT_POLICY);
    rates.plaFirst = "1100";
    const next = parseActiveCustomPrintPricingPolicy(policyFromRates(rates, 2));
    const input = { filamentSource: "NIUVA_STOCK", material: "PLA", printDurationSeconds: 3600, quantity: 1, weightGrams: "100" } as const;
    expect(calculatePrintQuote({ ...input, policy: next }).finalTotalRp.toString()).toBe("115000");
    expect(calculatePrintQuote({ ...input, policy: CUSTOM_PRINT_V1_PER_UNIT_POLICY }).finalTotalRp.toString()).toBe("105000");
    expect(() => parseActiveCustomPrintPricingPolicy({ ...CUSTOM_PRINT_V1_PER_UNIT_POLICY, standardPrintTimeRateRpPerHour: 6000 })).toThrow();
    expect(() => policyFromRates({ ...rates, plaFirst: "01" }, 2)).toThrow();
    expect(() => parseActiveCustomPrintPricingPolicy({ ...policyFromRates(rates, 2), quantitySemantics: "AGGREGATE" })).toThrow();
  });
});
