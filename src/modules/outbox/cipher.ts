import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { outboxMetadataSchema, outboxPayloadSchema, type OutboxMetadata, type OutboxPayload } from "./core";
import { emailEnvelopeSchema, type EmailEnvelope } from "../notifications/email-delivery";

export type OutboxCipherConfig = Readonly<{ activeKeyId: string; keys: Readonly<Record<string, string>> }>;
const keyIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const configSchema = z.strictObject({ activeKeyId: keyIdSchema, keys: z.record(keyIdSchema, z.string()) });
const envelopeSchema = z.strictObject({ v: z.literal(1), kid: keyIdSchema, iv: z.string(), tag: z.string(), ct: z.string() });
function failure() { return new Error("Outbox payload protection unavailable."); }
function decode(value: string, length?: number): Buffer {
  const buffer = Buffer.from(value, "base64");
  if (!buffer.length || buffer.toString("base64") !== value || (length !== undefined && buffer.length !== length)) throw failure();
  return buffer;
}
function validateConfig(raw: unknown) {
  try {
    const config = configSchema.parse(raw);
    const keys = new Map(Object.entries(config.keys).map(([id, value]) => [id, decode(value, 32)]));
    if (!keys.has(config.activeKeyId)) throw failure();
    return { config, keys };
  } catch { throw failure(); }
}
function aad(metadata: OutboxMetadata, kid: string, delivery = false): Buffer {
  const value = outboxMetadataSchema.parse(metadata);
  return Buffer.from(JSON.stringify([
    delivery ? "niuva-outbox-delivery-v1" : "niuva-outbox-v1", kid, value.id, value.messageKey, value.proofKind, value.proofId,
    value.purpose, value.templateVersion, value.fingerprint, value.expiresAt.toISOString(),
  ]));
}
export function readOutboxCipherConfig(source: Readonly<Record<string, string | undefined>>): OutboxCipherConfig {
  const { config } = validateConfig({ activeKeyId: source.NIUVA_OUTBOX_ENCRYPTION_KEY_ID,
    keys: { [source.NIUVA_OUTBOX_ENCRYPTION_KEY_ID ?? ""]: source.NIUVA_OUTBOX_ENCRYPTION_KEY } });
  return Object.freeze({ activeKeyId: config.activeKeyId, keys: Object.freeze({ ...config.keys }) });
}
export class OutboxPayloadCipher {
  private readonly activeKeyId: string;
  private readonly keys: Map<string, Buffer>;
  constructor(config: OutboxCipherConfig) {
    const validated = validateConfig(config);
    this.activeKeyId = validated.config.activeKeyId;
    this.keys = validated.keys;
  }
  seal(payload: OutboxPayload, metadata: OutboxMetadata): string {
    try { return this.sealValue(outboxPayloadSchema.parse(payload), metadata, false); } catch { throw failure(); }
  }
  sealEnvelope(envelope: EmailEnvelope, metadata: OutboxMetadata): string {
    try { return this.sealValue(emailEnvelopeSchema.parse(envelope), metadata, true); } catch { throw failure(); }
  }
  private sealValue(value: unknown, metadata: OutboxMetadata, delivery: boolean): string {
    try {
      const iv = randomBytes(12), kid = this.activeKeyId;
      const key = this.keys.get(kid);
      if (!key) throw failure();
      const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      cipher.setAAD(aad(metadata, kid, delivery));
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
      return JSON.stringify({ v: 1, kid, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ct: ciphertext.toString("base64") });
    } catch { throw failure(); }
  }
  open(sealed: string, metadata: OutboxMetadata): OutboxPayload {
    try { return outboxPayloadSchema.parse(this.openValue(sealed, metadata, false)); } catch { throw failure(); }
  }
  openEnvelope(sealed: string, metadata: OutboxMetadata): EmailEnvelope {
    try { return Object.freeze(emailEnvelopeSchema.parse(this.openValue(sealed, metadata, true))); } catch { throw failure(); }
  }
  private openValue(sealed: string, metadata: OutboxMetadata, delivery: boolean): unknown {
    try {
      if (sealed.length > (delivery ? 24000 : 8192)) throw failure();
      const envelope = envelopeSchema.parse(JSON.parse(sealed) as unknown);
      const key = this.keys.get(envelope.kid);
      if (!key) throw failure();
      const decipher = createDecipheriv("aes-256-gcm", key, decode(envelope.iv, 12), { authTagLength: 16 });
      decipher.setAAD(aad(metadata, envelope.kid, delivery));
      decipher.setAuthTag(decode(envelope.tag, 16));
      const plaintext = Buffer.concat([decipher.update(decode(envelope.ct)), decipher.final()]);
      return JSON.parse(plaintext.toString("utf8")) as unknown;
    } catch { throw failure(); }
  }
}
