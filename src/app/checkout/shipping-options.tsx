"use client";

import { Button } from "@/components/ui/button";
import { StatusNotice } from "@/components/niuva/status-notice";

export type ShippingPreviewOption = Readonly<{
  id: string;
  carrier: string;
  service: string;
  eta: string;
  priceRp: string;
}>;

export type ShippingPreviewStatus = "idle" | "loading" | "ready" | "unavailable" | "stale";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function ShippingOptions({
  error,
  onChange,
  onRetry,
  options,
  selectedId,
  status,
}: {
  error?: string;
  onChange: (optionId: string) => void;
  onRetry: () => void;
  options: readonly ShippingPreviewOption[];
  selectedId: string | null;
  status: ShippingPreviewStatus;
}) {
  return (
    <fieldset
      id="checkout-shippingOption"
      tabIndex={-1}
      aria-describedby={error ? "checkout-shippingOption-error" : "checkout-shipping-help"}
      aria-invalid={error ? true : undefined}
      className="min-w-0 rounded-xl border border-border p-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5"
    >
      <legend className="px-2 text-base font-semibold">Opsi pengiriman</legend>
      <p id="checkout-shipping-help" className="mb-4 text-sm leading-6 text-muted-foreground">
        Opsi berikut hanya data simulasi untuk meninjau alur. Server akan meminta dan memeriksa ulang tarif nyata sebelum membuat order.
      </p>

      {status === "idle" ? (
        <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
          Lengkapi data kontak dan alamat, lalu tinjau opsi pengiriman.
        </p>
      ) : null}

      {status === "loading" ? (
        <div role="status" aria-busy="true" className="space-y-3">
          <p className="text-sm font-medium">Memuat simulasi opsi pengiriman…</p>
          <div className="h-20 rounded-lg bg-muted motion-safe:animate-pulse" />
          <div className="h-20 rounded-lg bg-muted motion-safe:animate-pulse" />
          <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Coba lagi</Button>
        </div>
      ) : null}

      {status === "unavailable" ? (
        <StatusNotice
          tone="error"
          title="Opsi pengiriman belum tersedia."
          description="Isian alamat tetap ada. Jalankan ulang simulasi untuk meninjau jalur pemulihan tanpa mengirim data."
          action={<Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Coba lagi</Button>}
        />
      ) : null}

      {status === "stale" ? (
        <StatusNotice
          tone="warning"
          title="Pilihan pengiriman sudah kedaluwarsa."
          description="Pilihan lama dibatalkan. Muat opsi terbaru, lalu pilih ulang sebelum melanjutkan."
          action={<Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Muat opsi terbaru</Button>}
        />
      ) : null}

      {status === "ready" ? (
        <div className="space-y-3">
          {options.map(option => {
            const selected = selectedId === option.id;
            return (
              <label
                key={option.id}
                className={`grid min-h-16 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border p-4 transition-colors focus-within:ring-3 focus-within:ring-ring/50 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${selected ? "border-brand-600 bg-brand-50" : "border-border bg-background hover:bg-muted"}`}
              >
                <input
                  type="radio"
                  name="shippingOption"
                  value={option.id}
                  checked={selected}
                  onChange={() => onChange(option.id)}
                  className="mt-1 size-5 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{option.carrier} · {option.service}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">Estimasi tiba {option.eta}</span>
                </span>
                <span className="col-start-2 font-semibold tabular-nums sm:col-start-3 sm:text-right">
                  {rupiah.format(BigInt(option.priceRp))}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}

      {error ? <p id="checkout-shippingOption-error" role="alert" className="mt-3 text-xs leading-5 text-destructive">{error}</p> : null}
    </fieldset>
  );
}
