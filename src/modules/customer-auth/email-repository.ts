import type { PrismaClient, CustomerPendingRegistration } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { hashOpaqueToken } from "./core";
import { lockCustomerLifecycle, assertFreshAccountIntent } from "@/modules/customer-privacy/lifecycle";
import { assertInternalAccountActive, assertInternalEmail, internalExpiry, capInternalExpiry, INTERNAL_TERMS_VERSION, INTERNAL_PRIVACY_VERSION } from "./internal-testing";

export class CustomerEmailRepository {
  constructor(readonly prisma: PrismaClient = getPrismaClient()) {}
  async limit(key: string, limit: number, windowMs: number, now: Date): Promise<void> {
    const rows = await this.prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO customer_auth_rate_limits (key, count, reset_at) VALUES (${key}, 1, ${new Date(now.getTime() + windowMs)})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN customer_auth_rate_limits.reset_at <= ${now} THEN 1 ELSE customer_auth_rate_limits.count + 1 END,
        reset_at = CASE WHEN customer_auth_rate_limits.reset_at <= ${now} THEN ${new Date(now.getTime() + windowMs)} ELSE customer_auth_rate_limits.reset_at END
      RETURNING count`;
    if (rows[0].count > limit) throw appError("RATE_LIMITED");
  }
  findCredential(email: string) {
    return this.prisma.customer.findUnique({ where: { normalizedEmail: email }, include: { passwordCredential: true } });
  }
  findPending(handle: string, now: Date) {
    return this.prisma.customerPendingRegistration.findFirst({ where: { handleHash: hashOpaqueToken(handle), completedAt: null, expiresAt: { gt: now }, OR: [{ internalTestExpiresAt: null }, { internalTestExpiresAt: { gt: now } }] } });
  }
  async createPending(data: Omit<CustomerPendingRegistration, "id" | "sentAt" | "completedAt" | "deliveryConfirmed" | "internalTestExpiresAt"> & { internalTestExpiresAt?: Date | null }) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      await assertFreshAccountIntent(tx, data.normalizedEmail, data.consentAt);
      return tx.customerPendingRegistration.create({ data });
    });
  }
  async deliveryDeadline(owner: { pendingId?: string; customerId?: string }, now: Date): Promise<Date | null> {
    const record = owner.pendingId
      ? await this.prisma.customerPendingRegistration.findUnique({ where: { id: owner.pendingId } })
      : owner.customerId ? await this.prisma.customer.findUnique({ where: { id: owner.customerId } }) : null;
    if (!record) throw appError("VALIDATION_ERROR");
    assertInternalAccountActive(record.internalTestExpiresAt, now);
    if (record.internalTestExpiresAt) assertInternalEmail(record.email, "password");
    return record.internalTestExpiresAt;
  }
  async issueToken(input: { tokenHash: string; purpose: "verify" | "reset"; customerId?: string; pendingId?: string; expiresAt: Date; returnTo: string }, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      // Serialize issue/consume operations for a single destination across workers.
      const key = input.pendingId ?? input.customerId ?? "";
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      if (input.pendingId) {
        const pending = await tx.customerPendingRegistration.findUnique({ where: { id: input.pendingId } });
        if (!pending || pending.completedAt || pending.expiresAt <= now) throw appError("VALIDATION_ERROR");
        assertInternalAccountActive(pending.internalTestExpiresAt, now);
        if (pending.internalTestExpiresAt) assertInternalEmail(pending.email, "password");
        input.expiresAt = capInternalExpiry(input.expiresAt, pending.internalTestExpiresAt);
        if (pending.sentAt && now.getTime() - pending.sentAt.getTime() < 60000) throw appError("RATE_LIMITED");
        // Reserve resend cooldown before contacting the provider.
        await tx.customerPendingRegistration.update({ where: { id: pending.id }, data: { sentAt: now, deliveryConfirmed: false, expiresAt: input.expiresAt } });
      }
      if (input.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
        if (!customer) throw appError("VALIDATION_ERROR");
        assertInternalAccountActive(customer.internalTestExpiresAt, now);
        if (customer.internalTestExpiresAt) assertInternalEmail(customer.email, "password");
        input.expiresAt = capInternalExpiry(input.expiresAt, customer.internalTestExpiresAt);
      }
      await tx.customerEmailToken.updateMany({ where: { purpose: input.purpose, ...(input.pendingId ? { pendingId: input.pendingId } : { customerId: input.customerId }), consumedAt: null }, data: { consumedAt: now } });
      return tx.customerEmailToken.create({ data: input });
    });
  }
  async markDeliveryFailed(tokenId: string, pendingId?: string) {
    await this.prisma.$transaction(async tx => {
      await tx.customerEmailToken.update({ where: { id: tokenId }, data: { consumedAt: new Date() } });
      if (pendingId) await tx.customerPendingRegistration.update({ where: { id: pendingId }, data: { sentAt: null, deliveryConfirmed: false } });
    });
  }
  async confirmDelivery(pendingId: string) {
    await this.prisma.customerPendingRegistration.update({ where: { id: pendingId }, data: { deliveryConfirmed: true } });
  }
  findToken(token: string, purpose: string, now: Date) {
    return this.prisma.customerEmailToken.findFirst({ where: { tokenHash: hashOpaqueToken(token), purpose, consumedAt: null, expiresAt: { gt: now }, AND: [
      { OR: [{ customerId: null }, { customer: { OR: [{ internalTestExpiresAt: null }, { internalTestExpiresAt: { gt: now } }] } }] },
      { OR: [{ pendingId: null }, { pending: { OR: [{ internalTestExpiresAt: null }, { internalTestExpiresAt: { gt: now } }] } }] },
    ] }, include: { customer: { select: { normalizedEmail: true } } } });
  }
  async consumeVerification(token: string, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      const record = await tx.customerEmailToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
      if (!record?.pendingId || record.purpose !== "verify") throw appError("VALIDATION_ERROR");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${record.pendingId}))`;
      const claimed = await tx.customerEmailToken.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      const pending = await tx.customerPendingRegistration.findUnique({ where: { id: record.pendingId } });
      if (!claimed.count || !pending || pending.completedAt || pending.expiresAt <= now) throw appError("VALIDATION_ERROR");
      await assertFreshAccountIntent(tx, pending.normalizedEmail, pending.consentAt);
      assertInternalAccountActive(pending.internalTestExpiresAt, now);
      if (pending.internalTestExpiresAt) {
        assertInternalEmail(pending.email, "password");
        if (pending.termsVersion !== INTERNAL_TERMS_VERSION || pending.privacyVersion !== INTERNAL_PRIVACY_VERSION) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
      }
      if (await tx.customer.findUnique({ where: { normalizedEmail: pending.normalizedEmail } })) throw appError("CONFLICT");
      const customer = await tx.customer.create({ data: { email: pending.email, normalizedEmail: pending.normalizedEmail, displayName: pending.displayName, emailVerifiedAt: now,
        ...(pending.internalTestExpiresAt ? { internalTestExpiresAt: internalExpiry(now), createdAt: now } : {}),
        passwordCredential: { create: { passwordHash: pending.passwordHash } },
        consents: { create: { termsVersion: pending.termsVersion, privacyVersion: pending.privacyVersion, acceptedAt: pending.consentAt } } } });
      await tx.customerPendingRegistration.update({ where: { id: pending.id }, data: { completedAt: now } });
      await tx.$executeRaw`UPDATE orders SET customer_id = ${customer.id} WHERE customer_id IS NULL AND account_closed_at IS NULL AND lower(btrim(customer_email)) = ${pending.normalizedEmail}`;
      return record.returnTo;
    });
  }
  async createPasswordSession(input: { customerId: string; expectedHash: string; tokenHash: string; expiresAt: Date }, now: Date) {
    await this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.customerId}))`;
      const current = await tx.customerPasswordCredential.findUnique({ where: { customerId: input.customerId } });
      if (current?.passwordHash !== input.expectedHash) throw appError("UNAUTHORIZED");
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw appError("UNAUTHORIZED");
      assertInternalAccountActive(customer.internalTestExpiresAt, now);
      input.expiresAt = capInternalExpiry(input.expiresAt, customer.internalTestExpiresAt);
      await tx.customerSession.create({ data: { customerId: input.customerId, tokenHash: input.tokenHash, expiresAt: input.expiresAt } });
      await tx.customer.update({ where: { id: input.customerId }, data: { lastLoginAt: now } });
    });
  }
  async consumeReset(token: string, passwordHash: string, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      const record = await tx.customerEmailToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
      if (!record?.customerId || record.purpose !== "reset") throw appError("VALIDATION_ERROR");
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${record.customerId}))`;
      const claimed = await tx.customerEmailToken.updateMany({ where: { id: record.id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (!claimed.count) throw appError("VALIDATION_ERROR");
      const customer = await tx.customer.findUnique({ where: { id: record.customerId } });
      if (!customer) throw appError("VALIDATION_ERROR");
      assertInternalAccountActive(customer.internalTestExpiresAt, now);
      if (customer.internalTestExpiresAt) assertInternalEmail(customer.email, "password");
      await tx.customerPasswordCredential.update({ where: { customerId: record.customerId }, data: { passwordHash } });
      await tx.customerSession.updateMany({ where: { customerId: record.customerId, revokedAt: null }, data: { revokedAt: now } });
      return record.returnTo;
    });
  }
}
