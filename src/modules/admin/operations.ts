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

export type AdminInquiryRow = Readonly<{
  company: string | null;
  createdAt: Date;
  currentStage: string;
  email: string;
  id: string;
  name: string;
  referenceNumber: string;
  status: string;
  targetDeadline: Date | null;
  updatedAt: Date;
}>;

export type AdminPricingRuleRow = Readonly<{
  approvedAt: Date | null;
  approvedBy: string | null;
  code: string;
  createdAt: Date;
  definitionJson: unknown;
  id: string;
  status: string;
  updatedAt: Date;
  version: number;
}>;

export type AdminOrderDetail = Readonly<{
  address: Readonly<{
    addressLine: string;
    city: string;
    countryCode: string;
    district: string | null;
    phone: string;
    postalCode: string;
    province: string;
    recipientName: string;
  }> | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  grandTotalRp: string;
  id: string;
  items: readonly Readonly<{
    configurationJson: unknown;
    itemType: string;
    lineTotalRp: string;
    nameSnapshot: string;
    quantity: number;
    skuSnapshot: string | null;
  }>[];
  itemsSubtotalRp: string;
  orderNumber: string;
  orderType: "RETAIL" | "CUSTOM_PRINT";
  paidAt: Date | null;
  paymentAttempts: readonly Readonly<{
    amountRp: string;
    createdAt: Date;
    expiresAt: Date;
    id: string;
    providerOrderId: string;
    purpose: string;
    settledAt: Date | null;
    status: string;
  }>[];
  reservations: readonly Readonly<{
    expiresAt: Date;
    id: string;
    quantity: number;
    status: string;
    variantId: string;
  }>[];
  shipments: readonly Readonly<{
    courierCode: string | null;
    finalHeightCm: string | null;
    finalLengthCm: string | null;
    finalWeightGrams: string | null;
    finalWidthCm: string | null;
    id: string;
    serviceCode: string | null;
    shippingAmountRp: string | null;
    status: string;
    trackingNumber: string | null;
    updatedAt: Date;
  }>[];
  shipmentRates: readonly Readonly<{
    courierCode: string;
    courierName: string;
    etaText: string | null;
    priceRp: string;
    selectedAt: Date;
    serviceCode: string;
    serviceName: string;
  }>[];
  shippingTotalRp: string;
  status: string;
  updatedAt: Date;
}>;

export type AdminCustomPrintDetail = Readonly<{
  colorRequested: string | null;
  createdAt: Date;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  fileCount: number;
  files: readonly Readonly<{
    extension: string;
    id: string;
    mimeType: string;
    originalName: string;
    sizeBytes: string;
    status: string;
    uploadedAt: Date | null;
  }>[];
  id: string;
  materialRequested: string;
  notes: string | null;
  quantity: number;
  quotes: readonly Readonly<{
    createdAt: Date;
    expiresAt: Date | null;
    finalTotalRp: string;
    id: string;
    materialCode: string;
    quoteNumber: string;
    status: string;
    version: number;
  }>[];
  referenceNumber: string;
  review: Readonly<{
    configurationJson: unknown;
    materialCode: string;
    notes: string | null;
    printDurationSeconds: number;
    quantity: number;
    reviewedAt: Date;
    verifiedWeightG: string;
  }> | null;
  status: string;
  unitConfirmation: string | null;
  updatedAt: Date;
}>;

export type AdminProductDetail = Readonly<{
  category: Readonly<{ id: string; name: string; slug: string }> | null;
  description: string;
  id: string;
  isPublished: boolean;
  media: readonly Readonly<{
    altText: string;
    id: string;
    sortOrder: number;
    storageKey: string;
  }>[];
  name: string;
  slug: string;
  variants: readonly Readonly<{
    heightCm: string | null;
    id: string;
    isActive: boolean;
    lengthCm: string | null;
    name: string;
    priceRp: string;
    sku: string;
    stockOnHand: number;
    weightGrams: string;
    widthCm: string | null;
  }>[];
}>;

export type AdminPortfolioDetail = Readonly<{
  challenge: string;
  clientName: string | null;
  id: string;
  isFeatured: boolean;
  isPublished: boolean;
  media: readonly Readonly<{
    altText: string;
    id: string;
    sortOrder: number;
    storageKey: string;
  }>[];
  process: string;
  publishedAt: Date | null;
  result: string;
  serviceLabel: string;
  slug: string;
  summary: string;
  title: string;
  updatedAt: Date;
}>;

export type AdminInquiryDetail = Readonly<{
  budgetRange: string | null;
  company: string | null;
  confidentialityAck: boolean;
  createdAt: Date;
  currentStage: string;
  description: string;
  email: string;
  files: readonly Readonly<{
    extension: string;
    id: string;
    mimeType: string;
    originalName: string;
    sizeBytes: string;
    status: string;
  }>[];
  id: string;
  name: string;
  phone: string;
  preferredService: string | null;
  projectGoal: string;
  referenceLink: string | null;
  referenceNumber: string;
  status: string;
  targetDeadline: Date | null;
  targetQuantity: string;
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

  async getOrder(orderId: string): Promise<AdminOrderDetail | null> {
    await this.authorizeWith("ORDER_FULFILL");
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        address: {
          select: {
            addressLine: true,
            city: true,
            countryCode: true,
            district: true,
            phone: true,
            postalCode: true,
            province: true,
            recipientName: true,
          },
        },
        cancelledAt: true,
        completedAt: true,
        createdAt: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        grandTotalRp: true,
        id: true,
        items: {
          orderBy: { id: "asc" },
          select: {
            configurationJson: true,
            itemType: true,
            lineTotalRp: true,
            nameSnapshot: true,
            quantity: true,
            skuSnapshot: true,
          },
        },
        itemsSubtotalRp: true,
        orderNumber: true,
        orderType: true,
        paidAt: true,
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
          select: {
            amountRp: true,
            createdAt: true,
            expiresAt: true,
            id: true,
            providerOrderId: true,
            purpose: true,
            settledAt: true,
            status: true,
          },
        },
        reservations: {
          orderBy: { createdAt: "asc" },
          select: {
            expiresAt: true,
            id: true,
            quantity: true,
            status: true,
            variantId: true,
          },
        },
        shipments: {
          orderBy: { updatedAt: "desc" },
          select: {
            courierCode: true,
            finalHeightCm: true,
            finalLengthCm: true,
            finalWeightGrams: true,
            finalWidthCm: true,
            id: true,
            serviceCode: true,
            shippingAmountRp: true,
            status: true,
            trackingNumber: true,
            updatedAt: true,
          },
        },
        shipmentRates: {
          orderBy: { selectedAt: "desc" },
          select: {
            courierCode: true,
            courierName: true,
            etaText: true,
            priceRp: true,
            selectedAt: true,
            serviceCode: true,
            serviceName: true,
          },
        },
        shippingTotalRp: true,
        status: true,
        updatedAt: true,
      },
    });

    if (order === null) return null;

    return {
      address: order.address,
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      grandTotalRp: order.grandTotalRp.toString(),
      id: order.id,
      items: order.items.map((item) => ({
        configurationJson: item.configurationJson,
        itemType: item.itemType,
        lineTotalRp: item.lineTotalRp.toString(),
        nameSnapshot: item.nameSnapshot,
        quantity: item.quantity,
        skuSnapshot: item.skuSnapshot,
      })),
      itemsSubtotalRp: order.itemsSubtotalRp.toString(),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      paidAt: order.paidAt,
      paymentAttempts: order.paymentAttempts.map((attempt) => ({
        amountRp: attempt.amountRp.toString(),
        createdAt: attempt.createdAt,
        expiresAt: attempt.expiresAt,
        id: attempt.id,
        providerOrderId: attempt.providerOrderId,
        purpose: attempt.purpose,
        settledAt: attempt.settledAt,
        status: attempt.status,
      })),
      reservations: order.reservations,
      shipments: order.shipments.map((shipment) => ({
        courierCode: shipment.courierCode,
        finalHeightCm: shipment.finalHeightCm?.toString() ?? null,
        finalLengthCm: shipment.finalLengthCm?.toString() ?? null,
        finalWeightGrams: shipment.finalWeightGrams?.toString() ?? null,
        finalWidthCm: shipment.finalWidthCm?.toString() ?? null,
        id: shipment.id,
        serviceCode: shipment.serviceCode,
        shippingAmountRp: shipment.shippingAmountRp?.toString() ?? null,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
        updatedAt: shipment.updatedAt,
      })),
      shipmentRates: order.shipmentRates.map((rate) => ({
        courierCode: rate.courierCode,
        courierName: rate.courierName,
        etaText: rate.etaText,
        priceRp: rate.priceRp.toString(),
        selectedAt: rate.selectedAt,
        serviceCode: rate.serviceCode,
        serviceName: rate.serviceName,
      })),
      shippingTotalRp: order.shippingTotalRp.toString(),
      status: order.status,
      updatedAt: order.updatedAt,
    };
  }

  async getCustomPrintRequest(
    requestId: string,
  ): Promise<AdminCustomPrintDetail | null> {
    await this.authorizeWith("CUSTOM_PRINT_REVIEW");
    const request = await this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: {
        colorRequested: true,
        createdAt: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        files: {
          orderBy: { createdAt: "asc" },
          select: {
            file: {
              select: {
                extension: true,
                id: true,
                mimeType: true,
                originalName: true,
                sizeBytes: true,
                uploadStatus: true,
                uploadedAt: true,
              },
            },
          },
        },
        id: true,
        materialRequested: true,
        notes: true,
        quantity: true,
        quotes: {
          orderBy: [{ version: "desc" }, { createdAt: "desc" }],
          select: {
            createdAt: true,
            expiresAt: true,
            finalTotalRp: true,
            id: true,
            materialCode: true,
            quoteNumber: true,
            status: true,
            version: true,
          },
        },
        referenceNumber: true,
        review: {
          select: {
            configurationJson: true,
            materialCode: true,
            notes: true,
            printDurationSeconds: true,
            quantity: true,
            reviewedAt: true,
            verifiedWeightG: true,
          },
        },
        status: true,
        unitConfirmation: true,
        updatedAt: true,
      },
    });

    if (request === null) return null;

    return {
      colorRequested: request.colorRequested,
      createdAt: request.createdAt,
      customerEmail: request.customerEmail,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      fileCount: request.files.length,
      files: request.files.map(({ file }) => ({
        extension: file.extension,
        id: file.id,
        mimeType: file.mimeType,
        originalName: file.originalName,
        sizeBytes: file.sizeBytes.toString(),
        status: file.uploadStatus,
        uploadedAt: file.uploadedAt,
      })),
      id: request.id,
      materialRequested: request.materialRequested,
      notes: request.notes,
      quantity: request.quantity,
      quotes: request.quotes.map((quote) => ({
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt,
        finalTotalRp: quote.finalTotalRp.toString(),
        id: quote.id,
        materialCode: quote.materialCode,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        version: quote.version,
      })),
      referenceNumber: request.referenceNumber,
      review: request.review === null
        ? null
        : {
            configurationJson: request.review.configurationJson,
            materialCode: request.review.materialCode,
            notes: request.review.notes,
            printDurationSeconds: request.review.printDurationSeconds,
            quantity: request.review.quantity,
            reviewedAt: request.review.reviewedAt,
            verifiedWeightG: request.review.verifiedWeightG.toString(),
          },
      status: request.status,
      unitConfirmation: request.unitConfirmation,
      updatedAt: request.updatedAt,
    };
  }

  async getProduct(productId: string): Promise<AdminProductDetail | null> {
    await this.authorizeWith("CATALOG_WRITE");
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        category: { select: { id: true, name: true, slug: true } },
        description: true,
        id: true,
        isPublished: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: { altText: true, id: true, sortOrder: true, storageKey: true },
        },
        name: true,
        slug: true,
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            heightCm: true,
            id: true,
            isActive: true,
            lengthCm: true,
            name: true,
            priceRp: true,
            sku: true,
            stockOnHand: true,
            weightGrams: true,
            widthCm: true,
          },
        },
      },
    });

    if (product === null) return null;

    return {
      category: product.category,
      description: product.description,
      id: product.id,
      isPublished: product.isPublished,
      media: product.media,
      name: product.name,
      slug: product.slug,
      variants: product.variants.map((variant) => ({
        heightCm: variant.heightCm?.toString() ?? null,
        id: variant.id,
        isActive: variant.isActive,
        lengthCm: variant.lengthCm?.toString() ?? null,
        name: variant.name,
        priceRp: variant.priceRp.toString(),
        sku: variant.sku,
        stockOnHand: variant.stockOnHand,
        weightGrams: variant.weightGrams.toString(),
        widthCm: variant.widthCm?.toString() ?? null,
      })),
    };
  }

  async getPortfolio(
    projectId: string,
  ): Promise<AdminPortfolioDetail | null> {
    await this.authorizeWith("PORTFOLIO_WRITE");
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id: projectId },
      select: {
        challenge: true,
        clientName: true,
        id: true,
        isFeatured: true,
        isPublished: true,
        media: {
          orderBy: { sortOrder: "asc" },
          select: { altText: true, id: true, sortOrder: true, storageKey: true },
        },
        process: true,
        publishedAt: true,
        result: true,
        serviceLabel: true,
        slug: true,
        summary: true,
        title: true,
        updatedAt: true,
      },
    });

    return project;
  }

  async listInquiries(
    input: AdminListInput = {},
  ): Promise<AdminOperationsResult<AdminInquiryRow>> {
    const access = await this.authorizeWith("INQUIRY_MANAGE");
    const page = normalizePage(input.page);
    const rows = await this.prisma.b2BInquiry.findMany({
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
    });
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      generatedAt: this.now(),
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows,
      page,
      role: access.profile.role,
    };
  }

  async getInquiry(inquiryId: string): Promise<AdminInquiryDetail | null> {
    await this.authorizeWith("INQUIRY_MANAGE");
    const inquiry = await this.prisma.b2BInquiry.findUnique({
      where: { id: inquiryId },
      select: {
        budgetRange: true,
        company: true,
        confidentialityAck: true,
        createdAt: true,
        currentStage: true,
        description: true,
        email: true,
        files: {
          orderBy: { createdAt: "asc" },
          select: {
            file: {
              select: {
                extension: true,
                id: true,
                mimeType: true,
                originalName: true,
                sizeBytes: true,
                uploadStatus: true,
              },
            },
          },
        },
        id: true,
        name: true,
        phone: true,
        preferredService: true,
        projectGoal: true,
        referenceLink: true,
        referenceNumber: true,
        status: true,
        targetDeadline: true,
        targetQuantity: true,
        updatedAt: true,
      },
    });

    if (inquiry === null) return null;
    return {
      ...inquiry,
      files: inquiry.files.map(({ file }) => ({
        extension: file.extension,
        id: file.id,
        mimeType: file.mimeType,
        originalName: file.originalName,
        sizeBytes: file.sizeBytes.toString(),
        status: file.uploadStatus,
      })),
    };
  }

  async listPricingRules(
    input: AdminListInput = {},
  ): Promise<AdminOperationsResult<AdminPricingRuleRow>> {
    const access = await this.authorizeWith("AUDIT_READ");
    const page = normalizePage(input.page);
    const rows = await this.prisma.pricingRuleVersion.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        approvedAt: true,
        approvedByAdmin: { select: { displayName: true } },
        code: true,
        createdAt: true,
        definitionJson: true,
        id: true,
        status: true,
        updatedAt: true,
        version: true,
      },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE + 1,
    });
    const pageRows = rows.slice(0, ADMIN_PAGE_SIZE);

    return {
      generatedAt: this.now(),
      hasNext: rows.length > ADMIN_PAGE_SIZE,
      items: pageRows.map(toAdminPricingRule),
      page,
      role: access.profile.role,
    };
  }

  async getActivePricingRule(): Promise<AdminPricingRuleRow | null> {
    await this.authorizeWith("AUDIT_READ");
    const row = await this.prisma.pricingRuleVersion.findFirst({
      where: { status: "ACTIVE" },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: {
        approvedAt: true,
        approvedByAdmin: { select: { displayName: true } },
        code: true,
        createdAt: true,
        definitionJson: true,
        id: true,
        status: true,
        updatedAt: true,
        version: true,
      },
    });

    return row === null ? null : toAdminPricingRule(row);
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

function toAdminPricingRule(row: {
  approvedAt: Date | null;
  approvedByAdmin: { displayName: string | null } | null;
  code: string;
  createdAt: Date;
  definitionJson: unknown;
  id: string;
  status: string;
  updatedAt: Date;
  version: number;
}): AdminPricingRuleRow {
  return {
    approvedAt: row.approvedAt,
    approvedBy: row.approvedByAdmin?.displayName ?? (row.approvedByAdmin === null ? null : "Admin profile"),
    code: row.code,
    createdAt: row.createdAt,
    definitionJson: row.definitionJson,
    id: row.id,
    status: row.status,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}
