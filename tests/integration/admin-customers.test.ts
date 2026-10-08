import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { CustomerDirectoryService } from "@/modules/customers/service";
import { eraseCustomerAccount } from "@/modules/customer-privacy/lifecycle";

const prisma = getPrismaClient();
const service = new CustomerDirectoryService();
const access: AdminAccess = { authUserId: "fixture", profile: { id: randomUUID(), role: "ADMIN", isActive: true } };
async function customer(email = `directory-${randomUUID()}@example.test`) { return prisma.customer.create({ data: { email, normalizedEmail: email, displayName: "Directory Fixture" } }); }
async function order(customerId: string | null, customerEmail: string, closed = false) {
  return prisma.order.create({ data: { customerId, customerEmail, customerName: "Directory Fixture", customerPhone: "+628000000000", orderNumber: `DIR-${randomUUID()}`, orderType: "RETAIL", grandTotalRp: "1000", itemsSubtotalRp: "1000", shippingTotalRp: "0", publicTokenHash: randomUUID(), accountClosedAt: closed ? new Date() : null } });
}

describe("legitimate customer directory", () => {
  it("counts and reads only linked open business rows, never matching by email", async () => {
    const a = await customer(), b = await customer();
    const linked = await order(a.id, a.email); await order(null, a.email); await order(a.id, a.email, true); await order(b.id, a.email);
    const result = await service.list(access, { q: a.email, page: 1 });
    expect(result.items).toMatchObject([{ id: a.id, orderCount: 1, customPrintCount: 0, inquiryCount: 0 }]);
    const detail = await service.detail(access, a.id);
    expect(detail).toMatchObject({ customer: { id: a.id }, orders: { items: [{ id: linked.id }] } });
    expect(JSON.stringify(detail)).not.toContain("publicTokenHash");
  });
  it("does not relink closed and recreated accounts with the same email", async () => {
    const a = await customer(); await order(a.id, a.email);
    await prisma.$transaction(tx => eraseCustomerAccount(tx, a.id, new Date()));
    expect(await service.detail(access, a.id)).toBeNull();
    const recreated = await customer(a.email);
    const detail = await service.detail(access, recreated.id);
    expect(detail).toMatchObject({ orders: { items: [] }, customPrint: { items: [] }, inquiries: { items: [] } });
  });
  it("denies inactive accounts and paginates twenty records with stable ordering", async () => {
    await expect(service.list({ ...access, profile: { ...access.profile, isActive: false } }, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    const prefix = `directory-page-${randomUUID()}`;
    for (let index = 0; index < 23; index++) await customer(`${prefix}-${index}@example.test`);
    const first = await service.list(access, { q: prefix, page: 1 }), second = await service.list(access, { q: prefix, page: 2 });
    expect(first.items).toHaveLength(20); expect(first.hasNext).toBe(true); expect(second.items).toHaveLength(3); expect(second.hasNext).toBe(false);
  });
});
