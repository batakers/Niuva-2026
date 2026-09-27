import {
  Prisma,
  type OrderStatus,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError, isAppError } from "@/modules/shared/errors";

import type { CustomPrintRequestInput } from "./schema";
import { isModelExtension, isReferencePhotoExtension } from "./file-types";
import { isEstimateCurrent } from "./estimate";
import { calculateCustomerPreviewSnapshot } from "./customer-preview";
import { CUSTOM_PRINT_V1_RULE_CODE } from "@/modules/pricing/policy";

export type CreateCustomPrintRequestInput = CustomPrintRequestInput &
  Readonly<{
    customerId?: string;
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
  updatedAt: Date;
  reviewedByAdminId: string;
  verifiedWeightG: Prisma.Decimal;
}>;

export type CreateDraftQuoteInput = Readonly<{
  additionalSubtotalRp?: Prisma.Decimal;
  estimateId?: string;
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
  additionalSubtotalRp?: Prisma.Decimal;
  calculationSnapshot: Prisma.JsonValue;
  estimateId?: string | null;
  expiresAt: Date | null;
  finalTotalRp: Prisma.Decimal;
  id: string;
  machineSubtotalRp: Prisma.Decimal;
  materialCode: string;
  materialSubtotalRp: Prisma.Decimal;
  printDurationSeconds: number;
  publicTokenHash: string;
  quoteNumber?: string;
  quantity: number;
  request: Readonly<{
    customerId?: string | null;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    referenceNumber?: string;
  }>;
  requestId: string;
  status: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT";
  sentAt?: Date | null;
  unroundedTotalRp: Prisma.Decimal;
  verifiedWeightG: Prisma.Decimal;
  version: number;
}>;

export type QuoteTokenForReissue = Readonly<{
  request?: Readonly<{ customerId: string | null }>;
  expiresAt: Date | null;
  id: string;
  publicTokenHash: string;
  quoteNumber: string;
  status: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT";
}>;

export type AcceptedCustomOrder = Readonly<{
  kind: "ALREADY_ACCEPTED" | "CREATED";
  orderId: string;
  orderNumber: string;
  currentOrderPublicTokenHash?: string;
}>;

export type CustomOrderPaymentPreparation = Readonly<{
  amountRp: Prisma.Decimal;
  created: boolean;
  orderId: string;
  orderNumber: string;
  payment?: Readonly<{ redirectUrl?: string; token?: string }>;
  paymentAttemptId: string;
  paymentExpiresAt: Date;
  paymentProviderOrderId: string;
  status: OrderStatus;
}>;

export type CustomPrintRequestReviewSummary = Readonly<{
  customerId?: string | null;
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

  async findCustomerPreviewFile(fileId: string, customerId: string) {
    return this.prisma.storedFile.findFirst({
      where: { id: fileId, uploadedByCustomerId: customerId, bucketScope: "PRIVATE_CUSTOMER" },
      select: { id: true, extension: true, uploadStatus: true, deletedAt: true,
        customPrintRequestLinks: { select: { requestId: true }, take: 1 },
        b2bInquiryLinks: { select: { inquiryId: true }, take: 1 } },
    });
  }

  async findActiveCustomerPreviewRules() {
    return this.prisma.pricingRuleVersion.findMany({
      where: { code: CUSTOM_PRINT_V1_RULE_CODE, status: "ACTIVE" },
      take: 2,
      select: { id: true, code: true, version: true, definitionJson: true },
    });
  }

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
    const request = await this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        intakeMode: true,
        quantity: true,
        status: true,
        files: { select: { file: { select: { extension: true, uploadStatus: true } } } },
      },
    });
    return request === null ? null : {
      id: request.id,
      intakeMode: request.intakeMode,
      modelReady: request.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension)),
      quantity: request.quantity,
      status: request.status,
    };
  }

  async create(input: CreateCustomPrintRequestInput) {
    return this.prisma.$transaction(async (transaction) => {
      const files = await transaction.storedFile.findMany({
        where: {
          bucketScope: "PRIVATE_CUSTOMER",
          deletedAt: null,
          id: { in: [...new Set(input.fileIds)] },
          uploadStatus: "UPLOADED",
          uploadedByCustomerId: input.customerId ?? null,
        },
        select: { extension: true, id: true },
      });

      if (files.length !== new Set(input.fileIds).size) {
        throw appError("CONFLICT", {
          message: "Satu atau lebih file belum siap dihubungkan ke request.",
        });
      }

      if (input.intakeMode === "MODEL_READY" && !files.every((file) => isModelExtension(file.extension))) {
        throw appError("VALIDATION_ERROR", { message: "Mode model siap hanya menerima file model 3D/CAD." });
      }
      if (input.intakeMode === "REFERENCE_ONLY" && !files.every((file) => isReferencePhotoExtension(file.extension))) {
        throw appError("VALIDATION_ERROR", { message: "Mode referensi hanya menerima satu foto JPG atau PNG." });
      }

      let customerPreviewSnapshot = null;
      if (input.intakeMode === "MODEL_READY" && input.customerPreviewInput !== undefined && files.length === 1) {
        const rules = await transaction.pricingRuleVersion.findMany({
          where: { code: CUSTOM_PRINT_V1_RULE_CODE, status: "ACTIVE" },
          take: 2,
          select: { id: true, code: true, version: true, definitionJson: true },
        });
        if (rules.length === 1) {
          try {
            customerPreviewSnapshot = calculateCustomerPreviewSnapshot({
              fileId: files[0].id,
              fileExtension: files[0].extension,
              materialRequested: input.materialRequested,
              quantity: input.quantity,
              customerPreviewInput: input.customerPreviewInput,
              rule: rules[0],
            });
          } catch (error) {
            if (!isAppError(error) || error.code !== "PRICING_RULE_NOT_APPROVED") throw error;
          }
        }
      }

      const request = await transaction.customPrintRequest.create({
        data: {
          customerPreviewSnapshot: customerPreviewSnapshot ?? undefined,
          colorRequested: input.colorRequested,
          intakeMode: input.intakeMode,
          referenceLink: input.referenceLink,
          customerEmail: input.customerEmail,
          customerId: input.customerId,
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
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "custom_print_requests" WHERE "id" = ${input.requestId}::uuid FOR UPDATE`,
      );
      const request = await transaction.customPrintRequest.findUnique({
        where: { id: input.requestId },
        select: {
          intakeMode: true,
          status: true,
          files: { select: { file: { select: { extension: true, uploadStatus: true } } } },
        },
      });
      if (request === null) throw appError("NOT_FOUND");
      if (!["SUBMITTED", "UNDER_REVIEW", "QUOTE_READY", "QUOTE_SENT"].includes(request.status)) {
        throw appError("CONFLICT", { message: "Status request tidak lagi menerima review slicer." });
      }
      if (request.intakeMode === "REFERENCE_ONLY" &&
        !request.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension))) {
        throw appError("CONFLICT", { message: "Model 3D/CAD terverifikasi diperlukan sebelum review slicer." });
      }
      return transaction.customPrintReview.upsert({
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
    });
  }

  async findForPublicAccess(requestId: string) {
    return this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        customerId: true,
        intakeMode: true,
        publicTokenHash: true,
        referenceNumber: true,
        status: true,
        files: {
          select: { file: { select: { extension: true, uploadStatus: true } } },
        },
      },
    });
  }

  async attachVerifiedModel(input: Readonly<{
    currentTokenHash?: string;
    customerId?: string;
    uploadingCustomerId?: string;
    fileId: string;
    requestId: string;
    unitConfirmation?: string;
  }>): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "custom_print_requests" WHERE "id" = ${input.requestId}::uuid FOR UPDATE`,
      );
      const request = await transaction.customPrintRequest.findUnique({
        where: { id: input.requestId },
        select: {
          customerId: true,
          intakeMode: true,
          publicTokenHash: true,
          review: { select: { id: true } },
          status: true,
        },
      });
      if (request === null ||
        (input.customerId === undefined && input.currentTokenHash === undefined) ||
        (input.customerId !== undefined && request.customerId !== input.customerId) ||
        (input.currentTokenHash !== undefined && request.publicTokenHash !== input.currentTokenHash)) {
        throw appError("UNAUTHORIZED");
      }
      if (request.intakeMode !== "REFERENCE_ONLY" ||
        !["SUBMITTED", "UNDER_REVIEW"].includes(request.status) || request.review !== null) {
        throw appError("CONFLICT", { message: "Request tidak dapat menerima model setelah review slicer." });
      }
      const file = await transaction.storedFile.findUnique({
        where: { id: input.fileId },
        select: { bucketScope: true, extension: true, uploadStatus: true, uploadedByCustomerId: true },
      });
      if (file === null || file.bucketScope !== "PRIVATE_CUSTOMER" ||
        file.uploadStatus !== "UPLOADED" || !isModelExtension(file.extension)) {
        throw appError("CONFLICT", { message: "File model belum siap dihubungkan ke request." });
      }
      if (input.customerId !== undefined
        ? file.uploadedByCustomerId !== input.customerId
        : file.uploadedByCustomerId !== null && file.uploadedByCustomerId !== input.uploadingCustomerId) {
        throw appError("UNAUTHORIZED");
      }
      if (file.extension === "stl" && input.unitConfirmation === undefined) {
        throw appError("VALIDATION_ERROR", { details: { unitConfirmation: "Konfirmasi unit diperlukan untuk STL." } });
      }
      await transaction.customPrintRequestFile.create({
        data: { requestId: input.requestId, fileId: input.fileId },
      });
      const verified = await transaction.storedFile.updateMany({
        where: { id: input.fileId, uploadStatus: "UPLOADED" },
        data: { uploadStatus: "VERIFIED", verifiedAt: new Date() },
      });
      if (verified.count !== 1) {
        throw appError("CONFLICT", { message: "File berubah sebelum terikat ke request." });
      }
      if (input.unitConfirmation !== undefined) {
        await transaction.customPrintRequest.update({
          where: { id: input.requestId },
          data: { unitConfirmation: input.unitConfirmation },
        });
      }
    });
  }

  async rotatePublicToken(input: Readonly<{
    currentHash: string;
    nextHash: string;
    requestId: string;
  }>): Promise<boolean> {
    const updated = await this.prisma.customPrintRequest.updateMany({
      where: { id: input.requestId, publicTokenHash: input.currentHash },
      data: { publicTokenHash: input.nextHash },
    });
    return updated.count === 1;
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
    return this.prisma.$transaction(async (transaction) => {
      // Serialize draft creation per request. The service preflight keeps the
      // UI responsive, while this row lock closes the concurrent-submit race.
      await transaction.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "custom_print_requests"
          WHERE "id" = ${input.requestId}::uuid
          FOR UPDATE
        `,
      );

      const pricingRule = await transaction.pricingRuleVersion.findFirst({
        where: {
          id: input.pricingRuleVersionId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (pricingRule === null) {
        throw appError("PRICING_RULE_NOT_APPROVED");
      }

      const latestEstimate = await transaction.customPrintEstimate.findFirst({
        where: { requestId: input.requestId }, orderBy: { version: "desc" },
        select: { id: true, lowerRp: true, upperRp: true, snapshot: true },
      });
      const request = await transaction.customPrintRequest.findUnique({
        where: { id: input.requestId },
        select: { customerId: true, review: { select: { updatedAt: true } } },
      });
      if (latestEstimate !== null && !isEstimateCurrent(latestEstimate.snapshot, request?.review?.updatedAt)) {
        throw appError("QUOTE_NOT_READY", { message: "Review berubah; terbitkan estimasi versi baru." });
      }
      if (latestEstimate !== null && (input.estimateId !== latestEstimate.id ||
        input.finalTotalRp.lt(latestEstimate.lowerRp) || input.finalTotalRp.gt(latestEstimate.upperRp))) {
        throw appError("QUOTE_NOT_READY", { message: "Draft quote harus memakai estimasi terbaru dan kisarannya." });
      }
      if (latestEstimate === null) {
        if (request?.customerId != null) throw appError("QUOTE_NOT_READY", { message: "Terbitkan estimasi sebelum membuat quote akun customer." });
      }

      const existingDraft = await transaction.customPrintQuote.findFirst({
        where: { requestId: input.requestId, status: "DRAFT" },
        select: { id: true },
      });
      if (existingDraft !== null) {
        throw appError("CONFLICT", {
          message: "Request ini sudah memiliki draft quote. Kirim atau supersede draft tersebut sebelum membuat versi baru.",
        });
      }

      const quote = await transaction.customPrintQuote.create({
        data: {
          additionalSubtotalRp: input.additionalSubtotalRp,
          calculationSnapshot: input.calculationSnapshot,
          createdByAdminId: input.createdByAdminId,
          expiresAt: input.expiresAt,
          estimateId: input.estimateId,
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
    });
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

  async paymentProviderOrderIdExists(providerOrderId: string): Promise<boolean> {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId },
      select: { id: true },
    });

    return attempt !== null;
  }

  async findRequestForReview(
    requestId: string,
  ): Promise<CustomPrintRequestReviewSummary | null> {
    return this.prisma.customPrintRequest.findUnique({
      where: { id: requestId },
      select: { customerId: true, id: true, quantity: true, status: true },
    });
  }

  async findReview(requestId: string): Promise<CustomPrintReviewRecord | null> {
    return this.prisma.customPrintReview.findUnique({ where: { requestId } });
  }

  async findLatestEstimate(requestId: string) {
    return this.prisma.customPrintEstimate.findFirst({
      where: { requestId }, orderBy: { version: "desc" },
      select: { id: true, version: true, pricingRuleVersionId: true, snapshot: true,
        lowerRp: true, upperRp: true, additionalSubtotalRp: true },
    });
  }

  async sendIfCurrent(
    quoteId: string,
    sentAt: Date,
    expiresAt: Date,
    publicTokenHash: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const quoteHint = await transaction.customPrintQuote.findUnique({
        where: { id: quoteId }, select: { requestId: true },
      });
      if (quoteHint === null) throw appError("NOT_FOUND");
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "custom_print_requests" WHERE "id" = ${quoteHint.requestId}::uuid FOR UPDATE`);
      const quote = await transaction.customPrintQuote.findUnique({
        where: { id: quoteId },
        select: { estimateId: true, finalTotalRp: true, requestId: true, status: true,
          request: { select: { customerId: true, review: { select: { updatedAt: true } } } } },
      });

      if (quote === null) {
        throw appError("NOT_FOUND");
      }

      if (quote.status !== "DRAFT") {
        throw appError("QUOTE_NOT_READY");
      }
      const latestEstimate = await transaction.customPrintEstimate.findFirst({
        where: { requestId: quote.requestId }, orderBy: { version: "desc" },
        select: { id: true, lowerRp: true, upperRp: true, snapshot: true },
      });
      if (latestEstimate !== null && !isEstimateCurrent(latestEstimate.snapshot, quote.request.review?.updatedAt)) {
        throw appError("QUOTE_NOT_READY", { message: "Review berubah; terbitkan estimasi versi baru." });
      }
      if (latestEstimate !== null && (quote.estimateId !== latestEstimate.id ||
        quote.finalTotalRp.lt(latestEstimate.lowerRp) || quote.finalTotalRp.gt(latestEstimate.upperRp))) {
        throw appError("QUOTE_NOT_READY", { message: "Quote harus memakai estimasi terbaru dan berada di dalam kisarannya." });
      }
      if (latestEstimate === null && quote.request.customerId !== null) {
        throw appError("QUOTE_NOT_READY", { message: "Terbitkan estimasi sebelum quote akun customer." });
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
        additionalSubtotalRp: true,
        calculationSnapshot: true,
        estimateId: true,
        expiresAt: true,
        finalTotalRp: true,
        id: true,
        machineSubtotalRp: true,
        materialCode: true,
        materialSubtotalRp: true,
        printDurationSeconds: true,
        publicTokenHash: true,
        quoteNumber: true,
        quantity: true,
        request: {
          select: {
            customerId: true,
            customerEmail: true,
            customerName: true,
            customerPhone: true,
          },
        },
        requestId: true,
        status: true,
        sentAt: true,
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
    authorization?: Readonly<{ customerId?: string }>,
  ) {
    const updated = await this.prisma.customPrintQuote.updateMany({
      where: { id: quoteId, status: currentStatus,
        ...(authorization === undefined ? {} : { request: { customerId: authorization.customerId ?? null } }) },
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
    customerId?: string;
    orderId: string;
    orderNumber: string;
    orderPublicTokenHash: string;
    quoteId: string;
    now: Date;
    version: number;
  }>): Promise<AcceptedCustomOrder> {
    return this.prisma.$transaction(async (transaction) => {
      const quoteHint = await transaction.customPrintQuote.findUnique({ where: { id: input.quoteId }, select: { requestId: true } });
      if (quoteHint === null) throw appError("NOT_FOUND");
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "custom_print_requests" WHERE "id" = ${quoteHint.requestId}::uuid FOR UPDATE`);
      const quote = await transaction.customPrintQuote.findUnique({
        where: { id: input.quoteId },
        select: {
          estimateId: true,
          finalTotalRp: true,
          id: true,
          request: {
            select: {
              customerId: true,
              customerEmail: true,
              customerName: true,
              customerPhone: true,
              referenceNumber: true,
              review: { select: { updatedAt: true } },
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
      if (input.customerId === undefined ? quote.request.customerId !== null : quote.request.customerId !== input.customerId) {
        throw appError("UNAUTHORIZED");
      }

      if (quote.status === "ACCEPTED") {
        const existing = await transaction.orderItem.findFirst({
          where: { customQuoteId: quote.id },
          select: { order: { select: { id: true, orderNumber: true, publicTokenHash: true } } },
        });

        if (existing === null) {
          throw appError("CONFLICT", {
            message: "Quote accepted tidak memiliki payable order.",
          });
        }

        return {
          kind: "ALREADY_ACCEPTED",
          currentOrderPublicTokenHash: existing.order.publicTokenHash,
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
      const latestEstimate = await transaction.customPrintEstimate.findFirst({
        where: { requestId: quote.requestId }, orderBy: { version: "desc" },
        select: { id: true, lowerRp: true, upperRp: true, snapshot: true },
      });
      if (latestEstimate !== null && !isEstimateCurrent(latestEstimate.snapshot, quote.request.review?.updatedAt)) {
        throw appError("QUOTE_NOT_READY", { message: "Review berubah; terbitkan estimasi versi baru." });
      }
      if (latestEstimate !== null && (quote.estimateId !== latestEstimate.id ||
        quote.finalTotalRp.lt(latestEstimate.lowerRp) || quote.finalTotalRp.gt(latestEstimate.upperRp))) {
        throw appError("QUOTE_NOT_READY", { message: "Estimasi telah direvisi; terbitkan quote baru." });
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
          customerId: quote.request.customerId,
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

  async prepareOrderPayment(input: Readonly<{
    now: Date;
    orderId: string;
    paymentExpiresAt: Date;
    paymentProvider?: string;
    paymentProviderOrderId: string;
  }>): Promise<CustomOrderPaymentPreparation> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "payment_attempts"
          WHERE "order_id" = ${input.orderId}::uuid
          ORDER BY "id"
          FOR UPDATE
        `,
      );
      await transaction.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${input.orderId}::uuid
          FOR UPDATE
        `,
      );

      const order = await transaction.order.findUnique({
        where: { id: input.orderId },
        select: {
          grandTotalRp: true,
          orderNumber: true,
          orderType: true,
          status: true,
        },
      });

      if (order === null) throw appError("NOT_FOUND");
      if (order.orderType !== "CUSTOM_PRINT") {
        throw appError("CONFLICT", {
          message: "Pembayaran quote hanya tersedia untuk order custom print.",
        });
      }
      if (order.status !== "WAITING_PAYMENT" && order.status !== "PAID") {
        throw appError("CONFLICT", {
          message: "Order quote belum berada pada tahap pembayaran.",
        });
      }

      const existing = await transaction.paymentAttempt.findFirst({
        where: { orderId: input.orderId, purpose: "ORDER_TOTAL" },
        orderBy: { createdAt: "desc" },
        select: {
          amountRp: true,
          expiresAt: true,
          id: true,
          providerOrderId: true,
          redirectUrl: true,
          snapToken: true,
          status: true,
        },
      });

      if (existing !== null) {
        if (existing.status === "PENDING") {
          if (order.status !== "WAITING_PAYMENT" || existing.expiresAt <= input.now) {
            throw appError("CONFLICT", {
              message: "Payment quote kedaluwarsa atau tidak konsisten dengan status order.",
            });
          }

          return {
            amountRp: existing.amountRp,
            created: false,
            orderId: input.orderId,
            orderNumber: order.orderNumber,
            ...(existing.redirectUrl === null && existing.snapToken === null
              ? {}
              : {
                  payment: {
                    ...(existing.redirectUrl === null
                      ? {}
                      : { redirectUrl: existing.redirectUrl }),
                    ...(existing.snapToken === null
                      ? {}
                      : { token: existing.snapToken }),
                  },
                }),
            paymentAttemptId: existing.id,
            paymentExpiresAt: existing.expiresAt,
            paymentProviderOrderId: existing.providerOrderId,
            status: order.status,
          };
        }

        if (order.status === "PAID") {
          return {
            amountRp: existing.amountRp,
            created: false,
            orderId: input.orderId,
            orderNumber: order.orderNumber,
            paymentAttemptId: existing.id,
            paymentExpiresAt: existing.expiresAt,
            paymentProviderOrderId: existing.providerOrderId,
            status: order.status,
          };
        }

        if (
          existing.status !== "EXPIRED" &&
          existing.status !== "FAILED" &&
          existing.status !== "CANCELLED"
        ) {
          throw appError("CONFLICT", {
            message: "Payment quote tidak dapat diganti pada status saat ini.",
          });
        }
      }

      if (order.status !== "WAITING_PAYMENT") {
        throw appError("CONFLICT", {
          message: "Order quote sudah tidak menunggu pembayaran.",
        });
      }

      const paymentAttempt = await transaction.paymentAttempt.create({
        data: {
          amountRp: order.grandTotalRp,
          expiresAt: input.paymentExpiresAt,
          orderId: input.orderId,
          provider: input.paymentProvider ?? "MIDTRANS",
          providerOrderId: input.paymentProviderOrderId,
          purpose: "ORDER_TOTAL",
        },
        select: { id: true },
      });

      return {
        amountRp: order.grandTotalRp,
        created: true,
        orderId: input.orderId,
        orderNumber: order.orderNumber,
        paymentAttemptId: paymentAttempt.id,
        paymentExpiresAt: input.paymentExpiresAt,
        paymentProviderOrderId: input.paymentProviderOrderId,
        status: order.status,
      };
    });
  }

  async attachPaymentProviderResult(
    paymentAttemptId: string,
    result: Readonly<{ redirectUrl?: string; token?: string }>,
  ): Promise<void> {
    await this.prisma.paymentAttempt.update({
      where: { id: paymentAttemptId },
      data: { redirectUrl: result.redirectUrl, snapToken: result.token },
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

  async findDraftForRequest(requestId: string): Promise<Readonly<{ id: string }> | null> {
    return this.prisma.customPrintQuote.findFirst({
      where: { requestId, status: "DRAFT" },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    });
  }

  async replaceOrderPublicTokenHash(input: Readonly<{
    currentHash: string;
    nextHash: string;
    orderId: string;
  }>): Promise<boolean> {
    const updated = await this.prisma.order.updateMany({
      where: { id: input.orderId, publicTokenHash: input.currentHash },
      data: { publicTokenHash: input.nextHash },
    });
    return updated.count === 1;
  }

  async findForTokenReissue(quoteId: string): Promise<QuoteTokenForReissue | null> {
    return this.prisma.customPrintQuote.findUnique({
      where: { id: quoteId },
      select: {
        expiresAt: true,
        id: true,
        publicTokenHash: true,
        quoteNumber: true,
        request: { select: { customerId: true } },
        status: true,
      },
    });
  }

  async replacePublicTokenHash(
    quoteId: string,
    currentHash: string,
    nextHash: string,
  ): Promise<boolean> {
    const updated = await this.prisma.customPrintQuote.updateMany({
      where: { id: quoteId, publicTokenHash: currentHash },
      data: { publicTokenHash: nextHash },
    });
    return updated.count === 1;
  }
}
