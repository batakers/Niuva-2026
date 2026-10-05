import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";

const REQUIRED_DISALLOW = [
  "/admin",
  "/api",
  "/account",
  "/checkout",
  "/cart",
  "/preview",
  "/internal-testing",
  "/auth-test-policy",
  "/demo",
  "/orders",
  "/quote",
];

function disallowed(result: ReturnType<typeof robots>): string[] {
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const value = rule?.disallow;

  return Array.isArray(value) ? value : value ? [value] : [];
}

describe("robots (Req 16.3, 16.7)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disallows internal, private, and token routes and links the sitemap on the canonical origin", () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
    vi.stubEnv("APP_URL", "https://niuva.example.com");

    const result = robots();

    expect(disallowed(result)).toEqual(expect.arrayContaining(REQUIRED_DISALLOW));
    expect(result.sitemap).toBe("https://niuva.example.com/sitemap.xml");
  });

  it("omits the sitemap instead of guessing an origin, and still disallows", () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
    vi.stubEnv("APP_URL", "");

    const result = robots();

    expect(result.sitemap).toBeUndefined();
    expect(disallowed(result)).toEqual(expect.arrayContaining(REQUIRED_DISALLOW));
  });
});
