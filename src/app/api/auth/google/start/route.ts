import { NextResponse } from "next/server";

import { getCurrentCustomer, isCustomerAuthAvailable } from "@/lib/auth/customer";
import {
  createPkcePair,
  customerOAuthCookieOptions,
  CUSTOMER_OAUTH_RETURN_TO_COOKIE,
  CUSTOMER_OAUTH_STATE_COOKIE,
  CUSTOMER_OAUTH_VERIFIER_COOKIE,
  safeCustomerReturnTo,
  createCustomerOAuthState,
} from "@/modules/customer-auth/core";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import {
  createGoogleOAuthAdapter,
  getCustomerGoogleOAuthConfig,
} from "@/modules/customer-auth/google";

export const runtime = "nodejs";

const googleStartRateLimiter = createInMemoryRateLimiter({
  limit: 10,
  maxKeys: 512,
  windowMs: 15 * 60 * 1_000,
});

function rateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || new URL(request.url).origin;
}

function loginRedirect(
  request: Request,
  error: "auth_failed" | "rate_limited" | "unavailable",
  returnTo: string,
): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("returnTo", safeCustomerReturnTo(returnTo));
  return NextResponse.redirect(url);
}

export async function GET(request: Request): Promise<Response> {
  const returnTo = safeCustomerReturnTo(
    new URL(request.url).searchParams.get("returnTo") ?? undefined,
  );

  if (!googleStartRateLimiter.check(rateLimitKey(request)).allowed) {
    return loginRedirect(request, "rate_limited", returnTo);
  }

  if (!isCustomerAuthAvailable()) {
    return loginRedirect(request, "unavailable", returnTo);
  }

  try {
    const currentCustomer = await getCurrentCustomer();
    if (currentCustomer !== null) {
      return NextResponse.redirect(new URL(returnTo, request.url));
    }

    const config = getCustomerGoogleOAuthConfig();
    const state = createCustomerOAuthState();
    const pkce = createPkcePair();
    const authorizationUrl = createGoogleOAuthAdapter(config).createAuthorizationUrl({
      codeChallenge: pkce.challenge,
      state,
    });
    const response = NextResponse.redirect(authorizationUrl);
    const options = customerOAuthCookieOptions(process.env.NODE_ENV === "production");

    response.cookies.set(CUSTOMER_OAUTH_STATE_COOKIE, state, options);
    response.cookies.set(CUSTOMER_OAUTH_VERIFIER_COOKIE, pkce.verifier, options);
    response.cookies.set(CUSTOMER_OAUTH_RETURN_TO_COOKIE, returnTo, options);

    return response;
  } catch {
    return loginRedirect(request, "auth_failed", returnTo);
  }
}
