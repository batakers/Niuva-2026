import { z } from "zod";
export const privacyPurposeSchema = z.enum(["EXPORT", "CLOSE"]);
export type PrivacyPurpose = z.infer<typeof privacyPurposeSchema>;
export const privacyTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const privacyRequestSchema = z.object({
  submissionKey: z.uuid(),
  kind: z.enum(["CORRECTION", "ADDITIONAL"]),
  details: z.string().trim().min(10, "Jelaskan data yang dimaksud, sedikitnya 10 karakter.").max(3000, "Maksimal 3.000 karakter."),
  correction: z.string().trim().max(3000, "Maksimal 3.000 karakter.").default(""),
}).superRefine((input, context) => {
  if (input.kind === "CORRECTION" && input.correction.length < 3) context.addIssue({ code: "custom", path: ["correction"], message: "Tuliskan koreksi yang Anda minta." });
});
export const privacyOwnerSchema = z.object({
  id: z.uuid(),
  status: z.enum(["IN_REVIEW", "RESOLVED"]),
  response: z.string().trim().min(10, "Tuliskan tanggapan sedikitnya 10 karakter.").max(3000),
  outcome: z.enum(["", "FULFILLED", "PARTIALLY_FULFILLED", "REFUSED"]).default(""),
  fulfilled: z.literal("on").optional(),
  applyProfileCorrection: z.literal("on").optional(),
  correctedDisplayName: z.string().trim().max(80).default(""),
  holdCategory: z.enum(["", "DISPUTE", "SECURITY_INCIDENT", "LEGAL_OBLIGATION"]).default(""),
  holdReason: z.string().trim().max(1000).default(""),
  holdReviewAt: z.union([z.iso.date(), z.literal("")]).default(""),
}).superRefine((input, context) => {
  if (input.status === "RESOLVED" && (!input.outcome || input.fulfilled !== "on")) context.addIssue({ code: "custom", path: ["fulfilled"], message: "Pastikan hasil sudah disampaikan dan tindakan benar-benar selesai." });
  if (input.applyProfileCorrection && (input.correctedDisplayName.length < 2 || input.status !== "RESOLVED" || !["FULFILLED", "PARTIALLY_FULFILLED"].includes(input.outcome))) context.addIssue({ code: "custom", path: ["correctedDisplayName"], message: "Nama koreksi minimal 2 karakter dan hanya diterapkan saat koreksi diselesaikan." });
  if (input.holdCategory && (input.holdReason.length < 10 || !/^\d{4}-\d{2}-\d{2}$/.test(input.holdReviewAt))) context.addIssue({ code: "custom", path: ["holdReason"], message: "Penahanan membutuhkan alasan dan tanggal peninjauan." });
});
