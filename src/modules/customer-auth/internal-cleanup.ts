import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { lockCustomerLifecycle, eraseCustomerAccount } from "../customer-privacy/lifecycle";

export class InternalAuthCleanupRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async cleanup(now: Date, dryRun: boolean) {
    return this.prisma.$transaction(tx => this.cleanupIn(tx, now, dryRun));
  }
  async cleanupIn(tx: Prisma.TransactionClient, now: Date, dryRun: boolean, limit?: number) {
      if (limit !== undefined) z.number().int().min(1).max(100).parse(limit);
      await lockCustomerLifecycle(tx);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-internal-auth-cleanup'))`;
      const customers = { internalTestExpiresAt: { lte: now } };
      const pending = { internalTestExpiresAt: { lte: now } };
      const proofs = { expiresAt: { lte: now } };
      const customerRows = await tx.customer.findMany({ where: customers, select: { id: true }, orderBy: { id: "asc" }, take: limit });
      const pendingRows = await tx.customerPendingRegistration.findMany({ where: pending, select: { id: true }, orderBy: { id: "asc" }, take: limit });
      const proofRows = await tx.customerInternalGoogleConsent.findMany({ where: proofs, select: { tokenHash: true }, orderBy: { tokenHash: "asc" }, take: limit });
      const rateRows = await tx.customerAuthRateLimit.findMany({ where: { resetAt: { lte: now } }, select: { key: true }, orderBy: { key: "asc" }, take: limit });
      const counts = { customers: customerRows.length, pending: pendingRows.length, consentProofs: proofRows.length };
      if (!dryRun) {
        // Auth relations cascade; work/order/file relations use SET NULL.
        for (const customer of customerRows) await eraseCustomerAccount(tx, customer.id, now);
        await tx.customerPendingRegistration.deleteMany({ where: { id: { in: pendingRows.map(row => row.id) } } });
        await tx.customerInternalGoogleConsent.deleteMany({ where: { tokenHash: { in: proofRows.map(row => row.tokenHash) } } });
        await tx.customerAuthRateLimit.deleteMany({ where: { key: { in: rateRows.map(row => row.key) } } });
      }
      return { dryRun, ...counts };
  }
}
