import "server-only";
import type { PrismaClient, Prisma, OrderStatus, CustomPrintRequestStatus, InquiryStatus } from "@/generated/prisma/client";
import { isModelExtension } from "@/modules/custom-print/file-types";
import type { AdminOrderRow, AdminCustomPrintRequestRow, AdminInquiryRow, AdminLinkedOrder, AdminLinkedRequest, AdminProductRow, AdminPortfolioRow } from "./operations";
import type { AdminListQuery } from "./list-query";

const ADMIN_PAGE_SIZE = 50;
export type AdminReadPage<T> = Readonly<{ items: readonly T[]; hasNext: boolean; filteredTotal: number }>;
export interface AdminOperationsReadRepository {
  listPortfolio(query: AdminListQuery): Promise<AdminReadPage<AdminPortfolioRow>>;
  listProducts(query: AdminListQuery): Promise<AdminReadPage<AdminProductRow>>;
  getCustomPrintLinkedOrders(requestId: string): Promise<readonly AdminLinkedOrder[]>;
  getOrderSourceRequests(orderId: string): Promise<readonly AdminLinkedRequest[]>;
  listOrders(query: AdminListQuery): Promise<AdminReadPage<AdminOrderRow>>;
  listCustomPrintRequests(query: AdminListQuery): Promise<AdminReadPage<AdminCustomPrintRequestRow>>;
  listInquiries(query: AdminListQuery): Promise<AdminReadPage<AdminInquiryRow>>;
}

export class PrismaAdminOperationsReadRepository implements AdminOperationsReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCustomPrintLinkedOrders(requestId: string): Promise<readonly AdminLinkedOrder[]> {
    return this.prisma.order.findMany({ where: { orderType: "CUSTOM_PRINT", items: { some: { customQuote: { requestId } } } }, select: { id: true, orderNumber: true, status: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  }

  async getOrderSourceRequests(orderId: string): Promise<readonly AdminLinkedRequest[]> {
    return this.prisma.customPrintRequest.findMany({ where: { quotes: { some: { orderItems: { some: { orderId } } } } }, select: { id: true, referenceNumber: true, status: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  }

  async listOrders(query: AdminListQuery): Promise<AdminReadPage<AdminOrderRow>> {
    const page = query.page;
    const where: Prisma.OrderWhereInput = { ...(query.q ? { orderNumber: { contains: query.q, mode: "insensitive" } } : {}), ...(query.status ? { status: query.status as OrderStatus } : {}), ...(query.type ? { orderType: query.type } : {}) };
    const [rows, filteredTotal] = await Promise.all([
      this.prisma.order.findMany({
      where,
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
    }), this.prisma.order.count({ where })]);
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      filteredTotal,
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
    };
  }

  async listCustomPrintRequests(query: AdminListQuery): Promise<AdminReadPage<AdminCustomPrintRequestRow>> {
    const page = query.page;
    const where: Prisma.CustomPrintRequestWhereInput = { ...(query.q ? { referenceNumber: { contains: query.q, mode: "insensitive" } } : {}), ...(query.status ? { status: query.status as CustomPrintRequestStatus } : {}) };
    const [rows, filteredTotal] = await Promise.all([
      this.prisma.customPrintRequest.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        createdAt: true,
        customerEmail: true,
        customerName: true,
        files: { select: { file: { select: { extension: true, uploadStatus: true } } } },
        id: true,
        intakeMode: true,
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
    }), this.prisma.customPrintRequest.count({ where })]);
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      filteredTotal,
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows.map((row) => ({
        createdAt: row.createdAt,
        customerEmail: row.customerEmail,
        customerName: row.customerName,
        fileCount: row.files.length,
        id: row.id,
        intakeMode: row.intakeMode,
        modelReady: row.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension)),
        latestQuote: row.quotes[0] ?? null,
        materialRequested: row.materialRequested,
        quantity: row.quantity,
        referenceNumber: row.referenceNumber,
        status: row.status,
        updatedAt: row.updatedAt,
      })),
    };
  }

  async listInquiries(query: AdminListQuery): Promise<AdminReadPage<AdminInquiryRow>> {
    const page = query.page;
    const where: Prisma.B2BInquiryWhereInput = { ...(query.q ? { referenceNumber: { contains: query.q, mode: "insensitive" } } : {}), ...(query.status ? { status: query.status as InquiryStatus } : {}) };
    const [rows, filteredTotal] = await Promise.all([
      this.prisma.b2BInquiry.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        company: true,
        createdAt: true,
        currentStage: true,
        email: true,
        id: true,
        name: true,
        referenceNumber: true,
        status: true,
        targetDeadline: true,
        updatedAt: true,
      },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE + 1,
    }), this.prisma.b2BInquiry.count({ where })]);
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      filteredTotal,
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows,
    };
  }

  async listProducts(query: AdminListQuery): Promise<AdminReadPage<AdminProductRow>> {
    const page = query.page;
    const where: Prisma.ProductWhereInput = { ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { slug: { contains: query.q, mode: "insensitive" } }] } : {}), ...(query.publication ? { isPublished: query.publication === "published" } : {}) };
    const [rows, filteredTotal] = await Promise.all([
      this.prisma.product.findMany({
      where,
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
    }), this.prisma.product.count({ where })]);
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      filteredTotal,
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
    };
  }

  async listPortfolio(query: AdminListQuery): Promise<AdminReadPage<AdminPortfolioRow>> {
    const page = query.page;
    const where: Prisma.PortfolioProjectWhereInput = { ...(query.q ? { OR: [{ title: { contains: query.q, mode: "insensitive" } }, { slug: { contains: query.q, mode: "insensitive" } }] } : {}), ...(query.publication ? { isPublished: query.publication === "published" } : {}) };
    const [rows, filteredTotal] = await Promise.all([
      this.prisma.portfolioProject.findMany({
      where,
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
    }), this.prisma.portfolioProject.count({ where })]);
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      filteredTotal,
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
    };
  }
}
