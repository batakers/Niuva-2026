import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import {
  classifyAdminProxyRequest,
  createAdminAuthUnavailableHtmlResponse,
  isAdminSignInPath,
} from "@/lib/auth/admin-proxy-response";
import { DEPLOYMENT_TIERS, resolveDeploymentTier, type DeploymentTier } from "@/lib/env/deployment";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { getObjectStorageConnectOrigin } from "@/lib/security/headers";
import { generateNonce } from "@/lib/security/nonce";

type ClerkEnvironment = Readonly<{
  CLERK_SECRET_KEY?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
}>;

function isNonEmpty(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasClerkAdminCredentials(
  environment: ClerkEnvironment = process.env as ClerkEnvironment,
): boolean {
  return (
    isNonEmpty(environment.CLERK_SECRET_KEY) &&
    isNonEmpty(environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  );
}

const adminProxy = clerkMiddleware(
  async (auth, request) => {
    const pathname = request.nextUrl.pathname;

    if (isAdminSignInPath(pathname)) {
      return;
    }

    const unauthenticatedUrl = new URL("/admin/sign-in", request.url).toString();
    await auth.protect({ unauthenticatedUrl });
  },
  {
    contentSecurityPolicy: { strict: true },
  },
);

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
// anything unexpected the matcher lets through, falls to the Clerk path, so a
// matcher or parsing surprise can never move an admin route out of Clerk.
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
// static next.config CSP does not apply to these paths (STATIC_CSP_SOURCE), so
// this is the only CSP they receive. /admin and /api/admin keep Clerk's CSP
// (merged over the static one, see csp-clerk-findings.md, sections 9 and 10).
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

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isHeaderOnlyPath(request.nextUrl.pathname)) {
    return createHeaderOnlyResponse(request);
  }
  // Clerk is a defense-in-depth route filter only. Every protected resource
  // must independently call requireAdmin() before reading or mutating data.
  if (!hasClerkAdminCredentials()) {
    const kind = classifyAdminProxyRequest({
      pathname: request.nextUrl.pathname,
      accept: request.headers.get("accept"),
    });

    return kind === "browser-navigation"
      ? createAdminAuthUnavailableHtmlResponse()
      : createAdminAuthUnavailableResponse();
  }

  return adminProxy(request, event);
}

// The first two entries are the Clerk surface and must never shrink. The
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