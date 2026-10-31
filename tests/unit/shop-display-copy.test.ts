import { describe, expect, it } from "vitest";
import catalogSeed from "../../docs/source/Dataset Shop Niuva/catalog-seed.json";
import { getShopDisplayCopy } from "@/features/public/shop-display-copy";

describe("Shop presentation copy", () => {
  const published = catalogSeed.products.filter((product) => product.isPublished);

  it("curates every published product with Owner-approved presentation copy", () => {
    // Owner decision 28 October 2026: all eight products are published. Display
    // copy: three approved earlier, the other five on 1 November 2026.
    expect(published).toHaveLength(8);
    for (const product of published) {
      const display = getShopDisplayCopy(product);
      expect(display.curated, product.slug).toBe(true);
      expect(display.name.length).toBeLessThan(product.name.length);
      expect(display.name).not.toMatch(/LEGO|PREORDER|READ DESCRIPTION/);
      expect(display.summary).not.toContain("NIUVA STUDIO");
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
