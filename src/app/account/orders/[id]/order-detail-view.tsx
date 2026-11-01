import { OrderStatusTimeline } from "@/components/niuva/order-status-timeline";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { buttonVariants } from "@/components/ui/button";
import { typographySystemTokens as type } from "@/design/typography";
import type {
  OrderStatus,
  OrderType,
  PaymentAttemptStatus,
  PaymentPurpose,
  ShipmentStatus,
} from "@/generated/prisma/client";
import {
  orderStatusDescription,
  orderStatusLabel,
  orderTypeLabel,
  paymentStatusLabel,
  shipmentStatusLabel,
} from "@/features/customer-status/labels";
import { buildOrderSteps, orderNextAction } from "@/features/frontend-preview/order-status";
import { formatRupiah } from "@/modules/shared/format";

export type AccountOrderDetail = Readonly<{
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  grandTotalRp: string;
  id: string;
  items: readonly Readonly<{ label: string; quantity: number; totalRp: string }>[];
  itemsSubtotalRp: string;
  orderNumber: string;
  orderType: OrderType;
  paidAt: Date | null;
  payment: Readonly<{
    amountRp: string;
    expiresAt: Date;
    /** Set only for a pending, unexpired HTTPS handoff checked on the server. */
    payUrl: string | null;
    purpose: PaymentPurpose;
    status: PaymentAttemptStatus;
  }> | null;
  shipment: Readonly<{ courier: string | null; status: ShipmentStatus; trackingNumber: string | null }> | null;
  shippingTotalRp: string;
  status: OrderStatus;
}>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

const cardClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6";
const cardTitleClass = "text-xl font-medium tracking-[-0.015em]";

function Row({ label, value, strong = false }: Readonly<{ label: string; strong?: boolean; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "text-base font-semibold" : "text-ui font-normal text-muted-foreground"}>{label}</dt>
      <dd className={strong ? "text-2xl font-semibold tracking-[-0.015em] tabular-nums" : "text-right text-ui font-medium tabular-nums"}>{value}</dd>
    </div>
  );
}

export function OrderDetailView({ order }: Readonly<{ order: AccountOrderDetail }>) {
  const custom = order.orderType === "CUSTOM_PRINT";
  const next = orderNextAction(order.status, custom);
  const payUrl = order.payment?.payUrl ?? null;
  const facts = [
    ["Nomor pesanan", order.orderNumber],
    ["Jenis", orderTypeLabel(order.orderType)],
    ["Dibuat", dateFormatter.format(order.createdAt)],
  ] as const;

  return (
    <main className="overflow-x-hidden pb-16 sm:pb-24" data-order-state={order.status} id="main-content">
      <div className="mx-auto max-w-public px-5 pt-8 sm:px-12 sm:pt-10">
        <NiuvaLink className="min-h-11" href="/account" size="sm" variant="outline">
          <Icon aria-hidden="true" className="size-4" name="arrow-left" />
          Kembali ke akun
        </NiuvaLink>
        <h1 className={`${type.display.className} mt-8 max-w-[16em] text-balance`}>{orderStatusLabel(order.status, custom)}</h1>
        <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">{orderStatusDescription(order.status, custom)}</p>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-3">
          {facts.map(([term, value]) => (
            <div className="bg-card px-5 py-4 sm:px-6" key={term}>
              <dt className="text-ui font-normal text-muted-foreground">{term}</dt>
              <dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto grid max-w-public items-start gap-8 px-5 pt-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <section aria-labelledby="order-timeline-title" className="min-w-0">
          <h2 className="text-2xl font-medium tracking-[-0.015em]" id="order-timeline-title">Tahapan pesanan</h2>
          <OrderStatusTimeline
            className="mt-5"
            nextExpectation={next.title}
            steps={buildOrderSteps(order)}
            title={order.orderNumber}
            variant={custom ? "custom-quote" : "retail-order"}
          />
        </section>

        <aside aria-label="Langkah berikutnya dan rincian" className="space-y-4 lg:sticky lg:top-24">
          {payUrl && order.payment ? (
            <StatusNotice
              action={<a className={buttonVariants({ className: "min-h-11" })} href={payUrl} referrerPolicy="no-referrer" rel="noopener noreferrer">Lanjutkan pembayaran</a>}
              description={`Tautan pembayaran berlaku sampai ${dateFormatter.format(order.payment.expiresAt)}. Status berubah setelah pembayaran dikonfirmasi.`}
              title={order.payment.purpose === "CUSTOM_SHIPPING" ? "Pembayaran pengiriman tersedia" : "Pembayaran tersedia"}
              tone="warning"
            />
          ) : (
            <StatusNotice description={next.description} title={next.title} tone={next.tone} />
          )}

          <section aria-labelledby="order-detail-title" className={cardClass}>
            <h2 className={cardTitleClass} id="order-detail-title">Rincian pesanan</h2>
            <ul aria-label="Item pesanan" className="mt-5 divide-y divide-border border-y border-border">
              {order.items.map((item, index) => (
                <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3" key={`${item.label}-${index}`}>
                  <div className="min-w-0">
                    <p className="text-ui font-medium">{item.label}</p>
                    <p className="mt-0.5 text-caption text-muted-foreground">Jumlah {item.quantity}</p>
                  </div>
                  <p className="text-ui font-medium tabular-nums">{formatRupiah(item.totalRp)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-3">
              <Row label={custom ? "Produksi" : "Subtotal produk"} value={formatRupiah(order.itemsSubtotalRp)} />
              <Row label={custom ? "Pengiriman final" : "Ongkir"} value={formatRupiah(order.shippingTotalRp)} />
              <Row label="Total" strong value={formatRupiah(order.grandTotalRp)} />
            </dl>
            {custom ? <p className="mt-3 text-caption leading-[1.45] text-muted-foreground">Ongkir final ditagih terpisah setelah paket diukur.</p> : null}
          </section>

          {order.payment ? (
            <section aria-labelledby="order-payment-title" className={cardClass}>
              <h2 className={cardTitleClass} id="order-payment-title">{order.payment.purpose === "CUSTOM_SHIPPING" ? "Pembayaran pengiriman" : "Pembayaran"}</h2>
              <dl className="mt-4 space-y-3">
                <Row label="Status" value={paymentStatusLabel(order.payment.status)} />
                <Row label="Jumlah" value={formatRupiah(order.payment.amountRp)} />
              </dl>
            </section>
          ) : null}

          {order.shipment ? (
            <section aria-labelledby="order-shipment-title" className={cardClass}>
              <h2 className={cardTitleClass} id="order-shipment-title">Pengiriman</h2>
              <dl className="mt-4 space-y-3">
                <Row label="Status" value={shipmentStatusLabel(order.shipment.status)} />
                {order.shipment.courier ? <Row label="Kurir" value={order.shipment.courier} /> : null}
                {order.shipment.trackingNumber ? <Row label="Nomor lacak" value={order.shipment.trackingNumber} /> : null}
              </dl>
            </section>
          ) : null}

          <section aria-labelledby="order-refund-title" className={cardClass}>
            <h2 className={cardTitleClass} id="order-refund-title">Refund</h2>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Ajukan pemeriksaan refund atau lihat status pengajuan untuk pesanan ini.</p>
            <NiuvaLink className="mt-4 min-h-11" href={`/account/orders/${order.id}/refund`} variant="outline">Pengajuan dan status refund</NiuvaLink>
          </section>
        </aside>
      </div>
    </main>
  );
}
