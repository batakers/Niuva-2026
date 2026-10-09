import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableCaption, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { NativeInput as Input } from "@/components/ui/input";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";
import { z } from "zod";

import {
  AdminDataUnavailableView,
  AdminShell,
} from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import {
  AdminActionForm,
} from "@/app/admin/admin-action-form";
import {
  createCustomShippingPaymentAction,
  recordShipmentMetadataAction,
  reissueOrderTokenAction,
  saveCustomShippingAddressAction,
  transitionOrderAction,
} from "@/app/admin/actions";
import { AdminOperationsService } from "@/modules/admin/operations";
import { PAYMENT_ISSUE_LABELS } from "@/modules/payment/operational-state";
import type { OrderStatus } from "@/generated/prisma/client";
import {
  CUSTOM_ORDER_TRANSITIONS,
  RETAIL_ORDER_TRANSITIONS,
  requiresVerifiedPaymentSettlement,
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
  searchParams,
}: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const pageAccess = await loadAdminPageAccess();
  if (pageAccess.kind === "denied") return <AdminAccessView state={pageAccess.state} />;
  const { access } = pageAccess;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const service = new AdminOperationsService({ authorize: async () => access });
  const result = await loadAdminRecordLogged("page:/admin/orders/[id]", async () => {
    const order = await service.getOrder(id);
    if (!order) return null;
    const sourceRequests = order.orderType === "CUSTOM_PRINT" ? await service.getOrderSourceRequests(id) : [];
    return { order, sourceRequests };
  }, { id, op: "detail" });
  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") {
    return <AdminDataUnavailableView active="orders" kind={result.kind} role={access.profile.role} title="Detail order belum dapat dimuat" />;
  }
  const { order, sourceRequests } = result.record;
  const returnTo = normalizeAdminReturnTo((await searchParams)?.returnTo, "/admin/orders");

  const currentStatus = order.status as OrderStatus;
  const paymentHeld = order.paymentIssues.length > 0;
  const transitions = order.orderType === "RETAIL" ? RETAIL_ORDER_TRANSITIONS : CUSTOM_ORDER_TRANSITIONS;
  const nextStatuses = (transitions[currentStatus] ?? []).filter(
    (nextStatus) => !requiresVerifiedPaymentSettlement(currentStatus, nextStatus) && (!paymentHeld || nextStatus === "CANCELLED"),
  );

  return (
    <AdminShell active="orders" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="order-detail" id="main-content">
        <AdminPageHeader actions={<div className="flex flex-wrap gap-2"><Link className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-brand-700" })} href={`/admin/finance/invoices/new?kind=ORDER_TOTAL&sourceId=${id}`}>Penagihan pesanan</Link>{order.orderType === "CUSTOM_PRINT" ? <Link className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-brand-700" })} href={`/admin/finance/invoices/new?kind=CUSTOM_SHIPPING&sourceId=${id}`}>Tagihan ongkir final</Link> : null}</div>} title="Detail order" description={`${order.orderNumber} · ${formatStatus(order.status)} · ${order.orderType === "CUSTOM_PRINT" ? "Custom print" : "Retail"}`} returnHref={returnTo} returnLabel="Kembali ke Orders" breadcrumbs={[{ label: "Orders", href: returnTo }, { label: order.orderNumber }]} />

        {paymentHeld ? (
          <Card as="section" aria-labelledby="payment-exception-title" className="gap-0 py-0 ring-0 rounded-xl border border-warning-border bg-warning-background p-5 text-warning sm:p-6">
            <h2 className="text-xl font-semibold" id="payment-exception-title">Pembayaran perlu diperiksa</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6">Proses dan pengiriman order ditahan. Owner perlu mencocokkan referensi pembayaran di dashboard Midtrans dan menangani refund sesuai kondisi order. Refund tidak otomatis mengembalikan stok fisik.</p>
            <ul className="mt-4 space-y-3 text-sm">
              {order.paymentIssues.map((issue) => (
                <li key={`${issue.paymentAttemptId}:${issue.kind}`}>
                  <p className="font-semibold">{PAYMENT_ISSUE_LABELS[issue.kind]}</p>
                  <p className="mt-1 break-words">{issue.purpose === "CUSTOM_SHIPPING" ? "Pembayaran pengiriman" : "Pembayaran order"} · <span className="font-medium">{issue.providerOrderId}</span></p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {order.orderType === "CUSTOM_PRINT" ? <Card as="section" aria-labelledby="source-requests-title" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="source-requests-title">Request asal</h2>
          {sourceRequests.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Tidak ada relasi request pada item order ini.</p> : <ul className="mt-3 grid gap-2">{sourceRequests.map(request => <li key={request.id}><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/custom-print/${request.id}`, returnTo)}>{request.referenceNumber} · {formatStatus(request.status)}</Link></li>)}</ul>}
        </Card> : null}
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
        <Card as="section" aria-labelledby="order-actions-title" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6 xl:col-start-2 xl:row-span-3">
          <h2 className="text-xl font-semibold" id="order-actions-title">Aksi operasional</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Pilih tindakan sesuai tahap order. Pembatalan order berbayar tetap memerlukan tindak lanjut refund terpisah.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {nextStatuses.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada tindakan status lanjutan dari tahap ini.</p> : nextStatuses.map((next) => (
              <AdminActionForm action={transitionOrderAction} confirmMessage={next === "CANCELLED" ? "Batalkan order ini? Status tidak dapat dibuka kembali otomatis." : undefined} key={next} submitLabel={`Ubah ke ${formatStatus(next)}`}>
                <input name="orderId" type="hidden" value={order.id} />
                <input name="nextStatus" type="hidden" value={next} />
              </AdminActionForm>
            ))}
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Tautan status customer</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Gunakan ini untuk mengganti tautan lama untuk customer. Tautan lama akan langsung tidak berlaku.</p>
            <AdminActionForm action={reissueOrderTokenAction} className="mt-4" confirmMessage="Terbitkan tautan baru dan cabut token lama untuk order ini?" submitLabel="Terbitkan tautan baru">
              <input name="orderId" type="hidden" value={order.id} />
            </AdminActionForm>
          </div>
          {!paymentHeld && order.orderType === "CUSTOM_PRINT" &&
          (currentStatus === "FINISHING_QC" || currentStatus === "WAITING_SHIPPING_PAYMENT") ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Pengukuran paket final</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Catat berat dan dimensi setelah finishing. Server akan meminta rate provider, menyimpan snapshot shipment, lalu membuat atau memakai ulang payment attempt shipping.
              </p>
              <AdminActionForm action={createCustomShippingPaymentAction} className="mt-4" submitLabel="Siapkan pembayaran pengiriman">
                <input name="orderId" type="hidden" value={order.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <MeasurementField label="Berat final (gram)" name="finalWeightGrams" />
                  <MeasurementField label="Panjang final (cm)" name="finalLengthCm" />
                  <MeasurementField label="Lebar final (cm)" name="finalWidthCm" />
                  <MeasurementField label="Tinggi final (cm)" name="finalHeightCm" />
                </div>
              </AdminActionForm>
            </div>
          ) : null}
          {!paymentHeld && (currentStatus === "READY_TO_SHIP" || currentStatus === "SHIPPED") && order.shipments.length > 0 ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold">Kurir dan nomor resi</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Catat data pengiriman manual setelah paket siap. Booking kurir otomatis tidak diperlukan untuk menyimpan metadata ini.
              </p>
              <AdminActionForm action={recordShipmentMetadataAction} className="mt-4" submitLabel="Simpan kurir & resi">
                <input name="orderId" type="hidden" value={order.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ShipmentMetadataField label="Kode kurir" name="courierCode" value={order.shipments[0]?.courierCode ?? ""} />
                  <ShipmentMetadataField label="Nomor resi" name="trackingNumber" value={order.shipments[0]?.trackingNumber ?? ""} />
                </div>
              </AdminActionForm>
            </div>
          ) : null}
        </Card>

        {order.orderType === "CUSTOM_PRINT" && !["CANCELLED", "COMPLETED", "SHIPPED"].includes(currentStatus) ? (
          <Card as="section" aria-labelledby="custom-address-title" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold" id="custom-address-title">Alamat pengiriman</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Order custom dibuat tanpa alamat. Simpan alamat penerima sebelum meminta rate provider dan membuat tagihan shipping.</p>
            <AdminActionForm action={saveCustomShippingAddressAction} className="mt-5" submitLabel="Simpan alamat pengiriman">
              <input name="orderId" type="hidden" value={order.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <ShipmentMetadataField label="Nama penerima" name="recipientName" value={order.address?.recipientName ?? ""} />
                <ShipmentMetadataField label="Nomor telepon" name="phone" value={order.address?.phone ?? ""} />
                <Label className="grid gap-1.5 text-sm font-medium sm:col-span-2" htmlFor="addressLine">
                  Alamat lengkap
                  <Textarea className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base font-normal shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={order.address?.addressLine ?? ""} id="addressLine" name="addressLine" required rows={3} />
                </Label>
                <ShipmentMetadataField label="Kecamatan (opsional)" name="district" value={order.address?.district ?? ""} required={false} />
                <ShipmentMetadataField label="Kota atau kabupaten" name="city" value={order.address?.city ?? ""} />
                <ShipmentMetadataField label="Provinsi" name="province" value={order.address?.province ?? ""} />
                <ShipmentMetadataField label="Kode pos" name="postalCode" value={order.address?.postalCode ?? ""} />
              </div>
            </AdminActionForm>
          </Card>
        ) : null}

        <div className="grid min-w-0 gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <Card as="section" aria-labelledby="customer-title" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold" id="customer-title">Customer & alamat</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Nama" value={order.customerName} />
              <Info label="Email" value={order.customerEmail} />
              <Info label="Telepon" value={order.customerPhone} />
              {order.address ? <Info label="Penerima" value={`${order.address.recipientName} · ${order.address.phone}`} /> : null}
            </dl>
            {order.address ? <div className="mt-5 border-t border-border pt-4 text-sm leading-6"><p className="text-xs text-muted-foreground">Alamat pengiriman</p><p className="mt-1">{order.address.addressLine}, {order.address.district ? `${order.address.district}, ` : ""}{order.address.city}, {order.address.province} {order.address.postalCode} · {order.address.countryCode}</p></div> : <StatusNotice className="mt-5" tone="warning" title="Alamat belum tercatat" description="Order ini belum memiliki alamat pengiriman di database." />}
          </Card>

          <Card as="section" aria-labelledby="totals-title" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold" id="totals-title">Ringkasan nilai</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <Info label="Subtotal" value={formatMoney(order.itemsSubtotalRp)} />
              <Info label="Pengiriman" value={formatMoney(order.shippingTotalRp)} />
              <div className="border-t border-border pt-4"><dt className="text-xs text-muted-foreground">Total order</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(order.grandTotalRp)}</dd></div>
              <Info label="Diperbarui" value={dateFormatter.format(order.updatedAt)} />
            </dl>
          </Card>
        </div>

        <Card as="section" aria-labelledby="items-title" className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="items-title">Item order</h2>
          {order.items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Belum ada item tersimpan.</p> : <div className="mt-5 overflow-x-auto"><Table className="w-full min-w-[40rem] text-left text-sm"><TableCaption className="sr-only">Item pada {order.orderNumber}</TableCaption><TableHeader className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground"><TableRow><TableHead className="pb-3 font-medium" scope="col">Item</TableHead><TableHead className="pb-3 font-medium" scope="col">SKU</TableHead><TableHead className="pb-3 text-right font-medium" scope="col">Qty</TableHead><TableHead className="pb-3 text-right font-medium" scope="col">Total</TableHead></TableRow></TableHeader><TableBody className="divide-y divide-border">{order.items.map((item, index) => <TableRow key={`${item.skuSnapshot ?? item.nameSnapshot}-${index}`}><TableHead className="py-3 font-medium" scope="row">{item.nameSnapshot}<span className="mt-1 block text-xs font-normal text-muted-foreground">{formatStatus(item.itemType)}</span></TableHead><TableCell className="py-3 font-mono text-xs text-muted-foreground">{item.skuSnapshot ?? "—"}</TableCell><TableCell className="py-3 text-right tabular-nums">{item.quantity}</TableCell><TableCell className="py-3 text-right font-semibold tabular-nums">{formatMoney(item.lineTotalRp)}</TableCell></TableRow>)}</TableBody></Table></div>}
        </Card>

        <div className="grid min-w-0 gap-6 xl:col-span-2 lg:grid-cols-3">
          <RecordList title="Pembayaran" empty="Belum ada percobaan pembayaran." items={order.paymentAttempts.map((attempt) => `${attempt.providerOrderId} · ${formatStatus(attempt.status)} · ${formatMoney(attempt.amountRp)}`)} />
          <RecordList title="Reservasi stok" empty="Tidak ada reservasi stok." items={order.reservations.map((reservation) => `${reservation.variantId} · ${reservation.quantity} unit · ${formatStatus(reservation.status)}`)} />
          <RecordList title="Pengiriman" empty="Belum ada shipment." items={order.shipments.map((shipment) => `${formatStatus(shipment.status)} · ${shipment.courierCode ?? "Kurir belum dicatat"} · ${shipment.trackingNumber ?? "Tanpa resi"}`)} />
        </div>
        <p className="text-xs leading-5 text-muted-foreground xl:col-span-2">Pembayaran dan pengiriman mengikuti status yang sudah terkonfirmasi. Periksa ringkasan di atas sebelum melanjutkan order.</p>
        </div>
      </main>
    </AdminShell>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>;
}

function MeasurementField({ label, name }: Readonly<{ label: string; name: string }>) {
  return (
    <Label className="grid gap-1.5 text-sm font-medium" htmlFor={name}>
      {label}
      <Input
        className="min-h-11 rounded-lg border border-input bg-background px-3 text-base font-normal shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        id={name}
        inputMode="decimal"
        name={name}
        placeholder="0"
        required
        type="text"
      />
    </Label>
  );
}

function ShipmentMetadataField({ label, name, required = true, value }: Readonly<{ label: string; name: string; required?: boolean; value: string }>) {
  return (
    <Label className="grid gap-1.5 text-sm font-medium" htmlFor={name}>
      {label}
      <Input
        className="min-h-11 rounded-lg border border-input bg-background px-3 text-base font-normal shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        defaultValue={value}
        id={name}
        name={name}
        required={required}
        type="text"
      />
    </Label>
  );
}

function RecordList({ empty, items, title }: Readonly<{ empty: string; items: readonly string[]; title: string }>) {
  const id = `${title.toLocaleLowerCase("id").replaceAll(/[^a-z0-9]+/g, "-")}-title`;
  return <Card as="section" aria-labelledby={id} className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold" id={id}>{title}</h2>{items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{empty}</p> : <ul className="mt-4 grid gap-3 text-sm">{items.map((item) => <li className="border-t border-border pt-3 leading-6" key={item}>{item}</li>)}</ul>}</Card>;
}

function formatMoney(value: string): string { return currencyFormatter.format(BigInt(value)); }
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
