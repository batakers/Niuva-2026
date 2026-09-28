import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyDevice, classifyPublicRoute, classifyReferrer, countryCode,
  pageViewSchema, parseReportRange, reportWindow,
} from "@/modules/analytics/contract";
import { projectBusiness, projectTraffic, AnalyticsService } from "@/modules/analytics/service";
import { handlePageView } from "@/app/api/analytics/page-view/route";
import { GET as retentionGet } from "@/app/api/analytics/retention/route";
import type { AnalyticsRepository } from "@/modules/analytics/repository";

afterEach(() => vi.unstubAllEnvs());

describe("kontrak pengukuran publik", () => {
  it("membatasi route publik dan menolak route privat/bertokennya", () => {
    expect(classifyPublicRoute("/")).toBe("home");
    expect(classifyPublicRoute("/shop/item-1")).toBe("product_detail");
    expect(classifyPublicRoute("/custom-print/request")).toBe("custom_request");
    for (const path of [
      "/admin", "/admin/queue", "/account", "/account/orders/1",
      "/checkout", "/cart", "/orders/token", "/quote/token",
      "/custom-print/requests/token", "/api/anything", "/demo/action-queue",
    ]) {
      expect(classifyPublicRoute(path)).toBeNull();
    }
  });

  it("mengirim hanya sumber kategori tanpa referrer mentah", () => {
    expect(classifyReferrer("", "https://niuva.id")).toBe("direct");
    expect(classifyReferrer("https://www.google.com/search?q=private", "https://niuva.id")).toBe("google");
    expect(classifyReferrer("https://www.google.co.id/search?q=private", "https://niuva.id")).toBe("google");
    expect(classifyReferrer("https://foo.google.evil/ref", "https://niuva.id")).toBe("other_referral");
    expect(classifyReferrer("https://niuva.id/account?token=private", "https://niuva.id")).toBe("internal");
    expect(classifyReferrer("https://unknown.example/page?token=private", "https://niuva.id")).toBe("other_referral");
    expect(pageViewSchema.safeParse({ routeGroup: "checkout", source: "direct", landing: true }).success).toBe(false);
    expect(pageViewSchema.safeParse({ routeGroup: "home", source: "direct", landing: true, url: "/?token=secret" }).success).toBe(false);
    expect(pageViewSchema.safeParse({ routeGroup: "home", source: "google", landing: false }).success).toBe(false);
    expect(classifyDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("mobile");
    expect(countryCode("id")).toBe("ID");
    expect(countryCode("Indonesia")).toBe("ZZ");
  });

  it("menghitung jendela Jakarta dan 13 bulan melewati batas hari", () => {
    const before = reportWindow("30d", new Date("2026-09-30T16:59:59.000Z"));
    const after = reportWindow("30d", new Date("2026-09-30T17:00:00.000Z"));
    expect(before.keys.at(-1)).toBe("2026-09-30");
    expect(after.keys.at(-1)).toBe("2026-10-01");
    expect(after.start.toISOString()).toBe("2026-09-01T17:00:00.000Z");
    const monthly = reportWindow("13m", new Date("2026-09-30T17:00:00.000Z"));
    expect(monthly.keys).toHaveLength(13);
    expect(monthly.firstDay).toBe("2025-10-01");
    expect(monthly.keys.at(-1)).toBe("2026-10");
    expect(parseReportRange(["13m"])).toBe("30d");
    expect(parseReportRange("bad")).toBe("30d");
  });

  it("menghitung bisnis menurut createdAt dan paidAt tanpa status order", () => {
    const window = reportWindow("30d", new Date("2026-09-30T17:00:00.000Z"));
    const business = projectBusiness({
      briefs: [new Date("2026-09-30T16:59:59.000Z"), new Date("2026-09-30T17:00:00.000Z")],
      customPrint: [new Date("2026-09-30T17:00:00.000Z")],
      paidOrders: [new Date("2026-09-30T17:00:00.000Z")],
    }, window);
    expect(business.briefs).toBe(2);
    expect(business.points.at(-2)?.briefs).toBe(1);
    expect(business.points.at(-1)).toMatchObject({ briefs: 1, customPrint: 1, paidOrders: 1 });
    const traffic = projectTraffic([
      { day: new Date("2026-10-01"), routeGroup: "home", source: "direct", device: "desktop", country: "ID", landing: true, viewCount: 4 },
      { day: new Date("2026-10-01"), routeGroup: "shop", source: "internal", device: "mobile", country: "ZZ", landing: false, viewCount: 2 },
    ], window);
    expect(traffic.pageViews).toBe(6);
    expect(traffic.points.at(-1)?.pageViews).toBe(6);
    expect(traffic.sources).toEqual([{ key: "direct", count: 4 }]);
  });

  it("mempertahankan hasil bisnis bila query traffic gagal serta menghitung batas retensi", async () => {
    const now = new Date("2026-09-30T17:00:00.000Z");
    const repository: AnalyticsRepository = {
      increment: vi.fn(),
      traffic: vi.fn().mockRejectedValue(new Error("analytics unavailable")),
      business: vi.fn().mockResolvedValue({ briefs: [], customPrint: [], paidOrders: [] }),
      deleteBefore: vi.fn().mockResolvedValue(3),
    };
    const service = new AnalyticsService(repository, () => now);
    const report = await service.load("13m");
    expect(report.business?.briefs).toBe(0);
    expect(report.traffic).toBeNull();
    expect(await service.deleteExpired()).toBe(3);
    expect(repository.deleteBefore).toHaveBeenCalledWith("2025-10-01");
  });
});

describe("POST page view", () => {
  const repository: AnalyticsRepository = {
    increment: vi.fn().mockResolvedValue(undefined),
    traffic: vi.fn(), business: vi.fn(), deleteBefore: vi.fn(),
  };
  const request = (body: string, origin = "https://niuva.id", contentType = "application/json") =>
    new Request("https://niuva.id/api/analytics/page-view", {
      method: "POST",
      headers: { origin, "content-type": contentType, "user-agent": "Mozilla/5.0 (iPhone)", "x-vercel-ip-country": "id" },
      body,
    });

  it("mati default dan tidak memanggil repository", async () => {
    vi.stubEnv("NIUVA_ANALYTICS_ENABLED", "");
    expect((await handlePageView(request('{"routeGroup":"home","source":"direct","landing":true}'), repository)).status).toBe(404);
    expect(repository.increment).not.toHaveBeenCalled();
  });

  it("menolak origin, private key, payload berlebih, dan konten salah", async () => {
    vi.stubEnv("NIUVA_ANALYTICS_ENABLED", "true");
    expect((await handlePageView(request("{}", "https://evil.example"), repository)).status).toBe(403);
    expect((await handlePageView(request("{}", "https://niuva.id", "text/plain"), repository)).status).toBe(415);
    expect((await handlePageView(request('{"routeGroup":"checkout","source":"direct","landing":true}'), repository)).status).toBe(400);
    expect((await handlePageView(request('{"routeGroup":"home","source":"direct","landing":true,"url":"/?token=secret"}'), repository)).status).toBe(400);
    expect((await handlePageView(request("x".repeat(513)), repository)).status).toBe(413);
  });

  it("menyimpan hanya kategori yang diizinkan dan negara dua huruf", async () => {
    vi.stubEnv("NIUVA_ANALYTICS_ENABLED", "true");
    const response = await handlePageView(request('{"routeGroup":"home","source":"direct","landing":true}'), repository);
    expect(response.status).toBe(204);
    expect(repository.increment).toHaveBeenCalledWith(
      { routeGroup: "home", source: "direct", landing: true }, "mobile", "ID", expect.any(Date),
    );
  });

  it("membatasi laju per hash sementara", async () => {
    vi.stubEnv("NIUVA_ANALYTICS_ENABLED", "true");
    const makeRequest = () => new Request("https://niuva.id/api/analytics/page-view", {
      method: "POST",
      headers: {
        origin: "https://niuva.id",
        "content-type": "application/json",
        "x-real-ip": "192.0.2.77",
      },
      body: '{"routeGroup":"home","source":"direct","landing":true}',
    });
    const statuses = await Promise.all(Array.from({ length: 61 }, () => handlePageView(makeRequest(), repository)));
    expect(statuses.filter((response) => response.status === 204)).toHaveLength(60);
    expect(statuses.filter((response) => response.status === 429)).toHaveLength(1);
  });
});

describe("cron retensi", () => {
  it("gagal tertutup tanpa secret dan menolak bearer yang salah", async () => {
    const request = (authorization: string) => new Request("https://niuva.id/api/analytics/retention", {
      headers: { authorization },
    });
    vi.stubEnv("CRON_SECRET", "");
    expect((await retentionGet(request("Bearer anything"))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "test-only-secret");
    expect((await retentionGet(request("Bearer wrong"))).status).toBe(401);
  });
});
