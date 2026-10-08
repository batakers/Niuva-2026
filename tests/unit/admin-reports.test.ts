import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AdminReportsService, parseReportTab } from "@/modules/admin/reports/service";
import type { AdminAccess } from "@/lib/auth/admin";
import { reportWindow } from "@/modules/analytics/contract";
const access: AdminAccess = { authUserId: "fixture", profile: { id: "fixture", role: "ADMIN", isActive: true } };
it("bounds URL choices and isolates finance/traffic errors from operations", async () => {
  const now = new Date("2026-10-07T17:01:00Z"); const window = reportWindow("30d", now);
  const service = new AdminReportsService({ now: () => now, operations: async () => ({ createdOrders: 1, briefs: 2, customPrint: 3, paidOrders: 1, points: [] }), finance: async () => { throw new Error("synthetic finance unavailable"); }, traffic: async () => { throw new Error("synthetic traffic unavailable"); } });
  const report = await service.load(access, { range: "invalid", tab: "invalid" });
  expect(report.range).toBe("30d"); expect(report.tab).toBe("summary"); expect(report.window).toEqual(window);
  expect(report.operations.status).toBe("ok"); expect(report.finance.status).toBe("unavailable"); expect(report.traffic.status).toBe("unavailable");
  expect(parseReportTab("finance")).toBe("finance"); expect(parseReportTab(["finance"])).toBe("summary");
});
it("rejects inactive access before invoking any report reader", async () => {
  const read = vi.fn(); const service = new AdminReportsService({ operations: read, finance: read, traffic: read });
  await expect(service.load({ ...access, profile: { ...access.profile, isActive: false } }, {})).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(read).not.toHaveBeenCalled();
});
