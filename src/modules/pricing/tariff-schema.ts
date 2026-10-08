import { z } from "zod";
import { CUSTOM_PRINT_V1_RULE_CODE, versionedCustomPrintPricingPolicySchema, type CustomPrintPricingPolicy } from "./policy";
const rate = z.string().regex(/^[1-9]\d{0,8}$/, "Isi rupiah bulat positif tanpa pemisah ribuan.");
export const editableRatesSchema = z.object({ plaFirst: rate, plaMiddle: rate, plaLast: rate, absFirst: rate, absMiddle: rate, absLast: rate, machineHour: rate, plaOwn: rate, absOwn: rate, plaCommunal: rate, absCommunal: rate }).strict();
export type EditableRates = z.infer<typeof editableRatesSchema>;
export const rateLabels: Record<keyof EditableRates, string> = { plaFirst: "PLA · 200 gram pertama", plaMiddle: "PLA · gram ke-201–500", plaLast: "PLA · di atas 500 gram", absFirst: "ABS · 200 gram pertama", absMiddle: "ABS · gram ke-201–500", absLast: "ABS · di atas 500 gram", machineHour: "Waktu mesin per jam", plaOwn: "PLA · bahan milik customer", absOwn: "ABS · bahan milik customer", plaCommunal: "PLA · bahan komunal", absCommunal: "ABS · bahan komunal" };
export const tariffPreviewSchema = z.object({ rates: editableRatesSchema, expectedActiveId: z.uuid().nullable() }).strict();
export const tariffApplySchema = tariffPreviewSchema.extend({ expectedVersion: z.int().nonnegative(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true) }).strict();
export function editableRates(policy: CustomPrintPricingPolicy): EditableRates {
  return { plaFirst: String(policy.standardNiuvaStockRateRpPerGram.PLA[0]), plaMiddle: String(policy.standardNiuvaStockRateRpPerGram.PLA[1]), plaLast: String(policy.standardNiuvaStockRateRpPerGram.PLA[2]), absFirst: String(policy.standardNiuvaStockRateRpPerGram.ABS[0]), absMiddle: String(policy.standardNiuvaStockRateRpPerGram.ABS[1]), absLast: String(policy.standardNiuvaStockRateRpPerGram.ABS[2]), machineHour: String(policy.standardPrintTimeRateRpPerHour), plaOwn: String(policy.customerOwnedFilamentRateRpPerGram.PLA), absOwn: String(policy.customerOwnedFilamentRateRpPerGram.ABS), plaCommunal: String(policy.communalFilamentRateRpPerGram.PLA), absCommunal: String(policy.communalFilamentRateRpPerGram.ABS) };
}
export function policyFromRates(input: unknown, version: number) {
  const rates = editableRatesSchema.parse(input);
  return versionedCustomPrintPricingPolicySchema.parse({ code: CUSTOM_PRINT_V1_RULE_CODE, version, quantitySemantics: "PER_UNIT", rounding: "HALF_UP_FINAL_TOTAL_ONLY", oneToFortyNineGrams: "NO_MINIMUM_PROGRESSIVE_TIER", standardNiuvaStockRateRpPerGram: { PLA: [rates.plaFirst, rates.plaMiddle, rates.plaLast], ABS: [rates.absFirst, rates.absMiddle, rates.absLast] }, standardPrintTimeRateRpPerHour: rates.machineHour, customerOwnedFilamentRateRpPerGram: { PLA: rates.plaOwn, ABS: rates.absOwn }, communalFilamentRateRpPerGram: { PLA: rates.plaCommunal, ABS: rates.absCommunal } });
}
