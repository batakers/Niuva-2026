import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";
import { getShopProductPreview } from "@/features/frontend-preview/server";
import { ProductSelection } from "./product-selection";

export const metadata: Metadata = {
  title: "Detail produk · Niuva",
  description: "Detail, varian, harga, dan ketersediaan produk ready-made Niuva.",
};

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
};

function ProductLoading() {
  return (
    <PublicShell scope="product-detail">
      <main id="main-content" className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="sr-only">Memuat detail produk</h1>
        <div role="status" aria-label="Memuat detail produk" className="grid gap-10 lg:grid-cols-12">
          <div className="aspect-[4/3] rounded-2xl bg-muted motion-safe:animate-pulse lg:col-span-7" />
          <div className="space-y-5 lg:col-span-5"><div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="h-24 rounded-lg bg-muted motion-safe:animate-pulse" /><p className="text-sm text-muted-foreground">Memuat detail produk contoh…</p></div>
        </div>
      </main>
    </PublicShell>
  );
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const { product, scenario } = await getShopProductPreview(slug, preview);

  if (scenario === "loading") return <ProductLoading />;
  if (scenario === "error") {
    return (
      <PublicShell scope="product-detail">
        <main id="main-content" className="mx-auto max-w-public px-5 py-14 sm:px-8 sm:py-20">
          <h1 className={`${type.heading.className} max-w-3xl`}>Detail produk belum dapat dimuat.</h1>
          <div className="mt-8 max-w-2xl">
            <StatusNotice tone="error" title="Terjadi gangguan pada preview." description="Tidak ada pilihan atau transaksi yang dibuat. Muat kembali data contoh untuk melanjutkan peninjauan." action={<AuLink href={`/shop/${slug}?preview=examples`} variant="outline" className="min-h-11">Coba lagi</AuLink>} />
          </div>
        </main>
      </PublicShell>
    );
  }
  if (!product) notFound();

  return (
    <PublicShell scope="product-detail">
      <main id="main-content" className="overflow-x-hidden">
        <div className="mx-auto max-w-public px-5 py-8 sm:px-8 sm:py-12">
          <AuLink href="/shop?preview=examples" variant="link" className="min-h-11 px-0">Kembali ke Shop</AuLink>

          <div className="mt-5 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <section aria-label="Gallery produk" className="min-w-0 lg:col-span-7">
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-border bg-muted px-6 text-center text-muted-foreground">
                <div>
                  <ImageOff aria-hidden="true" className="mx-auto size-8" />
                  <p className="mt-4 font-medium text-foreground">Foto produk belum disertakan</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6">Slot ini menunggu foto launch dan izin publikasi. Tidak ada gambar sintetis yang diperlakukan sebagai produk nyata.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4" aria-label="Slot gallery tambahan">
                {["Detail bentuk", "Skala penggunaan"].map(label => (
                  <div key={label} className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">{label}<br />Foto belum tersedia</div>
                ))}
              </div>
            </section>

            <article className="min-w-0 lg:col-span-5 lg:pt-2">
              <p className="text-sm font-medium text-brand-700">{product.category?.name ?? "Ready-made"}</p>
              <h1 className={`${type.heading.className} mt-3 max-w-3xl`}>{product.name}</h1>
              <p className="mt-5 text-base leading-7 text-muted-foreground">{product.description}</p>

              <ProductSelection product={product} />

              <section aria-labelledby="important-information" className="mt-9 border-t border-border pt-7">
                <h2 id="important-information" className="text-lg font-semibold">Informasi penting</h2>
                <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                  <p>Harga ditampilkan per varian. Browser tidak menentukan harga final, stok, ongkir, atau reservasi.</p>
                  <p>Ketersediaan akhir akan diperiksa kembali saat checkout. Produk contoh ini tidak dapat dibeli dan tidak mewakili inventory launch.</p>
                </div>
              </section>
            </article>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
