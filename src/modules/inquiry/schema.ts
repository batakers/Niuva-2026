import { z } from "zod";

const requiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional(),
);

const inquiryStages = [
  "IDEA",
  "SKETCH",
  "CAD",
  "PROTOTYPE",
  "EXISTING_PRODUCT",
] as const;

export const b2bInquiryInputSchema = z
  .object({
    attachmentFileIds: z.array(z.uuid()).min(1).optional(),
    budgetRange: optionalText,
    company: optionalText,
    confidentialityAck: z.literal(true),
    currentStage: z.enum(inquiryStages),
    description: requiredText,
    email: z.email(),
    name: requiredText,
    phone: requiredText,
    preferredService: optionalText,
    projectGoal: requiredText,
    referenceLink: z.union([z.url(), z.literal("")]).optional().transform(
      (value) => (value === "" ? undefined : value),
    ),
    targetDeadline: z.iso.date(),
    targetQuantity: requiredText,
  })
  .superRefine((input, context) => {
    if (
      input.attachmentFileIds !== undefined &&
      new Set(input.attachmentFileIds).size !== input.attachmentFileIds.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Satu file hanya boleh dicantumkan sekali.",
        path: ["attachmentFileIds"],
      });
    }

    if (
      input.referenceLink === undefined &&
      (input.attachmentFileIds === undefined || input.attachmentFileIds.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "Lampiran file privat atau link referensi wajib diisi.",
        path: ["attachmentFileIds"],
      });
    }
  });

export type B2BInquiryInput = z.infer<typeof b2bInquiryInputSchema>;
