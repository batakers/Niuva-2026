import Link from "next/link";
import type { ActionQueueGroup, ActionQueueItem } from "@/modules/admin/action-queue";
import { ACTION_QUEUE_GROUPS } from "@/modules/admin/action-queue";

const groupLabels: Record<ActionQueueGroup, string> = {
  all: "Semua",
  inquiries: "B2B Inquiries",
  "custom-print": "Custom Print",
  orders: "Orders",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function formatAdminDate(value: Date): string {
  return dateFormatter.format(value);
}

export function WorkGroupFilters({
  basePath,
  group,
}: Readonly<{ basePath: string; group: ActionQueueGroup }>) {
  return (
    <nav aria-label="Filter kelompok pekerjaan" className="flex flex-wrap gap-2">
      {ACTION_QUEUE_GROUPS.map((option) => (
        <Link
          aria-current={option === group ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${option === group ? "border-brand-700 bg-brand-50 text-brand-900" : "border-border bg-card text-foreground hover:border-brand-400 hover:bg-muted"}`}
          href={option === "all" ? basePath : `${basePath}?group=${option}`}
          key={option}
        >
          {groupLabels[option]}
        </Link>
      ))}
    </nav>
  );
}

export function AdminWorkList({
  items,
  emptyMessage = "Belum ada pekerjaan pada kelompok ini.",
}: Readonly<{ items: readonly ActionQueueItem[]; emptyMessage?: string }>) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6" role="status">
        <p className="font-semibold">{emptyMessage}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Pekerjaan baru akan muncul saat status operasional berubah.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Pekerjaan operasional Niuva</caption>
          <thead className="border-b border-border bg-muted text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium" scope="col">Pekerjaan</th>
              <th className="px-5 py-3 font-medium" scope="col">Referensi</th>
              <th className="px-5 py-3 font-medium" scope="col">Tindakan berikutnya</th>
              <th className="px-5 py-3 text-right font-medium" scope="col">Diperbarui</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <th className="px-5 py-4 align-top font-medium" scope="row">
                  <span className="block">{item.title}</span>
                  <AttentionLabel item={item} />
                </th>
                <td className="px-5 py-4 align-top"><WorkLink item={item} /></td>
                <td className="px-5 py-4 align-top text-muted-foreground">{item.nextAction}</td>
                <td className="px-5 py-4 text-right align-top text-xs text-muted-foreground">
                  <time dateTime={item.sourceUpdatedAt.toISOString()}>{formatAdminDate(item.sourceUpdatedAt)}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul aria-label="Pekerjaan operasional Niuva" className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <li className="min-w-0 rounded-xl border border-border bg-card p-4" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <strong className="text-sm font-semibold">{item.title}</strong>
              <AttentionLabel item={item} />
            </div>
            <p className="mt-3"><WorkLink item={item} /></p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.nextAction}</p>
            <time className="mt-2 block text-xs text-muted-foreground" dateTime={item.sourceUpdatedAt.toISOString()}>{formatAdminDate(item.sourceUpdatedAt)}</time>
          </li>
        ))}
      </ul>
    </>
  );
}

function WorkLink({ item }: Readonly<{ item: ActionQueueItem }>) {
  return (
    <Link className="inline-flex min-h-11 max-w-full items-center break-all font-mono text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href}>
      {item.reference}
    </Link>
  );
}

function AttentionLabel({ item }: Readonly<{ item: ActionQueueItem }>) {
  return (
    <span className={`mt-1 inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${item.attention === "EXCEPTION" ? "border-warning-border bg-warning-background text-warning" : "border-info-border bg-info-background text-info"}`}>
      {item.attention === "EXCEPTION" ? "Exception" : "Perlu tindakan"}
    </span>
  );
}
