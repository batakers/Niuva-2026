import { appError } from "@/modules/shared/errors";

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

  if (origin === null || requestUrl === undefined) {
    return false;
  }

  // Opaque origins (sandboxed iframes, redirects, file:) are sent as the
  // literal string "null" and must never pass. The comparison target is only
  // the request URL; Host-like forwarded headers are deliberately not read.
  if (origin.trim().toLowerCase() === "null") {
    return false;
  }

  try {
    return new URL(origin).origin === requestUrl.origin;
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
