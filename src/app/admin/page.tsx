import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { parseActionQueueGroup } from "@/modules/admin/action-queue";
import { DashboardService } from "@/modules/admin/dashboard-service";
import { loadAdminPageAccess } from "./admin-page-access";
import { AdminOverviewView } from "./overview-view";

export const metadata: Metadata = {
  title: "Overview Admin · Niuva",
  robots: { follow: false, index: false },
};

export default async function AdminPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ group?: string | string[] }> }>) {
  await connection();
  const access = await loadAdminPageAccess();
  if (access === null) return <AdminAccessUnavailableView />;

  const group = parseActionQueueGroup((await searchParams).group);
  const result = await loadOverview(group);
  if (result === null) {
    return <AdminDataUnavailableView role={access.profile.role} title="Overview belum dapat dimuat" />;
  }
  return <AdminOverviewView dashboard={result.dashboard} queue={result.queue} role={access.profile.role} />;
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
