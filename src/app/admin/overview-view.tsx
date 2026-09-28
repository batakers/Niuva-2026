import Link from "next/link";
import { BriefcaseBusiness, CreditCard, Eye, Printer, type LucideIcon } from "lucide-react";
import type { AdminRole } from "@/generated/prisma/client";
import type { ActionQueueResult } from "@/modules/admin/action-queue";
import type { DashboardResult } from "@/modules/admin/dashboard";
import type { ReportRange } from "@/modules/analytics/contract";
import type { AnalyticsReport, Breakdown, ReportPoint } from "@/modules/analytics/service";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminWorkList, formatAdminDate, WorkGroupFilters } from "./admin-work-list";

const formatCount = (value: number): string => new Intl.NumberFormat("id-ID").format(value);
const visibleWorkLimit = 8;

const sourceLabels: Record<string, string> = {
  direct: "Langsung", internal: "Internal Niuva", google: "Google",
  bing: "Bing", instagram: "Instagram", facebook: "Facebook",
  youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn",
  other_referral: "Rujukan lain",
};
const deviceLabels: Record<string, string> = {
  desktop: "Desktop", tablet: "Tablet", mobile: "Ponsel", unknown: "Tidak diketahui",
};
const routeLabels: Record<string, string> = {
  home: "Beranda", services: "Layanan", service_detail: "Detail layanan",
  projects: "Proyek", project_detail: "Detail proyek", shop: "Shop",
  product_detail: "Detail produk", custom_print: "Custom Print",
  custom_request: "Form Custom Print", project_brief: "Brief proyek",
};
const regionNames = new Intl.DisplayNames(["id-ID"], { type: "region" });
const countryLabel = (code: string): string =>
  code === "ZZ" ? "Tidak diketahui" : regionNames.of(code) ?? code;

export function AdminOverviewView({
  analytics,
  dashboard,
  queue,
  range,
  role,
}: Readonly<{
  analytics: AnalyticsReport | null;
  dashboard: DashboardResult;
  queue: ActionQueueResult;
  range: ReportRange;
  role: AdminRole;
}>) {
  const work = queue.items.slice(0, visibleWorkLimit);
  const metrics = [
    {
      label: "Tayangan halaman", value: analytics?.traffic?.pageViews,
      note: analytics?.collectionEnabled ? "Perkiraan dari route publik" : "Pengumpulan belum aktif",
      href: "#admin-traffic-title", icon: Eye,
    },
    {
      label: "Brief B2B masuk", value: analytics?.business?.briefs,
      note: "Brief dibuat pada periode ini", href: "/admin/inquiries", icon: BriefcaseBusiness,
    },
    {
      label: "Custom print masuk", value: analytics?.business?.customPrint,
      note: "Permintaan dibuat pada periode ini", href: "/admin/custom-print", icon: Printer,
    },
    {
      label: "Order dibayar", value: analytics?.business?.paidOrders,
      note: "Berdasarkan waktu pembayaran", href: "/admin/orders", icon: CreditCard,
    },
  ] satisfies ReadonlyArray<{
    label: string; value: number | undefined; note: string; href: string; icon: LucideIcon;
  }>;

  return (
    <AdminShell active="overview" role={role}>
      <main className="min-w-0 space-y-5" data-admin-surface="overview" id="main-content">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Traffic publik dan hasil bisnis, berdampingan dengan pekerjaan yang perlu perhatian.</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <nav aria-label="Periode laporan" className="inline-flex rounded-lg border border-border bg-card p-1">
              {(["30d", "13m"] as const).map((option) => (
                <Link
                  aria-current={option === range ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${option === range ? "bg-brand-100 text-brand-900" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  href={overviewHref(option, queue.group)}
                  key={option}
                >
                  {option === "30d" ? "30 hari" : "13 bulan"}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-muted-foreground">Diperbarui <time dateTime={dashboard.generatedAt.toISOString()}>{formatAdminDate(dashboard.generatedAt)}</time></p>
          </div>
        </header>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <section aria-label="Metrik periode terpilih" className="grid min-w-0 gap-3 sm:grid-cols-2 xl:col-start-1 xl:row-start-1 xl:grid-cols-4">
            {metrics.map((metric) => <MetricCard {...metric} key={metric.label} />)}
          </section>

          <aside aria-label="Prioritas operasional" className="min-w-0 rounded-xl border border-border bg-card p-5 xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perlu ditindaklanjuti</p>
            <div className="mt-2 flex items-end gap-2">
              <strong className="text-4xl font-semibold tabular-nums text-brand-900">{formatCount(queue.totalOpen)}</strong>
              <span className="pb-1 text-sm text-muted-foreground">pekerjaan terbuka</span>
            </div>
            <div className="mt-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Prioritas sekarang</h2>
                <Link className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/queue">Lihat semua</Link>
              </div>
              {queue.priorityItems.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground" role="status">Belum ada pekerjaan yang perlu ditindaklanjuti.</p>
              ) : (
                <ol className="divide-y divide-border">
                  {queue.priorityItems.map((item, index) => (
                    <li className="flex min-w-0 gap-3 py-3" key={item.id}>
                      <span aria-hidden="true" className="pt-0.5 text-xs font-semibold tabular-nums text-brand-700">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <Link className="block break-words text-sm font-semibold leading-5 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href}>{item.title}</Link>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{item.reference}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.attention === "EXCEPTION" ? "Exception · " : ""}{formatAdminDate(item.sourceUpdatedAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <h2 className="text-base font-semibold">Aktivitas harian terbaru</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Record operasional dibuat, waktu Jakarta.</p>
              <ol className="mt-2 divide-y divide-border">
                {dashboard.activity.slice(-5).reverse().map((day) => (
                  <li className="py-2 text-xs" key={day.date}>
                    <span className="font-semibold">{day.date}</span>
                    <span className="mt-1 block text-muted-foreground">{day.inquiries} brief · {day.customPrint} custom · {day.orders} order dibuat</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-2">
            {analytics?.traffic === null || analytics === null ? (
              <p className="rounded-xl border border-warning-border bg-warning-background p-4 text-sm text-warning" role="alert">Data traffic belum dapat dimuat. Metrik operasional dan Action Queue tetap tersedia.</p>
            ) : null}
            {analytics?.business === null || analytics === null ? (
              <p className="rounded-xl border border-warning-border bg-warning-background p-4 text-sm text-warning" role="alert">Jumlah hasil bisnis periode ini belum dapat dimuat. Coba muat ulang untuk memperbarui laporan.</p>
            ) : null}
            <TrafficTrend report={analytics} />
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <BreakdownCard title="Sumber masuk" description="Hanya tayangan pertama saat halaman dimuat; bukan atribusi order." data={analytics?.traffic?.sources ?? []} label={(key) => sourceLabels[key] ?? key} />
              <BreakdownCard title="Perangkat" description="Kategori kasar dari browser, tanpa ID pengunjung." data={analytics?.traffic?.devices ?? []} label={(key) => deviceLabels[key] ?? key} />
              <BreakdownCard title="Negara" description="Dari header lokasi bila tersedia." data={analytics?.traffic?.countries ?? []} label={countryLabel} />
              <BreakdownCard title="Kelompok halaman" description="Tayangan route publik yang diizinkan." data={analytics?.traffic?.routes ?? []} label={(key) => routeLabels[key] ?? key} />
            </div>
            <BusinessActivity report={analytics} />
            <section aria-labelledby="admin-work-title" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold" id="admin-work-title">Pekerjaan yang perlu perhatian</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{queue.filteredTotal} pekerjaan pada kelompok ini · {queue.totalOpen} terbuka seluruhnya.</p>
                </div>
                <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={queue.group === "all" ? "/admin/queue" : `/admin/queue?group=${queue.group}`}>Buka Action Queue</Link>
              </div>
              <div className="mt-4"><WorkGroupFilters basePath="/admin" group={queue.group} range={range} /></div>
              <div className="mt-4"><AdminWorkList emptyMessage={queue.totalOpen === 0 ? "Antrean pekerjaan sedang kosong." : undefined} items={work} /></div>
              {queue.filteredTotal > work.length ? <p className="mt-4 text-xs text-muted-foreground">Menampilkan {work.length} dari {queue.filteredTotal} pekerjaan. Buka Action Queue untuk melihat lebih banyak.</p> : null}
            </section>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}

function overviewHref(range: ReportRange, group: ActionQueueResult["group"]): string {
  const params = new URLSearchParams();
  if (range !== "30d") params.set("range", range);
  if (group !== "all") params.set("group", group);
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

function MetricCard({ label, value, note, href, icon: Icon }: Readonly<{
  label: string; value: number | undefined; note: string; href: string; icon: LucideIcon;
}>) {
  return (
    <Link className="flex min-h-36 min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={href}>
      <span className="flex items-start justify-between gap-2 text-xs font-medium leading-5 text-muted-foreground">
        {label}<Icon aria-hidden="true" className="size-4 shrink-0 text-brand-700" />
      </span>
      <strong className="mt-3 block text-3xl font-semibold tabular-nums tracking-tight">{value === undefined ? "—" : formatCount(value)}</strong>
      <span className="mt-auto pt-2 text-xs leading-4 text-muted-foreground">{value === undefined ? "Data belum tersedia" : note}</span>
    </Link>
  );
}

function TrafficTrend({ report }: Readonly<{ report: AnalyticsReport | null }>) {
  const points = report?.traffic?.points ?? [];
  const max = Math.max(1, ...points.map((point) => point.pageViews));
  const coordinates = points.map((point, index) => ({
    x: points.length <= 1 ? 0 : index * 620 / (points.length - 1),
    y: 160 - point.pageViews * 138 / max,
  }));
  const line = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const fill = coordinates.length ? `${line} L620 160 L0 160 Z` : "";
  return (
    <section aria-labelledby="admin-traffic-title" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" id="admin-traffic-title">Tren tayangan halaman</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{report?.range === "13m" ? "Per bulan" : "Per hari"} kalender Asia/Jakarta · hanya route publik.</p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-brand-900">{report?.traffic ? formatCount(report.traffic.pageViews) : "—"} tayangan</p>
      </div>
      {report?.traffic?.pageViews ? (
        <>
          <div className="mt-5 h-44 w-full" aria-hidden="true">
            <svg className="h-full w-full" viewBox="0 0 620 180" preserveAspectRatio="none">
              {[22, 68, 114, 160].map((y) => <line key={y} x1="0" x2="620" y1={y} y2={y} stroke="var(--neutral-200)" strokeDasharray="4 5" />)}
              <path d={fill} fill="var(--brand-100)" opacity="0.8" />
              <path d={line} fill="none" stroke="var(--brand-700)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{points[0]?.key}</span><span>{points[Math.floor(points.length / 2)]?.key}</span><span>{points.at(-1)?.key}</span>
          </div>
        </>
      ) : <p className="mt-5 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground" role="status">Belum ada tayangan tercatat pada periode ini.</p>}
      <div className="sr-only">
        <table>
          <caption>Jumlah tayangan halaman menurut {report?.range === "13m" ? "bulan" : "tanggal"} Jakarta</caption>
          <thead><tr><th scope="col">Periode</th><th scope="col">Tayangan</th></tr></thead>
          <tbody>{points.map((point) => <tr key={point.key}><th scope="row">{point.key}</th><td>{point.pageViews}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Angka perkiraan: bot dan pemblokir dapat memengaruhi hitungan. Tidak menunjukkan pengunjung unik atau asal order.</p>
    </section>
  );
}

function BreakdownCard({ title, description, data, label }: Readonly<{
  title: string; description: string; data: readonly Breakdown[]; label: (key: string) => string;
}>) {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      {data.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Belum ada data pada periode ini.</p> : (
        <ol className="mt-5 space-y-3">
          {data.slice(0, 5).map((item) => (
            <li key={item.key}>
              <div className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate">{label(item.key)}</span><strong className="tabular-nums">{formatCount(item.count)}</strong></div>
              <div aria-hidden="true" className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand-600" style={{ width: `${item.count / max * 100}%` }} /></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BusinessActivity({ report }: Readonly<{ report: AnalyticsReport | null }>) {
  const points = report?.business?.points ?? [];
  const recent = points.slice(report?.range === "13m" ? -6 : -7).reverse();
  return (
    <section aria-labelledby="admin-business-title" className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-semibold" id="admin-business-title">Aktivitas bisnis</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Hasil database per {report?.range === "13m" ? "bulan" : "hari"}; order dihitung pada paidAt meski statusnya sudah berlanjut.</p>
      {recent.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Data bisnis belum tersedia.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[27rem] text-left text-sm">
            <caption className="sr-only">Jumlah brief, permintaan custom print, dan order dibayar per periode</caption>
            <thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="py-2" scope="col">Periode</th><th className="py-2 text-right" scope="col">Brief</th><th className="py-2 text-right" scope="col">Custom print</th><th className="py-2 text-right" scope="col">Order dibayar</th></tr></thead>
            <tbody className="divide-y divide-border">{recent.map((point: ReportPoint) => <tr key={point.key}><th className="py-2 font-medium" scope="row">{point.key}</th><td className="py-2 text-right tabular-nums">{point.briefs}</td><td className="py-2 text-right tabular-nums">{point.customPrint}</td><td className="py-2 text-right tabular-nums">{point.paidOrders}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
