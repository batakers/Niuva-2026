import "server-only";
import { CUSTOM_PRINT_V1_RULE_CODE } from "@/modules/pricing/policy";
import { z } from "zod";
import { parseAdminListQuery, type AdminListQuery } from "./list-query";
import { PrismaAdminOperationsReadRepository, type AdminOperationsReadRepository } from "./operations-read-repository";

import { Prisma, type AdminRole, type PrismaClient } from "@/generated/prisma/client";
import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { publicServices } from "@/features/public/company-content";
import { isModelExtension, isReferencePhotoExtension } from "@/modules/custom-print/file-types";
import { getPaymentIssues, type PaymentIssue } from "@/modules/payment/operational-state";
import { operationalPaymentSelect } from "@/modules/payment/operational-repository";
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
  intakeMode: "MODEL_READY" | "REFERENCE_ONLY";
  modelReady: boolean;
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
  paymentIssues: readonly PaymentIssue[];
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
  customerPreviewSnapshot: unknown;
  colorRequested: string | null;
  createdAt: Date;
  customerEmail: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  fileCount: number;
  intakeMode: "MODEL_READY" | "REFERENCE_ONLY";
  modelReady: boolean;
  photoCount: number;
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
  referenceLink: string | null;
  review: Readonly<{
    configurationJson: unknown;
    materialCode: string;
    notes: string | null;
    printDurationSeconds: number;
    quantity: number;
    reviewedAt: Date;
    updatedAt: Date;
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

export type AdminStockHistory = Readonly<{
  product: Readonly<{ id: string; name: string }>;
  variant: Readonly<{
    id: string;
    name: string;
    sku: string;
    stockOnHand: number;
    reserved: number;
    available: number;
  }>;
  movements: readonly Readonly<{
    id: string;
    kind: string;
    delta: number;
    balanceBefore: number;
    balanceAfter: number;
    reason: string | null;
    adminName: string | null;
    orderId: string | null;
    orderNumber: string | null;
    createdAt: Date;
  }>[];
  hasNext: boolean;
  page: number;
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
  customerId: string | null;
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

export type AdminFilteredResult<T> = AdminOperationsResult<T> & Readonly<{ filteredTotal: number }>;
export type AdminLinkedOrder = Readonly<{ id: string; orderNumber: string; status: string }>;
export type AdminLinkedRequest = Readonly<{ id: string; referenceNumber: string; status: string }>;
export type AdminListInput = Partial<AdminListQuery>;

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
  readRepository?: AdminOperationsReadRepository;
}>;

export class AdminOperationsService {
  private readonly authorize: () => Promise<AdminAccess>;
  private readonly now: () => Date;
  private readonly prisma: PrismaClient;
  private readonly readRepository: AdminOperationsReadRepository;

  constructor(dependencies: AdminOperationsDependencies = {}) {
    this.authorize = dependencies.authorize ?? requireAdmin;
    this.now = dependencies.now ?? (() => new Date());
    this.prisma = dependencies.prisma ?? getPrismaClient();
    this.readRepository = dependencies.readRepository ?? new PrismaAdminOperationsReadRepository(this.prisma);
  }

  async listOrders(input: AdminListInput = {}): Promise<AdminFilteredResult<AdminOrderRow>> {
    const access = await this.authorizeWith("ORDER_FULFILL");
    const query = parseAdminListQuery("orders", input);
    const result = await this.readRepository.listOrders(query);
    return { ...result, generatedAt: this.now(), page: query.page, role: access.profile.role };
  }

  async getCustomPrintLinkedOrders(requestId: string): Promise<readonly AdminLinkedOrder[]> {
    await this.authorizeWith("CUSTOM_PRINT_REVIEW");
    return this.readRepository.getCustomPrintLinkedOrders(z.uuid().parse(requestId));
  }

  async getOrderSourceRequests(orderId: string): Promise<readonly AdminLinkedRequest[]> {
    await this.authorizeWith("ORDER_FULFILL");
    return this.readRepository.getOrderSourceRequests(z.uuid().parse(orderId));
  }

  async listCustomPrintRequests(input: AdminListInput = {}): Promise<AdminFilteredResult<AdminCustomPrintRequestRow>> {
    const access = await this.authorizeWith("CUSTOM_PRINT_REVIEW");
    const query = parseAdminListQuery("custom-print", input);
    const result = await this.readRepository.listCustomPrintRequests(query);
    return { ...result, generatedAt: this.now(), page: query.page, role: access.profile.role };
  }

  async listProducts(input: AdminListInput = {}): Promise<AdminFilteredResult<AdminProductRow>> {
    const access = await this.authorizeWith("CATALOG_WRITE");
    const query = parseAdminListQuery("products", input);
    const result = await this.readRepository.listProducts(query);
    return { ...result, generatedAt: this.now(), page: query.page, role: access.profile.role };
  }

  async listPortfolio(input: AdminListInput = {}): Promise<AdminFilteredResult<AdminPortfolioRow>> {
    const access = await this.authorizeWith("PORTFOLIO_WRITE");
    const query = parseAdminListQuery("portfolio", input);
    const result = await this.readRepository.listPortfolio(query);
    return { ...result, generatedAt: this.now(), page: query.page, role: access.profile.role };
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
            ...operationalPaymentSelect,
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
      paymentIssues: getPaymentIssues(order.status, order.paymentAttempts),
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
        customerPreviewSnapshot: true,
        colorRequested: true,
        createdAt: true,
        customerEmail: true,
        customerId: true,
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
        intakeMode: true,
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
        referenceLink: true,
        review: {
          select: {
            configurationJson: true,
            materialCode: true,
            notes: true,
            printDurationSeconds: true,
            quantity: true,
            reviewedAt: true,
            updatedAt: true,
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
      customerPreviewSnapshot: request.customerPreviewSnapshot,
      colorRequested: request.colorRequested,
      createdAt: request.createdAt,
      customerEmail: request.customerEmail,
      customerId: request.customerId,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      fileCount: request.files.length,
      intakeMode: request.intakeMode,
      modelReady: request.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension)),
      photoCount: request.files.filter(({ file }) => file.uploadStatus === "VERIFIED" && isReferencePhotoExtension(file.extension)).length,
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
      referenceLink: request.referenceLink,
      review: request.review === null
        ? null
        : {
            configurationJson: request.review.configurationJson,
            materialCode: request.review.materialCode,
            notes: request.review.notes,
            printDurationSeconds: request.review.printDurationSeconds,
            quantity: request.review.quantity,
            reviewedAt: request.review.reviewedAt,
            updatedAt: request.review.updatedAt,
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

  async getStockHistory(productId: string, variantId: string, input: AdminListInput = {}): Promise<AdminStockHistory | null> {
    await this.authorizeWith("AUDIT_READ");
    const page = normalizePage(input.page);
    return this.prisma.$transaction(async (transaction) => {
      const variant = await transaction.productVariant.findFirst({
        where: { id: variantId, productId },
        select: {
          id: true,
          name: true,
          sku: true,
          stockOnHand: true,
          product: { select: { id: true, name: true } },
        },
      });
      if (variant === null) return null;
      const reserved = await transaction.stockReservation.aggregate({
        where: { variantId, status: "ACTIVE", expiresAt: { gt: this.now() } },
        _sum: { quantity: true },
      });
      const movements = await transaction.stockMovement.findMany({
        where: { variantId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE + 1,
        select: {
          id: true,
          kind: true,
          delta: true,
          balanceBefore: true,
          balanceAfter: true,
          reason: true,
          createdAt: true,
          admin: { select: { displayName: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      });
      const reservedQuantity = reserved._sum.quantity ?? 0;
      return {
        product: variant.product,
        variant: {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          stockOnHand: variant.stockOnHand,
          reserved: reservedQuantity,
          available: Math.max(0, variant.stockOnHand - reservedQuantity),
        },
        movements: movements.slice(0, ADMIN_PAGE_SIZE).map((movement) => ({
          id: movement.id,
          kind: movement.kind,
          delta: movement.delta,
          balanceBefore: movement.balanceBefore,
          balanceAfter: movement.balanceAfter,
          reason: movement.reason,
          adminName: movement.admin === null ? null : movement.admin.displayName ?? "Admin",
          orderId: movement.order?.id ?? null,
          orderNumber: movement.order?.orderNumber ?? null,
          createdAt: movement.createdAt,
        })),
        hasNext: movements.length > ADMIN_PAGE_SIZE,
        page,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
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

  async listInquiries(input: AdminListInput = {}): Promise<AdminFilteredResult<AdminInquiryRow>> {
    const access = await this.authorizeWith("INQUIRY_MANAGE");
    const query = parseAdminListQuery("inquiries", input);
    const result = await this.readRepository.listInquiries(query);
    return { ...result, generatedAt: this.now(), page: query.page, role: access.profile.role };
  }

  async getInquiry(inquiryId: string): Promise<AdminInquiryDetail | null> {
    await this.authorizeWith("INQUIRY_MANAGE");
    const inquiry = await this.prisma.b2BInquiry.findUnique({
      where: { id: inquiryId },
      select: {
        customerId: true,
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
      preferredService: publicServices.find((service) => service.slug === inquiry.preferredService)?.title ?? inquiry.preferredService,
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
      where: { status: "ACTIVE", code: CUSTOM_PRINT_V1_RULE_CODE },
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
