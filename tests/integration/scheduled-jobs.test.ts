import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { operationalJobFixture } from "../helpers/operational-job-fixture";
import { CatalogRepository } from "@/modules/catalog/repository";
import { InventoryReservationJobRunner } from "@/modules/inventory/reservation-job";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { createJobHandlers } from "@/modules/jobs/handlers";
import { JobRunner } from "@/modules/jobs/runner";
import type { JobLease } from "@/modules/jobs/core";

let f: Awaited<ReturnType<typeof operationalJobFixture>>;
const rows: { productId: string; variantId: string; orderId: string; reservationId: string }[] = [];
const policy = { leaseMs: 60_000, minIntervalMs: 0, failureCooldownMs: 1000 };
const job = "INVENTORY_RESERVATIONS" as const;
beforeAll(async () => { f = await operationalJobFixture(); });
afterEach(async () => {
  const orderIds = rows.map(r => r.orderId), variantIds = rows.map(r => r.variantId);
  await f.admin.paymentAttempt.deleteMany({ where: { orderId: { in: orderIds } } });
  await f.admin.stockReservation.deleteMany({ where: { orderId: { in: orderIds } } });
  await f.admin.order.deleteMany({ where: { id: { in: orderIds } } });
  await f.admin.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
  await f.admin.productVariant.deleteMany({ where: { id: { in: variantIds } } });
  await f.admin.product.deleteMany({ where: { id: { in: rows.map(r => r.productId) } } });
  await f.admin.auditLog.deleteMany({ where: { entityId: { in: rows.flatMap(r => [r.productId, r.variantId, r.reservationId, r.orderId]) } } });
  await f.admin.operationalJobState.deleteMany();
  rows.length = 0;
});
afterAll(async () => { await f?.dispose(); });
const runtime = () => createOperationalJobRuntime({ prisma: f.client, source: f.source });
async function fixture() {
  const suffix = randomUUID();
  const product = await f.admin.product.create({ data: { name: "Expiry fixture", slug: "expiry-" + suffix, description: "Synthetic" } });
  const variant = await new CatalogRepository(f.admin).createVariant({ productId: product.id, sku: "EXP-" + suffix, name: "Fixture", priceRp: "10000", weightGrams: "10", stockOnHand: 5, isActive: true });
  const order = await f.admin.order.create({ data: { customerEmail: "fixture@example.test", customerName: "Fixture", customerPhone: "+628000000000", grandTotalRp: "10000", itemsSubtotalRp: "10000", shippingTotalRp: "0", orderType: "RETAIL", orderNumber: "EXP-" + suffix, publicTokenHash: suffix } });
  const reservation = await f.admin.stockReservation.create({ data: { orderId: order.id, variantId: variant.id, quantity: 1, expiresAt: new Date(Date.now() - 60_000) } });
  rows.push({ productId: product.id, variantId: variant.id, orderId: order.id, reservationId: reservation.id });
  return { variant, order, reservation };
}
describe("HTTP and CLI share canonical operational job state", () => {
  it("honors the same active lease and cooldown without touching legacy state", async () => {
    const repo = new PrismaJobRepository();
    const claim = await f.bound.run("job", tx => repo.claim(tx, job, policy));
    if (claim.state !== "claimed") throw new Error("Fixture lease not acquired");
    const endpoint = new InventoryReservationJobRunner({ runtime: runtime() });
    await expect(endpoint.run({ mode: "execute", limit: 1, jobPolicy: policy })).resolves.toMatchObject({ state: "busy" });
    const stale = { ...claim.lease, id: randomUUID() };
    expect(await f.bound.run("job", tx => repo.finalize(tx, stale, { counts: {} }, policy))).toBe(false);
    expect(await f.bound.run("job", tx => repo.finalize(tx, claim.lease, { counts: {} }, { ...policy, minIntervalMs: 60_000 }))).toBe(true);
    await expect(endpoint.run({ mode: "execute", limit: 1, jobPolicy: policy })).resolves.toMatchObject({ state: "cooldown" });
    expect(await f.admin.operationalJobState.count()).toBe(1);
    expect(await f.admin.scheduledJobState.count()).toBe(0);
  });
  it("dry-runs without writes then expires, cancels and releases atomically and repeatably", async () => {
    const { variant, order, reservation } = await fixture();
    const attempt = await f.admin.paymentAttempt.create({ data: { orderId: order.id, amountRp: "10000", providerOrderId: randomUUID(), purpose: "ORDER_TOTAL", createdAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() - 1000) } });
    const endpoint = new InventoryReservationJobRunner({ runtime: runtime() });
    await expect(endpoint.run({ mode: "dry-run", limit: 1, jobPolicy: policy })).resolves.toMatchObject({ state: "completed", counts: { released: 0, remainingDue: 1 } });
    expect(await f.admin.operationalJobState.count()).toBe(0);
    expect((await f.admin.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("ACTIVE");
    await expect(endpoint.run({ mode: "execute", limit: 1, jobPolicy: policy })).resolves.toMatchObject({ state: "completed", counts: { released: 1, remainingDue: 0 } });
    expect((await f.admin.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).status).toBe("EXPIRED");
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect((await f.admin.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("RELEASED");
    expect((await f.admin.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand).toBe(5);
    expect(await f.admin.auditLog.count({ where: { entityId: reservation.id, action: "state.transition" } })).toBe(1);
    await expect(runtime().run({ job, mode: "execute", limit: 1 }, policy)).resolves.toMatchObject({ counts: { released: 0 } });
    expect((await endpoint.status({ maxLagMs: 1000 })).inventory).toEqual({ remainingDue: 0, lagMs: 0 });
  });
  it("does not release a reservation with a settled payment", async () => {
    const { order, reservation } = await fixture();
    await f.admin.paymentAttempt.create({ data: { orderId: order.id, amountRp: "10000", providerOrderId: randomUUID(), purpose: "ORDER_TOTAL", createdAt: new Date(Date.now() - 60_000), status: "SETTLED", settledAt: new Date(), expiresAt: new Date(Date.now() - 1000) } });
    await expect(runtime().run({ job, mode: "execute", limit: 1 }, policy)).resolves.toMatchObject({ counts: { released: 0 } });
    expect((await f.admin.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("ACTIVE");
  });
  it("rolls back stock, order and audit if the final lease check fails", async () => {
    const { order, reservation } = await fixture();
    class ExpiringRepository extends PrismaJobRepository {
      private checks = 0;
      override async verifyLease(tx: Prisma.TransactionClient, lease: JobLease): Promise<Date> {
        if (++this.checks === 2) await tx.operationalJobState.update({ where: { name: job }, data: { leaseExpiresAt: new Date(0) } });
        return super.verifyLease(tx, lease);
      }
    }
    const runner = new JobRunner({ bound: f.bound, expectedRole: f.role, repository: new ExpiringRepository(), policy, handlers: createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source }) });
    await expect(runner.run({ job, mode: "execute", limit: 1 })).resolves.toMatchObject({ state: "failed" });
    expect((await f.admin.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
    expect((await f.admin.stockReservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("ACTIVE");
    expect(await f.admin.auditLog.count({ where: { entityId: reservation.id } })).toBe(0);
  });
});
