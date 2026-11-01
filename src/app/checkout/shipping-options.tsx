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
export type ShippingOptionsMode = "demo" | "live" | "preview";

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
  mode,
}: {
  error?: string;
  onChange: (optionId: string) => void;
  onRetry: () => void;
  options: readonly ShippingPreviewOption[];
  selectedId: string | null;
  status: ShippingPreviewStatus;
  mode?: ShippingOptionsMode;
}) {
  const isDemo = mode === "demo";
  const isServerBacked = mode === "live" || isDemo;
  return (
    // The card wraps the fieldset so the legend sits inside the surface instead of on its border.
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7">
      <fieldset
        id="checkout-shippingOption"
        tabIndex={-1}
        aria-describedby={error ? "checkout-shippingOption-error" : "checkout-shipping-help"}
        aria-invalid={error ? true : undefined}
        className="min-w-0 rounded-[var(--radius-control)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-4 focus-visible:ring-offset-card"
      >
        <legend className="mb-5 flex items-center gap-3 text-xl font-medium tracking-[-0.015em]">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-ui font-semibold text-brand-800 tabular-nums">3</span>
          Opsi pengiriman
        </legend>
        <p id="checkout-shipping-help" className="-mt-2 mb-5 text-ui font-normal leading-[1.55] text-muted-foreground">
          {isDemo
            ? "Tarif demo dari adapter lokal. Ongkir diperiksa lagi saat pesanan dibuat."
            : isServerBacked
              ? "Tarif dari kurir untuk alamat ini. Ongkir diperiksa lagi saat pesanan dibuat."
            : "Opsi berikut hanya contoh untuk meninjau alur. Tarif sungguhan diperiksa saat pesanan dibuat."}
        </p>

        {status === "idle" ? (
          <p className="rounded-[var(--radius-control)] bg-muted/60 p-4 text-ui font-normal leading-[1.55] text-muted-foreground">
            Lengkapi kontak dan alamat, lalu pilih Tinjau opsi pengiriman.
          </p>
        ) : null}

        {status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <p className="text-ui font-medium">{isDemo ? "Memuat opsi pengiriman demo…" : isServerBacked ? "Memuat opsi pengiriman…" : "Memuat simulasi opsi pengiriman…"}</p>
            <div className="h-16 rounded-[var(--radius-control)] bg-muted motion-safe:animate-pulse" />
            <div className="h-16 rounded-[var(--radius-control)] bg-muted motion-safe:animate-pulse" />
            <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Coba lagi</Button>
          </div>
        ) : null}

        {status === "unavailable" ? (
          <StatusNotice
            tone="error"
            title="Opsi pengiriman belum tersedia."
            description={isServerBacked ? "Isian alamat tetap ada. Periksa kode pos, lalu coba lagi." : "Isian alamat tetap ada. Jalankan ulang simulasi untuk meninjau jalur pemulihan tanpa mengirim data."}
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
                  className={`grid min-h-16 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[var(--radius-control)] border p-4 transition-colors duration-[var(--duration-fast-token)] focus-within:ring-3 focus-within:ring-ring/50 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${selected ? "border-brand-600 bg-brand-50" : "border-border bg-card hover:border-brand-400"}`}
                >
                  <input
                    type="radio"
                    name="shippingOption"
                    value={option.id}
                    checked={selected}
                    onChange={() => onChange(option.id)}
                    className="mt-0.5 size-5 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-ui font-semibold">{option.carrier} · {option.service}</span>
                    <span className="mt-1 block text-caption text-muted-foreground">Estimasi tiba {option.eta}</span>
                  </span>
                  <span className="col-start-2 text-ui font-semibold tabular-nums sm:col-start-3 sm:text-right">
                    {rupiah.format(BigInt(option.priceRp))}
                  </span>
                </label>
              );
            })}
          </div>
        ) : null}

        {error ? <p id="checkout-shippingOption-error" role="alert" className="mt-3 text-ui font-medium text-destructive">{error}</p> : null}
      </fieldset>
    </div>
  );
}
