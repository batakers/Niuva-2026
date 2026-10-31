import { ClosingPanel } from "@/components/niuva/closing-panel";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import { getLiveShopProducts, getShopPreview } from "@/features/frontend-preview/server";
import { mascotRenders } from "@/features/public/mascot";
import { ProductGrid } from "./product-grid";

// Shared by the cacheable public route (`preview` is always undefined) and the
// dynamic, noindex preview route. It never reads request-time APIs itself.
export async function ShopIndexView({ preview }: { preview: string | undefined }) {
  const { scenario, products: previewProducts } = await getShopPreview(preview);
  let products = previewProducts;
  let liveEnabled = false;
  let liveCatalogError = false;
  let liveCatalogUnavailable = false;
  if (scenario === null && process.env.DATABASE_URL !== undefined) {
    try {
      products = await getLiveShopProducts();
      liveEnabled = products.length > 0;
    } catch {
      liveCatalogError = true;
      products = [];
    }
  } else if (scenario === null) {
    liveCatalogUnavailable = true;
  }
  const functionalStatus = liveEnabled
    ? "server-backed" as const
    : scenario === null
      ? "capability-gated" as const
      : "frontend-preview" as const;

  // Commerce guide: a short heading and then the catalog, no promotional hero in between.
  return (
    <PublicShell functionalStatus={functionalStatus} scope="shop">
      <main id="main-content">
        <div className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14">
          <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Produk cetak 3D siap pesan.</h1>
          <p className="mt-4 max-w-[52ch] text-lead leading-[1.6]">Pilih produk dan variannya, masukkan ke keranjang, lalu bayar setelah masuk ke akun Anda.</p>
        </div>

        <div className="mx-auto max-w-public scroll-mt-24 px-5 pt-10 sm:px-12 sm:pt-14" id="catalog">
          {liveCatalogError ? (
            <StatusNotice tone="error" title="Katalog belum dapat dimuat." description="Daftar produk sedang tidak dapat dijangkau. Muat ulang halaman ini sebentar lagi." action={<NiuvaLink href="/shop" variant="outline" className="min-h-11">Muat ulang</NiuvaLink>} />
          ) : liveCatalogUnavailable ? (
            <StatusNotice tone="warning" title="Katalog belum terhubung." description="Produk akan tampil setelah sumber katalog tersedia. Preview contoh hanya untuk meninjau tampilan, bukan produk yang dijual." action={<NiuvaLink href="/shop?preview=examples" variant="outline" className="min-h-11">Buka preview contoh</NiuvaLink>} />
          ) : scenario === "loading" ? (
            <div role="status" aria-label="Memuat katalog" className="space-y-5">
              <p className="text-ui text-muted-foreground">Memuat katalog contoh…</p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(item => <div key={item} className="space-y-4"><div className="aspect-square rounded-[var(--radius-card)] bg-muted motion-safe:animate-pulse" /><div className="h-6 w-2/3 rounded-md bg-muted motion-safe:animate-pulse" /></div>)}
              </div>
            </div>
          ) : scenario === "error" ? (
            <StatusNotice tone="error" title="Katalog belum dapat dimuat." description="Muat kembali untuk meninjau alur pemulihan. Tidak ada pesanan yang dibuat." action={<NiuvaLink href="/shop?preview=examples" variant="outline" className="min-h-11">Coba lagi</NiuvaLink>} />
          ) : products.length === 0 ? (
            <StatusNotice tone="info" title="Produk belum tersedia di Toko." description="Produk akan tampil di sini setelah siap dijual. Sementara itu, Anda bisa melihat layanan Niuva." action={<NiuvaLink href="/services" variant="outline" className="min-h-11">Lihat layanan</NiuvaLink>} />
          ) : (
            <ProductGrid products={products} previewEnabled={scenario === "examples"} />
          )}
          {process.env.NODE_ENV === "development" && !liveEnabled && (
            <aside aria-label="Preview katalog" className="mt-12 rounded-[var(--radius-control)] border border-info-border bg-info-background p-4 text-info">
              <p className="text-ui font-semibold">Preview lokal, data sintetis dan bukan inventory Niuva</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[["examples", "Contoh"], ["empty", "Kosong"], ["loading", "Memuat"], ["error", "Gagal"]].map(([value, label]) => (
                  <NiuvaLink key={value} href={`/shop?preview=${value}`} variant="outline" size="sm" className="min-h-11" aria-current={scenario === value ? "page" : undefined}>{label}</NiuvaLink>
                ))}
              </div>
            </aside>
          )}
        </div>

        <ClosingPanel id="shop-custom-title" mascot={mascotRenders.build} title="Butuh bentuk sendiri?">
          <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white">Kirim model 3D atau referensi Anda. Operator meninjau kebutuhannya, lalu mengirim quote sebelum produksi dimulai.</p>
          <NiuvaLink className="mt-7 min-h-11" href="/custom-print" variant="onBrand">Buka Custom 3D Print</NiuvaLink>
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
