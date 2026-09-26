import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";

export default function ProductNotFound() {
  return (
    <PublicShell scope="product-detail">
      <main id="main-content" className="mx-auto max-w-public px-5 py-14 sm:px-8 sm:py-20">
        <h1 className={`${type.heading.className} max-w-3xl`}>Produk tidak ditemukan.</h1>
        <div className="mt-8 max-w-2xl">
          <StatusNotice tone="info" title="Tautan produk tidak tersedia." description="Produk mungkin belum dipublikasikan atau slug tidak lagi berlaku. Kembali ke katalog untuk melihat pilihan yang tersedia." action={<NiuvaLink href="/shop" variant="outline" className="min-h-11">Kembali ke Shop</NiuvaLink>} />
        </div>
      </main>
    </PublicShell>
  );
}
