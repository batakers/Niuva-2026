import type { ShipmentStatus } from "@/generated/prisma/client";

import type { TransitionMap } from "@/modules/shared/transition";

export const SHIPMENT_TRANSITIONS: TransitionMap<ShipmentStatus> = {
  DELIVERED: [],
  EXCEPTION: [],
  PENDING: ["SHIPPED", "EXCEPTION"],
  SHIPPED: ["DELIVERED", "EXCEPTION"],
};

