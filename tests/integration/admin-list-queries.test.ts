import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getPrismaClient } from "@/lib/db/prisma";
import { AdminOperationsService } from "@/modules/admin/operations";
import type { AdminAccess } from "@/lib/auth/admin";

const prisma = getPrismaClient();
const prefix = `LIST-${randomUUID()}`;
const access: AdminAccess = { authUserId: "list-fixture", profile: { id: randomUUID(), authUserId: "list-fixture", role: "OWNER", isActive: true } };
const service = new AdminOperationsService({ prisma, authorize: async () => access });
beforeAll(async () => {
  await prisma.b2BInquiry.createMany({ data: Array.from({ length: 62 }, (_, index) => ({
    referenceNumber: `${prefix}-${String(index).padStart(3, "0")}`, publicTokenHash: `${prefix}-inq-${index}`, name: "Synthetic operator fixture", email: "list@example.test", phone: "081234567890", projectGoal: "Fixture", currentStage: "IDEA" as const, description: "Synthetic brief", targetQuantity: "1", confidentialityAck: true, status: index < 55 ? "NEW" as const : "QUALIFIED" as const,
  })) });
  await prisma.order.createMany({ data: [
    { orderNumber: `${prefix}-retail-paid`, publicTokenHash: `${prefix}-order-1`, orderType: "RETAIL", status: "PAID" },
    { orderNumber: `${prefix}-custom-paid`, publicTokenHash: `${prefix}-order-2`, orderType: "CUSTOM_PRINT", status: "PAID" },
    { orderNumber: `${prefix}-retail-pending`, publicTokenHash: `${prefix}-order-3`, orderType: "RETAIL", status: "PENDING_PAYMENT" },
  ].map(row => ({ ...row, orderType: row.orderType as "RETAIL" | "CUSTOM_PRINT", status: row.status as "PAID" | "PENDING_PAYMENT", customerName: "Synthetic fixture", customerEmail: "list@example.test", customerPhone: "081234567890", itemsSubtotalRp: "10000", shippingTotalRp: "0", grandTotalRp: "10000" })) });
  await prisma.product.createMany({ data: Array.from({ length: 68 }, (_, index) => ({ slug: `${prefix.toLowerCase()}-product-${index}`, name: `Synthetic product ${index}`, description: "Isolated query fixture", isPublished: index < 61 })) });
  await prisma.portfolioProject.createMany({ data: Array.from({ length: 3 }, (_, index) => ({ slug: `${prefix.toLowerCase()}-portfolio-${index}`, title: `Synthetic portfolio ${index}`, summary: "Isolated query fixture", challenge: "Fixture", process: "Fixture", result: "Fixture", serviceLabel: "Fixture", isPublished: index < 2 })) });
});
afterAll(async () => {
  await prisma.order.deleteMany({ where: { orderNumber: { startsWith: prefix } } });
  await prisma.b2BInquiry.deleteMany({ where: { referenceNumber: { startsWith: prefix } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: prefix.toLowerCase() } } });
  await prisma.portfolioProject.deleteMany({ where: { slug: { startsWith: prefix.toLowerCase() } } });
  await prisma.$disconnect();
});
describe("Admin server list query", () => {
  it("filters before pagination and counts a dataset above 50 rows", async () => {
    const first = await service.listInquiries({ q: prefix.toLowerCase(), status: "NEW" });
    const second = await service.listInquiries({ q: prefix, status: "NEW", page: 2 });
    expect(first.items).toHaveLength(50);
    expect(first.hasNext).toBe(true);
    expect(first.filteredTotal).toBe(55);
    expect(second.items).toHaveLength(5);
    expect(second.hasNext).toBe(false);
    expect(second.filteredTotal).toBe(55);
    expect(new Set([...first.items, ...second.items].map(row => row.id)).size).toBe(55);
    expect([...first.items, ...second.items].every(row => row.status === "NEW")).toBe(true);
  });
  it("combines order type and status, including valid empty combinations", async () => {
    const paid = await service.listOrders({ q: prefix, type: "RETAIL", status: "PAID" });
    expect(paid.filteredTotal).toBe(1);
    expect(paid.items.map(row => row.orderNumber)).toEqual([`${prefix}-retail-paid`]);
    const empty = await service.listOrders({ q: prefix, type: "CUSTOM_PRINT", status: "PENDING_PAYMENT" });
    expect(empty.filteredTotal).toBe(0);
    expect(empty.items).toEqual([]);
    expect(empty.hasNext).toBe(false);
  });
  it("filters management publication before pagination and searches names or slugs", async () => {
    const products = await service.listProducts({ q: prefix, publication: "published", page: 2 });
    expect(products.filteredTotal).toBe(61);
    expect(products.items).toHaveLength(11);
    expect(products.items.every(row => row.isPublished)).toBe(true);
    expect(products.hasNext).toBe(false);
    const drafts = await service.listProducts({ q: prefix, publication: "draft" });
    expect(drafts.filteredTotal).toBe(7);
    expect(drafts.items.every(row => !row.isPublished)).toBe(true);
    const projects = await service.listPortfolio({ q: prefix, publication: "published" });
    expect(projects.filteredTotal).toBe(2);
    expect(projects.items).toHaveLength(2);
    const named = await service.listPortfolio({ q: "Synthetic portfolio 2", publication: "draft" });
    expect(named.items.map(row => row.title)).toEqual(["Synthetic portfolio 2"]);
  });
});
