import type { Metadata } from "next";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { getShopPreview } from "@/features/frontend-preview/server";
import { CartItems } from "./cart-items";

export const metadata: Metadata = {
  title: "Cart · Niuva",
  description: "Tinjau pilihan produk ready-made sebelum melanjutkan ke checkout tamu.",
};

type CartPageProps = {
  searchParams: Promise<{ preview?: string | string[] }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const { preview } = await searchParams;
  const { scenario, products } = await getShopPreview(preview);
  const previewEnabled = scenario === "examples";

  return (
    <PublicShell scope="cart">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16">
            <p className="text-sm font-medium text-brand-700">Cart tamu</p>
            <h1 className={`${type.heading.className} mt-4 max-w-4xl`}>Tinjau pilihan sebelum data diperiksa kembali.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Cart ini menyimpan ID varian dan jumlah di browser. Harga, stok, ongkir, dan total final tetap harus diverifikasi server saat checkout.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-public px-5 py-10 sm:px-8 sm:py-14">
          {process.env.NODE_ENV === "development" ? (
            <aside aria-label="Preview cart" className="mb-8 rounded-lg border border-info-border bg-info-background p-4 text-info">
              <p className="text-sm font-semibold">Preview lokal, data produk sintetis dan bukan inventory Niuva</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[["examples", "Contoh"], ["empty", "Data produk kosong"], ["loading", "Data produk memuat"], ["error", "Data produk gagal"]].map(([value, label]) => (
                  <AuLink key={value} href={`/cart?preview=${value}`} variant="outline" size="sm" className="min-h-11" aria-current={scenario === value ? "page" : undefined}>{label}</AuLink>
                ))}
              </div>
            </aside>
          ) : null}

          <CartItems products={products} catalogStatus={scenario} previewEnabled={previewEnabled} />
        </div>
      </main>
    </PublicShell>
  );
}
