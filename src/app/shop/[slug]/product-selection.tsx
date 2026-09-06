"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { StatusNotice } from "@/components/niuva/status-notice";
import { VariantSelector } from "@/components/niuva/variant-selector";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicShopProduct } from "@/features/frontend-preview/types";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function ProductSelection({ product }: { product: PublicShopProduct }) {
  const hydrated = useHydrated();
  const [selectedId, setSelectedId] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [prepared, setPrepared] = useState(false);
  const selected = product.variants.find(variant => variant.id === selectedId);
  const canPrepare = Boolean(hydrated && selected && selected.stockOnHand > 0 && quantity >= 1 && quantity <= selected.stockOnHand);
  const hasAvailableVariant = product.variants.some(variant => variant.stockOnHand > 0);

  function chooseVariant(optionId: string) {
    setSelectedId(optionId);
    setQuantity(1);
    setPrepared(false);
  }

  function changeQuantity(next: number) {
    if (!selected) return;
    setQuantity(Math.min(Math.max(next, 1), selected.stockOnHand));
    setPrepared(false);
  }

  return (
    <section aria-labelledby="purchase-options-title" className="mt-8 border-t border-border pt-7">
      <h2 id="purchase-options-title" className="text-lg font-semibold">Pilih varian dan jumlah</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Harga dan ketersediaan mengikuti varian. Keduanya akan diverifikasi kembali oleh server saat checkout tersedia.
      </p>

      {!hasAvailableVariant ? (
        <div className="mt-5">
          <StatusNotice tone="warning" title="Semua varian sedang habis." description="Anda tetap dapat meninjau pilihan, tetapi belum ada varian yang dapat disiapkan untuk cart." />
        </div>
      ) : null}

      <VariantSelector
        className="mt-6"
        description="Varian berstatus stok habis tidak dapat dipilih."
        label="Varian produk"
        onChange={chooseVariant}
        options={product.variants.map(variant => ({
          availability: variant.stockOnHand > 0 ? "available" : "out-of-stock",
          detail: variant.stockOnHand > 0 ? `${variant.stockOnHand} tersedia pada data contoh` : undefined,
          id: variant.id,
          label: variant.name,
          price: rupiah.format(BigInt(variant.priceRp)),
        }))}
        selectedId={selectedId ?? ""}
        variant="list"
      />

      <div className="mt-7 grid gap-6 border-y border-border py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-xs text-muted-foreground">Harga pilihan</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" aria-live="polite">
            {selected ? rupiah.format(BigInt(selected.priceRp)) : "Pilih varian"}
          </p>
          <p id="selection-state" className="mt-2 text-xs leading-5 text-muted-foreground">
            {selected ? `${selected.name}, maksimum ${selected.stockOnHand} pada data contoh.` : "Pilih satu varian yang tersedia untuk mengatur jumlah."}
          </p>
        </div>

        <div>
          <label htmlFor="product-quantity" className="mb-2 block text-sm font-medium">Jumlah</label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label="Kurangi jumlah"
              disabled={!hydrated || !selected || quantity <= 1} onClick={() => changeQuantity(quantity - 1)}>
              <Minus aria-hidden="true" />
            </Button>
            <Input id="product-quantity" type="number" inputMode="numeric" min={1} max={selected?.stockOnHand ?? 1}
              className="h-11 w-20 text-center text-base tabular-nums" value={quantity} disabled={!hydrated || !selected}
              onChange={event => changeQuantity(Number.parseInt(event.target.value, 10) || 1)} />
            <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label="Tambah jumlah"
              disabled={!hydrated || !selected || quantity >= selected.stockOnHand} onClick={() => changeQuantity(quantity + 1)}>
              <Plus aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Button type="button" size="lg" className="mt-6 min-h-11 w-full cursor-pointer" disabled={!canPrepare}
        aria-describedby="selection-state cart-preview-note" onClick={() => setPrepared(true)}>
        Tambah ke cart (preview)
      </Button>
      <p id="cart-preview-note" className="mt-3 text-xs leading-5 text-muted-foreground">
        FE-09 hanya menguji pilihan produk. Cart lokal baru akan dibuat pada FE-10, jadi pilihan ini belum disimpan.
      </p>

      {prepared ? (
        <div className="mt-5">
          <StatusNotice tone="success" title="Pilihan siap untuk cart." description={`${quantity} × ${selected?.name ?? "varian"} lolos pemeriksaan UI. Belum ada cart, reservasi stok, atau transaksi yang dibuat.`} />
        </div>
      ) : null}
      <noscript><p className="mt-3 text-sm text-muted-foreground">Aktifkan JavaScript untuk memilih varian dan jumlah. Tidak ada cart yang dibuat dari halaman ini.</p></noscript>
    </section>
  );
}
