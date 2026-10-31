import { describe, expect, it } from "vitest";

import {
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
  CUSTOMER_OAUTH_STATE_MAX_AGE_SECONDS,
  createOpaqueToken,
  createCustomerOAuthState,
  createPkcePair,
  customerSessionCookieOptions,
  hashOpaqueToken,
  isCustomerOAuthStateFresh,
  isPkceVerifier,
  normalizeCustomerEmail,
  parseGoogleIdentity,
  safeCustomerReturnTo,
} from "@/modules/customer-auth/core";

describe("customer auth core", () => {
  it("normalizes customer email consistently", () => {
    expect(normalizeCustomerEmail("  Customer@Example.COM ")).toBe("customer@example.com");
  });

  it("accepts only verified Google identities with a subject and email", () => {
    expect(
      parseGoogleIdentity({
        sub: "google-sub-123",
        email: "  Customer@Example.COM ",
        email_verified: true,
        name: "Customer Example",
        picture: "https://lh3.googleusercontent.com/avatar.png",
      }),
    ).toEqual({
      googleSubject: "google-sub-123",
      email: "Customer@Example.COM",
      normalizedEmail: "customer@example.com",
      displayName: "Customer Example",
      avatarUrl: "https://lh3.googleusercontent.com/avatar.png",
    });

    expect(() =>
      parseGoogleIdentity({
        sub: "google-sub-123",
        email: "customer@example.com",
        email_verified: false,
      }),
    ).toThrow();
  });

  it("allows only internal return paths", () => {
    expect(safeCustomerReturnTo("/checkout")).toBe("/checkout");
    expect(safeCustomerReturnTo("/account?tab=orders")).toBe("/account?tab=orders");
    expect(safeCustomerReturnTo("/project-brief?service=research-development")).toBe("/project-brief?service=research-development");
    expect(safeCustomerReturnTo("/custom-print/request?mode=reference")).toBe("/custom-print/request?mode=reference");
    expect(safeCustomerReturnTo("https://attacker.example/steal")).toBe("/account");
    expect(safeCustomerReturnTo("//attacker.example/steal")).toBe("/account");
    expect(safeCustomerReturnTo("/admin")).toBe("/account");
    expect(safeCustomerReturnTo(undefined)).toBe("/account");
  });

  it("returns to owned order, refund and MAKE pages by exact path pattern", () => {
    const id = "0f8b6c2e-4d1a-4b7e-9c3f-2a5d8e1b7c40";
    for (const path of [
      `/account/orders/${id}`,
      `/account/orders/${id}/refund`,
      `/account/make/${id}`,
      `/account/orders/${id}/refund?from=email#refund-request-heading`,
    ]) {
      expect(safeCustomerReturnTo(path)).toBe(path);
      expect(safeCustomerReturnTo(safeCustomerReturnTo(path))).toBe(path);
    }
  });

  it("rejects record paths that are malformed, traversed, encoded or off-origin", () => {
    const id = "0f8b6c2e-4d1a-4b7e-9c3f-2a5d8e1b7c40";
    for (const path of [
      "/account/orders/not-a-uuid/refund",
      `/account/orders/${id.slice(0, -1)}g`,
      `/account/orders/${id}/`,
      `/account/orders/${id}/refund/`,
      `/account/orders/${id}/refund/extra`,
      `/account/make/${id}/refund`,
      `/account/orders/${id}/payment`,
      `/ACCOUNT/orders/${id}`,
      `/account/orders/${id}/../../../admin`,
      `/account/orders/${id}/refund/../../${id}`,
      `/account/../account/orders/${id}`,
      `/account/orders/${id}/./refund`,
      "/account/orders/%2e%2e/%2e%2e/admin",
      `/account/orders/${id}%2Frefund`,
      `/account/orders%2F${id}`,
      `/account/orders/${id}%252Frefund`,
      `/account/orders/${id}/re\tfund`,
      `/\\attacker.example/account/orders/${id}`,
      `\\\\attacker.example/account/orders/${id}`,
      `https://attacker.example/account/orders/${id}/refund`,
      `//attacker.example/account/orders/${id}/refund`,
      `/account/orders/${id}@attacker.example`,
      `/admin?next=/account/orders/${id}/refund`,
      `/admin#/account/orders/${id}/refund`,
    ]) {
      expect(safeCustomerReturnTo(path)).toBe("/account");
    }
  });

  it("creates a PKCE pair with a URL-safe challenge", () => {
    const pair = createPkcePair();

    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pair.challenge).not.toContain("=");
  });

  it("expires OAuth state and validates PKCE verifier shape", () => {
    const now = 1_900_000_000_000;
    const state = createCustomerOAuthState(now);

    expect(isCustomerOAuthStateFresh(state, now + 1_000)).toBe(true);
    expect(isCustomerOAuthStateFresh(
      state,
      now + CUSTOMER_OAUTH_STATE_MAX_AGE_SECONDS * 1_000 + 1,
    )).toBe(false);
    expect(isCustomerOAuthStateFresh(`0.${"a".repeat(43)}`, now)).toBe(false);
    expect(isPkceVerifier("a".repeat(43))).toBe(true);
    expect(isPkceVerifier("short")).toBe(false);
  });

  it("stores only a hash of an opaque session token", () => {
    const token = createOpaqueToken();

    expect(token).not.toBe(hashOpaqueToken(token));
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
  });

  it("uses a 30-day secure customer session cookie in production", () => {
    expect(CUSTOMER_SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(customerSessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    expect(customerSessionCookieOptions(false).secure).toBe(false);
  });
});
