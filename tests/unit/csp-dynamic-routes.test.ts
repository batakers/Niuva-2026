import { NextRequest, type NextFetchEvent } from "next/server";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => async () => new Response(null),
}));

import nextConfig from "../../next.config";
import proxy from "@/proxy";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import {
  getContentSecurityPolicy,
  getNonCspSecurityHeaders,
  getSecurityHeaders,
  STATIC_CSP_SOURCE,
} from "@/lib/security/headers";

// Next's own compiled path-to-regexp (the one that compiles header `source`);
// it ships no type declarations.
const { pathToRegexp } = createRequire(import.meta.url)(
  "next/dist/compiled/path-to-regexp",
) as { pathToRegexp: (source: string) => RegExp };

const NONCE = "AAAAAAAAAAAAAAAAAAAAAA==";
const R2_ENV = {
  CUSTOM_FILE_MAX_BYTES: "104857600",
  R2_ACCESS_KEY_ID: "access-key",
  R2_ACCOUNT_ID: "account-id",
  R2_ENDPOINT: "https://r2-development.example.test:8443/ignored/path",
  R2_PRIVATE_BUCKET: "niuva-private-development",
  R2_PUBLIC_BUCKET: "niuva-public-development",
  R2_SECRET_ACCESS_KEY: "secret-key",
};

function parse(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((part) => {
      const [name = "", ...values] = part.split(" ");

      return [name, values];
    }),
  );
}

function run(pathname: string) {
  return proxy(new NextRequest(`http://localhost:3000${pathname}`), {} as NextFetchEvent) as
    | Promise<Response>
    | Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("next.config headers(): static CSP source", () => {
  const staticRegex = pathToRegexp(STATIC_CSP_SOURCE);

  it("excludes /checkout and /account from the static CSP only", () => {
    for (const path of ["/checkout", "/checkout/", "/checkout/step", "/account", "/account/orders/1"]) {
      expect(staticRegex.test(path), path).toBe(false);
    }
  });

  it("matching is case-insensitive exactly like the proxy matcher and isHeaderOnlyPath", async () => {
    // Next compiles header sources and middleware matchers the same way, so a
    // differently-cased path is excluded here AND handled by the header-only proxy.
    expect(staticRegex.test("/Checkout")).toBe(false);
    expect(staticRegex.test("/ACCOUNT/x")).toBe(false);

    const response = await run("/Checkout");

    expect(response.headers.get("content-security-policy")).toContain("'nonce-");
  });

  it("keeps the static CSP on every other path, including look-alikes and admin", () => {
    for (const path of [
      "/",
      "/services",
      "/checkoutx",
      "/accounts",
      "/account-x/y",
      "/admin",
      "/admin/sign-in",
      "/api/admin/orders",
      "/api/health",
      "/custom-print/requests/abc",
    ]) {
      expect(staticRegex.test(path), path).toBe(true);
    }
  });

  it("emits the CSP only in the restricted rule and all other security headers on /:path*", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find(({ source }) => source === "/:path*");
    const staticCsp = rules.find(({ source }) => source === STATIC_CSP_SOURCE);
    const cspKey = (key: string) => key.toLowerCase() === "content-security-policy";

    expect(all?.headers.some(({ key }) => cspKey(key))).toBe(false);
    expect(staticCsp?.headers.map(({ key }) => key)).toEqual(["Content-Security-Policy"]);

    const expectedOthers = getSecurityHeaders().filter(({ key }) => !cspKey(key));

    expect(all?.headers).toEqual(expectedOthers);
    expect(expectedOthers.map(({ key }) => key)).toEqual(
      expect.arrayContaining([
        "Permissions-Policy",
        "Referrer-Policy",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "X-Permitted-Cross-Domain-Policies",
      ]),
    );
    expect(getNonCspSecurityHeaders("production").map(({ key }) => key)).toContain(
      "Strict-Transport-Security",
    );
  });

  it("keeps getSecurityHeaders() as CSP + the non-CSP headers", () => {
    for (const nodeEnv of ["production", "development"] as const) {
      const headers = getSecurityHeaders(nodeEnv, {});

      expect(headers[0]).toEqual({
        key: "Content-Security-Policy",
        value: getContentSecurityPolicy(nodeEnv, {}),
      });
      expect(headers.slice(1)).toEqual(getNonCspSecurityHeaders(nodeEnv));
    }
  });
});

describe("dynamic-route CSP written by the proxy", () => {
  it("production: nonce + strict-dynamic, no 'unsafe-inline' and no 'unsafe-eval' in script-src", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "");

    for (const path of ["/checkout", "/account", "/account/orders/1"]) {
      const policy = (await run(path)).headers.get("content-security-policy") ?? "";
      const scriptSrc = parse(policy).get("script-src") ?? [];

      expect(scriptSrc.some((value) => value.startsWith("'nonce-")), path).toBe(true);
      expect(scriptSrc, path).toContain("'strict-dynamic'");
      expect(scriptSrc, path).not.toContain("'unsafe-inline'");
      expect(scriptSrc, path).not.toContain("'unsafe-eval'");
      expect(policy, path).toContain("frame-ancestors 'none'");
    }
  });

  it("local-test tier keeps 'unsafe-eval' and ws for dev tooling", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "");

    const parsed = parse((await run("/checkout")).headers.get("content-security-policy") ?? "");

    expect(parsed.get("script-src")).toContain("'unsafe-eval'");
    expect(parsed.get("script-src")).not.toContain("'unsafe-inline'");
    expect(parsed.get("connect-src")).toEqual(expect.arrayContaining(["ws:", "wss:"]));
  });

  it("carries the R2 origin in connect-src when allowed, and only then", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "");

    for (const [key, value] of Object.entries(R2_ENV)) {
      vi.stubEnv(key, value);
    }

    const withR2 = parse((await run("/checkout")).headers.get("content-security-policy") ?? "");

    expect(withR2.get("connect-src")).toContain("https://r2-development.example.test:8443");

    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");

    const withoutR2 = (await run("/checkout")).headers.get("content-security-policy") ?? "";

    expect(withoutR2).not.toContain("r2-development.example.test");

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret-key");

    expect((await run("/checkout")).headers.get("content-security-policy")).not.toContain(
      "r2-development.example.test",
    );
  });
});

describe("parity: no static directive is lost on the dynamic CSP", () => {
  const cases = [
    { nodeEnv: "production", tier: "production" },
    { nodeEnv: "development", tier: "local-test" },
  ] as const;

  for (const { nodeEnv, tier } of cases) {
    it(`${tier}: every static directive survives (R2 and Clerk origins included)`, () => {
      const staticParsed = parse(getContentSecurityPolicy(nodeEnv, R2_ENV));
      const r2 = nodeEnv === "production" ? [] : ["https://r2-development.example.test:8443"];
      const dynamicParsed = parse(
        buildContentSecurityPolicy({
          connectOrigins: r2,
          extraSources: { "connect-src": ["https://clerk.example.test"] },
          nonce: NONCE,
          tier,
        }),
      );

      for (const [directive, values] of staticParsed) {
        if (directive === "script-src") {
          continue; // intentionally different: nonce replaces 'unsafe-inline'
        }

        expect(dynamicParsed.has(directive), directive).toBe(true);

        for (const value of values) {
          expect(dynamicParsed.get(directive), `${directive} ${value}`).toContain(value);
        }
      }

      expect(dynamicParsed.get("connect-src")).toContain("https://clerk.example.test");
    });
  }
});
