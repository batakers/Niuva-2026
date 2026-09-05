import type { PaymentAttemptStatus } from "@/generated/prisma/client";

import { requireApprovedDecision } from "@/modules/shared/policy";
import {
  isTransitionAllowed,
  recordRejectedTransition,
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const PAYMENT_TRANSITIONS: TransitionMap<PaymentAttemptStatus> = {
  CANCELLED: [],
  EXPIRED: [],
  FAILED: [],
  PENDING: ["SETTLED", "FAILED", "EXPIRED", "CANCELLED"],
  REFUNDED: [],
  SETTLED: ["REFUNDED"],
};

export async function transitionPayment(input: Readonly<{
  allowCancellation?: boolean;
  allowExpiry?: boolean;
  allowRefund?: boolean;
  audit?: TransitionAuditWriter;
  current: PaymentAttemptStatus;
  entityId?: string;
  next: PaymentAttemptStatus;
}>): Promise<PaymentAttemptStatus> {
  if (
    input.next === "EXPIRED" &&
    isTransitionAllowed(PAYMENT_TRANSITIONS, input.current, input.next)
  ) {
    if (input.allowExpiry !== true) {
      await recordRejectedTransition({
        audit: input.audit,
        current: input.current,
        entityId: input.entityId,
        entityType: "PaymentAttempt",
        next: input.next,
      });
    }
    requireApprovedDecision(input.allowExpiry, "payment expiry");
  }

  if (
    input.next === "CANCELLED" &&
    isTransitionAllowed(PAYMENT_TRANSITIONS, input.current, input.next)
  ) {
    if (input.allowCancellation !== true) {
      await recordRejectedTransition({
        audit: input.audit,
        current: input.current,
        entityId: input.entityId,
        entityType: "PaymentAttempt",
        next: input.next,
      });
    }
    requireApprovedDecision(input.allowCancellation, "payment cancellation");
  }

  if (
    input.next === "REFUNDED" &&
    isTransitionAllowed(PAYMENT_TRANSITIONS, input.current, input.next)
  ) {
    if (input.allowRefund !== true) {
      await recordRejectedTransition({
        audit: input.audit,
        current: input.current,
        entityId: input.entityId,
        entityType: "PaymentAttempt",
        next: input.next,
      });
    }
    requireApprovedDecision(input.allowRefund, "payment refund");
  }

  return transitionStatus(PAYMENT_TRANSITIONS, {
    ...input,
    entityType: "PaymentAttempt",
  });
}
