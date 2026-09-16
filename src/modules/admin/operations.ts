import "server-only";

import type { AdminRole, PrismaClient } from "@/generated/prisma/client";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission, type AdminPermission } from "./permissions";

export type AdminOrderRow = Readonly<{
  createdAt: Date;
  customerEmail: string;
  customerName: string;
  grandTotalRp: string;
  id: string;
  orderNumber: string;
  orderType: "RETAIL" | "CUSTOM_PRINT";
  paymentStatus: string | null;
  shipmentStatus: string | null;
  status: string;
  updatedAt: Date;
}>;

export type AdminCustomPrintRequestRow = Readonly<{
  createdAt: Date;
  customerEmail: string;
  customerName: string;
  fileCount: number;
  id: string;
  latestQuote: Readonly<{
    quoteNumber: string;
    status: string;
    version: number;
  }> | null;
  materialRequested: string;
  quantity: number;
  referenceNumber: string;
  status: string;
  updatedAt: Date;
}>;

export type AdminProductRow = Readonly<{
  category: Readonly<{ name: string; slug: string }> | null;
  description: string;
  id: string;
  isPublished: boolean;
  mediaCount: number;
  name: string;
  slug: string;
  variants: readonly Readonly<{
    id: string;
    isActive: boolean;
    name: string;
    priceRp: string;
    sku: string;
    stockOnHand: number;
  }>[];
}>;

export type AdminPortfolioRow = Readonly<{
  clientName: string | null;
  id: string;
  isFeatured: boolean;
  isPublished: boolean;
  mediaCount: number;
  serviceLabel: string;
  slug: string;
  summary: string;
  title: string;
  updatedAt: Date;
}>;

export type AdminOperationsResult<T> = Readonly<{
  generatedAt: Date;
  hasNext: boolean;
  items: readonly T[];
  page: number;
  role: AdminRole;
}>;

export type AdminListInput = Readonly<{ page?: number }>;

export const ADMIN_PAGE_SIZE = 50;

export function parseAdminPage(value: string | undefined): number {
  if (value === undefined || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 100_000);
}

type AdminOperationsDependencies = Readonly<{
  authorize?: () => Promise<AdminAccess>;
  now?: () => Date;
  prisma?: PrismaClient;
}>;

export class AdminOperationsService {
  private readonly authorize: () => Promise<AdminAccess>;
  private readonly now: () => Date;
  private readonly prisma: PrismaClient;

  constructor(dependencies: AdminOperationsDependencies = {}) {
    this.authorize = dependencies.authorize ?? requireAdmin;
    this.now = dependencies.now ?? (() => new Date());
    this.prisma = dependencies.prisma ?? getPrismaClient();
  }

  async listOrders(input: AdminListInput = {}): Promise<AdminOperationsResult<AdminOrderRow>> {
    const access = await this.authorizeWith("ORDER_FULFILL");
    const page = normalizePage(input.page);
    const rows = await this.prisma.order.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        createdAt: true,
        customerEmail: true,
        customerName: true,
        grandTotalRp: true,
        id: true,
        orderNumber: true,
        orderType: true,
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
          select: { status: true },
          take: 1,
        },
        shipments: {
          orderBy: { updatedAt: "desc" },
          select: { status: true },
          take: 1,
        },
        status: true,
        updatedAt: true,
      },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE + 1,
    });
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      generatedAt: this.now(),
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows.map((row) => ({
        createdAt: row.createdAt,
        customerEmail: row.customerEmail,
        customerName: row.customerName,
        grandTotalRp: row.grandTotalRp.toString(),
        id: row.id,
        orderNumber: row.orderNumber,
        orderType: row.orderType,
        paymentStatus: row.paymentAttempts[0]?.status ?? null,
        shipmentStatus: row.shipments[0]?.status ?? null,
        status: row.status,
        updatedAt: row.updatedAt,
      })),
      page,
      role: access.profile.role,
    };
  }

  async listCustomPrintRequests(input: AdminListInput = {}): Promise<AdminOperationsResult<AdminCustomPrintRequestRow>> {
    const access = await this.authorizeWith("CUSTOM_PRINT_REVIEW");
    const page = normalizePage(input.page);
    const rows = await this.prisma.customPrintRequest.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        createdAt: true,
        customerEmail: true,
        customerName: true,
        files: { select: { fileId: true } },
        id: true,
        materialRequested: true,
        quantity: true,
        quotes: {
          orderBy: { version: "desc" },
          select: { quoteNumber: true, status: true, version: true },
          take: 1,
        },
        referenceNumber: true,
        status: true,
        updatedAt: true,
      },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE + 1,
    });
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      generatedAt: this.now(),
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows.map((row) => ({
        createdAt: row.createdAt,
        customerEmail: row.customerEmail,
        customerName: row.customerName,
        fileCount: row.files.length,
        id: row.id,
        latestQuote: row.quotes[0] ?? null,
        materialRequested: row.materialRequested,
        quantity: row.quantity,
        referenceNumber: row.referenceNumber,
        status: row.status,
        updatedAt: row.updatedAt,
      })),
      page,
      role: access.profile.role,
    };
  }

  async listProducts(input: AdminListInput = {}): Promise<AdminOperationsResult<AdminProductRow>> {
    const access = await this.authorizeWith("CATALOG_WRITE");
    const page = normalizePage(input.page);
    const rows = await this.prisma.product.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        category: { select: { name: true, slug: true } },
        description: true,
        id: true,
        isPublished: true,
        media: { select: { id: true } },
        name: true,
        slug: true,
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            isActive: true,
            name: true,
            priceRp: true,
            sku: true,
            stockOnHand: true,
          },
        },
      },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE + 1,
    });
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      generatedAt: this.now(),
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows.map((row) => ({
        category: row.category,
        description: row.description,
        id: row.id,
        isPublished: row.isPublished,
        mediaCount: row.media.length,
        name: row.name,
        slug: row.slug,
        variants: row.variants.map((variant) => ({
          id: variant.id,
          isActive: variant.isActive,
          name: variant.name,
          priceRp: variant.priceRp.toString(),
          sku: variant.sku,
          stockOnHand: variant.stockOnHand,
        })),
      })),
      page,
      role: access.profile.role,
    };
  }

  async listPortfolio(input: AdminListInput = {}): Promise<AdminOperationsResult<AdminPortfolioRow>> {
    const access = await this.authorizeWith("PORTFOLIO_WRITE");
    const page = normalizePage(input.page);
    const rows = await this.prisma.portfolioProject.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        clientName: true,
        id: true,
        isFeatured: true,
        isPublished: true,
        media: { select: { id: true } },
        serviceLabel: true,
        slug: true,
        summary: true,
        title: true,
        updatedAt: true,
      },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE + 1,
    });
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      generatedAt: this.now(),
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows.map((row) => ({
        clientName: row.clientName,
        id: row.id,
        isFeatured: row.isFeatured,
        isPublished: row.isPublished,
        mediaCount: row.media.length,
        serviceLabel: row.serviceLabel,
        slug: row.slug,
        summary: row.summary,
        title: row.title,
        updatedAt: row.updatedAt,
      })),
      page,
      role: access.profile.role,
    };
  }

  private async authorizeWith(permission: AdminPermission): Promise<AdminAccess> {
    const access = await this.authorize();
    return requireAdminPermission(access, permission);
  }
}

function normalizePage(value: number | undefined): number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 1) return 1;
  return Math.min(value, 100_000);
}
