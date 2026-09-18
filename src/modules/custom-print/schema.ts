import { z } from "zod";

import { customProductInterestInputSchema } from "./product-intake";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const customPrintRequestInputSchema = z
  .object({
    colorRequested: optionalText,
    customerEmail: z.email(),
    customerName: requiredText,
    customerPhone: requiredText,
    fileIds: z.array(z.uuid()).min(1),
    faculty: optionalText,
    materialRequested: requiredText,
    notes: optionalText,
    productInterest: customProductInterestInputSchema,
    quantity: z.int().positive(),
    requestedSize: optionalText,
    targetDeadline: z.preprocess(
      (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
      z.iso.date().optional(),
    ),
    unitConfirmation: optionalText,
  })
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
