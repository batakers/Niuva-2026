"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPTY_CART,
  MAX_CART_QUANTITY,
  readCart,
  removeCartItem,
  type CartSnapshot,
  updateCartItem,
  writeCart,
} from "@/features/cart/cart-state";
import type { PreviewScenario, PublicShopProduct } from "@/features/frontend-preview/types";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

type LoadState = "loading" | "ready";
type PersistenceNotice = "none" | "recovered" | "unavailable";

type ResolvedCartItem = Readonly<{
  cart: CartSnapshot["items"][number];
  product: PublicShopProduct | null;
  variant: PublicShopProduct["variants"][number] | null;
}>;

function resolveCartItem(products: readonly PublicShopProduct[], cart: CartSnapshot["items"][number]): ResolvedCartItem {
  for (const product of products) {
    const variant = product.variants.find(option => option.id === cart.variantId);
    if (variant) return { cart, product, variant };
  }
  return { cart, product: null, variant: null };
}

export function CartItems({
  products,
  catalogStatus,
  previewEnabled,
}: {
  products: readonly PublicShopProduct[];
  catalogStatus: PreviewScenario | null;
  previewEnabled: boolean;
}) {
  const [snapshot, setSnapshot] = useState<CartSnapshot>(EMPTY_CART);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [persistenceNotice, setPersistenceNotice] = useState<PersistenceNotice>("none");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = readCart(window.localStorage);
      setSnapshot(result.snapshot);
      setPersistenceNotice(result.storageAvailable ? (result.recovered ? "recovered" : "none") : "unavailable");
      setLoadState("ready");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resolved = useMemo(
    () => snapshot.items.map(item => resolveCartItem(products, item)),
    [products, snapshot.items],
  );
  const knownItems = resolved.filter(item => item.product && item.variant);
  const unavailableCount = resolved.length - knownItems.length;
  const stockIssueCount = knownItems.filter(item => item.variant && item.cart.quantity > item.variant.stockOnHand).length;
  const subtotal = knownItems.reduce(
    (sum, item) => sum + BigInt(item.variant?.priceRp ?? "0") * BigInt(item.cart.quantity),
    BigInt(0),
  );

  function persist(next: CartSnapshot) {
    setSnapshot(next);
    if (writeCart(window.localStorage, next)) {
      if (persistenceNotice === "unavailable") setPersistenceNotice("none");
      return;
    }
    setPersistenceNotice("unavailable");
  }

  function updateQuantity(variantId: string, quantity: number, displayMaximum: number) {
    const safeMaximum = Math.min(Math.max(displayMaximum, 1), MAX_CART_QUANTITY);
    const safeQuantity = Math.min(Math.max(Number.isFinite(quantity) ? Math.trunc(quantity) : 1, 1), safeMaximum);
    persist(updateCartItem(snapshot, variantId, safeQuantity));
  }

  const shopHref = previewEnabled ? "/shop?preview=examples" : "/shop";

  if (loadState === "loading") {
    return (
      <section aria-label="Memuat cart" aria-busy="true" role="status" className="grid gap-8 md:grid-cols-12">
        <div className="space-y-4 md:col-span-8">
          <p className="text-sm text-muted-foreground">Memuat cart dari browser…</p>
          <div className="h-36 rounded-xl bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="h-64 rounded-xl bg-muted motion-safe:animate-pulse md:col-span-4" />
      </section>
    );
  }

  if (snapshot.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        {persistenceNotice === "recovered" ? (
          <StatusNotice tone="warning" title="Cart lokal dipulihkan." description="Data cart sebelumnya tidak valid dan telah dibersihkan. Tidak ada harga, stok, atau transaksi yang digunakan dari data tersebut." />
        ) : null}
        {persistenceNotice === "unavailable" ? (
          <StatusNotice tone="error" title="Penyimpanan browser tidak tersedia." description="Cart tidak dapat dibaca atau disimpan pada browser ini. Periksa pengaturan penyimpanan sebelum mencoba kembali." />
        ) : null}
        <StatusNotice
          tone="info"
          title="Cart Anda masih kosong."
          description="Pilih varian yang tersedia dari halaman detail produk untuk mulai menyiapkan pesanan."
          action={<AuLink href={shopHref} variant="outline" className="min-h-11">Kembali ke Shop</AuLink>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {persistenceNotice === "recovered" ? (
        <StatusNotice tone="warning" title="Sebagian data cart dipulihkan." description="Data yang tidak sesuai kontrak telah dibersihkan. Tinjau kembali pilihan sebelum melanjutkan." />
      ) : null}
      {persistenceNotice === "unavailable" ? (
        <StatusNotice tone="error" title="Perubahan belum tersimpan." description="Cart masih dapat ditinjau pada halaman ini, tetapi browser menolak penyimpanan. Muat ulang dapat menghilangkan perubahan terbaru." />
      ) : null}
      {catalogStatus === "loading" ? (
        <StatusNotice tone="info" title="Data produk masih dimuat." description="ID dan jumlah cart tetap ada, tetapi harga serta stok belum dapat ditampilkan." action={<AuLink href="/cart?preview=examples" variant="outline" className="min-h-11">Muat data contoh</AuLink>} />
      ) : null}
      {catalogStatus === "error" ? (
        <StatusNotice tone="error" title="Data produk belum dapat diperiksa." description="Cart lokal tetap utuh. Muat ulang data produk sebelum menilai harga dan stok." action={<AuLink href="/cart?preview=examples" variant="outline" className="min-h-11">Coba lagi</AuLink>} />
      ) : null}

      <div className="grid gap-10 md:grid-cols-12 md:items-start">
        <section aria-labelledby="cart-items-title" className="min-w-0 md:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 id="cart-items-title" className="text-xl font-semibold">Pilihan produk</h2>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{snapshot.items.length} jenis varian di cart</p>
            </div>
            <AuLink href={shopHref} variant="link" className="min-h-11 px-0">Tambah produk lain</AuLink>
          </div>

          <div>
            {resolved.map(({ cart, product, variant }) => {
              if (!product || !variant) {
                return (
                  <article key={cart.variantId} className="grid gap-5 border-b border-border py-6 sm:grid-cols-[7rem_minmax(0,1fr)]">
                    <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"><ImageOff aria-hidden="true" className="size-6" /></div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">Varian belum dapat dikenali</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Item tetap tersimpan sebagai ID dan jumlah, tetapi data produk tidak tersedia untuk ditampilkan atau dihitung.</p>
                      <p className="mt-2 text-xs text-muted-foreground">Jumlah tersimpan: {cart.quantity}</p>
                      <Button type="button" variant="destructive" className="mt-4 min-h-11 cursor-pointer" onClick={() => persist(removeCartItem(snapshot, cart.variantId))}>
                        <Trash2 aria-hidden="true" /> Hapus item
                      </Button>
                    </div>
                  </article>
                );
              }

              const displayMaximum = Math.max(Math.min(variant.stockOnHand, MAX_CART_QUANTITY), 1);
              const hasStockIssue = cart.quantity > variant.stockOnHand;
              return (
                <article key={cart.variantId} className="grid gap-5 border-b border-border py-6 sm:grid-cols-[7rem_minmax(0,1fr)]">
                  <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"><ImageOff aria-hidden="true" className="size-6" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-brand-700">{product.category?.name ?? "Ready-made"}</p>
                        <h3 className="mt-1 font-semibold">{product.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Varian: {variant.name}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold tabular-nums">{rupiah.format(BigInt(variant.priceRp))}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Estimasi per item</p>
                      </div>
                    </div>

                    {hasStockIssue ? (
                      <p role="alert" className="mt-4 text-sm font-medium text-warning">Jumlah melebihi stok tampilan ({variant.stockOnHand}). Kurangi jumlah atau hapus item.</p>
                    ) : (
                      <p className="mt-4 text-xs text-muted-foreground">Stok tampilan: {variant.stockOnHand}. Server akan memeriksa ulang saat checkout.</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <label htmlFor={`cart-quantity-${cart.variantId}`} className="mb-2 block text-sm font-medium">Jumlah</label>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label={`Kurangi jumlah ${product.name}, ${variant.name}`} disabled={cart.quantity <= 1} onClick={() => updateQuantity(cart.variantId, cart.quantity - 1, displayMaximum)}>
                            <Minus aria-hidden="true" />
                          </Button>
                          <Input id={`cart-quantity-${cart.variantId}`} type="number" inputMode="numeric" min={1} max={displayMaximum} aria-label={`Jumlah ${product.name}, ${variant.name}`} className="h-11 w-20 text-center text-base tabular-nums" value={cart.quantity} onChange={event => updateQuantity(cart.variantId, Number.parseInt(event.target.value, 10), displayMaximum)} />
                          <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label={`Tambah jumlah ${product.name}, ${variant.name}`} disabled={cart.quantity >= displayMaximum} onClick={() => updateQuantity(cart.variantId, cart.quantity + 1, displayMaximum)}>
                            <Plus aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      <Button type="button" variant="destructive" className="min-h-11 cursor-pointer" onClick={() => persist(removeCartItem(snapshot, cart.variantId))}>
                        <Trash2 aria-hidden="true" /> Hapus
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside aria-labelledby="cart-summary-title" className="rounded-xl border border-border bg-card p-5 shadow-card md:sticky md:top-6 md:col-span-4 sm:p-6">
          <p className="text-xs font-medium text-brand-700">Validation ledger</p>
          <h2 id="cart-summary-title" className="mt-2 text-xl font-semibold">Ringkasan estimasi</h2>
          <dl className="mt-6 space-y-4">
            <div className="flex items-start justify-between gap-4 text-sm">
              <dt className="text-muted-foreground">Item dikenali</dt>
              <dd className="font-medium tabular-nums">{knownItems.length} dari {resolved.length}</dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-border pt-4 text-sm">
              <dt className="text-muted-foreground">Subtotal produk</dt>
              <dd className="text-right font-semibold tabular-nums">{unavailableCount > 0 ? "Belum lengkap" : rupiah.format(subtotal)}</dd>
            </div>
          </dl>

          <div className="mt-6 border-l-2 border-brand-300 pl-4 text-sm leading-6 text-muted-foreground">
            <p><span className="font-medium text-foreground">Browser:</span> menyimpan ID varian dan jumlah.</p>
            <p className="mt-2"><span className="font-medium text-foreground">Checkout:</span> memuat ulang harga, stok, produk, ongkir, dan total dari server.</p>
          </div>

          {unavailableCount > 0 || stockIssueCount > 0 ? (
            <p role="status" className="mt-6 text-sm font-medium text-warning">Periksa {unavailableCount + stockIssueCount} item sebelum checkout dapat dilanjutkan.</p>
          ) : null}
          <Button type="button" size="lg" className="mt-6 min-h-11 w-full" disabled aria-describedby="checkout-availability-note">
            Lanjut ke checkout
          </Button>
          <p id="checkout-availability-note" className="mt-3 text-xs leading-5 text-muted-foreground">Checkout akan diaktifkan pada FE-11. Tombol ini belum membuat order, reservasi, atau pembayaran.</p>
        </aside>
      </div>
    </div>
  );
}
