import { randomUUID } from "node:crypto";

import { z } from "zod";

import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";
import { appError, isAppError } from "@/modules/shared/errors";
import { recordAudit, type AuditRecorder } from "@/modules/shared/audit";
import {
  issueAccessToken,
  verifyAccessToken,
  type RandomBytes,
} from "@/modules/shared/access-token";
import { parseWithValidation } from "@/modules/shared/validation";

import {
  StoredFileRepository,
  type CreatePendingFileInput,
  type PendingFileForConfirmation,
} from "./repository";
import {
  createR2PrivateObjectStorageFromEnvironment,
  type PrivateObjectStorage,
} from "./r2";

const UPLOAD_INTENT_TTL_MS = 10 * 60 * 1_000;

const PRIVATE_FILE_TYPES = {
  "3mf": ["model/3mf", "application/vnd.ms-3mfdocument"],
  obj: ["model/obj", "text/plain"],
  step: ["model/step", "application/step"],
  stl: ["model/stl", "application/sla", "application/vnd.ms-pki.stl"],
  stp: ["model/step", "application/step"],
} as const;

type PrivateFileExtension = keyof typeof PRIVATE_FILE_TYPES;

const uploadIntentSchema = z.object({
  mimeType: z.string().trim().min(1).max(120),
  originalName: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().positive().max(CUSTOM_FILE_MAX_BYTES),
});

const uploadConfirmationSchema = z.object({
  fileId: z.uuid(),
  uploadToken: z.string().trim().min(32).max(512),
});

export type UploadIntentInput = z.infer<typeof uploadIntentSchema>;

export type UploadIntentResult = Readonly<{
  expiresAt: Date;
  fileId: string;
  requiredHeaders: Readonly<{ "content-type": string }>;
  uploadToken: string;
  uploadUrl: string;
}>;

export type UploadConfirmationResult = Readonly<{
  fileId: string;
  status: "UPLOADED";
}>;

export interface UploadFileRepository {
  createPending(input: CreatePendingFileInput): Promise<Readonly<{
    id: string;
    storageKey: string;
  }>>;
  findForUploadConfirmation(
    fileId: string,
  ): Promise<PendingFileForConfirmation | null>;
  markUploadedIfPending(input: Readonly<{
    fileId: string;
    now: Date;
    uploadTokenHash: string;
  }>): Promise<boolean>;
  rejectPendingUpload(fileId: string): Promise<void>;
}

export type UploadServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  now?: () => Date;
  randomBytes?: RandomBytes;
  repository?: UploadFileRepository;
  storage?: PrivateObjectStorage;
}>;

type NormalizedPrivateFile = Readonly<{
  extension: PrivateFileExtension;
  mimeType: string;
  originalName: string;
  sizeBytes: bigint;
}>;

export class UploadService {
  private readonly audit?: AuditRecorder;
  private readonly clock: () => Date;
  private readonly randomBytes?: RandomBytes;
  private readonly repositoryFactory: () => UploadFileRepository;
  private readonly storageFactory: () => PrivateObjectStorage;

  constructor(dependencies: UploadServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.clock = dependencies.now ?? (() => new Date());
    this.randomBytes = dependencies.randomBytes;
    this.repositoryFactory = () =>
      dependencies.repository ?? new StoredFileRepository();
    this.storageFactory = () =>
      dependencies.storage ?? createR2PrivateObjectStorageFromEnvironment();
  }

  async createIntent(input: unknown): Promise<UploadIntentResult> {
    const file = normalizePrivateFile(input);
    const now = this.clock();
    const expiresAt = new Date(now.getTime() + UPLOAD_INTENT_TTL_MS);
    const fileId = randomUUID();
    const uploadToken = issueAccessToken({
      entityId: fileId,
      expiresAt,
      now,
      randomBytes: this.randomBytes,
      scope: "FILE_UPLOAD",
    });
    const storage = this.storageFactory();
    const repository = this.repositoryFactory();
    const pending = await repository.createPending({
      bucketScope: "PRIVATE_CUSTOMER",
      extension: file.extension,
      id: fileId,
      mimeType: file.mimeType,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      uploadExpiresAt: expiresAt,
      uploadTokenHash: uploadToken.tokenHash,
    });

    try {
      const uploadUrl = await storage.createUploadUrl({
        contentType: file.mimeType,
        expiresInSeconds: Math.max(
          1,
          Math.floor((expiresAt.getTime() - now.getTime()) / 1_000),
        ),
        key: pending.storageKey,
      });

      await recordAudit(this.audit, {
        action: "file.upload.intent.issued",
        actorType: "SYSTEM",
        afterJson: { status: "PENDING" },
        entityId: pending.id,
        entityType: "StoredFile",
        metadata: {
          mimeType: file.mimeType,
          operation: "upload-intent",
          sizeBytes: file.sizeBytes.toString(),
        },
      });

      return {
        expiresAt,
        fileId: pending.id,
        requiredHeaders: { "content-type": file.mimeType },
        uploadToken: uploadToken.token,
        uploadUrl,
      };
    } catch (error) {
      await rejectPendingWithoutThrowing(repository, pending.id);

      if (isAppError(error)) {
        throw error;
      }

      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan upload privat sedang tidak tersedia.",
      });
    }
  }

  async confirmUpload(input: unknown): Promise<UploadConfirmationResult> {
    const parsed = parseWithValidation(uploadConfirmationSchema, input);
    const repository = this.repositoryFactory();
    const file = await repository.findForUploadConfirmation(parsed.fileId);

    if (
      file === null ||
      file.uploadStatus !== "PENDING" ||
      file.uploadTokenHash === null ||
      file.uploadExpiresAt === null
    ) {
      throw appError("UNAUTHORIZED");
    }

    const now = this.clock();

    try {
      verifyAccessToken({
        entityId: file.id,
        expectedHash: file.uploadTokenHash,
        expiresAt: file.uploadExpiresAt,
        now,
        scope: "FILE_UPLOAD",
        token: parsed.uploadToken,
      });
    } catch (error) {
      if (isAppError(error) && error.code === "UNAUTHORIZED" && now >= file.uploadExpiresAt) {
        await this.rejectAndDelete(file);
      }
      throw error;
    }

    let metadata: Awaited<ReturnType<PrivateObjectStorage["headObject"]>>;
    try {
      metadata = await this.storageFactory().headObject(file.storageKey);
    } catch {
      await this.rejectAndDelete(file);
      throw appError("UPLOAD_REJECTED", {
        details: { file: "Objek upload tidak ditemukan atau tidak dapat diverifikasi." },
      });
    }

    if (!matchesDeclaredObject(file, metadata)) {
      await this.rejectAndDelete(file);
      throw appError("UPLOAD_REJECTED", {
        details: { file: "Metadata objek tidak cocok dengan upload intent." },
      });
    }

    const markedUploaded = await repository.markUploadedIfPending({
      fileId: file.id,
      now,
      uploadTokenHash: file.uploadTokenHash,
    });

    if (!markedUploaded) {
      throw appError("CONFLICT", {
        message: "Upload sudah diproses atau masa berlakunya berakhir.",
      });
    }

    await recordAudit(this.audit, {
      action: "file.upload.confirmed",
      actorType: "SYSTEM",
      afterJson: { status: "UPLOADED" },
      entityId: file.id,
      entityType: "StoredFile",
      metadata: { operation: "upload-confirm" },
    });

    return { fileId: file.id, status: "UPLOADED" };
  }

  private async rejectAndDelete(
    file: PendingFileForConfirmation,
  ): Promise<void> {
    const repository = this.repositoryFactory();
    await rejectPendingWithoutThrowing(repository, file.id);

    try {
      await this.storageFactory().deleteObject(file.storageKey);
    } catch {
      // The tombstoned database state ensures retryable retention cleanup does
      // not make this capability usable again if object deletion is delayed.
    }

    try {
      await recordAudit(this.audit, {
        action: "file.upload.rejected",
        actorType: "SYSTEM",
        afterJson: { status: "REJECTED" },
        entityId: file.id,
        entityType: "StoredFile",
        metadata: { operation: "upload-confirm" },
      });
    } catch {
      // A rejected private object must remain rejected even while audit storage
      // is unavailable; cleanup can later reconcile the operational record.
    }
  }
}

function normalizePrivateFile(input: unknown): NormalizedPrivateFile {
  const parsed = parseWithValidation(uploadIntentSchema, input);
  const originalName = parsed.originalName.trim();

  if (/[\\/\u0000-\u001f]/.test(originalName)) {
    throw appError("UPLOAD_REJECTED", {
      details: { originalName: "Nama file tidak boleh memuat path atau karakter kontrol." },
    });
  }

  const extensionStart = originalName.lastIndexOf(".");
  const extension = originalName.slice(extensionStart + 1).toLowerCase();

  if (extensionStart < 1 || !(extension in PRIVATE_FILE_TYPES)) {
    throw appError("UPLOAD_REJECTED", {
      details: { originalName: "Ekstensi file belum didukung." },
    });
  }

  const typedExtension = extension as PrivateFileExtension;
  const mimeType = parsed.mimeType.toLowerCase();

  if (!PRIVATE_FILE_TYPES[typedExtension].includes(mimeType as never)) {
    throw appError("UPLOAD_REJECTED", {
      details: { mimeType: "MIME type tidak cocok dengan ekstensi file." },
    });
  }

  return {
    extension: typedExtension,
    mimeType,
    originalName,
    sizeBytes: BigInt(parsed.sizeBytes),
  };
}

function matchesDeclaredObject(
  file: PendingFileForConfirmation,
  metadata: Awaited<ReturnType<PrivateObjectStorage["headObject"]>>,
): boolean {
  const contentType = metadata.contentType?.split(";", 1)[0]?.trim().toLowerCase();
  const contentLength = metadata.contentLength;

  return (
    typeof contentLength === "number" &&
    Number.isSafeInteger(contentLength) &&
    BigInt(contentLength) === file.sizeBytes &&
    contentType === file.mimeType
  );
}

async function rejectPendingWithoutThrowing(
  repository: UploadFileRepository,
  fileId: string,
): Promise<void> {
  try {
    await repository.rejectPendingUpload(fileId);
  } catch {
    // Retention cleanup remains responsible for a rare persistence outage.
  }
}
