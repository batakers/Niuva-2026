import { randomUUID } from "node:crypto";

import {
  IdempotencyRepository,
} from "@/modules/idempotency/repository";
import type {
  IdempotencyResolution,
  StoredIdempotencyResponse,
} from "@/modules/idempotency/state";
import { recordAudit, type AuditRecorder } from "@/modules/shared/audit";
import {
  issueAccessToken,
} from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { createUniqueHumanReference } from "@/modules/shared/reference";
import { hashRequest } from "@/modules/shared/request-hash";
import { parseWithValidation } from "@/modules/shared/validation";
import { retailReservationExpiresAt } from "@/modules/policy/commercial";

import {
  CheckoutRepository,
  type CheckoutRecoveryState,
  type CheckoutRepositoryPort,
  type CheckoutShippingQuote,
  type PaymentProviderResult,
} from "./repository";
import { checkoutInputSchema, type CheckoutInput } from "./schema";
import type { OrderStatus } from "@/generated/prisma/client";

export interface CheckoutIdempotencyPort {
  complete(input: Readonly<{
    key: string;
    response: StoredIdempotencyResponse;
    responseStatus: number;
    scope: string;
  }>): Promise<unknown>;
  fail?(input: Readonly<{
    key: string;
    response?: StoredIdempotencyResponse;
    responseStatus?: number;
    scope: string;
  }>): Promise<unknown>;
  reserve(input: Readonly<{
    expiresAt: Date;
    key: string;
    requestHash: string;
    scope: string;
  }>, now?: Date): Promise<IdempotencyResolution>;
}

export interface CheckoutShippingProvider {
  getRate(input: Readonly<{
    address: CheckoutInput["address"];
    items: CheckoutInput["items"];
    optionId: string;
  }>): Promise<CheckoutShippingQuote>;
}

export interface CheckoutPaymentProvider {
  readonly provider?: string;
  createPayment(input: Readonly<{
    amountRp: string;
    expiresAt: Date;
    orderId: string;
    orderNumber: string;
    providerOrderId: string;
  }>): Promise<PaymentProviderResult>;
}

export type CheckoutServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  idempotency?: CheckoutIdempotencyPort;
  now?: () => Date;
  paymentProvider?: CheckoutPaymentProvider;
  randomBytes?: (size: number) => Uint8Array;
  repository?: CheckoutRepositoryPort;
  reservationExpiry?: (now: Date) => Date;
  shippingProvider?: CheckoutShippingProvider;
  idempotencyExpiry?: (now: Date) => Date;
}>;

export type CheckoutCreatedResult = Readonly<{
  kind: "CREATED";
  orderAccessToken: ReturnType<typeof issueAccessToken>;
  orderId: string;
  orderNumber: string;
  payment: PaymentProviderResult;
  paymentAttemptId: string;
  totalRp: string;
}>;

export type CheckoutReplayResult = Readonly<{
  kind: "REPLAY";
  orderAccessToken: ReturnType<typeof issueAccessToken>;
  orderId: string;
  orderNumber: string;
  payment: PaymentProviderResult;
  paymentAttemptId: string;
  status: OrderStatus;
  totalRp: string;
}>;

const DEFAULT_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;

export class CheckoutService {
  private readonly audit?: AuditRecorder;
  private readonly clock: () => Date;
  private readonly idempotencyFactory: () => CheckoutIdempotencyPort;
  private readonly idempotencyExpiry: (now: Date) => Date;
  private readonly paymentProvider: CheckoutPaymentProvider;
  private readonly randomBytes?: (size: number) => Uint8Array;
  private readonly reservationExpiry: (now: Date) => Date;
  private readonly repositoryFactory: () => CheckoutRepositoryPort;
  private readonly shippingProvider: CheckoutShippingProvider;

  constructor(dependencies: CheckoutServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.clock = dependencies.now ?? (() => new Date());
    this.idempotencyFactory = () =>
      dependencies.idempotency ?? new IdempotencyRepository();
    this.idempotencyExpiry =
      dependencies.idempotencyExpiry ??
      ((now) => new Date(now.getTime() + DEFAULT_IDEMPOTENCY_TTL_MS));
    this.paymentProvider =
      dependencies.paymentProvider ?? unavailablePaymentProvider;
    this.randomBytes = dependencies.randomBytes;
    this.reservationExpiry =
      dependencies.reservationExpiry ?? retailReservationExpiresAt;
    this.repositoryFactory = () =>
      dependencies.repository ?? new CheckoutRepository();
    this.shippingProvider =
      dependencies.shippingProvider ?? unavailableShippingProvider;
  }

  async create(input: unknown): Promise<CheckoutCreatedResult | CheckoutReplayResult> {
    const parsed = parseWithValidation(checkoutInputSchema, input);
    const now = this.clock();
    const requestHash = hashRequest(parsed);
    const idempotency = this.idempotencyFactory();
    const scope = "checkout.retail";
    const reservationExpiresAt = this.reservationExpiry(now);
    if (
      !Number.isFinite(reservationExpiresAt.getTime()) ||
      reservationExpiresAt <= now
    ) {
      throw appError("CONFLICT", {
        details: { policy: "retail reservation TTL" },
        message: "TTL reservation harus menghasilkan waktu di masa depan.",
      });
    }

    const idempotencyExpiresAt = this.idempotencyExpiry(now);
    if (
      !Number.isFinite(idempotencyExpiresAt.getTime()) ||
      idempotencyExpiresAt <= now
    ) {
      throw appError("CONFLICT", {
        details: { policy: "idempotency TTL" },
        message: "TTL idempotency harus menghasilkan waktu di masa depan.",
      });
    }

    const repository = this.repositoryFactory();

    const resolution = await idempotency.reserve(
      {
        expiresAt: idempotencyExpiresAt,
        key: parsed.idempotencyKey,
        requestHash,
        scope,
      },
      now,
    );

    if (resolution.kind === "REPLAY") {
      return this.recoverReplay(
        parseStoredCheckoutResponse(resolution.response),
        now,
        repository,
      );
    }

    if (resolution.kind === "CONFLICT") {
      throw appError("CONFLICT", {
        details: { reason: resolution.reason },
        message: "Checkout idempotency key tidak dapat dipakai ulang.",
      });
    }

    try {
      const shippingQuote = await this.shippingProvider.getRate({
        address: parsed.address,
        items: parsed.items,
        optionId: parsed.shippingOptionId,
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
      const paymentProviderOrderId = await createUniqueHumanReference({
        exists: (candidate) => repository.paymentProviderOrderIdExists(candidate),
        now,
        prefix: "PAY",
        randomBytes: this.randomBytes,
      });
      const transactionResult = await repository.createCheckoutTransaction({
        address: parsed.address,
        customerEmail: parsed.customerEmail,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        items: parsed.items,
        now,
        orderId,
        orderNumber,
        orderPublicTokenHash: orderAccessToken.tokenHash,
        paymentProvider: this.paymentProvider.provider,
        paymentProviderOrderId,
        reservationExpiresAt,
        shippingQuote,
      });

      const payment = await this.paymentProvider.createPayment({
        amountRp: transactionResult.grandTotalRp.toString(),
        expiresAt: reservationExpiresAt,
        orderId: transactionResult.orderId,
        orderNumber: transactionResult.orderNumber,
        providerOrderId: paymentProviderOrderId,
      });
      await repository.attachPaymentProviderResult(
        transactionResult.paymentAttemptId,
        payment,
      );

      const response: StoredIdempotencyResponse = {
        grandTotalRp: transactionResult.grandTotalRp.toString(),
        orderId: transactionResult.orderId,
        orderNumber: transactionResult.orderNumber,
        paymentAttemptId: transactionResult.paymentAttemptId,
        status: "PENDING_PAYMENT",
      };
      await idempotency.complete({
        key: parsed.idempotencyKey,
        response,
        responseStatus: 201,
        scope,
      });

      await recordAudit(this.audit, {
        action: "checkout.created",
        actorType: "SYSTEM",
        afterJson: response,
        entityId: transactionResult.orderId,
        entityType: "Order",
        metadata: { operation: "checkout", status: "PENDING_PAYMENT" },
      });

      return {
        kind: "CREATED",
        orderAccessToken,
        orderId: transactionResult.orderId,
        orderNumber: transactionResult.orderNumber,
        payment,
        paymentAttemptId: transactionResult.paymentAttemptId,
        totalRp: transactionResult.grandTotalRp.toString(),
      };
    } catch (error) {
      try {
        await idempotency.fail?.({
          key: parsed.idempotencyKey,
          responseStatus: 500,
          scope,
        });
      } catch {
        // Preserve the authoritative checkout/provider error if the recovery
        // record itself is temporarily unavailable.
      }
      throw error;
    }
  }

  private async recoverReplay(
    response: StoredIdempotencyResponse,
    now: Date,
    repository: CheckoutRepositoryPort,
  ): Promise<CheckoutReplayResult> {
    const stored = parseStoredCheckoutResponse(response);
    const recovery = await repository.findForRecovery({
      orderId: stored.orderId!,
      paymentAttemptId: stored.paymentAttemptId!,
    });

    if (recovery === null) {
      throw appError("INTERNAL_ERROR", {
        message: "Recovery checkout tidak menemukan order/payment yang konsisten.",
      });
    }

    const orderAccessToken = issueAccessToken({
      entityId: recovery.orderId,
      includeEntityId: true,
      now,
      randomBytes: this.randomBytes,
      scope: "ORDER_STATUS",
    });
    const replaced = await repository.replacePublicTokenHash(
      recovery.orderId,
      recovery.publicTokenHash,
      orderAccessToken.tokenHash,
    );

    if (!replaced) {
      throw appError("CONFLICT", {
        message: "Token status order berubah. Ulangi checkout dengan permintaan yang sama.",
      });
    }

    const payment = paymentHandoff(recovery, now);
    await recordAudit(this.audit, {
      action: "checkout.replayed",
      actorType: "SYSTEM",
      afterJson: { status: recovery.status },
      entityId: recovery.orderId,
      entityType: "Order",
      metadata: { operation: "checkout-replay", result: "RECOVERED" },
    });

    return {
      kind: "REPLAY",
      orderAccessToken,
      orderId: recovery.orderId,
      orderNumber: recovery.orderNumber,
      payment,
      paymentAttemptId: recovery.paymentAttemptId,
      status: recovery.status,
      totalRp: recovery.grandTotalRp,
    };
  }
}

function paymentHandoff(
  recovery: CheckoutRecoveryState,
  now: Date,
): PaymentProviderResult {
  if (
    recovery.status !== "PENDING_PAYMENT" ||
    recovery.paymentStatus !== "PENDING" ||
    recovery.paymentExpiresAt <= now
  ) {
    return {};
  }

  return {
    ...(recovery.paymentProvider === undefined
      ? {}
      : { provider: recovery.paymentProvider }),
    ...(recovery.paymentRedirectUrl === null
      ? {}
      : { redirectUrl: recovery.paymentRedirectUrl }),
    ...(recovery.paymentToken === undefined || recovery.paymentToken === null
      ? {}
      : { token: recovery.paymentToken }),
  };
}

function parseStoredCheckoutResponse(
  response: unknown,
): StoredIdempotencyResponse {
  if (response === null || typeof response !== "object" || Array.isArray(response)) {
    throw appError("INTERNAL_ERROR");
  }

  const candidate = response as Record<string, unknown>;
  const fields = ["grandTotalRp", "orderId", "orderNumber", "paymentAttemptId", "status"];

  if (
    !fields.every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) ||
    candidate.status !== "PENDING_PAYMENT"
  ) {
    throw appError("INTERNAL_ERROR");
  }

  return {
    grandTotalRp: candidate.grandTotalRp as string,
    orderId: candidate.orderId as string,
    orderNumber: candidate.orderNumber as string,
    paymentAttemptId: candidate.paymentAttemptId as string,
    status: candidate.status as string,
  };
}

const unavailableShippingProvider: CheckoutShippingProvider = {
  async getRate() {
    throw appError("SHIPPING_PROVIDER_UNAVAILABLE");
  },
};

const unavailablePaymentProvider: CheckoutPaymentProvider = {
  async createPayment() {
    throw appError("PAYMENT_VERIFICATION_FAILED", {
      message: "Payment provider belum dikonfigurasi.",
    });
  },
};
