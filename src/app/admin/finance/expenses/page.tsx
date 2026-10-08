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
import { ExpenseService } from "@/modules/finance/expense-service";
import { EXPENSE_CATEGORIES } from "@/modules/finance/expense-categories";
import { formatFinanceRp, FINANCE_STATE_LABELS } from "@/modules/finance/presentation";
import { parseFinanceListQuery } from "@/modules/finance/read-query";
export default async function ExpensesPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, unknown>> }>) {
  await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_READ" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const query = parseFinanceListQuery(await searchParams), loaded = await loadAdminRecordLogged("page:/admin/finance/expenses", () => new ExpenseService().list(gate.access, query), { op: "list" });
  if (loaded.status !== "found") return <AdminDataUnavailableView active="expenses" role={gate.access.profile.role} />;
  const params = Object.fromEntries(Object.entries(query).filter(([key, value]) => key !== "page" && typeof value === "string")) as Record<string, string>, returnTo = buildAdminPageHref("/admin/finance/expenses", params, query.page);
  return <AdminShell active="expenses" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="expenses"><AdminListPosition listHref={returnTo} /><AdminPageHeader title="Pengeluaran" description="Pengeluaran usaha dengan tanggal aktual dan riwayat koreksi." breadcrumbs={[{ label: "Keuangan", href: "/admin/finance" }, { label: "Pengeluaran" }]} actions={<Link className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white" href={withAdminReturnTo("/admin/finance/expenses/new", returnTo)}>Catat pengeluaran</Link>} /><FinanceListControls target="/admin/finance/expenses" query={query} statuses={["VALID", "REVERSED"]} expenses />
    <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap justify-between gap-2 border-b border-border p-5"><h2 className="text-lg font-semibold">Catatan pengeluaran</h2><p className="text-xs text-muted-foreground">{loaded.record.filteredTotal} catatan</p></div>{loaded.record.items.length ? <ul className="divide-y divide-border">{loaded.record.items.map(expense => <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-5" key={expense.id}><div className="min-w-0"><Link className="inline-flex min-h-11 items-center break-words text-sm font-semibold text-brand-700 hover:underline" href={withAdminReturnTo(`/admin/finance/expenses/${expense.id}`, returnTo)}>{expense.description}</Link><p className="text-xs text-muted-foreground">{expense.date} · {EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES] ?? expense.category} · {FINANCE_STATE_LABELS[expense.state]}</p></div><p className="text-sm font-semibold tabular-nums">{formatFinanceRp(expense.amountRp)}</p></li>)}</ul> : <p className="p-8 text-sm text-muted-foreground">Belum ada pengeluaran pada filter ini.</p>}</section><AdminPagination basePath="/admin/finance/expenses" hasNext={loaded.record.hasNext} page={query.page} query={params} /></main></AdminShell>;
}
