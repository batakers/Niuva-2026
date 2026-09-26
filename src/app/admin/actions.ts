"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/generated/prisma/client";
import type { InquiryStatus } from "@/generated/prisma/client";
import { CatalogService } from "@/modules/catalog/service";
import { CustomPrintService } from "@/modules/custom-print/service";
import { PrivateFileDownloadService } from "@/modules/files/download-service";
import { InquiryService } from "@/modules/inquiry/service";
import { OrderStatusService } from "@/modules/order/status-service";
import { PortfolioService } from "@/modules/portfolio/service";
import { PricingRuleAdminService } from "@/modules/pricing/admin-service";
import { QuoteService } from "@/modules/quote/service";
import { createCustomShippingProviderForRuntime, createPaymentProviderForRuntime } from "@/modules/providers/runtime";
import { ShippingService } from "@/modules/shipping/service";
import { isAppError, toAppError } from "@/modules/shared/errors";

export type AdminActionState = Readonly<{
  link?: string;
  message?: string;
  status: "error" | "idle" | "success";
}>;

export type AdminAction = (
  previousState: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

function revalidateAdminWork(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/queue");
}

const orderStatuses = new Set<OrderStatus>([
  "CANCELLED",
  "COMPLETED",
  "FINISHING_QC",
  "IN_PRODUCTION",
  "PAID",
  "PENDING_PAYMENT",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "SUBMITTED",
  "UNDER_REVIEW",
  "WAITING_FOR_APPROVAL",
  "WAITING_PAYMENT",
  "WAITING_SHIPPING_PAYMENT",
]);
const inquiryStatuses = new Set<InquiryStatus>([
  "CLOSED",
  "CONTACTED",
  "LOST",
  "NEW",
  "QUALIFIED",
  "QUOTED",
  "WON",
]);

export const transitionOrderAction: AdminAction = async (_previous, formData) => {
  const orderId = text(formData, "orderId");
  const nextStatus = text(formData, "nextStatus") as OrderStatus;
  if (!orderId || !orderStatuses.has(nextStatus)) {
    return errorState("Status order tidak valid.");
  }
  try {
    await new OrderStatusService().transition(orderId, nextStatus);
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidateAdminWork();
    return successState("Status order berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const reissueOrderTokenAction: AdminAction = async (_previous, formData) => {
  const orderId = text(formData, "orderId");
  if (!orderId) return errorState("Order tidak ditemukan.");
  try {
    const result = await new OrderStatusService().reissuePublicToken(orderId);
    revalidatePath(`/admin/orders/${orderId}`);
    return successState(
      `Tautan ${result.orderNumber} diterbitkan ulang dengan format route-bound v1.`,
      `/orders/${result.accessToken.token}`,
    );
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const createCustomShippingPaymentAction: AdminAction = async (_previous, formData) => {
  const orderId = text(formData, "orderId");
  if (!orderId) return errorState("Order tidak ditemukan.");

  try {
    const result = await new ShippingService({
      paymentProvider: createPaymentProviderForRuntime(),
      shippingProvider: createCustomShippingProviderForRuntime(),
    }).createCustomShippingPayment(orderId, {
      finalHeightCm: text(formData, "finalHeightCm"),
      finalLengthCm: text(formData, "finalLengthCm"),
      finalWeightGrams: text(formData, "finalWeightGrams"),
      finalWidthCm: text(formData, "finalWidthCm"),
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidateAdminWork();
    return successState(
      "Rate shipping custom dan payment attempt berhasil disiapkan. Tautan provider tersimpan di server.",
      result.payment.redirectUrl,
    );
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const recordShipmentMetadataAction: AdminAction = async (_previous, formData) => {
  const orderId = text(formData, "orderId");
  if (!orderId) return errorState("Order tidak ditemukan.");

  try {
    await new ShippingService().recordShipmentMetadata(orderId, {
      courierCode: text(formData, "courierCode"),
      trackingNumber: text(formData, "trackingNumber"),
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidateAdminWork();
    return successState("Kurir dan nomor resi berhasil dicatat.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const saveCustomShippingAddressAction: AdminAction = async (_previous, formData) => {
  const orderId = text(formData, "orderId");
  if (!orderId) return errorState("Order tidak ditemukan.");

  try {
    await new ShippingService().saveCustomShippingAddress(orderId, {
      addressLine: text(formData, "addressLine"),
      city: text(formData, "city"),
      countryCode: "ID",
      district: text(formData, "district"),
      phone: text(formData, "phone"),
      postalCode: text(formData, "postalCode"),
      province: text(formData, "province"),
      recipientName: text(formData, "recipientName"),
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidateAdminWork();
    return successState("Alamat shipping custom berhasil disimpan.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const downloadPrivateFileAction: AdminAction = async (_previous, formData) => {
  const fileId = text(formData, "fileId");
  const ownerId = text(formData, "ownerId");
  const ownerType = text(formData, "ownerType");
  if (!fileId || !ownerId || !ownerType) {
    return errorState("File privat atau pemilik file tidak ditemukan.");
  }

  try {
    const result = await new PrivateFileDownloadService().createDownload({
      fileId,
      ownerId,
      ownerType,
    });
    return successState(
      `${result.originalName} siap diunduh. Tautan berlaku lima menit.`,
      result.downloadUrl,
    );
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const recordCustomPrintReviewAction: AdminAction = async (_previous, formData) => {
  const requestId = text(formData, "requestId");
  const configurationJson = optionalJsonObject(formData, "configurationJson");
  if (configurationJson.error) return errorState(configurationJson.error);
  try {
    await new CustomPrintService().recordReview({
      configurationJson: configurationJson.value,
      materialCode: text(formData, "materialCode"),
      notes: optionalText(formData, "notes"),
      printDurationSeconds: numberValue(formData, "printDurationSeconds"),
      quantity: numberValue(formData, "quantity"),
      requestId,
      verifiedWeightG: text(formData, "verifiedWeightG"),
    });
    revalidatePath(`/admin/custom-print/${requestId}`);
    revalidatePath("/admin/custom-print");
    revalidateAdminWork();
    return successState("Review slicer berhasil disimpan.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const createQuoteDraftAction: AdminAction = async (_previous, formData) => {
  const requestId = text(formData, "requestId");
  const configurationJson = optionalJsonObject(formData, "configurationJson");
  if (configurationJson.error) return errorState(configurationJson.error);
  try {
    await new QuoteService().createDraft({
      configurationJson: configurationJson.value,
      filamentSource: text(formData, "filamentSource"),
      materialCode: text(formData, "materialCode"),
      pricingRuleVersionId: text(formData, "pricingRuleVersionId"),
      requestId,
    });
    revalidatePath(`/admin/custom-print/${requestId}`);
    revalidatePath("/admin/custom-print");
    revalidateAdminWork();
    return successState("Draft quote berhasil dibuat.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const activatePricingRuleAction: AdminAction = async (_previous, formData) => {
  try {
    const result = await new PricingRuleAdminService().activate({
      confirmation: text(formData, "confirmation"),
      quantitySemantics: text(formData, "quantitySemantics"),
    });
    revalidatePath("/admin/pricing");
    revalidatePath("/admin/custom-print");
    revalidateAdminWork();
    return successState(
      result.idempotent
        ? `Pricing rule ${result.code} v${result.version} sudah aktif; tidak ada perubahan.`
        : `Pricing rule ${result.code} v${result.version} berhasil diaktifkan untuk development (${result.quantitySemantics}).`,
    );
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const sendQuoteAction: AdminAction = async (_previous, formData) => {
  const quoteId = text(formData, "quoteId");
  const requestId = text(formData, "requestId");
  if (!quoteId || !requestId) return errorState("Quote tidak ditemukan.");
  try {
    const result = await new QuoteService().send(quoteId);
    revalidatePath(`/admin/custom-print/${requestId}`);
    revalidatePath("/admin/custom-print");
    revalidateAdminWork();
    return successState("Quote diterbitkan. Bagikan tautan ini secara manual melalui kanal yang disepakati.", `/quote/${result.accessToken.token}`);
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const reissueQuoteTokenAction: AdminAction = async (_previous, formData) => {
  const quoteId = text(formData, "quoteId");
  const requestId = text(formData, "requestId");
  if (!quoteId || !requestId) return errorState("Quote tidak ditemukan.");
  try {
    const result = await new QuoteService().reissuePublicToken(quoteId);
    revalidatePath(`/admin/custom-print/${requestId}`);
    return successState(
      `Tautan ${result.quoteNumber} diterbitkan ulang dengan format route-bound v1.`,
      `/quote/${result.accessToken.token}`,
    );
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const updateProductAction: AdminAction = async (_previous, formData) => {
  const productId = text(formData, "productId");
  if (!productId) return errorState("Produk tidak ditemukan.");
  try {
    await new CatalogService().updateProduct(productId, {
      categoryId: optionalText(formData, "categoryId") || undefined,
      description: text(formData, "description"),
      isPublished: checkbox(formData, "isPublished"),
      name: text(formData, "name"),
      slug: text(formData, "slug"),
    });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    revalidatePath("/");
    return successState("Produk berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const updateVariantAction: AdminAction = async (_previous, formData) => {
  const variantId = text(formData, "variantId");
  const productId = text(formData, "productId");
  if (!variantId || !productId) return errorState("Varian tidak ditemukan.");
  try {
    await new CatalogService().updateVariant(variantId, {
      heightCm: optionalText(formData, "heightCm") || undefined,
      isActive: checkbox(formData, "isActive"),
      lengthCm: optionalText(formData, "lengthCm") || undefined,
      name: text(formData, "name"),
      priceRp: text(formData, "priceRp"),
      sku: text(formData, "sku"),
      weightGrams: text(formData, "weightGrams"),
      widthCm: optionalText(formData, "widthCm") || undefined,
    });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return successState("Varian berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const adjustStockAction: AdminAction = async (_previous, formData) => {
  const variantId = text(formData, "variantId");
  const productId = text(formData, "productId");
  if (!variantId || !productId) return errorState("Varian tidak ditemukan.");
  try {
    await new CatalogService().setStock(variantId, {
      stockOnHand: numberValue(formData, "stockOnHand"),
    });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return successState("Stok berhasil disesuaikan.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const replaceProductMediaAction: AdminAction = async (_previous, formData) => {
  const productId = text(formData, "productId");
  const media = parseMediaJson(formData, "mediaJson");
  if (media.error) return errorState(media.error);
  try {
    await new CatalogService().replaceMedia(productId, { items: media.value });
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/shop");
    return successState("Mapping foto produk berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const updatePortfolioAction: AdminAction = async (_previous, formData) => {
  const projectId = text(formData, "projectId");
  if (!projectId) return errorState("Project tidak ditemukan.");
  try {
    await new PortfolioService().updateProject(projectId, {
      challenge: text(formData, "challenge"),
      clientName: optionalText(formData, "clientName") || null,
      isFeatured: checkbox(formData, "isFeatured"),
      isPublished: checkbox(formData, "isPublished"),
      process: text(formData, "process"),
      result: text(formData, "result"),
      serviceLabel: text(formData, "serviceLabel"),
      slug: text(formData, "slug"),
      summary: text(formData, "summary"),
      title: text(formData, "title"),
    });
    revalidatePath(`/admin/portfolio/${projectId}`);
    revalidatePath("/admin/portfolio");
    revalidatePath("/projects");
    revalidatePath("/");
    return successState("Project portfolio berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const replacePortfolioMediaAction: AdminAction = async (_previous, formData) => {
  const projectId = text(formData, "projectId");
  const media = parseMediaJson(formData, "mediaJson");
  if (media.error) return errorState(media.error);
  try {
    await new PortfolioService().replaceMedia(projectId, { items: media.value });
    revalidatePath(`/admin/portfolio/${projectId}`);
    revalidatePath("/admin/portfolio");
    revalidatePath("/projects");
    revalidatePath("/");
    return successState("Mapping media portfolio berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

export const transitionInquiryAction: AdminAction = async (_previous, formData) => {
  const inquiryId = text(formData, "inquiryId");
  const current = text(formData, "currentStatus");
  const next = text(formData, "nextStatus");
  if (!inquiryId || !inquiryStatuses.has(current as InquiryStatus) || !inquiryStatuses.has(next as InquiryStatus)) return errorState("Status inquiry tidak valid.");
  try {
    await new InquiryService().transitionStatus(inquiryId, current as InquiryStatus, next as InquiryStatus);
    revalidatePath(`/admin/inquiries/${inquiryId}`);
    revalidatePath("/admin/inquiries");
    revalidateAdminWork();
    return successState("Status inquiry berhasil diperbarui.");
  } catch (error) {
    return errorStateFrom(error);
  }
};

function text(formData: FormData, name: string): string {
  return typeof formData.get(name) === "string" ? String(formData.get(name)).trim() : "";
}

function optionalText(formData: FormData, name: string): string | undefined {
  const value = text(formData, name);
  return value === "" ? undefined : value;
}

function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function numberValue(formData: FormData, name: string): number {
  const raw = text(formData, name);
  if (raw === "") return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? value : Number.NaN;
}

function optionalJsonObject(formData: FormData, name: string):
  | { error?: undefined; value?: Record<string, boolean | null | number | string> }
  | { error: string; value?: undefined } {
  const raw = optionalText(formData, name);
  if (raw === undefined) return { value: undefined };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "Konfigurasi harus berupa object JSON." };
    }
    return { value: parsed as Record<string, boolean | null | number | string> };
  } catch {
    return { error: "Konfigurasi JSON tidak valid." };
  }
}

function parseMediaJson(formData: FormData, name: string):
  | { error?: undefined; value: readonly Record<string, string | number>[] }
  | { error: string; value?: undefined } {
  const raw = text(formData, name);
  if (!raw) return { value: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { error: "Mapping media harus berupa array JSON." };
    if (!parsed.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) {
      return { error: "Setiap media harus berupa object JSON." };
    }
    return { value: parsed as readonly Record<string, string | number>[] };
  } catch {
    return { error: "Mapping media JSON tidak valid." };
  }
}

function successState(message: string, link?: string): AdminActionState {
  return { link, message, status: "success" };
}

function errorState(message: string): AdminActionState {
  return { message, status: "error" };
}

function errorStateFrom(error: unknown): AdminActionState {
  const app = toAppError(error);
  if (isAppError(error)) return errorState(app.message);
  return errorState("Operasi belum dapat diselesaikan. Coba lagi.");
}
