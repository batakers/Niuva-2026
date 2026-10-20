import { z } from "zod";
import type { PrismaClient } from "../../generated/prisma/client";
import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "../admin/permissions";
import { lockCustomerLifecycle } from "../customer-privacy/lifecycle";
import { appError } from "../shared/errors";
import { parseWithValidation } from "../shared/validation";

const inputSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("hold"), fileId: z.uuid(), reason: z.string().trim().min(10).max(1000).refine(value => [...value].length >= 10), reviewAt: z.iso.datetime({ offset: true }) }),
  z.strictObject({ operation: z.literal("release"), fileId: z.uuid() }),
]);

/** Review dates raise alarms; they never release a binary-file hold automatically. */
export class FileRetentionHoldService {
  constructor(private readonly options: { prisma?: PrismaClient; authorizeAdmin?: () => Promise<AdminAccess> } = {}) {}
  async change(raw: unknown): Promise<{ status: "held" | "released" }> {
    const input = parseWithValidation(inputSchema, raw);
    const access = await (this.options.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(access, "PRIVACY_REQUEST_MANAGE");
    return (this.options.prisma ?? getPrismaClient()).$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      await tx.$queryRaw`SELECT id FROM stored_files WHERE id = ${input.fileId}::uuid FOR UPDATE`;
      const owner = await tx.adminProfile.findFirst({ where: { id: access.profile.id, role: "OWNER", isActive: true } });
      if (!owner) throw appError("FORBIDDEN");
      const file = await tx.storedFile.findFirst({ where: { id: input.fileId, purpose: "CUSTOMER_UPLOAD", bucketScope: "PRIVATE_CUSTOMER", uploadStatus: { not: "DELETED" } } });
      if (!file) throw appError("NOT_FOUND");
      if (input.operation === "release" && file.retentionPrivacyHoldCaseIds.length > 0
        && await tx.customerPrivacyRequest.count({ where: { id: { in: file.retentionPrivacyHoldCaseIds }, holdCategory: { not: null } } }) > 0) throw appError("CONFLICT");
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      if (input.operation === "hold" && new Date(input.reviewAt) <= clock.now) throw appError("VALIDATION_ERROR");
      await tx.storedFile.update({ where: { id: file.id }, data: input.operation === "hold"
        ? { retentionHoldReason: input.reason, retentionHoldOwnerId: owner.id, retentionHoldReviewAt: new Date(input.reviewAt) }
        : { retentionHoldReason: null, retentionHoldOwnerId: null, retentionHoldReviewAt: null, retentionPrivacyHoldCaseIds: [] } });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: owner.id, entityType: "StoredFile", entityId: file.id,
        action: input.operation === "hold" ? "file.retention.held" : "file.retention.released", metadataJson: { operation: input.operation } } });
      return { status: input.operation === "hold" ? "held" : "released" };
    });
  }
}
