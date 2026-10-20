import { createHash } from "node:crypto";
import { z } from "zod";
import { safeCustomerReturnTo } from "../customer-auth/core";
import { appError } from "../shared/errors";
import { businessInputSchema, businessKindSchema, businessPayloadSchema, businessPurposes, isBusinessKind, type BusinessPayload, type BusinessProofProjection, type BusinessPurpose } from "./business-core";

const kindSchema = z.enum(["AUTH", "PRIVACY", ...businessKindSchema.options]);
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const legacyInputSchema = z.strictObject({ kind: z.enum(["AUTH", "PRIVACY"]), proofId: z.uuid(), token: tokenSchema });
const inputSchema = z.union([legacyInputSchema, businessInputSchema]);
export type LegacyOutboxInput = z.infer<typeof legacyInputSchema>;
export type OutboxInput = z.infer<typeof inputSchema>;
export type LegacyOutboxPurpose = "AUTH_VERIFY" | "AUTH_RESET" | "PRIVACY_EXPORT" | "PRIVACY_CLOSE";
export type OutboxPurpose = LegacyOutboxPurpose | BusinessPurpose;
export type LegacyProofProjection = {
  kind: "AUTH" | "PRIVACY"; proofId: string; purpose: Exclude<OutboxPurpose, BusinessPurpose>; to: string;
  tokenHash: string; returnTo: string | null; ownerId: string; sessionHash: string | null; expiresAt: Date;
};
export type ProofProjection = LegacyProofProjection | BusinessProofProjection;
export function isBusinessProof(proof: ProofProjection): proof is BusinessProofProjection { return isBusinessKind(proof.kind); }
export type OutboxMetadata = {
  id: string; messageKey: string; proofKind: OutboxInput["kind"]; proofId: string;
  purpose: OutboxPurpose; templateVersion: "v1"; fingerprint: string; expiresAt: Date;
};
export type LegacyOutboxPayload = { to: string; token: string; returnTo: string | null };
export type OutboxPayload = LegacyOutboxPayload | BusinessPayload;
export const outboxRecipientSchema = z.email().max(254);
export const outboxMetadataSchema = z.strictObject({
  id: z.uuid(), messageKey: z.string().min(1).max(200), proofKind: kindSchema, proofId: z.uuid(),
  purpose: z.enum(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE", "ORDER_RECEIVED", "PAYMENT_CONFIRMED", "QUOTE_AVAILABLE", "ORDER_SHIPPED"]),
  templateVersion: z.literal("v1"), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), expiresAt: z.date(),
}).refine(value => isBusinessKind(value.proofKind) ? businessPurposes[value.proofKind] === value.purpose : value.purpose.startsWith(value.proofKind + "_"));
export const outboxPayloadSchema = z.union([z.strictObject({
  to: outboxRecipientSchema, token: tokenSchema,
  returnTo: z.string().max(2048).nullable().refine(value => value === null || safeCustomerReturnTo(value) === value),
}), businessPayloadSchema]);
export function parseOutboxInput(raw: unknown): OutboxInput {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  return parsed.data;
}
export function outboxIdentity(proof: ProofProjection) {
  if (isBusinessProof(proof)) return {
    messageKey: `${proof.kind.toLowerCase()}:${proof.purpose.toLowerCase()}:v1:${proof.proofId}`,
    fingerprint: createHash("sha256").update(JSON.stringify([proof.kind, proof.proofId, proof.purpose, "v1", proof.to, proof.ownerId, proof.sourceAt.toISOString(), proof.expiresAt.toISOString(), proof.content])).digest("hex"),
  };
  return {
    messageKey: `${proof.kind.toLowerCase()}:${proof.purpose.toLowerCase()}:v1:${proof.proofId}`,
    fingerprint: createHash("sha256").update(JSON.stringify([
      proof.kind, proof.proofId, proof.purpose, "v1", proof.to, proof.tokenHash,
      proof.returnTo, proof.ownerId, proof.sessionHash, proof.expiresAt.toISOString(),
    ])).digest("hex"),
  };
}
