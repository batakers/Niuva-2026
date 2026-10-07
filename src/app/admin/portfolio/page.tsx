import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AdminPageHeader } from "../admin-page-header";
import { AdminListControls } from "../admin-list-controls";
import { parseAdminListQuery, adminListQueryParams, type AdminListQuery } from "@/modules/admin/list-query";
import { buildAdminPageHref, withAdminReturnTo } from "@/modules/admin/navigation";

import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { StatusNotice } from "@/components/niuva/status-notice";
import type { AdminAccess } from "@/lib/auth/admin";
import type { FailureKind } from "@/lib/observability/logger";
import { AdminOperationsService, type AdminPortfolioRow } from "@/modules/admin/operations";
import { isApprovedCardOnlyPortfolioProject } from "@/modules/portfolio/public-content";

export const metadata: Metadata = {
  title: "Portfolio admin · Niuva",
  robots: { follow: false, index: false },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function AdminPortfolioPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const query = parseAdminListQuery("portfolio", await searchParams);
  const queryParams = adminListQueryParams(query);
  const returnTo = buildAdminPageHref("/admin/portfolio", queryParams, query.page);
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;

  const loaded = await loadPortfolio(access, query);
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="portfolio" kind={loaded.kind} role={access.profile.role} title="Portfolio belum dapat dimuat" />;
  const result = loaded.data;
  const published = result.items.filter((item) => item.isPublished).length;
  const featured = result.items.filter((item) => item.isFeatured).length;

  return (
      <AdminShell active="portfolio" role={result.role}>
        <main id="main-content" data-admin-surface="portfolio">
          <AdminPageHeader title="Portfolio" description="Cari proyek dan pantau publikasi. Buka editor untuk memperbarui konten dan media yang sudah disetujui." breadcrumbs={[{ label: "Portfolio" }]} />
          <AdminListControls area="portfolio" query={query} />

          <section aria-label="Ringkasan portfolio" className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Hasil filter" value={String(result.filteredTotal)} />
            <SummaryCard label="Published di halaman ini" value={String(published)} />
            <SummaryCard label="Featured di halaman ini" value={String(featured)} />
          </section>

          <section className="mt-8" aria-labelledby="portfolio-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold" id="portfolio-list-title">Project proof</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Featured project memerlukan konteks, hasil, media, alt text, dan izin publikasi. Selected Works card-only dapat published dengan ringkasan Owner-approved tanpa media.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">{result.filteredTotal} hasil filter</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6"><StatusNotice tone="info" title="Belum ada project di database." description="Tambahkan project dengan bukti dan izin publikasi yang jelas sebelum menampilkannya di homepage atau Projects." /></div>
            ) : (
              <div className="mt-6 grid gap-4">
                {result.items.map((item) => <PortfolioCard item={item} key={item.id} returnTo={returnTo} />)}
              </div>
            )}
            <AdminPagination basePath="/admin/portfolio" hasNext={result.hasNext} page={result.page} query={queryParams} />
          </section>
        </main>
      </AdminShell>
  );
}

type PortfolioLoad =
  | { status: "ok"; data: Awaited<ReturnType<AdminOperationsService["listPortfolio"]>> }
  | { status: "unavailable"; kind: FailureKind };

async function loadPortfolio(access: AdminAccess, query: AdminListQuery): Promise<PortfolioLoad> {
  try {
    return { status: "ok", data: await new AdminOperationsService({ authorize: async () => access }).listPortfolio(query) };
  } catch (error) {
    return { status: "unavailable", kind: recordAdminPageFailure(error, "page:/admin/portfolio", { op: "list", page: String(query.page) }) };
  }
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function PortfolioCard({ item, returnTo }: Readonly<{ item: AdminPortfolioRow; returnTo: string }>) {
  const isCardOnly = isApprovedCardOnlyPortfolioProject(item);

  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">{item.serviceLabel}</p>
          <h3 className="mt-2 text-lg font-semibold"><Link className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/portfolio/${item.id}`, returnTo)}>{item.title}</Link></h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.clientName ?? "Client tidak ditampilkan"}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className={item.isPublished ? "rounded-md border border-success-border bg-success-background px-2.5 py-1 text-success" : "rounded-md border border-warning-border bg-warning-background px-2.5 py-1 text-warning"}>{item.isPublished ? "Published" : "Draft"}</span>
          {item.isFeatured ? <span className="rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-brand-800">Featured</span> : null}
          {isCardOnly ? <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-muted-foreground">Card-only</span> : null}
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{item.summary}</p>
      <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-muted-foreground">Media</dt><dd className="mt-1 font-medium">{item.mediaCount} file dengan alt text</dd></div>
        <div><dt className="text-xs text-muted-foreground">Slug</dt><dd className="mt-1 break-words font-mono text-xs">{item.slug}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Diperbarui</dt><dd className="mt-1 text-muted-foreground">{dateFormatter.format(item.updatedAt)}</dd></div>
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted-foreground"><Link className="font-semibold text-brand-700 underline-offset-4 hover:underline" href={withAdminReturnTo(`/admin/portfolio/${item.id}`, returnTo)}>Buka editor project</Link>. {isCardOnly ? "Card-only memakai ringkasan publik; media dapat ditambahkan kemudian jika asetnya disetujui." : "Publish action tetap memerlukan pengecekan izin dan kelengkapan bukti."}</p>
    </article>
  );
}
