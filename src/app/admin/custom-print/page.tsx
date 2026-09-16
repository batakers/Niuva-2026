import type { Metadata } from "next";
import { connection } from "next/server";

import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, type AdminCustomPrintRequestRow } from "@/modules/admin/operations";

export const metadata: Metadata = {
  title: "Custom Print admin · Niuva",
  robots: { follow: false, index: false },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function AdminCustomPrintPage() {
  await connection();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;

  const result = await loadCustomPrintRequests(access);
  if (result === null) return <AdminDataUnavailableView role={access.profile.role} title="Request custom print belum dapat dimuat" />;
  const waitingReview = result.items.filter((item) => item.status === "SUBMITTED").length;
  const waitingQuote = result.items.filter((item) => item.status === "QUOTE_READY").length;

  return (
      <AdminShell active="custom-print" role={result.role}>
        <main id="main-content" data-admin-surface="custom-print">
          <header className="border-b border-border pb-6">
            <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Custom Print Review</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Baca request, status file privat, dan quote terakhir dari satu antrean operator. Detail file tidak pernah menjadi URL publik.
            </p>
          </header>

          <section aria-label="Ringkasan custom print" className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Total request" value={String(result.items.length)} />
            <SummaryCard label="Menunggu review" value={String(waitingReview)} />
            <SummaryCard label="Siap dibuatkan quote" value={String(waitingQuote)} />
          </section>

          <section className="mt-8" aria-labelledby="custom-print-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold" id="custom-print-list-title">Request terbaru</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Review detail dan pembuatan quote mengikuti permission serta service server.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">Dibaca {dateFormatter.format(result.generatedAt)}</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6"><StatusNotice tone="info" title="Belum ada request custom print." description="Request baru akan muncul setelah upload privat dan submission berhasil diverifikasi server." /></div>
            ) : (
              <div className="mt-6 grid gap-4">
                {result.items.map((item) => <RequestCard item={item} key={item.id} />)}
              </div>
            )}
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

async function loadCustomPrintRequests(access: AdminAccess): Promise<Awaited<ReturnType<AdminOperationsService["listCustomPrintRequests"]>> | null> {
  try {
    return await new AdminOperationsService({ authorize: async () => access }).listCustomPrintRequests();
  } catch {
    return null;
  }
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function RequestCard({ item }: Readonly<{ item: AdminCustomPrintRequestRow }>) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold">{item.referenceNumber}</p>
          <h3 className="mt-2 text-lg font-semibold">{item.customerName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.customerEmail}</p>
        </div>
        <span className="inline-flex rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{formatStatus(item.status)}</span>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Material diminta</dt><dd className="mt-1 font-medium">{item.materialRequested}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Jumlah</dt><dd className="mt-1 font-medium tabular-nums">{item.quantity} unit</dd></div>
        <div><dt className="text-xs text-muted-foreground">File privat</dt><dd className="mt-1 font-medium">{item.fileCount} file terverifikasi</dd></div>
        <div><dt className="text-xs text-muted-foreground">Quote terakhir</dt><dd className="mt-1 font-medium">{item.latestQuote ? `${item.latestQuote.quoteNumber} · v${item.latestQuote.version}` : "Belum ada"}</dd></div>
      </dl>
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Diperbarui {dateFormatter.format(item.updatedAt)}. Form review dan aksi quote akan memakai service server terotorisasi pada detail berikutnya.</p>
    </article>
  );
}

function formatStatus(value: string): string {
  return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
