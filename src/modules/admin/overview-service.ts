import "server-only";
import type { AdminAccess } from "@/lib/auth/admin";
import type { ReportRange } from "@/modules/analytics/contract";
import { ActionQueueService } from "./action-queue-service";
import { AdminActivityTimelineService } from "./activity-timeline";
import { AdminReportsService } from "./reports/service";
import { requireAdminPermission } from "./permissions";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import type { DataSection } from "./reports/types";
import type { AdminOverviewData } from "./overview-types";
export async function loadAdminOverview(access: AdminAccess, range: ReportRange): Promise<AdminOverviewData> {
  requireAdminPermission(access, "REPORT_READ");
  const [attention, activity, report] = await Promise.all([
    section("attention", () => new ActionQueueService({ authorize: async () => access }).list()),
    section("activity", () => new AdminActivityTimelineService().list(access, 1)),
    new AdminReportsService().load(access, { range }),
  ]);
  return { range, generatedAt: report.generatedAt, attention, activity, finance: report.finance, traffic: report.traffic, paidOrders: report.operations.status === "ok" ? { status: "ok", data: report.operations.data.paidOrders } : report.operations };
}
async function section<T>(op: string, read: () => Promise<T>): Promise<DataSection<T>> { try { return { status: "ok", data: await read() }; } catch (error) { recordAdminPageFailure(error, "page:/admin", { op }); return { status: "unavailable", message: op === "activity" ? "Aktivitas belum dapat dimuat." : "Pekerjaan yang perlu perhatian belum dapat dimuat." }; } }
