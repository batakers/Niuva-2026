import type { Metadata } from "next";
import { connection } from "next/server";
import type { AdminAccess } from "@/lib/auth/clerk";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { parseActionQueueGroup } from "@/modules/admin/action-queue";
import { DashboardService } from "@/modules/admin/dashboard-service";
import { parseReportRange } from "@/modules/analytics/contract";
import { AnalyticsService, type AnalyticsReport } from "@/modules/analytics/service";
import type { FailureKind } from "@/lib/observability/logger";
import { loadAdminPageAccess } from "./admin-page-access";
import { recordAdminPageFailure } from "./admin-page-failure";
import { AdminOverviewView } from "./overview-view";

export const metadata: Metadata = {
  title: "Overview Admin · Niuva",
  robots: { follow: false, index: false },
};

export default async function AdminPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ group?: string | string[]; range?: string | string[] }> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;

  const params = await searchParams;
  const group = parseActionQueueGroup(params.group);
  const range = parseReportRange(params.range);
  const [loaded, analytics] = await Promise.all([loadOverview(group, access), loadAnalytics(range)]);
  if (loaded.status === "unavailable") {
    return <AdminDataUnavailableView kind={loaded.kind} role={access.profile.role} title="Overview belum dapat dimuat" />;
  }
  const result = loaded.data;
  return <AdminOverviewView analytics={analytics} dashboard={result.dashboard} queue={result.queue} range={range} role={access.profile.role} />;
}

// Analytics may fail without taking Overview down: keep the null fallback, add the log.
async function loadAnalytics(range: ReturnType<typeof parseReportRange>): Promise<AnalyticsReport | null> {
  try {
    return await new AnalyticsService().load(range);
  } catch (error) {
    recordAdminPageFailure(error, "page:/admin", { op: "analytics", range });
    return null;
  }
}

type OverviewLoad =
  | { status: "ok"; data: { queue: Awaited<ReturnType<ActionQueueService["list"]>>; dashboard: Awaited<ReturnType<DashboardService["load"]>> } }
  | { status: "unavailable"; kind: FailureKind };

async function loadOverview(
  group: ReturnType<typeof parseActionQueueGroup>,
  access: AdminAccess,
): Promise<OverviewLoad> {
  try {
    // Reuse the access already resolved by the page gate; the service still enforces its permission.
    const [queue, dashboard] = await Promise.all([
      new ActionQueueService({ authorize: async () => access }).list(group),
      new DashboardService().load(),
    ]);
    return { status: "ok", data: { queue, dashboard } };
  } catch (error) {
    return { status: "unavailable", kind: recordAdminPageFailure(error, "page:/admin", { op: "overview", group }) };
  }
}
