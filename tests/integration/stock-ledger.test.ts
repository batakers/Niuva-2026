import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPrismaClient } from "@/lib/db/prisma";
import { AdminOperationsService } from "@/modules/admin/operations";
import { CatalogRepository } from "@/modules/catalog/repository";
import { catalogSeedSchema, seedCatalog } from "@/modules/catalog/seed";
import { seedLocalDemoCatalog } from "@/modules/demo/seed";
import { InventoryRepository } from "@/modules/inventory/repository";

const prisma = getPrismaClient();
const catalog = new CatalogRepository(prisma);
const inventory = new InventoryRepository(prisma);

async function clean(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE "audit_logs", "stock_movements", "stock_reservations",
      "order_items", "orders", "product_variants", "products", "categories", "admin_profiles"
    RESTART IDENTITY CASCADE
  `;
}

beforeEach(clean);
afterAll(async () => { await clean(); await prisma.$disconnect(); });

async function fixture() {
  const admin = await prisma.adminProfile.create({
    data: { clerkUserId: `ledger-admin-${crypto.randomUUID()}`, displayName: "Operator", isActive: true },
  });
  const product = await prisma.product.create({
    data: { description: "Fixture ledger", name: "Fixture ledger", slug: `ledger-${crypto.randomUUID()}` },
  });
  const variant = await catalog.createVariant({
    isActive: true,
    name: "Varian pertama",
    priceRp: "10000",
    productId: product.id,
    sku: `LEDGER-${crypto.randomUUID()}`,
    stockOnHand: 5,
    weightGrams: "10",
  }, admin.id);
  return { admin, product, variant };
}

async function orderFixture(variantId: string, quantity: number, expiresAt = new Date(Date.now() + 3_600_000)) {
  const order = await prisma.order.create({
    data: {
      customerEmail: "fixture@example.test",
      customerName: "Fixture",
      customerPhone: "+628000000000",
      grandTotalRp: "10000",
      itemsSubtotalRp: "10000",
      orderNumber: `ORD-${crypto.randomUUID()}`,
      orderType: "RETAIL",
      publicTokenHash: crypto.randomUUID(),
      shippingTotalRp: "0",
    },
  });
  const reservation = await prisma.stockReservation.create({
    data: { expiresAt, orderId: order.id, quantity, variantId },
  });
  return { order, reservation };
}

describe("expired stock reservations", () => {
  it("releases expired reservations in bounded, repeatable batches", async () => {
    const { variant } = await fixture();
    const now = new Date("2026-10-18T10:00:00.000Z");
    const expiresAt = new Date(now.getTime() - 1_000);
    const fixtures = await Promise.all([
      orderFixture(variant.id, 1, expiresAt),
      orderFixture(variant.id, 1, expiresAt),
      orderFixture(variant.id, 1, expiresAt),
    ]);

    const firstBatch = await inventory.releaseExpired(undefined, now, 2);
    expect(firstBatch).toHaveLength(2);
    await expect(prisma.stockReservation.count({ where: { status: "ACTIVE" } })).resolves.toBe(1);

    const secondBatch = await inventory.releaseExpired(undefined, now, 2);
    expect(secondBatch).toHaveLength(1);
    await expect(inventory.releaseExpired(undefined, now, 2)).resolves.toHaveLength(0);
    await expect(prisma.stockReservation.findMany({ where: { id: { in: fixtures.map(({ reservation }) => reservation.id) } } }))
      .resolves.toMatchObject(fixtures.map(() => ({ status: "RELEASED" })));
    await expect(prisma.order.findMany({ where: { id: { in: fixtures.map(({ order }) => order.id) } } }))
      .resolves.toMatchObject(fixtures.map(() => ({ status: "CANCELLED" })));
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({ stockOnHand: 5 });
  });

  it("expires due payment attempts and cancels the unpaid order with its reservation", async () => {
    const { variant } = await fixture();
    const reservationExpiresAt = new Date(Date.now() - 1_000);
    const paymentExpiresAt = new Date(Date.now() + 30_000);
    const { order, reservation } = await orderFixture(variant.id, 1, reservationExpiresAt);
    const attempt = await prisma.paymentAttempt.create({
      data: {
        amountRp: "10000",
        expiresAt: paymentExpiresAt,
        orderId: order.id,
        providerOrderId: `pending-${crypto.randomUUID()}`,
        purpose: "ORDER_TOTAL",
      },
    });

    await expect(inventory.releaseExpired(undefined, new Date(paymentExpiresAt.getTime() + 1), 10)).resolves.toHaveLength(1);
    await expect(prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } }))
      .resolves.toMatchObject({ status: "EXPIRED" });
    await expect(prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
      .resolves.toMatchObject({ status: "CANCELLED" });
    await expect(prisma.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } }))
      .resolves.toMatchObject({ status: "RELEASED" });
  });

  it("waits to cancel or release while a pending provider attempt is still payable", async () => {
    const { variant } = await fixture();
    const now = new Date();
    const { order, reservation } = await orderFixture(variant.id, 1, new Date(now.getTime() - 1_000));
    const attempt = await prisma.paymentAttempt.create({
      data: {
        amountRp: "10000",
        expiresAt: new Date(Date.now() + 60_000),
        orderId: order.id,
        providerOrderId: `pending-${crypto.randomUUID()}`,
        purpose: "ORDER_TOTAL",
      },
    });

    await expect(inventory.releaseExpired(undefined, now, 10)).resolves.toHaveLength(0);
    await expect(prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } }))
      .resolves.toMatchObject({ status: "PENDING" });
    await expect(prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
      .resolves.toMatchObject({ status: "PENDING_PAYMENT" });
    await expect(prisma.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } }))
      .resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("does not release an expired reservation for a paid order", async () => {
    const { variant } = await fixture();
    const now = new Date("2026-10-18T10:00:00.000Z");
    const { order, reservation } = await orderFixture(variant.id, 1, new Date(now.getTime() - 1_000));
    await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    await prisma.paymentAttempt.create({
      data: {
        amountRp: "10000",
        expiresAt: new Date(Date.now() + 60_000),
        orderId: order.id,
        providerOrderId: `settled-${crypto.randomUUID()}`,
        purpose: "ORDER_TOTAL",
        settledAt: now,
        status: "SETTLED",
      },
    });

    await expect(inventory.releaseExpired(undefined, now, 10)).resolves.toHaveLength(0);
    await expect(prisma.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } }))
      .resolves.toMatchObject({ status: "ACTIVE" });
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } }))
      .resolves.toMatchObject({ stockOnHand: 5 });
  });
});

describe("stock movement ledger", () => {
  it("records opening, manual adjustment and consumption with a reconciled balance", async () => {
    const { admin, product, variant } = await fixture();
    await expect(prisma.stockMovement.findMany({ where: { variantId: variant.id } })).resolves.toMatchObject([
      { kind: "OPENING_BALANCE", delta: 5, balanceBefore: 0, balanceAfter: 5, adminId: admin.id },
    ]);
    await expect(prisma.auditLog.count({ where: { entityId: variant.id, action: "catalog.variant.created" } })).resolves.toBe(1);

    await catalog.updateStock(variant.id, {
      adminId: admin.id,
      expectedStockOnHand: 5,
      reason: "Barang diterima",
      stockOnHand: 8,
    });
    await expect(prisma.auditLog.count({ where: { entityId: variant.id, action: "catalog.stock.adjusted" } })).resolves.toBe(1);
    const { reservation } = await orderFixture(variant.id, 7);
    await expect(catalog.updateStock(variant.id, {
      adminId: admin.id, expectedStockOnHand: 8, reason: "Hitung ulang", stockOnHand: 6,
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await inventory.transition(reservation.id, "CONSUMED");
    await inventory.transition(reservation.id, "CONSUMED");

    const movements = await prisma.stockMovement.findMany({
      where: { variantId: variant.id }, orderBy: { createdAt: "asc" },
    });
    expect(movements.map(({ kind, delta, balanceBefore, balanceAfter }) => ({ kind, delta, balanceBefore, balanceAfter }))).toEqual([
      { kind: "OPENING_BALANCE", delta: 5, balanceBefore: 0, balanceAfter: 5 },
      { kind: "MANUAL_ADJUSTMENT", delta: 3, balanceBefore: 5, balanceAfter: 8 },
      { kind: "ORDER_CONSUMPTION", delta: -7, balanceBefore: 8, balanceAfter: 1 },
    ]);
    expect(movements.reduce((sum, movement) => sum + movement.delta, 0)).toBe(1);
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({ stockOnHand: 1 });
    expect(movements[2]?.reservationId).toBe(reservation.id);
    const operations = new AdminOperationsService({
      authorize: async () => ({ authUserId: admin.id, profile: admin }),
      prisma,
    });
    const history = await operations.getStockHistory(product.id, variant.id);
    expect(history?.variant).toMatchObject({ stockOnHand: 1, reserved: 0, available: 1 });
    expect(history?.movements).toHaveLength(3);
    expect(history?.movements[0]).toMatchObject({ kind: "ORDER_CONSUMPTION", orderId: reservation.orderId });
    await expect(operations.getStockHistory(crypto.randomUUID(), variant.id)).resolves.toBeNull();
    const disabled = new AdminOperationsService({
      authorize: async () => ({ authUserId: admin.id, profile: { ...admin, isActive: false } }),
      prisma,
    });
    await expect(disabled.getStockHistory(product.id, variant.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects stale, equal, invalid and failed-ledger adjustments without changing stock", async () => {
    const { admin, variant } = await fixture();
    const input = { adminId: admin.id, expectedStockOnHand: 5, reason: "Koreksi", stockOnHand: 8 };
    await expect(catalog.updateStock(variant.id, { ...input, expectedStockOnHand: 4 })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(catalog.updateStock(variant.id, { ...input, stockOnHand: 5 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(catalog.updateStock(variant.id, { ...input, reason: "" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(catalog.updateStock(variant.id, { ...input, stockOnHand: -1 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(catalog.updateStock(variant.id, { ...input, adminId: "99999999-9999-4999-9999-999999999999" })).rejects.toThrow();
    await expect(prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).resolves.toMatchObject({ stockOnHand: 5 });
    await expect(prisma.stockMovement.count({ where: { variantId: variant.id } })).resolves.toBe(1);
    await expect(prisma.auditLog.count({ where: { entityId: variant.id, action: "catalog.stock.adjusted" } })).resolves.toBe(0);
  });

  it("serializes two admins editing from the same displayed balance", async () => {
    const { admin, variant } = await fixture();
    const otherAdmin = await prisma.adminProfile.create({
      data: { clerkUserId: `ledger-admin-${crypto.randomUUID()}`, displayName: "Operator kedua", isActive: true },
    });
    const attempts = await Promise.allSettled([
      catalog.updateStock(variant.id, { adminId: admin.id, expectedStockOnHand: 5, reason: "Satu", stockOnHand: 6 }),
      catalog.updateStock(variant.id, { adminId: otherAdmin.id, expectedStockOnHand: 5, reason: "Dua", stockOnHand: 7 }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    await expect(prisma.stockMovement.count({ where: { variantId: variant.id } })).resolves.toBe(2);
    const current = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    const last = await prisma.stockMovement.findFirstOrThrow({ where: { variantId: variant.id }, orderBy: { createdAt: "desc" } });
    expect(last.balanceAfter).toBe(current.stockOnHand);
    expect(last.adminId).toBe(current.stockOnHand === 6 ? admin.id : otherAdmin.id);
  });

  it("tracks repeated catalog and demo imports only when the stored balance changes", async () => {
    const seed = catalogSeedSchema.parse({
      version: 1,
      products: [{
        slug: "seeded-ledger",
        name: "Seeded ledger",
        description: "Fixture",
        variants: [{ sku: "SEEDED-LEDGER", name: "Satu", priceRp: "10000", stockOnHand: 4, weightGrams: "10" }],
      }],
    });
    await seedCatalog(prisma, seed);
    await seedCatalog(prisma, seed);
    await expect(prisma.stockMovement.count({ where: { variant: { sku: "SEEDED-LEDGER" } } })).resolves.toBe(1);
    await seedCatalog(prisma, {
      ...seed,
      products: seed.products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({ ...variant, stockOnHand: 6 })),
      })),
    });
    const movements = await prisma.stockMovement.findMany({ where: { variant: { sku: "SEEDED-LEDGER" } }, orderBy: { createdAt: "asc" } });
    expect(movements.map(({ kind, delta }) => ({ kind, delta }))).toEqual([
      { kind: "OPENING_BALANCE", delta: 4 }, { kind: "CATALOG_IMPORT", delta: 2 },
    ]);

    const demo = await seedLocalDemoCatalog(prisma);
    await seedLocalDemoCatalog(prisma);
    await expect(prisma.stockMovement.count({ where: { variantId: demo.variantId } })).resolves.toBe(1);
  });

  it("paginates the private history without changing the current balance", async () => {
    const { admin, product, variant } = await fixture();
    for (let balance = 5; balance < 56; balance += 1) {
      await catalog.updateStock(variant.id, {
        adminId: admin.id,
        expectedStockOnHand: balance,
        reason: `Penyesuaian ${balance}`,
        stockOnHand: balance + 1,
      });
    }
    const operations = new AdminOperationsService({
      authorize: async () => ({ authUserId: admin.id, profile: admin }),
      prisma,
    });
    const first = await operations.getStockHistory(product.id, variant.id, { page: 1 });
    const second = await operations.getStockHistory(product.id, variant.id, { page: 2 });
    expect(first?.movements).toHaveLength(50);
    expect(first?.hasNext).toBe(true);
    expect(second?.movements).toHaveLength(2);
    expect(second?.hasNext).toBe(false);
    expect(first?.variant.stockOnHand).toBe(56);
  });
});
