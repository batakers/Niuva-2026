import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  createTransitionAuditRecorder,
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import {
  issueAccessToken,
  type IssuedAccessToken,
} from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { createUniqueHumanReference } from "@/modules/shared/reference";
import { parseWithValidation } from "@/modules/shared/validation";
import { requireAdminPermission } from "@/modules/admin/permissions";

import {
  CustomPrintRequestRepository,
  type CustomPrintReviewInput,
} from "./repository";
import {
  customPrintRequestInputSchema,
  type CustomPrintRequestInput,
} from "./schema";
import { transitionCustomPrintRequest } from "./transitions";

const reviewConfigurationValue = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.null(),
]);

export const customPrintReviewInputSchema = z.object({
  configurationJson: z.record(z.string(), reviewConfigurationValue).optional(),
  materialCode: z.string().trim().min(1),
  notes: z.string().trim().min(1).optional(),
  printDurationSeconds: z.int().nonnegative(),
  quantity: z.int().positive(),
  requestId: z.uuid(),
  verifiedWeightG: z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/),
});

export type CustomPrintReviewInputValue = z.infer<
  typeof customPrintReviewInputSchema
>;

type AuthorizeAdmin = () => Promise<AdminAccess>;

export interface CustomPrintServiceRepository {
  create(
    input: CustomPrintRequestInput & Readonly<{
      id: string;
      publicTokenHash: string;
      referenceNumber: string;
    }>,
  ): Promise<Readonly<{ id: string; referenceNumber: string }>>;
  findRequestForReview(requestId: string): Promise<Readonly<{
    id: string;
    quantity: number;
    status:
      | "APPROVED"
      | "CANCELLED"
      | "DECLINED"
      | "QUOTE_READY"
      | "QUOTE_SENT"
      | "SUBMITTED"
      | "UNDER_REVIEW";
  }> | null>;
  findUploadReadyFileIds(fileIds: readonly string[]): Promise<readonly string[]>;
  referenceExists(referenceNumber: string): Promise<boolean>;
  saveReview(input: CustomPrintReviewInput): Promise<unknown>;
  updateStatusIfCurrent(
    requestId: string,
    currentStatus: CustomPrintRequestStatus,
    nextStatus: CustomPrintRequestStatus,
  ): Promise<Readonly<{ id: string; status: CustomPrintRequestStatus }> | null>;
}

type CustomPrintRequestStatus =
  | "APPROVED"
  | "CANCELLED"
  | "DECLINED"
  | "QUOTE_READY"
  | "QUOTE_SENT"
  | "SUBMITTED"
  | "UNDER_REVIEW";

export type CustomPrintSubmission = Readonly<{
  accessToken: IssuedAccessToken;
  request: Readonly<{ id: string; referenceNumber: string }>;
}>;

export type CustomPrintNotificationScheduler = (input: Readonly<{
  referenceNumber: string;
  requestId: string;
}>) => void | Promise<void>;

export type CustomPrintServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  notification?: CustomPrintNotificationScheduler;
  randomBytes?: (size: number) => Uint8Array;
  repository?: CustomPrintServiceRepository;
}>;

export class CustomPrintService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly notification?: CustomPrintNotificationScheduler;
  private readonly randomBytes?: (size: number) => Uint8Array;
  private readonly repositoryFactory: () => CustomPrintServiceRepository;

  constructor(dependencies: CustomPrintServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.notification = dependencies.notification;
    this.randomBytes = dependencies.randomBytes;
    this.repositoryFactory = () =>
      dependencies.repository ?? new CustomPrintRequestRepository();
  }

  async submit(input: unknown): Promise<CustomPrintSubmission> {
    const parsed = parseWithValidation(customPrintRequestInputSchema, input);
    const repository = this.repositoryFactory();
    const requestedFileIds = parsed.fileIds;
    const uploadReadyFileIds = await repository.findUploadReadyFileIds(requestedFileIds);

    if (uploadReadyFileIds.length !== new Set(requestedFileIds).size) {
      throw appError("CONFLICT", {
        message: "Custom print hanya boleh mengikat file upload yang siap diverifikasi.",
      });
    }

    const id = randomUUID();
    const referenceNumber = await createUniqueHumanReference({
      exists: (candidate) => repository.referenceExists(candidate),
      prefix: "CPR",
      randomBytes: this.randomBytes,
    });
    const accessToken = issueAccessToken({
      entityId: id,
      randomBytes: this.randomBytes,
      scope: "CUSTOM_PRINT_REQUEST",
    });
    const request = await repository.create({
      ...parsed,
      fileIds: [...uploadReadyFileIds],
      id,
      publicTokenHash: accessToken.tokenHash,
      referenceNumber,
    });

    await recordAudit(this.audit, {
      action: "custom-print.request.submitted",
      actorType: "SYSTEM",
      afterJson: { referenceNumber },
      entityId: request.id,
      entityType: "CustomPrintRequest",
      metadata: { operation: "submit", referenceNumber },
    });

    if (this.notification !== undefined) {
      try {
        await this.notification({
          referenceNumber: request.referenceNumber,
          requestId: request.id,
        });
      } catch {
        try {
          await recordAudit(this.audit, {
            action: "custom-print.request.notification.failed",
            actorType: "SYSTEM",
            afterJson: { status: "NOT_SENT" },
            entityId: request.id,
            entityType: "CustomPrintRequest",
            metadata: { operation: "notification", result: "FAILED" },
          });
        } catch {
          // A committed custom request remains successful while notification
          // and its auxiliary audit trail are retried operationally.
        }
      }
    }

    return { accessToken, request };
  }

  async recordReview(input: unknown) {
    const parsed = parseWithValidation(customPrintReviewInputSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "CUSTOM_PRINT_REVIEW");
    const repository = this.repositoryFactory();
    const request = await repository.findRequestForReview(parsed.requestId);

    if (request === null) {
      throw appError("NOT_FOUND");
    }

    if (request.status !== "SUBMITTED" && request.status !== "UNDER_REVIEW") {
      throw appError("CONFLICT", {
        message: "Review hanya dapat dicatat sebelum quote siap.",
      });
    }

    if (parsed.quantity !== request.quantity) {
      throw appError("VALIDATION_ERROR", {
        details: { quantity: "Quantity review harus sama dengan request." },
      });
    }

    if (request.status === "SUBMITTED") {
      await this.persistStatus(repository, request.id, "SUBMITTED", "UNDER_REVIEW", admin);
    }

    const review: CustomPrintReviewInput = {
      configurationJson: parsed.configurationJson,
      materialCode: parsed.materialCode,
      notes: parsed.notes,
      printDurationSeconds: parsed.printDurationSeconds,
      quantity: parsed.quantity,
      requestId: parsed.requestId,
      reviewedAt: new Date(),
      reviewedByAdminId: admin.profile.id,
      verifiedWeightG: new Decimal(parsed.verifiedWeightG),
    };

    await repository.saveReview(review);
    await this.persistStatus(repository, request.id, "UNDER_REVIEW", "QUOTE_READY", admin);

    await recordAudit(this.audit, {
      action: "custom-print.review.completed",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: {
        materialCode: parsed.materialCode,
        printDurationSeconds: parsed.printDurationSeconds,
        quantity: parsed.quantity,
        verifiedWeightG: parsed.verifiedWeightG,
      },
      entityId: request.id,
      entityType: "CustomPrintReview",
    });

    return review;
  }

  private async persistStatus(
    repository: CustomPrintServiceRepository,
    requestId: string,
    current: CustomPrintRequestStatus,
    next: CustomPrintRequestStatus,
    admin: AdminAccess,
  ): Promise<void> {
    const transitionAudit =
      this.audit === undefined
        ? undefined
        : createTransitionAuditRecorder(this.audit, {
            actorId: admin.profile.id,
            actorType: "ADMIN",
          });
    await transitionCustomPrintRequest({
      audit: transitionAudit,
      current,
      entityId: requestId,
      next,
    });
    const updated = await repository.updateStatusIfCurrent(requestId, current, next);

    if (updated === null) {
      throw appError("CONFLICT", {
        message: "Status custom request berubah sebelum operasi selesai.",
      });
    }

    await recordAudit(this.audit, {
      action: "custom-print.request.status.transition",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { status: next },
      beforeJson: { status: current },
      entityId: requestId,
      entityType: "CustomPrintRequest",
      metadata: { result: "ALLOWED" },
    });
  }
}
