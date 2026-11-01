import type { ReactNode } from "react";
import Link from "next/link";

import { typographySystemTokens as type } from "@/design/typography";
import { OrderStatusTimeline } from "@/components/niuva/order-status-timeline";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OrderStatusPreview, OrderStatusPreviewScenario } from "@/features/frontend-preview/order-status";

import { resolveNextActionControl } from "./next-action";

const actionLinkClassName = buttonVariants({ className: "min-h-11" });

function NextAction({ action, payment, isPreview }: Readonly<{
  action: OrderStatusPreview["nextAction"];
  isPreview?: boolean | undefined;
  payment: OrderStatusPreview["payment"];
}>) {
  const resolved = resolveNextActionControl({ action, isPreview, payment });
  const paymentLabel = payment?.purpose === "CUSTOM_SHIPPING"
    ? "Buka pembayaran pengiriman"
    : "Buka pembayaran";

  if (resolved.kind === "quote-unavailable") {
    return (
      <StatusNotice
        description="Niuva belum dapat menampilkan tautan quote untuk pesanan ini. Siapkan nomor pesanan dan minta tautan quote terbaru melalui kanal konfirmasi yang Anda terima."
        title="Tautan quote belum tersedia"
        tone="warning"
      />
    );
  }

  let control: ReactNode;
  switch (resolved.kind) {
    case "payment-link":
      control = <a className={actionLinkClassName} href={resolved.href} rel="noreferrer" target="_blank">{resolved.label}</a>;
      break;
    case "quote-link":
      control = <Link className={actionLinkClassName} href={resolved.href}>{resolved.label}</Link>;
      break;
    case "disabled":
      control = <Button className="min-h-11" disabled type="button">{resolved.label}</Button>;
      break;
    case "none":
      control = undefined;
      break;
  }

  return (
    <StatusNotice
      action={control}
      description={payment?.redirectUrl
        ? `Tautan pembayaran ${payment.purpose === "CUSTOM_SHIPPING" ? "pengiriman " : ""}berlaku sampai ${payment.expiresAt}. Status berubah setelah pembayaran dikonfirmasi.`
        : action.description}
      title={payment?.redirectUrl ? `${paymentLabel} tersedia` : action.title}
      tone={action.tone}
    />
  );
}

export function OrderStatus({
  order,
  scenario,
  isPreview,
}: Readonly<{
  isPreview?: boolean | undefined;
  order: OrderStatusPreview;
  scenario: OrderStatusPreviewScenario;
}>) {
  const isCustom = order.orderType === "CUSTOM_PRINT";
  const facts = [
    ["Nomor pesanan", order.orderNumber],
    ["Jenis", isCustom ? "Custom 3D Print" : "Produk Toko"],
    ["Dibuat", order.createdAt],
  ] as const;

  return (
    <main className="overflow-x-hidden" data-order-source={isPreview ? "preview" : "live"} data-order-state={scenario} id="main-content">
      <div className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14">
        {isPreview ? (
          <StatusNotice aria-label="Preview status pesanan" className="mb-8" description="Pilihan skenario hanya mengubah tampilan, bukan status pesanan sungguhan." role="note" size="compact" title="Preview lokal dengan data sintetis." tone="info" />
        ) : null}
        <h1 className={`${type.display.className} max-w-[16em] text-balance`}>{order.currentLabel}</h1>
        <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">{order.currentDescription}</p>
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
          <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Tahap yang perlu Anda ketahui; catatan internal tim Niuva tidak ditampilkan.</p>
          <OrderStatusTimeline
            className="mt-5"
            nextExpectation={order.nextAction.title}
            steps={order.steps}
            title={order.orderNumber}
            variant={isCustom ? "custom-quote" : "retail-order"}
          />
        </section>

        <aside aria-label="Langkah berikutnya dan ringkasan" className="space-y-4 lg:sticky lg:top-24">
          <NextAction action={order.nextAction} isPreview={isPreview} payment={order.payment} />

          <section aria-labelledby="order-summary-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-medium tracking-[-0.015em]" id="order-summary-title">Ringkasan pesanan</h2>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Alamat lengkap, kontak customer, file privat, dan catatan operator tidak ditampilkan.</p>
            <ul aria-label="Item pesanan" className="mt-5 divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3" key={item.label}>
                  <div className="min-w-0">
                    <p className="text-ui font-medium">{item.label}</p>
                    <p className="mt-0.5 text-caption text-muted-foreground">Jumlah {item.quantity}</p>
                  </div>
                  <p className="text-ui font-medium tabular-nums">{item.total}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-2xl font-semibold tracking-[-0.015em] tabular-nums">{order.total}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ui font-normal text-muted-foreground">{isCustom ? "Pembayaran utama" : "Pembayaran"}</dt>
                <dd className="text-right text-ui font-medium">{order.paidAt ?? "Belum terverifikasi"}</dd>
              </div>
            </dl>
          </section>

          {order.shipment ? (
            <section aria-labelledby="shipment-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
              <h2 className="text-xl font-medium tracking-[-0.015em]" id="shipment-title">Pengiriman</h2>
              <dl className="mt-4 space-y-3 text-ui">
                <div className="flex justify-between gap-4"><dt className="font-normal text-muted-foreground">Status</dt><dd className="text-right font-medium">{order.shipment.status}</dd></div>
                <div className="flex justify-between gap-4"><dt className="font-normal text-muted-foreground">Nomor lacak</dt><dd className="text-right font-medium tabular-nums">{order.shipment.trackingNumber}</dd></div>
              </dl>
              <p className="mt-4 text-caption leading-[1.45] text-muted-foreground">{isPreview ? "Nomor lacak ini sintetis dan tidak membuka situs provider." : "Gunakan nomor lacak ini di situs kurir untuk melacak paket."}</p>
            </section>
          ) : null}

          <p className="px-1 text-ui font-normal leading-[1.55] text-muted-foreground">
            Butuh bantuan? Siapkan nomor pesanan saat menghubungi Niuva melalui kanal konfirmasi yang Anda terima. Status pembayaran baru berubah setelah pembayaran dikonfirmasi.
          </p>
        </aside>
      </div>
    </main>
  );
}
