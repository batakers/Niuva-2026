import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { parseActionQueueGroup } from "@/modules/admin/action-queue";
import { DashboardService } from "@/modules/admin/dashboard-service";
import { parseReportRange } from "@/modules/analytics/contract";
import { AnalyticsService, type AnalyticsReport } from "@/modules/analytics/service";
import { loadAdminPageAccess } from "./admin-page-access";
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
  const [result, analytics] = await Promise.all([loadOverview(group), loadAnalytics(range)]);
  if (result === null) {
    return <AdminDataUnavailableView role={access.profile.role} title="Overview belum dapat dimuat" />;
  }
  return <AdminOverviewView analytics={analytics} dashboard={result.dashboard} queue={result.queue} range={range} role={access.profile.role} />;
}

async function loadAnalytics(range: ReturnType<typeof parseReportRange>): Promise<AnalyticsReport | null> {
  try {
    return await new AnalyticsService().load(range);
  } catch {
    return null;
  }
}

async function loadOverview(group: ReturnType<typeof parseActionQueueGroup>) {
  try {
    const [queue, dashboard] = await Promise.all([
      new ActionQueueService().list(group),
      new DashboardService().load(),
    ]);
    return { queue, dashboard };
  } catch {
    return null;
  }
}
