import type { Metadata } from "next";
import { ProductDetailView } from "./product-detail-view";

export const metadata: Metadata = {
  title: "Detail produk · Niuva",
  description: "Detail, varian, harga, dan ketersediaan produk ready-made Niuva.",
};

// Time-based revalidation (render-strategy.md, 9.16). Must stay a static
// literal and short because stock is visible. This page must not read
// `searchParams` or any other request-time API: `?preview=` scenarios are
// served by `src/app/preview/shop/[slug]/page.tsx` through a rewrite in
// next.config.ts. Slugs are rendered on first request and cached per slug;
// admin product actions invalidate every entry with
// `revalidatePath("/shop/[slug]", "page")`.
export const revalidate = 60;

// No slug is pre-rendered at build (the build must not need a database). An
// empty list still makes the segment a cacheable, on-demand ISR route;
// `dynamicParams` stays at its default `true`.
export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetailView preview={undefined} slug={slug} />;
}