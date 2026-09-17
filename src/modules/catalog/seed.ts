import type { PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const text = z.string().trim().min(1);
const decimal = z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/);
const money = z.string().trim().regex(/^\d+$/);
const mediaStorageKey = z
  .string()
  .trim()
  .regex(/^media\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/i);

const seedMediaSchema = z.object({
  altText: text,
  sortOrder: z.int().nonnegative(),
  storageKey: mediaStorageKey,
});

const seedVariantSchema = z.object({
  heightCm: decimal.optional(),
  isActive: z.boolean().default(true),
  lengthCm: decimal.optional(),
  name: text,
  priceRp: money,
  sku: text,
  stockOnHand: z.int().nonnegative(),
  weightGrams: decimal,
  widthCm: decimal.optional(),
});

const seedProductSchema = z.object({
  categorySlug: slug.optional(),
  description: text,
  isPublished: z.boolean().default(false),
  media: z.array(seedMediaSchema).max(12).default([]),
  name: text,
  slug,
  variants: z.array(seedVariantSchema).max(50).default([]),
});

export const catalogSeedSchema = z
  .object({
    categories: z
      .array(z.object({ name: text, slug, sortOrder: z.int().nonnegative().default(0) }))
      .default([]),
    products: z.array(seedProductSchema).min(1),
    version: z.literal(1),
  })
  .superRefine((value, context) => {
    const categorySlugs = new Set<string>();
    for (const category of value.categories) {
      if (categorySlugs.has(category.slug)) {
        context.addIssue({ code: "custom", message: `Slug kategori duplikat: ${category.slug}.`, path: ["categories"] });
      }
      categorySlugs.add(category.slug);
    }
    const productSlugs = new Set<string>();
    const skus = new Set<string>();
    for (const product of value.products) {
      if (productSlugs.has(product.slug)) {
        context.addIssue({ code: "custom", message: `Slug produk duplikat: ${product.slug}.`, path: ["products"] });
      }
      productSlugs.add(product.slug);
      if (product.isPublished && (
        product.media.length === 0 ||
        !product.variants.some((variant) => variant.isActive)
      )) {
        context.addIssue({ code: "custom", message: `Produk published harus memiliki media dan varian: ${product.slug}.`, path: ["products"] });
      }
      const sortOrders = new Set<number>();
      for (const media of product.media) {
        if (sortOrders.has(media.sortOrder)) {
          context.addIssue({ code: "custom", message: `sortOrder media duplikat pada ${product.slug}.`, path: ["products"] });
        }
        sortOrders.add(media.sortOrder);
      }
      for (const variant of product.variants) {
        if (skus.has(variant.sku)) {
          context.addIssue({ code: "custom", message: `SKU duplikat: ${variant.sku}.`, path: ["products"] });
        }
        skus.add(variant.sku);
      }
    }
  });

export type CatalogSeedInput = z.infer<typeof catalogSeedSchema>;

export type CatalogSeedResult = Readonly<{
  categories: number;
  media: number;
  products: number;
  variants: number;
}>;

export async function seedCatalog(
  prisma: PrismaClient,
  input: CatalogSeedInput,
): Promise<CatalogSeedResult> {
  return prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();
    for (const category of input.categories) {
      const persisted = await tx.category.upsert({
        where: { slug: category.slug },
        create: { name: category.name, slug: category.slug, sortOrder: category.sortOrder },
        update: { name: category.name, sortOrder: category.sortOrder },
        select: { id: true },
      });
      categoryIds.set(category.slug, persisted.id);
    }

    let mediaCount = 0;
    let variantCount = 0;
    for (const product of input.products) {
      const categoryId = product.categorySlug === undefined
        ? undefined
        : categoryIds.get(product.categorySlug);
      if (product.categorySlug !== undefined && categoryId === undefined) {
        throw new Error(`Kategori ${product.categorySlug} belum didefinisikan.`);
      }

      const persisted = await tx.product.upsert({
        where: { slug: product.slug },
        create: {
          categoryId,
          description: product.description,
          isPublished: product.isPublished,
          name: product.name,
          slug: product.slug,
        },
        update: {
          ...(categoryId === undefined ? {} : { categoryId }),
          description: product.description,
          isPublished: product.isPublished,
          name: product.name,
        },
        select: { id: true },
      });

      for (const variant of product.variants) {
        const existing = await tx.productVariant.findUnique({ where: { sku: variant.sku }, select: { productId: true } });
        if (existing !== null && existing.productId !== persisted.id) {
          throw new Error(`SKU ${variant.sku} sudah terikat ke produk lain.`);
        }
        await tx.productVariant.upsert({
          where: { sku: variant.sku },
          create: {
            heightCm: variant.heightCm,
            isActive: variant.isActive,
            lengthCm: variant.lengthCm,
            name: variant.name,
            priceRp: variant.priceRp,
            productId: persisted.id,
            sku: variant.sku,
            stockOnHand: variant.stockOnHand,
            weightGrams: variant.weightGrams,
            widthCm: variant.widthCm,
          },
          update: {
            heightCm: variant.heightCm,
            isActive: variant.isActive,
            lengthCm: variant.lengthCm,
            name: variant.name,
            priceRp: variant.priceRp,
            stockOnHand: variant.stockOnHand,
            weightGrams: variant.weightGrams,
            widthCm: variant.widthCm,
          },
        });
        variantCount += 1;
      }

      for (const media of product.media) {
        await tx.productMedia.upsert({
          where: { productId_sortOrder: { productId: persisted.id, sortOrder: media.sortOrder } },
          create: { altText: media.altText, productId: persisted.id, sortOrder: media.sortOrder, storageKey: media.storageKey },
          update: { altText: media.altText, storageKey: media.storageKey },
        });
        mediaCount += 1;
      }
    }

    return { categories: input.categories.length, media: mediaCount, products: input.products.length, variants: variantCount };
  });
}
