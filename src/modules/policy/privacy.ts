const DAY_MS = 24 * 60 * 60 * 1_000;

export const CUSTOM_FILE_MAX_BYTES = 100 * 1_024 * 1_024;
export const REFERENCE_PHOTO_MAX_BYTES = 10 * 1_024 * 1_024;

export const NIUVA_MVP_FILE_RETENTION = {
  abandonedOrRejectedUploadMs: 14 * DAY_MS,
  cancelledOrUnpaidRequestMs: 60 * DAY_MS,
  completedCustomOrderMs: 90 * DAY_MS,
  id: "niuva-mvp-files-2026-09-05",
} as const;

export type FileRetentionClass =
  | "ABANDONED_OR_REJECTED_UPLOAD"
  | "CANCELLED_OR_UNPAID_REQUEST"
  | "COMPLETED_CUSTOM_ORDER";

export function fileDeletionEligibleAt(startingAt: Date, retentionClass: FileRetentionClass): Date;
export function fileDeletionEligibleAt(startingAt: Date, retentionClass: FileRetentionClass, purpose: "FINANCIAL_EVIDENCE"): null;
export function fileDeletionEligibleAt(startingAt: Date, retentionClass: FileRetentionClass, purpose: "CUSTOMER_UPLOAD" | "FINANCIAL_EVIDENCE"): Date | null;
export function fileDeletionEligibleAt(
  startingAt: Date,
  retentionClass: FileRetentionClass,
  purpose: "CUSTOMER_UPLOAD" | "FINANCIAL_EVIDENCE" = "CUSTOMER_UPLOAD",
): Date | null {
  if (purpose === "FINANCIAL_EVIDENCE") return null;
  const timestamp = startingAt.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new TypeError("Retention timestamp harus berupa Date yang valid.");
  }

  const duration = {
    ABANDONED_OR_REJECTED_UPLOAD:
      NIUVA_MVP_FILE_RETENTION.abandonedOrRejectedUploadMs,
    CANCELLED_OR_UNPAID_REQUEST:
      NIUVA_MVP_FILE_RETENTION.cancelledOrUnpaidRequestMs,
    COMPLETED_CUSTOM_ORDER: NIUVA_MVP_FILE_RETENTION.completedCustomOrderMs,
  }[retentionClass];

  return new Date(timestamp + duration);
}
