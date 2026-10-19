import { z } from "zod";

const reason = z.string().trim().min(10).max(1000);
const evidence = z.string().trim().min(5).max(200).refine(value => !/https?:\/\/|[?&](token|signature|key)=/i.test(value), "Gunakan referensi bukti internal atau resi, bukan URL privat.");
export const refundRequestSchema = z.strictObject({
  orderId: z.uuid(), submissionKey: z.uuid(), category: z.enum(["DELIVERY_DELAY", "ITEM_ISSUE", "OTHER"]), reason,
});
export const refundAdminIntakeSchema = refundRequestSchema.extend({ contactVerificationReference: evidence });
export const refundReviewSchema = z.strictObject({
  orderId: z.uuid(), expectedVersion: z.number().int().positive(), submissionKey: z.uuid(), reason,
  returnState: z.enum(["NOT_REQUIRED", "PENDING", "RECEIVED", "WAIVED"]), returnEvidenceReference: evidence.optional(),
}).superRefine((value, context) => {
  if (value.returnState === "RECEIVED" && !value.returnEvidenceReference) context.addIssue({ code: "custom", path: ["returnEvidenceReference"], message: "Referensi bukti retur wajib diisi." });
});
export const refundRefreshSchema = z.strictObject({ orderId: z.uuid(), expectedVersion: z.number().int().positive(), submissionKey: z.uuid(), reason });
export const refundReturnSchema = refundRefreshSchema.extend({ returnEvidenceReference: evidence });
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
export type RefundIntakeInput = z.infer<typeof refundAdminIntakeSchema>;
export type RefundReviewInput = z.infer<typeof refundReviewSchema>;
export type RefundRefreshInput = z.infer<typeof refundRefreshSchema>;
export type RefundReturnInput = z.infer<typeof refundReturnSchema>;
