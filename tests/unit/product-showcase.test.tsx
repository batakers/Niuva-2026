import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PublicShopProduct } from "@/features/frontend-preview/types";

// A plain image-role element so the test can read which photo the gallery shows.
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <span aria-label={alt} data-src={src} role="img" />,
}));

import { ProductShowcase } from "@/app/shop/[slug]/product-showcase";

const photo = (name: string) => `/media/products/fixture-${name}.jpg`;
const product: PublicShopProduct = {
  category: { name: "Figur", slug: "figur" },
  description: "Fixture",
  id: "fixture-product",
  media: [
    { altText: "Foto produk", sortOrder: 0, url: photo("cover") },
    { altText: "Foto varian bersama", sortOrder: 1, url: photo("shared") },
    { altText: "Foto varian Merah", sortOrder: 2, url: photo("red") },
  ],
  name: "Fixture figure",
  slug: "fixture-figure",
  variants: [
    { id: "a", name: "A", photoUrl: photo("shared"), priceRp: "10000", sku: "A", stockOnHand: 2, weightGrams: "50" },
    { id: "red", name: "Merah", priceRp: "12000", sku: "RED", stockOnHand: 2, weightGrams: "50" },
    { id: "plain", name: "Polos", priceRp: "9000", sku: "PLAIN", stockOnHand: 2, weightGrams: "50" },
  ],
};
const heading = { available: true, category: "Figur", name: "Fixture figure", price: "Mulai Rp 9.000", summary: "Fixture" };

function shownPhoto() {
  return within(screen.getByRole("region", { name: "Foto produk" })).getAllByRole("img")[0]?.getAttribute("data-src");
}

describe("product gallery follows the chosen variant", () => {
  it("prefers the linked photo, falls back to the exact alt text, and stays put otherwise", () => {
    render(<ProductShowcase heading={heading} previewEnabled={false} product={product} />);
    expect(shownPhoto()).toBe(photo("cover"));

    fireEvent.click(screen.getByRole("radio", { name: /A/ }));
    expect(shownPhoto()).toBe(photo("shared"));

    fireEvent.click(screen.getByRole("radio", { name: /Merah/ }));
    expect(shownPhoto()).toBe(photo("red"));

    fireEvent.click(screen.getByRole("radio", { name: /Polos/ }));
    expect(shownPhoto()).toBe(photo("red"));
  });
});
