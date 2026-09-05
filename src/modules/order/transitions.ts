import type { OrderStatus } from "@/generated/prisma/client";

import { requireApprovedDecision } from "@/modules/shared/policy";
import {
  isTransitionAllowed,
  recordRejectedTransition,
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const RETAIL_ORDER_TRANSITIONS: TransitionMap<OrderStatus> = {
  CANCELLED: [],
  COMPLETED: [],
  FINISHING_QC: [],
  IN_PRODUCTION: [],
  PAID: ["PROCESSING"],
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  SUBMITTED: [],
  UNDER_REVIEW: [],
  WAITING_FOR_APPROVAL: [],
  WAITING_PAYMENT: [],
  WAITING_SHIPPING_PAYMENT: [],
};

export const CUSTOM_ORDER_TRANSITIONS: TransitionMap<OrderStatus> = {
  CANCELLED: [],
  COMPLETED: [],
  FINISHING_QC: ["WAITING_SHIPPING_PAYMENT"],
  IN_PRODUCTION: ["FINISHING_QC"],
  PAID: ["IN_PRODUCTION"],
  PENDING_PAYMENT: [],
  PROCESSING: [],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["WAITING_FOR_APPROVAL"],
  WAITING_FOR_APPROVAL: ["WAITING_PAYMENT"],
  WAITING_PAYMENT: ["PAID", "CANCELLED"],
  WAITING_SHIPPING_PAYMENT: ["READY_TO_SHIP"],
};

export async function transitionRetailOrder(input: Readonly<{
  allowCancellation?: boolean;
  audit?: TransitionAuditWriter;
  current: OrderStatus;
  entityId?: string;
  next: OrderStatus;
}>): Promise<OrderStatus> {
  if (
    input.next === "CANCELLED" &&
    isTransitionAllowed(RETAIL_ORDER_TRANSITIONS, input.current, input.next)
  ) {
    if (input.allowCancellation !== true) {
      await recordRejectedTransition({
        audit: input.audit,
        current: input.current,
        entityId: input.entityId,
        entityType: "RetailOrder",
        next: input.next,
      });
    }
    requireApprovedDecision(input.allowCancellation, "order cancellation");
  }

  return transitionStatus(RETAIL_ORDER_TRANSITIONS, {
    ...input,
    entityType: "RetailOrder",
  });
}

export async function transitionCustomOrder(input: Readonly<{
  allowCancellation?: boolean;
  audit?: TransitionAuditWriter;
  current: OrderStatus;
  entityId?: string;
  next: OrderStatus;
}>): Promise<OrderStatus> {
  if (
    input.next === "CANCELLED" &&
    isTransitionAllowed(CUSTOM_ORDER_TRANSITIONS, input.current, input.next)
  ) {
    if (input.allowCancellation !== true) {
      await recordRejectedTransition({
        audit: input.audit,
        current: input.current,
        entityId: input.entityId,
        entityType: "CustomOrder",
        next: input.next,
      });
    }
    requireApprovedDecision(input.allowCancellation, "custom order cancellation");
  }

  return transitionStatus(CUSTOM_ORDER_TRANSITIONS, {
    ...input,
    entityType: "CustomOrder",
  });
}
