import { AppError } from "../shared/errors";
import { z } from "zod";
import type { ResendEmailResult } from "./resend";
export const emailEnvelopeSchema = z.strictObject({
  from: z.string().min(1).max(320).regex(/^[^\r\n]+$/), to: z.email().max(254),
  subject: z.string().min(1).max(998).regex(/^[^\r\n]+$/), text: z.string().min(1).max(8192),
});
export type EmailEnvelope = Readonly<z.infer<typeof emailEnvelopeSchema>>;
export type PreparedCustomerEmail = { envelope: EmailEnvelope; send(envelope: EmailEnvelope, idempotencyKey: string, signal?: AbortSignal): Promise<ResendEmailResult | void> };
export type EmailDeliveryFailureKind = "RETRYABLE" | "PERMANENT" | "UNKNOWN";
export class EmailDeliveryError extends AppError {
  constructor(readonly kind: EmailDeliveryFailureKind, readonly retryAfterMs = 0) { super("PROVIDER_UNAVAILABLE", { message: "Layanan email sedang tidak tersedia." }); }
}
