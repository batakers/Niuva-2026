import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";
import { getLiveShopProducts, getShopPreview } from "@/features/frontend-preview/server";
import { requireCustomer } from "@/lib/auth/customer";
import { getServerCapabilities, isLocalDemoMode } from "@/lib/env/server";
import { isAppError } from "@/modules/shared/errors";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout · Niuva",
  description: "Tinjau alamat, pengiriman, dan ringkasan checkout Customer Niuva.",
};

type CheckoutPageProps = {
  searchParams: Promise<{
    preview?: string | string[];
    state?: string | string[];
  }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  let customer;
  try {
    customer = await requireCustomer();
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") {
      redirect("/login?returnTo=/checkout");
    }

    if (isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE") {
      return (
        <PublicShell functionalStatus="capability-gated" scope="checkout">
          <main id="main-content">
            <div className="mx-auto max-w-public px-5 py-16 sm:px-8">
              <StatusNotice
                tone="warning"
                title="Login Customer belum tersedia."
                description="Checkout membutuhkan Google login Customer. Lengkapi konfigurasi OAuth non-production sebelum melanjutkan."
                action={<AuLink href="/login?returnTo=/checkout" className="min-h-11">Buka halaman login</AuLink>}
              />
            </div>
          </main>
        </PublicShell>
      );
    }

    throw error;
  }

  await connection();
  const { preview, state } = await searchParams;
  const { scenario, products: previewProducts } = await getShopPreview(preview);
  const previewEnabled = process.env.NODE_ENV === "development" && scenario === "examples";
  const demoMode = isLocalDemoMode();
  let liveEnabled = false;
  let liveCatalogError = false;
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
        liveCatalogError = true;
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
            <p className="text-sm font-medium text-brand-700">Checkout Customer</p>
            <h1 className={`${type.heading.className} mt-4 max-w-4xl`}>Satu pemeriksaan lagi sebelum transaksi dimulai.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              {liveEnabled
                ? "Isi nomor kontak dan alamat, muat tarif pengiriman, lalu buat order. Identitas Customer berasal dari Google session; harga, stok, ongkir, dan status pembayaran tetap menjadi kewenangan server."
                : "Isi nomor kontak dan alamat, pilih simulasi pengiriman, lalu tinjau ringkasan. Identitas Customer berasal dari Google session; harga, stok, ongkir, dan status pembayaran tetap menjadi kewenangan server."}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
          <CheckoutForm catalogStatus={scenario} customer={customer} demoMode={demoMode} initialScenario={state} liveCatalogError={liveCatalogError} liveEnabled={liveEnabled} previewEnabled={previewEnabled} products={products} />
        </div>
      </main>
    </PublicShell>
  );
}
