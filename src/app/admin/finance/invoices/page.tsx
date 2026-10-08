import Link from "next/link";
import { connection } from "next/server";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminShell, AdminPagination } from "@/components/niuva/admin-shell";
import { AdminListPosition } from "@/components/niuva/admin-list-position";
import { FinanceListControls } from "@/components/niuva/finance-list-controls";
import { buildAdminPageHref, withAdminReturnTo } from "@/modules/admin/navigation";
import { FinanceReadService } from "@/modules/finance/read-service";
import { formatFinanceRp, FINANCE_STATE_LABELS } from "@/modules/finance/presentation";
import { parseFinanceListQuery } from "@/modules/finance/read-query";
export default async function InvoicesPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, unknown>> }>) {
  await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_READ" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const query = parseFinanceListQuery(await searchParams), loaded = await loadAdminRecordLogged("page:/admin/finance/invoices", () => new FinanceReadService().invoices(gate.access, query), { op: "list" });
  if (loaded.status !== "found") return <AdminDataUnavailableView active="invoices" role={gate.access.profile.role} />;
  const params = Object.fromEntries(Object.entries(query).filter(([key, value]) => key !== "page" && typeof value === "string")) as Record<string, string>, returnTo = buildAdminPageHref("/admin/finance/invoices", params, query.page);
  return <AdminShell active="invoices" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="invoices"><AdminListPosition listHref={returnTo} /><AdminPageHeader title="Invoice" description="Dokumen tagihan ready-made, Custom Print, dan proyek B2B." breadcrumbs={[{ label: "Keuangan" }, { label: "Invoice" }]} actions={<Link className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white" href="/admin/finance/invoices/new">Siapkan invoice</Link>} /><FinanceListControls target="/admin/finance/invoices" query={query} statuses={["DRAFT", "ISSUED", "VOID", "SUPERSEDED"]} services />
    <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap justify-between gap-2 border-b border-border p-5"><h2 className="text-lg font-semibold">Dokumen penagihan</h2><p className="text-xs text-muted-foreground">{loaded.record.filteredTotal} dokumen</p></div>{loaded.record.items.length ? <ul className="divide-y divide-border">{loaded.record.items.map(invoice => <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-5" key={invoice.id}><div className="min-w-0"><Link className="inline-flex min-h-11 items-center break-all text-sm font-semibold text-brand-700 hover:underline" href={withAdminReturnTo(`/admin/finance/invoices/${invoice.id}`, returnTo)}>{invoice.number ?? `Draft · ${invoice.snapshot?.sourceReference ?? "Tagihan"}`}</Link><p className="text-xs text-muted-foreground">{FINANCE_STATE_LABELS[invoice.state]} · Revisi {invoice.revision} · {invoice.billingCase.closed ? "Identitas customer ditutup" : FINANCE_STATE_LABELS[invoice.billingCase.paymentState]}</p></div><p className="text-sm font-semibold tabular-nums">{formatFinanceRp(invoice.snapshot?.totalRp ?? invoice.billingCase.totalRp)}</p></li>)}</ul> : <p className="p-8 text-sm text-muted-foreground">Belum ada invoice pada filter ini.</p>}</section><AdminPagination basePath="/admin/finance/invoices" hasNext={loaded.record.hasNext} page={query.page} query={params} /></main></AdminShell>;
}
