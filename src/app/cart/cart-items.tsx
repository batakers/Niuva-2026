"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import {
  cartStorageKey,
  EMPTY_CART,
  MAX_CART_QUANTITY,
  readCart,
  removeCartItem,
  type CartSnapshot,
  updateCartItem,
  writeCart,
} from "@/features/cart/cart-state";
import type { PreviewScenario, PublicShopProduct } from "@/features/frontend-preview/types";
import { mascotRenders } from "@/features/public/mascot";
import { customerVariantName, getShopDisplayCopy } from "@/features/public/shop-display-copy";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

type LoadState = "loading" | "ready";
type PersistenceNotice = "none" | "recovered" | "unavailable";
type CatalogStatus = PreviewScenario | "live-empty" | "live-error" | "live-unavailable" | null;

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

/** The variant's own photo first, then the product cover; the name next to it carries the meaning. */
function ItemPhoto({ url }: { url: string | undefined }) {
  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-border bg-card text-muted-foreground">
      {url ? <Image alt="" className="object-contain" fill sizes="7rem" src={url} /> : <Icon aria-hidden="true" className="size-6" name="image-off" />}
    </div>
  );
}

export function CartItems({
  demoMode = false,
  liveEnabled,
  products,
  catalogStatus,
  previewEnabled,
}: {
  demoMode?: boolean;
  liveEnabled?: boolean;
  products: readonly PublicShopProduct[];
  catalogStatus: CatalogStatus;
  previewEnabled: boolean;
}) {
  const [snapshot, setSnapshot] = useState<CartSnapshot>(EMPTY_CART);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [persistenceNotice, setPersistenceNotice] = useState<PersistenceNotice>("none");
  // Every `?preview=` scenario uses the example cart; live statuses and null use the real cart.
  const storageKey = cartStorageKey(catalogStatus !== null && !catalogStatus.startsWith("live-"));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = readCart(window.localStorage, storageKey);
      setSnapshot(result.snapshot);
      setPersistenceNotice(result.storageAvailable ? (result.recovered ? "recovered" : "none") : "unavailable");
      setLoadState("ready");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const resolved = useMemo(
    () => snapshot.items.map(item => resolveCartItem(products, item)),
    [products, snapshot.items],
  );
  const knownItems = resolved.filter(item => item.product && item.variant);
  const unavailableCount = resolved.length - knownItems.length;
  const stockIssueCount = knownItems.filter(item => item.variant && item.cart.quantity > item.variant.stockOnHand).length;
  const totalQuantity = snapshot.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = knownItems.reduce(
    (sum, item) => sum + BigInt(item.variant?.priceRp ?? "0") * BigInt(item.cart.quantity),
    BigInt(0),
  );

  function persist(next: CartSnapshot) {
    setSnapshot(next);
    if (writeCart(window.localStorage, next, storageKey)) {
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

  const previewQuery = previewEnabled ? "?preview=examples" : "";
  const shopHref = `/shop${previewQuery}`;
  const checkoutEnabled = previewEnabled || liveEnabled === true;
  const canCheckout = checkoutEnabled && persistenceNotice !== "unavailable" && unavailableCount === 0 && stockIssueCount === 0;

  if (loadState === "loading") {
    return (
      <section aria-label="Memuat keranjang" aria-busy="true" role="status" className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-4">
          <p className="text-ui text-muted-foreground">Memuat isi keranjang…</p>
          <div className="h-40 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="h-64 rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" />
      </section>
    );
  }

  if (snapshot.items.length === 0) {
    return (
      <div className="space-y-5">
        {catalogStatus === "live-error" ? <StatusNotice tone="error" title="Katalog belum dapat dimuat." description="Isi keranjang tetap tersimpan. Muat ulang halaman ini sebentar lagi." action={<NiuvaLink href="/cart" variant="outline" className="min-h-11">Muat ulang</NiuvaLink>} /> : null}
        {catalogStatus === "live-unavailable" ? <StatusNotice tone="warning" title="Katalog belum terhubung." description="Isi keranjang tetap tersimpan, tetapi harga dan stok belum bisa ditampilkan." action={<NiuvaLink href="/cart?preview=examples" variant="outline" className="min-h-11">Buka preview contoh</NiuvaLink>} /> : null}
        {persistenceNotice === "recovered" ? (
          <StatusNotice tone="warning" title="Keranjang dipulihkan." description="Isi keranjang sebelumnya tidak terbaca, jadi sudah dikosongkan. Tidak ada pesanan atau pembayaran yang terpengaruh." />
        ) : null}
        {persistenceNotice === "unavailable" ? (
          <StatusNotice tone="error" title="Keranjang tidak bisa dibuka di browser ini." description="Browser ini menolak penyimpanan. Izinkan penyimpanan situs di pengaturan browser, lalu coba lagi." />
        ) : null}
        {/* Mascot panel, not a second blue field: the empty cart is a pause, not a destination. */}
        <section aria-labelledby="cart-empty-title" className="grid overflow-hidden rounded-[var(--radius-media)] bg-brand-100 sm:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="px-6 py-10 sm:py-14 sm:pl-10 sm:pr-0 lg:pl-14">
            <h2 id="cart-empty-title" className="max-w-[18em] text-3xl font-medium tracking-[-0.015em] text-balance">Keranjang Anda masih kosong.</h2>
            <p className="mt-4 max-w-[44ch] text-lead leading-[1.6]">Pilih produk di Toko, tentukan variannya, lalu tambahkan ke keranjang.</p>
            <NiuvaLink href={shopHref} className="mt-7 min-h-11">Lihat Toko</NiuvaLink>
          </div>
          <div className="relative h-56 sm:h-auto">
            <Image alt="" className="absolute -bottom-4 left-1/2 h-[108%] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-lg sm:-bottom-6" height={1400} sizes="(min-width: 1024px) 22rem, (min-width: 640px) 16rem, 70vw" src={mascotRenders.present} width={1400} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {persistenceNotice === "recovered" ? (
        <StatusNotice tone="warning" title="Sebagian isi keranjang dipulihkan." description="Item yang tidak terbaca sudah dihapus. Periksa lagi isi keranjang sebelum checkout." />
      ) : null}
      {persistenceNotice === "unavailable" ? (
        <StatusNotice tone="error" title="Perubahan belum tersimpan." description="Browser ini menolak penyimpanan, jadi perubahan terbaru bisa hilang saat halaman dimuat ulang." />
      ) : null}
      {catalogStatus === "loading" ? (
        <StatusNotice tone="info" title="Data produk masih dimuat." description="Isi keranjang tetap ada. Harga dan stok tampil setelah data produk siap." action={<NiuvaLink href="/cart?preview=examples" variant="outline" className="min-h-11">Muat data contoh</NiuvaLink>} />
      ) : null}
      {catalogStatus === "error" ? (
        <StatusNotice tone="error" title="Data produk belum dapat diperiksa." description="Isi keranjang tetap tersimpan. Muat ulang sebelum memeriksa harga dan stok." action={<NiuvaLink href="/cart?preview=examples" variant="outline" className="min-h-11">Coba lagi</NiuvaLink>} />
      ) : null}
      {catalogStatus === "live-error" ? (
        <StatusNotice tone="error" title="Katalog belum dapat dimuat." description="Isi keranjang tetap tersimpan. Muat ulang halaman ini sebelum melanjutkan." action={<NiuvaLink href="/cart" variant="outline" className="min-h-11">Muat ulang</NiuvaLink>} />
      ) : null}
      {catalogStatus === "live-unavailable" ? (
        <StatusNotice tone="warning" title="Katalog belum terhubung." description="Isi keranjang tetap tersimpan, tetapi harga dan stok belum bisa ditampilkan." action={<NiuvaLink href="/cart?preview=examples" variant="outline" className="min-h-11">Buka preview contoh</NiuvaLink>} />
      ) : null}
      {catalogStatus === "live-empty" ? (
        <StatusNotice tone="info" title="Toko belum punya produk untuk dijual." description="Item di keranjang belum bisa diperiksa sampai produk tersedia lagi." action={<NiuvaLink href="/services" variant="outline" className="min-h-11">Lihat layanan</NiuvaLink>} />
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <section aria-labelledby="cart-items-title" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="cart-items-title" className="text-xl font-medium tracking-[-0.015em]">Isi keranjang</h2>
            <p className="text-ui text-muted-foreground" aria-live="polite">{snapshot.items.length} varian · {totalQuantity} barang</p>
          </div>

          {/* One white surface with hairline rows; each row shows how it adds to the subtotal. */}
          <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-card">
            {resolved.map(({ cart, product, variant }) => {
              if (!product || !variant) {
                return (
                  <li key={cart.variantId} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6 sm:p-6">
                    <ItemPhoto url={undefined} />
                    <div className="min-w-0">
                      <h3 className="text-lead font-medium leading-[1.35]">Varian belum dapat dikenali</h3>
                      <p className="mt-2 max-w-[56ch] text-ui font-normal leading-[1.55] text-muted-foreground">Data produk ini tidak tersedia, jadi harganya belum bisa dihitung. Hapus item ini untuk melanjutkan checkout.</p>
                      <p className="mt-2 text-caption text-muted-foreground">Jumlah tersimpan: {cart.quantity}</p>
                      <Button type="button" variant="ghost" className="mt-3 -ml-3 min-h-11 cursor-pointer text-destructive hover:bg-destructive-background hover:text-destructive" onClick={() => persist(removeCartItem(snapshot, cart.variantId))}>
                        <Icon aria-hidden="true" name="trash-2" /> Hapus item
                      </Button>
                    </div>
                  </li>
                );
              }

              const displayMaximum = Math.max(Math.min(variant.stockOnHand, MAX_CART_QUANTITY), 1);
              const hasStockIssue = cart.quantity > variant.stockOnHand;
              const display = getShopDisplayCopy(product);
              const photoUrl = variant.photoUrl ?? product.media.find(media => media.url !== undefined)?.url;
              return (
                <li key={cart.variantId} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6 sm:p-6">
                  <ItemPhoto url={photoUrl} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-caption text-muted-foreground">{product.category?.name ?? "Tanpa kategori"}</p>
                        <h3 className="mt-0.5 text-lead font-medium leading-[1.35]">
                          <Link href={`/shop/${product.slug}${previewQuery}`} className="rounded-[var(--radius-control)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{display.name}</Link>
                        </h3>
                        {customerVariantName(variant.name) ? <p className="mt-1 text-ui font-normal text-muted-foreground">Varian: {variant.name}</p> : null}
                      </div>
                      <div className="sm:text-right">
                        <p className="text-lead font-semibold tabular-nums">{rupiah.format(BigInt(variant.priceRp) * BigInt(cart.quantity))}</p>
                        <p className="mt-0.5 text-caption tabular-nums text-muted-foreground">{rupiah.format(BigInt(variant.priceRp))} per barang</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <label htmlFor={`cart-quantity-${cart.variantId}`} className="mb-2 block text-ui font-medium">Jumlah</label>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label={`Kurangi jumlah ${product.name}, ${variant.name}`} disabled={cart.quantity <= 1} onClick={() => updateQuantity(cart.variantId, cart.quantity - 1, displayMaximum)}>
                            <Icon aria-hidden="true" name="minus" />
                          </Button>
                          <Input id={`cart-quantity-${cart.variantId}`} type="number" inputMode="numeric" min={1} max={displayMaximum} aria-label={`Jumlah ${product.name}, ${variant.name}`} className="h-11 w-16 text-center text-base tabular-nums" value={cart.quantity} onChange={event => updateQuantity(cart.variantId, Number.parseInt(event.target.value, 10), displayMaximum)} />
                          <Button type="button" variant="outline" size="icon" className="size-11 cursor-pointer" aria-label={`Tambah jumlah ${product.name}, ${variant.name}`} disabled={cart.quantity >= displayMaximum} onClick={() => updateQuantity(cart.variantId, cart.quantity + 1, displayMaximum)}>
                            <Icon aria-hidden="true" name="plus" />
                          </Button>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" className="min-h-11 cursor-pointer text-destructive hover:bg-destructive-background hover:text-destructive" onClick={() => persist(removeCartItem(snapshot, cart.variantId))}>
                        <Icon aria-hidden="true" name="trash-2" /> Hapus
                      </Button>
                    </div>

                    {hasStockIssue ? (
                      <p role="alert" className="mt-3 text-ui font-medium text-warning">
                        {variant.stockOnHand === 0 ? "Stok habis. Hapus item ini untuk melanjutkan." : `Stok tersisa ${variant.stockOnHand}. Kurangi jumlahnya atau hapus item ini.`}
                      </p>
                    ) : (
                      <p className="mt-3 text-caption text-muted-foreground">Stok tersedia: {variant.stockOnHand}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <NiuvaLink href={shopHref} variant="link" className="mt-3 min-h-11 px-0">Tambah produk lain</NiuvaLink>
        </section>

        <aside aria-labelledby="cart-summary-title" className="rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 id="cart-summary-title" className="text-xl font-medium tracking-[-0.015em]">Ringkasan</h2>
          <dl className="mt-5 space-y-3 text-ui">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-normal text-muted-foreground">Subtotal ({totalQuantity} barang)</dt>
              <dd className="text-right text-lead font-semibold tabular-nums">{unavailableCount > 0 ? "Belum lengkap" : rupiah.format(subtotal)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-normal text-muted-foreground">Ongkir</dt>
              <dd className="text-right font-normal">Dihitung di checkout</dd>
            </div>
          </dl>

          {unavailableCount > 0 || stockIssueCount > 0 ? (
            <p role="status" className="mt-5 text-ui font-medium text-warning">Periksa {unavailableCount + stockIssueCount} item sebelum checkout.</p>
          ) : null}
          {canCheckout ? (
            <NiuvaLink href={previewEnabled ? "/checkout?preview=examples&state=ready" : "/checkout"} size="lg" className="mt-6 min-h-12 w-full" aria-describedby="checkout-availability-note">
              Lanjut ke checkout
            </NiuvaLink>
          ) : (
            <Button type="button" size="lg" className="mt-6 min-h-12 w-full" disabled aria-describedby="checkout-availability-note">
              Lanjut ke checkout
            </Button>
          )}
          <p id="checkout-availability-note" className="mt-3 text-caption leading-[1.45] text-muted-foreground">
            {previewEnabled
              ? "Preview lokal: belum ada pesanan atau pembayaran yang dibuat."
              : demoMode
                ? "Mode demo lokal: pesanan disimpan di database lokal tanpa layanan pembayaran atau kurir sungguhan."
                : liveEnabled
                  ? "Checkout meminta Anda masuk ke akun. Harga, stok, dan ongkir diperiksa lagi sebelum pesanan dibuat."
                  : "Checkout belum dibuka. Isi keranjang tetap tersimpan."}
          </p>
        </aside>
      </div>
    </div>
  );
}
