import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { PrismaAnalyticsRepository } from "@/modules/analytics/repository";
import { AnalyticsService } from "@/modules/analytics/service";
import { reportWindow } from "@/modules/analytics/contract";
import { GET as retentionGet } from "@/app/api/analytics/retention/route";

const prisma = getPrismaClient();
const repository = new PrismaAnalyticsRepository(prisma);
const now = new Date("2026-09-30T17:10:00.000Z");

async function clean(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE "analytics_daily_page_views", "orders", "custom_print_requests", "b2b_inquiries"
    RESTART IDENTITY CASCADE
  `;
}

beforeEach(clean);
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe("analytics aggregate PostgreSQL", () => {
  it("menaikkan hitungan atomik pada hit serentak dan membaca kedua range", async () => {
    const payload = { routeGroup: "home", source: "direct", landing: true } as const;
    await Promise.all(Array.from({ length: 25 }, () => repository.increment(payload, "desktop", "ID", now)));
    const rows = await prisma.analyticsDailyPageView.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ routeGroup: "home", viewCount: 25, country: "ID" });
    expect(rows[0]?.day.toISOString()).toBe("2026-10-01T00:00:00.000Z");

    const service = new AnalyticsService(repository, () => now);
    const daily = await service.load("30d");
    const monthly = await service.load("13m");
    expect(daily.traffic?.pageViews).toBe(25);
    expect(daily.traffic?.points.at(-1)?.pageViews).toBe(25);
    expect(monthly.traffic?.pageViews).toBe(25);
    expect(monthly.traffic?.points.at(-1)?.pageViews).toBe(25);
  });

  it("mencocokkan tiga hasil bisnis dengan record dan menghitung paidAt setelah status lanjut", async () => {
    const createdAt = new Date("2026-09-30T17:01:00.000Z");
    await prisma.b2BInquiry.create({ data: {
      referenceNumber: "BRF-ANALYTICS-1", name: "Fixture", email: "fixture@example.test",
      phone: "+628000000000", projectGoal: "Fixture", currentStage: "IDEA",
      description: "Fixture", targetQuantity: "1", confidentialityAck: true,
      publicTokenHash: "analytics-brief", createdAt, status: "CONTACTED",
    } });
    await prisma.customPrintRequest.create({ data: {
      referenceNumber: "CP-ANALYTICS-1", customerName: "Fixture",
      customerEmail: "fixture@example.test", customerPhone: "+628000000000",
      materialRequested: "PLA", quantity: 1, publicTokenHash: "analytics-custom",
      createdAt, status: "UNDER_REVIEW",
    } });
    await prisma.order.create({ data: {
      orderNumber: "ORD-ANALYTICS-1", orderType: "RETAIL", status: "PROCESSING",
      customerName: "Fixture", customerEmail: "fixture@example.test",
      customerPhone: "+628000000000", itemsSubtotalRp: 0,
      shippingTotalRp: 0, grandTotalRp: 0, publicTokenHash: "analytics-order",
      createdAt: new Date("2026-08-01T00:00:00.000Z"), paidAt: createdAt,
    } });
    const report = await new AnalyticsService(repository, () => now).load("30d");
    expect(report.business).toMatchObject({ briefs: 1, customPrint: 1, paidOrders: 1 });
    expect(report.business?.points.at(-1)).toMatchObject({ briefs: 1, customPrint: 1, paidOrders: 1 });
    expect(await prisma.b2BInquiry.count()).toBe(report.business?.briefs);
    expect(await prisma.customPrintRequest.count()).toBe(report.business?.customPrint);
    expect(await prisma.order.count({ where: { paidAt: { gte: reportWindow("30d", now).start } } })).toBe(report.business?.paidOrders);
  });

  it("menghapus hanya agregat di luar 13 bulan kalender", async () => {
    await repository.increment({ routeGroup: "home", source: "direct", landing: true }, "desktop", "ZZ", new Date("2025-09-30T16:00:00.000Z"));
    await repository.increment({ routeGroup: "home", source: "direct", landing: true }, "desktop", "ZZ", new Date("2025-09-30T17:00:00.000Z"));
    expect(await new AnalyticsService(repository, () => now).deleteExpired()).toBe(1);
    const rows = await prisma.analyticsDailyPageView.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.day.toISOString()).toBe("2025-10-01T00:00:00.000Z");
  });

  it("menjalankan cron retensi melalui bearer pada database test", async () => {
    vi.stubEnv("CRON_SECRET", "test-only-cron-secret");
    await repository.increment(
      { routeGroup: "home", source: "direct", landing: true },
      "desktop", "ZZ", new Date("2024-01-01T00:00:00.000Z"),
    );
    const response = await retentionGet(new Request("http://localhost/api/analytics/retention", {
      headers: { authorization: "Bearer test-only-cron-secret" },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 1 });
    expect(await prisma.analyticsDailyPageView.count()).toBe(0);
  });
});
