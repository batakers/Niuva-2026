import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { getShopPreview } from "@/features/frontend-preview/server";
import { ProductGrid } from "./product-grid";

export const metadata: Metadata = {
  title: "Shop · Niuva",
  description: "Katalog produk ready-made Niuva dengan pilihan kategori dan status ketersediaan.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const { scenario, products } = await getShopPreview((await searchParams).preview);
  return (
    <PublicShell scope="shop">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-public px-5 py-14 sm:px-8 sm:py-20">
            <p className="text-sm font-medium text-brand-700">Ready-made</p>
            <h1 className={`${type.heading.className} mt-4 max-w-3xl`}>Produk ready-made, dengan status yang jelas.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Telusuri produk, harga awal, dan ketersediaan sebelum memilih varian pada halaman detail.</p>
          </div>
        </section>

        <div className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
          {process.env.NODE_ENV === "development" && (
            <aside aria-label="Preview katalog" className="mb-8 rounded-lg border border-info-border bg-info-background p-4 text-info">
              <p className="text-sm font-semibold">Preview lokal, data sintetis dan bukan inventory Niuva</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[["examples", "Contoh"], ["empty", "Kosong"], ["loading", "Memuat"], ["error", "Gagal"]].map(([value, label]) => (
                  <AuLink key={value} href={`/shop?preview=${value}`} variant="outline" size="sm" className="min-h-11" aria-current={scenario === value ? "page" : undefined}>{label}</AuLink>
                ))}
              </div>
            </aside>
          )}

          {scenario === "loading" ? (
            <div role="status" aria-label="Memuat katalog" className="space-y-5 py-8">
              <p className="text-sm text-muted-foreground">Memuat katalog contoh…</p>
              <div className="grid gap-8 md:grid-cols-2">
                {[0, 1].map(item => <div key={item} className="space-y-4"><div className="aspect-[4/3] rounded-xl bg-muted motion-safe:animate-pulse" /><div className="h-7 w-2/3 rounded-md bg-muted motion-safe:animate-pulse" /></div>)}
              </div>
            </div>
          ) : scenario === "error" ? (
            <StatusNotice tone="error" title="Katalog belum dapat dimuat." description="Muat kembali untuk meninjau alur pemulihan. Tidak ada transaksi yang dibuat." action={<AuLink href="/shop?preview=examples" variant="outline" className="min-h-11">Coba lagi</AuLink>} />
          ) : products.length === 0 ? (
            <StatusNotice tone="info" title="Katalog ready-made belum dipublikasikan." description="Produk, foto, varian, dan stok akan muncul setelah dataset launch mendapat persetujuan publikasi." action={<AuLink href="/services" variant="outline" className="min-h-11">Lihat layanan</AuLink>} />
          ) : (
            <ProductGrid products={products} previewEnabled={scenario === "examples"} />
          )}
        </div>
      </main>
    </PublicShell>
  );
}
