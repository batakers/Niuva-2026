import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminAccessView } from "./admin-access-view";
import { loadAdminPageAccess } from "./admin-page-access";
import { AdminOverviewView } from "./overview-view";
import { parseReportRange } from "@/modules/analytics/contract";
import { loadAdminOverview } from "@/modules/admin/overview-service";
export const metadata: Metadata = { title: "Overview Admin · Niuva", robots: { follow: false, index: false } };
export default async function AdminPage({ searchParams }: Readonly<{ searchParams: Promise<{ group?: string | string[]; range?: string | string[] }> }>) {
  await connection(); const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const range = parseReportRange((await searchParams).range);
  return <AdminOverviewView role={gate.access.profile.role} data={await loadAdminOverview(gate.access, range)} />;
}
