import { connection } from "next/server";
import { loadAdminPageAccess } from "../admin-page-access";
import { AdminAccessView } from "../admin-access-view";
import { AdminReportsService } from "@/modules/admin/reports/service";
import { AdminReportView } from "./report-view";
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ range?: string | string[]; tab?: string | string[] }> }) {
  await connection(); const gate = await loadAdminPageAccess(); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  return <AdminReportView role={gate.access.profile.role} data={await new AdminReportsService().load(gate.access, await searchParams)} />;
}
