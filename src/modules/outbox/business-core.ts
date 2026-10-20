import { z } from "zod";
import { emailEnvelopeSchema, type EmailEnvelope } from "../notifications/email-delivery";
import { appError } from "../shared/errors";

export const businessKindSchema = z.enum(["ORDER", "PAYMENT", "QUOTE", "SHIPMENT"]);
export const businessPurposeSchema = z.enum(["ORDER_RECEIVED", "PAYMENT_CONFIRMED", "QUOTE_AVAILABLE", "ORDER_SHIPPED"]);
export type BusinessKind = z.infer<typeof businessKindSchema>;
export type BusinessPurpose = z.infer<typeof businessPurposeSchema>;
export const businessPurposes: Readonly<Record<BusinessKind, BusinessPurpose>> = Object.freeze({ ORDER: "ORDER_RECEIVED", PAYMENT: "PAYMENT_CONFIRMED", QUOTE: "QUOTE_AVAILABLE", SHIPMENT: "ORDER_SHIPPED" });
export const businessInputSchema = z.strictObject({ kind: businessKindSchema, proofId: z.uuid(), deliveryDeadline: z.date() });
export const businessContentSchema = z.strictObject({
  reference: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/),
  accountPath: z.string().regex(/^\/account\/(?:orders|make)\/[0-9a-f-]{36}$/i).refine(value => z.uuid().safeParse(value.split("/").at(-1)).success),
  amountRp: z.string().regex(/^[1-9]\d{0,17}$/).optional(),
  paymentPurpose: z.enum(["ORDER_TOTAL", "CUSTOM_SHIPPING"]).optional(),
  version: z.number().int().positive().max(2147483647).optional(),
});
export type BusinessContent = z.infer<typeof businessContentSchema>;
export const businessPayloadSchema = z.strictObject({ business: z.literal(true), to: z.email().max(254), content: businessContentSchema });
export type BusinessPayload = z.infer<typeof businessPayloadSchema>;
export type BusinessProofProjection = Readonly<{ kind: BusinessKind; proofId: string; purpose: BusinessPurpose; to: string; ownerId: string; sourceAt: Date; expiresAt: Date; content: BusinessContent }>;
export const BUSINESS_MESSAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const policySchema = z.strictObject({ maxAgeMs: z.number().int().positive().max(BUSINESS_MESSAGE_MAX_AGE_MS) });
export type BusinessPolicy = Readonly<z.infer<typeof policySchema>>;
export function parseBusinessPolicy(raw: unknown): BusinessPolicy {
  const parsed = policySchema.safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  return Object.freeze(parsed.data);
}
export function isBusinessKind(raw: unknown): raw is BusinessKind { return businessKindSchema.safeParse(raw).success; }
export function businessEnvelope(raw: unknown): EmailEnvelope {
  const parsed = z.strictObject({ from: emailEnvelopeSchema.shape.from, to: emailEnvelopeSchema.shape.to,
    appOrigin: z.url(), purpose: businessPurposeSchema, content: businessContentSchema }).safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  const { from, to, appOrigin, purpose, content } = parsed.data;
  const origin = new URL(appOrigin);
  if (!["https:", "http:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) throw appError("VALIDATION_ERROR");
  const quote = purpose === "QUOTE_AVAILABLE", payment = purpose === "PAYMENT_CONFIRMED";
  if (!content.accountPath.startsWith(quote ? "/account/make/" : "/account/orders/") ||
    (quote ? content.version === undefined : content.version !== undefined) ||
    (payment ? content.amountRp === undefined || content.paymentPurpose === undefined : content.amountRp !== undefined || content.paymentPurpose !== undefined)) throw appError("VALIDATION_ERROR");
  const url = new URL(content.accountPath, origin.origin).href;
  let subject: string, text: string;
  if (purpose === "ORDER_RECEIVED") {
    subject = `Pesanan ${content.reference} diterima`;
    text = `Pesanan ${content.reference} sudah tercatat di Niuva. Lihat rincian dan status pembayarannya di akun Anda:\n\n${url}`;
  } else if (purpose === "PAYMENT_CONFIRMED") {
    subject = `Pembayaran ${content.reference} terkonfirmasi`;
    const amount = new Intl.NumberFormat("id-ID").format(BigInt(content.amountRp!));
    text = `Pembayaran ${content.paymentPurpose === "CUSTOM_SHIPPING" ? "ongkir final" : "pesanan"} sebesar Rp ${amount} untuk ${content.reference} sudah tercatat berhasil. Lihat status pesanan terbaru di akun Anda:\n\n${url}`;
  } else if (purpose === "QUOTE_AVAILABLE") {
    subject = `Quote ${content.reference} versi ${content.version} tersedia`;
    text = `Quote ${content.reference} versi ${content.version} dapat Anda tinjau di akun Niuva. Periksa rincian, status dan masa berlakunya sebelum memutuskan:\n\n${url}`;
  } else {
    subject = `Pesanan ${content.reference} dikirim`;
    text = `Pesanan ${content.reference} telah dikirim. Lihat rincian pengiriman dan resi terbaru di akun Anda:\n\n${url}`;
  }
  return Object.freeze(emailEnvelopeSchema.parse({ from, to, subject, text }));
}
