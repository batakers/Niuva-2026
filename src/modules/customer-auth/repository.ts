import {
  Prisma,
  type Customer,
  type OrderStatus,
  type OrderType,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { lockCustomerLifecycle, assertFreshAccountIntent } from "@/modules/customer-privacy/lifecycle";

import type { CustomerGoogleIdentity } from "./core";
import { hashOpaqueToken } from "./core";
import { assertRecordedAgeDeclaration, type RecordedAgeDeclaration } from "./age-declaration";
import { assertInternalAccountActive, assertInternalEmail, internalExpiry, type InternalAuthConfig, INTERNAL_TERMS_VERSION, INTERNAL_PRIVACY_VERSION } from "./internal-testing";

export type InternalGoogleRegistration = Readonly<{ config: InternalAuthConfig; consentToken?: string }>;

export type CustomerProfile = Readonly<{
  id: string;
  email: string;
  normalizedEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
  internalTestExpiresAt?: Date | null;
}>;

export type CustomerOrder = Readonly<{
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  customerName: string;
  grandTotalRp: string;
  createdAt: Date;
}>;

export type CustomerAccount = Readonly<{
  profile: CustomerProfile;
  orders: readonly CustomerOrder[];
}>;

export type CustomerSessionCustomer = CustomerProfile;

export interface CustomerAuthRepositoryPort {
  findCustomerBySessionTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<CustomerSessionCustomer | null>;
  getAccount(customerId: string): Promise<CustomerAccount | null>;
  createSession(input: Readonly<{
    customerId: string;
    expiresAt: Date;
    tokenHash: string;
  }>): Promise<void>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  upsertGoogleCustomer(
    identity: CustomerGoogleIdentity,
    now: Date,
    allowCreate?: boolean,
    internal?: InternalGoogleRegistration,
    startedAt?: Date,
  ): Promise<CustomerProfile>;
}

function toCustomerProfile(customer: Pick<
  Customer,
  "id" | "email" | "normalizedEmail" | "displayName" | "avatarUrl"
> & { internalTestExpiresAt?: Date | null }): CustomerProfile {
  return {
    avatarUrl: customer.avatarUrl,
    displayName: customer.displayName,
    email: customer.email,
    id: customer.id,
    normalizedEmail: customer.normalizedEmail,
    ...(customer.internalTestExpiresAt ? { internalTestExpiresAt: customer.internalTestExpiresAt } : {}),
  };
}

export class CustomerAuthRepository implements CustomerAuthRepositoryPort {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async upsertGoogleCustomer(
    identity: CustomerGoogleIdentity,
    now: Date,
    allowCreate = true,
    internal?: InternalGoogleRegistration,
    startedAt = now,
  ): Promise<CustomerProfile> {
    return this.prisma.$transaction(async (transaction) => {
      await lockCustomerLifecycle(transaction);
      await assertFreshAccountIntent(transaction, identity.normalizedEmail, startedAt, identity.googleSubject);
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${identity.normalizedEmail}))`;
      const customerBySubject = await transaction.customer.findUnique({
        where: { googleSubject: identity.googleSubject },
      });
      const customerByEmail = await transaction.customer.findUnique({
        where: { normalizedEmail: identity.normalizedEmail },
      });
      assertInternalAccountActive(customerBySubject?.internalTestExpiresAt, now);
      assertInternalAccountActive(customerByEmail?.internalTestExpiresAt, now);

      if (
        customerBySubject !== null &&
        customerByEmail !== null &&
        customerBySubject.id !== customerByEmail.id
      ) {
        throw appError("CONFLICT");
      }

      if (
        customerBySubject !== null &&
        customerByEmail === null
      ) {
        const updated = await transaction.customer.update({
          where: { id: customerBySubject.id },
          data: {
            avatarUrl: identity.avatarUrl,
            displayName: identity.displayName,
            email: identity.email,
            lastLoginAt: now,
            normalizedEmail: identity.normalizedEmail,
          },
        });

        await this.linkUnownedOrders(transaction, updated.id, identity.normalizedEmail);
        return toCustomerProfile(updated);
      }

      if (customerBySubject !== null && customerByEmail !== null) {
        const updated = await transaction.customer.update({
          where: { id: customerBySubject.id },
          data: {
            avatarUrl: identity.avatarUrl,
            displayName: identity.displayName,
            email: identity.email,
            lastLoginAt: now,
          },
        });

        await this.linkUnownedOrders(transaction, updated.id, identity.normalizedEmail);
        return toCustomerProfile(updated);
      }

      if (customerByEmail !== null) {
        // A verified email cannot silently claim an existing Google identity.
        throw appError("CONFLICT");
      }

      if (!allowCreate || !internal) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
      let consent: ({ acceptedAt: Date; termsVersion: string; privacyVersion: string } & RecordedAgeDeclaration) | undefined;
      if (internal) {
        assertInternalEmail(identity.normalizedEmail, "google", internal.config);
        if (!internal.consentToken) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
        const proof = await transaction.customerInternalGoogleConsent.findUnique({ where: { tokenHash: hashOpaqueToken(internal.consentToken) } });
        if (!proof || proof.normalizedEmail !== identity.normalizedEmail || proof.expiresAt <= now || proof.consumedAt || proof.termsVersion !== INTERNAL_TERMS_VERSION || proof.privacyVersion !== INTERNAL_PRIVACY_VERSION) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
        assertRecordedAgeDeclaration(proof, now);
        const claimed = await transaction.customerInternalGoogleConsent.updateMany({ where: { tokenHash: proof.tokenHash, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
        if (claimed.count !== 1) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
        consent = proof;
      }
      const created = await transaction.customer.create({
        data: {
          avatarUrl: identity.avatarUrl,
          displayName: identity.displayName,
          email: identity.email,
          googleSubject: identity.googleSubject,
          emailVerifiedAt: now,
          lastLoginAt: now,
          normalizedEmail: identity.normalizedEmail,
          ...(internal ? { internalTestExpiresAt: internalExpiry(now), createdAt: now } : {}),
          ...(consent ? { consents: { create: { acceptedAt: consent.acceptedAt, termsVersion: consent.termsVersion, privacyVersion: consent.privacyVersion,
            ageDeclarationVersion: consent.ageDeclarationVersion, ageDeclaredAt: consent.ageDeclaredAt } } } : {}),
        },
      });

      await this.linkUnownedOrders(transaction, created.id, identity.normalizedEmail);
      return toCustomerProfile(created);
    });
  }

  async createSession(input: Readonly<{
    customerId: string;
    expiresAt: Date;
    tokenHash: string;
  }>): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw appError("UNAUTHORIZED");
      await tx.customerSession.create({
      data: {
        customerId: input.customerId,
        expiresAt: customer.internalTestExpiresAt && customer.internalTestExpiresAt < input.expiresAt ? customer.internalTestExpiresAt : input.expiresAt,
        tokenHash: input.tokenHash,
      },
      });
    });
  }

  async findCustomerBySessionTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<CustomerSessionCustomer | null> {
    const session = await this.prisma.customerSession.findFirst({
      where: {
        expiresAt: { gt: now },
        revokedAt: null,
        tokenHash,
        customer: { OR: [{ internalTestExpiresAt: null }, { internalTestExpiresAt: { gt: now } }] },
      },
      select: {
        customer: {
          select: {
            avatarUrl: true,
            displayName: true,
            email: true,
            id: true,
            normalizedEmail: true,
            internalTestExpiresAt: true,
          },
        },
      },
    });

    return session === null ? null : toCustomerProfile(session.customer);
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.prisma.customerSession.updateMany({
      where: { revokedAt: null, tokenHash },
      data: { revokedAt: now },
    });
  }

  async getAccount(customerId: string): Promise<CustomerAccount | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        avatarUrl: true,
        displayName: true,
        email: true,
        id: true,
        normalizedEmail: true,
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            customerName: true,
            grandTotalRp: true,
            id: true,
            orderNumber: true,
            orderType: true,
            status: true,
          },
        },
      },
    });

    if (customer === null) {
      return null;
    }

    return {
      orders: customer.orders.map((order) => ({
        createdAt: order.createdAt,
        customerName: order.customerName,
        grandTotalRp: order.grandTotalRp.toString(),
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
      })),
      profile: toCustomerProfile(customer),
    };
  }

  async getOrderForCustomer(customerId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: { id: true, orderNumber: true, orderType: true, status: true,
        createdAt: true, itemsSubtotalRp: true, shippingTotalRp: true, grandTotalRp: true,
        items: { select: { nameSnapshot: true, quantity: true, lineTotalRp: true } },
        paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1,
          select: { status: true, expiresAt: true, redirectUrl: true, amountRp: true } },
        shipments: { orderBy: { createdAt: "desc" }, take: 1,
          select: { status: true, courierCode: true, serviceCode: true, trackingNumber: true } },
      },
    });
  }

  private async linkUnownedOrders(
    transaction: Prisma.TransactionClient,
    customerId: string,
    normalizedEmail: string,
  ): Promise<void> {
    await transaction.$executeRaw`
      UPDATE "orders"
      SET "customer_id" = ${customerId}
      WHERE "customer_id" IS NULL
        AND "account_closed_at" IS NULL
        AND lower(btrim("customer_email")) = ${normalizedEmail}
    `;
  }
}
