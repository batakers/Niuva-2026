import type { Metadata } from "next";
import { buildPageSocialMetadata } from "@/lib/site-metadata";
import { ShopIndexView } from "./shop-index-view";

const SHOP_TITLE = "Shop · Niuva";
const SHOP_DESCRIPTION =
  "Katalog produk ready-made Niuva dengan pilihan kategori dan status ketersediaan.";

export const metadata: Metadata = {
  title: SHOP_TITLE,
  description: SHOP_DESCRIPTION,
  ...buildPageSocialMetadata({ title: SHOP_TITLE, description: SHOP_DESCRIPTION, path: "/shop" }),
};

// Time-based revalidation (render-strategy.md, 9.16). Must stay a static
// literal and short because stock is visible. This page must not read
// `searchParams` or any other request-time API, otherwise it becomes dynamic
// and `revalidate` has no effect: `?preview=` scenarios are served by
// `src/app/preview/shop/page.tsx` through a rewrite in next.config.ts.
// `revalidatePath("/shop")` in admin actions invalidates this entry.
export const revalidate = 60;

export default function ShopPage() {
  return <ShopIndexView preview={undefined} />;
}