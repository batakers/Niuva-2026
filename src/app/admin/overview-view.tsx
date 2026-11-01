import Link from "next/link";
import { Clock3, Printer, ShoppingBag, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminTrendChart } from "@/components/niuva/admin-trend-chart";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "./admin-page-header";
import type { AdminRole } from "@/generated/prisma/client";
import type { AdminOverviewData } from "@/modules/admin/overview-types";

const money = (value: string) => "Rp " + new Intl.NumberFormat("id-ID").format(BigInt(value));
const time = (value: string | Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));

export function AdminOverviewView({ data, role }: Readonly<{ data: AdminOverviewData; role: AdminRole }>) {
  const { range, attention, finance, paidOrders, activity, traffic } = data;
  const queue = attention.status === "ok" ? attention.data : null;
  const cards = [
    { title: "Custom Print perlu tindakan", value: queue?.summary.groups["custom-print"], href: "/admin/custom-print?view=needs-action", note: "Review, siapkan, atau kirim quote", icon: Printer, warn: false },
    { title: "Pesanan perlu tindakan", value: queue?.summary.groups.orders, href: "/admin/orders?view=needs-action", note: "Proses, ukur paket, atau periksa", icon: ShoppingBag, warn: false },
    { title: "Isu / perlu perhatian", value: queue?.summary.exceptions, href: queue?.summary.exceptions ? "#admin-issues" : "/admin/orders?view=issues", note: "Pembayaran dan pengiriman", icon: TriangleAlert, warn: Boolean(queue?.summary.exceptions) },
  ];

  return <AdminShell role={role} active="overview">
    <main id="main-content" data-admin-surface="overview" className="min-w-0 space-y-6">
      <AdminPageHeader title="Ringkasan" description="Pantau pekerjaan hari ini dan ringkasan bisnis Niuva." breadcrumbs={[{ label: "Ringkasan" }]} actions={
        <div className="flex flex-wrap gap-2">{(["30d", "13m"] as const).map(value =>
          <Button key={value} nativeButton={false} role="link" render={<Link href={value === "30d" ? "/admin" : "/admin?range=13m"} aria-current={range === value ? "page" : undefined} />} variant={range === value ? "default" : "outline"}>{value === "30d" ? "30 hari" : "13 bulan"}</Button>
        )}</div>
      } />
      <p className="flex items-start gap-2 text-caption leading-[1.45] text-muted-foreground"><Clock3 aria-hidden className="mt-0.5 size-4 shrink-0" /><span>Diperbarui {time(data.generatedAt)} WIB · Kartu perhatian menampilkan pekerjaan yang masih terbuka.</span></p>

      <section aria-label="Pekerjaan perlu perhatian saat ini" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(item => <Link key={item.title} href={item.href} className="group min-w-0 rounded-[var(--radius-card)] outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {/* Amber only when the card counts open issues; every other card stays neutral. */}
          <Card className={cn("h-full gap-3 transition-colors motion-reduce:transition-none", item.warn ? "border-warning-border group-hover:border-warning" : "group-hover:border-primary/50")}>
            <CardHeader>
              <CardTitle className="pr-2 text-ui font-medium leading-[1.4] tracking-normal">{item.title}</CardTitle>
              <CardAction><item.icon aria-hidden className={cn("size-5", item.warn ? "text-warning" : "text-muted-foreground")} /></CardAction>
            </CardHeader>
            <CardContent><p className="text-4xl font-medium tracking-[-0.02em] tabular-nums">{item.value ?? "—"}</p></CardContent>
            <CardContent className="mt-auto"><p className="text-caption leading-[1.45] text-muted-foreground">{item.note}</p></CardContent>
          </Card>
        </Link>)}
      </section>
      {attention.status === "unavailable" && <Alert role="status"><AlertDescription>{attention.message}</AlertDescription></Alert>}

      {queue && queue.summary.exceptions > 0 && <section id="admin-issues" aria-labelledby="issue-title">
        <Card className="border-warning-border">
          <CardHeader><CardTitle><h2 id="issue-title">Perlu pemeriksaan sekarang</h2></CardTitle><CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href="/admin/orders?view=issues" />}>Lihat semua isu</Button></CardAction></CardHeader>
          <CardContent><ul className="divide-y divide-border">{queue.priorityItems.filter(item => item.attention === "EXCEPTION").map(item => <li key={item.id}><Link href={item.href} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-sm py-3 text-ui outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"><span className="font-medium">{item.title}</span><Badge variant="outline">{item.reference}</Badge></Link></li>)}</ul></CardContent>
        </Card>
      </section>}

      <div className="grid min-w-0 items-start gap-6 xl:items-stretch xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section aria-labelledby="business-title" className="min-w-0">
          <Card className="xl:h-full">
            <CardHeader>
              <CardTitle><h2 id="business-title">Ringkasan bisnis</h2></CardTitle>
              <CardDescription>{range === "30d" ? "30 hari" : "13 bulan"} terakhir · tanggal transaksi, waktu Jakarta</CardDescription>
              <CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href={`/admin/reports?tab=finance&range=${range}`} />}>Lihat laporan</Button></CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-px overflow-hidden rounded-[var(--radius-control)] border border-border bg-border sm:grid-cols-3">
                <div className="bg-card p-4"><dt className="text-caption leading-[1.45] text-muted-foreground">Penerimaan terkonfirmasi (bruto)</dt><dd className="mt-1 break-words text-xl font-medium tabular-nums">{finance.status === "ok" ? money(finance.data.grossConfirmedReceiptsRp) : "—"}</dd></div>
                <div className="bg-card p-4"><dt className="text-caption leading-[1.45] text-muted-foreground">Pengeluaran tercatat</dt><dd className="mt-1 break-words text-xl font-medium tabular-nums">{finance.status === "ok" ? money(finance.data.validExpensesRp) : "—"}</dd></div>
                <div className="bg-card p-4"><dt className="text-caption leading-[1.45] text-muted-foreground">Pesanan dibayar</dt><dd className="mt-1 text-xl font-medium tabular-nums">{paidOrders.status === "ok" ? paidOrders.data : "—"}</dd></div>
              </dl>
              {finance.status === "ok" ? <>
                <AdminTrendChart label="Penerimaan terkonfirmasi" unit="Rp" points={finance.data.points.map(point => ({ key: point.key, value: point.receiptsRp }))} />
                {finance.data.needsReviewCount > 0 && <Link className="block min-h-11 py-3 text-ui font-medium text-primary underline underline-offset-4" href="/admin/finance/payments?status=REVIEW">{finance.data.needsReviewCount} isu pembayaran provider perlu diperiksa saat ini</Link>}
              </> : <Alert role="status"><AlertDescription>{finance.message}</AlertDescription></Alert>}
              {paidOrders.status === "unavailable" && <Alert role="status"><AlertDescription>Hitungan pesanan dibayar belum dapat dimuat.</AlertDescription></Alert>}
            </CardContent>
            <CardFooter className="xl:mt-auto"><p className="text-caption leading-[1.45] text-muted-foreground">Penerbitan invoice tidak menambah penerimaan. Nilai bruto belum dikurangi refund.</p></CardFooter>
          </Card>
        </section>

        <aside aria-labelledby="activity-title" className="min-w-0">
          <Card className="xl:h-full">
            <CardHeader><CardTitle><h2 id="activity-title">Aktivitas terbaru</h2></CardTitle><CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href="/admin/activity" />}>Lihat semua</Button></CardAction></CardHeader>
            <CardContent>
              {activity.status === "unavailable" ? <Alert role="status"><AlertDescription>{activity.message}</AlertDescription></Alert> : activity.data.items.length === 0 ? <p className="py-6 text-ui text-muted-foreground">Belum ada aktivitas tercatat.</p> : <ol className="divide-y divide-border">{activity.data.items.slice(0, 5).map(item => <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                {item.href ? <Link href={item.href} className="block min-h-11 rounded-sm py-2 text-ui font-medium text-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50">{item.title}</Link> : <p className="text-ui font-medium">{item.title}</p>}
                <p className="text-caption leading-[1.45] text-muted-foreground">{item.group} · {time(item.createdAt)}</p>
              </li>)}</ol>}
            </CardContent>
          </Card>
        </aside>
      </div>

      <section aria-labelledby="traffic-title">
        <Card>
          <CardHeader><CardTitle><h2 id="traffic-title">Trafik situs</h2></CardTitle><CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href={`/admin/reports?tab=traffic&range=${range}`} />}>Lihat rincian</Button></CardAction></CardHeader>
          <CardContent>{traffic.status === "unavailable" ? <Alert role="status"><AlertDescription>{traffic.message}</AlertDescription></Alert> : <div className="grid gap-6 md:grid-cols-3">
            <div><p className="text-caption text-muted-foreground">Tayangan halaman</p><p className="mt-1 text-2xl font-medium tabular-nums">{traffic.data.report.pageViews}</p>{!traffic.data.collectionEnabled && <p className="mt-2 text-caption leading-[1.45] text-muted-foreground">Pengumpulan tayangan belum aktif; data historis ditampilkan bila tersedia.</p>}{traffic.data.collectionEnabled && traffic.data.report.pageViews === 0 && <p className="mt-2 text-caption text-muted-foreground">Belum ada tayangan tercatat.</p>}</div>
            <div><h3 className="text-ui font-medium">Sumber masuk teratas</h3><p className="mt-1 text-ui text-muted-foreground">{traffic.data.report.sources[0] ? `${traffic.data.report.sources[0].key} · ${traffic.data.report.sources[0].count} tayangan pertama` : "Belum ada data."}</p></div>
            <div><h3 className="text-ui font-medium">Perangkat teratas</h3><p className="mt-1 text-ui text-muted-foreground">{traffic.data.report.devices[0] ? `${traffic.data.report.devices[0].key} · ${traffic.data.report.devices[0].count} tayangan` : "Belum ada data."}</p><p className="mt-2 text-caption leading-[1.45] text-muted-foreground">Kategori agregat; hitungan tayangan bukan pengunjung unik.</p></div>
          </div>}</CardContent>
        </Card>
      </section>
    </main>
  </AdminShell>;
}
