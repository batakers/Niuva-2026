import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/client";
import type { ActionQueueResult } from "@/modules/admin/action-queue";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminWorkList, formatAdminDate, WorkGroupFilters } from "./admin-work-list";

export function AdminActionQueueView({
  result,
  role,
}: Readonly<{ result: ActionQueueResult; role: AdminRole }>) {
  return (
    <AdminShell active="queue" role={role}>
      <main className="space-y-6" data-admin-surface="queue" id="main-content">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Action Queue</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Pekerjaan aktif yang memerlukan tindakan Owner atau Admin.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin">← Kembali ke Overview</Link>
        </header>
        <section aria-labelledby="queue-list-title" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" id="queue-list-title">Daftar pekerjaan</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{result.filteredTotal} pada kelompok ini · {result.totalOpen} terbuka seluruhnya. Maksimal 50 ditampilkan.</p>
            </div>
            <p className="text-xs text-muted-foreground">Dibaca <time dateTime={result.generatedAt.toISOString()}>{formatAdminDate(result.generatedAt)}</time></p>
          </div>
          <div className="mt-4"><WorkGroupFilters basePath="/admin/queue" group={result.group} /></div>
          <div className="mt-4"><AdminWorkList emptyMessage={result.totalOpen === 0 ? "Antrean pekerjaan sedang kosong." : undefined} items={result.items} /></div>
          {result.filteredTotal > result.items.length ? <p className="mt-4 text-xs text-muted-foreground">Menampilkan {result.items.length} dari {result.filteredTotal} pekerjaan pada kelompok ini.</p> : null}
        </section>
      </main>
    </AdminShell>
  );
}

export function AdminActionQueueErrorView({ role }: Readonly<{ role: AdminRole }>) {
  return (
    <AdminShell active="queue" role={role}>
      <main className="rounded-xl border border-destructive-border bg-card p-6 sm:p-8" data-admin-surface="queue-error" id="main-content">
        <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Action Queue belum dapat dimuat</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-destructive" role="alert">Sumber data operasional sedang tidak tersedia. Muat ulang halaman untuk mencoba lagi.</p>
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/queue">Muat ulang</Link>
      </main>
    </AdminShell>
  );
}
