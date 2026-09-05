import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { lockVariant } from "@/modules/inventory/repository";
import { appError } from "@/modules/shared/errors";

import type {
  CreateProductInput,
  CreateVariantInput,
  UpdateProductInput,
  UpdateVariantInput,
} from "./schema";

export type PublicCatalogProduct = Readonly<{
  category: Readonly<{ name: string; slug: string }> | null;
  description: string;
  id: string;
  media: readonly Readonly<{
    altText: string;
    sortOrder: number;
    storageKey: string;
  }>[];
  name: string;
  slug: string;
  variants: readonly Readonly<{
    id: string;
    name: string;
    priceRp: Prisma.Decimal;
    sku: string;
    stockOnHand: number;
    weightGrams: Prisma.Decimal;
  }>[];
}>;

export type StockMutationResult = Readonly<{
  id: string;
  previousStockOnHand: number;
  stockOnHand: number;
}>;

export interface CatalogRepositoryPort {
  createProduct(input: CreateProductInput): Promise<Readonly<{ id: string }>>;
  createVariant(input: CreateVariantInput): Promise<Readonly<{ id: string }>>;
  findPublishedProductBySlug(slug: string): Promise<PublicCatalogProduct | null>;
  findPublishedProducts(): Promise<readonly PublicCatalogProduct[]>;
  findPurchasableVariantBySku(sku: string): Promise<unknown | null>;
  updateProduct(
    productId: string,
    input: UpdateProductInput,
  ): Promise<Readonly<{ id: string }>>;
  updateStock(
    variantId: string,
    stockOnHand: number,
  ): Promise<StockMutationResult>;
  updateVariant(
    variantId: string,
    input: UpdateVariantInput,
  ): Promise<Readonly<{ id: string }>>;
}

export class CatalogRepository implements CatalogRepositoryPort {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findPublishedProducts(): Promise<readonly PublicCatalogProduct[]> {
    return this.prisma.product.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        category: { select: { name: true, slug: true } },
        description: true,
        id: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: { altText: true, sortOrder: true, storageKey: true },
        },
        name: true,
        slug: true,
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            priceRp: true,
            sku: true,
            stockOnHand: true,
            weightGrams: true,
          },
        },
      },
    });
  }

  async findPublishedProductBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: {
        isPublished: true,
        slug,
      },
      select: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        description: true,
        id: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: {
            altText: true,
            sortOrder: true,
            storageKey: true,
          },
        },
        name: true,
        slug: true,
        variants: {
          where: {
            isActive: true,
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            priceRp: true,
            sku: true,
            stockOnHand: true,
            weightGrams: true,
          },
        },
      },
    });
  }

  async findPurchasableVariantBySku(sku: string) {
    return this.prisma.productVariant.findFirst({
      where: {
        isActive: true,
        sku,
        stockOnHand: { gt: 0 },
        product: { isPublished: true },
      },
      select: {
        id: true,
        priceRp: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        sku: true,
        stockOnHand: true,
      },
    });
  }

  async createProduct(input: CreateProductInput) {
    return this.prisma.product.create({
      data: {
        categoryId: input.categoryId,
        description: input.description,
        isPublished: input.isPublished,
        name: input.name,
        slug: input.slug,
      },
      select: { id: true },
    });
  }

  async updateProduct(productId: string, input: UpdateProductInput) {
    return this.prisma.product.update({
      where: { id: productId },
      data: input,
      select: { id: true },
    });
  }

  async createVariant(input: CreateVariantInput) {
    return this.prisma.productVariant.create({
      data: {
        heightCm: input.heightCm,
        isActive: input.isActive,
        lengthCm: input.lengthCm,
        name: input.name,
        priceRp: input.priceRp,
        productId: input.productId,
        sku: input.sku,
        stockOnHand: input.stockOnHand,
        weightGrams: input.weightGrams,
        widthCm: input.widthCm,
      },
      select: { id: true },
    });
  }

  async updateVariant(variantId: string, input: UpdateVariantInput) {
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: input,
      select: { id: true },
    });
  }

  async updateStock(
    variantId: string,
    stockOnHand: number,
  ): Promise<StockMutationResult> {
    if (!Number.isSafeInteger(stockOnHand) || stockOnHand < 0) {
      throw appError("VALIDATION_ERROR", {
        details: { stockOnHand: "Stok harus bilangan bulat nonnegatif." },
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      const current = await lockVariant(transaction, variantId);
      const reserved = await transaction.stockReservation.aggregate({
        where: {
          expiresAt: { gt: new Date() },
          status: "ACTIVE",
          variantId,
        },
        _sum: { quantity: true },
      });

      if (stockOnHand < (reserved._sum.quantity ?? 0)) {
        throw appError("CONFLICT", {
          message: "Stok fisik tidak boleh lebih kecil dari reservasi aktif.",
        });
      }

      const updated = await transaction.productVariant.update({
        where: { id: variantId },
        data: { stockOnHand },
        select: { id: true, stockOnHand: true },
      });

      return {
        id: updated.id,
        previousStockOnHand: current.stockOnHand,
        stockOnHand: updated.stockOnHand,
      };
    });
  }
}
