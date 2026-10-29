import { describe, expect, it } from "vitest";

import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";
import { customPrintV1Definition } from "@/modules/pricing/rule-activation";
import { assertStagingPricingActivationEnvironment, STAGING_PRICING_CONFIRMATION } from "@/modules/pricing/staging-activation";

const staging = {
  NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "sandbox", NIUVA_DATABASE_BINDING_ID: "00000000-0000-4000-8000-000000000001",
  DATABASE_URL: "postgresql://fixture@db.example.test/niuva_staging?sslmode=verify-full",
  PRICING_ACTIVATION_CONFIRMATION: STAGING_PRICING_CONFIRMATION, PRICING_QUANTITY_SEMANTICS: "PER_UNIT",
};

describe("staging pricing activation environment", () => {
  it("accepts only a confirmed, explicit staging tier with an explicit quantity semantic", () => {
    expect(assertStagingPricingActivationEnvironment(staging)).toEqual({ expected: { tier: "staging", bindingId: staging.NIUVA_DATABASE_BINDING_ID }, quantitySemantics: "PER_UNIT" });
    expect(assertStagingPricingActivationEnvironment({ ...staging, PRICING_QUANTITY_SEMANTICS: "AGGREGATE" }).quantitySemantics).toBe("AGGREGATE");
    const cases: [Record<string, string | undefined>, string][] = [
      [{ PRICING_ACTIVATION_CONFIRMATION: "yes" }, "CONFIRMATION_REQUIRED"],
      [{ PRICING_QUANTITY_SEMANTICS: undefined }, "QUANTITY_SEMANTICS_REQUIRED"],
      [{ PRICING_QUANTITY_SEMANTICS: "" }, "QUANTITY_SEMANTICS_REQUIRED"],
      [{ PRICING_QUANTITY_SEMANTICS: "per_unit" }, "QUANTITY_SEMANTICS_REQUIRED"],
      [{ NIUVA_DEPLOYMENT_TIER: "production" }, "NOT_STAGING"],
      [{ NIUVA_DEPLOYMENT_TIER: undefined }, "NOT_STAGING"],
      [{ DATABASE_URL: "postgresql://fixture@db.example.test/niuva_staging?sslmode=require" }, "DATABASE_TLS_REQUIRED"],
      [{ NIUVA_DATABASE_BINDING_ID: "" }, "BINDING_CONFIG_INVALID"],
    ];
    for (const [change, reason] of cases) expect(() => assertStagingPricingActivationEnvironment({ ...staging, ...change }), reason).toThrow(expect.objectContaining({ reason }));
  });
});

describe("Pricing v1 definition", () => {
  it("keeps the approved values and only takes the chosen quantity semantic", () => {
    expect(customPrintV1Definition("PER_UNIT")).toEqual(CUSTOM_PRINT_V1_PER_UNIT_POLICY);
    expect(customPrintV1Definition("AGGREGATE")).toEqual({ ...CUSTOM_PRINT_V1_PER_UNIT_POLICY, quantitySemantics: "AGGREGATE" });
  });
});
