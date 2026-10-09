import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeInput as Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminListPosition } from "@/components/niuva/admin-list-position";
import { buildAdminPageHref, withAdminReturnTo } from "@/modules/admin/navigation";
import { CustomerDirectoryService } from "@/modules/customers/service";
import { parseCustomerDirectoryQuery } from "@/modules/customers/query";

export const metadata: Metadata = { title: "Customers · Niuva", robots: { index: false, follow: false } };
export default async function AdminCustomersPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, unknown>> }>) {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "CUSTOMER_DIRECTORY_READ" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const query = parseCustomerDirectoryQuery(await searchParams);
  const loaded = await loadAdminRecordLogged("page:/admin/customers", () => new CustomerDirectoryService().list(gate.access, query), { op: "list" });
  if (loaded.status !== "found") return <AdminDataUnavailableView active="customers" role={gate.access.profile.role} />;
  const result = loaded.record;
  const params: Readonly<Record<string, string>> = query.q ? { q: query.q } : {};
  const returnTo = buildAdminPageHref("/admin/customers", params, query.page);
  return <AdminShell active="customers" role={gate.access.profile.role}><main id="main-content" data-admin-surface="customers" className="space-y-6">
    <AdminListPosition listHref={returnTo} />
    <AdminPageHeader title="Customers" description="Direktori akun customer dan riwayat pekerjaan yang terhubung." breadcrumbs={[{ label: "Customers" }]} />
    <form action="/admin/customers" role="search" aria-label="Cari customer" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"><Label className="grid min-w-0 flex-1 gap-1.5 text-xs font-medium text-muted-foreground">Nama atau email<Input className="min-h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={query.q} maxLength={100} name="q" type="search" /></Label><Button variant="default" className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white" type="submit">Cari</Button></form>
    <Card as="section" className="gap-0 py-0 ring-0 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="customers-title"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-5"><h2 className="text-lg font-semibold" id="customers-title">Direktori customer</h2><p className="text-xs text-muted-foreground">{result.filteredTotal} customer · 20 per halaman</p></div>
      {result.items.length ? <ul className="divide-y divide-border">{result.items.map(customer => <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-5" key={customer.id}><div className="min-w-0"><Link className="inline-flex min-h-11 items-center break-words text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/customers/${customer.id}`, returnTo)}>{customer.displayName ?? "Customer"}</Link><p className="break-all text-xs text-muted-foreground">{customer.email}</p></div><p className="text-xs leading-6 text-muted-foreground">{customer.orderCount} order · {customer.customPrintCount} Custom Print · {customer.inquiryCount} B2B</p></li>)}</ul> : <p className="p-8 text-sm text-muted-foreground">{query.q ? "Customer tidak ditemukan. Coba nama atau email lain." : "Belum ada akun customer."}</p>}
    </Card>
    <AdminPagination basePath="/admin/customers" hasNext={result.hasNext} page={query.page} query={params} />
  </main></AdminShell>;
}
