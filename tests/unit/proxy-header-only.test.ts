import { NextRequest, type NextFetchEvent } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth/admin-engine", () => ({ getAdminAuth: () => ({ api: { getSession: authMocks.session } }) }));

import proxy, { config } from "@/proxy";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

const HEADER_ONLY_PATHS = ["/checkout", "/checkout/anything", "/account", "/account/orders/abc", "/account/privacy"];

function run(pathname: string, headers: Record<string, string> = {}) {
  return proxy(
    new NextRequest(`http://localhost:3000${pathname}`, { headers }),
    {} as NextFetchEvent,
  ) as Promise<Response> | Response;
}

function nonceOf(policy: string | null): string {
  const match = /'nonce-([^']+)'/.exec(policy ?? "");

  if (match?.[1] === undefined) {
    throw new Error("no nonce in CSP");
  }

  return match[1];
}

function matches(url: string, headers?: Record<string, string>): boolean {
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url, headers });
}

beforeEach(() => {
  authMocks.session.mockClear();
  authMocks.session.mockClear();
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-admin-secret-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/niuva_test");
  authMocks.session.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy header-only path", () => {
  it("writes nonce + CSP and never calls Admin auth for /checkout and /account", async () => {
    for (const pathname of HEADER_ONLY_PATHS) {
      const response = await run(pathname, { accept: "text/html" });
      const policy = response.headers.get("content-security-policy");

      expect(policy, pathname).toContain("'nonce-");
      expect(response.status, pathname).toBe(200);
    }

    expect(authMocks.session).not.toHaveBeenCalled();
    expect(authMocks.session).not.toHaveBeenCalled();
  });

  it("does not need Admin auth credentials (no 503)", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("BETTER_AUTH_URL", "");

    const response = await run("/checkout", { accept: "text/html" });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("'nonce-");
  });

  it("uses a different nonce per request", async () => {
    const nonces = new Set<string>();

    for (let index = 0; index < 20; index += 1) {
      nonces.add(nonceOf((await run("/checkout")).headers.get("content-security-policy")));
    }

    expect(nonces.size).toBe(20);
  });

  it("response CSP equals buildContentSecurityPolicy for the active tier", async () => {
    for (const [nodeEnv, tier, expected] of [
      ["test", undefined, "local-test"],
      ["production", undefined, "production"],
      ["production", "local-test", "production"],
      ["production", "staging", "staging"],
    ] as const) {
      vi.stubEnv("NODE_ENV", nodeEnv);
      vi.stubEnv("NIUVA_DEPLOYMENT_TIER", tier ?? "");

      const policy = (await run("/account/orders/1")).headers.get("content-security-policy");

      expect(policy, `${nodeEnv}/${tier}`).toBe(
        buildContentSecurityPolicy({ nonce: nonceOf(policy), tier: expected }),
      );
    }
  });

  it("propagates the same nonce and policy to the request headers for Next", async () => {
    const response = await run("/checkout");
    const policy = response.headers.get("content-security-policy");

    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonceOf(policy));
    expect(response.headers.get("x-middleware-override-headers")).toContain("x-nonce");
  });

  it("production policy has no 'unsafe-inline' in script-src", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "");

    const policy = (await run("/checkout")).headers.get("content-security-policy") ?? "";
    const scriptSrc = policy.split("; ").find((part) => part.startsWith("script-src ")) ?? "";

    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });
});

describe("proxy Admin auth path is unchanged for admin", () => {
  it("still goes through the Admin auth handler for /admin and /api/admin", async () => {
    await run("/admin/orders", { accept: "text/html" });
    await run("/api/admin/orders", { accept: "application/json" });

    expect(authMocks.session).toHaveBeenCalledTimes(2);
    expect(authMocks.session).toHaveBeenCalledTimes(2);
  });

  it("keeps the 503 for admin without credentials but not for header-only paths", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");

    expect((await run("/admin/orders", { accept: "text/html" })).status).toBe(503);
    expect((await run("/checkout")).status).toBe(200);
  });

  it("sends anything that is not explicitly header-only to Admin auth", async () => {
    for (const pathname of ["/Admin/orders", "/ADMIN", "/api/admin", "/services", "/checkoutx"]) {
      authMocks.session.mockClear();
      await run(pathname, { accept: "text/html" });

      expect(authMocks.session, pathname).toHaveBeenCalledTimes(1);
    }
  });
});

describe("proxy matcher", () => {
  it("keeps the Admin auth entries first and unchanged", () => {
    expect(config.matcher.slice(0, 2)).toEqual(["/admin/:path*", "/api/admin/:path*"]);
  });

  it("covers /checkout and its children with the same prefetch exclusion as /account", () => {
    const entries = config.matcher.slice(2) as { source: string; missing: unknown }[];
    const checkout = entries.find((entry) => entry.source === "/checkout/:path*");
    const account = entries.find((entry) => entry.source === "/account/:path*");

    expect(checkout).toBeDefined();
    expect(checkout?.missing).toEqual(account?.missing);
    expect(matches("/checkout/anything/deep", { "next-router-prefetch": "1" })).toBe(false);
  });

  it("matches admin, checkout and account paths", () => {
    for (const url of [
      "/admin",
      "/admin/orders",
      "/api/admin/orders",
      "/checkout",
      "/checkout/anything",
      "/account",
      "/account/orders/abc",
    ]) {
      expect(matches(url), url).toBe(true);
    }
  });

  it("excludes Next prefetch requests from the header-only paths", () => {
    expect(matches("/checkout", { "next-router-prefetch": "1" })).toBe(false);
    expect(matches("/account/orders/abc", { purpose: "prefetch" })).toBe(false);
    expect(matches("/checkout", { purpose: "other" })).toBe(true);
  });

  it("never matches static assets or metadata files", () => {
    for (const url of [
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/logo.png",
      "/services",
      "/",
    ]) {
      expect(matches(url), url).toBe(false);
    }
  });

  it("_next/data URLs are normalised to the page path, so protection carries over", () => {
    // Next maps /_next/data/<build>/<page>.json back to /<page> before matching,
    // so the data route of an admin or header-only page is matched exactly like
    // the page (never bypassed). Non-matching pages stay unmatched.
    expect(matches("/_next/data/build-id/checkout.json")).toBe(true);
    expect(matches("/_next/data/build-id/admin/orders.json")).toBe(true);
    expect(matches("/_next/data/build-id/services.json")).toBe(false);
  });
});
