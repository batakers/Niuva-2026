import { describe, expect, it } from "vitest";
import { dashboardWindow, projectDashboard, type DashboardSource } from "@/modules/admin/dashboard";
import { PrismaDashboardRepository } from "@/modules/admin/dashboard-repository";
import { parseActionQueueGroup } from "@/modules/admin/action-queue";
import type { PrismaClient } from "@/generated/prisma/client";

const emptySource: DashboardSource = {
  newInquiries: 0,
  submittedCustomPrint: 0,
  paidOrders: 0,
  inquiryCreatedAt: [],
  customPrintCreatedAt: [],
  orderCreatedAt: [],
};

describe("Admin dashboard projection", () => {
  it("uses 30 Jakarta calendar days including today and fills quiet days with zero", () => {
    const now = new Date("2026-09-25T17:10:00.000Z"); // 26 September, 00:10 Jakarta
    const window = dashboardWindow(now);
    expect(window.start.toISOString()).toBe("2026-08-27T17:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-09-26T17:00:00.000Z");
    expect(window.dates).toHaveLength(30);
    expect(window.dates[0]).toBe("2026-08-28");
    expect(window.dates[29]).toBe("2026-09-26");

    const result = projectDashboard({
      ...emptySource,
      newInquiries: 7,
      submittedCustomPrint: 4,
      paidOrders: 2,
      inquiryCreatedAt: [new Date("2026-09-25T16:59:59.999Z"), new Date("2026-09-25T17:00:00.000Z")],
      customPrintCreatedAt: [new Date("2026-09-25T17:05:00.000Z")],
      orderCreatedAt: [new Date("2026-09-26T16:59:59.999Z")],
    }, now, window);

    expect(result.activity).toHaveLength(30);
    expect(result.activity[28]).toMatchObject({ date: "2026-09-25", inquiries: 1, customPrint: 0, orders: 0 });
    expect(result.activity[29]).toMatchObject({ date: "2026-09-26", inquiries: 1, customPrint: 1, orders: 1 });
    expect(result.activity[0]).toMatchObject({ inquiries: 0, customPrint: 0, orders: 0 });
    expect(result.newInquiries).toBe(7);
  });

  it("normalizes unsupported group input without accepting arrays or arbitrary strings", () => {
    expect(parseActionQueueGroup("custom-print")).toBe("custom-print");
    expect(parseActionQueueGroup("orders")).toBe("orders");
    expect(parseActionQueueGroup("invalid")).toBe("all");
    expect(parseActionQueueGroup(["orders", "inquiries"])).toBe("all");
  });

  it("reads only status counts and creation timestamps from the database", async () => {
    const calls: Array<{ model: string; action: string; args: unknown }> = [];
    const model = (name: string, count: number) => ({
      count: async (args: unknown) => { calls.push({ model: name, action: "count", args }); return count; },
      findMany: async (args: unknown) => { calls.push({ model: name, action: "findMany", args }); return [{ createdAt: new Date("2026-09-25T17:00:00.000Z") }]; },
    });
    const prisma = {
      b2BInquiry: model("inquiries", 7),
      customPrintRequest: model("custom", 4),
      order: model("orders", 2),
    } as unknown as PrismaClient;
    const window = dashboardWindow(new Date("2026-09-25T17:10:00.000Z"));

    const result = await new PrismaDashboardRepository(prisma).load(window);
    expect(result.newInquiries).toBe(7);
    expect(result.submittedCustomPrint).toBe(4);
    expect(result.paidOrders).toBe(2);
    expect(calls.filter((call) => call.action === "findMany")).toHaveLength(3);
    for (const call of calls.filter((entry) => entry.action === "findMany")) {
      expect(call.args).toEqual({
        where: { createdAt: { gte: window.start, lt: window.end } },
        select: { createdAt: true },
      });
    }
    expect(calls.filter((call) => call.action === "count").map((call) => call.args)).toEqual([
      { where: { status: "NEW" } },
      { where: { status: "SUBMITTED" } },
      { where: { status: "PAID" } },
    ]);
  });
});
