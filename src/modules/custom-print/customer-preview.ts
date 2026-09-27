import Decimal from "decimal.js";
import { z } from "zod";

import { calculatePrintQuote, type PrintMaterial } from "@/modules/pricing/calculator";
import {
  CUSTOM_PRINT_V1_RULE_CODE,
  customPrintPricingPolicySchema,
  parseActiveCustomPrintPricingPolicy,
} from "@/modules/pricing/policy";

const positiveWeight = z.string().trim()
  .refine((value) => /^\d{1,6}(?:\.\d{1,6})?$/.test(value) && new Decimal(value).gt(0),
    "Berat per unit harus berupa angka positif dengan maksimal enam angka desimal.");

export const customerPreviewInputSchema = z.object({
  source: z.literal("CUSTOMER_DECLARED_SLICER"),
  weightGramsPerUnit: positiveWeight,
  printDurationSecondsPerUnit: z.int().positive(),
}).strict();

export const customerPreviewRequestSchema = z.object({
  fileId: z.uuid(),
  materialRequested: z.string().trim().min(1),
  quantity: z.int().positive(),
  customerPreviewInput: customerPreviewInputSchema,
}).strict();

export type CustomerPreviewInput = z.infer<typeof customerPreviewInputSchema>;
export type CustomerPreviewRequest = z.infer<typeof customerPreviewRequestSchema>;

export function isCustomerPreviewMesh(extension: string): boolean {
  return ["stl", "obj", "3mf"].includes(extension.toLowerCase());
}

export const customerPreviewSnapshotSchema = z.object({
  kind: z.literal("CUSTOMER_PRE_REVIEW_V1"),
  source: z.literal("CUSTOMER_DECLARED_SLICER"),
  fileId: z.uuid(),
  fileExtension: z.string(),
  input: z.object({
    material: z.enum(["PLA", "ABS"]),
    filamentSource: z.literal("NIUVA_STOCK"),
    weightGramsPerUnit: positiveWeight,
    printDurationSecondsPerUnit: z.int().positive(),
    quantity: z.int().positive(),
  }),
  pricingRule: z.object({
    id: z.uuid(),
    code: z.literal(CUSTOM_PRINT_V1_RULE_CODE),
    version: z.int().positive(),
    definition: customPrintPricingPolicySchema,
  }),
  result: z.object({
    materialSubtotalRp: z.string(),
    machineSubtotalRp: z.string(),
    unroundedTotalRp: z.string(),
    finalTotalRp: z.string(),
  }),
  calculatedAt: z.iso.datetime(),
}).strict();

export type CustomerPreviewSnapshot = z.infer<typeof customerPreviewSnapshotSchema>;

export function readCustomerPreviewSnapshot(value: unknown): CustomerPreviewSnapshot | null {
  const parsed = customerPreviewSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function calculateCustomerPreviewSnapshot(input: Readonly<{
  fileId: string;
  fileExtension: string;
  materialRequested: string;
  quantity: number;
  customerPreviewInput: CustomerPreviewInput;
  rule: Readonly<{ id: string; code: string; version: number; definitionJson: unknown }>;
  calculatedAt?: Date;
}>): CustomerPreviewSnapshot | null {
  if (!isCustomerPreviewMesh(input.fileExtension) ||
    (input.materialRequested !== "PLA" && input.materialRequested !== "ABS") ||
    input.rule.code !== CUSTOM_PRINT_V1_RULE_CODE) return null;

  const policy = parseActiveCustomPrintPricingPolicy(input.rule.definitionJson);
  if (input.rule.version !== policy.version || policy.quantitySemantics !== "PER_UNIT") return null;
  const material = input.materialRequested as PrintMaterial;
  const calculated = calculatePrintQuote({
    filamentSource: "NIUVA_STOCK",
    material,
    policy,
    printDurationSeconds: input.customerPreviewInput.printDurationSecondsPerUnit,
    quantity: input.quantity,
    weightGrams: input.customerPreviewInput.weightGramsPerUnit,
  });

  return {
    kind: "CUSTOMER_PRE_REVIEW_V1",
    source: "CUSTOMER_DECLARED_SLICER",
    fileId: input.fileId,
    fileExtension: input.fileExtension.toLowerCase(),
    input: {
      material,
      filamentSource: "NIUVA_STOCK",
      weightGramsPerUnit: input.customerPreviewInput.weightGramsPerUnit,
      printDurationSecondsPerUnit: input.customerPreviewInput.printDurationSecondsPerUnit,
      quantity: input.quantity,
    },
    pricingRule: { id: input.rule.id, code: CUSTOM_PRINT_V1_RULE_CODE,
      version: input.rule.version, definition: policy },
    result: {
      materialSubtotalRp: calculated.materialSubtotalRp.toString(),
      machineSubtotalRp: calculated.machineSubtotalRp.toString(),
      unroundedTotalRp: calculated.unroundedTotalRp.toString(),
      finalTotalRp: calculated.finalTotalRp.toString(),
    },
    calculatedAt: (input.calculatedAt ?? new Date()).toISOString(),
  };
}
