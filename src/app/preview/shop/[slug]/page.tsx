import type { Metadata } from "next";
import { ProductDetailView } from "@/app/shop/[slug]/product-detail-view";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
};

// Internal target of the `/shop/[slug]?preview=...` rewrite in next.config.ts.
// It reads `searchParams`, so it is always dynamic and never cached; the public
// detail route stays free of request-time APIs. The content source is still
// chosen by `resolvePublicContentSource`. Always `noindex`.
export const metadata: Metadata = {
  title: "Detail produk · Niuva",
  description: "Detail, varian, harga, dan ketersediaan produk ready-made Niuva.",
  robots: { follow: false, index: false },
};

export default async function ProductPreviewPage({ params, searchParams }: Props) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  return <ProductDetailView preview={preview} slug={slug} />;
}
