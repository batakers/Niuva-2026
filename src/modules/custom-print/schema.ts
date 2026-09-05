import { z } from "zod";

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
    materialRequested: requiredText,
    notes: optionalText,
    quantity: z.int().positive(),
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
