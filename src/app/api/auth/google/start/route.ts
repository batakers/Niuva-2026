import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GOOGLE_CONSENT_COOKIE, GoogleConsentService } from "@/modules/customer-auth/google-consent";

import { getCurrentCustomer, isCustomerGoogleAuthAvailable } from "@/lib/auth/customer";
import {
  createPkcePair,
  customerOAuthCookieOptions,
  CUSTOMER_OAUTH_RETURN_TO_COOKIE,
  CUSTOMER_OAUTH_STATE_COOKIE,
  CUSTOMER_OAUTH_VERIFIER_COOKIE,
  safeCustomerReturnTo,
  createCustomerOAuthState,
} from "@/modules/customer-auth/core";
import { clientIpCandidate } from "@/lib/security/client-ip";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { customerCookieSecure } from "@/modules/customer-auth/app-origin";
import { customerAuthOrigin } from "@/modules/customer-auth/origin";
import {
  createGoogleOAuthAdapter,
  getCustomerGoogleOAuthConfig,
} from "@/modules/customer-auth/google";

export const runtime = "nodejs";

const googleStartRateLimiter = createRuntimeRateLimiter({ namespace: "src/app/api/auth/google/start/route.ts",
  limit: 10,
  maxKeys: 512,
  windowMs: 15 * 60 * 1_000,
});

function rateLimitKey(request: Request): string {
  return clientIpCandidate(request.headers) || new URL(request.url).origin;
}

function loginRedirect(
  request: Request,
  error: "auth_failed" | "rate_limited" | "unavailable",
  returnTo: string,
): NextResponse {
  const url = new URL("/login", customerAuthOrigin(request));
  url.searchParams.set("error", error);
  url.searchParams.set("returnTo", safeCustomerReturnTo(returnTo));
  return NextResponse.redirect(url);
}

export async function GET(request: Request): Promise<Response> {
  const returnTo = safeCustomerReturnTo(
    new URL(request.url).searchParams.get("returnTo") ?? undefined,
  );

  try {
    if (!(await googleStartRateLimiter.check(rateLimitKey(request))).allowed) return loginRedirect(request, "rate_limited", returnTo);
  } catch { return loginRedirect(request, "unavailable", returnTo); }

  if (!isCustomerGoogleAuthAvailable()) {
    return loginRedirect(request, "unavailable", returnTo);
  }

  try {
    const currentCustomer = await getCurrentCustomer();
    if (currentCustomer !== null) {
      return NextResponse.redirect(new URL(returnTo, customerAuthOrigin(request)));
    }

    const config = getCustomerGoogleOAuthConfig();
    const state = createCustomerOAuthState();
    const pkce = createPkcePair();
    const proof = (await cookies()).get(GOOGLE_CONSENT_COOKIE)?.value;
    if (proof) await new GoogleConsentService().bind(proof, state, returnTo);
    const authorizationUrl = createGoogleOAuthAdapter(config).createAuthorizationUrl({
      codeChallenge: pkce.challenge,
      state,
    });
    const response = NextResponse.redirect(authorizationUrl);
    const options = customerOAuthCookieOptions(customerCookieSecure(process.env));

    response.cookies.set(CUSTOMER_OAUTH_STATE_COOKIE, state, options);
    response.cookies.set(CUSTOMER_OAUTH_VERIFIER_COOKIE, pkce.verifier, options);
    response.cookies.set(CUSTOMER_OAUTH_RETURN_TO_COOKIE, returnTo, options);

    return response;
  } catch {
    return loginRedirect(request, "auth_failed", returnTo);
  }
}
