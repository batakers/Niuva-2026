import type { RefundCaseStatus } from "@/generated/prisma/client";
export type RefundFormState = Readonly<{
  status: "idle" | "success" | "error"; message?: string;
  values?: Readonly<{ reason: string; category: string; returnState: string; reference: string }>;
}>;

export type RefundCaseView = Readonly<{
  id: string; status: RefundCaseStatus; version: number; category: string; reason: string;
  amountRp: string; currency: string; receivedAt: string; readyAt: string | null; returnState: string | null;
  allocations: readonly Readonly<{ paymentAttemptId: string; purpose: string; amountRp: string }>[];
}>;
export type RefundOrderView = Readonly<{
  orderId: string; orderNumber: string; orderStatus: string; accountClosed: boolean;
  eligibleAmountRp: string | null; eligibilityIssue: string | null; snapshotChanged: boolean;
  refund: RefundCaseView | null;
}>;
export type AdminRefundOrderView = RefundOrderView & Readonly<{
  contactVerificationReference: string | null;
  approvals: readonly Readonly<{
    version: number; amountRp: string; ownerId: string; reason: string; approvedAt: string;
    returnState: string; returnEvidenceReference: string | null; returnReceivedAt: string | null;
  }>[];
}>;
