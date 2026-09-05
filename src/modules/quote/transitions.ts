import type { CustomPrintQuoteStatus } from "@/generated/prisma/client";

import { requireApprovedDecision } from "@/modules/shared/policy";
import {
  isTransitionAllowed,
  recordRejectedTransition,
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const QUOTE_TRANSITIONS: TransitionMap<CustomPrintQuoteStatus> = {
  ACCEPTED: [],
  DECLINED: [],
  DRAFT: ["SENT", "DECLINED"],
  EXPIRED: [],
  SENT: ["ACCEPTED", "DECLINED", "EXPIRED"],
};

export async function transitionQuote(input: Readonly<{
  allowExpiry?: boolean;
  audit?: TransitionAuditWriter;
  current: CustomPrintQuoteStatus;
  entityId?: string;
  next: CustomPrintQuoteStatus;
}>): Promise<CustomPrintQuoteStatus> {
  if (
    input.next === "EXPIRED" &&
    isTransitionAllowed(QUOTE_TRANSITIONS, input.current, input.next)
  ) {
    if (input.allowExpiry !== true) {
      await recordRejectedTransition({
        audit: input.audit,
        current: input.current,
        entityId: input.entityId,
        entityType: "CustomPrintQuote",
        next: input.next,
      });
    }
    requireApprovedDecision(input.allowExpiry, "quote expiry");
  }

  return transitionStatus(QUOTE_TRANSITIONS, {
    ...input,
    entityType: "CustomPrintQuote",
  });
}
