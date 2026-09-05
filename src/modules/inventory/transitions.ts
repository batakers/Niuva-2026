import type { StockReservationStatus } from "@/generated/prisma/client";

import {
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const RESERVATION_TRANSITIONS: TransitionMap<StockReservationStatus> = {
  ACTIVE: ["CONSUMED", "RELEASED"],
  CONSUMED: [],
  RELEASED: [],
};

export function transitionReservation(input: Readonly<{
  audit?: TransitionAuditWriter;
  current: StockReservationStatus;
  entityId?: string;
  next: StockReservationStatus;
}>): Promise<StockReservationStatus> {
  return transitionStatus(RESERVATION_TRANSITIONS, {
    ...input,
    entityType: "StockReservation",
  });
}

