import type { PrismaClient } from "@/generated/prisma/client";
import { DAY_MS } from "./core";
import { lockCustomerLifecycle } from "./lifecycle";
export class CustomerPrivacyCleanupRepository {
  constructor(readonly prisma: PrismaClient) {}
  async cleanup(now: Date, dryRun: boolean) {
    return this.prisma.$transaction(async tx => {
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
      const counts = {
        caseContents: await tx.customerPrivacyRequest.count({ where: content }),
        caseReceipts: await tx.customerPrivacyRequest.count({ where: receipts }),
        activeHolds: await tx.customerPrivacyRequest.count({ where: { holdCategory: { not: null }, holdReviewAt: { gt: now } } }),
        overdueHolds: await tx.customerPrivacyRequest.count({ where: { holdCategory: { not: null }, holdReviewAt: { lte: now } } }),
        confirmations: await tx.customerPrivacyConfirmation.count({ where: proofs }),
        sessions: await tx.customerSession.count({ where: sessions }),
        emailTokens: await tx.customerEmailToken.count({ where: proofs }),
        internalGoogleConsents: await tx.customerInternalGoogleConsent.count({ where: proofs }),
        authRateLimits: await tx.customerAuthRateLimit.count({ where: { resetAt: { lte: now } } }),
        pendingRegistrations: await tx.customerPendingRegistration.count({ where: pending }),
        closureFences: await tx.customerClosureFence.count({ where: { expiresAt: { lte: now } } }),
        privacyAuditEvents: await tx.auditLog.count({ where: { entityType: "CUSTOMER_PRIVACY_REQUEST", createdAt: { lte: thirtyDaysAgo } } }),
      };
      if (!dryRun) {
        await tx.customerPrivacyRequest.updateMany({ where: content, data: { details: null, correction: null, response: null, contactEmail: null, handledBy: null, holdCategory: null, holdReason: null, holdOwnerId: null, holdReviewAt: null, contentPurgedAt: now } });
        await tx.customerPrivacyRequest.deleteMany({ where: receipts });
        await tx.customerPrivacyConfirmation.deleteMany({ where: proofs });
        await tx.customerSession.deleteMany({ where: sessions });
        await tx.customerEmailToken.deleteMany({ where: proofs });
        await tx.customerPendingRegistration.deleteMany({ where: pending });
        await tx.customerInternalGoogleConsent.deleteMany({ where: proofs });
        await tx.customerClosureFence.deleteMany({ where: { expiresAt: { lte: now } } });
        await tx.customerAuthRateLimit.deleteMany({ where: { resetAt: { lte: now } } });
        await tx.auditLog.deleteMany({ where: { entityType: "CUSTOMER_PRIVACY_REQUEST", createdAt: { lte: thirtyDaysAgo } } });
      }
      return { dryRun, ...counts };
    }, { timeout: 20000 });
  }
}
