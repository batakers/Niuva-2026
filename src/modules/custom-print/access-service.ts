import { z } from "zod";

import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { requireAdminPermission } from "@/modules/admin/permissions";
import {
  getRouteAccessTokenEntityId,
  hashAccessToken,
  issueAccessToken,
  verifyAccessToken,
  type IssuedAccessToken,
} from "@/modules/shared/access-token";
import { recordAudit, type AuditRecorder } from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import { isModelExtension } from "./file-types";
import { CustomPrintRequestRepository } from "./repository";

const appendModelSchema = z.object({
  fileId: z.uuid(),
  token: z.string().trim().min(32).max(512),
  unitConfirmation: z.enum([
    "MILLIMETER_CONFIRMED",
    "OTHER_UNIT_NOTED",
    "NEEDS_OPERATOR_HELP",
  ]).optional(),
});

type Repository = Pick<CustomPrintRequestRepository,
  "attachVerifiedModel" | "findForPublicAccess" | "rotatePublicToken">;

export class CustomPrintAccessService {
  constructor(private readonly dependencies: Readonly<{
    audit?: AuditRecorder;
    authorizeAdmin?: () => Promise<AdminAccess>;
    repository?: Repository;
  }> = {}) {}

  private get repository(): Repository {
    return this.dependencies.repository ?? new CustomPrintRequestRepository();
  }

  async getStatus(token: string) {
    const requestId = getRouteAccessTokenEntityId(token);
    if (requestId === null) throw appError("UNAUTHORIZED");
    const request = await this.repository.findForPublicAccess(requestId);
    if (request === null) throw appError("UNAUTHORIZED");
    verifyAccessToken({
      entityId: request.id,
      expectedHash: request.publicTokenHash,
      scope: "CUSTOM_PRINT_REQUEST",
      token,
    });

    const fileExtensions = request.files
      .filter(({ file }) => file.uploadStatus === "VERIFIED")
      .map(({ file }) => file.extension.toUpperCase());

    return {
      fileExtensions,
      intakeMode: request.intakeMode,
      modelReady: fileExtensions.some((extension) => isModelExtension(extension)),
      referenceNumber: request.referenceNumber,
      status: request.status,
    };
  }

  async appendModel(input: unknown) {
    const parsed = parseWithValidation(appendModelSchema, input);
    const requestId = getRouteAccessTokenEntityId(parsed.token);
    if (requestId === null) throw appError("UNAUTHORIZED");
    await this.getStatus(parsed.token);
    await this.repository.attachVerifiedModel({
      currentTokenHash: hashAccessToken({
        entityId: requestId,
        scope: "CUSTOM_PRINT_REQUEST",
        token: parsed.token,
      }),
      fileId: parsed.fileId,
      requestId,
      unitConfirmation: parsed.unitConfirmation,
    });
    await recordAudit(this.dependencies.audit, {
      action: "custom-print.request.model-attached",
      actorType: "SYSTEM",
      afterJson: { status: "VERIFIED" },
      entityId: requestId,
      entityType: "CustomPrintRequest",
      metadata: { operation: "append-model" },
    });
    return { referenceNumber: (await this.getStatus(parsed.token)).referenceNumber };
  }

  async reissuePublicToken(requestIdInput: unknown): Promise<IssuedAccessToken> {
    const requestId = parseWithValidation(z.uuid(), requestIdInput);
    const admin = await (this.dependencies.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(admin, "CUSTOM_PRINT_REVIEW");
    const request = await this.repository.findForPublicAccess(requestId);
    if (request === null) throw appError("NOT_FOUND");
    const accessToken = issueAccessToken({
      entityId: requestId,
      includeEntityId: true,
      scope: "CUSTOM_PRINT_REQUEST",
    });
    const rotated = await this.repository.rotatePublicToken({
      currentHash: request.publicTokenHash,
      nextHash: accessToken.tokenHash,
      requestId,
    });
    if (!rotated) throw appError("CONFLICT");
    await recordAudit(this.dependencies.audit, {
      action: "custom-print.request.token-reissued",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { status: "REISSUED" },
      entityId: requestId,
      entityType: "CustomPrintRequest",
      metadata: { operation: "reissue-token" },
    });
    return accessToken;
  }
}
