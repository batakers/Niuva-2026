import { createHash } from "node:crypto";
import { z } from "zod";
import { safeCustomerReturnTo } from "../customer-auth/core";
import { appError } from "../shared/errors";

const kindSchema = z.enum(["AUTH", "PRIVACY"]);
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const inputSchema = z.strictObject({ kind: kindSchema, proofId: z.uuid(), token: tokenSchema });
export type OutboxInput = z.infer<typeof inputSchema>;
export type OutboxPurpose = "AUTH_VERIFY" | "AUTH_RESET" | "PRIVACY_EXPORT" | "PRIVACY_CLOSE";
export type ProofProjection = {
  kind: OutboxInput["kind"]; proofId: string; purpose: OutboxPurpose; to: string;
  tokenHash: string; returnTo: string | null; ownerId: string; sessionHash: string | null; expiresAt: Date;
};
export type OutboxMetadata = {
  id: string; messageKey: string; proofKind: OutboxInput["kind"]; proofId: string;
  purpose: OutboxPurpose; templateVersion: "v1"; fingerprint: string; expiresAt: Date;
};
export type OutboxPayload = { to: string; token: string; returnTo: string | null };
export const outboxMetadataSchema = z.strictObject({
  id: z.uuid(), messageKey: z.string().min(1).max(200), proofKind: kindSchema, proofId: z.uuid(),
  purpose: z.enum(["AUTH_VERIFY", "AUTH_RESET", "PRIVACY_EXPORT", "PRIVACY_CLOSE"]),
  templateVersion: z.literal("v1"), fingerprint: z.string().regex(/^[a-f0-9]{64}$/), expiresAt: z.date(),
}).refine(value => value.purpose.startsWith(value.proofKind + "_"));
export const outboxPayloadSchema = z.strictObject({
  to: z.email().max(254), token: tokenSchema,
  returnTo: z.string().max(2048).nullable().refine(value => value === null || safeCustomerReturnTo(value) === value),
});
export function parseOutboxInput(raw: unknown): OutboxInput {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) throw appError("VALIDATION_ERROR");
  return parsed.data;
}
export function outboxIdentity(proof: ProofProjection) {
  return {
    messageKey: `${proof.kind.toLowerCase()}:${proof.purpose.toLowerCase()}:v1:${proof.proofId}`,
    fingerprint: createHash("sha256").update(JSON.stringify([
      proof.kind, proof.proofId, proof.purpose, "v1", proof.to, proof.tokenHash,
      proof.returnTo, proof.ownerId, proof.sessionHash, proof.expiresAt.toISOString(),
    ])).digest("hex"),
  };
}
