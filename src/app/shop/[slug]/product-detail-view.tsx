import { notFound } from "next/navigation";
import Image from "next/image";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { getLiveShopProduct, getShopProductPreview } from "@/features/frontend-preview/server";
import { getShopDisplayCopy } from "@/features/public/shop-display-copy";
import { ProductSelection } from "./product-selection";

function ProductLoading() {
  return (
    <PublicShell functionalStatus="frontend-preview" scope="product-detail">
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

// Shared by the cacheable public route (preview is always undefined) and the
// dynamic, noindex preview route. It never reads request-time APIs itself.
export async function ProductDetailView({ preview, slug }: { preview: string | string[] | undefined; slug: string }) {
  const { product: previewProduct, scenario } = await getShopProductPreview(slug, preview);
  let product = previewProduct;
  let liveCatalogError = false;
  if (scenario === null && product === null && process.env.DATABASE_URL !== undefined) {
    try {
      product = await getLiveShopProduct(slug);
    } catch {
      liveCatalogError = true;
      product = null;
    }
  }

  if (scenario === "loading") return <ProductLoading />;
  if (scenario === "error") {
    return (
      <PublicShell functionalStatus="frontend-preview" scope="product-detail">
        <main id="main-content" className="mx-auto max-w-public px-5 py-14 sm:px-8 sm:py-20">
          <h1 className={`${type.heading.className} max-w-3xl`}>Detail produk belum dapat dimuat.</h1>
          <div className="mt-8 max-w-2xl">
            <StatusNotice tone="error" title="Terjadi gangguan pada preview." description="Tidak ada pilihan atau transaksi yang dibuat. Muat kembali data contoh untuk melanjutkan peninjauan." action={<NiuvaLink href={`/shop/${slug}?preview=examples`} variant="outline" className="min-h-11">Coba lagi</NiuvaLink>} />
          </div>
        </main>
      </PublicShell>
    );
  }
  if (liveCatalogError || (scenario === null && process.env.DATABASE_URL === undefined)) {
    return (
      <PublicShell functionalStatus="capability-gated" scope="product-detail">
        <main id="main-content" className="mx-auto max-w-public px-5 py-14 sm:px-8 sm:py-20">
          <h1 className={`${type.heading.className} max-w-3xl`}>Detail produk belum dapat dimuat.</h1>
          <div className="mt-8 max-w-2xl">
            <StatusNotice
              tone={liveCatalogError ? "error" : "warning"}
              title={liveCatalogError ? "Sumber katalog sedang tidak tersedia." : "Katalog live belum terhubung."}
              description={liveCatalogError ? "Data produk tidak dapat diperiksa saat ini. Tidak ada pilihan atau transaksi yang dibuat." : "Gunakan preview contoh untuk meninjau alur tampilan. Preview tidak mewakili inventory nyata."}
              action={<NiuvaLink href={liveCatalogError ? `/shop/${slug}` : "/shop?preview=examples"} variant="outline" className="min-h-11">{liveCatalogError ? "Muat ulang" : "Buka preview contoh"}</NiuvaLink>}
            />
          </div>
        </main>
      </PublicShell>
    );
  }
  if (!product) notFound();

  const cover = product.media.find((media) => media.url !== undefined);
  const supportingMedia = product.media.filter((media) => media !== cover && media.url !== undefined);
  const display = getShopDisplayCopy(product);
  const startingPrice = product.variants.length > 0
    ? product.variants.reduce((current, variant) => {
      const price = BigInt(variant.priceRp);
      return price < current ? price : current;
    }, BigInt(product.variants[0].priceRp))
    : null;
  const hasStock = product.variants.some((variant) => variant.stockOnHand > 0);
  const rupiah = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });

  return (
    <PublicShell functionalStatus={scenario === "examples" ? "frontend-preview" : "server-backed"} scope="product-detail" headerAction={{ href: "#purchase-options", label: "Pilih Varian" }}>
      <main id="main-content" className="overflow-x-hidden">
        <div className="mx-auto max-w-public px-5 py-8 sm:px-8 sm:py-12">
          <NiuvaLink href={scenario === "examples" ? "/shop?preview=examples" : "/shop"} variant="link" className="min-h-11 px-0">Kembali ke Shop</NiuvaLink>

          <div className="mt-5 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <section aria-label="Gallery produk" className="min-w-0 lg:col-span-7">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted px-6 text-center text-muted-foreground">
                {cover?.url ? (
                  <Image
                    alt={cover.altText || product.name}
                    className="object-contain"
                    fill
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    src={cover.url}
                  />
                ) : (
                  <div>
                    <Icon aria-hidden="true" className="mx-auto size-8" name="image-off" />
                    <p className="mt-4 font-medium text-foreground">Foto produk belum disertakan</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6">Slot ini menunggu foto launch dan izin publikasi. Tidak ada gambar sintetis yang diperlakukan sebagai produk nyata.</p>
                  </div>
                )}
              </div>
            </section>

            <article className="min-w-0 lg:col-span-5 lg:pt-2">
              <p className="text-sm font-medium text-brand-700">{product.category?.name ?? "Ready-made"}</p>
              <h1 className={`${type.heading.className} mt-3 max-w-3xl`}>{display.name}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{display.summary}</p>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-border py-4">
                <div><p className="text-xs text-muted-foreground">{product.variants.length > 1 ? "Mulai dari" : "Harga"}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{startingPrice === null ? "Harga belum tersedia" : rupiah.format(startingPrice)}</p></div>
                <p className={`rounded-md border px-3 py-1.5 text-sm font-medium ${hasStock ? "border-success-border bg-success-background text-success" : "border-warning-border bg-warning-background text-warning"}`}>{hasStock ? "Ada varian tersedia" : "Stok habis"}</p>
              </div>

              <ProductSelection product={product} previewEnabled={scenario === "examples"} />

              <section aria-labelledby="important-information" className="mt-9 border-t border-border pt-7">
                <h2 id="important-information" className="text-lg font-semibold">Informasi penting</h2>
                <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                  <p>Harga ditampilkan per varian. Browser tidak menentukan harga final, stok, ongkir, atau reservasi.</p>
                  <p>{scenario === "examples" ? "Ketersediaan akhir akan diperiksa kembali saat checkout. Produk contoh ini tidak dapat dibeli dan tidak mewakili inventory launch." : "Ketersediaan akhir akan diperiksa kembali saat checkout. Order hanya dibuat setelah seluruh data server dan provider tervalidasi."}</p>
                </div>
              </section>
            </article>
          </div>
          {display.curated ? <details className="mt-12 border-y border-border py-4">
            <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Deskripsi lengkap dan ketentuan katalog</summary>
            <div className="max-w-3xl border-t border-border pt-5 text-sm leading-7">
              <p className="font-semibold">Nama produk pada katalog</p>
              <p className="mt-1 text-muted-foreground">{product.name}</p>
              <p className="mt-5 whitespace-pre-wrap break-words text-muted-foreground">{product.description}</p>
            </div>
          </details> : null}
          {supportingMedia.length > 0 ? <section aria-labelledby="product-media-title" className="mt-12 border-t border-border pt-8">
            <h2 id="product-media-title" className="text-lg font-semibold">Foto produk dan varian</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {supportingMedia.map((media) => media.url ? <div key={`${media.sortOrder}-${media.url}`} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card">
                <Image alt={media.altText || product.name} className="object-contain" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" src={media.url} />
              </div> : null)}
            </div>
          </section> : null}
        </div>
      </main>
    </PublicShell>
  );
}
