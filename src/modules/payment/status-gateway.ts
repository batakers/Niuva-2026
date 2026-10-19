import { z } from "zod";
import { validateStartupEnvironment } from "@/lib/env/server";
import { readJsonBody } from "@/lib/http/body";
import { appError } from "../shared/errors";
import { assertMidtransPaymentAllowed, parseMidtransNotification, pickCapabilityEnv, verifyMidtransNotificationSignature, type MidtransNotification, type MidtransSnapGatewayConfig } from "./midtrans";

const identity = z.string().regex(/^[A-Za-z0-9._-]+$/);
const targetSchema = z.strictObject({ providerOrderId: identity.max(64), providerTransactionId: identity.max(128).nullable() });
export type PaymentStatusTarget = z.infer<typeof targetSchema>;
export type PaymentStatusResult = { kind: "found"; notification: MidtransNotification } | { kind: "not-found" } |
  { kind: "unavailable"; reason: "TIMEOUT" | "RATE_LIMITED" | "PROVIDER_ERROR" | "INVALID_RESPONSE" | "IDENTITY_MISMATCH"; retryAfterMs?: number };
export type PaymentStatusGateway = { getStatus(target: PaymentStatusTarget, signal: AbortSignal): Promise<PaymentStatusResult> };
type Config = Omit<MidtransSnapGatewayConfig, "endpoint" | "now">;

export class MidtransStatusGateway implements PaymentStatusGateway {
  private readonly config: Config;
  constructor(config: Config) { this.config = Object.freeze({ ...config, capabilityEnv: Object.freeze({ ...config.capabilityEnv }) }); }
  async getStatus(raw: PaymentStatusTarget, callerSignal: AbortSignal): Promise<PaymentStatusResult> {
    assertMidtransPaymentAllowed(this.config);
    const parsed = targetSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    const signal = AbortSignal.any([callerSignal, AbortSignal.timeout(8000)]);
    if (signal.aborted) return { kind: "unavailable", reason: "TIMEOUT" };
    let onAbort: () => void = () => {};
    const aborted = new Promise<PaymentStatusResult>(resolve => { onAbort = () => resolve({ kind: "unavailable", reason: "TIMEOUT" }); signal.addEventListener("abort", onAbort, { once: true }); });
    try { return await Promise.race([this.fetchStatus(parsed.data, signal), aborted]); }
    finally { signal.removeEventListener("abort", onAbort); }
  }
  private async fetchStatus(target: PaymentStatusTarget, signal: AbortSignal): Promise<PaymentStatusResult> {
    try {
      const reference = target.providerTransactionId ?? target.providerOrderId;
      const response = await (this.config.fetch ?? fetch)(`https://api.sandbox.midtrans.com/v2/${encodeURIComponent(reference)}/status`, {
        method: "GET", cache: "no-store", redirect: "error", signal,
        headers: { Accept: "application/json", Authorization: `Basic ${Buffer.from(this.config.serverKey + ":").toString("base64")}` },
      });
      if (response.status === 404) { await response.body?.cancel(); return { kind: "not-found" }; }
      if (!response.ok) {
        const retry = response.headers.get("retry-after"), retryAfterMs = retry && /^\d{1,6}$/.test(retry) ? Math.min(Number(retry) * 1000, 3600000) : 0;
        await response.body?.cancel();
        return response.status === 429 ? { kind: "unavailable", reason: "RATE_LIMITED", retryAfterMs } : { kind: "unavailable", reason: "PROVIDER_ERROR" };
      }
      const raw: unknown = await readJsonBody(response, { maxBytes: 16384 });
      const base = z.object({ status_code: z.string(), currency: z.literal("IDR").optional(), transaction_status: z.string().optional() }).safeParse(raw);
      if (!base.success || raw === null || typeof raw !== "object") return { kind: "unavailable", reason: "INVALID_RESPONSE" };
      if (base.data.status_code === "404") return { kind: "not-found" };
      const notification = parseMidtransNotification({ ...raw, transaction_status: base.data.transaction_status?.toLowerCase() });
      verifyMidtransNotificationSignature(notification, this.config.serverKey);
      if (notification.orderId !== target.providerOrderId || target.providerTransactionId !== null && notification.transactionId !== target.providerTransactionId) return { kind: "unavailable", reason: "IDENTITY_MISMATCH" };
      return { kind: "found", notification };
    } catch { return { kind: "unavailable", reason: signal.aborted ? "TIMEOUT" : "INVALID_RESPONSE" }; }
  }
}
export function createMidtransStatusGateway(source: Readonly<Record<string, string | undefined>>): PaymentStatusGateway {
  const environment = validateStartupEnvironment(source);
  if (environment.MIDTRANS_SERVER_KEY === undefined || environment.MIDTRANS_IS_PRODUCTION === undefined || environment.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY === undefined) throw appError("PROVIDER_UNAVAILABLE");
  return new MidtransStatusGateway({ serverKey: environment.MIDTRANS_SERVER_KEY, isProduction: environment.MIDTRANS_IS_PRODUCTION, nodeEnv: environment.NODE_ENV, capabilityEnv: pickCapabilityEnv(source) });
}
