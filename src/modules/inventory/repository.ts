import { Prisma, type PrismaClient, type StockReservationStatus } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";

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
  releaseExpired(variantId?: string, now?: Date): Promise<readonly ReservationTransitionResult[]>;
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

  async releaseExpired(
    variantId?: string,
    now = new Date(),
  ): Promise<readonly ReservationTransitionResult[]> {
    return this.prisma.$transaction(async (transaction) => {
      const candidates = await transaction.stockReservation.findMany({
        where: {
          expiresAt: { lte: now },
          ...(variantId === undefined ? {} : { variantId }),
          status: "ACTIVE",
        },
        orderBy: [{ variantId: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          variantId: true,
        },
      });
      const released: ReservationTransitionResult[] = [];

      for (const candidate of candidates) {
        await lockVariant(transaction, candidate.variantId);
        const current = await transaction.stockReservation.findUnique({
          where: { id: candidate.id },
          select: {
            expiresAt: true,
            id: true,
            orderId: true,
            quantity: true,
            status: true,
            variantId: true,
          },
        });

        if (current === null || current.status !== "ACTIVE" || current.expiresAt > now) {
          continue;
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
    });
  }
}
