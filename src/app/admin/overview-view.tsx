import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/client";
import type { ActionQueueResult } from "@/modules/admin/action-queue";
import type { DashboardDay, DashboardResult } from "@/modules/admin/dashboard";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminWorkList, formatAdminDate, WorkGroupFilters } from "./admin-work-list";

const visibleWorkLimit = 8;

export function AdminOverviewView({
  dashboard,
  queue,
  role,
}: Readonly<{
  dashboard: DashboardResult;
  queue: ActionQueueResult;
  role: AdminRole;
}>) {
  const metrics = [
    { label: "Pekerjaan terbuka", value: queue.totalOpen, note: "Semua sinyal aktif", href: "/admin/queue" },
    { label: "Inquiry baru", value: dashboard.newInquiries, note: "Status NEW", href: "/admin/inquiries" },
    { label: "Custom print", value: dashboard.submittedCustomPrint, note: "Status SUBMITTED", href: "/admin/custom-print" },
    { label: "Order dibayar", value: dashboard.paidOrders, note: "Status PAID", href: "/admin/orders" },
  ] as const;
  const work = queue.items.slice(0, visibleWorkLimit);

  return (
    <AdminShell active="overview" role={role}>
      <main className="space-y-6" data-admin-surface="overview" id="main-content">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Ringkasan pekerjaan dan aktivitas operasional Niuva.</p>
          </div>
          <p className="text-xs text-muted-foreground">Diperbarui <time dateTime={dashboard.generatedAt.toISOString()}>{formatAdminDate(dashboard.generatedAt)}</time></p>
        </header>

        <section aria-label="Ringkasan operasional" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link className="min-w-0 rounded-xl border border-border bg-card p-4 transition-colors hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={metric.href} key={metric.label}>
              <span className="flex items-start justify-between gap-2 text-sm font-medium">{metric.label}<span aria-hidden="true" className="text-brand-700">↗</span></span>
              <strong className="mt-4 block text-3xl font-semibold tabular-nums">{metric.value}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">{metric.note}</span>
            </Link>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.85fr)]">
          <ActivityChart days={dashboard.activity} />
          <section aria-labelledby="admin-priority-title" className="min-w-0 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold" id="admin-priority-title">Prioritas sekarang</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Lima teratas menurut urutan Action Queue.</p>
              </div>
              <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/queue">Lihat semua</Link>
            </div>
            {queue.priorityItems.length === 0 ? (
              <p className="mt-5 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground" role="status">Belum ada pekerjaan yang perlu ditindaklanjuti.</p>
            ) : (
              <ol className="mt-2 divide-y divide-border">
                {queue.priorityItems.map((item, index) => (
                  <li className="flex min-w-0 gap-3 py-3" key={item.id}>
                    <span aria-hidden="true" className="w-5 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}.</span>
                    <div className="min-w-0">
                      <Link className="break-words text-sm font-semibold text-foreground underline-offset-4 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href}>{item.title}</Link>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.reference}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.attention === "EXCEPTION" ? "Exception · " : ""}{formatAdminDate(item.sourceUpdatedAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section aria-labelledby="admin-work-title" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold" id="admin-work-title">Pekerjaan yang perlu perhatian</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{queue.filteredTotal} pekerjaan pada kelompok ini · {queue.totalOpen} terbuka seluruhnya.</p>
            </div>
            <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={queue.group === "all" ? "/admin/queue" : `/admin/queue?group=${queue.group}`}>Buka Action Queue</Link>
          </div>
          <div className="mt-4"><WorkGroupFilters basePath="/admin" group={queue.group} /></div>
          <div className="mt-4"><AdminWorkList emptyMessage={queue.totalOpen === 0 ? "Antrean pekerjaan sedang kosong." : undefined} items={work} /></div>
          {queue.filteredTotal > work.length ? <p className="mt-4 text-xs text-muted-foreground">Menampilkan {work.length} dari {queue.filteredTotal} pekerjaan. Buka Action Queue untuk melihat lebih banyak.</p> : null}
        </section>
      </main>
    </AdminShell>
  );
}

function ActivityChart({ days }: Readonly<{ days: readonly DashboardDay[] }>) {
  const max = Math.max(1, ...days.flatMap((day) => [day.inquiries, day.customPrint, day.orders]));
  const series = [
    { key: "inquiries", label: "Brief dibuat", className: "bg-brand-700" },
    { key: "customPrint", label: "Permintaan custom dibuat", className: "bg-info" },
    { key: "orders", label: "Order dibuat", className: "bg-neutral-500" },
  ] as const;

  return (
    <section aria-labelledby="admin-activity-title" className="min-w-0 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold" id="admin-activity-title">Aktivitas 30 hari</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Jumlah record dibuat per hari kalender, Asia/Jakarta. Termasuk hari ini.</p>
      <div aria-hidden="true" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {series.map((item) => <span className="inline-flex items-center gap-2" key={item.key}><span className={`size-2.5 rounded-sm ${item.className}`} />{item.label}</span>)}
      </div>
      <div className="mt-5 overflow-x-auto pb-2">
        <div aria-hidden="true" className="grid min-w-[38rem] grid-cols-[repeat(30,minmax(0,1fr))] items-end gap-1 border-b border-border pb-2">
          {days.map((day, index) => (
            <div className="flex h-32 items-end justify-center gap-px" key={day.date} title={`${day.date}: ${day.inquiries} brief, ${day.customPrint} custom, ${day.orders} order`}>
              {series.map((item) => <span className={`w-1.5 rounded-t-sm ${item.className}`} key={item.key} style={{ height: day[item.key] === 0 ? 0 : `${Math.max(4, Math.round(day[item.key] / max * 116))}px` }} />)}
              {index % 5 === 0 ? <span className="sr-only">{day.date}</span> : null}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-2 flex min-w-[38rem] justify-between text-[10px] text-muted-foreground"><span>{days[0]?.date.slice(5)}</span><span>{days[14]?.date.slice(5)}</span><span>{days[29]?.date.slice(5)}</span></div>
      </div>
      <table className="sr-only">
        <caption>Jumlah brief, permintaan custom print, dan order yang dibuat selama 30 hari</caption>
        <thead><tr><th scope="col">Tanggal Jakarta</th><th scope="col">Brief</th><th scope="col">Custom print</th><th scope="col">Order</th></tr></thead>
        <tbody>{days.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.inquiries}</td><td>{day.customPrint}</td><td>{day.orders}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
