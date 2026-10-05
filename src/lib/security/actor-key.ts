import { createHash, randomBytes } from "node:crypto";

const MAX_IP_LENGTH = 64;
const defaultProcessSalt = randomBytes(16).toString("hex");

export type ActorKeyInput = Readonly<{
  customerId?: string | null;
  endpointId: string;
  headers: Headers;
  /** Injectable for tests; defaults to a random per-process value. */
  processSalt?: string;
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
}: ActorKeyInput): string {
  const normalizedCustomerId = customerId?.trim() ?? "";

  if (normalizedCustomerId.length > 0) {
    return `c:${endpointId}:${normalizedCustomerId}`;
  }

  const digest = createHash("sha256")
    .update(processSalt + extractIpCandidate(headers))
    .digest("hex");

  return `i:${endpointId}:${digest}`;
}
