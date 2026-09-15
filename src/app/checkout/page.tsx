import type { Metadata } from "next";
import { connection } from "next/server";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { getLiveShopProducts, getShopPreview } from "@/features/frontend-preview/server";
import { getServerCapabilities, isLocalDemoMode } from "@/lib/env/server";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout · Niuva",
  description: "Tinjau kontak, alamat, pengiriman, dan ringkasan checkout tamu Niuva.",
};

type CheckoutPageProps = {
  searchParams: Promise<{
    preview?: string | string[];
    state?: string | string[];
  }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  await connection();
  const { preview, state } = await searchParams;
  const { scenario, products: previewProducts } = await getShopPreview(preview);
  const previewEnabled = process.env.NODE_ENV === "development" && scenario === "examples";
  const demoMode = isLocalDemoMode();
  let liveEnabled = false;
  let products = previewProducts;

  if (!previewEnabled && scenario === null) {
    try {
      const capabilities = getServerCapabilities();
      if (
        capabilities.database &&
        (demoMode || (capabilities.biteship && capabilities.midtrans))
      ) {
        products = await getLiveShopProducts();
        liveEnabled = products.length > 0;
      }
    } catch {
      // Provider, catalog, and database boundaries fail closed to the safe notice.
    }
  }
  const functionalStatus = liveEnabled
    ? "server-backed" as const
    : scenario === null
      ? "capability-gated" as const
      : "frontend-preview" as const;

  return (
    <PublicShell functionalStatus={functionalStatus} scope="checkout">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
            <p className="text-sm font-medium text-brand-700">Checkout tamu</p>
            <h1 className={`${type.heading.className} mt-4 max-w-4xl`}>Satu pemeriksaan lagi sebelum transaksi dimulai.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {liveEnabled
                ? "Isi kontak dan alamat, muat tarif pengiriman, lalu buat order tamu. Harga, stok, ongkir, dan status pembayaran tetap menjadi kewenangan server."
                : "Isi kontak dan alamat, pilih simulasi pengiriman, lalu tinjau ringkasan. Harga, stok, ongkir, dan status pembayaran tetap menjadi kewenangan server."}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
          <CheckoutForm demoMode={demoMode} products={products} catalogStatus={scenario} liveEnabled={liveEnabled} previewEnabled={previewEnabled} initialScenario={state} />
        </div>
      </main>
    </PublicShell>
  );
}
