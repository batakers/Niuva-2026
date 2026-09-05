import type { AdminRole, OrderStatus, OrderType } from "@/generated/prisma/client";

const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const NIUVA_MVP_COMMERCIAL_POLICY = {
  customPaymentTtlMs: 24 * HOUR_MS,
  id: "niuva-mvp-2026-09-05",
  lateSettlementResolution: "KEEP_CANCELLED_AND_REQUIRE_FULL_REFUND",
  partialRefundsEnabled: false,
  quoteValidityMs: 7 * DAY_MS,
  retailPaymentTtlMs: 30 * MINUTE_MS,
  retailReservationTtlMs: 30 * MINUTE_MS,
} as const;

export type CancellationActor = AdminRole | "CUSTOMER" | "SYSTEM";

export type CancellationDecision = Readonly<{
  allowed: boolean;
  requiresFullRefund: boolean;
}>;

export function retailReservationExpiresAt(now: Date): Date {
  return addMilliseconds(now, NIUVA_MVP_COMMERCIAL_POLICY.retailReservationTtlMs);
}

export function retailPaymentExpiresAt(now: Date): Date {
  return addMilliseconds(now, NIUVA_MVP_COMMERCIAL_POLICY.retailPaymentTtlMs);
}

export function customPaymentExpiresAt(now: Date): Date {
  return addMilliseconds(now, NIUVA_MVP_COMMERCIAL_POLICY.customPaymentTtlMs);
}

export function quoteExpiresAt(sentAt: Date): Date {
  return addMilliseconds(sentAt, NIUVA_MVP_COMMERCIAL_POLICY.quoteValidityMs);
}

export function getCancellationDecision(input: Readonly<{
  actor: CancellationActor;
  orderStatus: OrderStatus;
  orderType: OrderType;
}>): CancellationDecision {
  const isOperationalActor =
    input.actor === "ADMIN" || input.actor === "OWNER" || input.actor === "SYSTEM";

  if (input.orderType === "RETAIL" && input.orderStatus === "PENDING_PAYMENT") {
    return { allowed: true, requiresFullRefund: false };
  }

  if (input.orderType === "CUSTOM_PRINT" && input.orderStatus === "WAITING_PAYMENT") {
    return { allowed: true, requiresFullRefund: false };
  }

  if (input.orderStatus === "PAID" && input.actor === "OWNER") {
    return { allowed: true, requiresFullRefund: true };
  }

  if (!isOperationalActor) {
    return { allowed: false, requiresFullRefund: false };
  }

  return { allowed: false, requiresFullRefund: false };
}

function addMilliseconds(value: Date, milliseconds: number): Date {
  const timestamp = value.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new TypeError("Policy timestamp harus berupa Date yang valid.");
  }

  return new Date(timestamp + milliseconds);
}
