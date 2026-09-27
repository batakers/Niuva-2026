import { z } from "zod";

import { customProductInterestInputSchema } from "./product-intake";
import { customerPreviewInputSchema } from "./customer-preview";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional(),
);
const optionalReferenceLink = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url({ protocol: /^https$/ }).max(2_048).optional(),
);

const commonFields = {
  colorRequested: optionalText,
  customerEmail: z.email(),
  customerName: requiredText,
  customerPhone: requiredText,
  faculty: optionalText,
  materialRequested: requiredText,
  productInterest: customProductInterestInputSchema,
  quantity: z.int().positive(),
  referenceLink: optionalReferenceLink,
  requestedSize: optionalText,
  targetDeadline: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.iso.date().optional(),
  ),
  unitConfirmation: optionalText,
} as const;

export const customPrintRequestInputSchema = z
  .union([
    z.object({
      ...commonFields,
      fileIds: z.array(z.uuid()).min(1),
      intakeMode: z.literal("MODEL_READY").default("MODEL_READY"),
      customerPreviewInput: customerPreviewInputSchema.optional(),
      notes: optionalText,
    }),
    z.object({
      ...commonFields,
      fileIds: z.array(z.uuid()).max(1).default([]),
      intakeMode: z.literal("REFERENCE_ONLY"),
      notes: requiredText,
      unitConfirmation: z.undefined().optional(),
    }),
  ])
  .superRefine((input, context) => {
    if (new Set(input.fileIds).size !== input.fileIds.length) {
      context.addIssue({
        code: "custom",
        message: "Satu file hanya boleh dicantumkan sekali.",
        path: ["fileIds"],
      });
    }
  });

export type CustomPrintRequestInput = z.infer<
  typeof customPrintRequestInputSchema
>;
