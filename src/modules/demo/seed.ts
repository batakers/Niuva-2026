import type { PrismaClient } from "@/generated/prisma/client";

export const LOCAL_DEMO_CATEGORY_SLUG = "local-demo-ready-made";
export const LOCAL_DEMO_PRODUCT_SLUG = "local-demo-desk-organizer";
export const LOCAL_DEMO_VARIANT_SKU = "LOCAL-DEMO-DESK-ORGANIZER-GREY";

export type LocalDemoSeedResult = Readonly<{
  categoryId: string;
  productId: string;
  variantId: string;
}>;

/**
 * Idempotent commerce fixture for a disposable loopback database. It only
 * upserts records owned by the local-demo namespace and never clears or
 * changes unrelated catalog, order, or inquiry records.
 */
export async function seedLocalDemoCatalog(
  prisma: PrismaClient,
): Promise<LocalDemoSeedResult> {
  return prisma.$transaction(async (tx) => {
    const category = await tx.category.upsert({
      where: { slug: LOCAL_DEMO_CATEGORY_SLUG },
      create: {
        name: "Demo lokal",
        slug: LOCAL_DEMO_CATEGORY_SLUG,
        sortOrder: 9_900,
      },
      update: {
        isActive: true,
        name: "Demo lokal",
        sortOrder: 9_900,
      },
      select: { id: true },
    });
    const product = await tx.product.upsert({
      where: { slug: LOCAL_DEMO_PRODUCT_SLUG },
      create: {
        categoryId: category.id,
        description:
          "Fixture lokal untuk memeriksa alur katalog, cart, checkout, dan reservasi tanpa provider eksternal.",
        isPublished: true,
        name: "Desk Organizer Demo",
        slug: LOCAL_DEMO_PRODUCT_SLUG,
      },
      update: {
        categoryId: category.id,
        description:
          "Fixture lokal untuk memeriksa alur katalog, cart, checkout, dan reservasi tanpa provider eksternal.",
        isPublished: true,
        name: "Desk Organizer Demo",
      },
      select: { id: true },
    });
    const variant = await tx.productVariant.upsert({
      where: { sku: LOCAL_DEMO_VARIANT_SKU },
      create: {
        heightCm: "5",
        isActive: true,
        lengthCm: "18",
        name: "Abu-abu · Demo",
        priceRp: "185000",
        productId: product.id,
        sku: LOCAL_DEMO_VARIANT_SKU,
        stockOnHand: 100,
        weightGrams: "650",
        widthCm: "12",
      },
      update: {
        heightCm: "5",
        isActive: true,
        lengthCm: "18",
        name: "Abu-abu · Demo",
        priceRp: "185000",
        productId: product.id,
        stockOnHand: 100,
        weightGrams: "650",
        widthCm: "12",
      },
      select: { id: true },
    });

    return {
      categoryId: category.id,
      productId: product.id,
      variantId: variant.id,
    };
  });
}
