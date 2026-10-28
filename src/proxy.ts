import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSessionCookie } from "@/lib/auth/admin-session-cookie";
import { getServerCapabilities } from "@/lib/env/server";

import {
  classifyAdminProxyRequest,
  createAdminAuthUnavailableHtmlResponse,
  isAdminSignInPath,
} from "@/lib/auth/admin-proxy-response";
import { DEPLOYMENT_TIERS, resolveDeploymentTier, type DeploymentTier } from "@/lib/env/deployment";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { getObjectStorageConnectOrigin } from "@/lib/security/headers";
import { generateNonce } from "@/lib/security/nonce";

export function hasAdminAuthConfiguration(environment: Readonly<Record<string, string | undefined>> = process.env): boolean {
  try { const capabilities = getServerCapabilities(environment); return capabilities.adminAuth && capabilities.database; } catch { return false; }
}

export function createAdminAuthUnavailableResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "Layanan autentikasi admin belum tersedia.",
      },
    },
    { status: 503 },
  );
}

function readDeploymentTier(): DeploymentTier {
  const raw = process.env.NIUVA_DEPLOYMENT_TIER?.trim().toLowerCase();
  const nodeEnv = process.env.NODE_ENV;

  // An unrecognised tier string is treated as unset (fail-closed by NODE_ENV).
  return resolveDeploymentTier({
    nodeEnv:
      nodeEnv === "development" || nodeEnv === "production" || nodeEnv === "test"
        ? nodeEnv
        : undefined,
    tier: DEPLOYMENT_TIERS.find((tier) => tier === raw),
  });
}

// Only these prefixes take the header-only path. Everything else, including
// anything unexpected the matcher lets through, stays behind the Admin session gate.
function isHeaderOnlyPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();

  return (
    lower === "/checkout" ||
    lower.startsWith("/checkout/") ||
    lower === "/account" ||
    lower.startsWith("/account/")
  );
}

// Writes the per-request nonce CSP: the request header lets Next attach the
// nonce while rendering, the response header is what the browser enforces. The
// static next.config CSP excludes these paths and the Admin boundary, so
// this is their single CSP writer.
function createHeaderOnlyResponse(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const r2Origin = getObjectStorageConnectOrigin();
  const policy = buildContentSecurityPolicy({
    connectOrigins: r2Origin === undefined ? [] : [r2Origin],
    nonce,
    tier: readDeploymentTier(),
  });
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("content-security-policy", policy);

  return response;
}

export default async function proxy(request: NextRequest, _event?: unknown) {
  void _event;
  if (isHeaderOnlyPath(request.nextUrl.pathname)) {
    return createHeaderOnlyResponse(request);
  }
  // The proxy is a defense-in-depth route filter. Every protected resource
  // must independently call requireAdmin() before reading or mutating data.
  if (!hasAdminAuthConfiguration()) {
    const kind = classifyAdminProxyRequest({
      pathname: request.nextUrl.pathname,
      accept: request.headers.get("accept"),
    });

    return kind === "browser-navigation"
      ? createAdminAuthUnavailableHtmlResponse()
      : createAdminAuthUnavailableResponse();
  }

  const pathname = request.nextUrl.pathname;
  if (isAdminSignInPath(pathname) || pathname.startsWith("/api/admin/auth/")) return createHeaderOnlyResponse(request);
  // Optimistic cookie check only. The proxy stays free of the auth engine and
  // database client because Netlify bundles it as an edge function where `pg`
  // cannot load. requireAdmin() verifies session, second factor and profile.
  if (!hasAdminSessionCookie(request.cookies)) {
    const kind = classifyAdminProxyRequest({ pathname, accept: request.headers.get("accept") });
    return kind === "browser-navigation" ? NextResponse.redirect(new URL("/admin/sign-in", request.url)) : NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return createHeaderOnlyResponse(request);
}

// The first two entries are the Admin surface and must never shrink. The
// object entries are header-only (nonce + CSP) with Next's documented prefetch
// exclusion; nothing under /_next/static, /_next/image or the metadata files
// matches because only these prefixes are listed. Next statically analyses
// `config`, so the values are literals (no shared constants).
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    {
      // `:path*` also matches the bare /checkout; it must cover children because
      // STATIC_CSP_SOURCE excludes `checkout(?:/|$)` (no other CSP writer).
      source: "/checkout/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/account/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
