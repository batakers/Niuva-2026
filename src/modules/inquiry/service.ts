import { randomUUID } from "node:crypto";

import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  recordAudit,
  createTransitionAuditRecorder,
  type AuditRecorder,
} from "@/modules/shared/audit";
import {
  issueAccessToken,
  type IssuedAccessToken,
} from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import {
  createUniqueHumanReference,
} from "@/modules/shared/reference";
import { parseWithValidation } from "@/modules/shared/validation";
import { requireAdminPermission } from "@/modules/admin/permissions";

import { B2BInquiryRepository } from "./repository";
import {
  b2bInquiryInputSchema,
  requiresInquiryReference,
  type B2BInquiryInput,
} from "./schema";
import { transitionInquiry } from "./transitions";

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type InquiryRecord = Readonly<{
  id: string;
  referenceNumber: string;
}>;

export type InquiryNotificationScheduler = (input: Readonly<{
  inquiryId: string;
  referenceNumber: string;
}>) => void | Promise<void>;

export type InquiryNotificationFactory = () =>
  | InquiryNotificationScheduler
  | undefined;

export interface InquiryServiceRepository {
  create(
    input: B2BInquiryInput & Readonly<{
      id: string;
      publicTokenHash: string;
      referenceNumber: string;
    }>,
  ): Promise<InquiryRecord>;
  findUploadReadyFileIds(fileIds: readonly string[]): Promise<readonly string[]>;
  referenceExists(referenceNumber: string): Promise<boolean>;
  updateStatusIfCurrent(
    inquiryId: string,
    currentStatus: InquiryStatus,
    nextStatus: InquiryStatus,
  ): Promise<Readonly<{ id: string; status: InquiryStatus }> | null>;
}

type InquiryStatus =
  | "CLOSED"
  | "CONTACTED"
  | "LOST"
  | "NEW"
  | "QUALIFIED"
  | "QUOTED"
  | "WON";

export type InquiryServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  notification?: InquiryNotificationScheduler;
  notificationFactory?: InquiryNotificationFactory;
  randomBytes?: (size: number) => Uint8Array;
  repository?: InquiryServiceRepository;
}>;

export type SubmittedInquiry = Readonly<{
  accessToken: IssuedAccessToken;
  inquiry: InquiryRecord;
}>;

export class InquiryService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly notification?: InquiryNotificationScheduler;
  private readonly notificationFactory?: InquiryNotificationFactory;
  private readonly randomBytes?: (size: number) => Uint8Array;
  private readonly repositoryFactory: () => InquiryServiceRepository;

  constructor(dependencies: InquiryServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.notification = dependencies.notification;
    this.notificationFactory = dependencies.notificationFactory;
    this.randomBytes = dependencies.randomBytes;
    this.repositoryFactory = () =>
      dependencies.repository ?? new B2BInquiryRepository();
  }

  async submit(input: unknown): Promise<SubmittedInquiry> {
    const parsed = parseWithValidation(b2bInquiryInputSchema, input);
    const repository = this.repositoryFactory();
    const requestedFileIds = parsed.attachmentFileIds ?? [];
    const uploadReadyFileIds = await repository.findUploadReadyFileIds(requestedFileIds);

    if (uploadReadyFileIds.length !== new Set(requestedFileIds).size ||
      (requiresInquiryReference(parsed) && parsed.referenceLink === undefined && uploadReadyFileIds.length === 0)) {
      throw appError("CONFLICT", {
        message: "Inquiry hanya boleh mengikat file upload yang siap diverifikasi.",
      });
    }

    const id = randomUUID();
    const referenceNumber = await createUniqueHumanReference({
      exists: (candidate) => repository.referenceExists(candidate),
      prefix: "INQ",
      randomBytes: this.randomBytes,
    });
    const accessToken = issueAccessToken({
      entityId: id,
      includeEntityId: true,
      randomBytes: this.randomBytes,
      scope: "B2B_INQUIRY",
    });
    const inquiry = await repository.create({
      ...parsed,
      attachmentFileIds: [...uploadReadyFileIds],
      id,
      publicTokenHash: accessToken.tokenHash,
      referenceNumber,
    });

    await recordAudit(this.audit, {
      action: "inquiry.submitted",
      actorType: "SYSTEM",
      afterJson: { referenceNumber },
      entityId: inquiry.id,
      entityType: "B2BInquiry",
      metadata: { operation: "submit", referenceNumber },
    });

    let notification = this.notification;
    let notificationFactoryFailed = false;

    if (notification === undefined && this.notificationFactory !== undefined) {
      try {
        notification = this.notificationFactory();
      } catch {
        notificationFactoryFailed = true;
      }
    }

    if (notificationFactoryFailed) {
      await this.recordNotificationFailure(inquiry.id);
    }

    if (notification !== undefined) {
      try {
        await notification({
          inquiryId: inquiry.id,
          referenceNumber: inquiry.referenceNumber,
        });
      } catch {
        await this.recordNotificationFailure(inquiry.id);
      }
    }

    return { accessToken, inquiry };
  }

  private async recordNotificationFailure(inquiryId: string): Promise<void> {
    try {
      await recordAudit(this.audit, {
        action: "inquiry.notification.failed",
        actorType: "SYSTEM",
        afterJson: { status: "NOT_SENT" },
        entityId: inquiryId,
        entityType: "B2BInquiry",
        metadata: { operation: "notification", result: "FAILED" },
      });
    } catch {
      // A committed inquiry must remain successful if audit infrastructure is
      // unavailable as well.
    }
  }

  async transitionStatus(
    inquiryId: string,
    current: InquiryStatus,
    next: InquiryStatus,
  ): Promise<InquiryStatus> {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "INQUIRY_MANAGE");
    const transitionAudit =
      this.audit === undefined
        ? undefined
        : createTransitionAuditRecorder(this.audit, {
            actorId: admin.profile.id,
            actorType: "ADMIN",
          });
    await transitionInquiry({
      audit: transitionAudit,
      current,
      entityId: inquiryId,
      next,
    });

    const updated = await this.repositoryFactory().updateStatusIfCurrent(
      inquiryId,
      current,
      next,
    );

    if (updated === null) {
      throw appError("CONFLICT", {
        message: "Status inquiry berubah sebelum operasi selesai.",
      });
    }

    await recordAudit(this.audit, {
      action: "inquiry.status.transition",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { status: next },
      beforeJson: { status: current },
      entityId: inquiryId,
      entityType: "B2BInquiry",
      metadata: { result: "ALLOWED" },
    });

    return updated.status;
  }
}
