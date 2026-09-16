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
  type QuoteTokenForReissue,
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
  findDraftForRequest?(requestId: string): Promise<Readonly<{ id: string }> | null>;
  findLatestVersion(requestId: string): Promise<number | null>;
  findRequestForReview(requestId: string): Promise<Readonly<{
    id: string;
    quantity: number;
    status: "APPROVED" | "CANCELLED" | "DECLINED" | "QUOTE_READY" | "QUOTE_SENT" | "SUBMITTED" | "UNDER_REVIEW";
  }> | null>;
  replaceOrderPublicTokenHash?(input: Readonly<{
    currentHash: string;
    nextHash: string;
    orderId: string;
  }>): Promise<boolean>;
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

export interface QuoteTokenRepository {
  findForTokenReissue(quoteId: string): Promise<QuoteTokenForReissue | null>;
  replacePublicTokenHash(
    quoteId: string,
    currentHash: string,
    nextHash: string,
  ): Promise<boolean>;
}

export type QuoteServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  now?: () => Date;
  randomBytes?: (size: number) => Uint8Array;
  repository?: QuoteServiceRepository;
  tokenRepository?: QuoteTokenRepository;
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

export type PublicQuoteReviewState = "accepted" | "declined" | "expired" | "superseded" | "valid";

export type PublicQuoteReview = Readonly<{
  assumptions: readonly Readonly<{ label: string; value: string; detail: string }>[];
  currency: "IDR";
  expiresAt: Date;
  lines: readonly Readonly<{ label: string; value: string; detail: string }>[];
  quoteNumber: string;
  requestReference: string;
  scope: readonly Readonly<{ label: string; value: string }>[];
  sentAt: Date | null;
  state: PublicQuoteReviewState;
  total: string;
  version: number;
}>;

export class QuoteService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly clock: () => Date;
  private readonly randomBytes?: (size: number) => Uint8Array;
  private readonly repositoryFactory: () => QuoteServiceRepository;
  private readonly tokenRepositoryFactory: () => QuoteTokenRepository;

  constructor(dependencies: QuoteServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.clock = dependencies.now ?? (() => new Date());
    this.randomBytes = dependencies.randomBytes;
    this.repositoryFactory = () =>
      dependencies.repository ?? new CustomPrintQuoteRepository();
    this.tokenRepositoryFactory = () =>
      dependencies.tokenRepository ?? new CustomPrintQuoteRepository();
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

    const existingDraft = repository.findDraftForRequest === undefined
      ? null
      : await repository.findDraftForRequest(parsed.requestId);
    if (existingDraft !== null) {
      throw appError("CONFLICT", {
        message: "Request ini sudah memiliki draft quote. Kirim atau supersede draft tersebut sebelum membuat versi baru.",
      });
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
      includeEntityId: true,
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

      if (
        existing.kind !== "ALREADY_ACCEPTED" ||
        existing.currentOrderPublicTokenHash === undefined ||
        repository.replaceOrderPublicTokenHash === undefined
      ) {
        return {
          kind: existing.kind,
          orderId: existing.orderId,
          orderNumber: existing.orderNumber,
        };
      }

      const orderAccessToken = issueAccessToken({
        entityId: existing.orderId,
        includeEntityId: true,
        now,
        randomBytes: this.randomBytes,
        scope: "ORDER_STATUS",
      });
      const replaced = await repository.replaceOrderPublicTokenHash({
        currentHash: existing.currentOrderPublicTokenHash,
        nextHash: orderAccessToken.tokenHash,
        orderId: existing.orderId,
      });
      if (!replaced) {
        throw appError("CONFLICT", {
          message: "Order berubah sebelum tautan status baru diterbitkan.",
        });
      }

      return {
        kind: existing.kind,
        orderAccessToken,
        orderId: existing.orderId,
        orderNumber: existing.orderNumber,
      };
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
      includeEntityId: true,
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

  async getPublicReview(input: Readonly<{
    now?: Date;
    quoteId: string;
    token: string;
  }>): Promise<PublicQuoteReview> {
    const repository = this.repositoryFactory();
    const quote = await repository.findForAcceptance(input.quoteId);

    if (quote === null) {
      throw appError("UNAUTHORIZED");
    }

    // An expired quote remains readable as a safe, read-only projection so the
    // customer gets a useful recovery message. Accept/decline still verifies
    // expiry and rejects the mutation path below.
    verifyAccessToken({
      entityId: quote.id,
      expectedHash: quote.publicTokenHash,
      now: input.now,
      scope: "CUSTOM_PRINT_QUOTE",
      token: input.token,
    });

    if (quote.status === "DRAFT") {
      throw appError("NOT_FOUND");
    }

    const snapshot = quoteCalculationSnapshotSchema.safeParse(
      quote.calculationSnapshot,
    );

    if (!snapshot.success || quote.expiresAt === null) {
      throw appError("CONFLICT", {
        message: "Snapshot quote publik tidak dapat divalidasi.",
      });
    }

    const now = input.now ?? this.clock();
    const latestVersion = await repository.findLatestVersion(quote.requestId);
    const state: PublicQuoteReviewState =
      quote.status === "ACCEPTED"
        ? "accepted"
        : quote.status === "DECLINED"
          ? "declined"
          : latestVersion !== null && latestVersion > quote.version
            ? "superseded"
            : quote.status === "EXPIRED" || now >= quote.expiresAt
              ? "expired"
              : "valid";
    const sourceLabel = {
      COMMUNAL: "Filament komunal",
      CUSTOMER_OWN: "Filament customer",
      NIUVA_STOCK: "Stok Niuva",
    }[snapshot.data.filamentSource];
    const durationLabel = formatPrintDuration(snapshot.data.printDurationSeconds);
    const weightLabel = `${snapshot.data.weightGrams} g`;
    const configuration = snapshot.data.configurationJson;
    const unitLabel =
      configuration !== undefined && typeof configuration.unit === "string"
        ? configuration.unit
        : "Dikonfirmasi saat review";

    return {
      assumptions: [
        {
          detail: "Nilai slicer yang dibekukan bersama quote.",
          label: "Berat hasil review",
          value: weightLabel,
        },
        {
          detail: "Durasi dari review operator, bukan estimasi browser.",
          label: "Durasi mesin",
          value: durationLabel,
        },
        {
          detail: "Material mengikuti konfigurasi yang ditinjau operator.",
          label: "Sumber filament",
          value: sourceLabel,
        },
        {
          detail: "Ongkir custom dihitung setelah paket final selesai diukur.",
          label: "Pengiriman",
          value: "Belum termasuk",
        },
      ],
      currency: "IDR",
      expiresAt: quote.expiresAt,
      lines: [
        {
          detail: `${snapshot.data.material}, ${weightLabel}, ${quote.quantity} unit`,
          label: "Material",
          value: quote.materialSubtotalRp.toFixed(0),
        },
        {
          detail: durationLabel,
          label: "Waktu mesin",
          value: quote.machineSubtotalRp.toFixed(0),
        },
      ],
      quoteNumber: quote.quoteNumber ?? `Quote ${quote.version}`,
      requestReference: quote.request.referenceNumber ?? quote.requestId,
      scope: [
        { label: "Layanan", value: "Custom 3D Print" },
        { label: "Material", value: snapshot.data.material },
        { label: "Jumlah", value: `${quote.quantity} unit` },
        { label: "Unit model", value: unitLabel },
      ],
      sentAt: quote.sentAt ?? null,
      state,
      total: quote.finalTotalRp.toFixed(0),
      version: quote.version,
    };
  }

  async decline(input: Readonly<{
    now?: Date;
    quoteId: string;
    token: string;
  }>): Promise<Readonly<{ id: string; status: "DECLINED" }>> {
    const now = input.now ?? this.clock();
    const repository = this.repositoryFactory();
    const quote = await repository.findForAcceptance(input.quoteId);

    if (quote === null) {
      throw appError("UNAUTHORIZED");
    }

    verifyAccessToken({
      entityId: quote.id,
      expectedHash: quote.publicTokenHash,
      expiresAt: quote.expiresAt ?? undefined,
      now,
      scope: "CUSTOM_PRINT_QUOTE",
      token: input.token,
    });

    if (quote.status === "DECLINED") {
      return { id: quote.id, status: "DECLINED" };
    }

    if (quote.status !== "SENT") {
      throw appError("QUOTE_NOT_READY");
    }

    const latestVersion = await repository.findLatestVersion(quote.requestId);
    if (latestVersion !== quote.version) {
      throw appError("QUOTE_NOT_READY", {
        message: "Quote ini sudah disupersede oleh versi yang lebih baru.",
      });
    }

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
      next: "DECLINED",
    });
    const declined = await repository.updateStatusIfCurrent(
      quote.id,
      "SENT",
      "DECLINED",
      now,
    );

    if (declined === null) {
      throw appError("CONFLICT", {
        message: "Quote berubah sebelum penolakan selesai.",
      });
    }

    await recordAudit(this.audit, {
      action: "quote.declined",
      actorType: "SYSTEM",
      afterJson: { status: "DECLINED" },
      beforeJson: { status: "SENT" },
      entityId: quote.id,
      entityType: "CustomPrintQuote",
    });

    return { id: declined.id, status: "DECLINED" };
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

  async reissuePublicToken(quoteId: string): Promise<Readonly<{
    accessToken: IssuedAccessToken;
    quoteId: string;
    quoteNumber: string;
  }>> {
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "QUOTE_MANAGE");
    const repository = this.tokenRepositoryFactory();
    const quote = await repository.findForTokenReissue(quoteId);
    if (quote === null) throw appError("NOT_FOUND");
    if (quote.status !== "SENT") {
      throw appError("QUOTE_NOT_READY", {
        message: "Tautan baru hanya dapat diterbitkan untuk quote yang sudah dikirim.",
      });
    }

    const now = this.clock();
    if (quote.expiresAt === null || now >= quote.expiresAt) {
      throw appError("QUOTE_NOT_READY", {
        message: "Quote sudah kedaluwarsa; buat dan kirim quote baru.",
      });
    }

    const accessToken = issueAccessToken({
      entityId: quote.id,
      expiresAt: quote.expiresAt,
      includeEntityId: true,
      now,
      randomBytes: this.randomBytes,
      scope: "CUSTOM_PRINT_QUOTE",
    });
    const replaced = await repository.replacePublicTokenHash(
      quote.id,
      quote.publicTokenHash,
      accessToken.tokenHash,
    );
    if (!replaced) {
      throw appError("CONFLICT", {
        message: "Token quote berubah sebelum tautan baru disimpan.",
      });
    }

    await recordAudit(this.audit, {
      action: "quote.public-token.reissued",
      actorId: admin.profile.id,
      actorType: "ADMIN",
      afterJson: { format: "route-bound-v1" },
      entityId: quote.id,
      entityType: "CustomPrintQuote",
    });

    return {
      accessToken,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
    };
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

function formatPrintDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (hours === 0) {
    return `${minutes} menit`;
  }

  return `${hours} jam${minutes === 0 ? "" : ` ${minutes} menit`}`;
}
