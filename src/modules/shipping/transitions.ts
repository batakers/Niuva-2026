import type { ShipmentStatus } from "@/generated/prisma/client";

import {
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const SHIPMENT_TRANSITIONS: TransitionMap<ShipmentStatus> = {
  DELIVERED: [],
  EXCEPTION: [],
  PENDING: ["SHIPPED", "EXCEPTION"],
  SHIPPED: ["DELIVERED", "EXCEPTION"],
};

export function transitionShipment(input: Readonly<{
  audit?: TransitionAuditWriter;
  current: ShipmentStatus;
  entityId?: string;
  next: ShipmentStatus;
}>): Promise<ShipmentStatus> {
  return transitionStatus(SHIPMENT_TRANSITIONS, {
    ...input,
    entityType: "Shipment",
  });
}

