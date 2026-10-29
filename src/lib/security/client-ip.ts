/**
 * Client IP for rate-limit keys.
 *
 * Hosted tiers run on Netlify, where a client can set `X-Forwarded-For` and
 * `X-Real-IP` itself: on staging (29 Oct 2026) spoofed values put requests in a
 * fresh bucket and bypassed every public limiter. There only the
 * platform-assigned connection header is trusted. Revisit this if production
 * moves off Netlify.
 */
export const HOSTED_CLIENT_IP_HEADER = "x-nf-client-connection-ip";

const MAX_IP_LENGTH = 64;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function isHostedTier(source: EnvironmentSource): boolean {
  const tier = source.NIUVA_DEPLOYMENT_TIER?.trim();
  return tier === "staging" || tier === "production";
}

/** Returns the trusted client IP, or null when none is available. */
export function clientIpCandidate(headers: Headers, source: EnvironmentSource = process.env): string | null {
  let candidate: string;
  if (isHostedTier(source)) {
    candidate = headers.get(HOSTED_CLIENT_IP_HEADER)?.trim() ?? "";
  } else {
    // Local and test runtimes have no edge in front; tests separate actors this way.
    const realIp = headers.get("x-real-ip")?.trim() ?? "";
    const forwardedFirst = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    candidate = realIp.length > 0 ? realIp : forwardedFirst;
  }
  return candidate.length > 0 ? candidate.slice(0, MAX_IP_LENGTH) : null;
}

/** Better Auth reads the client IP from these headers; undefined keeps its local default. */
export function trustedClientIpHeaders(source: EnvironmentSource = process.env): string[] | undefined {
  return isHostedTier(source) ? [HOSTED_CLIENT_IP_HEADER] : undefined;
}
