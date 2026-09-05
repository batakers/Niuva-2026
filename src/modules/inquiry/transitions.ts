import type { InquiryStatus } from "@/generated/prisma/client";

import {
  transitionStatus,
  type TransitionAuditWriter,
  type TransitionMap,
} from "@/modules/shared/transition";

export const INQUIRY_TRANSITIONS: TransitionMap<InquiryStatus> = {
  NEW: ["CONTACTED", "CLOSED"],
  CONTACTED: ["QUALIFIED", "LOST", "CLOSED"],
  QUALIFIED: ["QUOTED", "LOST", "CLOSED"],
  QUOTED: ["WON", "LOST", "CLOSED"],
  WON: ["CLOSED"],
  LOST: ["CLOSED"],
  CLOSED: [],
};

export function transitionInquiry(input: Readonly<{
  audit?: TransitionAuditWriter;
  current: InquiryStatus;
  entityId?: string;
  next: InquiryStatus;
}>): Promise<InquiryStatus> {
  return transitionStatus(INQUIRY_TRANSITIONS, {
    ...input,
    entityType: "B2BInquiry",
  });
}

