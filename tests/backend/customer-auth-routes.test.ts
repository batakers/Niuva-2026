import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieValues: new Map<string, string>(),
  createAuthorizationUrl: vi.fn(),
  exchangeCode: vi.fn(),
  completeGoogleLogin: vi.fn(),
  getConfig: vi.fn(),
  getCurrentCustomer: vi.fn(),
  isCustomerAuthAvailable: vi.fn(),
  isCustomerSessionStoreAvailable: vi.fn(),
  requireCustomer: vi.fn(),
  revokeCurrentCustomerSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = mocks.cookieValues.get(name);
      return value === undefined ? undefined : { value };
    },
  }),
}));

vi.mock("@/lib/auth/customer", () => ({
  getCurrentCustomer: mocks.getCurrentCustomer,
  isCustomerAuthAvailable: mocks.isCustomerAuthAvailable,
  isCustomerSessionStoreAvailable: mocks.isCustomerSessionStoreAvailable,
  requireCustomer: mocks.requireCustomer,
  revokeCurrentCustomerSession: mocks.revokeCurrentCustomerSession,
}));

vi.mock("@/modules/customer-auth/google", () => ({
  createGoogleOAuthAdapter: () => ({
    createAuthorizationUrl: mocks.createAuthorizationUrl,
    exchangeCode: mocks.exchangeCode,
  }),
  getCustomerGoogleOAuthConfig: mocks.getConfig,
}));

vi.mock("@/modules/customer-auth/service", () => ({
  CustomerAuthService: class {
    completeGoogleLogin = mocks.completeGoogleLogin;
  },
}));

import { POST as postCheckout } from "@/app/api/checkout/route";
import { POST as postLogout } from "@/app/api/auth/logout/route";
import { GET as getGoogleCallback } from "@/app/api/auth/google/callback/route";
import { GET as getGoogleStart } from "@/app/api/auth/google/start/route";
import { POST as postShippingRates } from "@/app/api/shipping/rates/route";
import { appError } from "@/modules/shared/errors";
import { createCustomerOAuthState } from "@/modules/customer-auth/core";

const googleConfig = {
  clientId: "google-client-id",
  clientSecret: "google-client-secret",
  redirectUri: "https://app.example.test/api/auth/google/callback",
};

function sameOriginRequest(path: string, payload: unknown = {}) {
  return new Request(`https://app.example.test${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
    },
    method: "POST",
  });
}

beforeEach(() => {
  mocks.cookieValues.clear();
  mocks.createAuthorizationUrl.mockReset();
  mocks.exchangeCode.mockReset();
  mocks.completeGoogleLogin.mockReset();
  mocks.getConfig.mockReset();
  mocks.getCurrentCustomer.mockReset();
  mocks.isCustomerAuthAvailable.mockReset();
  mocks.isCustomerSessionStoreAvailable.mockReset();
  mocks.requireCustomer.mockReset();
  mocks.revokeCurrentCustomerSession.mockReset();
  mocks.getConfig.mockReturnValue(googleConfig);
  mocks.getCurrentCustomer.mockResolvedValue(null);
  mocks.isCustomerAuthAvailable.mockReturnValue(true);
  mocks.isCustomerSessionStoreAvailable.mockReturnValue(true);
  mocks.revokeCurrentCustomerSession.mockResolvedValue(undefined);
});

describe("Customer auth HTTP boundaries", () => {
  it("allowlists returnTo before starting Google OAuth", async () => {
    mocks.createAuthorizationUrl.mockReturnValue("https://accounts.google.com/o/oauth2/auth?state=opaque");

    const response = await getGoogleStart(
      new Request("https://app.example.test/api/auth/google/start?returnTo=https%3A%2F%2Fevil.example%2Fsteal", {
        headers: { "x-forwarded-for": "198.51.100.10" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("accounts.google.com");
    expect(response.headers.get("set-cookie")).toContain("niuva_customer_oauth_state");
    expect(response.headers.get("set-cookie")).toContain("niuva_customer_oauth_verifier");
    expect(response.headers.get("set-cookie")).toContain("niuva_customer_oauth_return_to");
  });

  it("rejects callback state mismatch without exchanging a Google code", async () => {
    mocks.cookieValues.set("niuva_customer_oauth_state", createCustomerOAuthState());
    mocks.cookieValues.set("niuva_customer_oauth_verifier", "v".repeat(43));
    mocks.cookieValues.set("niuva_customer_oauth_return_to", "/checkout");

    const response = await getGoogleCallback(
      new Request("https://app.example.test/api/auth/google/callback?code=google-code&state=wrong-state", {
        headers: { "x-forwarded-for": "198.51.100.11" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=auth_failed");
    expect(mocks.exchangeCode).not.toHaveBeenCalled();
    expect(mocks.completeGoogleLogin).not.toHaveBeenCalled();
  });

  it("creates an opaque Customer session and redirects to the safe destination", async () => {
    const state = createCustomerOAuthState();
    mocks.cookieValues.set("niuva_customer_oauth_state", state);
    mocks.cookieValues.set("niuva_customer_oauth_verifier", "v".repeat(43));
    mocks.cookieValues.set("niuva_customer_oauth_return_to", "/account");
    mocks.exchangeCode.mockResolvedValue({
      email: "customer@example.com",
      googleSubject: "google-sub-123",
      normalizedEmail: "customer@example.com",
    });
    mocks.completeGoogleLogin.mockResolvedValue({
      customer: { id: "customer-id" },
      expiresAt: new Date("2026-10-25T10:00:00.000Z"),
      sessionToken: "opaque-session-token",
    });

    const response = await getGoogleCallback(
      new Request(`https://app.example.test/api/auth/google/callback?code=google-code&state=${encodeURIComponent(state)}`, {
        headers: { "x-forwarded-for": "198.51.100.12" },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.test/account");
    expect(response.headers.get("set-cookie")).toContain("niuva_customer_session=opaque-session-token");
    expect(mocks.exchangeCode).toHaveBeenCalledWith({
      code: "google-code",
      codeVerifier: "v".repeat(43),
    });
    expect(mocks.completeGoogleLogin).toHaveBeenCalledWith({
      email: "customer@example.com",
      googleSubject: "google-sub-123",
      normalizedEmail: "customer@example.com",
    });
  });

  it("revokes the current session on same-origin logout and blocks cross-origin logout", async () => {
    const forbidden = await postLogout(
      new Request("https://app.example.test/api/auth/logout", {
        headers: { origin: "https://evil.example" },
        method: "POST",
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(mocks.revokeCurrentCustomerSession).not.toHaveBeenCalled();

    const response = await postLogout(
      new Request("https://app.example.test/api/auth/logout", {
        headers: {
          origin: "https://app.example.test",
          "x-forwarded-for": "198.51.100.13",
        },
        method: "POST",
      }),
    );
    expect(response.status).toBe(204);
    expect(mocks.revokeCurrentCustomerSession).toHaveBeenCalledOnce();
  });
});

describe("Customer checkout authorization boundary", () => {
  it("rejects checkout and shipping rates without a Customer session", async () => {
    mocks.requireCustomer.mockRejectedValue(appError("UNAUTHORIZED"));

    const checkout = await postCheckout(sameOriginRequest("/api/checkout"));
    const rates = await postShippingRates(sameOriginRequest("/api/shipping/rates"));

    expect(checkout.status).toBe(401);
    await expect(checkout.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
    expect(rates.status).toBe(401);
    await expect(rates.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
