import type { OutboxMetadata, OutboxPayload, OutboxPurpose } from "./core";
import { appError } from "../shared/errors";
import { z } from "zod";
import type { EmailEnvelope } from "../notifications/email-delivery";
export type WorkerRequest = { mode: "dry-run" | "execute"; limit: number };
export type WorkerPolicy = Readonly<{ leaseMs: number; sendTimeoutMs: number; retryDelaysMs: readonly number[] }>;
export type DeliveryOutcome = { kind: "accepted"; providerReference: string | null } | { kind: "retryable"; retryAfterMs?: number } | { kind: "permanent" } | { kind: "unknown" };
export type OutboxDispatch = { metadata: OutboxMetadata; payload: OutboxPayload };
export type PreparedOutboxDelivery = { envelope: EmailEnvelope; send(envelope: EmailEnvelope, signal: AbortSignal): Promise<DeliveryOutcome> };
export type OutboxSender = { assertReady(purpose: OutboxPurpose): void; prepare(message: OutboxDispatch): PreparedOutboxDelivery; send(message: OutboxDispatch, signal: AbortSignal): Promise<DeliveryOutcome> };
export type WorkerSummary = WorkerRequest & { scanned: number; claimed: number; accepted: number; retried: number; failed: number; unknown: number; cancelled: number; expired: number; lostLease: number; cooldownMs: number };
export type AttemptAction = { state: "PENDING"; dueAt: Date; failureCategory: string } | { state: "ACCEPTED" | "FAILED" | "CANCELLED" | "EXPIRED"; failureCategory: string | null; providerReference?: string | null };
const duration = z.number().int().positive().max(2_147_483_647);
const requestSchema = z.strictObject({ mode: z.enum(["dry-run", "execute"]), limit: z.number().int().min(1).max(100) });
const policySchema = z.strictObject({ leaseMs: duration, sendTimeoutMs: duration, retryDelaysMs: z.array(duration).max(99) }).refine(value => value.sendTimeoutMs < value.leaseMs);
export function parseWorkerRequest(raw: unknown): WorkerRequest {
  const result = requestSchema.safeParse(raw);
  if (!result.success) throw appError("VALIDATION_ERROR");
  return result.data;
}
export function parseWorkerPolicy(raw: unknown): WorkerPolicy {
  const result = policySchema.safeParse(raw);
  if (!result.success) throw appError("VALIDATION_ERROR");
  return Object.freeze({ ...result.data, retryDelaysMs: Object.freeze([...result.data.retryDelaysMs]) });
}
const outcomeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("accepted"), providerReference: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/).nullable() }),
  z.strictObject({ kind: z.literal("retryable"), retryAfterMs: z.number().int().min(0).max(2_147_483_647).optional() }),
  z.strictObject({ kind: z.literal("permanent") }), z.strictObject({ kind: z.literal("unknown") }),
]);
export function parseDeliveryOutcome(raw: unknown): DeliveryOutcome {
  const result = outcomeSchema.safeParse(raw);
  return result.success ? result.data : { kind: "unknown" };
}
