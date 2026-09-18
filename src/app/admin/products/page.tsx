import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, parseAdminPage, type AdminProductRow } from "@/modules/admin/operations";

export const metadata: Metadata = {
  title: "Products & Stock admin · Niuva",
  robots: { follow: false, index: false },
};

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  currency: "IDR",
  maximumFractionDigits: 0,
  style: "currency",
});

export default async function AdminProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  await connection();
  const page = parseAdminPage((await searchParams).page);
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;

  const result = await loadProducts(access, page);
  if (result === null) return <AdminDataUnavailableView role={access.profile.role} title="Products belum dapat dimuat" />;
  const published = result.items.filter((item) => item.isPublished).length;
  const variants = result.items.flatMap((item) => item.variants);
  const lowStock = variants.filter((variant) => variant.isActive && variant.stockOnHand >= 0 && variant.stockOnHand <= 3).length;

  return (
      <AdminShell active="products" role={result.role}>
        <main id="main-content" data-admin-surface="products">
          <header className="border-b border-border pb-6">
            <p className="text-sm font-medium text-brand-700">Niuva / Operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Products &amp; Stock</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Periksa produk, varian, harga tersimpan, foto, dan stok sebelum katalog dipublikasikan. Nilai di sini berasal dari database admin.
            </p>
          </header>

          <section aria-label="Ringkasan products" className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Produk" value={String(result.items.length)} />
            <SummaryCard label="Terpublikasi" value={String(published)} />
            <SummaryCard label="Stok menipis" value={String(lowStock)} />
          </section>

          <section className="mt-8" aria-labelledby="products-list-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-semibold" id="products-list-title">Katalog internal</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Perubahan harga, stok, varian, media, dan publish state harus melewati permission dan audit server.</p>
              </div>
              <p className="text-sm text-muted-foreground" role="status">{result.items.length} produk</p>
            </div>

            {result.items.length === 0 ? (
              <div className="mt-6"><StatusNotice tone="info" title="Belum ada dataset katalog." description="Tambahkan produk dan varian melalui workflow admin yang tervalidasi sebelum mengaktifkan publikasi launch." /></div>
            ) : (
              <div className="mt-6 grid gap-4">
                {result.items.map((item) => <ProductCard item={item} key={item.id} />)}
              </div>
            )}
            <AdminPagination basePath="/admin/products" hasNext={result.hasNext} page={result.page} />
          </section>
        </main>
      </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

async function loadProducts(access: AdminAccess, page: number): Promise<Awaited<ReturnType<AdminOperationsService["listProducts"]>> | null> {
  try {
    return await new AdminOperationsService({ authorize: async () => access }).listProducts({ page });
  } catch {
    return null;
  }
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function ProductCard({ item }: Readonly<{ item: AdminProductRow }>) {
  const activeVariants = item.variants.filter((variant) => variant.isActive);
  const totalStock = activeVariants.reduce((total, variant) => total + variant.stockOnHand, 0);
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">{item.category?.name ?? "Tanpa kategori"}</p>
          <h3 className="mt-2 text-lg font-semibold"><Link className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/admin/products/${item.id}`}>{item.name}</Link></h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{item.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className={item.isPublished ? "rounded-md border border-success-border bg-success-background px-2.5 py-1 text-success" : "rounded-md border border-warning-border bg-warning-background px-2.5 py-1 text-warning"}>{item.isPublished ? "Published" : "Draft"}</span>
          <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-muted-foreground">{item.mediaCount} foto</span>
        </div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{item.description}</p>
      <div className="mt-5 overflow-x-auto border-t border-border pt-4">
        {item.variants.length === 0 ? (
          <p className="text-sm text-warning">Belum ada varian aktif untuk ditawarkan.</p>
        ) : (
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Varian {item.name}</caption>
            <thead className="text-xs uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="pb-3 font-medium" scope="col">Varian</th><th className="pb-3 font-medium" scope="col">SKU</th><th className="pb-3 font-medium" scope="col">Harga</th><th className="pb-3 text-right font-medium" scope="col">Stok</th></tr></thead>
            <tbody className="divide-y divide-border">
              {item.variants.map((variant) => <tr key={variant.id}><th className="py-3 font-medium" scope="row">{variant.name}{!variant.isActive ? " (nonaktif)" : ""}</th><td className="py-3 font-mono text-xs text-muted-foreground">{variant.sku}</td><td className="py-3 tabular-nums">{currencyFormatter.format(BigInt(variant.priceRp))}</td><td className={`py-3 text-right font-semibold tabular-nums ${variant.stockOnHand === 0 ? "text-warning" : variant.stockOnHand <= 3 ? "text-warning" : "text-foreground"}`}>{variant.stockOnHand}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Total stok varian aktif: {totalStock}. <Link className="font-semibold text-brand-700 underline-offset-4 hover:underline" href={`/admin/products/${item.id}`}>Buka editor dan adjustment</Link>.</p>
    </article>
  );
}
