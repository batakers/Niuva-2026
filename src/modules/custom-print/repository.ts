import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";

import type { CustomPrintRequestInput } from "./schema";

export type CreateCustomPrintRequestInput = CustomPrintRequestInput &
  Readonly<{
    id?: string;
    publicTokenHash: string;
    referenceNumber: string;
  }>;

export type CustomPrintReviewInput = Readonly<{
  configurationJson?: Prisma.InputJsonObject;
  materialCode: string;
  notes?: string;
  printDurationSeconds: number;
  quantity: number;
  requestId: string;
  reviewedAt: Date;
  reviewedByAdminId: string;
  verifiedWeightG: Prisma.Decimal;
}>;

export type CustomPrintReviewRecord = Readonly<{
  configurationJson: Prisma.JsonValue | null;
  id: string;
  materialCode: string;
  notes: string | null;
  printDurationSeconds: number;
  quantity: number;
  requestId: string;
  reviewedAt: Date;
  reviewedByAdminId: string;
  verifiedWeightG: Prisma.Decimal;
}>;

export type CreateDraftQuoteInput = Readonly<{
  calculationSnapshot: Prisma.InputJsonObject;
  createdByAdminId: string;
  expiresAt?: Date;
  finalTotalRp: Prisma.Decimal;
  machineSubtotalRp: Prisma.Decimal;
  materialCode: string;
  materialSubtotalRp: Prisma.Decimal;
  id?: string;
  publicTokenHash: string;
  pricingRuleVersionId: string;
  printDurationSeconds: number;
  quantity: number;
  quoteNumber: string;
  requestId: string;
  unroundedTotalRp: Prisma.Decimal;
  verifiedWeightG: Prisma.Decimal;
  version: number;
}>;

export type QuoteForAcceptance = Readonly<{
  calculationSnapshot: Prisma.JsonValue;
  expiresAt: Date | null;
  finalTotalRp: Prisma.Decimal;
  id: string;
  machineSubtotalRp: Prisma.Decimal;
  materialCode: string;
  materialSubtotalRp: Prisma.Decimal;
  printDurationSeconds: number;
  publicTokenHash: string;
  quantity: number;
  request: Readonly<{
    customerEmail: string;
    customerName: string;
    customerPhone: string;
  }>;
  requestId: string;
  status: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT";
  unroundedTotalRp: Prisma.Decimal;
  verifiedWeightG: Prisma.Decimal;
  version: number;
}>;

export type AcceptedCustomOrder = Readonly<{
  kind: "ALREADY_ACCEPTED" | "CREATED";
  orderId: string;
  orderNumber: string;
}>;

export type CustomPrintRequestReviewSummary = Readonly<{
  id: string;
  quantity: number;
  status:
    | "APPROVED"
    | "CANCELLED"
    | "DECLINED"
    | "QUOTE_READY"
    | "QUOTE_SENT"
    | "SUBMITTED"
    | "UNDER_REVIEW";
}>;

export class CustomPrintRequestRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async referenceExists(referenceNumber: string): Promise<boolean> {
    const request = await this.prisma.customPrintRequest.findUnique({
      where: { referenceNumber },
      select: { id: true },
    });

    return request !== null;
  }

  async findUploadReadyFileIds(fileIds: readonly string[]): Promise<readonly string[]> {
    if (fileIds.length === 0) {
      return [];
    }

    const files = await this.prisma.storedFile.findMany({
      where: {
        bucketScope: "PRIVATE_CUSTOMER",
        id: { in: [...new Set(fileIds)] },
        uploadStatus: "UPLOADED",
      },
      select: { id: true },
    });

    return files.map((file) => file.id);
  }

  async findRequestForReview(requestId: string) {
    return this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: { id: true, quantity: true, status: true },
    });
  }

  async create(input: CreateCustomPrintRequestInput) {
    return this.prisma.$transaction(async (transaction) => {
      const files = await transaction.storedFile.findMany({
        where: {
          bucketScope: "PRIVATE_CUSTOMER",
          id: { in: [...new Set(input.fileIds)] },
          uploadStatus: "UPLOADED",
        },
        select: { id: true },
      });

      if (files.length !== new Set(input.fileIds).size) {
        throw appError("CONFLICT", {
          message: "Satu atau lebih file belum siap dihubungkan ke request.",
        });
      }

      const request = await transaction.customPrintRequest.create({
        data: {
          colorRequested: input.colorRequested,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          materialRequested: input.materialRequested,
          notes: input.notes,
          publicTokenHash: input.publicTokenHash,
          quantity: input.quantity,
          referenceNumber: input.referenceNumber,
          unitConfirmation: input.unitConfirmation,
          ...(input.id === undefined ? {} : { id: input.id }),
        },
      });

      await transaction.customPrintRequestFile.createMany({
        data: files.map((file) => ({
          fileId: file.id,
          requestId: request.id,
        })),
      });

      const verified = await transaction.storedFile.updateMany({
        where: {
          id: { in: files.map((file) => file.id) },
          uploadStatus: "UPLOADED",
        },
        data: {
          uploadStatus: "VERIFIED",
          verifiedAt: new Date(),
        },
      });

      if (verified.count !== files.length) {
        throw appError("CONFLICT", {
          message: "File berubah sebelum ownership request diselesaikan.",
        });
      }

      return request;
    });
  }

  async updateStatusIfCurrent(
    requestId: string,
    currentStatus:
      | "APPROVED"
      | "CANCELLED"
      | "DECLINED"
      | "QUOTE_READY"
      | "QUOTE_SENT"
      | "SUBMITTED"
      | "UNDER_REVIEW",
    nextStatus:
      | "APPROVED"
      | "CANCELLED"
      | "DECLINED"
      | "QUOTE_READY"
      | "QUOTE_SENT"
      | "SUBMITTED"
      | "UNDER_REVIEW",
  ) {
    const updated = await this.prisma.customPrintRequest.updateMany({
      where: { id: requestId, status: currentStatus },
      data: { status: nextStatus },
    });

    if (updated.count === 0) {
      return null;
    }

    return this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });
  }

  async saveReview(input: CustomPrintReviewInput): Promise<CustomPrintReviewRecord> {
    return this.prisma.customPrintReview.upsert({
      where: { requestId: input.requestId },
      create: {
        configurationJson: input.configurationJson,
        materialCode: input.materialCode,
        notes: input.notes,
        printDurationSeconds: input.printDurationSeconds,
        quantity: input.quantity,
        requestId: input.requestId,
        reviewedAt: input.reviewedAt,
        reviewedByAdminId: input.reviewedByAdminId,
        verifiedWeightG: input.verifiedWeightG,
      },
      update: {
        configurationJson: input.configurationJson,
        materialCode: input.materialCode,
        notes: input.notes,
        printDurationSeconds: input.printDurationSeconds,
        quantity: input.quantity,
        reviewedAt: input.reviewedAt,
        reviewedByAdminId: input.reviewedByAdminId,
        verifiedWeightG: input.verifiedWeightG,
      },
    });
  }

  async findReview(requestId: string): Promise<CustomPrintReviewRecord | null> {
    return this.prisma.customPrintReview.findUnique({ where: { requestId } });
  }
}

export class CustomPrintQuoteRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findActivePricingRuleVersion(pricingRuleVersionId: string) {
    return this.prisma.pricingRuleVersion.findFirst({
      where: {
        id: pricingRuleVersionId,
        status: "ACTIVE",
      },
      select: {
        code: true,
        definitionJson: true,
        id: true,
        version: true,
      },
    });
  }

  async createDraft(input: CreateDraftQuoteInput) {
    const pricingRule = await this.prisma.pricingRuleVersion.findFirst({
      where: {
        id: input.pricingRuleVersionId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (pricingRule === null) {
      throw appError("PRICING_RULE_NOT_APPROVED");
    }

    const quote = await this.prisma.customPrintQuote.create({
      data: {
        calculationSnapshot: input.calculationSnapshot,
        createdByAdminId: input.createdByAdminId,
        expiresAt: input.expiresAt,
        finalTotalRp: input.finalTotalRp,
        id: input.id,
        machineSubtotalRp: input.machineSubtotalRp,
        materialCode: input.materialCode,
        materialSubtotalRp: input.materialSubtotalRp,
        printDurationSeconds: input.printDurationSeconds,
        publicTokenHash: input.publicTokenHash,
        quantity: input.quantity,
        quoteNumber: input.quoteNumber,
        requestId: input.requestId,
        unroundedTotalRp: input.unroundedTotalRp,
        verifiedWeightG: input.verifiedWeightG,
        version: input.version,
        pricingRuleVersionId: input.pricingRuleVersionId,
      },
    });

    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      status: "DRAFT" as const,
    };
  }

  async quoteNumberExists(quoteNumber: string): Promise<boolean> {
    const quote = await this.prisma.customPrintQuote.findUnique({
      where: { quoteNumber },
      select: { id: true },
    });

    return quote !== null;
  }

  async orderNumberExists(orderNumber: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    });

    return order !== null;
  }

  async findRequestForReview(
    requestId: string,
  ): Promise<CustomPrintRequestReviewSummary | null> {
    return this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: { id: true, quantity: true, status: true },
    });
  }

  async findReview(requestId: string): Promise<CustomPrintReviewRecord | null> {
    return this.prisma.customPrintReview.findUnique({ where: { requestId } });
  }

  async sendIfCurrent(
    quoteId: string,
    sentAt: Date,
    expiresAt: Date,
    publicTokenHash: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const quote = await transaction.customPrintQuote.findUnique({
        where: { id: quoteId },
        select: { requestId: true, status: true },
      });

      if (quote === null) {
        throw appError("NOT_FOUND");
      }

      if (quote.status !== "DRAFT") {
        throw appError("QUOTE_NOT_READY");
      }

      const updatedQuote = await transaction.customPrintQuote.updateMany({
        where: { id: quoteId, status: "DRAFT" },
        data: { expiresAt, publicTokenHash, sentAt, status: "SENT" },
      });

      if (updatedQuote.count === 0) {
        throw appError("CONFLICT", {
          message: "Quote berubah sebelum dikirim.",
        });
      }

      const updatedRequest = await transaction.customPrintRequest.updateMany({
        where: {
          id: quote.requestId,
          status: { in: ["QUOTE_READY", "QUOTE_SENT"] },
        },
        data: { status: "QUOTE_SENT" },
      });

      if (updatedRequest.count === 0) {
        throw appError("CONFLICT", {
          message: "Request custom print belum siap menerima quote.",
        });
      }

      const sent = await transaction.customPrintQuote.findUnique({
        where: { id: quoteId },
        select: { id: true, requestId: true, status: true },
      });

      if (sent === null) {
        throw appError("NOT_FOUND");
      }

      return {
        id: sent.id,
        requestId: sent.requestId,
        status: "SENT" as const,
      };
    });
  }

  async findForAcceptance(quoteId: string): Promise<QuoteForAcceptance | null> {
    const quote = await this.prisma.customPrintQuote.findUnique({
      where: { id: quoteId },
      select: {
        calculationSnapshot: true,
        expiresAt: true,
        finalTotalRp: true,
        id: true,
        machineSubtotalRp: true,
        materialCode: true,
        materialSubtotalRp: true,
        printDurationSeconds: true,
        publicTokenHash: true,
        quantity: true,
        request: {
          select: {
            customerEmail: true,
            customerName: true,
            customerPhone: true,
          },
        },
        requestId: true,
        status: true,
        unroundedTotalRp: true,
        verifiedWeightG: true,
        version: true,
      },
    });

    return quote;
  }

  async updateStatusIfCurrent(
    quoteId: string,
    currentStatus: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT",
    nextStatus: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT",
    timestamp: Date,
  ) {
    const updated = await this.prisma.customPrintQuote.updateMany({
      where: { id: quoteId, status: currentStatus },
      data: {
        acceptedAt: nextStatus === "ACCEPTED" ? timestamp : undefined,
        sentAt: nextStatus === "SENT" ? timestamp : undefined,
        status: nextStatus,
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return this.prisma.customPrintQuote.findUnique({
      where: { id: quoteId },
      select: { id: true, status: true },
    });
  }

  async acceptAndCreatePayableOrder(input: Readonly<{
    orderId: string;
    orderNumber: string;
    orderPublicTokenHash: string;
    quoteId: string;
    now: Date;
    version: number;
  }>): Promise<AcceptedCustomOrder> {
    return this.prisma.$transaction(async (transaction) => {
      const quote = await transaction.customPrintQuote.findUnique({
        where: { id: input.quoteId },
        select: {
          finalTotalRp: true,
          id: true,
          request: {
            select: {
              customerEmail: true,
              customerName: true,
              customerPhone: true,
            },
          },
          requestId: true,
          status: true,
          quantity: true,
          quoteNumber: true,
          version: true,
        },
      });

      if (quote === null) {
        throw appError("NOT_FOUND");
      }

      if (quote.status === "ACCEPTED") {
        const existing = await transaction.orderItem.findFirst({
          where: { customQuoteId: quote.id },
          select: { order: { select: { id: true, orderNumber: true } } },
        });

        if (existing === null) {
          throw appError("CONFLICT", {
            message: "Quote accepted tidak memiliki payable order.",
          });
        }

        return {
          kind: "ALREADY_ACCEPTED",
          orderId: existing.order.id,
          orderNumber: existing.order.orderNumber,
        };
      }

      if (quote.status !== "SENT") {
        throw appError("QUOTE_NOT_READY");
      }

      const latest = await transaction.customPrintQuote.findFirst({
        where: { requestId: quote.requestId },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      if (latest === null || latest.version !== input.version) {
        throw appError("QUOTE_NOT_READY", {
          message: "Quote ini sudah disupersede oleh versi yang lebih baru.",
        });
      }

      const updated = await transaction.customPrintQuote.updateMany({
        where: { id: input.quoteId, status: "SENT" },
        data: { acceptedAt: input.now, status: "ACCEPTED" },
      });

      if (updated.count === 0) {
        throw appError("CONFLICT", {
          message: "Quote berubah sebelum acceptance selesai.",
        });
      }

      const updatedRequest = await transaction.customPrintRequest.updateMany({
        where: { id: quote.requestId, status: "QUOTE_SENT" },
        data: { status: "APPROVED" },
      });

      if (updatedRequest.count === 0) {
        throw appError("CONFLICT", {
          message: "Request custom print berubah sebelum quote disetujui.",
        });
      }

      await transaction.order.create({
        data: {
          customerEmail: quote.request.customerEmail,
          customerName: quote.request.customerName,
          customerPhone: quote.request.customerPhone,
          grandTotalRp: quote.finalTotalRp,
          id: input.orderId,
          itemsSubtotalRp: quote.finalTotalRp,
          orderNumber: input.orderNumber,
          orderType: "CUSTOM_PRINT",
          publicTokenHash: input.orderPublicTokenHash,
          shippingTotalRp: 0,
          status: "WAITING_PAYMENT",
        },
      });

      await transaction.orderItem.create({
        data: {
          configurationJson: { quoteNumber: quote.quoteNumber, quantity: quote.quantity },
          customQuoteId: quote.id,
          itemType: "CUSTOM_PRINT",
          lineTotalRp: quote.finalTotalRp,
          nameSnapshot: `Custom print ${quote.quoteNumber}`,
          orderId: input.orderId,
          quantity: 1,
          unitPriceRp: quote.finalTotalRp,
        },
      });

      return {
        kind: "CREATED",
        orderId: input.orderId,
        orderNumber: input.orderNumber,
      };
    });
  }

  async findLatestVersion(requestId: string): Promise<number | null> {
    const quote = await this.prisma.customPrintQuote.findFirst({
      where: { requestId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return quote?.version ?? null;
  }
}
