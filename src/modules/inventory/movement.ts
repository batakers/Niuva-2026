import { type Prisma, type StockMovementKind } from "@/generated/prisma/client";
import { appError } from "@/modules/shared/errors";

import { lockVariant } from "./lock-variant";

export type StockMutationResult = Readonly<{
  id: string;
  previousStockOnHand: number;
  stockOnHand: number;
}>;

export async function recordStockMovement(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    adminId?: string;
    balanceAfter: number;
    balanceBefore: number;
    kind: StockMovementKind;
    orderId?: string;
    reason?: string;
    reservationId?: string;
    variantId: string;
  }>,
): Promise<void> {
  await transaction.stockMovement.create({
    data: {
      adminId: input.adminId,
      balanceAfter: input.balanceAfter,
      balanceBefore: input.balanceBefore,
      delta: input.balanceAfter - input.balanceBefore,
      kind: input.kind,
      orderId: input.orderId,
      reason: input.reason,
      reservationId: input.reservationId,
      variantId: input.variantId,
    },
  });
}

export async function setStockWithinTransaction(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    adminId?: string;
    auditAction?: string;
    expectedStockOnHand?: number;
    kind: "CATALOG_IMPORT" | "MANUAL_ADJUSTMENT";
    reason?: string;
    stockOnHand: number;
    variantId: string;
  }>,
): Promise<StockMutationResult> {
  if (!Number.isSafeInteger(input.stockOnHand) || input.stockOnHand < 0 || input.stockOnHand > 2_147_483_647) {
    throw appError("VALIDATION_ERROR", {
      details: { stockOnHand: "Stok harus bilangan bulat nonnegatif yang dapat disimpan." },
    });
  }
  if (input.kind === "MANUAL_ADJUSTMENT" && (!input.adminId || !input.reason?.trim())) {
    throw appError("VALIDATION_ERROR", { details: { reason: "Alasan penyesuaian wajib diisi." } });
  }

  const current = await lockVariant(transaction, input.variantId);
  if (input.expectedStockOnHand !== undefined && current.stockOnHand !== input.expectedStockOnHand) {
    throw appError("CONFLICT", { message: "Stok telah berubah. Muat ulang halaman sebelum menyesuaikan stok." });
  }
  if (current.stockOnHand === input.stockOnHand) {
    if (input.kind === "MANUAL_ADJUSTMENT") {
      throw appError("VALIDATION_ERROR", { details: { stockOnHand: "Stok baru harus berbeda dari stok saat ini." } });
    }
    return { id: current.id, previousStockOnHand: current.stockOnHand, stockOnHand: current.stockOnHand };
  }

  const reserved = await transaction.stockReservation.aggregate({
    where: { expiresAt: { gt: new Date() }, status: "ACTIVE", variantId: input.variantId },
    _sum: { quantity: true },
  });
  if (input.stockOnHand < (reserved._sum.quantity ?? 0)) {
    throw appError("CONFLICT", { message: "Stok fisik tidak boleh lebih kecil dari reservasi aktif." });
  }

  const updated = await transaction.productVariant.update({
    where: { id: input.variantId },
    data: { stockOnHand: input.stockOnHand },
    select: { id: true, stockOnHand: true },
  });
  await recordStockMovement(transaction, {
    adminId: input.adminId,
    balanceAfter: updated.stockOnHand,
    balanceBefore: current.stockOnHand,
    kind: input.kind,
    reason: input.reason,
    variantId: input.variantId,
  });
  if (input.auditAction && input.adminId) {
    await transaction.auditLog.create({
      data: {
        action: input.auditAction,
        actorId: input.adminId,
        actorType: "ADMIN",
        afterJson: { stockOnHand: updated.stockOnHand },
        beforeJson: { stockOnHand: current.stockOnHand },
        entityId: updated.id,
        entityType: "ProductVariant",
        metadataJson: { reason: input.reason ?? "" },
      },
    });
  }

  return { id: updated.id, previousStockOnHand: current.stockOnHand, stockOnHand: updated.stockOnHand };
}
