import { isAppError } from "@/modules/shared/errors";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isCustomerGoogleAuthAvailable } from "@/lib/auth/customer";
import {
  CUSTOMER_OAUTH_RETURN_TO_COOKIE,
  CUSTOMER_OAUTH_STATE_COOKIE,
  CUSTOMER_OAUTH_VERIFIER_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  customerOAuthCookieOptions,
  customerSessionCookieOptions,
  isCustomerOAuthStateFresh,
  isPkceVerifier,
  safeCustomerReturnTo,
  secureTokenEqual,
} from "@/modules/customer-auth/core";
import { CustomerAuthService } from "@/modules/customer-auth/service";
import { INTERNAL_GOOGLE_CONSENT_COOKIE, getInternalAuthConfig } from "@/modules/customer-auth/internal-testing";
import { createGoogleOAuthAdapter, getCustomerGoogleOAuthConfig } from "@/modules/customer-auth/google";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const googleCallbackRateLimiter = createInMemoryRateLimiter({
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
  error: "auth_failed" | "rate_limited" | "unavailable" | "conflict" | "registration_unavailable",
  returnTo: string,
): NextResponse {
  const url = customerRedirectUrl("/login", request);
  url.searchParams.set("error", error);
  url.searchParams.set("returnTo", safeCustomerReturnTo(returnTo));
  return NextResponse.redirect(url);
}

function customerRedirectUrl(path: string, request: Request): URL {
  try {
    return new URL(path, getCustomerGoogleOAuthConfig().redirectUri);
  } catch {
    return new URL(path, request.url);
  }
}

function clearOAuthCookies(response: NextResponse): void {
  const options = {
    ...customerOAuthCookieOptions(process.env.NODE_ENV === "production"),
    maxAge: 0,
  };

  for (const name of [
    CUSTOMER_OAUTH_STATE_COOKIE,
    CUSTOMER_OAUTH_VERIFIER_COOKIE,
    CUSTOMER_OAUTH_RETURN_TO_COOKIE,
    INTERNAL_GOOGLE_CONSENT_COOKIE,
  ]) {
    response.cookies.set(name, "", options);
  }
}

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const cookieStore = await cookies();
  const returnTo = safeCustomerReturnTo(
    cookieStore.get(CUSTOMER_OAUTH_RETURN_TO_COOKIE)?.value,
  );
  const failedResponse = (error: "auth_failed" | "rate_limited" | "unavailable" | "conflict" | "registration_unavailable") => {
    const response = loginRedirect(request, error, returnTo);
    clearOAuthCookies(response);
    return response;
  };

  if (!googleCallbackRateLimiter.check(rateLimitKey(request)).allowed) {
    return failedResponse("rate_limited");
  }

  if (!isCustomerGoogleAuthAvailable()) {
    return failedResponse("unavailable");
  }

  const state = cookieStore.get(CUSTOMER_OAUTH_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(CUSTOMER_OAUTH_VERIFIER_COOKIE)?.value;
  const code = query.get("code");

  if (
    query.get("error") !== null ||
    state === undefined ||
    verifier === undefined ||
    code === null ||
    code.trim().length === 0 ||
    !isCustomerOAuthStateFresh(state) ||
    !isPkceVerifier(verifier) ||
    !secureTokenEqual(state, query.get("state") ?? "")
  ) {
    return failedResponse("auth_failed");
  }

  try {
    const identity = await createGoogleOAuthAdapter(
      getCustomerGoogleOAuthConfig(),
    ).exchangeCode({ code, codeVerifier: verifier });
    const proof = cookieStore.get(INTERNAL_GOOGLE_CONSENT_COOKIE)?.value;
    const service = new CustomerAuthService();
    const login = proof ? await service.completeGoogleLogin(identity, proof) : await service.completeGoogleLogin(identity);
    const response = NextResponse.redirect(customerRedirectUrl(returnTo, request));
    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      login.sessionToken,
      { ...customerSessionCookieOptions(process.env.NODE_ENV === "production"), maxAge: Math.max(0, Math.floor((login.expiresAt.getTime() - Date.now()) / 1000)) },
    );
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    if (getInternalAuthConfig() && isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE") {
      const response = NextResponse.redirect(customerRedirectUrl(`/internal-testing/google-consent?returnTo=${encodeURIComponent(returnTo)}&error=registration_unavailable`, request));
      clearOAuthCookies(response);
      return response;
    }
    return failedResponse(isAppError(error) && error.code === "CONFLICT" ? "conflict" : isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE" ? "registration_unavailable" : "auth_failed");
  }
}
