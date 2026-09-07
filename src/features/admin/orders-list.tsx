"use client";

import { useMemo, useState } from "react";

import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OrderFilters,
  type AdminOrderExceptionFilter,
  type AdminOrderStatusFilter,
  type AdminOrderTypeFilter,
} from "@/features/admin/order-filters";

export type AdminOrdersScenario = "populated" | "loading" | "empty" | "error";

type PreviewOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "IN_PRODUCTION"
  | "WAITING_SHIPPING_PAYMENT";

type OrderFixture = Readonly<{
  exceptionReason: string | null;
  orderType: "RETAIL" | "CUSTOM_PRINT";
  paymentLabel: string;
  reference: string;
  shipmentLabel: string;
  status: PreviewOrderStatus;
  updatedAt: string;
}>;

type AdminOrdersListProps = Readonly<{
  initialScenario: AdminOrdersScenario;
  initialSelectedReference: string | null;
}>;

const orderFixture = [
  {
    exceptionReason: null,
    orderType: "RETAIL",
    paymentLabel: "Terverifikasi pada fixture",
    reference: "ORD-EX-4072",
    shipmentLabel: "Menunggu proses fulfillment",
    status: "PAID",
    updatedAt: "4 jam lalu",
  },
  {
    exceptionReason: null,
    orderType: "RETAIL",
    paymentLabel: "Terverifikasi pada fixture",
    reference: "ORD-EX-4137",
    shipmentLabel: "Siap diserahkan ke kurir",
    status: "READY_TO_SHIP",
    updatedAt: "5 jam lalu",
  },
  {
    exceptionReason: null,
    orderType: "CUSTOM_PRINT",
    paymentLabel: "Terverifikasi pada fixture",
    reference: "ORD-EX-4265",
    shipmentLabel: "Menunggu quality control",
    status: "IN_PRODUCTION",
    updatedAt: "1 hari lalu",
  },
  {
    exceptionReason: "Pembayaran pengiriman kedua belum diselesaikan pada fixture.",
    orderType: "CUSTOM_PRINT",
    paymentLabel: "Pembayaran utama terverifikasi pada fixture",
    reference: "ORD-EX-4351",
    shipmentLabel: "Menunggu pembayaran pengiriman",
    status: "WAITING_SHIPPING_PAYMENT",
    updatedAt: "1 hari lalu",
  },
  {
    exceptionReason: "Masa pembayaran fixture perlu ditinjau sebelum order berubah status.",
    orderType: "RETAIL",
    paymentLabel: "Belum terverifikasi pada fixture",
    reference: "ORD-EX-4420",
    shipmentLabel: "Belum tersedia sebelum pembayaran",
    status: "PENDING_PAYMENT",
    updatedAt: "2 hari lalu",
  },
] as const satisfies readonly OrderFixture[];

const orderStatusConfig: Record<PreviewOrderStatus, Readonly<{ className: string; label: string }>> = {
  PENDING_PAYMENT: {
    className: "border-warning-border bg-warning-background text-warning",
    label: "Menunggu pembayaran",
  },
  PAID: {
    className: "border-info-border bg-info-background text-info",
    label: "Berbayar, perlu diproses",
  },
  PROCESSING: {
    className: "border-info-border bg-info-background text-info",
    label: "Sedang diproses",
  },
  READY_TO_SHIP: {
    className: "border-success-border bg-success-background text-success",
    label: "Siap dikirim",
  },
  IN_PRODUCTION: {
    className: "border-info-border bg-info-background text-info",
    label: "Dalam produksi",
  },
  WAITING_SHIPPING_PAYMENT: {
    className: "border-warning-border bg-warning-background text-warning",
    label: "Menunggu pembayaran pengiriman",
  },
};

const statusMatches: Record<AdminOrderStatusFilter, readonly PreviewOrderStatus[] | null> = {
  all: null,
  payment: ["PENDING_PAYMENT", "PAID"],
  production: ["PROCESSING", "IN_PRODUCTION"],
  shipping: ["READY_TO_SHIP", "WAITING_SHIPPING_PAYMENT"],
};

function typeLabel(orderType: OrderFixture["orderType"]) {
  return orderType === "CUSTOM_PRINT" ? "Custom print" : "Ready-made";
}

function OrderStatusBadge({ status }: Readonly<{ status: PreviewOrderStatus }>) {
  const config = orderStatusConfig[status];

  return <Badge className={config.className} variant="outline">{config.label}</Badge>;
}

function OrderLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat daftar order preview" className="space-y-3" data-orders-loading>
      <p className="text-sm font-medium text-muted-foreground">Memuat daftar order preview.</p>
      {["first", "second", "third"].map((row) => (
        <div className="h-32 animate-pulse rounded-xl border border-border bg-muted motion-reduce:animate-none" key={row} />
      ))}
    </section>
  );
}

function OrderTable({
  orders,
  selectedReference,
  onSelect,
  selectionDisabled,
}: Readonly<{
  onSelect: (order: OrderFixture) => void;
  orders: readonly OrderFixture[];
  selectedReference: string | null;
  selectionDisabled: boolean;
}>) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-left text-sm" data-orders-table>
        <caption className="sr-only">Daftar order contoh untuk review operasional</caption>
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Order</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Jenis dan status</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Pembayaran</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Pengiriman</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Exception</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr className="align-top" key={order.reference}>
              <td className="border-b border-border px-4 py-4">
                <p className="font-mono text-xs font-medium text-brand-700">{order.reference}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Kontak tidak dimuat di preview</p>
                <p className="mt-1 text-xs text-muted-foreground">Diperbarui {order.updatedAt}</p>
              </td>
              <td className="border-b border-border px-4 py-4">
                <p className="text-sm font-medium">{typeLabel(order.orderType)}</p>
                <div className="mt-2"><OrderStatusBadge status={order.status} /></div>
              </td>
              <td className="border-b border-border px-4 py-4 text-sm leading-6 text-muted-foreground">{order.paymentLabel}</td>
              <td className="border-b border-border px-4 py-4 text-sm leading-6 text-muted-foreground">{order.shipmentLabel}</td>
              <td className="border-b border-border px-4 py-4 text-sm leading-6 text-muted-foreground">
                {order.exceptionReason ?? "Tidak ada exception pada fixture"}
              </td>
              <td className="border-b border-border px-4 py-4">
                <Button
                  aria-pressed={selectedReference === order.reference}
                  className="min-h-11 cursor-pointer"
                  disabled={selectionDisabled}
                  onClick={() => onSelect(order)}
                  type="button"
                  variant={selectedReference === order.reference ? "default" : "outline"}
                >
                  {selectedReference === order.reference ? "Dipilih" : `Pilih ${order.reference}`}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderCards({
  orders,
  selectedReference,
  onSelect,
  selectionDisabled,
}: Readonly<{
  onSelect: (order: OrderFixture) => void;
  orders: readonly OrderFixture[];
  selectedReference: string | null;
  selectionDisabled: boolean;
}>) {
  return (
    <ol aria-label="Daftar order contoh" className="grid gap-3 lg:hidden" data-orders-cards>
      {orders.map((order) => (
        <li className="border border-border bg-card p-4 shadow-card" key={order.reference}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-medium text-brand-700">{order.reference}</p>
              <p className="mt-2 text-sm font-medium">{typeLabel(order.orderType)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Customer</dt>
              <dd className="mt-1 leading-6">Kontak tidak dimuat di preview</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Pembayaran</dt>
              <dd className="mt-1 leading-6">{order.paymentLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Pengiriman</dt>
              <dd className="mt-1 leading-6">{order.shipmentLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Exception</dt>
              <dd className="mt-1 leading-6">{order.exceptionReason ?? "Tidak ada exception pada fixture"}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-border pt-4">
            <Button
              aria-pressed={selectedReference === order.reference}
              className="min-h-11 w-full cursor-pointer sm:w-auto"
              disabled={selectionDisabled}
              onClick={() => onSelect(order)}
              type="button"
              variant={selectedReference === order.reference ? "default" : "outline"}
            >
              {selectedReference === order.reference ? "Dipilih" : `Pilih ${order.reference}`}
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AdminOrdersList({ initialScenario, initialSelectedReference }: AdminOrdersListProps) {
  const hydrated = useHydrated();
  const [exceptionFilter, setExceptionFilter] = useState<AdminOrderExceptionFilter>("all");
  const [scenario, setScenario] = useState<AdminOrdersScenario>(initialScenario);
  const [search, setSearch] = useState("");
  const [selectedReference, setSelectedReference] = useState<string | null>(initialSelectedReference);
  const [statusFilter, setStatusFilter] = useState<AdminOrderStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AdminOrderTypeFilter>("all");

  const visibleOrders = useMemo(() => {
    if (scenario === "empty") return [];

    const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");
    const allowedStatuses = statusMatches[statusFilter];

    return orderFixture.filter((order) => {
      const typeMatches = typeFilter === "all" || order.orderType === typeFilter;
      const statusMatchesFilter = allowedStatuses === null || allowedStatuses.includes(order.status);
      const exceptionMatches = exceptionFilter === "all" || order.exceptionReason !== null;
      const searchMatches = normalizedSearch.length === 0 || order.reference.toLocaleLowerCase("id-ID").includes(normalizedSearch);

      return typeMatches && statusMatchesFilter && exceptionMatches && searchMatches;
    });
  }, [exceptionFilter, scenario, search, statusFilter, typeFilter]);

  const selectedOrder = orderFixture.find((order) => order.reference === selectedReference) ?? null;
  const hasAppliedFilters = search.length > 0 || typeFilter !== "all" || statusFilter !== "all" || exceptionFilter !== "all";

  function resetFilters() {
    setExceptionFilter("all");
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  function selectOrder(order: OrderFixture) {
    setSelectedReference(order.reference);

    const previewUrl = new URL(window.location.href);
    previewUrl.searchParams.set("module", "orders");
    previewUrl.searchParams.set("order", order.reference);
    window.history.replaceState(window.history.state, "", `${previewUrl.pathname}${previewUrl.search}${previewUrl.hash}`);
  }

  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      data-admin-orders="preview"
      data-orders-scenario={scenario}
      id="main-content"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin/orders</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">
                Development-only preview
              </Badge>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Order yang perlu dikelola.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Temukan tahap operasional dan exception terlebih dahulu. Detail fulfillment tetap berada pada langkah berikutnya.
            </p>
            <p className="mt-5 text-sm font-medium text-foreground" role="status">
              {orderFixture.length} order contoh, {orderFixture.filter((order) => order.exceptionReason !== null).length} exception perlu perhatian
            </p>
          </header>

          <section aria-labelledby="orders-filter-heading" className="border-b border-border py-6">
            <h2 className="text-lg font-semibold" id="orders-filter-heading">Cari dan saring</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Filter hanya mengubah fixture lokal. Query URL hanya menyimpan reference order contoh yang dipilih.</p>
            <div className="mt-5">
              <OrderFilters
                disabled={!hydrated || scenario === "loading" || scenario === "error"}
                exceptionFilter={exceptionFilter}
                onExceptionChange={setExceptionFilter}
                onSearchChange={setSearch}
                onStatusChange={setStatusFilter}
                onTypeChange={setTypeFilter}
                search={search}
                statusFilter={statusFilter}
                typeFilter={typeFilter}
              />
            </div>
          </section>

          {selectedOrder ? (
            <StatusNotice
              className="mt-6"
              description={`Selection ${selectedOrder.reference} tersimpan pada URL preview. FE-20 akan memiliki detail, audit, dan tindakan transition yang tetap diverifikasi server.`}
              title={`Order preview dipilih: ${selectedOrder.reference}`}
              tone="info"
            />
          ) : null}

          {selectedReference !== null && selectedOrder === null ? (
            <StatusNotice
              className="mt-6"
              description="Reference pada query tidak cocok dengan fixture yang tersedia. Tidak ada order server yang dicari atau dimuat."
              title="Order preview tidak tersedia"
              tone="warning"
            />
          ) : null}

          <section aria-labelledby="orders-list-heading" className="pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold" id="orders-list-heading">Daftar operasional</h2>
              {scenario !== "loading" && scenario !== "error" ? (
                <p className="text-sm text-muted-foreground" role="status">{visibleOrders.length} order ditampilkan</p>
              ) : null}
            </div>

            <div className="mt-4">
              {scenario === "loading" ? <OrderLoadingState /> : null}
              {scenario === "error" ? (
                <StatusNotice
                  action={
                    <Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("populated")} type="button" variant="outline">
                      Coba lagi
                    </Button>
                  }
                  description="Tidak ada order atau status server yang ditampilkan ketika projection admin belum tersedia."
                  title="Daftar order preview belum dapat dimuat"
                  tone="error"
                />
              ) : null}
              {scenario !== "loading" && scenario !== "error" && visibleOrders.length === 0 ? (
                <StatusNotice
                  action={
                    hasAppliedFilters ? (
                      <Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={resetFilters} type="button" variant="outline">
                        Tampilkan semua order
                      </Button>
                    ) : undefined
                  }
                  description={
                    hasAppliedFilters
                      ? "Tidak ada order contoh yang sesuai. Ubah pencarian atau filter tanpa menganggap order produksi kosong."
                      : "Keadaan kosong ini hanya skenario preview, bukan pernyataan bahwa tidak ada order produksi."
                  }
                  title={hasAppliedFilters ? "Filter tidak menemukan order" : "Daftar order contoh sedang kosong"}
                  tone="info"
                />
              ) : null}
              {scenario !== "loading" && scenario !== "error" && visibleOrders.length > 0 ? (
                <>
                  <OrderTable
                    onSelect={selectOrder}
                    orders={visibleOrders}
                    selectedReference={selectedReference}
                    selectionDisabled={!hydrated}
                  />
                  <OrderCards
                    onSelect={selectOrder}
                    orders={visibleOrders}
                    selectedReference={selectedReference}
                    selectionDisabled={!hydrated}
                  />
                </>
              ) : null}
            </div>
          </section>
        </div>

        <aside aria-label="Batas preview order" className="space-y-4 xl:sticky xl:top-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Exception perlu dibaca</CardTitle>
              <CardDescription>Exception tidak boleh tersembunyi oleh search atau filter status.</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusNotice
                description="Dua contoh memperlihatkan pembayaran yang belum final. Status sebenarnya tetap berasal dari payment, shipping, dan order service server."
                size="compact"
                title="2 exception fixture"
                tone="warning"
              />
              <p className="mt-5 border-l-2 border-brand-300 pl-3 text-sm leading-6 text-muted-foreground">
                Detail customer, alamat, item, nominal, token, provider payload, dan catatan internal sengaja tidak dimuat di list preview.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
