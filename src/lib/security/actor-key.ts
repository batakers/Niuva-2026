import { createHmac, randomBytes } from "node:crypto";

import { clientIpCandidate } from "./client-ip";

const defaultProcessSalt = randomBytes(16).toString("hex");

export type ActorKeyInput = Readonly<{
  customerId?: string | null;
  endpointId: string;
  headers: Headers;
  /** Injectable for tests; defaults to a random per-process value. */
  processSalt?: string;
  /** Stable across hosted instances; defaults to the existing Admin auth secret. */
  sharedSecret?: string | null;
}>;

/**
 * Derives a per-actor rate-limit key. The endpoint id is always part of the
 * key; the raw IP is never included, only a salted SHA-256 digest.
 */
export function deriveActorKey({
  customerId,
  endpointId,
  headers,
  processSalt = defaultProcessSalt,
  sharedSecret = process.env.BETTER_AUTH_SECRET,
}: ActorKeyInput): string {
  const normalizedCustomerId = customerId?.trim() ?? "";

  if (normalizedCustomerId.length > 0) {
    return `c:${endpointId}:${normalizedCustomerId}`;
  }

  const key = sharedSecret?.trim();
  const tier = process.env.NIUVA_DEPLOYMENT_TIER?.trim();
  if (!key && (tier === "staging" || tier === "production")) {
    throw new Error("Shared rate-limit hashing secret is required for hosted runtimes.");
  }
  const digest = createHmac("sha256", key || processSalt)
    .update(clientIpCandidate(headers) ?? "unknown")
    .digest("hex");

  return `i:${endpointId}:${digest}`;
}
