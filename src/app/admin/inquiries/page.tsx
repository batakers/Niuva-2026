import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AdminPageHeader } from "../admin-page-header";
import { AdminListControls } from "../admin-list-controls";
import { parseAdminListQuery, adminListQueryParams, type AdminListQuery } from "@/modules/admin/list-query";
import { buildAdminPageHref, withAdminReturnTo } from "@/modules/admin/navigation";

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import type { AdminAccess } from "@/lib/auth/admin";
import type { FailureKind } from "@/lib/observability/logger";
import { AdminOperationsService, type AdminInquiryRow } from "@/modules/admin/operations";

export const metadata: Metadata = { title: "B2B Inquiries admin · Niuva", robots: { follow: false, index: false } };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminInquiriesPage({ searchParams }: Readonly<{ searchParams: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const query = parseAdminListQuery("inquiries", await searchParams);
  const page = query.page;
  const queryParams = adminListQueryParams(query);
  const returnTo = buildAdminPageHref("/admin/inquiries", queryParams, page);
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;
  const loaded = await loadInquiries(access, query);
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="inquiries" kind={loaded.kind} role={access.profile.role} title="B2B inquiries belum dapat dimuat" />;
  const result = loaded.data;

  return (
    <AdminShell active="inquiries" role={result.role}>
      <main className="space-y-8" data-admin-surface="inquiries" id="main-content">
        <AdminPageHeader title="B2B Inquiries" description="Temukan brief proyek dan pantau tindak lanjut B2B. Review dan proposal tersedia pada setiap inquiry." breadcrumbs={[{ label: "B2B Inquiries" }]} />
          <AdminListControls area="inquiries" query={query} />

        <section aria-label="Ringkasan inquiry" className="grid gap-3 sm:grid-cols-3">
          <Summary label="Hasil filter" value={String(result.filteredTotal)} />
          <Summary label="Baru di halaman ini" value={String(result.items.filter((item) => item.status === "NEW").length)} />
          <Summary label="Qualified di halaman ini" value={String(result.items.filter((item) => item.status === "QUALIFIED").length)} />
        </section>

        <section aria-labelledby="inquiries-list-title">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-semibold" id="inquiries-list-title">Inquiry terbaru</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Buka detail untuk membaca brief, menindaklanjuti, dan mengirim proposal.</p>
            </div>
            <p className="text-sm text-muted-foreground" role="status">Dibaca {dateFormatter.format(result.generatedAt)}</p>
          </div>

          {result.items.length === 0 ? (
            <div className="mt-6">
              <StatusNotice tone="info" title="Tidak ada record yang sesuai." description="Coba ubah pencarian atau filter. Record baru akan tampil setelah berhasil diajukan." />
            </div>
          ) : (
            <>
              <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
                <table className="w-full min-w-[58rem] text-left text-sm">
                  <caption className="sr-only">Daftar B2B inquiries</caption>
                  <thead className="border-b border-border bg-muted text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-4 font-medium" scope="col">Reference</th>
                      <th className="px-5 py-4 font-medium" scope="col">Prospek</th>
                      <th className="px-5 py-4 font-medium" scope="col">Stage</th>
                      <th className="px-5 py-4 font-medium" scope="col">Status</th>
                      <th className="px-5 py-4 font-medium" scope="col">Deadline</th>
                      <th className="px-5 py-4 text-right font-medium" scope="col">Diperbarui</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.items.map((item) => <InquiryRow item={item} key={item.id} returnTo={returnTo} />)}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 grid gap-3 lg:hidden">
                {result.items.map((item) => <InquiryCard item={item} key={item.id} returnTo={returnTo} />)}
              </div>
            </>
          )}
          <AdminPagination basePath="/admin/inquiries" hasNext={result.hasNext} page={result.page} query={queryParams} />
        </section>
      </main>
    </AdminShell>
  );
}

type InquiriesLoad =
  | { status: "ok"; data: Awaited<ReturnType<AdminOperationsService["listInquiries"]>> }
  | { status: "unavailable"; kind: FailureKind };

async function loadInquiries(access: AdminAccess, query: AdminListQuery): Promise<InquiriesLoad> {
  try {
    return { status: "ok", data: await new AdminOperationsService({ authorize: async () => access }).listInquiries(query) };
  } catch (error) {
    return { status: "unavailable", kind: recordAdminPageFailure(error, "page:/admin/inquiries", { op: "list", page: String(query.page) }) };
  }
}
function Summary({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>; }
function InquiryRow({ item, returnTo }: Readonly<{ item: AdminInquiryRow; returnTo: string }>) { return <tr><th className="px-5 py-4 align-top font-medium" scope="row"><Link className="font-mono text-sm text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/inquiries/${item.id}`, returnTo)}>{item.referenceNumber}</Link><span className="mt-1 block text-xs font-normal text-muted-foreground">{item.company ?? "Tanpa perusahaan"}</span></th><td className="px-5 py-4 align-top"><span className="block font-medium">{item.name}</span><span className="mt-1 block text-xs text-muted-foreground">{item.email}</span></td><td className="px-5 py-4 align-top">{formatStatus(item.currentStage)}</td><td className="px-5 py-4 align-top"><span className="rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{formatStatus(item.status)}</span></td><td className="px-5 py-4 align-top text-muted-foreground">{item.targetDeadline ? dateFormatter.format(item.targetDeadline) : "—"}</td><td className="px-5 py-4 text-right align-top text-xs text-muted-foreground">{dateFormatter.format(item.updatedAt)}</td></tr>; }
function InquiryCard({ item, returnTo }: Readonly<{ item: AdminInquiryRow; returnTo: string }>) {
  return (
    <article aria-labelledby={`inquiry-${item.id}`} className="min-w-0 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold" id={`inquiry-${item.id}`}>
            <Link className="break-words font-mono text-sm text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/inquiries/${item.id}`, returnTo)}>
              {item.referenceNumber}
            </Link>
          </h3>
          <p className="mt-1 break-words text-sm text-muted-foreground">{item.company ?? "Tanpa perusahaan"}</p>
        </div>
        <span className="inline-flex rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{formatStatus(item.status)}</span>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Prospek</dt><dd className="mt-1 break-words font-medium">{item.name}</dd><dd className="break-words text-xs text-muted-foreground">{item.email}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Stage</dt><dd className="mt-1 font-medium">{formatStatus(item.currentStage)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Deadline</dt><dd className="mt-1 text-muted-foreground">{item.targetDeadline ? dateFormatter.format(item.targetDeadline) : "—"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Diperbarui</dt><dd className="mt-1 text-muted-foreground">{dateFormatter.format(item.updatedAt)}</dd></div>
      </dl>
    </article>
  );
}
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
