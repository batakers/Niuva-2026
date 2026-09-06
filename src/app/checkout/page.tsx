import type { Metadata } from "next";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { getShopPreview } from "@/features/frontend-preview/server";
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
  const { preview, state } = await searchParams;
  const { scenario, products } = await getShopPreview(preview);
  const previewEnabled = process.env.NODE_ENV === "development" && scenario === "examples";

  return (
    <PublicShell scope="checkout">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
            <p className="text-sm font-medium text-brand-700">Checkout tamu</p>
            <h1 className={`${type.heading.className} mt-4 max-w-4xl`}>Satu pemeriksaan lagi sebelum transaksi dimulai.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Isi kontak dan alamat, pilih simulasi pengiriman, lalu tinjau ringkasan. Harga, stok, ongkir, dan status pembayaran tetap menjadi kewenangan server.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
          <CheckoutForm products={products} catalogStatus={scenario} previewEnabled={previewEnabled} initialScenario={state} />
        </div>
      </main>
    </PublicShell>
  );
}
