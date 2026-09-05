import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { AdminAccess } from "@/lib/auth/clerk";
import { requireAdmin } from "@/lib/auth/clerk";
import {
  createTransitionAuditRecorder,
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import {
  issueAccessToken,
  verifyAccessToken,
  type IssuedAccessToken,
} from "@/modules/shared/access-token";
import type { Prisma } from "@/generated/prisma/client";
import { appError, isAppError } from "@/modules/shared/errors";
import { createUniqueHumanReference } from "@/modules/shared/reference";
import { parseWithValidation } from "@/modules/shared/validation";
import { calculatePrintQuote } from "@/modules/pricing/calculator";
import {
  CUSTOM_PRINT_V1_RULE_CODE,
  CUSTOM_PRINT_V1_RULE_VERSION,
  customPrintPricingPolicySchema,
  parseActiveCustomPrintPricingPolicy,
  type CustomPrintPricingPolicy,
} from "@/modules/pricing/policy";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { quoteExpiresAt } from "@/modules/policy/commercial";

import {
  CustomPrintQuoteRepository,
  type AcceptedCustomOrder,
  type CustomPrintReviewRecord,
  type QuoteForAcceptance,
} from "@/modules/custom-print/repository";

import { transitionQuote } from "./transitions";

const safeSnapshotValue = z.union([
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.null(),
]);
const safeConfigurationSchema = z.record(z.string(), safeSnapshotValue);

export const createQuoteDraftSchema = z.object({
  configurationJson: safeConfigurationSchema.optional(),
  filamentSource: z.enum(["NIUVA_STOCK", "CUSTOMER_OWN", "COMMUNAL"]),
  materialCode: z.enum(["PLA", "ABS"]),
  pricingRuleVersionId: z.uuid(),
  requestId: z.uuid(),
}).strict();

export const acceptQuoteSchema = z.object({
  now: z.date().optional(),
  quoteId: z.uuid(),
  token: z.string().trim().min(1),
});

type AuthorizeAdmin = () => Promise<AdminAccess>;

export interface QuoteServiceRepository {
  acceptAndCreatePayableOrder(input: Readonly<{
    now: Date;
    orderId: string;
    orderNumber: string;
    orderPublicTokenHash: string;
    quoteId: string;
    version: number;
  }>): Promise<AcceptedCustomOrder>;
  createDraft(input: Readonly<{
    calculationSnapshot: Prisma.InputJsonObject;
    createdByAdminId: string;
    expiresAt?: Date;
    finalTotalRp: Prisma.Decimal;
    id: string;
    machineSubtotalRp: Prisma.Decimal;
    materialCode: string;
    materialSubtotalRp: Prisma.Decimal;
    pricingRuleVersionId: string;
    printDurationSeconds: number;
    publicTokenHash: string;
    quantity: number;
    quoteNumber: string;
    requestId: string;
    unroundedTotalRp: Prisma.Decimal;
    verifiedWeightG: Prisma.Decimal;
    version: number;
  }>): Promise<Readonly<{ id: string; quoteNumber: string; status: "DRAFT" }>>;
  findForAcceptance(quoteId: string): Promise<QuoteForAcceptance | null>;
  findActivePricingRuleVersion(pricingRuleVersionId: string): Promise<Readonly<{
    code: string;
    definitionJson: unknown;
    id: string;
    version: number;
  }> | null>;
  findLatestVersion(requestId: string): Promise<number | null>;
  findRequestForReview(requestId: string): Promise<Readonly<{
    id: string;
    quantity: number;
    status: "APPROVED" | "CANCELLED" | "DECLINED" | "QUOTE_READY" | "QUOTE_SENT" | "SUBMITTED" | "UNDER_REVIEW";
  }> | null>;
  findReview(requestId: string): Promise<CustomPrintReviewRecord | null>;
  orderNumberExists(orderNumber: string): Promise<boolean>;
  quoteNumberExists(quoteNumber: string): Promise<boolean>;
  sendIfCurrent(
    quoteId: string,
    sentAt: Date,
    expiresAt: Date,
    publicTokenHash: string,
  ): Promise<Readonly<{
    id: string;
    requestId: string;
    status: "SENT";
  }> | null>;
  updateStatusIfCurrent(
    quoteId: string,
    currentStatus: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT",
    nextStatus: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT",
    timestamp: Date,
  ): Promise<Readonly<{ id: string; status: "ACCEPTED" | "DECLINED" | "DRAFT" | "EXPIRED" | "SENT" }> | null>;
}

export type QuoteServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  now?: () => Date;
  randomBytes?: (size: number) => Uint8Array;
  repository?: QuoteServiceRepository;
}>;

export type CreatedQuoteDraft = Readonly<{
  quote: Readonly<{ id: string; quoteNumber: string; status: "DRAFT" }>;
}>;

export type AcceptedQuote = Readonly<{
  kind: AcceptedCustomOrder["kind"];
  orderAccessToken?: IssuedAccessToken;
  orderId: string;
  orderNumber: string;
}>;

export class QuoteService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly clock: () => Date;
  private readonly randomBytes?: (size: number) => Uint8Array;
  private readonly repositoryFactory: () => QuoteServiceRepository;

  constructor(dependencies: QuoteServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.clock = dependencies.now ?? (() => new Date());
    this.randomBytes = dependencies.randomBytes;
    this.repositoryFactory = () =>
      dependencies.repository ?? new CustomPrintQuoteRepository();
  }

  async createDraft(input: unknown): Promise<CreatedQuoteDraft> {
    const parsed = parseWithValidation(createQuoteDraftSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "QUOTE_MANAGE");
    const repository = this.repositoryFactory();
    const pricingRule = await repository.findActivePricingRuleVersion(
      parsed.pricingRuleVersionId,
    );

    if (pricingRule === null) {
      throw appError("PRICING_RULE_NOT_APPROVED");
    }

    const pricingPolicy = parseActiveCustomPrintPricingPolicy(
      pricingRule.definitionJson,
    );

    if (
      pricingRule.code !== pricingPolicy.code ||
      pricingRule.version !== pricingPolicy.version
    ) {
      throw appError("PRICING_RULE_NOT_APPROVED", {
        message: "Metadata pricing rule aktif tidak sesuai definisinya.",
      });
    }

    const request = await repository.findRequestForReview(parsed.requestId);

    if (request === null) {
      throw appError("NOT_FOUND");
    }

    if (request.status !== "QUOTE_READY" && request.status !== "QUOTE_SENT") {
      throw appError("QUOTE_NOT_READY");
    }

    const review = await repository.findReview(parsed.requestId);
    if (review === null) {
      throw appError("QUOTE_NOT_READY");
    }

    const calculation = calculateFromReview(parsed, review, pricingPolicy);
    const now = this.clock();

    const version = nextVersion(await repository.findLatestVersion(parsed.requestId));
    const id = randomUUID();
    const reservedToken = issueAccessToken({
      entityId: id,
      now,
      randomBytes: this.randomBytes,
      scope: "CUSTOM_PRINT_QUOTE",
    });
    const quoteNumber = await createUniqueHumanReference({
      exists: (candidate) => repository.quoteNumberExists(candidate),
      now,
      prefix: "QUO",
      randomBytes: this.randomBytes,
    });
    const quote = await repository.createDraft({
      calculationSnapshot: createCalculationSnapshot(
        parsed,
        pricingPolicy,
        pricingRule,
        review,
      ),
      createdByAdminId: admin.profile.id,
      finalTotalRp: calculation.finalTotalRp,
      id,
      machineSubtotalRp: calculation.machineSubtotalRp,
      materialCode: parsed.materialCode,
      materialSubtotalRp: calculation.materialSubtotalRp,
      pricingRuleVersionId: parsed.pricingRuleVersionId,
      printDurationSeconds: review.printDurationSeconds,
      publicTokenHash: reservedToken.tokenHash,
      quantity: review.quantity,
      quoteNumber,
      requestId: parsed.requestId,
      unroundedTotalRp: calculation.unroundedTotalRp,
      verifiedWeightG: new Decimal(review.verifiedWeightG.toString()),
      version,
    });

    await recordAudit(this.audit, {
      action: "quote.draft.created",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: {
        finalTotalRp: calculation.finalTotalRp.toString(),
        pricingRuleCode: pricingRule.code,
        pricingRuleVersion: pricingRule.version,
        quoteNumber,
        version,
      },
      entityId: quote.id,
      entityType: "CustomPrintQuote",
    });

    return { quote };
  }

  async send(quoteId: string) {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "QUOTE_MANAGE");
    const repository = this.repositoryFactory();
    const quote = await repository.findForAcceptance(quoteId);

    if (quote === null) {
      throw appError("NOT_FOUND");
    }

    const transitionAudit =
      this.audit === undefined
        ? undefined
        : createTransitionAuditRecorder(this.audit, {
            actorId: admin.profile.id,
            actorType: "ADMIN",
          });
    await transitionQuote({
      audit: transitionAudit,
      current: quote.status,
      entityId: quote.id,
      next: "SENT",
    });
    const sentAt = this.clock();
    const expiresAt = quoteExpiresAt(sentAt);
    const accessToken = issueAccessToken({
      entityId: quote.id,
      expiresAt,
      now: sentAt,
      randomBytes: this.randomBytes,
      scope: "CUSTOM_PRINT_QUOTE",
    });
    const sent = await repository.sendIfCurrent(
      quote.id,
      sentAt,
      expiresAt,
      accessToken.tokenHash,
    );

    if (sent === null) {
      throw appError("CONFLICT", {
        message: "Quote berubah sebelum dikirim.",
      });
    }

    await recordAudit(this.audit, {
      action: "quote.sent",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: {
        expiresAt: expiresAt.toISOString(),
        sentAt: sentAt.toISOString(),
        status: "SENT",
      },
      beforeJson: { status: quote.status },
      entityId: quote.id,
      entityType: "CustomPrintQuote",
    });

    return { ...sent, accessToken };
  }

  async accept(input: unknown): Promise<AcceptedQuote> {
    const parsed = parseWithValidation(acceptQuoteSchema, input);
    const now = parsed.now ?? this.clock();
    const repository = this.repositoryFactory();
    const quote = await repository.findForAcceptance(parsed.quoteId);

    if (quote === null) {
      throw appError("UNAUTHORIZED");
    }

    try {
      verifyAccessToken({
        entityId: quote.id,
        expectedHash: quote.publicTokenHash,
        expiresAt: quote.expiresAt ?? undefined,
        now,
        scope: "CUSTOM_PRINT_QUOTE",
        token: parsed.token,
      });
    } catch (error) {
      if (isAppError(error) && error.code === "UNAUTHORIZED") {
        throw error;
      }
      throw appError("UNAUTHORIZED");
    }

    if (quote.status === "ACCEPTED") {
      const existing = await repository.acceptAndCreatePayableOrder({
        now,
        orderId: randomUUID(),
        orderNumber: "REPLAY",
        orderPublicTokenHash: "REPLAY",
        quoteId: quote.id,
        version: quote.version,
      });

      return existing;
    }

    if (quote.status !== "SENT") {
      throw appError("QUOTE_NOT_READY");
    }

    if (quote.expiresAt !== null && now >= quote.expiresAt) {
      throw appError("QUOTE_NOT_READY", {
        message: "Quote sudah kedaluwarsa dan tidak dapat diterima.",
      });
    }

    const latestVersion = await repository.findLatestVersion(quote.requestId);
    if (latestVersion !== quote.version) {
      throw appError("QUOTE_NOT_READY", {
        message: "Quote ini sudah disupersede oleh versi yang lebih baru.",
      });
    }

    assertQuoteStillMatchesCalculation(quote);
    const transitionAudit =
      this.audit === undefined
        ? undefined
        : createTransitionAuditRecorder(this.audit, {
            actorType: "SYSTEM",
          });
    await transitionQuote({
      audit: transitionAudit,
      current: quote.status,
      entityId: quote.id,
      next: "ACCEPTED",
    });

    const orderId = randomUUID();
    const orderAccessToken = issueAccessToken({
      entityId: orderId,
      randomBytes: this.randomBytes,
      scope: "ORDER_STATUS",
    });
    const orderNumber = await createUniqueHumanReference({
      exists: (candidate) => repository.orderNumberExists(candidate),
      now,
      prefix: "ORD",
      randomBytes: this.randomBytes,
    });
    const accepted = await repository.acceptAndCreatePayableOrder({
      now,
      orderId,
      orderNumber,
      orderPublicTokenHash: orderAccessToken.tokenHash,
      quoteId: quote.id,
      version: quote.version,
    });

    await recordAudit(this.audit, {
      action: "quote.accepted",
      actorType: "SYSTEM",
      afterJson: {
        orderId: accepted.orderId,
        orderNumber: accepted.orderNumber,
        status: "ACCEPTED",
      },
      entityId: quote.id,
      entityType: "CustomPrintQuote",
    });

    return {
      ...accepted,
      orderAccessToken: accepted.kind === "CREATED" ? orderAccessToken : undefined,
    };
  }

  async expire(quoteId: string) {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "QUOTE_MANAGE");
    const repository = this.repositoryFactory();
    const quote = await repository.findForAcceptance(quoteId);

    if (quote === null) {
      throw appError("NOT_FOUND");
    }

    const now = this.clock();
    if (quote.expiresAt === null || now < quote.expiresAt) {
      throw appError("CONFLICT", {
        message: "Quote belum melewati waktu expiry yang tersimpan.",
      });
    }

    await transitionQuote({
      allowExpiry: true,
      audit:
        this.audit === undefined
          ? undefined
          : createTransitionAuditRecorder(this.audit, {
              actorId: admin.profile.id,
              actorType: "ADMIN",
            }),
      current: quote.status,
      entityId: quote.id,
      next: "EXPIRED",
    });
    const expired = await repository.updateStatusIfCurrent(
      quote.id,
      "SENT",
      "EXPIRED",
      now,
    );

    if (expired === null) {
      throw appError("CONFLICT", {
        message: "Quote berubah sebelum expiry dicatat.",
      });
    }

    await recordAudit(this.audit, {
      action: "quote.expired",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { status: "EXPIRED" },
      beforeJson: { status: "SENT" },
      entityId: quote.id,
      entityType: "CustomPrintQuote",
    });

    return expired;
  }
}

function nextVersion(latestVersion: number | null): number {
  if (latestVersion === null) {
    return 1;
  }

  if (!Number.isSafeInteger(latestVersion) || latestVersion < 1) {
    throw appError("CONFLICT", { message: "Versi quote terakhir tidak valid." });
  }

  return latestVersion + 1;
}

function calculateFromReview(
  input: z.infer<typeof createQuoteDraftSchema>,
  review: CustomPrintReviewRecord,
  policy: CustomPrintPricingPolicy,
) {
  if (review.materialCode !== input.materialCode) {
    throw appError("CONFLICT", {
      message: "Material quote harus sama dengan hasil review operator.",
    });
  }

  return calculatePrintQuote({
    filamentSource: input.filamentSource,
    material: input.materialCode,
    policy,
    printDurationSeconds: review.printDurationSeconds,
    quantity: review.quantity,
    weightGrams: new Decimal(review.verifiedWeightG.toString()),
  });
}

function createCalculationSnapshot(
  input: z.infer<typeof createQuoteDraftSchema>,
  policy: CustomPrintPricingPolicy,
  pricingRule: Readonly<{ code: string; version: number }>,
  review: CustomPrintReviewRecord,
): Prisma.InputJsonObject {
  const snapshot: Prisma.InputJsonObject = {
    filamentSource: input.filamentSource,
    material: input.materialCode,
    policy,
    printDurationSeconds: review.printDurationSeconds,
    pricingRule: {
      code: pricingRule.code,
      version: pricingRule.version,
    },
    quantity: review.quantity,
    weightGrams: review.verifiedWeightG.toString(),
  };

  const configurationJson = input.configurationJson ?? review.configurationJson;
  if (configurationJson !== undefined && configurationJson !== null) {
    const parsedConfiguration = safeConfigurationSchema.safeParse(configurationJson);
    if (!parsedConfiguration.success) {
      throw appError("CONFLICT", {
        message: "Konfigurasi review tidak dapat dibekukan sebagai snapshot quote.",
      });
    }
    return { ...snapshot, configurationJson: parsedConfiguration.data };
  }

  return snapshot;
}

function assertQuoteStillMatchesCalculation(quote: QuoteForAcceptance): void {
  const snapshot = quoteCalculationSnapshotSchema.safeParse(quote.calculationSnapshot);

  if (!snapshot.success) {
    throw appError("CONFLICT", {
      message: "Snapshot pricing quote tidak dapat divalidasi ulang.",
    });
  }

  const calculation = calculatePrintQuote(snapshot.data);
  const matches =
    calculation.finalTotalRp.eq(quote.finalTotalRp) &&
    calculation.machineSubtotalRp.eq(quote.machineSubtotalRp) &&
    calculation.materialSubtotalRp.eq(quote.materialSubtotalRp) &&
    calculation.unroundedTotalRp.eq(quote.unroundedTotalRp) &&
    new Decimal(snapshot.data.weightGrams).eq(quote.verifiedWeightG) &&
    snapshot.data.quantity === quote.quantity &&
    snapshot.data.printDurationSeconds === quote.printDurationSeconds &&
    snapshot.data.material === quote.materialCode;

  if (!matches) {
    throw appError("CONFLICT", {
      message: "Harga quote berubah; quote harus dibuat ulang.",
    });
  }
}

const quoteCalculationSnapshotSchema = z.object({
  configurationJson: safeConfigurationSchema.optional(),
  filamentSource: z.enum(["NIUVA_STOCK", "CUSTOMER_OWN", "COMMUNAL"]),
  material: z.enum(["PLA", "ABS"]),
  policy: customPrintPricingPolicySchema,
  printDurationSeconds: z.int().nonnegative(),
  pricingRule: z
    .object({
      code: z.literal(CUSTOM_PRINT_V1_RULE_CODE),
      version: z.literal(CUSTOM_PRINT_V1_RULE_VERSION),
    })
    .strict(),
  quantity: z.int().positive(),
  weightGrams: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
});
