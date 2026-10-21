import type { RefundCaseStatus } from "@/generated/prisma/client";
export type RefundFormState = Readonly<{
  status: "idle" | "success" | "error"; message?: string;
  values?: Readonly<{ reason: string; category: string; returnState: string; reference: string; receivedAt?: string }>;
  executionValues?: Readonly<Record<string, string>>;
}>;

export type RefundCaseView = Readonly<{
  id: string; status: RefundCaseStatus; version: number; category: string; reason: string;
  amountRp: string; currency: string; receivedAt: string; readyAt: string | null; returnState: string | null;
  completedAt?: string | null;
  allocations: readonly Readonly<{ id?: string; paymentAttemptId: string; purpose: string; amountRp: string; outcome?: Readonly<{ state: string; source: string | null; confirmedAt: string | null }> }>[];
}>;
export type RefundOrderView = Readonly<{
  orderId: string; orderNumber: string; orderStatus: string; accountClosed: boolean;
  eligibleAmountRp: string | null; eligibilityIssue: string | null; snapshotChanged: boolean;
  refund: RefundCaseView | null;
}>;
export type AdminRefundOrderView = RefundOrderView & Readonly<{
  contactVerificationReference: string | null;
  executions?: readonly Readonly<{ id: string; allocationId: string; state: string; refundKey: string; publicReason: string; attemptCount: number; firstAttemptAt: string | null; nextAttemptAt: string | null; lastCheckedAt: string | null;
    attempts: readonly Readonly<{ state: string; startedAt: string | null; finishedAt: string | null }>[] }>[];
  manualAuthorizations?: readonly Readonly<{ id: string; active: boolean; amountRp: string; reason: string; providerResolutionReference: string; recipientVerificationReference: string; authorizedAt: string; paidAt: string | null; transferReference: string | null }>[];
  approvals: readonly Readonly<{
    version: number; amountRp: string; ownerId: string; reason: string; approvedAt: string;
    returnState: string; returnEvidenceReference: string | null; returnReceivedAt: string | null;
  }>[];
}>;
