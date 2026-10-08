import { connection } from "next/server";
import { AdminShell, AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { loadAdminPageAccess } from "../../admin-page-access";
import { AdminAccessView } from "../../admin-access-view";
import { AdminPageHeader } from "../../admin-page-header";
import { TariffService } from "@/modules/pricing/tariff-service";
import { rateLabels } from "@/modules/pricing/tariff-schema";
import { TariffForm } from "./tariff-form";
import { recordAdminPageFailure } from "../../admin-page-failure";
export default async function CustomPrintRatesPage() {
  await connection(); const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  if (gate.access.profile.role !== "OWNER") return <AdminAccessView state="FORBIDDEN" />;
  let data;
  try { data = await new TariffService().load(gate.access); }
  catch (error) { const kind = recordAdminPageFailure(error, "page:/admin/settings/custom-print-rates", { op: "tariffs" }); return <AdminDataUnavailableView role="OWNER" active="settings" title="Tarif belum dapat dimuat" kind={kind} />; }
  return <AdminShell role="OWNER" active="settings"><main id="main-content" className="space-y-6"><AdminPageHeader title="Tarif Custom Print" description={data.activeId ? `Tarif aktif versi ${data.version}. Ubah → Tinjau → Terapkan.` : "Belum ada tarif aktif. Tinjau nilai awal sebelum menerapkan tarif."} breadcrumbs={[{ label: "Pengaturan", href: "/admin/settings" }, { label: "Tarif Custom Print" }]} /><TariffForm initialRates={data.rates} activeId={data.activeId} canApply={data.canApply} />
    <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">Riwayat tarif</h2><p className="mt-1 text-sm text-muted-foreground">30 versi terbaru. Versi sebelumnya tetap tersedia untuk membaca quote yang sudah diterbitkan.</p><div className="mt-4 space-y-3">{data.history.map(row => <details key={row.id} className="rounded-lg border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Versi {row.version} · {row.status === "ACTIVE" ? "Berlaku" : row.status === "RETIRED" ? "Digantikan" : "Draft"} · {row.actor} · {row.appliedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(row.appliedAt)) : "Belum diterapkan"}</summary><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(row.rates).map(([key, value]) => <div key={key}><dt className="text-muted-foreground">{rateLabels[key as keyof typeof rateLabels]}</dt><dd>Rp {value}</dd></div>)}</dl></details>)}{data.history.length === 0 && <p className="text-sm text-muted-foreground">Belum ada versi tarif yang tersimpan.</p>}</div></section>
  </main></AdminShell>;
}
