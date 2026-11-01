import type { Metadata } from "next";
import { connection } from "next/server";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { getLiveShopProducts, getShopPreview } from "@/features/frontend-preview/server";
import type { PreviewScenario } from "@/features/frontend-preview/types";
import { getServerCapabilities, isLocalDemoMode } from "@/lib/env/server";
import { CartItems } from "./cart-items";

export const metadata: Metadata = {
  title: "Keranjang · Niuva",
  description: "Periksa produk, varian, dan jumlahnya sebelum checkout di Niuva.",
};

type CartPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  await connection();
  const { preview } = await searchParams;
  const { scenario, products: previewProducts } = await getShopPreview(preview);
  const demoMode = isLocalDemoMode();
  let products = previewProducts;
  let liveEnabled = false;
  let catalogStatus: PreviewScenario | "live-empty" | "live-error" | "live-unavailable" | null = scenario;
  if (scenario === null && process.env.DATABASE_URL !== undefined) {
    try {
      products = await getLiveShopProducts();
      catalogStatus = products.length === 0 ? "live-empty" : null;
    } catch {
      catalogStatus = "live-error";
      products = [];
    }
    try {
      const capabilities = getServerCapabilities();
      liveEnabled =
        products.length > 0 &&
        (demoMode || (capabilities.biteship && capabilities.midtrans));
    } catch {
      liveEnabled = false;
    }
  } else if (scenario === null) {
    catalogStatus = "live-unavailable";
  }
  const previewEnabled = scenario === "examples";
  const functionalStatus = liveEnabled
    ? "server-backed" as const
    : scenario === null
      ? "capability-gated" as const
      : "frontend-preview" as const;

  return (
    <PublicShell functionalStatus={functionalStatus} scope="cart">
      <main id="main-content">
        {/* Commerce guide: a short heading, then the items and their summary. */}
        <div className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14">
          <h1 className={type.heading.className}>Keranjang</h1>
          <p className="mt-4 max-w-[52ch] text-lead leading-[1.6]">Periksa produk dan jumlahnya. Harga, stok, dan ongkir dihitung lagi saat pesanan dibuat.</p>
        </div>

        <div className="mx-auto max-w-public px-5 pb-20 pt-10 sm:px-12 sm:pb-28 sm:pt-12">
          <CartItems demoMode={demoMode} products={products} catalogStatus={catalogStatus} liveEnabled={liveEnabled} previewEnabled={previewEnabled} />

          {process.env.NODE_ENV === "development" && !liveEnabled ? (
            <aside aria-label="Preview keranjang" className="mt-12 rounded-[var(--radius-control)] border border-info-border bg-info-background p-4 text-info">
              <p className="text-ui font-semibold">Preview lokal, data produk sintetis dan bukan inventory Niuva</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[["examples", "Contoh"], ["empty", "Data produk kosong"], ["loading", "Data produk memuat"], ["error", "Data produk gagal"]].map(([value, label]) => (
                  <NiuvaLink key={value} href={`/cart?preview=${value}`} variant="outline" size="sm" className="min-h-11" aria-current={scenario === value ? "page" : undefined}>{label}</NiuvaLink>
                ))}
              </div>
            </aside>
          ) : null}
        </div>
      </main>
    </PublicShell>
  );
}
