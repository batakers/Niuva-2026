import Decimal from "decimal.js";

import {
  Prisma,
  type PaymentAttemptStatus,
  type PaymentPurpose,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { lockVariant } from "@/modules/inventory/repository";

import {
  getMidtransPaymentStatus,
  type MidtransNotification,
  type MidtransPaymentStatus,
} from "./midtrans";
import { minimizePaymentEventPayload } from "./payload";
import { transitionPayment } from "./transitions";
import {
  transitionCustomOrder,
  transitionRetailOrder,
} from "@/modules/order/transitions";

export type MidtransWebhookResult = Readonly<{
  kind:
    | "AMOUNT_MISMATCH"
    | "DUPLICATE"
    | "LATE_SETTLEMENT_REFUND_REQUIRED"
    | "PARTIAL_REFUND_REQUIRES_EXCEPTION"
    | "PROCESSED"
    | "STALE"
    | "UNKNOWN_PAYMENT";
  orderId?: string;
  paymentAttemptId?: string;
  processingResult: string;
}>;

export type ProcessMidtransWebhookInput = Readonly<{
  eventFingerprint: string;
  notification: MidtransNotification;
  now: Date;
}>;

type LockedPaymentAttempt = Readonly<{
  id: string;
  orderId: string;
}>;

type WebhookPaymentAttempt = Readonly<{
  amountRp: Prisma.Decimal;
  expiresAt: Date;
  id: string;
  order: Readonly<{
    id: string;
    orderType: "CUSTOM_PRINT" | "RETAIL";
    status: string;
  }>;
  purpose: PaymentPurpose;
  status: PaymentAttemptStatus;
}>;

export class PaymentWebhookRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async processMidtransWebhook(
    input: ProcessMidtransWebhookInput,
  ): Promise<MidtransWebhookResult> {
    return this.prisma.$transaction(async (transaction) => {
      let eventId: string;

      try {
        const event = await transaction.paymentEvent.create({
          data: {
            eventFingerprint: input.eventFingerprint,
            payloadJson: minimizePaymentEventPayload(toEventPayload(input.notification)),
            provider: "MIDTRANS",
            providerOrderId: input.notification.orderId,
            providerTransactionId: input.notification.transactionId,
            processingResult: "RECEIVED",
          },
          select: { id: true },
        });
        eventId = event.id;
      } catch (error) {
        if (isUniqueViolation(error)) {
          return {
            kind: "DUPLICATE",
            processingResult: "DUPLICATE",
          };
        }

        throw error;
      }

      const lockedAttempts = await transaction.$queryRaw<LockedPaymentAttempt[]>(
        Prisma.sql`
          SELECT "id", "order_id" AS "orderId"
          FROM "payment_attempts"
          WHERE "provider_order_id" = ${input.notification.orderId}
          FOR UPDATE
        `,
      );
      const lockedAttempt = lockedAttempts[0];

      if (lockedAttempt === undefined) {
        return finalizeEvent(transaction, eventId, {
          kind: "UNKNOWN_PAYMENT",
          processingResult: "UNKNOWN_PAYMENT",
        });
      }

      await transaction.$queryRaw(
        Prisma.sql`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${lockedAttempt.orderId}::uuid
          FOR UPDATE
        `,
      );

      const attempt = await transaction.paymentAttempt.findUniqueOrThrow({
        where: { id: lockedAttempt.id },
        include: {
          order: {
            select: {
              id: true,
              orderType: true,
              status: true,
            },
          },
        },
      });

      if (!new Decimal(attempt.amountRp.toString()).equals(input.notification.grossAmount)) {
        return finalizeEvent(transaction, eventId, {
          kind: "AMOUNT_MISMATCH",
          orderId: attempt.order.id,
          paymentAttemptId: attempt.id,
          processingResult: "AMOUNT_MISMATCH",
        }, attempt.id);
      }

      if (input.notification.transactionId !== undefined) {
        const existingTransaction = await transaction.paymentAttempt.findFirst({
          where: {
            NOT: { id: attempt.id },
            providerTransactionId: input.notification.transactionId,
          },
          select: { id: true },
        });

        if (existingTransaction !== null) {
          return finalizeEvent(transaction, eventId, {
            kind: "STALE",
            orderId: attempt.order.id,
            paymentAttemptId: attempt.id,
            processingResult: "PROVIDER_TRANSACTION_CONFLICT",
          }, attempt.id);
        }
      }

      const targetStatus = getMidtransPaymentStatus(input.notification);

      if (
        targetStatus === "SETTLED" &&
        input.notification.statusCode !== "200"
      ) {
        return finalizeEvent(transaction, eventId, {
          kind: "AMOUNT_MISMATCH",
          orderId: attempt.order.id,
          paymentAttemptId: attempt.id,
          processingResult: "SETTLEMENT_STATUS_CODE_INVALID",
        }, attempt.id);
      }

      return processPaymentState({
        attempt,
        eventId,
        input,
        targetStatus,
        transaction,
      });
    });
  }
}

async function processPaymentState(input: Readonly<{
  attempt: WebhookPaymentAttempt;
  eventId: string;
  input: ProcessMidtransWebhookInput;
  targetStatus: MidtransPaymentStatus;
  transaction: Prisma.TransactionClient;
}>): Promise<MidtransWebhookResult> {
  const { attempt, eventId, targetStatus, transaction } = input;
  const { notification, now } = input.input;
  const providerTransactionData: Readonly<{ providerTransactionId?: string }> = notification.transactionId === undefined
    ? {}
    : { providerTransactionId: notification.transactionId };

  if (targetStatus === "PENDING") {
    if (attempt.status === "PENDING" && notification.transactionId !== undefined) {
      await transaction.paymentAttempt.update({
        where: { id: attempt.id },
        data: providerTransactionData,
      });
    }

    return finalizeEvent(transaction, eventId, {
      kind: "PROCESSED",
      orderId: attempt.order.id,
      paymentAttemptId: attempt.id,
      processingResult: "PENDING",
    }, attempt.id);
  }

  if (targetStatus === "SETTLED") {
    const expectedOrderStatus = expectedPayableOrderStatus(attempt);

    if (attempt.status === "PENDING" && attempt.expiresAt <= now) {
      await expirePendingAttemptAndCancelPayableOrder({
        attempt,
        now,
        providerTransactionData,
        transaction,
      });

      return finalizeEvent(transaction, eventId, {
        kind: "LATE_SETTLEMENT_REFUND_REQUIRED",
        orderId: attempt.order.id,
        paymentAttemptId: attempt.id,
        processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED",
      }, attempt.id);
    }

    if (
      attempt.status !== "PENDING" ||
      expectedOrderStatus === undefined ||
      attempt.order.status !== expectedOrderStatus
    ) {
      if (notification.transactionId !== undefined) {
        await transaction.paymentAttempt.update({
          where: { id: attempt.id },
          data: providerTransactionData,
        });
      }

      return finalizeEvent(transaction, eventId, {
        kind: "LATE_SETTLEMENT_REFUND_REQUIRED",
        orderId: attempt.order.id,
        paymentAttemptId: attempt.id,
        processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED",
      }, attempt.id);
    }

    if (attempt.purpose === "ORDER_TOTAL" && attempt.order.orderType === "RETAIL") {
      const reservationsConsumed = await consumeRetailReservations(
        transaction,
        attempt.order.id,
        now,
      );

      if (!reservationsConsumed) {
        return finalizeEvent(transaction, eventId, {
          kind: "LATE_SETTLEMENT_REFUND_REQUIRED",
          orderId: attempt.order.id,
          paymentAttemptId: attempt.id,
          processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED",
        }, attempt.id);
      }
    }

    await transitionPayment({
      current: attempt.status,
      entityId: attempt.id,
      next: "SETTLED",
    });

    if (attempt.purpose === "CUSTOM_SHIPPING") {
      await transitionCustomOrder({
        current: attempt.order.status as "WAITING_SHIPPING_PAYMENT",
        entityId: attempt.order.id,
        next: "READY_TO_SHIP",
      });
      await transaction.order.update({
        where: { id: attempt.order.id },
        data: { status: "READY_TO_SHIP" },
      });
    } else if (attempt.order.orderType === "RETAIL") {
      await transitionRetailOrder({
        current: attempt.order.status as "PENDING_PAYMENT",
        entityId: attempt.order.id,
        next: "PAID",
      });
      await transaction.order.update({
        where: { id: attempt.order.id },
        data: { paidAt: now, status: "PAID" },
      });
    } else {
      await transitionCustomOrder({
        current: attempt.order.status as "WAITING_PAYMENT",
        entityId: attempt.order.id,
        next: "PAID",
      });
      await transaction.order.update({
        where: { id: attempt.order.id },
        data: { paidAt: now, status: "PAID" },
      });
    }

    await transaction.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        ...providerTransactionData,
        settledAt: now,
        status: "SETTLED",
      },
    });

    return finalizeEvent(transaction, eventId, {
      kind: "PROCESSED",
      orderId: attempt.order.id,
      paymentAttemptId: attempt.id,
      processingResult: "SETTLED",
    }, attempt.id);
  }

  if (targetStatus === "REFUNDED") {
    if (notification.transactionStatus === "partial_refund") {
      return finalizeEvent(transaction, eventId, {
        kind: "PARTIAL_REFUND_REQUIRES_EXCEPTION",
        orderId: attempt.order.id,
        paymentAttemptId: attempt.id,
        processingResult: "PARTIAL_REFUND_REQUIRES_EXCEPTION",
      }, attempt.id);
    }

    if (attempt.status !== "SETTLED") {
      return finalizeEvent(transaction, eventId, {
        kind: "STALE",
        orderId: attempt.order.id,
        paymentAttemptId: attempt.id,
        processingResult: "STALE_REFUND",
      }, attempt.id);
    }

    await transitionPayment({
      allowRefund: true,
      current: attempt.status,
      entityId: attempt.id,
      next: "REFUNDED",
    });
    await transaction.paymentAttempt.update({
      where: { id: attempt.id },
      data: { ...providerTransactionData, status: "REFUNDED" },
    });

    return finalizeEvent(transaction, eventId, {
      kind: "PROCESSED",
      orderId: attempt.order.id,
      paymentAttemptId: attempt.id,
      processingResult: "REFUNDED",
    }, attempt.id);
  }

  if (attempt.status !== "PENDING") {
    return finalizeEvent(transaction, eventId, {
      kind: "STALE",
      orderId: attempt.order.id,
      paymentAttemptId: attempt.id,
      processingResult: `STALE_${targetStatus}`,
    }, attempt.id);
  }

  await transitionPayment({
    allowExpiry: targetStatus === "EXPIRED",
    current: attempt.status,
    entityId: attempt.id,
    next: targetStatus,
  });
  await transaction.paymentAttempt.update({
    where: { id: attempt.id },
    data: { ...providerTransactionData, status: targetStatus },
  });

  if (attempt.purpose === "ORDER_TOTAL") {
    if (attempt.order.orderType === "RETAIL" && attempt.order.status === "PENDING_PAYMENT") {
      await transitionRetailOrder({
        allowCancellation: true,
        current: "PENDING_PAYMENT",
        entityId: attempt.order.id,
        next: "CANCELLED",
      });
      await releaseRetailReservations(transaction, attempt.order.id);
      await transaction.order.update({
        where: { id: attempt.order.id },
        data: { cancelledAt: now, status: "CANCELLED" },
      });
    }

    if (attempt.order.orderType === "CUSTOM_PRINT" && attempt.order.status === "WAITING_PAYMENT") {
      await transitionCustomOrder({
        allowCancellation: true,
        current: "WAITING_PAYMENT",
        entityId: attempt.order.id,
        next: "CANCELLED",
      });
      await transaction.order.update({
        where: { id: attempt.order.id },
        data: { cancelledAt: now, status: "CANCELLED" },
      });
    }
  }

  return finalizeEvent(transaction, eventId, {
    kind: "PROCESSED",
    orderId: attempt.order.id,
    paymentAttemptId: attempt.id,
    processingResult: targetStatus,
  }, attempt.id);
}

async function expirePendingAttemptAndCancelPayableOrder(input: Readonly<{
  attempt: WebhookPaymentAttempt;
  now: Date;
  providerTransactionData: Readonly<{ providerTransactionId?: string }>;
  transaction: Prisma.TransactionClient;
}>): Promise<void> {
  await transitionPayment({
    allowExpiry: true,
    current: input.attempt.status,
    entityId: input.attempt.id,
    next: "EXPIRED",
  });
  await input.transaction.paymentAttempt.update({
    where: { id: input.attempt.id },
    data: { ...input.providerTransactionData, status: "EXPIRED" },
  });

  if (input.attempt.purpose !== "ORDER_TOTAL") {
    return;
  }

  if (
    input.attempt.order.orderType === "RETAIL" &&
    input.attempt.order.status === "PENDING_PAYMENT"
  ) {
    await transitionRetailOrder({
      allowCancellation: true,
      current: "PENDING_PAYMENT",
      entityId: input.attempt.order.id,
      next: "CANCELLED",
    });
    await releaseRetailReservations(input.transaction, input.attempt.order.id);
    await input.transaction.order.update({
      where: { id: input.attempt.order.id },
      data: { cancelledAt: input.now, status: "CANCELLED" },
    });
  }

  if (
    input.attempt.order.orderType === "CUSTOM_PRINT" &&
    input.attempt.order.status === "WAITING_PAYMENT"
  ) {
    await transitionCustomOrder({
      allowCancellation: true,
      current: "WAITING_PAYMENT",
      entityId: input.attempt.order.id,
      next: "CANCELLED",
    });
    await input.transaction.order.update({
      where: { id: input.attempt.order.id },
      data: { cancelledAt: input.now, status: "CANCELLED" },
    });
  }
}

function expectedPayableOrderStatus(
  attempt: Readonly<{
    order: Readonly<{ orderType: "CUSTOM_PRINT" | "RETAIL" }>;
    purpose: "CUSTOM_SHIPPING" | "ORDER_TOTAL";
  }>,
): "PENDING_PAYMENT" | "WAITING_PAYMENT" | "WAITING_SHIPPING_PAYMENT" | undefined {
  if (attempt.purpose === "CUSTOM_SHIPPING") {
    return attempt.order.orderType === "CUSTOM_PRINT"
      ? "WAITING_SHIPPING_PAYMENT"
      : undefined;
  }

  return attempt.order.orderType === "RETAIL"
    ? "PENDING_PAYMENT"
    : "WAITING_PAYMENT";
}

async function consumeRetailReservations(
  transaction: Prisma.TransactionClient,
  orderId: string,
  now: Date,
): Promise<boolean> {
  const reservations = await transaction.stockReservation.findMany({
    where: { orderId, status: "ACTIVE" },
    orderBy: [{ variantId: "asc" }, { id: "asc" }],
    select: {
      expiresAt: true,
      id: true,
      quantity: true,
      variantId: true,
    },
  });

  if (reservations.length === 0 || reservations.some((reservation) => reservation.expiresAt <= now)) {
    return false;
  }

  for (const reservation of reservations) {
    const variant = await lockVariant(transaction, reservation.variantId);

    if (variant.stockOnHand < reservation.quantity) {
      return false;
    }
  }

  for (const reservation of reservations) {
    await transaction.productVariant.update({
      where: { id: reservation.variantId },
      data: { stockOnHand: { decrement: reservation.quantity } },
    });
    const consumed = await transaction.stockReservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "CONSUMED" },
    });

    if (consumed.count !== 1) {
      throw new Error("Reservasi berubah saat pembayaran sedang diproses.");
    }
  }

  return true;
}

async function releaseRetailReservations(
  transaction: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  await transaction.stockReservation.updateMany({
    where: { orderId, status: "ACTIVE" },
    data: { status: "RELEASED" },
  });
}

async function finalizeEvent(
  transaction: Prisma.TransactionClient,
  eventId: string,
  result: MidtransWebhookResult,
  paymentAttemptId?: string,
): Promise<MidtransWebhookResult> {
  await transaction.paymentEvent.update({
    where: { id: eventId },
    data: {
      paymentAttemptId,
      processedAt: new Date(),
      processingResult: result.processingResult,
    },
  });

  return result;
}

function toEventPayload(
  notification: MidtransNotification,
): Readonly<Record<string, unknown>> {
  return {
    fraudStatus: notification.fraudStatus ?? null,
    grossAmount: notification.grossAmount,
    orderId: notification.orderId,
    statusCode: notification.statusCode,
    transactionId: notification.transactionId ?? null,
    transactionStatus: notification.transactionStatus,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}
