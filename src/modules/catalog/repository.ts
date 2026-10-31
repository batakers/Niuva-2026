import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { assertOwnedPublicMedia } from "@/modules/public-media/repository";
import { recordStockMovement, setStockWithinTransaction } from "@/modules/inventory/movement";
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
    /** The variant's own gallery photo, when one is linked. */
    media?: Readonly<{ storageKey: string }> | null;
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
  listActiveCategories?(): Promise<readonly Readonly<{ id: string; name: string }>[]>;
  createProduct(input: CreateProductInput): Promise<Readonly<{ id: string }>>;
  createVariant(input: CreateVariantInput, adminId?: string): Promise<Readonly<{ id: string }>>;
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
    input: Readonly<{ adminId: string; expectedStockOnHand: number; reason: string; stockOnHand: number }>,
  ): Promise<StockMutationResult>;
  updateVariant(
    variantId: string,
    input: UpdateVariantInput,
  ): Promise<Readonly<{ id: string }>>;
}

export class CatalogRepository implements CatalogRepositoryPort {
  async listActiveCategories(): Promise<readonly Readonly<{ id: string; name: string }>[]> {
    return this.prisma.category.findMany({
      where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
  }
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
            media: { select: { storageKey: true } },
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
            media: { select: { storageKey: true } },
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

  async createVariant(input: CreateVariantInput, adminId?: string) {
    return this.prisma.$transaction(async (transaction) => {
      const created = await transaction.productVariant.create({
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
      await recordStockMovement(transaction, {
        adminId,
        balanceBefore: 0,
        balanceAfter: input.stockOnHand,
        kind: "OPENING_BALANCE",
        variantId: created.id,
      });
      if (adminId) {
        await transaction.auditLog.create({
          data: {
            action: "catalog.variant.created",
            actorId: adminId,
            actorType: "ADMIN",
            afterJson: { isActive: input.isActive, productId: input.productId, sku: input.sku, stockOnHand: input.stockOnHand },
            entityId: created.id,
            entityType: "ProductVariant",
          },
        });
      }
      return created;
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

      if (typeof input.mediaId === "string") {
        const media = await transaction.productMedia.findFirst({
          where: { id: input.mediaId, productId: current.product.id },
          select: { id: true },
        });
        if (media === null) {
          throw appError("VALIDATION_ERROR", {
            details: { mediaId: "Foto varian harus berasal dari galeri produk ini." },
          });
        }
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

      await assertOwnedPublicMedia(transaction, { kind: "product", id: productId }, items.map(item => item.storageKey));
      // A photo that stays in the gallery keeps its row (and every variant pointing at it); rows
      // that leave are deleted, which clears those links through ON DELETE SET NULL.
      const wanted = new Set(items.map(item => item.storageKey));
      const existing = await transaction.productMedia.findMany({
        where: { productId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, storageKey: true },
      });
      const kept = new Map<string, string>();
      const dropped: string[] = [];
      for (const row of existing) {
        if (wanted.has(row.storageKey) && !kept.has(row.storageKey)) kept.set(row.storageKey, row.id);
        else dropped.push(row.id);
      }
      if (dropped.length > 0) {
        await transaction.productMedia.deleteMany({ where: { id: { in: dropped } } });
      }
      // Park kept rows on negative positions first so reordering never hits (productId, sortOrder).
      let parked = -1;
      for (const id of kept.values()) {
        await transaction.productMedia.update({ where: { id }, data: { sortOrder: parked } });
        parked -= 1;
      }
      for (const item of items) {
        const id = kept.get(item.storageKey);
        if (id === undefined) {
          await transaction.productMedia.create({
            data: { altText: item.altText, productId, sortOrder: item.sortOrder, storageKey: item.storageKey },
          });
        } else {
          await transaction.productMedia.update({
            where: { id },
            data: { altText: item.altText, sortOrder: item.sortOrder },
          });
        }
      }

      return { productId: product.id, mediaCount: items.length };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateStock(
    variantId: string,
    input: Readonly<{ adminId: string; expectedStockOnHand: number; reason: string; stockOnHand: number }>,
  ): Promise<StockMutationResult> {
    return this.prisma.$transaction((transaction) => setStockWithinTransaction(transaction, {
      ...input,
      auditAction: "catalog.stock.adjusted",
      kind: "MANUAL_ADJUSTMENT",
      variantId,
    }));
  }
}
