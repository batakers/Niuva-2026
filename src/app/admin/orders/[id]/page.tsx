import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import {
  AdminDataUnavailableView,
  AdminShell,
} from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import {
  AdminActionForm,
} from "@/app/admin/admin-action-form";
import {
  reissueOrderTokenAction,
  transitionOrderAction,
} from "@/app/admin/actions";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  AdminOperationsService,
  type AdminOrderDetail,
} from "@/modules/admin/operations";
import type { OrderStatus } from "@/generated/prisma/client";
import {
  CUSTOM_ORDER_TRANSITIONS,
  RETAIL_ORDER_TRANSITIONS,
} from "@/modules/order/transitions";

export const metadata: Metadata = {
  title: "Order detail admin · Niuva",
  robots: { follow: false, index: false },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export default async function AdminOrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const order = await loadOrder(access, id);
  if (order === null) return <AdminDataUnavailableView role={access.profile.role} title="Detail order belum dapat dimuat" />;

  const currentStatus = order.status as OrderStatus;
  const transitions = order.orderType === "RETAIL" ? RETAIL_ORDER_TRANSITIONS : CUSTOM_ORDER_TRANSITIONS;
  const nextStatuses = transitions[currentStatus] ?? [];

  return (
    <AdminShell active="orders" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="order-detail" id="main-content">
        <header className="border-b border-border pb-6">
          <Link className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/orders">← Kembali ke Orders</Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-sm text-muted-foreground">{order.orderNumber}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Detail order</h1>
              <p className="mt-3 text-sm text-muted-foreground">{order.orderType === "CUSTOM_PRINT" ? "Custom print" : "Retail"} · dibuat {dateFormatter.format(order.createdAt)}</p>
            </div>
            <span className="inline-flex rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">{formatStatus(order.status)}</span>
          </div>
        </header>

        <section aria-labelledby="order-actions-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="order-actions-title">Aksi operasional</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Transition divalidasi oleh service server dan dicatat ke audit log. Pembatalan order berbayar tetap memerlukan workflow refund terpisah.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {nextStatuses.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada transition yang tersedia dari status ini.</p> : nextStatuses.map((next) => (
              <AdminActionForm action={transitionOrderAction} confirmMessage={next === "CANCELLED" ? "Batalkan order ini? Status tidak dapat dibuka kembali otomatis." : undefined} key={next} submitLabel={`Ubah ke ${formatStatus(next)}`}>
                <input name="orderId" type="hidden" value={order.id} />
                <input name="nextStatus" type="hidden" value={next} />
              </AdminActionForm>
            ))}
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Tautan status customer</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Gunakan ini untuk mengganti tautan lama yang masih memakai token opaque. Token lama akan langsung tidak berlaku.</p>
            <AdminActionForm action={reissueOrderTokenAction} className="mt-4" confirmMessage="Terbitkan tautan baru dan cabut token lama untuk order ini?" submitLabel="Terbitkan tautan baru">
              <input name="orderId" type="hidden" value={order.id} />
            </AdminActionForm>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <section aria-labelledby="customer-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold" id="customer-title">Customer & alamat</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Nama" value={order.customerName} />
              <Info label="Email" value={order.customerEmail} />
              <Info label="Telepon" value={order.customerPhone} />
              {order.address ? <Info label="Penerima" value={`${order.address.recipientName} · ${order.address.phone}`} /> : null}
            </dl>
            {order.address ? <div className="mt-5 border-t border-border pt-4 text-sm leading-6"><p className="text-xs text-muted-foreground">Alamat pengiriman</p><p className="mt-1">{order.address.addressLine}, {order.address.district ? `${order.address.district}, ` : ""}{order.address.city}, {order.address.province} {order.address.postalCode} · {order.address.countryCode}</p></div> : <StatusNotice className="mt-5" tone="warning" title="Alamat belum tercatat" description="Order ini belum memiliki alamat pengiriman di database." />}
          </section>

          <section aria-labelledby="totals-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold" id="totals-title">Ringkasan nilai</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <Info label="Subtotal" value={formatMoney(order.itemsSubtotalRp)} />
              <Info label="Pengiriman" value={formatMoney(order.shippingTotalRp)} />
              <div className="border-t border-border pt-4"><dt className="text-xs text-muted-foreground">Grand total</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(order.grandTotalRp)}</dd></div>
              <Info label="Diperbarui" value={dateFormatter.format(order.updatedAt)} />
            </dl>
          </section>
        </div>

        <section aria-labelledby="items-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="items-title">Item order</h2>
          {order.items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Belum ada item tersimpan.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[40rem] text-left text-sm"><caption className="sr-only">Item pada {order.orderNumber}</caption><thead className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="pb-3 font-medium" scope="col">Item</th><th className="pb-3 font-medium" scope="col">SKU</th><th className="pb-3 text-right font-medium" scope="col">Qty</th><th className="pb-3 text-right font-medium" scope="col">Total</th></tr></thead><tbody className="divide-y divide-border">{order.items.map((item, index) => <tr key={`${item.skuSnapshot ?? item.nameSnapshot}-${index}`}><th className="py-3 font-medium" scope="row">{item.nameSnapshot}<span className="mt-1 block text-xs font-normal text-muted-foreground">{formatStatus(item.itemType)}</span></th><td className="py-3 font-mono text-xs text-muted-foreground">{item.skuSnapshot ?? "—"}</td><td className="py-3 text-right tabular-nums">{item.quantity}</td><td className="py-3 text-right font-semibold tabular-nums">{formatMoney(item.lineTotalRp)}</td></tr>)}</tbody></table></div>}
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <RecordList title="Pembayaran" empty="Belum ada percobaan pembayaran." items={order.paymentAttempts.map((attempt) => `${attempt.providerOrderId} · ${formatStatus(attempt.status)} · ${formatMoney(attempt.amountRp)}`)} />
          <RecordList title="Reservasi stok" empty="Tidak ada reservasi stok." items={order.reservations.map((reservation) => `${reservation.variantId} · ${reservation.quantity} unit · ${formatStatus(reservation.status)}`)} />
          <RecordList title="Pengiriman" empty="Belum ada shipment." items={order.shipments.map((shipment) => `${formatStatus(shipment.status)} · ${shipment.trackingNumber ?? "Tanpa resi"}`)} />
        </div>
        <StatusNotice tone="info" title="Provider pengiriman belum diaktifkan" description="Biteship dan Midtrans sengaja tidak diaktifkan pada goal ini. Measurement, rate lookup, payment, dan webhook tetap menunggu data perusahaan Owner." />
      </main>
    </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> {
  try { return await requireAdmin(); } catch { return null; }
}

async function loadOrder(access: AdminAccess, id: string): Promise<AdminOrderDetail | null> {
  try { return await new AdminOperationsService({ authorize: async () => access }).getOrder(id); } catch { return null; }
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>;
}

function RecordList({ empty, items, title }: Readonly<{ empty: string; items: readonly string[]; title: string }>) {
  const id = `${title.toLocaleLowerCase("id").replaceAll(/[^a-z0-9]+/g, "-")}-title`;
  return <section aria-labelledby={id} className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold" id={id}>{title}</h2>{items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{empty}</p> : <ul className="mt-4 grid gap-3 text-sm">{items.map((item) => <li className="border-t border-border pt-3 leading-6" key={item}>{item}</li>)}</ul>}</section>;
}

function formatMoney(value: string): string { return currencyFormatter.format(BigInt(value)); }
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
