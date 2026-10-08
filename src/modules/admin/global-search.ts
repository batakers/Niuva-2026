import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { getAdminNavigation } from "./navigation-items";

const searchSchema = z.string().trim().min(2).max(80);
export type AdminSearchResult = Readonly<{ kind: "MENU" | "ORDER" | "B2B" | "CUSTOM_PRINT" | "PRODUCT" | "PORTFOLIO" | "CUSTOMER" | "INVOICE"; title: string; detail: string; href: string }>;

const menu = [
  { title: "Overview", href: "/admin" },
  { title: "Orders", href: "/admin/orders" },
  { title: "Custom Print", href: "/admin/custom-print" },
  { title: "B2B Inquiries", href: "/admin/inquiries" },
  { title: "Products & Stock", href: "/admin/products" },
  { title: "Portfolio", href: "/admin/portfolio" },
  { title: "Aktivitas", href: "/admin/activity" },
  { title: "Keamanan akun", href: "/admin/security" },
] as const;
const ownerMenu = [
  { title: "Privasi Customer", href: "/admin/privacy" },
  { title: "Admin & Akses", href: "/admin/admins" },
] as const;

export function parseAdminSearchQuery(raw: unknown): string | null {
  const parsed = searchSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export class AdminGlobalSearchService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async search(access: AdminAccess, raw: unknown): Promise<readonly AdminSearchResult[]> {
    if (!access.profile.isActive) throw appError("FORBIDDEN");
    const q = parseAdminSearchQuery(raw);
    if (q === null) throw appError("VALIDATION_ERROR", { message: "Masukkan minimal 2 dan maksimal 80 karakter." });
    const availableMenus = [...new Map([...getAdminNavigation(access).flatMap(group => group.items).map(item => ({ title: item.label, href: item.href })), ...menu, ...(access.profile.role === "OWNER" ? ownerMenu : [])].map(item => [item.href, item])).values()];
    const menus = availableMenus
      .filter(item => item.title.toLocaleLowerCase("id-ID").includes(q.toLocaleLowerCase("id-ID")))
      .map((item): AdminSearchResult => ({ kind: "MENU", title: item.title, detail: "Halaman Admin", href: item.href }));
    const [orders, inquiries, customPrint, products, portfolio, customers, invoices] = await Promise.all([
      this.prisma.order.findMany({ where: { accountClosedAt: null, OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }] }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, orderNumber: true, customerName: true } }),
      this.prisma.b2BInquiry.findMany({ where: { accountClosedAt: null, OR: [{ referenceNumber: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }] }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, referenceNumber: true, name: true, company: true } }),
      this.prisma.customPrintRequest.findMany({ where: { accountClosedAt: null, OR: [{ referenceNumber: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }] }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, referenceNumber: true, customerName: true } }),
      this.prisma.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, name: true, slug: true } }),
      this.prisma.portfolioProject.findMany({ where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, title: true, serviceLabel: true } }),
      this.prisma.customer.findMany({ where: { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, displayName: true } }),
      this.prisma.invoice.findMany({ where: { billingCase: { accountClosedAt: null }, OR: [{ number: { contains: q, mode: "insensitive" } }, { billingCase: { order: { accountClosedAt: null, orderNumber: { contains: q, mode: "insensitive" } } } }, { billingCase: { inquiry: { accountClosedAt: null, referenceNumber: { contains: q, mode: "insensitive" } } } }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5, select: { id: true, number: true, state: true } }),
    ]);
    return [
      ...menus,
      ...invoices.map((item): AdminSearchResult => ({ kind: "INVOICE", title: item.number ?? "Draft invoice", detail: "Dokumen tagihan", href: `/admin/finance/invoices/${item.id}` })),
      ...orders.map((item): AdminSearchResult => ({ kind: "ORDER", title: item.orderNumber, detail: item.customerName, href: `/admin/orders/${item.id}` })),
      ...inquiries.map((item): AdminSearchResult => ({ kind: "B2B", title: item.referenceNumber, detail: item.company ? `${item.name} · ${item.company}` : item.name, href: `/admin/inquiries/${item.id}` })),
      ...customPrint.map((item): AdminSearchResult => ({ kind: "CUSTOM_PRINT", title: item.referenceNumber, detail: item.customerName, href: `/admin/custom-print/${item.id}` })),
      ...products.map((item): AdminSearchResult => ({ kind: "PRODUCT", title: item.name, detail: `Produk · ${item.slug}`, href: `/admin/products/${item.id}` })),
      ...portfolio.map((item): AdminSearchResult => ({ kind: "PORTFOLIO", title: item.title, detail: item.serviceLabel, href: `/admin/portfolio/${item.id}` })),
      ...customers.map((item): AdminSearchResult => ({ kind: "CUSTOMER", title: item.displayName ?? "Customer", detail: "Riwayat customer", href: `/admin/customers/${item.id}` })),
    ];
  }
}
