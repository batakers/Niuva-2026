import { readExplicitDeploymentTier } from "@/lib/env/deployment";
import { resolveAppOrigin } from "@/lib/env/origin";
import { appError } from "@/modules/shared/errors";

/**
 * Canonical public origin (`APP_URL`) of an explicit hosted tier, or undefined.
 * A hosted function can see an internal request URL that differs from the
 * browser origin, so hosted tiers also accept this configured origin. It is
 * never derived from Host or forwarded headers.
 */
export function hostedCanonicalOrigin(
  source: Readonly<Record<string, string | undefined>> = process.env,
): string | undefined {
  const tier = readExplicitDeploymentTier(source);
  if (tier !== "staging" && tier !== "production") return undefined;
  const resolved = resolveAppOrigin({ tier, appUrl: source.APP_URL });

  return resolved.ok ? resolved.origin : undefined;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function getRequestUrl(request: Request): URL | undefined {
  try {
    return new URL(request.url);
  } catch {
    return undefined;
  }
}

export function isLoopbackRequest(request: Request): boolean {
  const url = getRequestUrl(request);

  return url !== undefined && LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const requestUrl = getRequestUrl(request);

  if (origin === null) {
    return false;
  }

  // Opaque origins (sandboxed iframes, redirects, file:) are sent as the
  // literal string "null" and must never pass. The comparison targets are the
  // request URL and, on a hosted tier, the configured canonical origin;
  // Host-like forwarded headers are deliberately not read.
  if (origin.trim().toLowerCase() === "null") {
    return false;
  }

  try {
    const supplied = new URL(origin).origin;

    return supplied === requestUrl?.origin || supplied === hostedCanonicalOrigin();
  } catch {
    return false;
  }
}

export function assertSameOriginRequest(request: Request): void {
  if (!isSameOriginRequest(request)) {
    throw appError("ORIGIN_NOT_ALLOWED");
  }
}

export function assertLocalSameOriginRequest(request: Request): void {
  if (!isLoopbackRequest(request) || !isSameOriginRequest(request)) {
    throw appError("ORIGIN_NOT_ALLOWED");
  }
}
