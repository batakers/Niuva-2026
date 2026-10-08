import { redirect } from "next/navigation";
import { connection } from "next/server";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
export default async function FinancePage() { await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_READ" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />; redirect("/admin/finance/invoices"); }
