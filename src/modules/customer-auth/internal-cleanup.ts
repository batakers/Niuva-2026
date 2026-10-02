import type { PrismaClient } from "@/generated/prisma/client";
import { lockCustomerLifecycle, eraseCustomerAccount } from "../customer-privacy/lifecycle";

export class InternalAuthCleanupRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async cleanup(now: Date, dryRun: boolean) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-internal-auth-cleanup'))`;
      const customers = { internalTestExpiresAt: { lte: now } };
      const pending = { internalTestExpiresAt: { lte: now } };
      const proofs = { expiresAt: { lte: now } };
      const counts = { customers: await tx.customer.count({ where: customers }), pending: await tx.customerPendingRegistration.count({ where: pending }), consentProofs: await tx.customerInternalGoogleConsent.count({ where: proofs }) };
      if (!dryRun) {
        // Auth relations cascade; work/order/file relations use SET NULL.
        for (const customer of await tx.customer.findMany({ where: customers, select: { id: true } })) await eraseCustomerAccount(tx, customer.id, now);
        await tx.customerPendingRegistration.deleteMany({ where: pending });
        await tx.customerInternalGoogleConsent.deleteMany({ where: proofs });
        await tx.customerAuthRateLimit.deleteMany({ where: { resetAt: { lte: now } } });
      }
      return { dryRun, ...counts };
    });
  }
}
