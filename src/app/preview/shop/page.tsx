import type { Metadata } from "next";
import { ShopIndexView } from "@/app/shop/shop-index-view";

type SearchParams = Promise<{ preview?: string }>;

// Internal target of the `/shop?preview=...` rewrite in next.config.ts. It
// reads `searchParams`, so it is always dynamic and never cached; the public
// `/shop` route stays free of request-time APIs. The source is still chosen by
// `resolvePublicContentSource`, so this route grants no access of its own.
// Anything reaching it is `noindex`.
export const metadata: Metadata = {
  title: "Shop · Niuva",
  description: "Katalog produk ready-made Niuva dengan pilihan kategori dan status ketersediaan.",
  robots: { follow: false, index: false },
};

export default async function ShopPreviewPage({ searchParams }: { searchParams: SearchParams }) {
  return <ShopIndexView preview={(await searchParams).preview} />;
}
