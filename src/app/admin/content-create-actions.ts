"use server";

import { revalidatePath } from "next/cache";
import { CatalogService } from "@/modules/catalog/service";
import { PortfolioService } from "@/modules/portfolio/service";
import { toAppErrorLogged } from "@/lib/observability/report";
import { isAppError } from "@/modules/shared/errors";
import type { AdminAction, AdminActionState } from "./actions";

const text = (form: FormData, key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";

function failure(error: unknown): AdminActionState {
  const app = toAppErrorLogged(error, { boundary: "action:admin.content.create" });
  return { status: "error", message: isAppError(error) ? app.message : "Draft belum dapat disimpan. Periksa tautan atau SKU yang mungkin sudah dipakai, lalu coba lagi." };
}

export const createProductDraftAction: AdminAction = async (_previous, form) => {
  try {
    const categoryId = text(form, "categoryId");
    const product = await new CatalogService().createProduct({
      name: text(form, "name"), slug: text(form, "slug"), description: text(form, "description"),
      ...(categoryId ? { categoryId } : {}), isPublished: false,
    });
    revalidatePath("/admin/products");
    return { status: "success", message: "Draft produk tersimpan. Lengkapi varian dan foto melalui editor sebelum dipublikasikan.", link: `/admin/products/${product.id}` };
  } catch (error) { return failure(error); }
};

export const createVariantAction: AdminAction = async (_previous, form) => {
  try {
    const productId = text(form, "productId");
    const stock = text(form, "stockOnHand");
    const dimensions = Object.fromEntries(["lengthCm", "widthCm", "heightCm"].flatMap(key => text(form, key) ? [[key, text(form, key)]] : []));
    await new CatalogService().createVariant({
      productId, name: text(form, "name"), sku: text(form, "sku"), priceRp: text(form, "priceRp"),
      weightGrams: text(form, "weightGrams"), stockOnHand: stock ? Number(stock) : 0,
      isActive: form.get("isActive") === "on", ...dimensions,
    });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/shop/[slug]", "page");
    return { status: "success", message: "Varian dan stok awal tersimpan.", link: `/admin/products/${productId}` };
  } catch (error) { return failure(error); }
};

export const createPortfolioDraftAction: AdminAction = async (_previous, form) => {
  try {
    const project = await new PortfolioService().createProject({
      title: text(form, "title"), slug: text(form, "slug"), summary: text(form, "summary"), serviceLabel: text(form, "serviceLabel"),
    });
    revalidatePath("/admin/portfolio");
    return { status: "success", message: "Draft project tersimpan. Lengkapi bukti dan media melalui editor sebelum dipublikasikan.", link: `/admin/portfolio/${project.id}` };
  } catch (error) { return failure(error); }
};
