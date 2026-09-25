import { beforeEach, describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { parseGoogleIdentity } from "@/modules/customer-auth/core";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";

const prisma = getPrismaClient();
const repository = new CustomerAuthRepository(prisma);

async function cleanCustomerAuthTables(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE "customer_sessions", "orders", "customers"
    RESTART IDENTITY CASCADE
  `;
}

function identity(email: string, sub: string) {
  return parseGoogleIdentity({
    email,
    email_verified: true,
    name: "Customer Example",
    sub,
  });
}

async function createOrder(
  orderNumber: string,
  customerEmail: string,
  customerId?: string,
) {
  return prisma.order.create({
    data: {
      ...(customerId === undefined ? {} : { customerId }),
      customerEmail,
      customerName: "Order Customer",
      customerPhone: "+6281234567890",
      grandTotalRp: new Prisma.Decimal("100000"),
      id: crypto.randomUUID(),
      itemsSubtotalRp: new Prisma.Decimal("90000"),
      orderNumber,
      orderType: "RETAIL",
      publicTokenHash: orderNumber.padEnd(64, "x"),
      shippingTotalRp: new Prisma.Decimal("10000"),
    },
  });
}

beforeEach(cleanCustomerAuthTables);

describe("customer auth PostgreSQL boundary", () => {
  it("links only unowned normalized-email orders and does not leak another account's order", async () => {
    const otherCustomer = await repository.upsertGoogleCustomer(
      identity("other@example.com", "google-other"),
      new Date("2026-09-25T10:00:00.000Z"),
    );
    const matching = await createOrder("ORD-CUSTOMER-ONE", " Customer@Example.COM ");
    const unrelated = await createOrder("ORD-CUSTOMER-TWO", "another@example.com");
    const ownedByOther = await createOrder(
      "ORD-CUSTOMER-THREE",
      "customer@example.com",
      otherCustomer.id,
    );

    const customer = await repository.upsertGoogleCustomer(
      identity("customer@example.com", "google-customer"),
      new Date("2026-09-25T10:01:00.000Z"),
    );

    await expect(
      prisma.order.findUnique({ where: { id: matching.id } }),
    ).resolves.toMatchObject({ customerId: customer.id });
    await expect(
      prisma.order.findUnique({ where: { id: unrelated.id } }),
    ).resolves.toMatchObject({ customerId: null });
    await expect(
      prisma.order.findUnique({ where: { id: ownedByOther.id } }),
    ).resolves.toMatchObject({ customerId: otherCustomer.id });

    await expect(repository.getAccount(customer.id)).resolves.toMatchObject({
      orders: [expect.objectContaining({ id: matching.id })],
    });
  });

  it("fails identity/email conflicts without creating a second customer or linking orders", async () => {
    const existing = await repository.upsertGoogleCustomer(
      identity("customer@example.com", "google-existing"),
      new Date("2026-09-25T10:00:00.000Z"),
    );
    const order = await createOrder("ORD-CUSTOMER-CONFLICT", "customer@example.com");

    await expect(
      repository.upsertGoogleCustomer(
        identity("customer@example.com", "google-conflicting"),
        new Date("2026-09-25T10:01:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(prisma.customer.count()).resolves.toBe(1);
    await expect(
      prisma.order.findUnique({ where: { id: order.id } }),
    ).resolves.toMatchObject({ customerId: null });
    expect(existing.id).toBeDefined();
  });

  it("honors session expiry and revocation", async () => {
    const customer = await repository.upsertGoogleCustomer(
      identity("session@example.com", "google-session"),
      new Date("2026-09-25T10:00:00.000Z"),
    );
    const expiresAt = new Date("2026-09-25T11:00:00.000Z");

    await repository.createSession({
      customerId: customer.id,
      expiresAt,
      tokenHash: "session-hash-active",
    });
    await expect(
      repository.findCustomerBySessionTokenHash(
        "session-hash-active",
        new Date("2026-09-25T10:59:59.000Z"),
      ),
    ).resolves.toMatchObject({ id: customer.id });
    await expect(
      repository.findCustomerBySessionTokenHash(
        "session-hash-active",
        expiresAt,
      ),
    ).resolves.toBeNull();

    await repository.revokeSession("session-hash-active", new Date("2026-09-25T10:30:00.000Z"));
    await expect(
      repository.findCustomerBySessionTokenHash(
        "session-hash-active",
        new Date("2026-09-25T10:31:00.000Z"),
      ),
    ).resolves.toBeNull();
  });
});
