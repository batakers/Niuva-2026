import { z } from "zod";
import { providerReasonSchema } from "./execution-core";
const reference = z.string().trim().min(10).max(200).regex(/^[^\r\n]+$/).refine(value => !/https?:\/\/|[?&](token|signature|key)=/i.test(value));
const base = { orderId: z.uuid(), expectedVersion: z.number().int().positive(), submissionKey: z.uuid() };
export const refundSubmitSchema = z.strictObject({ ...base, allocationId: z.uuid(), publicReason: providerReasonSchema, eligibilityEvidence: reference });
export const refundManualAuthorizeSchema = z.strictObject({ ...base, reason: z.string().trim().min(10).max(1000),
  providerConfirmedNoPending: z.literal(true), providerResolutionReference: reference, recipientVerificationReference: reference });
export const refundManualConfirmSchema = z.strictObject({ ...base, authorizationId: z.uuid(), transferReference: reference, evidenceReference: reference, paidAt: z.iso.datetime({ offset: true }) });
export const refundManualRevokeSchema = z.strictObject({ ...base, authorizationId: z.uuid(), reason: z.string().trim().min(10).max(1000) });
export type RefundSubmitInput = z.infer<typeof refundSubmitSchema>;
export type RefundManualAuthorizeInput = z.infer<typeof refundManualAuthorizeSchema>;
export type RefundManualConfirmInput = z.infer<typeof refundManualConfirmSchema>;
export type RefundManualRevokeInput = z.infer<typeof refundManualRevokeSchema>;
