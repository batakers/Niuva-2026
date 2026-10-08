import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { loadBillingSource } from "@/modules/finance/source";
import { ensureBillingCase, withFinanceTransaction } from "@/modules/finance/repository";
const prisma = getPrismaClient();
async function actor(): Promise<AdminAccess> { const profile = await prisma.adminProfile.create({ data: { role: "ADMIN", isActive: true } }); return { authUserId: randomUUID(), profile: { id: profile.id, role: "ADMIN", isActive: true } }; }
async function order() { return prisma.order.create({ data: { orderNumber: `FIN-${randomUUID()}`, orderType: "RETAIL", customerName: "Finance Fixture", customerEmail: "finance@example.test", customerPhone: "+62800000000", grandTotalRp: "100000", itemsSubtotalRp: "100000", shippingTotalRp: "0", publicTokenHash: randomUUID() } }); }
describe("finance persisted invariants", () => {
  it("reads authorized server source amounts and creates only one stable billing case", async () => {
    const access = await actor(), row = await order();
    const source = { kind: "ORDER_TOTAL" as const, orderId: row.id };
    expect(await loadBillingSource(access, source)).toMatchObject({ totalRp: "100000", buyer: { name: "Finance Fixture" }, needsReview: false });
    const cases = await Promise.all([1, 2].map(() => withFinanceTransaction(access, "FINANCE_WRITE", tx => ensureBillingCase(tx, source))));
    expect(cases[0].id).toBe(cases[1].id);
    await expect(prisma.billingCase.create({ data: { sourceKey: randomUUID(), kind: "ORDER_TOTAL", totalRp: "10" } })).rejects.toThrow();
    await expect(prisma.billingCase.update({ where: { id: cases[0].id }, data: { totalRp: "-1" } })).rejects.toThrow();
    await prisma.adminProfile.update({ where: { id: access.profile.id }, data: { isActive: false } });
    await expect(loadBillingSource(access, source)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("puts mismatched provider charges into review rather than guessing", async () => {
    const access = await actor(), row = await order();
    await prisma.paymentAttempt.create({ data: { orderId: row.id, purpose: "ORDER_TOTAL", providerOrderId: randomUUID(), amountRp: "90000", expiresAt: new Date(Date.now() + 60_000) } });
    expect(await loadBillingSource(access, { kind: "ORDER_TOTAL", orderId: row.id })).toMatchObject({ totalRp: "100000", needsReview: true });
  });
});
