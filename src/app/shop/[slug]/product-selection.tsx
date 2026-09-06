"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { StatusNotice } from "@/components/niuva/status-notice";
import { VariantSelector } from "@/components/niuva/variant-selector";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { AuLink } from "@/components/ui/AuLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCartItem, readCart, writeCart } from "@/features/cart/cart-state";
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
  const [cartResult, setCartResult] = useState<"idle" | "added" | "recovered" | "error">("idle");
  const selected = product.variants.find(variant => variant.id === selectedId);
  const canPrepare = Boolean(hydrated && selected && selected.stockOnHand > 0 && quantity >= 1 && quantity <= selected.stockOnHand);
  const hasAvailableVariant = product.variants.some(variant => variant.stockOnHand > 0);

  function chooseVariant(optionId: string) {
    setSelectedId(optionId);
    setQuantity(1);
    setCartResult("idle");
  }

  function changeQuantity(next: number) {
    if (!selected) return;
    setQuantity(Math.min(Math.max(next, 1), selected.stockOnHand));
    setCartResult("idle");
  }

  function addSelectionToCart() {
    if (!selected || !canPrepare) return;
    const current = readCart(window.localStorage);
    if (!current.storageAvailable) {
      setCartResult("error");
      return;
    }

    const next = addCartItem(
      current.snapshot,
      { variantId: selected.id, quantity },
      selected.stockOnHand,
    );
    if (!writeCart(window.localStorage, next)) {
      setCartResult("error");
      return;
    }
    setCartResult(current.recovered ? "recovered" : "added");
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
        aria-describedby="selection-state cart-preview-note" onClick={addSelectionToCart}>
        Tambah ke cart
      </Button>
      <p id="cart-preview-note" className="mt-3 text-xs leading-5 text-muted-foreground">
        Cart lokal hanya menyimpan ID varian dan jumlah. Harga, stok, ongkir, dan total final tidak disimpan sebagai otoritas browser.
      </p>

      {cartResult === "added" || cartResult === "recovered" ? (
        <div className="mt-5">
          <StatusNotice
            tone="success"
            title="Pilihan ditambahkan ke cart."
            description={`${quantity} × ${selected?.name ?? "varian"} tersimpan lokal.${cartResult === "recovered" ? " Data cart lama yang tidak valid telah dibersihkan." : ""} Belum ada reservasi stok atau transaksi yang dibuat.`}
            action={<AuLink href="/cart?preview=examples" variant="outline" className="min-h-11">Lihat cart</AuLink>}
          />
        </div>
      ) : null}
      {cartResult === "error" ? (
        <div className="mt-5"><StatusNotice tone="error" title="Pilihan belum tersimpan." description="Browser menolak akses penyimpanan lokal. Periksa pengaturan browser lalu coba lagi." /></div>
      ) : null}
      <noscript><p className="mt-3 text-sm text-muted-foreground">Aktifkan JavaScript untuk memilih varian, mengatur jumlah, dan menyimpan cart lokal.</p></noscript>
    </section>
  );
}
