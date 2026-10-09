import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Clock3, Printer, ShoppingBag, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminTrendChart } from "@/components/niuva/admin-trend-chart";
import { AdminPageHeader } from "./admin-page-header";
import type { AdminRole } from "@/generated/prisma/client";
import type { AdminOverviewData } from "@/modules/admin/overview-types";

const money = (value: string) => "Rp " + new Intl.NumberFormat("id-ID").format(BigInt(value));
const time = (value: string | Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));

export function AdminOverviewView({ data, role }: Readonly<{ data: AdminOverviewData; role: AdminRole }>) {
  const { range, attention, finance, paidOrders, activity, traffic } = data;
  const queue = attention.status === "ok" ? attention.data : null;
  const cards = [
    { title: "B2B perlu ditindaklanjuti", value: queue?.summary.groups.inquiries, href: "/admin/inquiries?view=needs-action", note: "Tinjau brief proyek baru", icon: BriefcaseBusiness },
    { title: "Custom Print perlu tindakan", value: queue?.summary.groups["custom-print"], href: "/admin/custom-print?view=needs-action", note: "Review, siapkan, atau kirim quote", icon: Printer },
    { title: "Order perlu tindakan", value: queue?.summary.groups.orders, href: "/admin/orders?view=needs-action", note: "Proses, ukur paket, atau periksa", icon: ShoppingBag },
    { title: "Isu / perlu perhatian", value: queue?.summary.exceptions, href: queue?.summary.exceptions ? "#admin-issues" : "/admin/orders?view=issues", note: "Pembayaran dan pengiriman", icon: TriangleAlert },
  ];

  return <AdminShell role={role} active="overview">
    <main id="main-content" data-admin-surface="overview" className="min-w-0 space-y-6">
      <AdminPageHeader title="Overview" description="Pantau pekerjaan hari ini dan ringkasan bisnis Niuva." breadcrumbs={[{ label: "Overview" }]} actions={
        <div className="flex flex-wrap gap-2">{(["30d", "13m"] as const).map(value =>
          <Button key={value} nativeButton={false} role="link" render={<Link href={value === "30d" ? "/admin" : "/admin?range=13m"} aria-current={range === value ? "page" : undefined} />} variant={range === value ? "default" : "outline"}>{value === "30d" ? "30 hari" : "13 bulan"}</Button>
        )}</div>
      } />
      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Clock3 aria-hidden className="mt-0.5 size-4 shrink-0" /><span>Diperbarui {time(data.generatedAt)} WIB · Kartu perhatian menampilkan pekerjaan yang masih terbuka.</span></p>

      <section aria-label="Pekerjaan perlu perhatian saat ini" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(item => <Link key={item.title} href={item.href} className="group min-w-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Card className="h-full gap-4 transition-colors group-hover:ring-primary/40 motion-reduce:transition-none">
            <CardHeader>
              <CardTitle className="pr-2 text-sm font-medium leading-5">{item.title}</CardTitle>
              <CardAction><item.icon aria-hidden className="size-5 text-primary" /></CardAction>
            </CardHeader>
            <CardContent><p className="text-3xl font-semibold tabular-nums">{item.value ?? "—"}</p></CardContent>
            <CardFooter className="mt-auto justify-between gap-3 text-xs text-muted-foreground"><span>{item.note}</span><ArrowUpRight aria-hidden className="size-4 shrink-0 text-primary" /></CardFooter>
          </Card>
        </Link>)}
      </section>
      {attention.status === "unavailable" && <Alert role="status"><AlertDescription>{attention.message}</AlertDescription></Alert>}

      {queue && queue.summary.exceptions > 0 && <section id="admin-issues" aria-labelledby="issue-title">
        <Card>
          <CardHeader><CardTitle><h2 id="issue-title">Perlu pemeriksaan sekarang</h2></CardTitle><CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href="/admin/orders?view=issues" />}>Lihat semua isu<ArrowUpRight aria-hidden className="size-4" /></Button></CardAction></CardHeader>
          <CardContent><ul className="divide-y divide-border">{queue.priorityItems.filter(item => item.attention === "EXCEPTION").map(item => <li key={item.id}><Link href={item.href} className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-sm py-3 text-sm outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"><span className="font-medium">{item.title}</span><Badge variant="outline">{item.reference}</Badge></Link></li>)}</ul></CardContent>
        </Card>
      </section>}

      <div className="grid min-w-0 items-start gap-6 xl:items-stretch xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section aria-labelledby="business-title" className="min-w-0">
          <Card className="xl:h-full">
            <CardHeader>
              <CardTitle><h2 id="business-title" className="text-lg font-semibold">Ringkasan bisnis</h2></CardTitle>
              <CardDescription>{range === "30d" ? "30 hari" : "13 bulan"} terakhir · tanggal transaksi, waktu Jakarta</CardDescription>
              <CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href={`/admin/reports?tab=finance&range=${range}`} />}>Lihat laporan<ArrowUpRight aria-hidden className="size-4" /></Button></CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-5 border-b border-border pb-5 sm:grid-cols-3">
                <div><dt className="text-xs leading-5 text-muted-foreground">Penerimaan terkonfirmasi (bruto)</dt><dd className="mt-2 break-words text-xl font-semibold tabular-nums">{finance.status === "ok" ? money(finance.data.grossConfirmedReceiptsRp) : "—"}</dd></div>
                <div><dt className="text-xs leading-5 text-muted-foreground">Pengeluaran tercatat</dt><dd className="mt-2 break-words text-xl font-semibold tabular-nums">{finance.status === "ok" ? money(finance.data.validExpensesRp) : "—"}</dd></div>
                <div><dt className="text-xs leading-5 text-muted-foreground">Order dibayar</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{paidOrders.status === "ok" ? paidOrders.data : "—"}</dd></div>
              </dl>
              {finance.status === "ok" ? <>
                <AdminTrendChart label="Penerimaan terkonfirmasi" unit="Rp" points={finance.data.points.map(point => ({ key: point.key, value: point.receiptsRp }))} />
                {finance.data.needsReviewCount > 0 && <Link className="block min-h-11 py-3 text-sm text-primary underline underline-offset-4" href="/admin/finance/payments?status=REVIEW">{finance.data.needsReviewCount} isu pembayaran provider perlu diperiksa saat ini</Link>}
              </> : <Alert role="status"><AlertDescription>{finance.message}</AlertDescription></Alert>}
              {paidOrders.status === "unavailable" && <Alert role="status"><AlertDescription>Hitungan order dibayar belum dapat dimuat.</AlertDescription></Alert>}
            </CardContent>
            <CardFooter className="xl:mt-auto"><p className="text-xs leading-5 text-muted-foreground">Penerbitan invoice tidak menambah penerimaan. Nilai bruto belum dikurangi refund.</p></CardFooter>
          </Card>
        </section>

        <aside aria-labelledby="activity-title" className="min-w-0">
          <Card className="xl:h-full">
            <CardHeader><CardTitle><h2 id="activity-title" className="text-lg font-semibold">Aktivitas terbaru</h2></CardTitle><CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href="/admin/activity" />}>Lihat semua<ArrowUpRight aria-hidden className="size-4" /></Button></CardAction></CardHeader>
            <CardContent>
              {activity.status === "unavailable" ? <Alert role="status"><AlertDescription>{activity.message}</AlertDescription></Alert> : activity.data.items.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p> : <ol className="divide-y divide-border">{activity.data.items.slice(0, 5).map(item => <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                {item.href ? <Link href={item.href} className="block min-h-11 rounded-sm py-2 text-sm font-medium text-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50">{item.title}</Link> : <p className="text-sm font-medium">{item.title}</p>}
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.group} · {time(item.createdAt)}</p>
              </li>)}</ol>}
            </CardContent>
          </Card>
        </aside>
      </div>

      <section aria-labelledby="traffic-title">
        <Card>
          <CardHeader><CardTitle><h2 id="traffic-title" className="text-lg font-semibold">Trafik situs</h2></CardTitle><CardAction><Button nativeButton={false} role="link" variant="ghost" render={<Link href={`/admin/reports?tab=traffic&range=${range}`} />}>Lihat rincian<ArrowUpRight aria-hidden className="size-4" /></Button></CardAction></CardHeader>
          <CardContent>{traffic.status === "unavailable" ? <Alert role="status"><AlertDescription>{traffic.message}</AlertDescription></Alert> : <div className="grid gap-6 md:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Tayangan halaman</p><p className="mt-2 text-2xl font-semibold tabular-nums">{traffic.data.report.pageViews}</p>{!traffic.data.collectionEnabled && <p className="mt-2 text-xs leading-5 text-muted-foreground">Pengumpulan tayangan belum aktif; data historis ditampilkan bila tersedia.</p>}{traffic.data.collectionEnabled && traffic.data.report.pageViews === 0 && <p className="mt-2 text-xs text-muted-foreground">Belum ada tayangan tercatat.</p>}</div>
            <div><h3 className="text-sm font-medium">Sumber masuk teratas</h3><p className="mt-2 text-sm text-muted-foreground">{traffic.data.report.sources[0] ? `${traffic.data.report.sources[0].key} · ${traffic.data.report.sources[0].count} tayangan pertama` : "Belum ada data."}</p></div>
            <div><h3 className="text-sm font-medium">Perangkat teratas</h3><p className="mt-2 text-sm text-muted-foreground">{traffic.data.report.devices[0] ? `${traffic.data.report.devices[0].key} · ${traffic.data.report.devices[0].count} tayangan` : "Belum ada data."}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Kategori agregat; hitungan tayangan bukan pengunjung unik.</p></div>
          </div>}</CardContent>
        </Card>
      </section>
    </main>
  </AdminShell>;
}
