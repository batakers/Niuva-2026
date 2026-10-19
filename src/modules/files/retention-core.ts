import { z } from "zod";
import { fileDeletionEligibleAt } from "../policy/privacy";

export const fileRetentionClassSchema = z.enum([
  "ABANDONED_OR_REJECTED_UPLOAD", "CANCELLED_OR_UNPAID_REQUEST", "COMPLETED_CUSTOM_ORDER",
]);
type RetentionClass = z.infer<typeof fileRetentionClassSchema>;
export type FileRetentionFacts = Readonly<{
  bucketScope: string; purpose: string; uploadStatus: string; storageKey: string;
  createdAt: Date; uploadedAt: Date | null; verifiedAt: Date | null;
  hasFinancialOwner: boolean; hasHistoricalOwner: boolean; held: boolean;
  retentionClass: string | null; retentionEligibleAt: Date | null;
  request: null | Readonly<{
    status: string; updatedAt: Date;
    quotes: readonly Readonly<{ status: string; expiresAt: Date | null; createdAt: Date; sentAt: Date | null }>[];
    orders: readonly Readonly<{ status: string; completedAt: Date | null; cancelledAt: Date | null; updatedAt: Date; pendingPayment: boolean; settledPayment: boolean }>[];
  }>;
}>;
export type FileRetentionDecision = Readonly<{
  state: "protected" | "held" | "not-due" | "due";
  retentionClass?: RetentionClass; eligibleAt?: Date;
}>;
function latest(dates: readonly (Date | null)[]): Date {
  return new Date(Math.max(...dates.flatMap(date => date === null ? [] : [date.getTime()])));
}

/** The binary policy never authorizes deletion of accounting or historical B2B records. */
export function decideFileRetention(file: FileRetentionFacts, now: Date): FileRetentionDecision {
  if (file.bucketScope !== "PRIVATE_CUSTOMER" || file.purpose !== "CUSTOMER_UPLOAD"
    || file.hasFinancialOwner || file.hasHistoricalOwner || file.uploadStatus === "DELETED"
    || !/^private\/customer\/[a-zA-Z0-9-]+$/.test(file.storageKey)) return { state: "protected" };
  if (file.held) return { state: "held" };
  const request = file.request;
  if (request?.orders.some(order => !["COMPLETED", "CANCELLED"].includes(order.status) || order.pendingPayment
    || order.status === "CANCELLED" && order.settledPayment)) return { state: "protected" };
  if (file.uploadStatus === "DELETE_PENDING") {
    const parsed = fileRetentionClassSchema.safeParse(file.retentionClass);
    if (!parsed.success || file.retentionEligibleAt === null) return { state: "protected" };
    return { state: file.retentionEligibleAt <= now ? "due" : "not-due", retentionClass: parsed.data, eligibleAt: file.retentionEligibleAt };
  }
  let retentionClass: RetentionClass, startingAt: Date;
  const fileActivity = latest([file.createdAt, file.uploadedAt, file.verifiedAt]);
  if (request === null) {
    retentionClass = "ABANDONED_OR_REJECTED_UPLOAD";
    startingAt = fileActivity;
  } else {
    const completed = request.orders.filter(order => order.status === "COMPLETED");
    if (completed.length > 0) {
      if (completed.some(order => order.completedAt === null)) return { state: "protected" };
      retentionClass = "COMPLETED_CUSTOM_ORDER";
      startingAt = latest(completed.map(order => order.completedAt));
      if (fileActivity > startingAt) return { state: "protected" };
    } else {
      const activeQuote = request.quotes.some(quote => quote.status === "DRAFT"
        || quote.status === "SENT" && (quote.expiresAt === null || quote.expiresAt > now)
        || quote.status === "ACCEPTED" && request.orders.length === 0);
      if (activeQuote) return { state: "protected" };
      const expiredUnpaid = request.status === "QUOTE_SENT" && request.quotes.length > 0
        && request.quotes.every(quote => quote.status === "EXPIRED" || quote.status === "DECLINED"
          || quote.status === "SENT" && quote.expiresAt !== null && quote.expiresAt <= now);
      if (!["CANCELLED", "DECLINED"].includes(request.status) && !expiredUnpaid
        && !(request.status === "APPROVED" && request.orders.length > 0)) return { state: "protected" };
      retentionClass = "CANCELLED_OR_UNPAID_REQUEST";
      startingAt = latest([fileActivity, request.updatedAt, ...request.quotes.flatMap(quote => [quote.createdAt, quote.sentAt, quote.expiresAt]),
        ...request.orders.map(order => order.cancelledAt ?? order.updatedAt)]);
    }
  }
  const eligibleAt = fileDeletionEligibleAt(startingAt, retentionClass);
  return { state: eligibleAt <= now ? "due" : "not-due", retentionClass, eligibleAt };
}
