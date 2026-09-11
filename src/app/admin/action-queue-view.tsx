import type { AdminRole } from "@/generated/prisma/client";

import type {
  ActionQueueItem,
  ActionQueueResult,
} from "@/modules/admin/action-queue";

type AdminActionQueueViewProps = Readonly<{
  result: ActionQueueResult;
  role: AdminRole;
}>;

type AdminActionQueueErrorViewProps = Readonly<{
  role: AdminRole;
}>;

const ROLE_LABELS = {
  ADMIN: "Admin",
  OWNER: "Owner",
} satisfies Record<AdminRole, string>;

const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function AdminActionQueueView({
  result,
  role,
}: AdminActionQueueViewProps) {
  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      id="main-content"
    >
      <header className="max-w-3xl border-b border-border pb-6">
        <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Action Queue
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Daftar pekerjaan operasional yang perlu Anda tindak lanjuti.
        </p>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Anda masuk sebagai{" "}
          <strong className="font-semibold text-foreground">
            {ROLE_LABELS[role]}
          </strong>
          .
        </p>
      </header>

      <section
        aria-labelledby="action-queue-list-title"
        className="mt-8 max-w-4xl"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 id="action-queue-list-title" className="text-xl font-semibold">
              Pekerjaan yang perlu perhatian
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Status ini berasal dari layanan server Niuva dan dapat berubah
              setelah pekerjaan diproses.
            </p>
          </div>
          <p className="text-sm text-muted-foreground" role="status">
            {result.items.length} pekerjaan
          </p>
        </div>

        {result.items.length === 0 ? (
          <div
            className="mt-6 rounded-xl border border-border bg-card p-6"
            role="status"
          >
            <p className="font-semibold">Tidak ada pekerjaan yang perlu ditinjau.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Antrean akan terisi kembali saat ada status operasional baru dari
              layanan server.
            </p>
          </div>
        ) : (
          <ol
            aria-label="Pekerjaan operasional"
            className="mt-6 divide-y divide-border rounded-xl border border-border bg-card"
          >
            {result.items.map((item) => (
              <ActionQueueRow item={item} key={item.id} />
            ))}
          </ol>
        )}

        <p className="mt-4 text-xs leading-5 text-muted-foreground" role="status">
          Data server dibuat{" "}
          <time dateTime={result.generatedAt.toISOString()}>
            {formatDate(result.generatedAt)}
          </time>
          .
        </p>
      </section>
    </main>
  );
}

export function AdminActionQueueErrorView({
  role,
}: AdminActionQueueErrorViewProps) {
  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      id="main-content"
    >
      <header className="max-w-3xl border-b border-border pb-6">
        <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          Action Queue belum dapat dimuat
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Anda masuk sebagai{" "}
          <strong className="font-semibold text-foreground">
            {ROLE_LABELS[role]}
          </strong>
          .
        </p>
      </header>

      <p
        className="mt-8 max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm leading-6 text-destructive"
        role="alert"
      >
        Data operasional belum dapat dimuat. Muat ulang halaman untuk mencoba
        lagi.
      </p>
    </main>
  );
}

function ActionQueueRow({ item }: Readonly<{ item: ActionQueueItem }>) {
  return (
    <li className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:p-6">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-700">
          {item.title}
        </p>
        <p className="mt-2 break-words font-mono text-sm text-foreground">
          {item.reference}
        </p>
      </div>
      <div className="min-w-0 sm:text-right">
        <p
          className={
            item.attention === "EXCEPTION"
              ? "text-xs font-semibold uppercase tracking-[0.12em] text-destructive"
              : "text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          }
        >
          {item.attention === "EXCEPTION" ? "Exception" : "Tindakan"}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
          {item.nextAction}
        </p>
        <time
          className="mt-2 block text-xs leading-5 text-muted-foreground"
          dateTime={item.sourceUpdatedAt.toISOString()}
        >
          Diperbarui {formatDate(item.sourceUpdatedAt)}
        </time>
      </div>
    </li>
  );
}

function formatDate(value: Date): string {
  return DATE_FORMATTER.format(value);
}
