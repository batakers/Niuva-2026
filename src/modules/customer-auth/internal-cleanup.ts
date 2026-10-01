import type { PrismaClient } from "@/generated/prisma/client";

export class InternalAuthCleanupRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async cleanup(now: Date, dryRun: boolean) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-internal-auth-cleanup'))`;
      const customers = { internalTestExpiresAt: { lte: now } };
      const pending = { internalTestExpiresAt: { lte: now } };
      const proofs = { expiresAt: { lte: now } };
      const counts = { customers: await tx.customer.count({ where: customers }), pending: await tx.customerPendingRegistration.count({ where: pending }), consentProofs: await tx.customerInternalGoogleConsent.count({ where: proofs }) };
      if (!dryRun) {
        // Auth relations cascade; work/order/file relations use SET NULL.
        await tx.customer.deleteMany({ where: customers });
        await tx.customerPendingRegistration.deleteMany({ where: pending });
        await tx.customerInternalGoogleConsent.deleteMany({ where: proofs });
        await tx.customerAuthRateLimit.deleteMany({ where: { resetAt: { lte: now } } });
      }
      return { dryRun, ...counts };
    });
  }
}
