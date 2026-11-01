"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusNotice } from "@/components/niuva/status-notice";
import { VariantSelector } from "@/components/niuva/variant-selector";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { addCartItem, cartStorageKey, readCart, writeCart } from "@/features/cart/cart-state";
import type { PublicShopProduct } from "@/features/frontend-preview/types";
import { customerVariantName } from "@/features/public/shop-display-copy";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export function ProductSelection({ product, previewEnabled = true, onVariantChange }: {
  product: PublicShopProduct;
  previewEnabled?: boolean;
  /** Lets the gallery show the chosen variant's photo. */
  onVariantChange?: (variantId: string) => void;
}) {
  const hydrated = useHydrated();
  // A product with one variant has nothing to choose: it is selected from the start and the list is hidden.
  const onlyVariant = product.variants.length === 1 ? product.variants[0] : undefined;
  const [selectedId, setSelectedId] = useState<string | undefined>(onlyVariant && onlyVariant.stockOnHand > 0 ? onlyVariant.id : undefined);
  const [quantity, setQuantity] = useState(1);
  const [cartResult, setCartResult] = useState<"idle" | "added" | "recovered" | "error">("idle");
  const selected = product.variants.find(variant => variant.id === selectedId);
  const canPrepare = Boolean(hydrated && selected && selected.stockOnHand > 0 && quantity >= 1 && quantity <= selected.stockOnHand);
  const hasAvailableVariant = product.variants.some(variant => variant.stockOnHand > 0);
  const shown = selected ?? onlyVariant;
  const shownName = shown ? customerVariantName(shown.name) : null;
  const addedName = selected ? customerVariantName(selected.name) : null;

  function chooseVariant(optionId: string) {
    setSelectedId(optionId);
    setQuantity(1);
    setCartResult("idle");
    onVariantChange?.(optionId);
  }

  function changeQuantity(next: number) {
    if (!selected) return;
    setQuantity(Math.min(Math.max(next, 1), selected.stockOnHand));
    setCartResult("idle");
  }

  function addSelectionToCart() {
    if (!selected || !canPrepare) return;
    const storageKey = cartStorageKey(previewEnabled);
    const current = readCart(window.localStorage, storageKey);
    if (!current.storageAvailable) {
      setCartResult("error");
      return;
    }

    const next = addCartItem(
      current.snapshot,
      { variantId: selected.id, quantity },
      selected.stockOnHand,
    );
    if (!writeCart(window.localStorage, next, storageKey)) {
      setCartResult("error");
      return;
    }
    setCartResult(current.recovered ? "recovered" : "added");
  }

  return (
    <section aria-labelledby="purchase-options-title" className="mt-8 scroll-mt-24" id="purchase-options">
      <h2 id="purchase-options-title" className="sr-only">Pilih varian dan jumlah</h2>

      {!hasAvailableVariant ? (
        <div className="mb-6">
          {onlyVariant
            ? <StatusNotice tone="warning" title="Stok sedang habis." description="Produk ini belum bisa ditambahkan ke keranjang." />
            : <StatusNotice tone="warning" title="Semua varian sedang habis." description="Anda masih bisa melihat pilihannya, tetapi belum bisa menambahkannya ke keranjang." />}
        </div>
      ) : null}

      {onlyVariant ? null : <VariantSelector
        description="Varian yang stoknya habis tidak bisa dipilih."
        label="Varian"
        onChange={chooseVariant}
        options={product.variants.map(variant => ({
          availability: variant.stockOnHand > 0 ? "available" : "out-of-stock",
          detail: variant.stockOnHand > 0 ? `${variant.stockOnHand} tersedia${previewEnabled ? " pada data contoh" : ""}` : undefined,
          id: variant.id,
          label: variant.name,
          price: rupiah.format(BigInt(variant.priceRp)),
        }))}
        selectedId={selectedId ?? ""}
        variant="list"
      />}

      <div className="mt-6 grid gap-5 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6">
        <div>
          <p className="text-caption text-muted-foreground">Harga</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums" aria-live="polite">
            {shown ? rupiah.format(BigInt(shown.priceRp)) : "Pilih varian dulu"}
          </p>
          <p id="selection-state" className="mt-1 text-caption leading-[1.45] text-muted-foreground">
            {shown
              ? shown.stockOnHand > 0
                ? `${shownName ? `${shownName}, maksimal` : "Maksimal"} ${shown.stockOnHand}${previewEnabled ? " pada data contoh" : ""}.`
                : "Stok sedang habis."
              : "Jumlah bisa diatur setelah varian dipilih."}
          </p>
        </div>

        <div>
          <label htmlFor="product-quantity" className="mb-2 block text-ui font-medium">Jumlah</label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label="Kurangi jumlah"
              disabled={!hydrated || !selected || quantity <= 1} onClick={() => changeQuantity(quantity - 1)}>
              <Icon aria-hidden="true" name="minus" />
            </Button>
            <Input id="product-quantity" type="number" inputMode="numeric" min={1} max={selected?.stockOnHand ?? 1}
              className="h-11 w-16 text-center text-base tabular-nums" value={quantity} disabled={!hydrated || !selected}
              onChange={event => changeQuantity(Number.parseInt(event.target.value, 10) || 1)} />
            <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label="Tambah jumlah"
              disabled={!hydrated || !selected || quantity >= selected.stockOnHand} onClick={() => changeQuantity(quantity + 1)}>
              <Icon aria-hidden="true" name="plus" />
            </Button>
          </div>
        </div>
      </div>

      <Button type="button" size="lg" className="mt-5 min-h-12 w-full cursor-pointer" disabled={!canPrepare}
        aria-describedby="selection-state cart-preview-note" onClick={addSelectionToCart}>
        Tambah ke keranjang
      </Button>
      <p id="cart-preview-note" className="mt-3 text-caption leading-[1.45] text-muted-foreground">
        Harga dan stok diperiksa lagi saat checkout. Ongkir dihitung di checkout.
      </p>

      {cartResult === "added" || cartResult === "recovered" ? (
        <StatusNotice
          action={<Link className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] text-ui font-semibold text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={previewEnabled ? "/cart?preview=examples" : "/cart"}>Lihat keranjang</Link>}
          className="mt-4"
          description={`${addedName ? `${quantity} × ${addedName}` : `${quantity} barang`}. Stok belum ditahan sampai pesanan dibuat.${cartResult === "recovered" ? " Isi keranjang lama yang rusak sudah dibersihkan." : ""}`}
          enter
          size="inline"
          title="Masuk ke keranjang."
          tone="success"
        />
      ) : null}
      {cartResult === "error" ? (
        <div className="mt-5"><StatusNotice enter tone="error" title="Belum bisa disimpan ke keranjang." description="Browser ini menolak penyimpanan. Periksa pengaturan browser, lalu coba lagi." /></div>
      ) : null}
      <noscript><p className="mt-3 text-ui text-muted-foreground">Aktifkan JavaScript untuk memilih varian dan menambah produk ke keranjang.</p></noscript>
    </section>
  );
}
