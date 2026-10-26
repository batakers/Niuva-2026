import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { DAY_MS } from "./core";
import { lockCustomerLifecycle } from "./lifecycle";
export class CustomerPrivacyCleanupRepository {
  constructor(readonly prisma: PrismaClient) {}
  async cleanup(now: Date, dryRun: boolean) {
    return this.prisma.$transaction(tx => this.cleanupIn(tx, now, dryRun), { timeout: 20000 });
  }
  async cleanupIn(tx: Prisma.TransactionClient, now: Date, dryRun: boolean, limit?: number) {
      if (limit !== undefined) z.number().int().min(1).max(100).parse(limit);
      await lockCustomerLifecycle(tx);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-customer-privacy-cleanup'))`;
      const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
      const noActiveHold = { OR: [{ holdCategory: null }, { holdReviewAt: { lte: now } }] };
      const content = { contentPurgedAt: null, contentDeleteAt: { lte: now }, ...noActiveHold };
      const receipts = { receiptDeleteAt: { lte: now }, ...noActiveHold };
      const proofs = { OR: [{ expiresAt: { lte: sevenDaysAgo } }, { consumedAt: { lte: sevenDaysAgo } }] };
      const sessions = { OR: [{ expiresAt: { lte: sevenDaysAgo } }, { revokedAt: { lte: sevenDaysAgo } }] };
      const pending = { OR: [{ expiresAt: { lte: sevenDaysAgo } }, { completedAt: { lte: sevenDaysAgo } }] };
      const selected = {
        contents: await tx.customerPrivacyRequest.findMany({ where: content, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
        receipts: await tx.customerPrivacyRequest.findMany({ where: receipts, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
        confirmations: await tx.customerPrivacyConfirmation.findMany({ where: proofs, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
        sessions: await tx.customerSession.findMany({ where: sessions, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
        emailTokens: await tx.customerEmailToken.findMany({ where: proofs, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
        consents: await tx.customerInternalGoogleConsent.findMany({ where: proofs, select: { tokenHash: true }, orderBy: { tokenHash: "asc" }, take: limit }),
        googleConsents: await tx.customerGoogleConsent.findMany({ where: proofs, select: { tokenHash: true }, orderBy: { tokenHash: "asc" }, take: limit }),
        rateLimits: await tx.customerAuthRateLimit.findMany({ where: { resetAt: { lte: now } }, select: { key: true }, orderBy: { key: "asc" }, take: limit }),
        pending: await tx.customerPendingRegistration.findMany({ where: pending, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
        fences: await tx.customerClosureFence.findMany({ where: { expiresAt: { lte: now } }, select: { identityHash: true }, orderBy: { identityHash: "asc" }, take: limit }),
        audits: await tx.auditLog.findMany({ where: { entityType: "CUSTOMER_PRIVACY_REQUEST", createdAt: { lte: thirtyDaysAgo } }, select: { id: true }, orderBy: { id: "asc" }, take: limit }),
      };
      const counts = {
        caseContents: selected.contents.length,
        caseReceipts: selected.receipts.length,
        activeHolds: await tx.customerPrivacyRequest.count({ where: { holdCategory: { not: null }, holdReviewAt: { gt: now } } }),
        overdueHolds: await tx.customerPrivacyRequest.count({ where: { holdCategory: { not: null }, holdReviewAt: { lte: now } } }),
        confirmations: selected.confirmations.length,
        sessions: selected.sessions.length,
        emailTokens: selected.emailTokens.length,
        internalGoogleConsents: selected.consents.length,
        googleConsents: selected.googleConsents.length,
        authRateLimits: selected.rateLimits.length,
        pendingRegistrations: selected.pending.length,
        closureFences: selected.fences.length,
        privacyAuditEvents: selected.audits.length,
      };
      if (!dryRun) {
        await tx.customerPrivacyRequest.updateMany({ where: { id: { in: selected.contents.map(row => row.id) } }, data: { details: null, correction: null, response: null, contactEmail: null, handledBy: null, holdCategory: null, holdReason: null, holdOwnerId: null, holdReviewAt: null, contentPurgedAt: now } });
        await tx.customerPrivacyRequest.deleteMany({ where: { id: { in: selected.receipts.map(row => row.id) } } });
        await tx.customerPrivacyConfirmation.deleteMany({ where: { id: { in: selected.confirmations.map(row => row.id) } } });
        await tx.customerSession.deleteMany({ where: { id: { in: selected.sessions.map(row => row.id) } } });
        await tx.customerEmailToken.deleteMany({ where: { id: { in: selected.emailTokens.map(row => row.id) } } });
        await tx.customerPendingRegistration.deleteMany({ where: { id: { in: selected.pending.map(row => row.id) } } });
        await tx.customerInternalGoogleConsent.deleteMany({ where: { tokenHash: { in: selected.consents.map(row => row.tokenHash) } } });
        await tx.customerGoogleConsent.deleteMany({ where: { tokenHash: { in: selected.googleConsents.map(row => row.tokenHash) } } });
        await tx.customerClosureFence.deleteMany({ where: { identityHash: { in: selected.fences.map(row => row.identityHash) } } });
        await tx.customerAuthRateLimit.deleteMany({ where: { key: { in: selected.rateLimits.map(row => row.key) } } });
        await tx.auditLog.deleteMany({ where: { id: { in: selected.audits.map(row => row.id) } } });
      }
      return { dryRun, ...counts };
  }
}
