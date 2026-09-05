import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";

import {
  CatalogRepository,
  type CatalogRepositoryPort,
  type StockMutationResult,
} from "./repository";
import {
  createProductSchema,
  createVariantSchema,
  updateProductSchema,
  updateStockSchema,
  updateVariantSchema,
  type CreateProductInput,
  type CreateVariantInput,
  type UpdateProductInput,
  type UpdateStockInput,
  type UpdateVariantInput,
} from "./schema";
import { parseWithValidation } from "@/modules/shared/validation";
import { requireAdminPermission } from "@/modules/admin/permissions";

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type CatalogServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  repository?: CatalogRepositoryPort;
}>;

export class CatalogService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly repositoryFactory: () => CatalogRepositoryPort;

  constructor(dependencies: CatalogServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.repositoryFactory = () =>
      dependencies.repository ?? new CatalogRepository();
  }

  async listPublicProducts() {
    return this.repositoryFactory().findPublishedProducts();
  }

  async getPublicProduct(slug: string) {
    return this.repositoryFactory().findPublishedProductBySlug(slug);
  }

  async createProduct(input: unknown) {
    const parsed = parseWithValidation(createProductSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "CATALOG_WRITE");
    const created = await this.repositoryFactory().createProduct(parsed);

    await recordAudit(this.audit, {
      action: "catalog.product.created",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { isPublished: parsed.isPublished, slug: parsed.slug },
      entityId: created.id,
      entityType: "Product",
    });

    return created;
  }

  async updateProduct(productId: string, input: unknown) {
    const parsed = parseWithValidation(updateProductSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "CATALOG_WRITE");
    const updated = await this.repositoryFactory().updateProduct(productId, parsed);

    await recordAudit(this.audit, {
      action: "catalog.product.updated",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: safeJson(parsed),
      entityId: updated.id,
      entityType: "Product",
    });

    return updated;
  }

  async createVariant(input: unknown) {
    const parsed = parseWithValidation(createVariantSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "CATALOG_WRITE");
    const created = await this.repositoryFactory().createVariant(parsed);

    await recordAudit(this.audit, {
      action: "catalog.variant.created",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: {
        isActive: parsed.isActive,
        productId: parsed.productId,
        sku: parsed.sku,
      },
      entityId: created.id,
      entityType: "ProductVariant",
    });

    return created;
  }

  async updateVariant(variantId: string, input: unknown) {
    const parsed = parseWithValidation(updateVariantSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "CATALOG_WRITE");
    const updated = await this.repositoryFactory().updateVariant(variantId, parsed);

    await recordAudit(this.audit, {
      action: "catalog.variant.updated",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: safeJson(parsed),
      entityId: updated.id,
      entityType: "ProductVariant",
    });

    return updated;
  }

  async setStock(variantId: string, input: unknown): Promise<StockMutationResult> {
    const parsed: UpdateStockInput = parseWithValidation(updateStockSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "INVENTORY_ADJUST");
    const updated = await this.repositoryFactory().updateStock(
      variantId,
      parsed.stockOnHand,
    );

    await recordAudit(this.audit, {
      action: "catalog.stock.adjusted",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { stockOnHand: updated.stockOnHand },
      beforeJson: { stockOnHand: updated.previousStockOnHand },
      entityId: updated.id,
      entityType: "ProductVariant",
    });

    return updated;
  }
}

function safeJson(
  value: CreateProductInput | CreateVariantInput | UpdateProductInput | UpdateVariantInput,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item === undefined ? null : item,
    ]),
  ) as Record<string, string | number | boolean | null>;
}
