import { z } from "zod";

import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { recordAudit, type AuditRecorder } from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import {
  StoredFileRepository,
  type PrivateFileOwner,
  type VerifiedPrivateFileForOwner,
} from "./repository";
import {
  createR2PrivateObjectStorageFromEnvironment,
  type PrivateObjectStorage,
} from "./r2";

const PRIVATE_DOWNLOAD_TTL_SECONDS = 5 * 60;

const privateFileDownloadSchema = z.object({
  fileId: z.uuid(),
  ownerId: z.uuid(),
  ownerType: z.enum(["B2B_INQUIRY", "CUSTOM_PRINT_REQUEST"]),
});

export type PrivateFileDownloadRepository = Readonly<{
  findVerifiedPrivateFileForOwner(input: Readonly<{
    fileId: string;
    ownerId: string;
    ownerType: PrivateFileOwner;
  }>): Promise<VerifiedPrivateFileForOwner | null>;
}>;

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type PrivateFileDownloadServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  now?: () => Date;
  repository?: PrivateFileDownloadRepository;
  storage?: PrivateObjectStorage;
}>;

export type PrivateFileDownloadResult = Readonly<{
  downloadUrl: string;
  expiresAt: Date;
  fileId: string;
  originalName: string;
}>;

export class PrivateFileDownloadService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly clock: () => Date;
  private readonly repositoryFactory: () => PrivateFileDownloadRepository;
  private readonly storageFactory: () => PrivateObjectStorage;

  constructor(dependencies: PrivateFileDownloadServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.clock = dependencies.now ?? (() => new Date());
    this.repositoryFactory = () =>
      dependencies.repository ?? new StoredFileRepository();
    this.storageFactory = () =>
      dependencies.storage ?? createR2PrivateObjectStorageFromEnvironment();
  }

  async createDownload(input: unknown): Promise<PrivateFileDownloadResult> {
    const parsed = parseWithValidation(privateFileDownloadSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(
      admin,
      parsed.ownerType === "B2B_INQUIRY"
        ? "INQUIRY_MANAGE"
        : "CUSTOM_PRINT_REVIEW",
    );
    const file = await this.repositoryFactory().findVerifiedPrivateFileForOwner(parsed);

    if (file === null) {
      throw appError("NOT_FOUND");
    }

    const now = this.clock();
    const expiresAt = new Date(now.getTime() + PRIVATE_DOWNLOAD_TTL_SECONDS * 1_000);
    const downloadUrl = await this.storageFactory().createDownloadUrl({
      expiresInSeconds: PRIVATE_DOWNLOAD_TTL_SECONDS,
      key: file.storageKey,
    });

    await recordAudit(this.audit, {
      action: "file.download-url.issued",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { status: "ISSUED" },
      entityId: file.fileId,
      entityType: "StoredFile",
      metadata: {
        expiresAt: expiresAt.toISOString(),
        mimeType: file.mimeType,
        operation: "private-file-download",
        ownerType: parsed.ownerType,
      },
    });

    return {
      downloadUrl,
      expiresAt,
      fileId: file.fileId,
      originalName: file.originalName,
    };
  }
}
