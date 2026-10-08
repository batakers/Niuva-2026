import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getPrismaClient } from "@/lib/db/prisma";
import { loadBillingSource } from "@/modules/finance/source";
import { ensureBillingCase, withFinanceTransaction } from "@/modules/finance/repository";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
const prisma = getPrismaClient();
describe("finance customer closure", () => {
  it("detaches legitimate relations, redacts buyer snapshots and blocks closed source reads", async () => {
    const profile = await prisma.adminProfile.create({ data: { role: "OWNER", isActive: true } });
    const access = { authUserId: randomUUID(), profile: { id: profile.id, role: "OWNER" as const, isActive: true } };
    const email = `financial-privacy-${randomUUID()}@example.test`;
    const customer = await prisma.customer.create({ data: { email, normalizedEmail: email } });
    const order = await prisma.order.create({ data: { customerId: customer.id, customerEmail: email, customerName: "Private Fixture", customerPhone: "+628000000", orderNumber: randomUUID(), orderType: "RETAIL", itemsSubtotalRp: "100", shippingTotalRp: "0", grandTotalRp: "100", publicTokenHash: randomUUID() } });
    const source = { kind: "ORDER_TOTAL" as const, orderId: order.id };
    const billing = await withFinanceTransaction(access, "FINANCE_WRITE", tx => ensureBillingCase(tx, source));
    const invoice = await prisma.invoice.create({ data: { billingCaseId: billing.id, revision: 1, buyerJson: { name: "Private Fixture", email }, createdByAdminId: profile.id, idempotencyKey: randomUUID() } });
    await prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, customer.id, new Date()); });
    expect(await prisma.billingCase.findUnique({ where: { id: billing.id } })).toMatchObject({ customerId: null, totalRp: expect.objectContaining({}) });
    expect((await prisma.billingCase.findUnique({ where: { id: billing.id } }))?.accountClosedAt).not.toBeNull();
    expect((await prisma.invoice.findUnique({ where: { id: invoice.id } }))?.buyerJson).toBeNull();
    await expect(loadBillingSource(access, source)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const recreated = await prisma.customer.create({ data: { email, normalizedEmail: email } });
    expect(await prisma.billingCase.count({ where: { customerId: recreated.id } })).toBe(0);
  });
});
