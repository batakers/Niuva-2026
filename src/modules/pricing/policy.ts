import { z } from "zod";

import { appError } from "@/modules/shared/errors";

export const CUSTOM_PRINT_V1_RULE_CODE = "CUSTOM_PRINT_V1";
export const CUSTOM_PRINT_V1_RULE_VERSION = 1;

export const customPrintPricingPolicySchema = z
  .object({
    code: z.literal(CUSTOM_PRINT_V1_RULE_CODE),
    communalFilamentRateRpPerGram: z
      .object({
        ABS: z.literal(700),
        PLA: z.literal(500),
      })
      .strict(),
    customerOwnedFilamentRateRpPerGram: z
      .object({
        ABS: z.literal(700),
        PLA: z.literal(500),
      })
      .strict(),
    oneToFortyNineGrams: z.literal("NO_MINIMUM_PROGRESSIVE_TIER"),
    quantitySemantics: z.enum(["PER_UNIT", "AGGREGATE"]),
    rounding: z.literal("HALF_UP_FINAL_TOTAL_ONLY"),
    standardNiuvaStockRateRpPerGram: z
      .object({
        ABS: z.tuple([z.literal(1_200), z.literal(1_100), z.literal(1_000)]),
        PLA: z.tuple([z.literal(1_000), z.literal(900), z.literal(800)]),
      })
      .strict(),
    standardPrintTimeRateRpPerHour: z.literal(5_000),
    version: z.literal(CUSTOM_PRINT_V1_RULE_VERSION),
  })
  .strict();

const rate = z.string().regex(/^[1-9]\d{0,8}$/);
export const versionedCustomPrintPricingPolicySchema = z.object({
  code: z.literal(CUSTOM_PRINT_V1_RULE_CODE),
  version: z.int().min(2).max(1_000_000),
  communalFilamentRateRpPerGram: z.object({ PLA: rate, ABS: rate }).strict(),
  customerOwnedFilamentRateRpPerGram: z.object({ PLA: rate, ABS: rate }).strict(),
  standardNiuvaStockRateRpPerGram: z.object({ PLA: z.tuple([rate, rate, rate]), ABS: z.tuple([rate, rate, rate]) }).strict(),
  standardPrintTimeRateRpPerHour: rate,
  oneToFortyNineGrams: z.literal("NO_MINIMUM_PROGRESSIVE_TIER"),
  quantitySemantics: z.literal("PER_UNIT"),
  rounding: z.literal("HALF_UP_FINAL_TOTAL_ONLY"),
}).strict();
export const storedCustomPrintPricingPolicySchema = z.union([customPrintPricingPolicySchema, versionedCustomPrintPricingPolicySchema]);
export type CustomPrintPricingPolicy = z.infer<typeof storedCustomPrintPricingPolicySchema>;

export const CUSTOM_PRINT_V1_PER_UNIT_POLICY = {
  code: CUSTOM_PRINT_V1_RULE_CODE,
  communalFilamentRateRpPerGram: {
    ABS: 700,
    PLA: 500,
  },
  customerOwnedFilamentRateRpPerGram: {
    ABS: 700,
    PLA: 500,
  },
  oneToFortyNineGrams: "NO_MINIMUM_PROGRESSIVE_TIER",
  quantitySemantics: "PER_UNIT",
  rounding: "HALF_UP_FINAL_TOTAL_ONLY",
  standardNiuvaStockRateRpPerGram: {
    ABS: [1_200, 1_100, 1_000],
    PLA: [1_000, 900, 800],
  },
  standardPrintTimeRateRpPerHour: 5_000,
  version: CUSTOM_PRINT_V1_RULE_VERSION,
} as const satisfies CustomPrintPricingPolicy;

export function parseActiveCustomPrintPricingPolicy(
  definition: unknown,
): CustomPrintPricingPolicy {
  const parsed = storedCustomPrintPricingPolicySchema.safeParse(definition);

  if (!parsed.success) {
    throw appError("PRICING_RULE_NOT_APPROVED", {
      message: "Definisi tarif tidak sesuai kebijakan Custom Print yang disetujui.",
    });
  }

  return parsed.data;
}
