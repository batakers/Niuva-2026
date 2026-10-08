import { z } from "zod";
import { CustomPrintRequestStatus, InquiryStatus, OrderStatus, OrderType } from "@/generated/prisma/enums";

export type AdminSearchArea = "inquiries" | "custom-print" | "orders" | "products" | "portfolio";
export type AdminListQuery = Readonly<{ page: number; q?: string; status?: string; type?: "RETAIL" | "CUSTOM_PRINT"; publication?: "published" | "draft"; view?: "needs-action" | "issues" }>;
export const adminStatusOptions: Readonly<Partial<Record<AdminSearchArea, readonly string[]>>> = {
  inquiries: Object.values(InquiryStatus), "custom-print": Object.values(CustomPrintRequestStatus), orders: Object.values(OrderStatus),
};

export function parseAdminListQuery(area: AdminSearchArea, raw: Readonly<Record<string, unknown>>): AdminListQuery {
  const numericPage = typeof raw.page === "string" && /^\d+$/.test(raw.page) ? Number(raw.page) : raw.page;
  const parsedPage = z.number().int().positive().safeParse(numericPage);
  const query: { page: number; q?: string; status?: string; type?: "RETAIL" | "CUSTOM_PRINT"; publication?: "published" | "draft"; view?: "needs-action" | "issues" } = { page: parsedPage.success ? Math.min(parsedPage.data, 100_000) : 1 };
  const q = z.string().trim().min(1).max(100).refine(value => !/[\u0000-\u001f\u007f]/.test(value)).safeParse(raw.q);
  if (q.success) query.q = q.data;
  const statusSchema = area === "inquiries" ? z.enum(InquiryStatus) : area === "custom-print" ? z.enum(CustomPrintRequestStatus) : area === "orders" ? z.enum(OrderStatus) : null;
  const status = statusSchema?.safeParse(raw.status);
  if (status?.success) query.status = status.data;
  if (["orders", "inquiries", "custom-print"].includes(area)) {
    const view = z.enum(["needs-action", "issues"]).safeParse(raw.view);
    if (view.success) query.view = view.data;
  }
  if (area === "orders") {
    const type = z.enum(OrderType).safeParse(raw.type);
    if (type.success) query.type = type.data;
  }
  if (area === "products" || area === "portfolio") {
    const publication = z.enum(["published", "draft"]).safeParse(raw.publication);
    if (publication.success) query.publication = publication.data;
  }
  return query;
}

export function adminListQueryParams(query: AdminListQuery): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(query).filter(([key, value]) => key !== "page" && typeof value === "string")) as Record<string, string>;
}

export function adminStatusLabel(value: string): string {
  return value.toLowerCase().split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
