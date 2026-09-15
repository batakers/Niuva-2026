import type {
  ActionQueueItem,
  ActionQueueResult,
} from "@/modules/admin/action-queue";

import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function LocalDemoActionQueueView({
  result,
}: Readonly<{ result: ActionQueueResult }>) {
  return (
    <PublicShell functionalStatus="server-backed" scope="demo-action-queue">
      <main id="main-content" className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
        <header className="max-w-3xl border-b border-border pb-6">
          <p className="text-sm font-medium text-brand-700">Niuva / Demo lokal</p>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Action Queue demo
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Read-only projection dari database lokal untuk menunjukkan bahwa
            project brief yang baru dikirim masuk ke antrean operasional.
          </p>
          <p className="mt-4 rounded-lg border border-warning-border bg-warning-background p-4 text-sm leading-6 text-warning">
            Demo lokal · tidak menggantikan akses Clerk atau halaman Admin
            production. Tidak ada mutasi operasional dari halaman ini.
          </p>
        </header>

        <section aria-labelledby="demo-action-queue-title" className="mt-8 max-w-4xl">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 id="demo-action-queue-title" className="text-xl font-semibold">
                Pekerjaan yang perlu perhatian
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Hanya reference, status perhatian, dan tindakan berikutnya yang
                ditampilkan pada harness demo.
              </p>
            </div>
            <p className="text-sm text-muted-foreground" role="status">
              {result.items.length} pekerjaan
            </p>
          </div>

          {result.items.length === 0 ? (
            <div className="mt-6 rounded-xl border border-border bg-card p-6" role="status">
              <p className="font-semibold">Belum ada pekerjaan di demo.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Kirim project brief dari halaman publik, lalu muat ulang halaman
                ini untuk melihat reference baru.
              </p>
            </div>
          ) : (
            <ol aria-label="Pekerjaan operasional demo" className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
              {result.items.map((item) => (
                <DemoQueueRow item={item} key={item.id} />
              ))}
            </ol>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <AuLink href="/project-brief" variant="outline" className="min-h-11">Kirim brief lain</AuLink>
            <AuLink href="/shop" variant="outline" className="min-h-11">Lanjut ke katalog demo</AuLink>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground" role="status">
            Data lokal dibuat {DATE_FORMATTER.format(result.generatedAt)}.
          </p>
        </section>
      </main>
    </PublicShell>
  );
}

function DemoQueueRow({ item }: Readonly<{ item: ActionQueueItem }>) {
  return (
    <li className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:p-6" data-demo-queue-item data-reference={item.reference}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-700">
          {item.title}
        </p>
        <p className="mt-2 break-words font-mono text-sm text-foreground">
          {item.reference}
        </p>
      </div>
      <div className="min-w-0 sm:text-right">
        <p className={item.attention === "EXCEPTION" ? "text-xs font-semibold uppercase tracking-[0.12em] text-destructive" : "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"}>
          {item.attention === "EXCEPTION" ? "Exception" : "Tindakan"}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
          {item.nextAction}
        </p>
        <time className="mt-2 block text-xs leading-5 text-muted-foreground" dateTime={item.sourceUpdatedAt.toISOString()}>
          Diperbarui {DATE_FORMATTER.format(item.sourceUpdatedAt)}
        </time>
      </div>
    </li>
  );
}
