import { randomUUID } from "node:crypto";

import { appError } from "@/modules/shared/errors";

export type FileUploadStatus =
  | "PENDING"
  | "UPLOADED"
  | "VERIFIED"
  | "REJECTED"
  | "DELETED";

export type FileBucketScope = "PRIVATE_CUSTOMER" | "PUBLIC_MEDIA";

const ALLOWED_FILE_TRANSITIONS: Readonly<
  Record<FileUploadStatus, readonly FileUploadStatus[]>
> = {
  PENDING: ["UPLOADED", "REJECTED", "DELETED"],
  UPLOADED: ["VERIFIED", "REJECTED", "DELETED"],
  VERIFIED: ["DELETED"],
  REJECTED: ["DELETED"],
  DELETED: [],
};

export function assertFileTransition(
  current: FileUploadStatus,
  next: FileUploadStatus,
): void {
  if (!ALLOWED_FILE_TRANSITIONS[current].includes(next)) {
    throw appError("INVALID_STATE_TRANSITION");
  }
}

export function createRandomStorageKey(
  bucketScope: FileBucketScope,
  nextId: () => string = randomUUID,
): string {
  const namespace =
    bucketScope === "PRIVATE_CUSTOMER" ? "private/customer" : "public/media";

  return `${namespace}/${nextId()}`;
}

export function assertVerifiedFileHasOwner(
  ownership: Readonly<{
    b2bInquiryLinks: number;
    customPrintRequestLinks: number;
  }>,
): void {
  if (
    ownership.b2bInquiryLinks + ownership.customPrintRequestLinks !== 1
  ) {
    throw appError("CONFLICT", {
      message: "File terverifikasi harus memiliki tepat satu pemilik domain.",
    });
  }
}
