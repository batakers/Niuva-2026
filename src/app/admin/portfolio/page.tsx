import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, parseAdminPage, type AdminPortfolioRow } from "@/modules/admin/operations";
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
}: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  await connection();
  const page = parseAdminPage((await searchParams).page);
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;

  const result = await loadPortfolio(access, page);
  if (result === null) return <AdminDataUnavailableView active="portfolio" role={access.profile.role} title="Portfolio belum dapat dimuat" />;
  const published = result.items.filter((item) => item.isPublished).length;
  const featured = result.items.filter((item) => item.isFeatured).length;

  return (
      <AdminShell active="portfolio" role={result.role}>
        <main id="main-content" data-admin-surface="portfolio">
          <header className="border-b border-border pb-6">
            <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Portfolio</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Kelola bukti proyek yang boleh tampil publik. Status publikasi, media, dan ringkasan di bawah tetap mengikuti record database serta izin yang sudah disetujui.
            </p>
          </header>

          <section aria-label="Ringkasan portfolio" className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Total project" value={String(result.items.length)} />
            <SummaryCard label="Published" value={String(published)} />
            <SummaryCard label="Featured" value={String(featured)} />
          </section>

          <section className="mt-8" aria-labelledby="portfolio-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold" id="portfolio-list-title">Project proof</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Featured project memerlukan konteks, hasil, media, alt text, dan izin publikasi. Selected Works card-only dapat published dengan ringkasan Owner-approved tanpa media.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">{result.items.length} project</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6"><StatusNotice tone="info" title="Belum ada project di database." description="Tambahkan project dengan bukti dan izin publikasi yang jelas sebelum menampilkannya di homepage atau Projects." /></div>
            ) : (
              <div className="mt-6 grid gap-4">
                {result.items.map((item) => <PortfolioCard item={item} key={item.id} />)}
              </div>
            )}
            <AdminPagination basePath="/admin/portfolio" hasNext={result.hasNext} page={result.page} />
          </section>
        </main>
      </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

async function loadPortfolio(access: AdminAccess, page: number): Promise<Awaited<ReturnType<AdminOperationsService["listPortfolio"]>> | null> {
  try {
    return await new AdminOperationsService({ authorize: async () => access }).listPortfolio({ page });
  } catch {
    return null;
  }
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function PortfolioCard({ item }: Readonly<{ item: AdminPortfolioRow }>) {
  const isCardOnly = isApprovedCardOnlyPortfolioProject(item);

  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">{item.serviceLabel}</p>
          <h3 className="mt-2 text-lg font-semibold"><Link className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/admin/portfolio/${item.id}`}>{item.title}</Link></h3>
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
      <p className="mt-4 text-xs leading-5 text-muted-foreground"><Link className="font-semibold text-brand-700 underline-offset-4 hover:underline" href={`/admin/portfolio/${item.id}`}>Buka editor project</Link>. {isCardOnly ? "Card-only memakai ringkasan publik; media dapat ditambahkan kemudian jika asetnya disetujui." : "Publish action tetap memerlukan pengecekan izin dan kelengkapan bukti."}</p>
    </article>
  );
}
