"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { typographySystemTokens as type } from "@/design/typography";
import { getShopDisplayCopy } from "@/features/public/shop-display-copy";
import type { PublicShopProduct } from "@/features/frontend-preview/types";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

// "Mulai" only when variants really differ in price; one price is shown as it is.
function productPrice(product: PublicShopProduct) {
  if (product.variants.length === 0) return null;
  const prices = product.variants.map(variant => BigInt(variant.priceRp));
  const lowest = prices.reduce((current, price) => (price < current ? price : current));
  const varies = prices.some(price => price !== lowest);
  return `${varies ? "Mulai " : ""}${rupiah.format(lowest)}`;
}

function availability(product: PublicShopProduct) {
  if (product.variants.length === 0) return { label: "Belum tersedia", available: false };
  const available = product.variants.some(variant => variant.stockOnHand > 0);
  return { label: available ? "Tersedia" : "Stok habis", available };
}

const chipClassName = "min-h-11 cursor-pointer hover:bg-brand-50 hover:text-foreground aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground aria-pressed:hover:text-background";

export function ProductGrid({ products, previewEnabled = false }: { products: readonly PublicShopProduct[]; previewEnabled?: boolean }) {
  const hydrated = useHydrated();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => [...new Map(products.flatMap(product => product.category ? [[product.category.slug, product.category.name] as const] : [])).entries()], [products]);
  const normalizedQuery = query.trim().toLocaleLowerCase("id");
  const filtered = products.filter(product => {
    const display = getShopDisplayCopy(product);
    return (category === "all" || product.category?.slug === category)
      && (!normalizedQuery || `${display.name} ${display.summary} ${product.name} ${product.description}`.toLocaleLowerCase("id").includes(normalizedQuery));
  });

  function resetFilters() {
    setCategory("all");
    setQuery("");
  }

  return (
    <div>
      <fieldset disabled={!hydrated} aria-label="Filter katalog" className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Kategori">
          <Button type="button" variant="outline" aria-pressed={category === "all"} className={chipClassName} onClick={() => setCategory("all")}>Semua</Button>
          {categories.map(([slug, name]) => <Button key={slug} type="button" variant="outline" aria-pressed={category === slug} className={chipClassName} onClick={() => setCategory(slug)}>{name}</Button>)}
        </div>
        <div className="md:w-80">
          <label htmlFor="shop-search" className="mb-2 block text-ui font-medium">Cari produk</label>
          <div className="relative">
            <Icon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" name="search" />
            <Input id="shop-search" type="search" className="h-11 rounded-full bg-card pl-11" placeholder="Nama produk atau varian" value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </div>
      </fieldset>

      <p role="status" className="mt-8 text-ui text-muted-foreground">{filtered.length} {previewEnabled ? "produk contoh" : "produk"}</p>
      {filtered.length === 0 ? (
        <div className="mt-6 flex min-h-72 flex-col items-start justify-center rounded-[var(--radius-card)] border border-border bg-card px-6 py-10 sm:px-10">
          <Icon aria-hidden="true" className="size-7 text-muted-foreground" name="search-x" />
          <h2 className={`${type.subheading.className} mt-5`}>Tidak ada produk yang cocok.</h2>
          <p className="mt-2 max-w-lg text-base leading-[1.6] text-muted-foreground">Ubah kata pencarian atau tampilkan kembali semua kategori.</p>
          <Button type="button" variant="outline" className="mt-6 min-h-11 cursor-pointer" onClick={resetFilters}>Hapus filter</Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(product => {
            const stock = availability(product);
            const price = productPrice(product);
            const cover = product.media.find(media => media.url !== undefined);
            const display = getShopDisplayCopy(product);
            const href = `/shop/${product.slug}${previewEnabled ? "?preview=examples" : ""}`;
            return (
              <article key={product.id} className="min-w-0">
                <Link href={href} className="group flex h-full flex-col rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  {/* Products stay whole (contain) on a white field so their shapes can be compared. */}
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-border bg-card text-muted-foreground transition-colors duration-[var(--duration-normal-token)] group-hover:border-brand-500">
                    {cover?.url ? (
                      <Image
                        alt={cover.altText || product.name}
                        className="object-contain transition-transform duration-[var(--duration-normal-token)] ease-[var(--ease-standard-token)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        fill
                        sizes="(min-width: 1024px) 26rem, (min-width: 640px) 50vw, 100vw"
                        src={cover.url}
                      />
                    ) : (
                      <div className="text-center">
                        <Icon aria-hidden="true" className="mx-auto size-7" name="image-off" />
                        <p className="mt-3 text-ui">Foto produk belum tersedia</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col pt-4">
                    <p className="text-caption text-muted-foreground">{product.category?.name ?? "Tanpa kategori"}</p>
                    <h2 className="mt-1 text-lead font-medium leading-[1.35] underline-offset-4 group-hover:underline">{display.name}</h2>
                    <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
                      <p className="text-lead font-semibold tabular-nums">{price ?? "Harga belum tersedia"}</p>
                      <p className={`text-ui font-medium ${stock.available ? "text-success" : "text-warning"}`}>{stock.label}</p>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
