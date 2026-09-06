"use client";

import { useMemo, useState } from "react";
import { ImageOff, SearchX } from "lucide-react";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import type { PublicShopProduct } from "@/features/frontend-preview/types";

const rupiah = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

function productPrice(product: PublicShopProduct) {
  if (product.variants.length === 0) return null;
  const lowest = product.variants.reduce((current, variant) => {
    const candidate = BigInt(variant.priceRp);
    return candidate < current ? candidate : current;
  }, BigInt(product.variants[0].priceRp));
  return rupiah.format(lowest);
}

function availability(product: PublicShopProduct) {
  if (product.variants.length === 0) return { label: "Belum tersedia", available: false };
  const available = product.variants.some(variant => variant.stockOnHand > 0);
  return { label: available ? "Tersedia" : "Stok habis", available };
}

export function ProductGrid({ products }: { products: readonly PublicShopProduct[] }) {
  const hydrated = useHydrated();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => [...new Map(products.flatMap(product => product.category ? [[product.category.slug, product.category.name] as const] : [])).entries()], [products]);
  const normalizedQuery = query.trim().toLocaleLowerCase("id");
  const filtered = products.filter(product => (category === "all" || product.category?.slug === category)
    && (!normalizedQuery || `${product.name} ${product.description}`.toLocaleLowerCase("id").includes(normalizedQuery)));

  function resetFilters() {
    setCategory("all");
    setQuery("");
  }

  return (
    <div>
      <fieldset disabled={!hydrated} aria-label="Filter katalog" className="border-y border-border py-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] md:items-end">
          <div>
            <p className="text-sm font-semibold">Kategori</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant={category === "all" ? "default" : "outline"} aria-pressed={category === "all"} className="min-h-11 cursor-pointer" onClick={() => setCategory("all")}>Semua</Button>
              {categories.map(([slug, name]) => <Button key={slug} type="button" variant={category === slug ? "default" : "outline"} aria-pressed={category === slug} className="min-h-11 cursor-pointer" onClick={() => setCategory(slug)}>{name}</Button>)}
            </div>
          </div>
          <div>
            <label htmlFor="shop-search" className="mb-2 block text-sm font-semibold">Cari produk</label>
            <Input id="shop-search" type="search" className="h-11 bg-background" placeholder="Cari nama atau fungsi produk" value={query} onChange={event => setQuery(event.target.value)} />
          </div>
        </div>
      </fieldset>

      <p role="status" className="py-5 text-sm text-muted-foreground">{filtered.length} produk contoh</p>
      {filtered.length === 0 ? (
        <div className="flex min-h-72 flex-col items-start justify-center border-y border-border py-10">
          <SearchX aria-hidden="true" className="size-7 text-muted-foreground" />
          <h2 className={`${type.subheading.className} mt-5`}>Tidak ada produk yang cocok.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Ubah kata pencarian atau tampilkan kembali semua kategori.</p>
          <Button type="button" variant="outline" className="mt-5 min-h-11 cursor-pointer" onClick={resetFilters}>Hapus filter</Button>
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
          {filtered.map(product => {
            const stock = availability(product);
            const price = productPrice(product);
            return (
              <article key={product.id} className="min-w-0">
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
                  <div className="text-center">
                    <ImageOff aria-hidden="true" className="mx-auto size-7" />
                    <p className="mt-3 text-sm">Foto produk contoh belum disertakan</p>
                  </div>
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-brand-700">{product.category?.name ?? "Tanpa kategori"}</p>
                    <h2 className={`${type.subheading.className} mt-2`}>{product.name}</h2>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium ${stock.available ? "border-success-border bg-success-background text-success" : "border-warning-border bg-warning-background text-warning"}`}>{stock.label}</span>
                </div>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{product.description}</p>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Mulai dari</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{price ?? "Harga belum tersedia"}</p>
                  </div>
                  <p className="max-w-48 text-right text-xs leading-5 text-muted-foreground">Pilihan varian tersedia pada halaman detail berikutnya.</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
