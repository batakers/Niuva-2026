import type { Prisma } from "../../generated/prisma/client";
import { lockCustomerLifecycle } from "../customer-privacy/lifecycle";
import { NIUVA_MVP_FILE_RETENTION } from "../policy/privacy";
import { appError } from "../shared/errors";
import type { FileRetentionDecision, FileRetentionFacts } from "./retention-core";

export class FileRetentionRepository {
  async page(tx: Prisma.TransactionClient, limit: number) {
    const state = await tx.operationalJobState.findUnique({ where: { name: "CUSTOMER_FILE_RETENTION" }, select: { fileRetentionCursorId: true } });
    const read = (cursorId?: string | null) => tx.storedFile.findMany({
      where: { bucketScope: "PRIVATE_CUSTOMER", purpose: "CUSTOMER_UPLOAD", uploadStatus: { not: "DELETED" } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: limit,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: { id: true },
    });
    const rows = await read(state?.fileRetentionCursorId);
    return rows.length === 0 && state?.fileRetentionCursorId ? read() : rows;
  }
  async cursor(tx: Prisma.TransactionClient, id: string | null) {
    await tx.operationalJobState.update({ where: { name: "CUSTOMER_FILE_RETENTION" }, data: { fileRetentionCursorId: id } });
  }
  async read(tx: Prisma.TransactionClient, id: string, lock: boolean) {
    if (lock) {
      await lockCustomerLifecycle(tx);
      const link = await tx.customPrintRequestFile.findUnique({ where: { fileId: id }, select: { requestId: true } });
      if (link) {
        await tx.$queryRaw`SELECT id FROM custom_print_requests WHERE id = ${link.requestId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT o.id FROM orders o WHERE EXISTS (
          SELECT 1 FROM order_items i JOIN custom_print_quotes q ON q.id = i.custom_quote_id
          WHERE i.order_id = o.id AND q.request_id = ${link.requestId}::uuid
        ) ORDER BY o.id FOR UPDATE`;
      }
      await tx.$queryRaw`SELECT id FROM stored_files WHERE id = ${id}::uuid FOR UPDATE`;
    }
    const row = await tx.storedFile.findUnique({ where: { id }, select: {
      id: true, storageKey: true, bucketScope: true, purpose: true, uploadStatus: true,
      createdAt: true, uploadedAt: true, verifiedAt: true, uploadedByCustomerId: true,
      retentionClass: true, retentionEligibleAt: true, retentionHoldOwnerId: true, retentionPrivacyHoldCaseIds: true,
      b2bInquiryLinks: { take: 1, select: { fileId: true } }, expenseProofs: { take: 1, select: { id: true } },
      customPrintRequestLinks: { select: { request: { select: {
        customerId: true, status: true, updatedAt: true,
        quotes: { select: { status: true, expiresAt: true, createdAt: true, sentAt: true, orderItems: { select: { order: { select: {
          id: true, status: true, completedAt: true, cancelledAt: true, updatedAt: true, paymentAttempts: { select: { status: true } },
        } } } } } },
      } } } },
    } });
    if (!row) return null;
    const request = row.customPrintRequestLinks[0]?.request;
    const customerIds = [row.uploadedByCustomerId, request?.customerId].filter((value): value is string => typeof value === "string");
    const privacyHolds = customerIds.length === 0 ? 0 : await tx.customerPrivacyRequest.count({ where: { customerId: { in: customerIds }, holdCategory: { not: null } } });
    const orders = [...new Map(request?.quotes.flatMap(quote => quote.orderItems.map(item => [item.order.id, item.order] as const))).values()];
    const facts: FileRetentionFacts = {
      ...row, hasFinancialOwner: row.expenseProofs.length > 0, hasHistoricalOwner: row.b2bInquiryLinks.length > 0,
      held: row.retentionHoldOwnerId !== null || row.retentionPrivacyHoldCaseIds.length > 0 || privacyHolds > 0,
      request: request ? { ...request, orders: orders.map(order => ({ ...order,
        pendingPayment: order.paymentAttempts.some(attempt => attempt.status === "PENDING"),
        settledPayment: order.paymentAttempts.some(attempt => attempt.status === "SETTLED"),
      })) } : null,
    };
    return { id: row.id, facts };
  }
  async claim(tx: Prisma.TransactionClient, id: string, decision: FileRetentionDecision, now: Date) {
    if (decision.state !== "due" || !decision.retentionClass || !decision.eligibleAt) throw appError("CONFLICT");
    const updated = await tx.storedFile.updateMany({
      where: { id, bucketScope: "PRIVATE_CUSTOMER", purpose: "CUSTOMER_UPLOAD", uploadStatus: { notIn: ["DELETE_PENDING", "DELETED"] } },
      data: { uploadStatus: "DELETE_PENDING", retentionClass: decision.retentionClass, retentionEligibleAt: decision.eligibleAt,
        retentionStartedAt: now, uploadTokenHash: null, uploadExpiresAt: null },
    });
    if (updated.count === 1) await this.audit(tx, id, "file.retention.requested", { policyId: NIUVA_MVP_FILE_RETENTION.id, retentionClass: decision.retentionClass, eligibleAt: decision.eligibleAt.toISOString() });
  }
  async attempted(tx: Prisma.TransactionClient, id: string) {
    await tx.storedFile.update({ where: { id, uploadStatus: "DELETE_PENDING" }, data: { retentionAttempts: { increment: 1 } } });
  }
  async completed(tx: Prisma.TransactionClient, id: string) {
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    await tx.storedFile.update({ where: { id, uploadStatus: "DELETE_PENDING" }, data: { uploadStatus: "DELETED", deletedAt: clock.now, retentionLastFailure: null } });
    await this.audit(tx, id, "file.retention.deleted", { policyId: NIUVA_MVP_FILE_RETENTION.id });
  }
  async failed(tx: Prisma.TransactionClient, id: string, unknown: boolean) {
    await tx.storedFile.update({ where: { id, uploadStatus: "DELETE_PENDING" }, data: { retentionLastFailure: unknown ? "STORAGE_OUTCOME_UNKNOWN" : "STORAGE_DELETE_FAILED" } });
  }
  private async audit(tx: Prisma.TransactionClient, id: string, action: string, metadataJson: Prisma.InputJsonObject) {
    await tx.auditLog.create({ data: { actorType: "SYSTEM", entityType: "StoredFile", entityId: id, action, metadataJson } });
  }
}

export async function fileRetentionBacklog(tx: Prisma.TransactionClient, now: Date) {
  const scope = { bucketScope: "PRIVATE_CUSTOMER" as const, purpose: "CUSTOMER_UPLOAD" as const };
  const pendingDeletion = await tx.storedFile.count({ where: { ...scope, uploadStatus: "DELETE_PENDING" } });
  const failedDeletion = await tx.storedFile.count({ where: { ...scope, uploadStatus: "DELETE_PENDING", retentionLastFailure: { not: null } } });
  const held = await tx.storedFile.count({ where: { ...scope, uploadStatus: { not: "DELETED" }, OR: [{ retentionHoldOwnerId: { not: null } }, { retentionPrivacyHoldCaseIds: { isEmpty: false } }] } });
  const [review] = await tx.$queryRaw<{ count: number }[]>`SELECT count(*)::int AS count FROM stored_files f
    WHERE f.bucket_scope = 'PRIVATE_CUSTOMER' AND f.purpose = 'CUSTOMER_UPLOAD' AND f.upload_status <> 'DELETED' AND (
      (f.retention_hold_owner_id IS NOT NULL AND f.retention_hold_review_at <= ${now}) OR EXISTS (
        SELECT 1 FROM unnest(f.retention_privacy_hold_case_ids) AS source(case_id)
        LEFT JOIN customer_privacy_requests p ON p.id = source.case_id
        WHERE p.id IS NULL OR p.hold_review_at IS NULL OR p.hold_review_at <= ${now}
      ))`;
  const overdueHolds = review.count;
  const oldest = await tx.storedFile.findFirst({ where: { ...scope, uploadStatus: "DELETE_PENDING" }, orderBy: { retentionStartedAt: "asc" }, select: { retentionStartedAt: true } });
  return { pendingDeletion, failedDeletion, held, overdueHolds, oldestPendingLagMs: oldest?.retentionStartedAt ? Math.max(0, now.getTime() - oldest.retentionStartedAt.getTime()) : 0 };
}
