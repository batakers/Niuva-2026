import { z } from "zod";
import { MoneyDecimal } from "../finance/money";
import { appError } from "../shared/errors";

export const REFUND_KEY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const identity = z.string().regex(/^[A-Za-z0-9._-]+$/);
const key = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const integerRp = z.string().regex(/^[1-9]\d{0,17}$/);
export const refundTargetSchema = z.strictObject({ providerOrderId: identity.max(64), providerTransactionId: identity.max(128), amountRp: integerRp });
export type RefundTarget = z.infer<typeof refundTargetSchema>;
export const providerReasonSchema = z.string().trim().min(10).max(255).regex(/^[^\r\n]+$/).refine(value => !/https?:\/\/|[?&](token|signature|key)=/i.test(value));
export const refundRequestSchema = z.strictObject({ refundKey: key, amountRp: integerRp, reason: providerReasonSchema });
export function refundKeyForAllocation(raw: string): string {
  const parsed = z.uuid().safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  return `rf_${parsed.data.toLowerCase().replaceAll("-", "")}`;
}
export function serializeRefundRequest(raw: unknown): string {
  const parsed = refundRequestSchema.safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  return `{"refund_key":${JSON.stringify(parsed.data.refundKey)},"amount":${parsed.data.amountRp},"reason":${JSON.stringify(parsed.data.reason)}}`;
}
export function canRetryRefund(operation: { state: string; firstAttemptAt: Date | null; attempts: number; maxAttempts: number }, now: Date): boolean {
  const first = operation.firstAttemptAt?.getTime(), current = now.getTime();
  return operation.state === "RETRYABLE" && first !== undefined && Number.isFinite(first) && Number.isFinite(current) && current >= first &&
    Number.isSafeInteger(operation.attempts) && operation.attempts > 0 && Number.isSafeInteger(operation.maxAttempts) && operation.maxAttempts > operation.attempts &&
    operation.maxAttempts <= 2147483647 && current < first + REFUND_KEY_WINDOW_MS;
}
function rupiah(raw: string, zero = false): string {
  if (!/^\d{1,18}(?:\.\d{1,6})?$/.test(raw)) throw appError("PROVIDER_UNAVAILABLE");
  const value = new MoneyDecimal(raw);
  if (!value.isInteger() || (zero ? value.lt(0) : value.lte(0))) throw appError("PROVIDER_UNAVAILABLE");
  return value.toFixed(0);
}
function confirmedDate(raw: string | null | undefined, now: Date): Date | null {
  if (!raw) return null;
  const local = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw);
  const iso = local ? `${raw.replace(" ", "T")}+07:00` : raw;
  if (!z.iso.datetime({ offset: true }).safeParse(iso).success) throw appError("PROVIDER_UNAVAILABLE");
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date > now || local && new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 19) !== raw.replace(" ", "T")) throw appError("PROVIDER_UNAVAILABLE");
  return date;
}
const itemSchema = z.object({ refund_key: key, refund_chargeback_id: z.union([identity.max(128), z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).transform(String)]),
  refund_amount: z.string(), bank_confirmed_at: z.string().nullable().optional() });
const statusSchema = z.object({ order_id: identity.max(64), transaction_id: identity.max(128), status_code: z.literal("200"),
  payment_type: z.string().regex(/^[a-z0-9_]{1,80}$/), transaction_status: z.string(), gross_amount: z.string(), currency: z.literal("IDR").optional(), fraud_status: z.enum(["accept", "deny", "challenge"]).optional(),
  acquirer: identity.max(80).optional(), bank: identity.max(80).optional(), refund_amount: z.string().optional(), refunds: z.array(itemSchema).max(100).optional() });
export type RefundBankItem = Readonly<{ refundKey: string; reference: string; amountRp: string; confirmedAt: Date | null }>;
export type RefundStatusProof = Readonly<{ kind: "SETTLED" | "PENDING" | "CONFIRMED" | "PARTIAL" | "INELIGIBLE";
  providerOrderId: string; providerTransactionId: string; paymentType: string; providerChannel: string | null; transactionStatus: string; amountRp: string; refundedRp: string; refunds: readonly RefundBankItem[] }>;
export function parseRefundStatusProof(raw: unknown, expected: RefundTarget, now: Date): RefundStatusProof {
  const parsed = statusSchema.safeParse(raw), target = refundTargetSchema.safeParse(expected);
  if (!parsed.success || !target.success || !Number.isFinite(now.getTime())) throw appError("PROVIDER_UNAVAILABLE");
  const value = parsed.data;
  if (value.order_id !== target.data.providerOrderId || value.transaction_id !== target.data.providerTransactionId || rupiah(value.gross_amount) !== target.data.amountRp) throw appError("PROVIDER_UNAVAILABLE");
  const refunds = (value.refunds ?? []).map(item => ({ refundKey: item.refund_key, reference: item.refund_chargeback_id, amountRp: rupiah(item.refund_amount), confirmedAt: confirmedDate(item.bank_confirmed_at, now) }));
  if (new Set(refunds.map(item => item.refundKey)).size !== refunds.length || new Set(refunds.map(item => item.reference)).size !== refunds.length) throw appError("PROVIDER_UNAVAILABLE");
  refunds.sort((left, right) => left.refundKey.localeCompare(right.refundKey));
  const total = refunds.reduce((sum, item) => sum.plus(item.amountRp), new MoneyDecimal(0));
  const refundedRp = value.refund_amount === undefined ? total.toFixed(0) : rupiah(value.refund_amount, true);
  if (new MoneyDecimal(refundedRp).gt(target.data.amountRp) || value.refunds !== undefined && !total.eq(refundedRp)) throw appError("PROVIDER_UNAVAILABLE");
  const state = value.transaction_status.toLowerCase();
  let kind: RefundStatusProof["kind"] = "INELIGIBLE";
  if (state === "settlement" && (!value.fraud_status || value.fraud_status === "accept")) kind = new MoneyDecimal(refundedRp).isZero() && refunds.length === 0 ? "SETTLED" : "PENDING";
  if (state === "refund" || state === "partial_refund") {
    kind = state === "partial_refund" || new MoneyDecimal(refundedRp).gt(0) && new MoneyDecimal(refundedRp).lt(target.data.amountRp) ? "PARTIAL" :
      refunds.length > 0 && total.eq(target.data.amountRp) && refunds.every(item => item.confirmedAt !== null) ? "CONFIRMED" : "PENDING";
  }
  return { kind, providerOrderId: value.order_id, providerTransactionId: value.transaction_id, paymentType: value.payment_type,
    providerChannel: value.acquirer ?? value.bank ?? null, transactionStatus: state, amountRp: target.data.amountRp, refundedRp, refunds };
}
