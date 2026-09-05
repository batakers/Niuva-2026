import { appError } from "@/modules/shared/errors";

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export function assertQuoteSnapshotMutable(status: QuoteStatus): void {
  if (status !== "DRAFT") {
    throw appError("CONFLICT", {
      message: "Quote yang telah dikirim tidak dapat diubah; buat versi baru.",
    });
  }
}

export function nextQuoteVersion(latestVersion: number | null): number {
  if (latestVersion === null) {
    return 1;
  }

  if (!Number.isSafeInteger(latestVersion) || latestVersion < 1) {
    throw appError("CONFLICT", {
      message: "Versi quote terakhir tidak valid.",
    });
  }

  return latestVersion + 1;
}
