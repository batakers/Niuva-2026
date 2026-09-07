import Link from "next/link";
import { Box, CircleDollarSign, FileLock2, PackageCheck, ShieldCheck } from "lucide-react";

import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { OrderStatusTimeline } from "@/components/niuva/order-status-timeline";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Button } from "@/components/ui/button";
import type { OrderStatusPreview, OrderStatusPreviewScenario } from "@/features/frontend-preview/order-status";

function NextAction({ action }: Readonly<{ action: OrderStatusPreview["nextAction"] }>) {
  const control = action.kind === "quote"
    ? <Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/quote/preview-quote?preview=examples">{action.label}</Link>
    : action.kind === "payment-unavailable" || action.kind === "shipping-payment-unavailable"
      ? <Button className="min-h-11" disabled type="button">{action.label}</Button>
      : undefined;

  return (
    <StatusNotice
      action={control}
      description={action.description}
      title={action.title}
      tone={action.tone}
    />
  );
}

export function OrderStatus({
  order,
  scenario,
}: Readonly<{
  order: OrderStatusPreview;
  scenario: OrderStatusPreviewScenario;
}>) {
  const isCustom = order.orderType === "CUSTOM_PRINT";

  return (
    <main className="overflow-x-hidden" data-order-state={scenario} id="main-content">
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="text-sm font-medium text-brand-700">Status order</p>
            <h1 className={`${type.display.className} mt-4 max-w-4xl text-balance`}>{order.currentLabel}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">{order.currentDescription}</p>
          </div>

          <div aria-current="true" aria-live="polite" className="rounded-xl bg-brand-950 p-6 text-neutral-50 lg:col-span-5" role="status">
            <p className="text-xs text-neutral-300">Status saat ini</p>
            <p className="mt-2 text-xl font-semibold">{order.currentLabel}</p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-neutral-300">Nomor order</dt>
                <dd className="mt-1 font-mono text-sm font-medium">{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-300">Jenis</dt>
                <dd className="mt-1 text-sm font-medium">{isCustom ? "Custom print" : "Ready-made"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
          <div className="mb-10 rounded-xl border border-info-border bg-info-background p-4 text-sm text-info">
            Preview lokal dengan data sintetis. Query browser hanya memilih skenario tampilan dan tidak menentukan status order nyata.
          </div>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <section aria-labelledby="order-timeline-title" className="lg:col-span-7">
              <div className="mb-6 flex items-start gap-3">
                <PackageCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-brand-700" />
                <div>
                  <h2 className={type.heading.className} id="order-timeline-title">Perjalanan order</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Timeline publik menampilkan tahap customer, bukan transition atau catatan internal operator.</p>
                </div>
              </div>
              <OrderStatusTimeline
                description={`Dibuat ${order.createdAt}.`}
                nextExpectation={order.nextAction.title}
                steps={order.steps}
                title={order.orderNumber}
                variant={isCustom ? "custom-quote" : "retail-order"}
              />
            </section>

            <aside aria-label="Ringkasan dan langkah berikutnya" className="space-y-6 lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
              <section className="rounded-xl border border-border bg-card p-5 shadow-card" aria-labelledby="order-summary-title">
                <div className="flex items-center gap-3">
                  <Box aria-hidden="true" className="size-5 text-brand-700" />
                  <h2 className="text-base font-semibold" id="order-summary-title">Ringkasan aman</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Alamat lengkap, kontak customer, file privat, dan catatan operator tidak ditampilkan.</p>
                <ul className="mt-5 space-y-4" aria-label="Item order">
                  {order.items.map((item) => (
                    <li className="grid grid-cols-[1fr_auto] gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0" key={item.label}>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Jumlah {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{item.total}</p>
                    </li>
                  ))}
                </ul>
                <dl className="mt-5 border-t border-border pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">Total snapshot</dt>
                    <dd className="text-lg font-semibold tabular-nums">{order.total}</dd>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-muted-foreground">Pembayaran utama</dt>
                    <dd className="text-right text-sm font-medium">{order.paidAt ?? "Belum terverifikasi"}</dd>
                  </div>
                </dl>
              </section>

              <NextAction action={order.nextAction} />

              {order.shipment ? (
                <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="shipment-title">
                  <div className="flex items-center gap-3">
                    <CircleDollarSign aria-hidden="true" className="size-5 text-brand-700" />
                    <h2 className="text-base font-semibold" id="shipment-title">Pengiriman</h2>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{order.shipment.status}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Nomor lacak</dt><dd className="font-mono font-medium">{order.shipment.trackingNumber}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">Nomor lacak ini sintetis dan tidak membuka situs provider.</p>
                </section>
              ) : null}

              <div className="flex gap-3 border-l-2 border-brand-300 pl-4 text-sm leading-6 text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" />
                <p>Butuh bantuan? Siapkan nomor order saat menghubungi Niuva melalui kanal konfirmasi yang Anda terima.</p>
              </div>

              <div className="flex gap-3 text-xs leading-5 text-muted-foreground">
                <FileLock2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p>Status paid, shipping, dan cancellation pada alur nyata hanya berasal dari service server dan webhook terverifikasi.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
