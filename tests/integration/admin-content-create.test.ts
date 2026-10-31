import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminAccess } from "@/lib/auth/admin";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: vi.fn() }));

import { requireAdmin } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { CatalogRepository } from "@/modules/catalog/repository";
import { CatalogService } from "@/modules/catalog/service";
import { PortfolioService } from "@/modules/portfolio/service";
import { appError } from "@/modules/shared/errors";
import { createPortfolioDraftAction, createProductDraftAction, createVariantAction } from "@/app/admin/content-create-actions";

const prisma = getPrismaClient();
let access: AdminAccess;
let prefix: string;
const idle = { status: "idle" as const };
function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
async function product() {
  const result = await createProductDraftAction(idle, form({ name: "Fixture produk", slug: `${prefix}-product`, description: "Data pengujian, bukan katalog launch." }));
  expect(result.status).toBe("success");
  return prisma.product.findUniqueOrThrow({ where: { slug: `${prefix}-product` } });
}

beforeEach(async () => {
  prefix = `content-${randomUUID()}`;
  const actor = await prisma.adminAuthUser.create({ data: {
    id: randomUUID(), email: `${prefix}@example.test`, name: "Content Admin Fixture", emailVerified: true,
    profile: { create: { role: "ADMIN", isActive: true } },
  }, include: { profile: true } });
  access = { authUserId: actor.id, profile: actor.profile! };
  vi.mocked(requireAdmin).mockImplementation(async () => access);
});

describe("Dashboard content creation against isolated PostgreSQL", () => {
  it.each(["OWNER", "ADMIN"] as const)("creates an unpublished product as %s despite a forged publication field", async role => {
    access = { ...access, profile: { ...access.profile, role } };
    const category = await prisma.category.create({ data: { name: "Fixture kategori", slug: `${prefix}-category` } });
    const result = await createProductDraftAction(idle, form({ name: "Produk draft", slug: `${prefix}-product`, description: "Deskripsi fixture.", categoryId: category.id, isPublished: "on" }));
    const saved = await prisma.product.findUniqueOrThrow({ where: { slug: `${prefix}-product` } });
    expect(result).toMatchObject({ status: "success", link: `/admin/products/${saved.id}` });
    expect(saved).toMatchObject({ isPublished: false, categoryId: category.id });
    expect(await new CatalogRepository(prisma).findPublishedProductBySlug(saved.slug)).toBeNull();
    expect(await prisma.auditLog.findFirst({ where: { entityId: saved.id, action: "catalog.product.created" } })).toMatchObject({ actorId: access.profile.id });
  });
  it("lists named active categories and omits inactive categories", async () => {
    const active = await prisma.category.create({ data: { name: "Fixture aktif", slug: `${prefix}-active` } });
    const inactive = await prisma.category.create({ data: { name: "Fixture nonaktif", slug: `${prefix}-inactive`, isActive: false } });
    const choices = await new CatalogService().listCategories();
    expect(choices).toContainEqual({ id: active.id, name: active.name });
    expect(choices.some(choice => choice.id === inactive.id)).toBe(false);
  });
  it("creates a variant and one opening balance when a duplicate SKU is attempted", async () => {
    const parent = await product();
    const values = { productId: parent.id, name: "Biru", sku: `${prefix}-sku`, priceRp: "45000", weightGrams: "125.5", stockOnHand: "7", lengthCm: "10.5", widthCm: "8", heightCm: "3", isActive: "on" };
    expect(await createVariantAction(idle, form(values))).toMatchObject({ status: "success" });
    expect(await createVariantAction(idle, form(values))).toMatchObject({ status: "error" });
    const variants = await prisma.productVariant.findMany({ where: { sku: values.sku } });
    expect(variants).toHaveLength(1);
    expect(variants[0]).toMatchObject({ stockOnHand: 7, isActive: true });
    expect(variants[0].priceRp.toString()).toBe("45000");
    expect(variants[0].weightGrams.toString()).toBe("125.5");
    expect(await prisma.stockMovement.findMany({ where: { variantId: variants[0].id } })).toEqual([
      expect.objectContaining({ kind: "OPENING_BALANCE", balanceBefore: 0, balanceAfter: 7, adminId: access.profile.id }),
    ]);
    expect(await prisma.auditLog.count({ where: { entityId: variants[0].id, action: "catalog.variant.created" } })).toBe(1);
  });
  it("rejects invalid money, weight, stock and dimensions before writing a variant", async () => {
    const parent = await product();
    const values = { productId: parent.id, name: "Fixture", sku: `${prefix}-sku`, priceRp: "1000", weightGrams: "20", stockOnHand: "0", isActive: "on" };
    const invalidInputs: Record<string, string>[] = [{ priceRp: "1.5" }, { weightGrams: "-1" }, { stockOnHand: "1.5" }, { stockOnHand: "-1" }, { lengthCm: "NaN" }];
    for (const invalid of invalidInputs) {
      expect(await createVariantAction(idle, form({ ...values, ...invalid }))).toMatchObject({ status: "error" });
    }
    expect(await prisma.productVariant.count({ where: { productId: parent.id } })).toBe(0);
  });
  it("keeps a new portfolio draft unpublished until its evidence is complete", async () => {
    const result = await createPortfolioDraftAction(idle, form({ title: "Fixture project", slug: `${prefix}-project`, summary: "Ringkasan fixture.", serviceLabel: "Desain & Rekayasa", isPublished: "on" }));
    const saved = await prisma.portfolioProject.findUniqueOrThrow({ where: { slug: `${prefix}-project` } });
    expect(result).toMatchObject({ status: "success", link: `/admin/portfolio/${saved.id}` });
    expect(saved).toMatchObject({ isPublished: false, isFeatured: false, publishedAt: null, challenge: "", process: "", result: "" });
    await expect(new PortfolioService().updateProject(saved.id, { isPublished: true })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await prisma.portfolioProject.findUniqueOrThrow({ where: { id: saved.id } })).toMatchObject({ isPublished: false });
    expect(await prisma.auditLog.findFirst({ where: { entityId: saved.id, action: "portfolio.project.created" } })).toMatchObject({ actorId: access.profile.id });
  });
  it("refuses anonymous and inactive actors without creating content", async () => {
    const values = { name: "Denied", slug: `${prefix}-denied`, description: "Denied" };
    vi.mocked(requireAdmin).mockRejectedValueOnce(appError("UNAUTHORIZED"));
    expect(await createProductDraftAction(idle, form(values))).toMatchObject({ status: "error" });
    access = { ...access, profile: { ...access.profile, isActive: false } };
    expect(await createProductDraftAction(idle, form(values))).toMatchObject({ status: "error" });
    expect(await prisma.product.count({ where: { slug: values.slug } })).toBe(0);
    expect(await createPortfolioDraftAction(idle, form({ title: "Denied", slug: `${prefix}-denied-project`, summary: "Denied", serviceLabel: "Desain & Rekayasa" }))).toMatchObject({ status: "error" });
    expect(await prisma.portfolioProject.count({ where: { slug: `${prefix}-denied-project` } })).toBe(0);
  });
});
