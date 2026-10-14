import type { CustomerAuthMailer } from "../customer-auth/email-mailer";
import type { PrivacyMailer } from "../customer-privacy/mailer";
import { outboxMetadataSchema, outboxPayloadSchema, type OutboxPurpose } from "./core";
import type { OutboxSender, OutboxDispatch, DeliveryOutcome, PreparedOutboxDelivery } from "./worker-core";
import { appError } from "../shared/errors";
import { EmailDeliveryError, emailEnvelopeSchema } from "../notifications/email-delivery";
export class CustomerOutboxSender implements OutboxSender {
  private readonly auth: CustomerAuthMailer | null;
  private readonly privacy: PrivacyMailer | null;
  constructor(options: { auth: CustomerAuthMailer | null; privacy: PrivacyMailer | null }) { this.auth = options.auth; this.privacy = options.privacy; }
  assertReady(purpose: OutboxPurpose): void {
    if (purpose === "AUTH_VERIFY" || purpose === "AUTH_RESET") { if (this.auth) return; }
    if (purpose === "PRIVACY_EXPORT" || purpose === "PRIVACY_CLOSE") { if (this.privacy) return; }
    throw appError("PROVIDER_UNAVAILABLE");
  }
  prepare(message: OutboxDispatch): PreparedOutboxDelivery {
    const meta = outboxMetadataSchema.parse(message.metadata), payload = outboxPayloadSchema.parse(message.payload);
    const { purpose, messageKey } = meta, auth = purpose === "AUTH_VERIFY" || purpose === "AUTH_RESET";
    this.assertReady(purpose);
    if (auth ? payload.returnTo === null : payload.returnTo !== null) throw appError("PROVIDER_UNAVAILABLE");
    const ready = auth
      ? this.auth?.prepare?.({ to: payload.to, token: payload.token, purpose: purpose === "AUTH_VERIFY" ? "verify" : "reset", returnTo: payload.returnTo!, idempotencyKey: messageKey })
      : this.privacy?.prepare?.({ to: payload.to, token: payload.token, purpose: purpose === "PRIVACY_EXPORT" ? "EXPORT" : "CLOSE", idempotencyKey: messageKey });
    if (!ready) throw appError("PROVIDER_UNAVAILABLE");
    const envelope = Object.freeze(emailEnvelopeSchema.parse(ready.envelope));
    if (envelope.to !== payload.to) throw appError("PROVIDER_UNAVAILABLE");
    return { envelope, async send(saved, signal) {
      if (signal.aborted) return { kind: "unknown" };
      try {
        const result = await ready.send(saved, messageKey, signal);
        if (result === undefined) return { kind: "accepted", providerReference: null };
        return typeof result.id === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(result.id) ? { kind: "accepted", providerReference: result.id } : { kind: "unknown" };
      } catch (error) {
        if (error instanceof EmailDeliveryError) {
          if (error.kind === "RETRYABLE") return { kind: "retryable", retryAfterMs: error.retryAfterMs };
          if (error.kind === "PERMANENT") return { kind: "permanent" };
        }
        return { kind: "unknown" };
      }
    } };
  }
  async send(message: OutboxDispatch, signal: AbortSignal): Promise<DeliveryOutcome> {
    const meta = outboxMetadataSchema.safeParse(message.metadata), content = outboxPayloadSchema.safeParse(message.payload);
    if (!meta.success || !content.success) return { kind: "permanent" };
    if (signal.aborted) return { kind: "unknown" };
    const { purpose, messageKey } = meta.data, payload = content.data;
    const auth = purpose === "AUTH_VERIFY" || purpose === "AUTH_RESET";
    if (auth ? payload.returnTo === null : payload.returnTo !== null) return { kind: "permanent" };
    try {
      this.assertReady(purpose);
      const result = auth
        ? await this.auth!.send({ to: payload.to, token: payload.token, purpose: purpose === "AUTH_VERIFY" ? "verify" : "reset", returnTo: payload.returnTo!, idempotencyKey: messageKey, signal })
        : await this.privacy!.send({ to: payload.to, token: payload.token, purpose: purpose === "PRIVACY_EXPORT" ? "EXPORT" : "CLOSE", idempotencyKey: messageKey, signal });
      if (result === undefined) return { kind: "accepted", providerReference: null };
      if (typeof result.id !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(result.id)) return { kind: "unknown" };
      return { kind: "accepted", providerReference: result.id };
    } catch (error) {
      if (error instanceof EmailDeliveryError) {
        if (error.kind === "RETRYABLE") return { kind: "retryable", retryAfterMs: error.retryAfterMs };
        if (error.kind === "PERMANENT") return { kind: "permanent" };
      }
      return { kind: "unknown" };
    }
  }
}
