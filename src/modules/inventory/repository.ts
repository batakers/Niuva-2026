import { Prisma, type PrismaClient, type StockReservationStatus } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { transitionPayment } from "@/modules/payment/transitions";
import { transitionRetailOrder } from "@/modules/order/transitions";

import { transitionReservation } from "./transitions";
import { lockVariant } from "./lock-variant";
import { recordStockMovement, setStockWithinTransaction } from "./movement";

export { lockVariant } from "./lock-variant";

export type ReservationRecord = Readonly<{
  expiresAt: Date;
  id: string;
  orderId: string;
  quantity: number;
  status: StockReservationStatus;
  variantId: string;
}>;

export type ReservationTransitionResult = Readonly<{
  expiresAt: Date;
  id: string;
  orderId: string;
  previousStatus: StockReservationStatus;
  quantity: number;
  status: StockReservationStatus;
  variantId: string;
}>;

export type StockAdjustmentResult = Readonly<{
  id: string;
  previousStockOnHand: number;
  stockOnHand: number;
}>;

export interface InventoryRepositoryPort {
  findAvailableQuantity(variantId: string, now?: Date): Promise<number>;
  releaseExpired(variantId?: string, now?: Date, limit?: number): Promise<readonly ReservationTransitionResult[]>;
  reserve(input: Readonly<{
    expiresAt: Date;
    orderId: string;
    quantity: number;
    variantId: string;
  }>): Promise<ReservationRecord>;
  updateStock?(
    variantId: string,
    input: Readonly<{ adminId: string; expectedStockOnHand: number; reason: string; stockOnHand: number }>,
  ): Promise<StockAdjustmentResult>;
  transition(
    reservationId: string,
    next: StockReservationStatus,
    now?: Date,
  ): Promise<ReservationTransitionResult>;
}

export function expiredReservationWhere(now: Date, variantId?: string): Prisma.StockReservationWhereInput {
  return {
    expiresAt: { lte: now },
    ...(variantId === undefined ? {} : { variantId }),
    status: "ACTIVE",
    order: {
      status: { in: ["PENDING_PAYMENT", "CANCELLED"] },
      paymentAttempts: {
        none: {
          OR: [
            { status: { in: ["SETTLED", "REFUNDED"] } },
            { status: "PENDING", expiresAt: { gt: now } },
          ],
        },
      },
    },
  };
}

export async function reserveWithinTransaction(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    expiresAt: Date;
    orderId: string;
    quantity: number;
    variantId: string;
  }>,
  now: Date,
): Promise<ReservationRecord> {
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw appError("VALIDATION_ERROR", {
      details: { quantity: "Jumlah reservasi harus bilangan bulat positif." },
    });
  }

  if (input.expiresAt <= now) {
    throw appError("VALIDATION_ERROR", {
      details: { expiresAt: "Reservasi harus berakhir di masa depan." },
    });
  }

  const variant = await lockVariant(transaction, input.variantId);
  const reserved = await transaction.stockReservation.aggregate({
    where: {
      expiresAt: { gt: now },
      status: "ACTIVE",
      variantId: input.variantId,
    },
    _sum: { quantity: true },
  });
  const available = availableQuantity(
    variant.stockOnHand,
    reserved._sum.quantity ?? 0,
  );

  if (available < input.quantity) {
    throw appError("OUT_OF_STOCK", {
      details: { available: String(available) },
    });
  }

  return transaction.stockReservation.create({
    data: {
      expiresAt: input.expiresAt,
      orderId: input.orderId,
      quantity: input.quantity,
      variantId: input.variantId,
    },
    select: {
      expiresAt: true,
      id: true,
      orderId: true,
      quantity: true,
      status: true,
      variantId: true,
    },
  });
}

function availableQuantity(stockOnHand: number, reservedQuantity: number): number {
  return Math.max(0, stockOnHand - reservedQuantity);
}

export class InventoryRepository implements InventoryRepositoryPort {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findAvailableQuantity(variantId: string, now = new Date()): Promise<number> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stockOnHand: true },
    });

    if (variant === null) {
      throw appError("NOT_FOUND");
    }

    const reserved = await this.prisma.stockReservation.aggregate({
      where: {
        expiresAt: { gt: now },
        status: "ACTIVE",
        variantId,
      },
      _sum: { quantity: true },
    });

    return availableQuantity(variant.stockOnHand, reserved._sum.quantity ?? 0);
  }

  async reserve(input: Readonly<{
    expiresAt: Date;
    orderId: string;
    quantity: number;
    variantId: string;
  }>): Promise<ReservationRecord> {
    const now = new Date();

    if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
      throw appError("VALIDATION_ERROR", {
        details: { quantity: "Jumlah reservasi harus bilangan bulat positif." },
      });
    }

    if (input.expiresAt <= now) {
      throw appError("VALIDATION_ERROR", {
        details: { expiresAt: "Reservasi harus berakhir di masa depan." },
      });
    }

    return this.prisma.$transaction((transaction) =>
      reserveWithinTransaction(transaction, input, now),
    );
  }

  async updateStock(
    variantId: string,
    input: Readonly<{ adminId: string; expectedStockOnHand: number; reason: string; stockOnHand: number }>,
  ): Promise<StockAdjustmentResult> {
    return this.prisma.$transaction((transaction) => setStockWithinTransaction(transaction, {
      ...input,
      auditAction: "inventory.stock.adjusted",
      kind: "MANUAL_ADJUSTMENT",
      variantId,
    }));
  }

  async transition(
    reservationId: string,
    next: StockReservationStatus,
    now = new Date(),
  ): Promise<ReservationTransitionResult> {
    return this.prisma.$transaction(async (transaction) => {
      const initial = await transaction.stockReservation.findUnique({
        where: { id: reservationId },
        select: { variantId: true },
      });

      if (initial === null) {
        throw appError("NOT_FOUND");
      }

      const variant = await lockVariant(transaction, initial.variantId);
      const current = await transaction.stockReservation.findUnique({
        where: { id: reservationId },
        select: {
          expiresAt: true,
          id: true,
          orderId: true,
          quantity: true,
          status: true,
          variantId: true,
        },
      });

      if (current === null) {
        throw appError("NOT_FOUND");
      }

      if (current.status === next) {
        return {
          ...current,
          previousStatus: current.status,
        };
      }

      await transitionReservation({
        current: current.status,
        entityId: current.id,
        next,
      });

      if (next === "CONSUMED") {
        if (current.expiresAt <= now) {
          throw appError("CONFLICT", {
            message: "Reservasi sudah kedaluwarsa dan belum dapat dikonsumsi.",
          });
        }

        if (variant.stockOnHand < current.quantity) {
          throw appError("OUT_OF_STOCK");
        }

        const updatedVariant = await transaction.productVariant.update({
          where: { id: current.variantId },
          data: { stockOnHand: { decrement: current.quantity } },
          select: { stockOnHand: true },
        });
        await recordStockMovement(transaction, {
          balanceBefore: variant.stockOnHand,
          balanceAfter: updatedVariant.stockOnHand,
          kind: "ORDER_CONSUMPTION",
          orderId: current.orderId,
          reservationId: current.id,
          variantId: current.variantId,
        });
      }

      const updated = await transaction.stockReservation.update({
        where: { id: current.id },
        data: { status: next },
        select: {
          expiresAt: true,
          id: true,
          orderId: true,
          quantity: true,
          status: true,
          variantId: true,
        },
      });

      return {
        ...updated,
        previousStatus: current.status,
      };
    });
  }

  async releaseExpired(variantId?: string, now = new Date(), limit?: number): Promise<readonly ReservationTransitionResult[]> {
    return this.prisma.$transaction(tx => releaseExpiredWithinTransaction(tx, variantId, now, limit));
  }
}

export async function expiredReservationBacklog(transaction: Prisma.TransactionClient, now: Date) {
  const where = expiredReservationWhere(now);
  const remainingDue = await transaction.stockReservation.count({ where });
  const oldest = await transaction.stockReservation.findFirst({ where, orderBy: [{ expiresAt: "asc" }, { id: "asc" }], select: { expiresAt: true } });
  return { remainingDue, lagMs: oldest ? Math.min(2_147_483_647, Math.max(0, now.getTime() - oldest.expiresAt.getTime())) : 0 };
}

export async function releaseExpiredWithinTransaction(
  transaction: Prisma.TransactionClient, variantId: string | undefined, now: Date, limit?: number,
): Promise<readonly ReservationTransitionResult[]> {
  const candidates = await transaction.stockReservation.findMany({
    where: expiredReservationWhere(now, variantId),
    orderBy: [{ orderId: "asc" }, { variantId: "asc" }, { createdAt: "asc" }],
    ...(limit === undefined ? {} : { take: limit }),
    select: {
      id: true,
      orderId: true,
      variantId: true,
    },
  });
  const released: ReservationTransitionResult[] = [];

  for (const candidate of candidates) {
    // Match payment webhook locking: payment attempt, variant, then order.
    // This lets a settlement either commit first or observe the expiry.
    await transaction.$queryRaw`
      SELECT "id" FROM "payment_attempts"
      WHERE "order_id" = ${candidate.orderId}::uuid
      ORDER BY "id" ASC
      FOR UPDATE
    `;
    await lockVariant(transaction, candidate.variantId);
    await transaction.$queryRaw`
      SELECT "id" FROM "orders" WHERE "id" = ${candidate.orderId}::uuid FOR UPDATE
    `;
    const current = await transaction.stockReservation.findUnique({
      where: { id: candidate.id },
      select: {
        expiresAt: true,
        id: true,
        orderId: true,
        quantity: true,
        status: true,
        variantId: true,
        order: {
          select: {
            status: true,
            paymentAttempts: {
              orderBy: { id: "asc" },
              select: { expiresAt: true, id: true, status: true },
            },
          },
        },
      },
    });

    if (
      current === null || current.status !== "ACTIVE" || current.expiresAt > now ||
      !["PENDING_PAYMENT", "CANCELLED"].includes(current.order.status) ||
      current.order.paymentAttempts.some((attempt) =>
        attempt.status === "SETTLED" || attempt.status === "REFUNDED" ||
        (attempt.status === "PENDING" && attempt.expiresAt > now)
      )
    ) {
      continue;
    }

    for (const attempt of current.order.paymentAttempts) {
      if (attempt.status !== "PENDING" || attempt.expiresAt > now) continue;
      await transitionPayment({
        allowExpiry: true,
        current: attempt.status,
        entityId: attempt.id,
        next: "EXPIRED",
      });
      await transaction.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "EXPIRED" },
      });
    }

    if (current.order.status === "PENDING_PAYMENT") {
      await transitionRetailOrder({
        allowCancellation: true,
        current: "PENDING_PAYMENT",
        entityId: current.orderId,
        next: "CANCELLED",
      });
      await transaction.order.update({
        where: { id: current.orderId },
        data: { cancelledAt: now, status: "CANCELLED" },
      });
    }

    await transitionReservation({
      current: current.status,
      entityId: current.id,
      next: "RELEASED",
    });

    const updated = await transaction.stockReservation.update({
      where: { id: current.id },
      data: { status: "RELEASED" },
      select: {
        expiresAt: true,
        id: true,
        orderId: true,
        quantity: true,
        status: true,
        variantId: true,
      },
    });

    released.push({
      ...updated,
      previousStatus: current.status,
    });
  }

  return released;
}
