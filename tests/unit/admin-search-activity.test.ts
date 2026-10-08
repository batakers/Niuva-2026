import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { AdminGlobalSearchService, parseAdminSearchQuery } from "@/modules/admin/global-search";
import { AdminActivityTimelineService } from "@/modules/admin/activity-timeline";

const access = (role: "OWNER" | "ADMIN"): AdminAccess => ({ authUserId: "fixture", profile: { id: "fixture", role, isActive: true } });

describe("Admin global search", () => {
  it("limits terms and keeps Owner-only menus out of Admin results", async () => {
    expect(parseAdminSearchQuery(" ")).toBeNull();
    expect(parseAdminSearchQuery("  order  ")).toBe("order");
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { order: { findMany }, b2BInquiry: { findMany }, customPrintRequest: { findMany }, product: { findMany: vi.fn().mockResolvedValue([]) }, invoice: { findMany: vi.fn().mockResolvedValue([]) }, customer: { findMany: vi.fn().mockResolvedValue([]) }, portfolioProject: { findMany: vi.fn().mockResolvedValue([]) } } as unknown as PrismaClient;
    const service = new AdminGlobalSearchService(prisma);
    await expect(service.search(access("ADMIN"), "a")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((await service.search(access("ADMIN"), "admin")).some(item => item.href === "/admin/admins")).toBe(false);
    expect((await service.search(access("OWNER"), "admin")).some(item => item.href === "/admin/admins")).toBe(true);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ accountClosedAt: null }), take: 5 }));
  });

  it("returns only safe display fields and detail routes", async () => {
    const prisma = {
      order: { findMany: vi.fn().mockResolvedValue([{ id: "order-id", orderNumber: "ORD-123", customerName: "Nadia" }]) },
      b2BInquiry: { findMany: vi.fn().mockResolvedValue([]) },
      customPrintRequest: { findMany: vi.fn().mockResolvedValue([]) },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      invoice: { findMany: vi.fn().mockResolvedValue([]) }, customer: { findMany: vi.fn().mockResolvedValue([]) }, portfolioProject: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;
    const result = await new AdminGlobalSearchService(prisma).search(access("ADMIN"), "ORD-123");
    expect(result).toContainEqual({ kind: "ORDER", title: "ORD-123", detail: "Nadia", href: "/admin/orders/order-id" });
    expect(JSON.stringify(result)).not.toContain("customerEmail");
  });

  it("finds catalog and portfolio records and excludes retired menus", async () => {
    const empty = { findMany: vi.fn().mockResolvedValue([]) };
    const prisma = { order: empty, b2BInquiry: empty, customPrintRequest: empty,
      product: { findMany: vi.fn().mockResolvedValue([{ id: "product-id", name: "Fixture Print", slug: "fixture-print" }]) },
      invoice: { findMany: vi.fn().mockResolvedValue([]) }, customer: { findMany: vi.fn().mockResolvedValue([]) }, portfolioProject: { findMany: vi.fn().mockResolvedValue([{ id: "portfolio-id", title: "Fixture Project", serviceLabel: "Prototype" }]) },
    } as unknown as PrismaClient;
    const service = new AdminGlobalSearchService(prisma);
    const results = await service.search(access("ADMIN"), "Fixture");
    expect(results).toContainEqual({ kind: "PRODUCT", title: "Fixture Print", detail: "Produk · fixture-print", href: "/admin/products/product-id" });
    expect(results).toContainEqual({ kind: "PORTFOLIO", title: "Fixture Project", detail: "Prototype", href: "/admin/portfolio/portfolio-id" });
    expect((await service.search(access("OWNER"), "queue")).some(row => row.href === "/admin/queue")).toBe(false);
    expect((await service.search(access("OWNER"), "pricing")).some(row => row.href === "/admin/pricing")).toBe(false);
  });
});

describe("Admin activity timeline", () => {
  it("filters Owner-only audit events for Admin and never exposes raw audit payloads", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "event-id", action: "order.status.transition", entityType: "Order", actorType: "ADMIN", createdAt: new Date("2026-10-07T12:00:00.000Z"), metadataJson: { secret: "do-not-show" } }]);
    const prisma = { auditLog: { findMany } } as unknown as PrismaClient;
    const service = new AdminActivityTimelineService(prisma);
    const result = await service.list(access("ADMIN"), 1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { NOT: { OR: expect.arrayContaining([{ entityType: { in: ["AdminProfile", "AdminInvitation", "CUSTOMER_PRIVACY_REQUEST"] } }]) } }, take: 31 }));
    expect(result.items[0]).toMatchObject({ title: "Status order diperbarui", group: "Orders", href: null });
    expect(JSON.stringify(result)).not.toContain("do-not-show");
    await service.list(access("OWNER"), 1);
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: undefined }));
  });
});
