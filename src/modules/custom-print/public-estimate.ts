import { calculatePrintQuote, type PrintMaterial } from "@/modules/pricing/calculator";
import type { CustomPrintPricingPolicy } from "@/modules/pricing/policy";

import { customerPreviewInputSchema } from "./customer-preview";

/** What a visitor types into the public calculator on /custom-print. */
export type PublicEstimateInput = Readonly<{
  material: string;
  quantity: string;
  weightGramsPerUnit: string;
  hours: string;
  minutes: string;
}>;

export type PublicEstimateValues = Readonly<{
  material: PrintMaterial;
  quantity: number;
  weightGramsPerUnit: string;
  printDurationSecondsPerUnit: number;
}>;

export type PublicEstimate = PublicEstimateValues & Readonly<{
  materialSubtotalRp: string;
  machineSubtotalRp: string;
  finalTotalRp: string;
}>;

/** Slicer numbers carried from the calculator into the model request form. */
export type PublicEstimatePrefill = Readonly<{
  material: PrintMaterial;
  quantity: number;
  weightGramsPerUnit: string;
  hours: number;
  minutes: number;
}>;

const wholeNumber = /^\d{1,6}$/;

/**
 * Reads the visitor's numbers with the request form's simulation limits: PLA or ABS, a positive
 * whole quantity, a positive weight per unit, and a duration per unit above zero with 0–59 minutes.
 */
export function readPublicEstimateInput(input: PublicEstimateInput): PublicEstimateValues | null {
  const material = input.material.trim();
  if (material !== "PLA" && material !== "ABS") return null;
  const quantityText = input.quantity.trim();
  const hoursText = input.hours.trim() || "0";
  const minutesText = input.minutes.trim() || "0";
  if (!wholeNumber.test(quantityText) || !wholeNumber.test(hoursText) || !wholeNumber.test(minutesText)) return null;
  const quantity = Number(quantityText);
  const minutes = Number(minutesText);
  if (quantity < 1 || minutes > 59) return null;
  const parsed = customerPreviewInputSchema.safeParse({
    source: "CUSTOMER_DECLARED_SLICER",
    weightGramsPerUnit: input.weightGramsPerUnit.trim().replace(",", "."),
    printDurationSecondsPerUnit: (Number(hoursText) * 60 + minutes) * 60,
  });
  if (!parsed.success) return null;
  return {
    material,
    quantity,
    weightGramsPerUnit: parsed.data.weightGramsPerUnit,
    printDurationSecondsPerUnit: parsed.data.printDurationSecondsPerUnit,
  };
}

/** Material and machine time from the visitor's own slicer numbers, on Niuva-stock filament. Never a final price. */
export function calculatePublicEstimate(input: PublicEstimateInput, policy: CustomPrintPricingPolicy): PublicEstimate | null {
  const values = readPublicEstimateInput(input);
  if (values === null) return null;
  try {
    const result = calculatePrintQuote({
      filamentSource: "NIUVA_STOCK",
      material: values.material,
      policy,
      printDurationSeconds: values.printDurationSecondsPerUnit,
      quantity: values.quantity,
      weightGrams: values.weightGramsPerUnit,
    });
    return {
      ...values,
      materialSubtotalRp: result.materialSubtotalRp.toFixed(),
      machineSubtotalRp: result.machineSubtotalRp.toFixed(),
      finalTotalRp: result.finalTotalRp.toFixed(),
    };
  } catch {
    return null;
  }
}

export function publicEstimateSearchParams(values: PublicEstimateValues): URLSearchParams {
  return new URLSearchParams({
    material: values.material,
    quantity: String(values.quantity),
    weight: values.weightGramsPerUnit,
    hours: String(Math.floor(values.printDurationSecondsPerUnit / 3_600)),
    minutes: String(Math.floor((values.printDurationSecondsPerUnit % 3_600) / 60)),
  });
}

/** Re-validates calculator numbers from the request URL; anything malformed is dropped, never repaired. */
export function readPublicEstimatePrefill(params: Readonly<Record<string, string | string[] | undefined>>): PublicEstimatePrefill | null {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };
  const values = readPublicEstimateInput({
    material: one("material"),
    quantity: one("quantity"),
    weightGramsPerUnit: one("weight"),
    hours: one("hours"),
    minutes: one("minutes"),
  });
  if (values === null) return null;
  return {
    material: values.material,
    quantity: values.quantity,
    weightGramsPerUnit: values.weightGramsPerUnit,
    hours: Math.floor(values.printDurationSecondsPerUnit / 3_600),
    minutes: Math.floor((values.printDurationSecondsPerUnit % 3_600) / 60),
  };
}
