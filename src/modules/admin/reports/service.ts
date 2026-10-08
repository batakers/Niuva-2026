import "server-only";
import { z } from "zod";
import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "../permissions";
import { parseReportRange, reportWindow, type ReportRange, type ReportWindow } from "@/modules/analytics/contract";
import { PrismaAnalyticsRepository } from "@/modules/analytics/repository";
import { projectBusiness, projectTraffic } from "@/modules/analytics/service";
import { FinanceReadService } from "@/modules/finance/read-service";
import type { FinanceSummary } from "@/modules/finance/types";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { reportTabs, type OperationsReport, type TrafficSection, type DataSection, type AdminReportsData } from "./types";
export function parseReportTab(raw: unknown) { const parsed = z.enum(reportTabs).safeParse(raw); return parsed.success ? parsed.data : "summary"; }
export class AdminReportsService {
  constructor(private readonly dependencies: { now?: () => Date; operations?: (window: ReportWindow) => Promise<OperationsReport>; finance?: (access: AdminAccess, range: ReportRange, now: Date) => Promise<FinanceSummary>; traffic?: (window: ReportWindow) => Promise<TrafficSection> } = {}) {}
  async load(access: AdminAccess, raw: { range?: unknown; tab?: unknown }): Promise<AdminReportsData> {
    requireAdminPermission(access, "REPORT_READ"); const now = (this.dependencies.now ?? (() => new Date()))(); const range = parseReportRange(raw.range); const tab = parseReportTab(raw.tab); const window = reportWindow(range, now);
    const [operations, finance, traffic] = await Promise.all([
      section("operations", () => (this.dependencies.operations ?? loadOperations)(window)),
      section("finance", () => (this.dependencies.finance ?? ((actor, value, at) => new FinanceReadService().summary(actor, value, at)))(access, range, now)),
      section("traffic", () => (this.dependencies.traffic ?? loadTraffic)(window)),
    ]);
    return { range, tab, window, generatedAt: now.toISOString(), operations, finance, traffic };
  }
}
async function section<T>(op: string, read: () => Promise<T>): Promise<DataSection<T>> { try { return { status: "ok", data: await read() }; } catch (error) { recordAdminPageFailure(error, "page:/admin/reports", { op }); return { status: "unavailable", message: "Data bagian ini belum dapat dimuat. Coba muat ulang." }; } }
async function loadOperations(window: ReportWindow): Promise<OperationsReport> { const [business, createdOrders] = await Promise.all([new PrismaAnalyticsRepository().business(window), getPrismaClient().order.count({ where: { createdAt: { gte: window.start, lt: window.end } } })]); return { ...projectBusiness(business, window), createdOrders }; }
async function loadTraffic(window: ReportWindow): Promise<TrafficSection> { return { report: projectTraffic(await new PrismaAnalyticsRepository().traffic(window), window), collectionEnabled: process.env.NIUVA_ANALYTICS_ENABLED === "true" }; }
