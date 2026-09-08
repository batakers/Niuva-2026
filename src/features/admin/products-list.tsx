"use client";

import { useMemo, useState } from "react";

import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type AdminProductsScenario = "populated" | "loading" | "empty" | "error";

type PublicationFilter = "all" | "published" | "unpublished";
type StockFilter = "all" | "in-stock" | "out-of-stock";

type PreviewProductVariant = Readonly<{
  isActive: boolean;
  label: string;
  sku: string;
  stockOnHand: number;
}>;

type PreviewProduct = Readonly<{
  categoryLabel: string;
  isPublished: boolean;
  name: string;
  updatedAt: string;
  variants: readonly PreviewProductVariant[];
}>;

type AdminProductsListProps = Readonly<{
  initialScenario: AdminProductsScenario;
  initialSearch: string;
}>;

// Fictional, browser-only records used to review the admin list. They are not
// loaded by the public catalog and never represent launch inventory.
const previewProducts = [
  {
    categoryLabel: "Workspace",
    isPublished: true,
    name: "Dock modular meja",
    updatedAt: "Fixture diperbarui hari ini",
    variants: [
      { isActive: true, label: "Biru", sku: "EX-DOCK-BLUE", stockOnHand: 8 },
      { isActive: false, label: "Hitam", sku: "EX-DOCK-BLACK", stockOnHand: 0 },
    ],
  },
  {
    categoryLabel: "Display",
    isPublished: true,
    name: "Dudukan display",
    updatedAt: "Fixture diperbarui kemarin",
    variants: [
      { isActive: true, label: "Kecil", sku: "STK-EX-6024", stockOnHand: 0 },
    ],
  },
  {
    categoryLabel: "Workspace",
    isPublished: false,
    name: "Tray komponen",
    updatedAt: "Fixture diperbarui 2 hari lalu",
    variants: [
      { isActive: true, label: "Standar", sku: "EX-TRAY-STD", stockOnHand: 6 },
    ],
  },
  {
    categoryLabel: "Material",
    isPublished: true,
    name: "Material swatch",
    updatedAt: "Fixture diperbarui minggu ini",
    variants: [
      { isActive: true, label: "Standar", sku: "EX-SWATCH-STD", stockOnHand: 12 },
    ],
  },
] as const satisfies readonly PreviewProduct[];

const publicationOptions = [
  { label: "Semua publikasi", value: "all" },
  { label: "Dipublikasikan", value: "published" },
  { label: "Belum dipublikasikan", value: "unpublished" },
] as const satisfies readonly Readonly<{ label: string; value: PublicationFilter }>[];

const stockOptions = [
  { label: "Semua stok", value: "all" },
  { label: "Stok tersedia", value: "in-stock" },
  { label: "Stok habis", value: "out-of-stock" },
] as const satisfies readonly Readonly<{ label: string; value: StockFilter }>[];

function getActiveVariants(product: PreviewProduct) {
  return product.variants.filter((variant) => variant.isActive);
}

function getStockSummary(product: PreviewProduct) {
  const activeVariants = getActiveVariants(product);
  const stockOnHand = activeVariants.reduce((total, variant) => total + variant.stockOnHand, 0);
  const outOfStock = activeVariants.length === 0 || stockOnHand === 0;

  return { outOfStock, stockOnHand };
}

function PublicationBadge({ product }: Readonly<{ product: PreviewProduct }>) {
  return (
    <Badge
      className={product.isPublished ? "border-success-border bg-success-background text-success" : "border-warning-border bg-warning-background text-warning"}
      variant="outline"
    >
      {product.isPublished ? "Dipublikasikan" : "Belum dipublikasikan"}
    </Badge>
  );
}

function ActivityBadge({ product }: Readonly<{ product: PreviewProduct }>) {
  const inactiveCount = product.variants.length - getActiveVariants(product).length;

  return (
    <Badge
      className={inactiveCount === 0 ? "border-success-border bg-success-background text-success" : "border-warning-border bg-warning-background text-warning"}
      variant="outline"
    >
      {inactiveCount === 0 ? "Semua varian aktif" : `${inactiveCount} varian inactive`}
    </Badge>
  );
}

function StockBadge({ product }: Readonly<{ product: PreviewProduct }>) {
  const stock = getStockSummary(product);

  return (
    <Badge
      className={stock.outOfStock ? "border-warning-border bg-warning-background text-warning" : "border-success-border bg-success-background text-success"}
      variant="outline"
    >
      {stock.outOfStock ? "Stok habis" : `${stock.stockOnHand} unit tersedia`}
    </Badge>
  );
}

function ProductLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat daftar produk preview" className="space-y-3" data-admin-products-loading>
      <p className="text-sm font-medium text-muted-foreground">Memuat daftar produk preview.</p>
      {["first", "second", "third"].map((row) => (
        <div className="h-32 animate-pulse rounded-xl border border-border bg-muted motion-reduce:animate-none" key={row} />
      ))}
    </section>
  );
}

function ProductVariants({ product }: Readonly<{ product: PreviewProduct }>) {
  return (
    <ul className="space-y-2" aria-label={`SKU dan varian ${product.name}`}>
      {product.variants.map((variant) => (
        <li className="flex flex-wrap items-center gap-x-2 gap-y-1" key={variant.sku}>
          <span className="font-mono text-xs font-medium text-brand-700">{variant.sku}</span>
          <span className="text-xs text-muted-foreground">{variant.label}</span>
          <span className="text-xs text-muted-foreground">{variant.isActive ? "Aktif" : "Inactive"}</span>
        </li>
      ))}
    </ul>
  );
}

function ProductTable({ products }: Readonly<{ products: readonly PreviewProduct[] }>) {
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[66rem] border-separate border-spacing-0 text-left text-sm" data-admin-products-table>
        <caption className="sr-only">Daftar produk contoh untuk review katalog admin</caption>
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Produk</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">SKU dan varian</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Publikasi</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Aktivitas varian</th>
            <th className="border-y border-border px-4 py-3 font-medium" scope="col">Stok aktif</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr className="align-top" data-admin-product-row key={product.name}>
              <td className="border-b border-border px-4 py-4">
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{product.categoryLabel}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{product.updatedAt}</p>
              </td>
              <td className="border-b border-border px-4 py-4"><ProductVariants product={product} /></td>
              <td className="border-b border-border px-4 py-4"><PublicationBadge product={product} /></td>
              <td className="border-b border-border px-4 py-4"><ActivityBadge product={product} /></td>
              <td className="border-b border-border px-4 py-4"><StockBadge product={product} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductCards({ products }: Readonly<{ products: readonly PreviewProduct[] }>) {
  return (
    <ol aria-label="Daftar produk contoh" className="grid gap-3 lg:hidden" data-admin-products-cards>
      {products.map((product) => (
        <li className="border border-border bg-card p-4 shadow-card" data-admin-product-row key={product.name}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{product.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{product.categoryLabel}</p>
            </div>
            <PublicationBadge product={product} />
          </div>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">SKU dan varian</dt>
              <dd className="mt-2"><ProductVariants product={product} /></dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Aktivitas varian</dt>
              <dd className="mt-2"><ActivityBadge product={product} /></dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Stok aktif</dt>
              <dd className="mt-2"><StockBadge product={product} /></dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">{product.updatedAt}</p>
        </li>
      ))}
    </ol>
  );
}

export function AdminProductsList({ initialScenario, initialSearch }: AdminProductsListProps) {
  const hydrated = useHydrated();
  const [publicationFilter, setPublicationFilter] = useState<PublicationFilter>("all");
  const [scenario, setScenario] = useState<AdminProductsScenario>(initialScenario);
  const [search, setSearch] = useState(initialSearch);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const visibleProducts = useMemo(() => {
    if (scenario === "empty") return [];

    const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");

    return previewProducts.filter((product) => {
      const publicationMatches = publicationFilter === "all"
        || (publicationFilter === "published" && product.isPublished)
        || (publicationFilter === "unpublished" && !product.isPublished);
      const stock = getStockSummary(product);
      const stockMatches = stockFilter === "all"
        || (stockFilter === "in-stock" && !stock.outOfStock)
        || (stockFilter === "out-of-stock" && stock.outOfStock);
      const searchMatches = normalizedSearch.length === 0
        || product.name.toLocaleLowerCase("id-ID").includes(normalizedSearch)
        || product.variants.some((variant) => variant.sku.toLocaleLowerCase("id-ID").includes(normalizedSearch));

      return publicationMatches && stockMatches && searchMatches;
    });
  }, [publicationFilter, scenario, search, stockFilter]);

  const hasAppliedFilters = publicationFilter !== "all" || search.trim().length > 0 || stockFilter !== "all";
  const unpublishedCount = previewProducts.filter((product) => !product.isPublished).length;
  const outOfStockCount = previewProducts.filter((product) => getStockSummary(product).outOfStock).length;
  const controlsDisabled = !hydrated || scenario === "loading" || scenario === "error";

  function resetFilters() {
    setPublicationFilter("all");
    setSearch("");
    setStockFilter("all");
  }

  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      data-admin-products="preview"
      data-products-scenario={scenario}
      id="main-content"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin/products</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">Development-only preview</Badge>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Katalog yang perlu dijaga.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Pisahkan keputusan publikasi, aktivitas varian, dan ketersediaan stok sebelum mengubah katalog.
            </p>
            <p className="mt-5 text-sm font-medium text-foreground" role="status">
              {previewProducts.length} produk contoh; {unpublishedCount} belum dipublikasikan; {outOfStockCount} stok habis
            </p>
          </header>

          <section aria-labelledby="products-filter-heading" className="border-b border-border py-6">
            <h2 className="text-lg font-semibold" id="products-filter-heading">Cari dan saring</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pencarian dan filter hanya mengubah fixture lokal. SKU dan jumlah stok nyata tetap dibaca kembali oleh server pada integrasi berikutnya.
            </p>
            <div className="mt-5 grid gap-5" data-component="admin-product-filters">
              <div className="max-w-xl">
                <label className="text-sm font-medium" htmlFor="admin-product-search">Cari SKU atau nama produk</label>
                <Input
                  className="mt-2 min-h-11"
                  disabled={controlsDisabled}
                  id="admin-product-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Contoh: STK-EX-6024"
                  type="search"
                  value={search}
                />
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <fieldset disabled={controlsDisabled}>
                  <legend className="text-sm font-medium">Publikasi produk</legend>
                  <div className="mt-2 flex flex-wrap gap-2" role="group">
                    {publicationOptions.map((option) => (
                      <Button
                        aria-pressed={publicationFilter === option.value}
                        className="min-h-11 cursor-pointer"
                        key={option.value}
                        onClick={() => setPublicationFilter(option.value)}
                        type="button"
                        variant={publicationFilter === option.value ? "default" : "outline"}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <fieldset disabled={controlsDisabled}>
                  <legend className="text-sm font-medium">Ketersediaan stok aktif</legend>
                  <div className="mt-2 flex flex-wrap gap-2" role="group">
                    {stockOptions.map((option) => (
                      <Button
                        aria-pressed={stockFilter === option.value}
                        className="min-h-11 cursor-pointer"
                        key={option.value}
                        onClick={() => setStockFilter(option.value)}
                        type="button"
                        variant={stockFilter === option.value ? "default" : "outline"}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              </div>
              {hasAppliedFilters && (scenario !== "populated" || visibleProducts.length > 0) ? (
                <div>
                  <Button className="min-h-11 cursor-pointer" disabled={controlsDisabled} onClick={resetFilters} type="button" variant="outline">
                    Reset filter
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="products-list-heading" className="pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold" id="products-list-heading">Daftar katalog</h2>
              {scenario !== "loading" && scenario !== "error" ? <p className="text-sm text-muted-foreground" role="status">{visibleProducts.length} hasil ditampilkan</p> : null}
            </div>
            <div className="mt-4">
              {scenario === "loading" ? <ProductLoadingState /> : null}
              {scenario === "empty" ? (
                <StatusNotice
                  description="Keadaan ini hanya skenario preview. Jangan menyimpulkan katalog produksi benar-benar kosong."
                  title="Tidak ada produk contoh"
                  tone="info"
                />
              ) : null}
              {scenario === "error" ? (
                <StatusNotice
                  action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("populated")} type="button" variant="outline">Coba lagi</Button>}
                  description="Tidak ada katalog atau stok server yang dibaca pada skenario ini. Tombol hanya memulihkan fixture lokal."
                  title="Daftar produk preview belum dapat dimuat"
                  tone="error"
                />
              ) : null}
              {scenario === "populated" && visibleProducts.length === 0 ? (
                <StatusNotice
                  action={<Button className="min-h-11 cursor-pointer" onClick={resetFilters} type="button" variant="outline">Reset filter</Button>}
                  description="Ubah atau reset filter untuk meninjau fixture katalog lain. Tidak ada query katalog nyata yang dilakukan."
                  title="Filter tidak menemukan produk contoh"
                  tone="info"
                />
              ) : null}
              {scenario === "populated" && visibleProducts.length > 0 ? <><ProductTable products={visibleProducts} /><ProductCards products={visibleProducts} /></> : null}
            </div>
          </section>
        </div>

        <aside aria-label="Batas preview katalog" className="space-y-4 xl:sticky xl:top-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Yang perlu dibedakan</CardTitle>
              <CardDescription>Ketiga kondisi ini tidak dapat menggantikan satu sama lain.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p><span className="font-medium text-foreground">Belum dipublikasikan</span> berarti produk tidak boleh muncul pada katalog publik.</p>
              <p><span className="font-medium text-foreground">Varian inactive</span> berarti varian tidak dapat dibeli walaupun produk masih dipublikasikan.</p>
              <p><span className="font-medium text-foreground">Stok habis</span> berarti tidak ada stok pada varian aktif untuk checkout.</p>
            </CardContent>
          </Card>
          <StatusNotice
            description="FE-24 akan menambahkan editor produk, varian, dan alasan penyesuaian stok. Halaman ini tidak menyimpan perubahan."
            title="Edit katalog belum tersedia"
            tone="info"
          />
        </aside>
      </div>
    </main>
  );
}
