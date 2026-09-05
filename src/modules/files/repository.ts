import type {
  Prisma,
  PrismaClient,
  StorageBucketScope,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";

import {
  assertFileTransition,
  assertVerifiedFileHasOwner,
  createRandomStorageKey,
  type FileBucketScope,
  type FileUploadStatus,
} from "./lifecycle";

export type CreatePendingFileInput = Readonly<{
  bucketScope: FileBucketScope;
  extension: string;
  id: string;
  mimeType: string;
  originalName: string;
  sha256?: string;
  sizeBytes: bigint;
  uploadExpiresAt: Date;
  uploadTokenHash: string;
}>;

export type PendingFileForConfirmation = Readonly<{
  bucketScope: FileBucketScope;
  id: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  uploadExpiresAt: Date | null;
  uploadStatus: FileUploadStatus;
  uploadTokenHash: string | null;
}>;

export class StoredFileRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createPending(input: CreatePendingFileInput) {
    if (input.sizeBytes.toString().startsWith("-")) {
      throw appError("VALIDATION_ERROR", {
        details: { sizeBytes: "Ukuran file tidak boleh negatif." },
      });
    }

    return this.prisma.storedFile.create({
      data: {
        bucketScope: input.bucketScope as StorageBucketScope,
        extension: input.extension,
        id: input.id,
        mimeType: input.mimeType,
        originalName: input.originalName,
        sha256: input.sha256,
        sizeBytes: input.sizeBytes,
        storageKey: createRandomStorageKey(input.bucketScope),
        uploadExpiresAt: input.uploadExpiresAt,
        uploadStatus: "PENDING",
        uploadTokenHash: input.uploadTokenHash,
      },
    });
  }

  async findForUploadConfirmation(
    fileId: string,
  ): Promise<PendingFileForConfirmation | null> {
    const file = await this.prisma.storedFile.findUnique({
      where: { id: fileId },
      select: {
        bucketScope: true,
        id: true,
        mimeType: true,
        sizeBytes: true,
        storageKey: true,
        uploadExpiresAt: true,
        uploadStatus: true,
        uploadTokenHash: true,
      },
    });

    if (file === null) {
      return null;
    }

    return {
      ...file,
      bucketScope: file.bucketScope as FileBucketScope,
      uploadStatus: file.uploadStatus as FileUploadStatus,
    };
  }

  async markUploadedIfPending(input: Readonly<{
    fileId: string;
    now: Date;
    uploadTokenHash: string;
  }>): Promise<boolean> {
    const updated = await this.prisma.storedFile.updateMany({
      where: {
        id: input.fileId,
        uploadExpiresAt: { gt: input.now },
        uploadStatus: "PENDING",
        uploadTokenHash: input.uploadTokenHash,
      },
      data: {
        uploadedAt: input.now,
        uploadExpiresAt: null,
        uploadStatus: "UPLOADED",
        uploadTokenHash: null,
      },
    });

    return updated.count === 1;
  }

  async rejectPendingUpload(fileId: string): Promise<void> {
    await this.prisma.storedFile.updateMany({
      where: { id: fileId, uploadStatus: "PENDING" },
      data: {
        uploadExpiresAt: null,
        uploadStatus: "REJECTED",
        uploadTokenHash: null,
      },
    });
  }

  async transition(
    fileId: string,
    next: FileUploadStatus,
    now: Date = new Date(),
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.storedFile.findUnique({
        where: { id: fileId },
        include: {
          b2bInquiryLinks: { select: { fileId: true } },
          customPrintRequestLinks: { select: { fileId: true } },
        },
      });

      if (current === null) {
        throw appError("NOT_FOUND");
      }

      assertFileTransition(current.uploadStatus, next);

      if (next === "VERIFIED") {
        assertVerifiedFileHasOwner({
          b2bInquiryLinks: current.b2bInquiryLinks.length,
          customPrintRequestLinks: current.customPrintRequestLinks.length,
        });
      }

      return transaction.storedFile.update({
        where: { id: fileId },
        data: fileTransitionData(next, now),
      });
    });
  }
}

function fileTransitionData(
  next: FileUploadStatus,
  now: Date,
): Prisma.StoredFileUpdateInput {
  switch (next) {
    case "VERIFIED":
      return { uploadStatus: next, verifiedAt: now };
    case "REJECTED":
      return {
        uploadExpiresAt: null,
        uploadStatus: next,
        uploadTokenHash: null,
      };
    case "DELETED":
      return {
        deletedAt: now,
        uploadExpiresAt: null,
        uploadStatus: next,
        uploadTokenHash: null,
      };
    default:
      return { uploadStatus: next };
  }
}
