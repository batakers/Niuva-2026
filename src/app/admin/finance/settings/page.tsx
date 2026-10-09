import { Card } from "@/components/ui/card";
import { connection } from "next/server";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { FinanceActionForm, type FinanceFormField } from "@/components/niuva/finance-action-form";
import { BillingSettingsService } from "@/modules/finance/billing-settings-service";
import { saveBillingSettingsAction } from "./actions";
export default async function BillingSettingsPage() {
  await connection(); const gate = await loadAdminPageAccess({ permission: "BILLING_SETTINGS_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const loaded = await loadAdminRecordLogged("page:/admin/finance/settings", () => new BillingSettingsService().load(gate.access), { op: "read" });
  if (loaded.status !== "found") return <AdminDataUnavailableView active="billing-settings" role={gate.access.profile.role} />;
  const labels = [{ name: "issuerName", label: "Nama penerbit", maxLength: 120 }, { name: "issuerAddress", label: "Alamat penerbit", type: "textarea" as const, maxLength: 600 }, { name: "issuerEmail", label: "Email penerbit", type: "email" as const, maxLength: 254 }, { name: "bankName", label: "Nama bank", maxLength: 80 }, { name: "accountName", label: "Nama pemilik rekening", maxLength: 120 }, { name: "accountNumber", label: "Nomor rekening", maxLength: 40 }, { name: "transferInstructions", label: "Instruksi transfer", type: "textarea" as const, maxLength: 1000 }];
  const fields: readonly FinanceFormField[] = labels.map(field => ({ ...field, required: true, value: loaded.record.values?.[field.name as keyof NonNullable<typeof loaded.record.values>] ?? "" }));
  return <AdminShell active="billing-settings" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="billing-settings"><AdminPageHeader title="Penagihan & Rekening" description="Identitas penerbit dan rekening Niuva yang dicantumkan pada invoice." returnHref="/admin/settings" returnLabel="Pengaturan" breadcrumbs={[{ label: "Pengaturan", href: "/admin/settings" }, { label: "Penagihan & Rekening" }]} /><Card as="section" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5"><FinanceActionForm key={loaded.record.version} action={saveBillingSettingsAction} fields={fields} hidden={{ expectedVersion: String(loaded.record.version) }} submitLabel="Simpan pengaturan" confirmMessage="Terapkan identitas penerbit dan rekening ini untuk invoice berikutnya?" /></Card></main></AdminShell>;
}
