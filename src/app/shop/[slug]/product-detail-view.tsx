import { notFound } from "next/navigation";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { getLiveShopProduct, getShopProductPreview } from "@/features/frontend-preview/server";
import { getShopDisplayCopy } from "@/features/public/shop-display-copy";
import { ProductShowcase } from "./product-showcase";

const shellGutter = "mx-auto max-w-public px-5 sm:px-12";

function ProductLoading() {
  return (
    <PublicShell functionalStatus="frontend-preview" scope="product-detail">
      <main id="main-content" className={`${shellGutter} py-10 sm:py-14`}>
        <h1 className="sr-only">Memuat detail produk</h1>
        <div role="status" aria-label="Memuat detail produk" className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div className="aspect-square rounded-[var(--radius-media)] bg-muted motion-safe:animate-pulse" />
          <div className="space-y-5"><div className="h-10 rounded-lg bg-muted motion-safe:animate-pulse" /><div className="h-24 rounded-lg bg-muted motion-safe:animate-pulse" /><p className="text-ui text-muted-foreground">Memuat detail produk contoh…</p></div>
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
        <main id="main-content" className={`${shellGutter} py-14 sm:py-20`}>
          <h1 className={`${type.heading.className} max-w-3xl`}>Detail produk belum dapat dimuat.</h1>
          <div className="mt-8 max-w-2xl">
            <StatusNotice tone="error" title="Terjadi gangguan pada preview." description="Tidak ada pilihan atau pesanan yang dibuat. Muat kembali data contoh untuk melanjutkan peninjauan." action={<NiuvaLink href={`/shop/${slug}?preview=examples`} variant="outline" className="min-h-11">Coba lagi</NiuvaLink>} />
          </div>
        </main>
      </PublicShell>
    );
  }
  if (liveCatalogError || (scenario === null && process.env.DATABASE_URL === undefined)) {
    return (
      <PublicShell functionalStatus="capability-gated" scope="product-detail">
        <main id="main-content" className={`${shellGutter} py-14 sm:py-20`}>
          <h1 className={`${type.heading.className} max-w-3xl`}>Detail produk belum dapat dimuat.</h1>
          <div className="mt-8 max-w-2xl">
            <StatusNotice
              tone={liveCatalogError ? "error" : "warning"}
              title={liveCatalogError ? "Katalog sedang tidak dapat dijangkau." : "Katalog belum terhubung."}
              description={liveCatalogError ? "Data produk tidak dapat diperiksa saat ini. Muat ulang halaman ini sebentar lagi." : "Gunakan preview contoh untuk meninjau tampilan. Preview bukan produk yang dijual."}
              action={<NiuvaLink href={liveCatalogError ? `/shop/${slug}` : "/shop?preview=examples"} variant="outline" className="min-h-11">{liveCatalogError ? "Muat ulang" : "Buka preview contoh"}</NiuvaLink>}
            />
          </div>
        </main>
      </PublicShell>
    );
  }
  if (!product) notFound();

  const display = getShopDisplayCopy(product);
  const prices = product.variants.map(variant => BigInt(variant.priceRp));
  const lowest = prices.length > 0 ? prices.reduce((current, price) => (price < current ? price : current)) : null;
  const priceVaries = lowest !== null && prices.some(price => price !== lowest);
  const hasStock = product.variants.some((variant) => variant.stockOnHand > 0);
  const rupiah = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });
  const isExample = scenario === "examples";

  return (
    <PublicShell functionalStatus={isExample ? "frontend-preview" : "server-backed"} scope="product-detail">
      <main id="main-content" className="overflow-x-hidden">
        <div className={`${shellGutter} pt-6 pb-8 sm:pt-8`}>
          <NiuvaLink href={isExample ? "/shop?preview=examples" : "/shop"} variant="outline" size="sm" className="min-h-11">
            <Icon aria-hidden="true" className="size-4" name="arrow-left" />
            Kembali ke Toko
          </NiuvaLink>
        </div>

        <div className={`${shellGutter} pb-24 sm:pb-32`}>
          <ProductShowcase
            previewEnabled={isExample}
            product={product}
            heading={{
              available: hasStock,
              category: product.category?.name ?? "Produk siap pesan",
              name: display.name,
              price: lowest === null ? "Harga belum tersedia" : `${priceVaries ? "Mulai " : ""}${rupiah.format(lowest)}`,
              summary: display.summary,
            }}
          />

          {display.curated ? (
            <details className="group mt-16 rounded-[var(--radius-card)] border border-border bg-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 text-lead font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-6 [&::-webkit-details-marker]:hidden">
                Deskripsi lengkap dari katalog
                <Icon aria-hidden="true" className="size-4 shrink-0 transition-transform duration-[var(--duration-normal-token)] group-open:rotate-180 motion-reduce:transition-none" name="arrow-down" />
              </summary>
              <div className="max-w-3xl px-5 pb-6 sm:px-6">
                <p className="text-ui font-medium">Nama produk pada katalog</p>
                <p className="mt-1 text-base leading-[1.6] text-muted-foreground">{product.name}</p>
                <p className="mt-5 whitespace-pre-wrap break-words text-base leading-[1.65]">{product.description}</p>
              </div>
            </details>
          ) : null}
        </div>
      </main>
    </PublicShell>
  );
}
