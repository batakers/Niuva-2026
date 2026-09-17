import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { lockVariant } from "@/modules/inventory/repository";
import { appError } from "@/modules/shared/errors";

import type {
  CreateProductInput,
  CreateVariantInput,
  ReplaceProductMediaInput,
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

export type AdminProductPublishCheck = Readonly<{
  mediaCount: number;
  activeVariantCount: number;
}>;

export interface CatalogRepositoryPort {
  createProduct(input: CreateProductInput): Promise<Readonly<{ id: string }>>;
  createVariant(input: CreateVariantInput): Promise<Readonly<{ id: string }>>;
  findPublishedProductBySlug(slug: string): Promise<PublicCatalogProduct | null>;
  findPublishedProducts(): Promise<readonly PublicCatalogProduct[]>;
  findAdminProductForPublish?(productId: string): Promise<AdminProductPublishCheck | null>;
  findPurchasableVariantBySku(sku: string): Promise<unknown | null>;
  replaceMedia?(
    productId: string,
    items: ReplaceProductMediaInput["items"],
  ): Promise<Readonly<{ productId: string; mediaCount: number }>>;
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
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.product.findUnique({
        where: { id: productId },
        select: {
          _count: { select: { media: true } },
          id: true,
          isPublished: true,
          variants: { where: { isActive: true }, select: { id: true } },
        },
      });

      if (current === null) {
        throw appError("NOT_FOUND");
      }

      const isPublished = input.isPublished ?? current.isPublished;
      if (isPublished && (current._count.media === 0 || current.variants.length === 0)) {
        throw appError("VALIDATION_ERROR", {
          details: { publish: "Produk publish harus memiliki foto dan minimal satu varian aktif." },
        });
      }

      return transaction.product.update({
        where: { id: productId },
        data: input,
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.productVariant.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          isActive: true,
          product: { select: { id: true, isPublished: true } },
        },
      });

      if (current === null) {
        throw appError("NOT_FOUND");
      }

      const isActive = input.isActive ?? current.isActive;
      if (current.product.isPublished && current.isActive && !isActive) {
        const activeVariantCount = await transaction.productVariant.count({
          where: { isActive: true, productId: current.product.id },
        });
        if (activeVariantCount <= 1) {
          throw appError("VALIDATION_ERROR", {
            details: { isActive: "Produk publish harus memiliki minimal satu varian aktif." },
          });
        }
      }

      return transaction.productVariant.update({
        where: { id: variantId },
        data: input,
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAdminProductForPublish(
    productId: string,
  ): Promise<AdminProductPublishCheck | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        _count: { select: { media: true } },
        variants: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (product === null) return null;
    return {
      activeVariantCount: product.variants.length,
      mediaCount: product._count.media,
    };
  }

  async replaceMedia(
    productId: string,
    items: ReplaceProductMediaInput["items"],
  ): Promise<Readonly<{ productId: string; mediaCount: number }>> {
    return this.prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findUnique({
        where: { id: productId },
        select: { id: true, isPublished: true },
      });

      if (product === null) {
        throw appError("NOT_FOUND");
      }

      if (product.isPublished && items.length === 0) {
        throw appError("VALIDATION_ERROR", {
          details: { items: "Produk publish harus memiliki minimal satu foto." },
        });
      }

      await transaction.productMedia.deleteMany({ where: { productId } });
      if (items.length > 0) {
        await transaction.productMedia.createMany({
          data: items.map((item) => ({
            altText: item.altText,
            productId,
            sortOrder: item.sortOrder,
            storageKey: item.storageKey,
          })),
        });
      }

      return { productId: product.id, mediaCount: items.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
