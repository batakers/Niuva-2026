import { z } from "zod";
import type { Prisma } from "../../generated/prisma/client";
import { appError } from "../shared/errors";

export const jobNameSchema = z.enum(["OUTBOX_DELIVERY", "OUTBOX_EXPIRY", "CUSTOMER_AUTH_CLEANUP", "CUSTOMER_PRIVACY_CLEANUP", "INVENTORY_RESERVATIONS", "PAYMENT_RECONCILIATION"]);
const elapsed = z.number().int().min(0).max(2147483647);
const duration = elapsed.min(1);
const requestSchema = z.strictObject({ job: jobNameSchema, mode: z.enum(["dry-run", "execute"]), limit: z.number().int().min(1).max(100) });
const policySchema = z.strictObject({ leaseMs: duration, minIntervalMs: elapsed, failureCooldownMs: duration });
const counter = z.enum(["scanned", "claimed", "accepted", "retried", "failed", "unknown", "cancelled", "expired", "lostLease", "cleaned", "customers", "pending", "consentProofs", "caseContents", "caseReceipts", "activeHolds", "overdueHolds", "confirmations", "sessions", "emailTokens", "internalGoogleConsents", "authRateLimits", "pendingRegistrations", "closureFences", "privacyAuditEvents", "released", "remainingDue", "lagMs"]);
const resultSchema = z.strictObject({ counts: z.partialRecord(counter, z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)), cooldownMs: elapsed.optional(), failure: z.enum(["JOB_FAILED", "DELIVERY_FAILED", "OUTCOME_UNKNOWN"]).optional() });
export type JobName = z.infer<typeof jobNameSchema>;
export type JobRequest = z.infer<typeof requestSchema>;
export type JobPolicy = Readonly<z.infer<typeof policySchema>>;
export type JobResult = z.infer<typeof resultSchema>;
export type JobLease = Readonly<{ job: JobName; id: string; expiresAt: Date }>;
export type JobContext = Readonly<{
  request: JobRequest; lease: JobLease | null;
  withLease<T>(work: (tx: Prisma.TransactionClient, now: Date) => Promise<T>): Promise<T>;
  verifyLease(tx: Prisma.TransactionClient): Promise<Date>;
  recordCooldown(tx: Prisma.TransactionClient, until: Date): Promise<void>;
}>;
export type JobHandler = (context: JobContext) => Promise<JobResult>;
export type JobRunSummary = { job: JobName; mode: JobRequest["mode"]; state: "completed" | "failed" | "busy" | "cooldown" | "lost-lease"; counts: JobResult["counts"]; cooldownMs?: number };
function parse<T>(schema: z.ZodType<T>, raw: unknown): T { const result = schema.safeParse(raw); if (!result.success) throw appError("VALIDATION_ERROR"); return result.data; }
export function parseJobRequest(raw: unknown): JobRequest { return Object.freeze(parse(requestSchema, raw)); }
export function parseJobPolicy(raw: unknown): JobPolicy { return Object.freeze(parse(policySchema, raw)); }
export function parseJobResult(raw: unknown): JobResult { return parse(resultSchema, raw); }
export function parseJobRole(raw: unknown): string { const parsed = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,62}$/).safeParse(raw); if (!parsed.success) throw appError("PROVIDER_UNAVAILABLE"); return parsed.data; }
