import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Search } from "lucide-react";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { AdminGlobalSearchService, parseAdminSearchQuery } from "@/modules/admin/global-search";

export const metadata: Metadata = { title: "Pencarian Admin · Niuva", robots: { index: false, follow: false } };
const labels = { MENU: "Menu", ORDER: "Orders", B2B: "B2B Inquiries", CUSTOM_PRINT: "Custom Print", PRODUCT: "Produk", PORTFOLIO: "Portfolio", CUSTOMER: "Customer", INVOICE: "Invoice" };

export default async function AdminSearchPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string | string[] }> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const raw = (await searchParams).q;
  const query = parseAdminSearchQuery(raw);
  let results: Awaited<ReturnType<AdminGlobalSearchService["search"]>> = [];
  if (query !== null) {
    try { results = await new AdminGlobalSearchService().search(gate.access, query); }
    catch (error) { return <AdminDataUnavailableView active="search" kind={recordAdminPageFailure(error, "page:/admin/search", { op: "search" })} role={gate.access.profile.role} />; }
  }
  return <AdminShell active="search" role={gate.access.profile.role}>
    <main id="main-content" className="mx-auto max-w-4xl space-y-6">
      <header><h1 className="mt-1 text-3xl font-semibold tracking-tight">Pencarian global</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Temukan menu, pekerjaan, produk, atau portfolio dari referensi dan kata pencarian.</p></header>
      <form action="/admin/search" className="flex gap-2 rounded-xl border border-border bg-card p-3 shadow-card"><label className="flex min-w-0 flex-1 items-center gap-2"><Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" /><span className="sr-only">Kata pencarian</span><input autoFocus className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" defaultValue={typeof raw === "string" ? raw : ""} maxLength={80} minLength={2} name="q" placeholder="Cari order, nomor referensi, customer, atau menu…" required /></label><button className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" type="submit">Cari</button></form>
      {raw !== undefined && query === null ? <p role="alert" className="text-sm text-destructive-icon">Masukkan 2–80 karakter untuk mencari.</p> : null}
      {query === null ? <p className="text-sm text-muted-foreground">Ketik kata pencarian untuk melihat hasil.</p> : <section aria-label="Hasil pencarian" className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6"><div className="flex items-baseline justify-between gap-3"><h2 className="text-lg font-semibold">Hasil untuk “{query}”</h2><span className="text-xs text-muted-foreground">{results.length} hasil</span></div>{results.length ? <ul className="mt-4 divide-y divide-border">{results.map(item => <li key={`${item.kind}:${item.href}`}><Link className="flex min-h-16 items-center justify-between gap-4 py-3 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href}><span className="min-w-0"><strong className="block break-words text-sm">{item.title}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{item.detail}</span></span><span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{labels[item.kind]}</span></Link></li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Tidak ada hasil. Coba nomor referensi atau kata lain.</p>}</section>}
    </main>
  </AdminShell>;
}
