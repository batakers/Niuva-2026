import { z } from "zod";
import { readJsonBody } from "@/lib/http/body";
import { validateStartupEnvironment } from "@/lib/env/server";
import { assertMidtransPaymentAllowed, parseMidtransNotification, pickCapabilityEnv, verifyMidtransNotificationSignature, type MidtransSnapGatewayConfig } from "../payment/midtrans";
import { MoneyDecimal } from "../finance/money";
import { appError } from "../shared/errors";
import { parseRefundStatusProof, refundRequestSchema, refundTargetSchema, serializeRefundRequest, type RefundStatusProof, type RefundTarget } from "./execution-core";

const commandSchema = refundTargetSchema.extend({ ...refundRequestSchema.shape, route: z.enum(["refund", "refund/online/direct"]) });
export type RefundCommand = z.infer<typeof commandSchema>;
export type RefundSubmissionResult = { kind: "accepted"; reference: string | null } | { kind: "rejected"; category: "INVALID_AMOUNT" | "BANK_DENIED" } |
  { kind: "retryable"; retryAfterMs: number } | { kind: "unknown"; reason: "TIMEOUT" | "PROVIDER_ERROR" | "INVALID_RESPONSE" | "IDENTITY_MISMATCH" };
export type RefundQueryResult = { kind: "found"; proof: RefundStatusProof } | { kind: "not-found" } |
  { kind: "unavailable"; reason: "TIMEOUT" | "PROVIDER_ERROR" | "INVALID_RESPONSE" | "IDENTITY_MISMATCH" | "RATE_LIMITED"; retryAfterMs?: number };
export type RefundGateway = { submit(command: unknown, signal: AbortSignal): Promise<RefundSubmissionResult>; getStatus(target: unknown, signal: AbortSignal): Promise<RefundQueryResult> };
type Config = Omit<MidtransSnapGatewayConfig, "endpoint">;
const referenceSchema = z.union([z.string().regex(/^[A-Za-z0-9._-]{1,128}$/), z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).transform(String)]);
const responseSchema = z.object({ status_code: z.string(), order_id: z.string(), transaction_id: z.string(), transaction_status: z.string(),
  gross_amount: z.string(), refund_amount: z.string(), refund_key: z.string(), refund_chargeback_id: referenceSchema.optional(), currency: z.literal("IDR").optional() });
function equalRp(value: string, expected: string) { return /^\d{1,18}(?:\.0{1,6})?$/.test(value) && new MoneyDecimal(value).eq(expected); }
function retryAfter(response: Response) { const value = response.headers.get("retry-after"); return value && /^\d{1,6}$/.test(value) ? Math.min(Number(value) * 1000, 3600000) : 0; }

export class MidtransRefundGateway implements RefundGateway {
  private readonly config: Config;
  constructor(config: Config) { this.config = Object.freeze({ ...config, capabilityEnv: Object.freeze({ ...config.capabilityEnv }) }); }
  private async bounded<T>(caller: AbortSignal, timeout: T, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const signal = AbortSignal.any([caller, AbortSignal.timeout(8000)]);
    if (signal.aborted) return timeout;
    let onAbort: () => void = () => {};
    const aborted = new Promise<T>(resolve => { onAbort = () => resolve(timeout); signal.addEventListener("abort", onAbort, { once: true }); });
    try { return await Promise.race([work(signal), aborted]); } finally { signal.removeEventListener("abort", onAbort); }
  }
  private headers() { return { Accept: "application/json", Authorization: `Basic ${Buffer.from(this.config.serverKey + ":").toString("base64")}` }; }
  async submit(raw: unknown, caller: AbortSignal): Promise<RefundSubmissionResult> {
    assertMidtransPaymentAllowed(this.config);
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    return this.bounded<RefundSubmissionResult>(caller, { kind: "unknown", reason: "TIMEOUT" }, signal => this.submitIn(parsed.data, signal));
  }
  private async submitIn(command: RefundCommand, signal: AbortSignal): Promise<RefundSubmissionResult> {
    try {
      const response = await (this.config.fetch ?? fetch)(`https://api.sandbox.midtrans.com/v2/${encodeURIComponent(command.providerTransactionId)}/${command.route}`, {
        method: "POST", headers: { ...this.headers(), "Content-Type": "application/json" }, signal, redirect: "error", cache: "no-store",
        body: serializeRefundRequest({ refundKey: command.refundKey, amountRp: command.amountRp, reason: command.reason }),
      });
      if (response.status === 429) { const retryAfterMs = retryAfter(response); await response.body?.cancel(); return { kind: "retryable", retryAfterMs }; }
      if (!response.ok) { await response.body?.cancel(); return { kind: "unknown", reason: "PROVIDER_ERROR" }; }
      const raw: unknown = await readJsonBody(response, { maxBytes: 16384 });
      const code = z.object({ status_code: z.string() }).safeParse(raw);
      if (code.success && code.data.status_code === "414") return { kind: "rejected", category: "INVALID_AMOUNT" };
      const parsed = responseSchema.safeParse(raw);
      if (!parsed.success) return { kind: "unknown", reason: "INVALID_RESPONSE" };
      const value = parsed.data;
      if (value.order_id !== command.providerOrderId || value.transaction_id !== command.providerTransactionId || value.refund_key !== command.refundKey || !equalRp(value.gross_amount, command.amountRp)) return { kind: "unknown", reason: "IDENTITY_MISMATCH" };
      if (value.status_code === "202" && value.transaction_status.toLowerCase() === "settlement" && equalRp(value.refund_amount, "0")) return { kind: "rejected", category: "BANK_DENIED" };
      if (value.status_code !== "200" || value.transaction_status.toLowerCase() !== "refund" || !equalRp(value.refund_amount, command.amountRp)) return { kind: "unknown", reason: "INVALID_RESPONSE" };
      return { kind: "accepted", reference: value.refund_chargeback_id ?? null };
    } catch { return { kind: "unknown", reason: signal.aborted ? "TIMEOUT" : "INVALID_RESPONSE" }; }
  }
  async getStatus(raw: unknown, caller: AbortSignal): Promise<RefundQueryResult> {
    assertMidtransPaymentAllowed(this.config);
    const parsed = refundTargetSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    return this.bounded<RefundQueryResult>(caller, { kind: "unavailable", reason: "TIMEOUT" }, signal => this.statusIn(parsed.data, signal));
  }
  private async statusIn(target: RefundTarget, signal: AbortSignal): Promise<RefundQueryResult> {
    try {
      const response = await (this.config.fetch ?? fetch)(`https://api.sandbox.midtrans.com/v2/${encodeURIComponent(target.providerTransactionId)}/status`, { method: "GET", headers: this.headers(), signal, redirect: "error", cache: "no-store" });
      if (response.status === 404) { await response.body?.cancel(); return { kind: "not-found" }; }
      if (!response.ok) { const retryAfterMs = retryAfter(response); await response.body?.cancel(); return response.status === 429 ? { kind: "unavailable", reason: "RATE_LIMITED", retryAfterMs } : { kind: "unavailable", reason: "PROVIDER_ERROR" }; }
      const raw: unknown = await readJsonBody(response, { maxBytes: 16384 });
      if (z.object({ status_code: z.literal("404") }).safeParse(raw).success) return { kind: "not-found" };
      const notification = parseMidtransNotification(raw);
      verifyMidtransNotificationSignature(notification, this.config.serverKey);
      if (notification.orderId !== target.providerOrderId || notification.transactionId !== target.providerTransactionId) return { kind: "unavailable", reason: "IDENTITY_MISMATCH" };
      return { kind: "found", proof: parseRefundStatusProof(raw, target, (this.config.now ?? (() => new Date()))()) };
    } catch { return { kind: "unavailable", reason: signal.aborted ? "TIMEOUT" : "INVALID_RESPONSE" }; }
  }
}
export function createMidtransRefundGateway(source: Readonly<Record<string, string | undefined>>): RefundGateway {
  const environment = validateStartupEnvironment(source);
  if (environment.MIDTRANS_SERVER_KEY === undefined || environment.MIDTRANS_IS_PRODUCTION === undefined || environment.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY === undefined) throw appError("PROVIDER_UNAVAILABLE");
  return new MidtransRefundGateway({ serverKey: environment.MIDTRANS_SERVER_KEY, isProduction: environment.MIDTRANS_IS_PRODUCTION, nodeEnv: environment.NODE_ENV, capabilityEnv: pickCapabilityEnv(source) });
}
