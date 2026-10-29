import { describe, expect, it } from "vitest";
import catalogSeed from "../../docs/source/Dataset Shop Niuva/catalog-seed.json";
import { getShopDisplayCopy } from "@/features/public/shop-display-copy";

describe("Shop presentation copy", () => {
  const published = catalogSeed.products.filter((product) => product.isPublished);

  it("curates the three approved ready-made products and shows the canonical record for the rest", () => {
    // Owner decision 28 October 2026: all eight products are published; only
    // three have approved presentation copy so far.
    expect(published).toHaveLength(8);
    const curated = published.filter((product) => getShopDisplayCopy(product).curated);
    expect(curated).toHaveLength(3);
    for (const product of curated) {
      const display = getShopDisplayCopy(product);
      expect(display.name.length).toBeLessThan(product.name.length);
      expect(display.summary).not.toContain("NIUVA STUDIO – Jasa 3D print custom");
    }
    for (const product of published.filter((item) => !curated.includes(item))) {
      expect(getShopDisplayCopy(product), product.slug).toEqual({ curated: false, name: product.name, summary: product.description });
    }
  });

  it("falls back to the canonical record if an admin changes the name", () => {
    const product = published[0];
    expect(product).toBeDefined();
    if (!product) return;
    const updated = { ...product, name: "Nama baru dari admin" };
    expect(getShopDisplayCopy(updated)).toEqual({
      curated: false,
      name: updated.name,
      summary: updated.description,
    });
  });
});
