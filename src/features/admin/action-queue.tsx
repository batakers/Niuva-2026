"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionQueueItem, type ActionQueueKind, type ActionQueueStatus } from "@/components/niuva/action-queue-item";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminInquiryDetail } from "@/features/admin/inquiry-detail";
import { QueueFilters, type QueueFilter } from "@/features/admin/queue-filters";

export type AdminQueueScenario = "populated" | "loading" | "empty" | "stale";

type QueueFixture = Readonly<{
  actionLabel: string;
  detailPreview: string;
  kind: ActionQueueKind;
  reference: string;
  status: ActionQueueStatus;
  summary: string;
  updatedAt: string;
}>;

const queueFixture = [
  {
    actionLabel: "Buka brief preview",
    detailPreview: "FE-18 · detail inquiry",
    kind: "inquiry",
    reference: "BRF-EX-1049",
    status: "new",
    summary: "Brief display modular perlu ditinjau.",
    updatedAt: "18 menit lalu",
  },
  {
    actionLabel: "Tinjau custom preview",
    detailPreview: "FE-21 · review custom print",
    kind: "custom-review",
    reference: "CPR-EX-2093",
    status: "waiting",
    summary: "Konfigurasi casing kontrol menunggu review operator.",
    updatedAt: "43 menit lalu",
  },
  {
    actionLabel: "Buka quote preview",
    detailPreview: "FE-22 · editor quote",
    kind: "quote",
    reference: "QTE-EX-3028",
    status: "action-pending",
    summary: "Versi quote perlu dikonfirmasi sebelum dikirim.",
    updatedAt: "2 jam lalu",
  },
  {
    actionLabel: "Buka order preview",
    detailPreview: "FE-19 · daftar order",
    kind: "order",
    reference: "ORD-EX-4072",
    status: "in-progress",
    summary: "Order berbayar menunggu handoff produksi.",
    updatedAt: "4 jam lalu",
  },
  {
    actionLabel: "Tinjau pengukuran preview",
    detailPreview: "FE-20 · fulfillment dan pengukuran",
    kind: "package",
    reference: "PKG-EX-5081",
    status: "blocked",
    summary: "Pengukuran paket final diperlukan sebelum shipping.",
    updatedAt: "1 hari lalu",
  },
  {
    actionLabel: "Buka stok preview",
    detailPreview: "FE-23 · daftar produk dan stok",
    kind: "stock",
    reference: "STK-EX-6024",
    status: "action-pending",
    summary: "Stok varian contoh melewati ambang perhatian.",
    updatedAt: "3 jam lalu",
  },
] as const satisfies readonly QueueFixture[];

const urgentStatuses = new Set<ActionQueueStatus>(["new", "waiting", "blocked", "action-pending"]);

type AdminActionQueueProps = Readonly<{
  initialScenario: AdminQueueScenario;
}>;

function QueueLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat Action Queue preview" className="space-y-3" data-queue-loading>
      <p className="text-sm font-medium text-muted-foreground">Memuat Action Queue preview.</p>
      {["first", "second", "third"].map((item) => (
        <div className="h-36 animate-pulse rounded-xl border border-border bg-muted" key={item} />
      ))}
    </section>
  );
}

function QueueEmptyState({ filter }: Readonly<{ filter: QueueFilter }>) {
  const isFiltered = filter !== "all";

  return (
    <StatusNotice
      description={
        isFiltered
          ? "Tidak ada tindakan contoh pada filter ini. Ubah filter untuk melihat prioritas lain."
          : "Tidak ada tindakan contoh yang perlu ditinjau. Keadaan kosong ini tidak menyatakan queue produksi benar-benar kosong."
      }
      title={isFiltered ? "Filter tidak menemukan tindakan." : "Action Queue contoh sedang kosong."}
      tone="info"
    />
  );
}

export function AdminActionQueue({ initialScenario }: AdminActionQueueProps) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [scenario, setScenario] = useState<AdminQueueScenario>(initialScenario);
  const [selectedItem, setSelectedItem] = useState<QueueFixture | null>(null);

  const visibleItems = useMemo(() => {
    if (scenario === "empty") return [];
    if (filter === "all") return queueFixture;
    return queueFixture.filter((item) => item.kind === filter);
  }, [filter, scenario]);
  const urgentCount = queueFixture.filter((item) => urgentStatuses.has(item.status)).length;

  function selectFilter(nextFilter: QueueFilter) {
    setFilter(nextFilter);
    setSelectedItem(null);
  }

  function selectDetail(item: QueueFixture) {
    setSelectedItem(item);
  }

  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      data-action-queue="preview"
      data-queue-scenario={scenario}
      id="main-content"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">
                Development-only preview
              </Badge>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Tindakan yang perlu ditinjau.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Urutkan pekerjaan berdasarkan keputusan berikutnya, bukan jumlah transaksi.
            </p>
            <p className="mt-5 text-sm font-medium text-foreground" role="status">
              {queueFixture.length} tindakan contoh · {urgentCount} perlu perhatian segera
            </p>
          </header>

          <section aria-labelledby="queue-filter-heading" className="border-b border-border py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold" id="queue-filter-heading">Filter pekerjaan</h2>
              <p className="text-xs leading-5 text-muted-foreground">Prioritas tetap terlihat di luar filter.</p>
            </div>
            <div className="mt-3">
              <QueueFilters disabled={!hydrated || scenario === "loading"} onChange={selectFilter} selected={filter} />
            </div>
          </section>

          {scenario === "stale" ? (
            <StatusNotice
              action={
                <Button
                  className="min-h-11 cursor-pointer"
                  disabled={!hydrated}
                  onClick={() => setScenario("populated")}
                  type="button"
                  variant="outline"
                >
                  Segarkan preview
                </Button>
              }
              className="mt-6"
              description="Fixture yang terlihat dapat tertinggal. Tombol ini hanya memulihkan skenario lokal dan tidak meminta atau menulis data server."
              title="Action Queue contoh perlu disegarkan."
              tone="warning"
            />
          ) : null}

          {selectedItem ? (
            <StatusNotice
              className="mt-6"
              description={`Konteks ${selectedItem.reference} dipilih untuk ${selectedItem.detailPreview}. Tidak ada status, audit, atau data server yang diubah.`}
              title={`Detail preview dipilih: ${selectedItem.reference}`}
              tone="info"
            />
          ) : null}

          <section aria-labelledby="queue-list-heading" className="pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold" id="queue-list-heading">Urutan tindakan</h2>
              {scenario !== "loading" ? (
                <p className="text-sm text-muted-foreground" role="status">{visibleItems.length} hasil ditampilkan</p>
              ) : null}
            </div>

            <div className="mt-4">
              {scenario === "loading" ? <QueueLoadingState /> : null}
              {scenario !== "loading" && visibleItems.length === 0 ? <QueueEmptyState filter={filter} /> : null}
              {scenario !== "loading" && visibleItems.length > 0 ? (
                <div className="grid gap-3" role="list">
                  {visibleItems.map((item) => (
                    <ActionQueueItem
                      key={item.reference}
                      kind={item.kind}
                      primaryAction={
                        item.kind === "inquiry" ? (
                          <AdminInquiryDetail
                            trigger={
                              <Button className="min-h-11 cursor-pointer" disabled={!hydrated} type="button">
                                {item.actionLabel}
                              </Button>
                            }
                          />
                        ) : item.kind === "order" ? (
                          <Button
                            className="min-h-11 cursor-pointer"
                            disabled={!hydrated}
                            onClick={() => router.push(`/auis/proofs/frontend/admin?preview=examples&state=ready&module=orders&order=${item.reference}`)}
                            type="button"
                          >
                            {item.actionLabel}
                          </Button>
                        ) : item.kind === "custom-review" ? (
                          <Button
                            className="min-h-11 cursor-pointer"
                            disabled={!hydrated}
                            onClick={() => router.push(`/auis/proofs/frontend/admin?preview=examples&state=ready&module=custom-print&request=${item.reference}`)}
                            type="button"
                          >
                            {item.actionLabel}
                          </Button>
                        ) : item.kind === "quote" ? (
                          <Button
                            className="min-h-11 cursor-pointer"
                            disabled={!hydrated}
                            onClick={() => router.push(`/auis/proofs/frontend/admin?preview=examples&state=ready&module=quotes&quote=${item.reference}`)}
                            type="button"
                          >
                            {item.actionLabel}
                          </Button>
                        ) : item.kind === "stock" ? (
                          <Button
                            className="min-h-11 cursor-pointer"
                            disabled={!hydrated}
                            onClick={() => router.push(`/auis/proofs/frontend/admin?preview=examples&state=ready&module=products&sku=${encodeURIComponent(item.reference)}`)}
                            type="button"
                          >
                            {item.actionLabel}
                          </Button>
                        ) : (
                          <Button
                            className="min-h-11 cursor-pointer"
                            disabled={!hydrated}
                            onClick={() => selectDetail(item)}
                            type="button"
                          >
                            {item.actionLabel}
                          </Button>
                        )
                      }
                      reference={item.reference}
                      status={item.status}
                      summary={item.summary}
                      updatedAt={item.updatedAt}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside aria-label="Exception Action Queue" className="space-y-4 xl:sticky xl:top-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Exception perlu dilihat</CardTitle>
              <CardDescription>Bukan ringkasan performa atau metrik transaksi.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusNotice
                description="Pengukuran paket dan stok rendah menjadi contoh exception yang tidak boleh tertutup oleh filter."
                size="compact"
                title="2 exception contoh"
                tone="warning"
              />
              <p className="mt-5 border-l-2 border-brand-300 pl-3 text-sm leading-6 text-muted-foreground">
                Referensi, status, dan usia di halaman ini hanya fixture development. Detail aktual tetap menunggu Clerk, AdminProfile aktif, dan service server.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
