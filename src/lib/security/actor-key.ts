import { createHmac, randomBytes } from "node:crypto";

const MAX_IP_LENGTH = 64;
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

function extractIpCandidate(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim() ?? "";
  const forwardedFirst =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const candidate = realIp.length > 0 ? realIp : forwardedFirst;

  return candidate.length > 0 ? candidate.slice(0, MAX_IP_LENGTH) : "unknown";
}

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
    .update(extractIpCandidate(headers))
    .digest("hex");

  return `i:${endpointId}:${digest}`;
}
