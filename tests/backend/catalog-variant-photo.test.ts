import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { replaceProductMediaSchema, updateVariantSchema } from "@/modules/catalog/schema";
import { catalogSeedSchema } from "@/modules/catalog/seed";

const seed = catalogSeedSchema.parse(JSON.parse(readFileSync(resolve("docs/source/Dataset Shop Niuva/catalog-seed.json"), "utf8")));

describe("variant photo links (Owner, 1 November 2026)", () => {
  it("carries each source variant photo into the seed, shared where the source shares it", () => {
    const linked = seed.products.flatMap(product => product.variants.filter(variant => variant.photoStorageKey !== undefined));
    expect(linked).toHaveLength(32);
    for (const product of seed.products) {
      const keys = new Set(product.media.map(media => media.storageKey));
      for (const variant of product.variants) {
        if (variant.photoStorageKey !== undefined) expect(keys.has(variant.photoStorageKey), variant.sku).toBe(true);
      }
    }
    const sharing = seed.products
      .map(product => new Set(product.variants.map(variant => variant.photoStorageKey).filter(Boolean)).size === 1 ? product.variants.length : 0)
      .filter(count => count > 1)
      .sort((a, b) => b - a);
    expect(sharing).toEqual([12, 8, 2]);
  });

  it("rejects a variant photo that is not in the product's own media", () => {
    const product = seed.products[0];
    if (!product) throw new Error("seed fixture missing");
    const broken = { ...seed, products: [{ ...product, variants: product.variants.map(variant => ({ ...variant, photoStorageKey: "media/products/bukan-foto-produk-ini.jpg" })) }] };
    expect(catalogSeedSchema.safeParse(broken).success).toBe(false);
  });

  it("refuses a gallery that repeats a photo or a position", () => {
    const item = { altText: "Foto", sortOrder: 0, storageKey: "media/products/foto-satu.jpg" };
    expect(replaceProductMediaSchema.safeParse({ items: [item, { ...item, sortOrder: 1 }] }).success).toBe(false);
    expect(replaceProductMediaSchema.safeParse({ items: [item, { ...item, storageKey: "media/products/foto-dua.jpg" }] }).success).toBe(false);
    expect(replaceProductMediaSchema.safeParse({ items: [item, { ...item, sortOrder: 1, storageKey: "media/products/foto-dua.jpg" }] }).success).toBe(true);
  });

  it("accepts a photo id or null for a variant and nothing else", () => {
    expect(updateVariantSchema.safeParse({ mediaId: null }).success).toBe(true);
    expect(updateVariantSchema.safeParse({ mediaId: "8d0b7a0e-4f2a-4c55-9b39-2f8f1a6c0d11" }).success).toBe(true);
    expect(updateVariantSchema.safeParse({ mediaId: "foto-1" }).success).toBe(false);
  });
});
