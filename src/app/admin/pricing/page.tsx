import { connection } from "next/server";
import { redirect } from "next/navigation";
import { loadAdminPageAccess } from "../admin-page-access";
import { AdminAccessView } from "../admin-access-view";
export default async function AdminPricingPage() {
  await connection(); const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  if (gate.access.profile.role !== "OWNER") return <AdminAccessView state="FORBIDDEN" />;
  redirect("/admin/settings/custom-print-rates");
}
