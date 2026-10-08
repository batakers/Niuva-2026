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
export default async function PaymentsPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, unknown>> }>) {
  await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_READ" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const query = parseFinanceListQuery(await searchParams), loaded = await loadAdminRecordLogged("page:/admin/finance/payments", () => new FinanceReadService().payments(gate.access, query), { op: "list" });
  if (loaded.status !== "found") return <AdminDataUnavailableView active="payments" role={gate.access.profile.role} />;
  const params = Object.fromEntries(Object.entries(query).filter(([key, value]) => key !== "page" && typeof value === "string")) as Record<string, string>, returnTo = buildAdminPageHref("/admin/finance/payments", params, query.page);
  return <AdminShell active="payments" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="payments"><AdminListPosition listHref={returnTo} /><AdminPageHeader title="Pembayaran" description="Penerimaan provider dan transfer B2B, sesuai konfirmasi masing-masing sumber." breadcrumbs={[{ label: "Keuangan", href: "/admin/finance" }, { label: "Pembayaran" }]} /><FinanceListControls target="/admin/finance/payments" query={query} statuses={["CONFIRMED", "PENDING", "REVIEW", "REFUNDED", "REVERSED", "EXPIRED", "FAILED", "CANCELLED"]} services /><section className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap justify-between gap-2 border-b border-border p-5"><h2 className="text-lg font-semibold">Transaksi pembayaran</h2><p className="text-xs text-muted-foreground">{loaded.record.filteredTotal} catatan</p></div>{loaded.record.items.length ? <ul className="divide-y divide-border">{loaded.record.items.map(payment => <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-5" key={payment.id}><div className="min-w-0"><Link className="inline-flex min-h-11 items-center break-all text-sm font-semibold text-brand-700 hover:underline" href={withAdminReturnTo(`/admin/finance/payments/${payment.id}`, returnTo)}>{payment.reference}</Link><p className="text-xs text-muted-foreground">{payment.source === "PROVIDER" ? "Provider pembayaran" : "Transfer B2B"} · {FINANCE_STATE_LABELS[payment.state]} · {payment.actualDate ? new Date(payment.actualDate).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum ada tanggal penerimaan"}</p></div><p className="text-sm font-semibold tabular-nums">{formatFinanceRp(payment.amountRp)}</p></li>)}</ul> : <p className="p-8 text-sm text-muted-foreground">Belum ada pembayaran pada filter ini.</p>}</section><AdminPagination basePath="/admin/finance/payments" hasNext={loaded.record.hasNext} page={query.page} query={params} /></main></AdminShell>;
}
