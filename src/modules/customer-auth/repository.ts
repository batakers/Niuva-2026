import {
  Prisma,
  type Customer,
  type OrderStatus,
  type OrderType,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";

import type { CustomerGoogleIdentity } from "./core";

export type CustomerProfile = Readonly<{
  id: string;
  email: string;
  normalizedEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
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
  ): Promise<CustomerProfile>;
}

function toCustomerProfile(customer: Pick<
  Customer,
  "id" | "email" | "normalizedEmail" | "displayName" | "avatarUrl"
>): CustomerProfile {
  return {
    avatarUrl: customer.avatarUrl,
    displayName: customer.displayName,
    email: customer.email,
    id: customer.id,
    normalizedEmail: customer.normalizedEmail,
  };
}

export class CustomerAuthRepository implements CustomerAuthRepositoryPort {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async upsertGoogleCustomer(
    identity: CustomerGoogleIdentity,
    now: Date,
  ): Promise<CustomerProfile> {
    return this.prisma.$transaction(async (transaction) => {
      const customerBySubject = await transaction.customer.findUnique({
        where: { googleSubject: identity.googleSubject },
      });
      const customerByEmail = await transaction.customer.findUnique({
        where: { normalizedEmail: identity.normalizedEmail },
      });

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

      const created = await transaction.customer.create({
        data: {
          avatarUrl: identity.avatarUrl,
          displayName: identity.displayName,
          email: identity.email,
          googleSubject: identity.googleSubject,
          lastLoginAt: now,
          normalizedEmail: identity.normalizedEmail,
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
    await this.prisma.customerSession.create({
      data: {
        customerId: input.customerId,
        expiresAt: input.expiresAt,
        tokenHash: input.tokenHash,
      },
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
      },
      select: {
        customer: {
          select: {
            avatarUrl: true,
            displayName: true,
            email: true,
            id: true,
            normalizedEmail: true,
          },
        },
      },
    });

    return session === null ? null : session.customer;
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

  private async linkUnownedOrders(
    transaction: Prisma.TransactionClient,
    customerId: string,
    normalizedEmail: string,
  ): Promise<void> {
    await transaction.$executeRaw`
      UPDATE "orders"
      SET "customer_id" = ${customerId}
      WHERE "customer_id" IS NULL
        AND lower(btrim("customer_email")) = ${normalizedEmail}
    `;
  }
}
