import type { IdempotencyStatus, Prisma } from "@/generated/prisma/client";

export type StoredIdempotencyResponse = Readonly<{
  grandTotalRp?: string;
  orderId?: string;
  orderNumber?: string;
  paymentAttemptId?: string;
  quoteNumber?: string;
  referenceNumber?: string;
  requestId?: string;
  status?: string;
}>;

export type IdempotencyState = Readonly<{
  completedAt: Date | null;
  expiresAt: Date;
  requestHash: string;
  responseJson: Prisma.JsonValue | null;
  responseStatus: number | null;
  status: IdempotencyStatus;
}>;

export type IdempotencyResolution =
  | Readonly<{ kind: "RESERVED" }>
  | Readonly<{
      kind: "REPLAY";
      response: Prisma.JsonValue | null;
      responseStatus: number;
    }>
  | Readonly<{
      kind: "CONFLICT";
      reason:
        | "EXPIRED_RECORD"
        | "IN_PROGRESS"
        | "KEY_REUSED_WITH_DIFFERENT_REQUEST"
        | "PREVIOUS_ATTEMPT_FAILED";
    }>;

export function resolveIdempotency(
  existing: IdempotencyState | null,
  requestHash: string,
  now: Date,
): IdempotencyResolution {
  if (existing === null) {
    return { kind: "RESERVED" };
  }

  if (existing.expiresAt <= now) {
    return { kind: "CONFLICT", reason: "EXPIRED_RECORD" };
  }

  if (existing.requestHash !== requestHash) {
    return { kind: "CONFLICT", reason: "KEY_REUSED_WITH_DIFFERENT_REQUEST" };
  }

  if (existing.status === "COMPLETED" && existing.responseStatus !== null) {
    return {
      kind: "REPLAY",
      response: existing.responseJson,
      responseStatus: existing.responseStatus,
    };
  }

  if (existing.status === "FAILED") {
    return { kind: "CONFLICT", reason: "PREVIOUS_ATTEMPT_FAILED" };
  }

  return { kind: "CONFLICT", reason: "IN_PROGRESS" };
}
