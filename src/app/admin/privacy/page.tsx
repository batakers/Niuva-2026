import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminShell, AdminPagination, AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { isCustomerPrivacyAvailable, privacyKindLabels, privacyStatusLabels } from "@/modules/customer-privacy/core";
import { parseOwnerPrivacyListQuery, privacyStatusFilterSchema } from "@/modules/customer-privacy/validation";
import { PRIVACY_ERROR_MESSAGES } from "@/modules/customer-privacy/handler";
import { buildAdminPageHref, withAdminReturnTo } from "@/modules/admin/navigation";
export const metadata: Metadata = { title: "Privasi Customer · Owner Niuva", robots: { index: false, follow: false } };
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export default async function OwnerPrivacyPage({ searchParams }: Readonly<{ searchParams: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const access = gate.access;
  const raw = await searchParams;
  const query = parseOwnerPrivacyListQuery(raw);
  const available = isCustomerPrivacyAvailable();
  const queryParams: Readonly<Record<string, string>> = query.status ? { status: query.status } : {};
  const returnTo = buildAdminPageHref("/admin/privacy", queryParams, query.page);
  let result: Awaited<ReturnType<CustomerPrivacyService["listOwner"]>> | null = null;
  if (available) {
    try { result = await new CustomerPrivacyService().listOwner(access, query); }
    catch (error) { return <AdminDataUnavailableView active="privacy" role={access.profile.role} kind={recordAdminPageFailure(error, "page:/admin/privacy", { op: "list", page: String(query.page) })} title="Permintaan privasi belum dapat dimuat" />; }
  }
  const now = new Date();
  return <AdminShell active="privacy" role={access.profile.role}><main id="main-content" data-admin-surface="privacy-list" className="space-y-6">
    <AdminPageHeader title="Privasi Customer" description="Pantau permintaan akses dan koreksi data. Tenggat tetap 3×24 jam kalender dari penerimaan awal." breadcrumbs={[{ label: "Privasi Customer" }]} actions={<><Link href="/admin/privacy/policy?document=terms" className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })}>Tinjau draf Syarat Layanan</Link><Link href="/admin/privacy/policy?document=privacy" className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })}>Tinjau draf Kebijakan Privasi</Link></>} />
    {typeof raw.error === "string" ? <p role="alert" className="rounded-lg border border-destructive-border p-4 text-destructive">{PRIVACY_ERROR_MESSAGES[raw.error] ?? "Tindakan gagal diproses."}</p> : null}
    {raw.status === "updated" ? <p role="status" className="rounded-lg border border-border bg-card p-4">Tanggapan dan hasil tersimpan.</p> : null}
    {!available ? <p>Pusat privasi hanya aktif pada Development lokal dan test yang diizinkan.</p> : result ? <>
      <form action="/admin/privacy" method="get" aria-label="Filter privasi" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <Label className="grid gap-2 text-sm font-medium" htmlFor="privacy-status-filter">Status<NativeSelect id="privacy-status-filter" name="status" defaultValue={query.status ?? ""} className="min-h-11 rounded-lg border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><NativeSelectOption value="">Semua status</NativeSelectOption>{privacyStatusFilterSchema.options.map(status => <NativeSelectOption key={status} value={status}>{privacyStatusLabels[status]}</NativeSelectOption>)}</NativeSelect></Label>
        <Button variant="default" className="min-h-11 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" type="submit">Terapkan</Button>
        <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/privacy">Reset filter</Link>
      </form>
      <p className="text-sm text-muted-foreground">{result.filteredTotal} hasil filter · halaman {result.page}</p>
      {result.items.length === 0 ? <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground" role="status">Belum ada permintaan privasi pada filter ini.</p> : <section aria-label="Permintaan privasi" className="grid gap-3">{result.items.map(row => <Card as="article" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5" key={row.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="inline-flex min-h-11 items-center break-all font-mono text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/privacy/${row.id}`, returnTo)}>{row.referenceNumber}</Link><h2 className="mt-2 font-semibold">{privacyKindLabels[row.kind]}</h2></div><p className="text-sm font-medium">{privacyStatusLabels[row.status]}{!row.resolvedAt && row.dueAt <= now ? " · Tenggat terlewati" : ""}</p></div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Diterima</dt><dd className="mt-1">{date.format(row.createdAt)} WIB</dd></div><div><dt className="text-xs text-muted-foreground">Tenggat awal</dt><dd className="mt-1">{date.format(row.dueAt)} WIB</dd></div></dl>
        {row.contentPurgedAt ? <p className="mt-3 text-xs text-muted-foreground">Isi telah dibersihkan; bukti minimum masih tersedia.</p> : null}
      </Card>)}</section>}
      <AdminPagination basePath="/admin/privacy" query={queryParams} page={result.page} hasNext={result.hasNext} />
    </> : null}
  </main></AdminShell>;
}
