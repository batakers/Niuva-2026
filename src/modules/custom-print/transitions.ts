import type { CustomPrintRequestStatus } from "@/generated/prisma/client";

import {
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const CUSTOM_REQUEST_TRANSITIONS: TransitionMap<CustomPrintRequestStatus> = {
  APPROVED: [],
  CANCELLED: [],
  DECLINED: [],
  QUOTE_READY: ["QUOTE_SENT"],
  QUOTE_SENT: ["APPROVED", "DECLINED"],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["QUOTE_READY", "DECLINED"],
};

export function transitionCustomPrintRequest(input: Readonly<{
  audit?: TransitionAuditWriter;
  current: CustomPrintRequestStatus;
  entityId?: string;
  next: CustomPrintRequestStatus;
}>): Promise<CustomPrintRequestStatus> {
  return transitionStatus(CUSTOM_REQUEST_TRANSITIONS, {
    ...input,
    entityType: "CustomPrintRequest",
  });
}

