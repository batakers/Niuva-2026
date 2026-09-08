import {
  calculatePrintQuote,
  type FilamentSource,
} from "@/modules/pricing/calculator";
import {
  CUSTOM_PRINT_V1_PER_UNIT_POLICY,
  type CustomPrintPricingPolicy,
} from "@/modules/pricing/policy";

export type AdminQuoteScenario = "ready" | "rule-missing" | "loading" | "empty" | "error";

export type PreviewQuoteStatus = "DRAFT" | "SENT";

export type PreviewQuoteFixture = Readonly<{
  configurationSummary: string;
  materialCode: "PLA" | "ABS";
  printDurationSeconds: number;
  quantity: number;
  quoteReference: string;
  requestReference: string;
  reviewNotes: string;
  verifiedWeightG: string;
}>;

export type PreviewActivePricingRule = Readonly<{
  definition: CustomPrintPricingPolicy;
  label: string;
  ruleCode: string;
  version: number;
}>;

export type PreviewQuoteCalculation = Readonly<{
  finalTotalRp: string;
  machineSubtotalRp: string;
  materialSubtotalRp: string;
  unroundedTotalRp: string;
}>;

export const previewQuoteFixture: PreviewQuoteFixture = {
  configurationSummary: "Layer dan infill sudah dicatat pada review contoh.",
  materialCode: "PLA",
  printDurationSeconds: 10_800,
  quantity: 2,
  quoteReference: "QTE-EX-3028",
  requestReference: "CPR-EX-2191",
  reviewNotes: "Fixture review sudah lengkap dan siap menjadi dasar draft quote.",
  verifiedWeightG: "128.4",
};

export const previewActivePricingRule: PreviewActivePricingRule = {
  definition: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
  label: "Pricing v1 aktif pada fixture development",
  ruleCode: CUSTOM_PRINT_V1_PER_UNIT_POLICY.code,
  version: CUSTOM_PRINT_V1_PER_UNIT_POLICY.version,
};

export const previewFilamentSources: readonly Readonly<{
  label: string;
  value: FilamentSource;
}>[] = [
  { label: "Stok Niuva", value: "NIUVA_STOCK" },
  { label: "Filament milik customer", value: "CUSTOMER_OWN" },
  { label: "Filament komunal", value: "COMMUNAL" },
];

export function getPreviewQuoteFixture(reference: string | null): PreviewQuoteFixture | null {
  if (reference === null || reference === previewQuoteFixture.quoteReference) {
    return previewQuoteFixture;
  }

  return null;
}

export function calculatePreviewQuote(
  filamentSource: FilamentSource,
  fixture: PreviewQuoteFixture = previewQuoteFixture,
): PreviewQuoteCalculation {
  const calculation = calculatePrintQuote({
    filamentSource,
    material: fixture.materialCode,
    policy: previewActivePricingRule.definition,
    printDurationSeconds: fixture.printDurationSeconds,
    quantity: fixture.quantity,
    weightGrams: fixture.verifiedWeightG,
  });

  return {
    finalTotalRp: formatRupiah(calculation.finalTotalRp.toFixed(0)),
    machineSubtotalRp: formatRupiah(calculation.machineSubtotalRp.toFixed(0)),
    materialSubtotalRp: formatRupiah(calculation.materialSubtotalRp.toFixed(0)),
    unroundedTotalRp: formatRupiah(calculation.unroundedTotalRp.toFixed(0)),
  };
}

function formatRupiah(value: string): string {
  const digits = value.replace(/^(-?)(\d+)$/, "$1$2");
  const sign = digits.startsWith("-") ? "-" : "";
  const integer = sign.length > 0 ? digits.slice(1) : digits;

  return `Rp${sign}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
