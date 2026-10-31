import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { CatalogRepository } from "@/modules/catalog/repository";
import { catalogSeedSchema, seedCatalog } from "@/modules/catalog/seed";

import { isolatedTestDatabase } from "../helpers/isolated-test-database";

let database: Awaited<ReturnType<typeof isolatedTestDatabase>> | undefined;
let prisma: PrismaClient;

const key = (name: string) => `media/products/variant-media-${name}.jpg`;
const seed = catalogSeedSchema.parse({
  version: 1,
  categories: [],
  products: [
    {
      slug: "variant-media-figure",
      name: "Variant media figure",
      description: "Fixture for variant photo links.",
      isPublished: true,
      media: [
        { altText: "Foto produk", sortOrder: 0, storageKey: key("cover") },
        { altText: "Foto varian bersama", sortOrder: 1, storageKey: key("shared") },
        { altText: "Foto varian merah", sortOrder: 2, storageKey: key("red") },
      ],
      variants: [
        // Two variants share one photo, as the Tokopedia source does for custom figures.
        { sku: "VM-A", name: "A", priceRp: "10000", stockOnHand: 1, weightGrams: "50", photoStorageKey: key("shared") },
        { sku: "VM-B", name: "B", priceRp: "10000", stockOnHand: 1, weightGrams: "50", photoStorageKey: key("shared") },
        { sku: "VM-RED", name: "Merah", priceRp: "12000", stockOnHand: 1, weightGrams: "50", photoStorageKey: key("red") },
        { sku: "VM-NONE", name: "Tanpa foto", priceRp: "9000", stockOnHand: 1, weightGrams: "50" },
      ],
    },
    {
      slug: "variant-media-other",
      name: "Other product",
      description: "Owns a photo the first product may not use.",
      isPublished: false,
      media: [{ altText: "Foto lain", sortOrder: 0, storageKey: key("other") }],
      variants: [{ sku: "VM-OTHER", name: "Default", priceRp: "5000", stockOnHand: 0, weightGrams: "50" }],
    },
  ],
});

const variantPhoto = async (sku: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { sku }, select: { media: { select: { storageKey: true } } } })).media?.storageKey ?? null;

beforeAll(async () => {
  database = await isolatedTestDatabase("status");
  prisma = database.prisma;
  await seedCatalog(prisma, seed);
}, 90000);

afterAll(async () => { await database?.dispose(); });

describe("variant photo links (isolated database)", () => {
  it("links variants to their photo from the seed, many variants to one photo", async () => {
    expect(await variantPhoto("VM-A")).toBe(key("shared"));
    expect(await variantPhoto("VM-B")).toBe(key("shared"));
    expect(await variantPhoto("VM-RED")).toBe(key("red"));
    expect(await variantPhoto("VM-NONE")).toBeNull();
    // A second import is idempotent and keeps the links.
    await seedCatalog(prisma, seed);
    expect(await variantPhoto("VM-RED")).toBe(key("red"));
  });

  it("exposes the linked photo to the public product read", async () => {
    const product = await new CatalogRepository(prisma).findPublishedProductBySlug("variant-media-figure");
    expect(product?.variants.find(variant => variant.sku === "VM-RED")?.media?.storageKey).toBe(key("red"));
    expect(product?.variants.find(variant => variant.sku === "VM-NONE")?.media).toBeNull();
  });

  it("keeps photo rows and links when the gallery is reordered, and clears a link when its photo leaves", async () => {
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "variant-media-figure" }, select: { id: true } });
    const before = await prisma.productMedia.findMany({ where: { productId: product.id }, select: { id: true, storageKey: true } });
    const repository = new CatalogRepository(prisma);

    await repository.replaceMedia(product.id, [
      { altText: "Foto varian merah", sortOrder: 0, storageKey: key("red") },
      { altText: "Foto produk", sortOrder: 1, storageKey: key("cover") },
      { altText: "Foto varian bersama", sortOrder: 2, storageKey: key("shared") },
    ]);
    const after = await prisma.productMedia.findMany({ where: { productId: product.id }, select: { id: true, sortOrder: true, storageKey: true } });
    expect(after.map(row => row.id).sort()).toEqual(before.map(row => row.id).sort());
    expect(after.find(row => row.storageKey === key("red"))?.sortOrder).toBe(0);
    expect(await variantPhoto("VM-RED")).toBe(key("red"));
    expect(await variantPhoto("VM-A")).toBe(key("shared"));

    await repository.replaceMedia(product.id, [
      { altText: "Foto produk", sortOrder: 0, storageKey: key("cover") },
      { altText: "Foto varian merah", sortOrder: 1, storageKey: key("red") },
      { altText: "Foto baru", sortOrder: 2, storageKey: key("new") },
    ]);
    expect(await variantPhoto("VM-A")).toBeNull();
    expect(await variantPhoto("VM-B")).toBeNull();
    expect(await variantPhoto("VM-RED")).toBe(key("red"));
    expect(await prisma.productMedia.count({ where: { productId: product.id } })).toBe(3);
  });

  it("only accepts a photo from the variant's own product, and null clears the link", async () => {
    const repository = new CatalogRepository(prisma);
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "VM-NONE" }, select: { id: true, productId: true } });
    const foreign = await prisma.productMedia.findFirstOrThrow({ where: { storageKey: key("other") }, select: { id: true } });
    const own = await prisma.productMedia.findFirstOrThrow({ where: { productId: variant.productId, storageKey: key("cover") }, select: { id: true } });

    await expect(repository.updateVariant(variant.id, { mediaId: foreign.id })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await variantPhoto("VM-NONE")).toBeNull();

    await repository.updateVariant(variant.id, { mediaId: own.id });
    expect(await variantPhoto("VM-NONE")).toBe(key("cover"));
    await repository.updateVariant(variant.id, { mediaId: null });
    expect(await variantPhoto("VM-NONE")).toBeNull();
  });
});
