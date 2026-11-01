import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { getLiveShopProducts, getShopPreview } from "@/features/frontend-preview/server";
import { requireCustomer } from "@/lib/auth/customer";
import { getServerCapabilities, isLocalDemoMode } from "@/lib/env/server";
import { isAppError } from "@/modules/shared/errors";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout · Niuva",
  description: "Isi alamat, pilih pengiriman, dan buat pesanan di Niuva.",
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
            <div className="mx-auto max-w-public px-5 py-16 sm:px-12">
              <StatusNotice
                tone="warning"
                title="Login Customer belum tersedia."
                description="Checkout membutuhkan login Customer. Lengkapi konfigurasi autentikasi non-production sebelum melanjutkan."
                action={<NiuvaLink href="/login?returnTo=/checkout" className="min-h-11">Buka halaman login</NiuvaLink>}
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
        <div className="mx-auto max-w-public px-5 pt-8 sm:px-12 sm:pt-10">
          <NiuvaLink href={previewEnabled ? "/cart?preview=examples" : "/cart"} variant="outline" size="sm" className="min-h-11">
            <Icon aria-hidden="true" className="size-4" name="arrow-left" />
            Kembali ke keranjang
          </NiuvaLink>
          <h1 className={`${type.heading.className} mt-8`}>Selesaikan pesanan</h1>
          <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">
            {previewEnabled && !liveEnabled
              ? "Isi nomor WhatsApp dan alamat, lalu pilih pengiriman. Di preview lokal ini belum ada pesanan atau pembayaran yang dibuat."
              : "Isi nomor WhatsApp dan alamat, pilih pengiriman, lalu buat pesanan. Pembayaran dibuka setelah pesanan tersimpan."}
          </p>
        </div>

        <div className="mx-auto max-w-public px-5 pb-20 pt-10 sm:px-12 sm:pb-28 sm:pt-12">
          <CheckoutForm catalogStatus={scenario} customer={customer} demoMode={demoMode} initialScenario={state} liveCatalogError={liveCatalogError} liveEnabled={liveEnabled} previewEnabled={previewEnabled} products={products} />
        </div>
      </main>
    </PublicShell>
  );
}
