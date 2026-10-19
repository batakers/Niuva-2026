import type { Prisma } from "../../generated/prisma/client";
import { appError } from "../shared/errors";

/** Call while holding the request lock so a retention claim cannot race a new quote. */
export async function assertRequestFilesRetained(tx: Prisma.TransactionClient, requestId: string): Promise<void> {
  const unavailable = await tx.customPrintRequestFile.count({ where: { requestId, file: { uploadStatus: { in: ["DELETE_PENDING", "DELETED"] } } } });
  if (unavailable > 0) throw appError("QUOTE_NOT_READY", { message: "File request sudah memasuki penghapusan retensi. Gunakan request baru dengan model yang masih tersedia." });
}
