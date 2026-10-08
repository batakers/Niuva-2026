import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";
import { FINANCE_STATE_LABELS } from "@/modules/finance/presentation";
import { adminStatusLabel } from "@/modules/admin/list-query";
import { CustomerDirectoryService } from "@/modules/customers/service";
import { parseCustomerDirectoryQuery } from "@/modules/customers/query";

export const metadata: Metadata = { title: "Riwayat Customer · Niuva", robots: { index: false, follow: false } };
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const tabs = [{ id: "orders", label: "Orders" }, { id: "custom-print", label: "Custom Print" }, { id: "inquiries", label: "B2B" }, { id: "invoices", label: "Invoice" }] as const;
export default async function AdminCustomerDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<Record<string, unknown>> }>) {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "CUSTOMER_DIRECTORY_READ" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const raw = await searchParams, query = parseCustomerDirectoryQuery(raw), returnTo = normalizeAdminReturnTo(raw.returnTo, "/admin/customers");
  const loaded = await loadAdminRecordLogged("page:/admin/customers/[id]", () => new CustomerDirectoryService().detail(gate.access, id, query), { op: "detail", id });
  if (loaded.status === "not-found") notFound();
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="customers" role={gate.access.profile.role} />;
  const detail = loaded.record, customer = detail.customer;
  const history = query.tab === "orders" ? detail.orders : query.tab === "custom-print" ? detail.customPrint : query.tab === "inquiries" ? detail.inquiries : detail.invoices;
  const context = `/admin/customers/${id}?tab=${query.tab}&page=${query.page}`;
  return <AdminShell active="customers" role={gate.access.profile.role}><main id="main-content" data-admin-surface="customer-detail" className="space-y-6">
    <AdminPageHeader title={customer.displayName ?? "Customer"} description={customer.email} returnHref={returnTo} breadcrumbs={[{ label: "Customers", href: returnTo }, { label: "Riwayat customer" }]} />
    <section aria-label="Ringkasan customer" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Bergabung</p><p className="mt-2 text-sm font-medium">{date.format(customer.createdAt)}</p></div>{[{ label: "Orders", count: customer.orderCount }, { label: "Custom Print", count: customer.customPrintCount }, { label: "B2B", count: customer.inquiryCount }].map(item => <div key={item.label}><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{item.count}</p></div>)}</section>
    <section aria-labelledby="customer-history-title" className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-lg font-semibold" id="customer-history-title">Riwayat pekerjaan</h2><nav aria-label="Jenis riwayat customer" className="mt-4 flex flex-wrap gap-2">{tabs.map(tab => <Link aria-current={query.tab === tab.id ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium ${query.tab === tab.id ? "bg-brand-50 text-brand-900" : "text-muted-foreground hover:bg-muted"}`} href={withAdminReturnTo(`/admin/customers/${id}?tab=${tab.id}`, returnTo)} key={tab.id}>{tab.label}</Link>)}</nav>
      {history.items.length ? <ul className="mt-4 divide-y divide-border">{history.items.map(item => <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={item.id}><Link className="inline-flex min-h-11 min-w-0 max-w-full items-center break-all text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(item.href, context)}>{item.reference}</Link><div className="text-xs text-muted-foreground"><p className="font-medium text-foreground">{query.tab === "invoices" ? FINANCE_STATE_LABELS[item.status] ?? adminStatusLabel(item.status) : adminStatusLabel(item.status)}</p><p className="mt-1">{date.format(item.createdAt)}</p></div></li>)}</ul> : <p className="mt-5 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Belum ada riwayat pada bagian ini.</p>}
      <AdminPagination basePath={`/admin/customers/${id}`} hasNext={history.hasNext} page={query.page} query={{ tab: query.tab, returnTo }} />
    </section>
  </main></AdminShell>;
}
