import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "../../src/lib/security/csp";
import { getContentSecurityPolicy } from "../../src/lib/security/headers";
import { generateNonce, isValidNonce } from "../../src/lib/security/nonce";

const NONCE = "AAAAAAAAAAAAAAAAAAAAAA==";

function parse(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const part of policy.split("; ")) {
    const [name = "", ...sources] = part.split(" ");

    map.set(name, sources);
  }

  return map;
}

describe("nonce", () => {
  it("is base64, at least 128 bits, and unique per call", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => generateNonce()));

    expect(nonces.size).toBe(200);

    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
      expect(atob(nonce).length).toBeGreaterThanOrEqual(16);
      expect(isValidNonce(nonce)).toBe(true);
    }
  });

  it("rejects unsafe or short nonces", () => {
    for (const bad of ["", "abc", "a b", "AAAAAAAAAAAAAAAAAAAAAA;", "AAAAAAAAAAAAAAAAAAAAAA' x", "<AAAAAAAAAAAAAAAAAAAAAA>"]) {
      expect(isValidNonce(bad)).toBe(false);
    }
  });
});

describe("buildContentSecurityPolicy", () => {
  it("production: nonce, no unsafe-inline/unsafe-eval in script-src", () => {
    const script = parse(buildContentSecurityPolicy({ nonce: NONCE, tier: "production" })).get("script-src");

    expect(script).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
  });

  it("allows unsafe-eval only for local-test", () => {
    for (const tier of ["production", "staging"] as const) {
      expect(buildContentSecurityPolicy({ nonce: NONCE, tier })).not.toContain("'unsafe-eval'");
    }

    const dev = buildContentSecurityPolicy({ nonce: NONCE, tier: "local-test" });

    expect(dev).toContain("'unsafe-eval'");
    expect(parse(dev).get("script-src")).not.toContain("'unsafe-inline'");
  });

  it("is deterministic regardless of extra source input order", () => {
    const a = buildContentSecurityPolicy({
      nonce: NONCE,
      tier: "production",
      extraSources: { "script-src": ["https://b.example.com", "https://a.example.com"] },
      connectOrigins: ["https://z.example.com", "https://y.example.com"],
    });
    const b = buildContentSecurityPolicy({
      nonce: NONCE,
      tier: "production",
      extraSources: { "script-src": ["https://a.example.com", "https://b.example.com", "https://a.example.com"] },
      connectOrigins: ["https://y.example.com", "https://z.example.com"],
    });

    expect(a).toBe(b);
    expect(parse(a).get("script-src")).toEqual([
      "'self'",
      `'nonce-${NONCE}'`,
      "'strict-dynamic'",
      "https://a.example.com",
      "https://b.example.com",
    ]);
  });

  it("accepts Clerk-style origins including wildcard and port wildcard", () => {
    const policy = buildContentSecurityPolicy({
      nonce: NONCE,
      tier: "production",
      extraSources: {
        "connect-src": ["https://clerk.example.com", "https://*.protect.clerk.com:*"],
        "frame-src": ["https://challenges.cloudflare.com"],
      },
    });
    const map = parse(policy);

    expect(map.get("connect-src")).toContain("https://*.protect.clerk.com:*");
    expect(map.get("frame-src")).toEqual(["https://challenges.cloudflare.com"]);
  });

  it("rejects injection in nonce and origins", () => {
    expect(() => buildContentSecurityPolicy({ nonce: "x'; script-src *", tier: "production" })).toThrow();

    for (const bad of [
      "https://a.com; script-src *",
      "https://a.com b.com",
      "https://a.com/path",
      "http://a.com",
      "'unsafe-inline'",
      "https://a.com,https://b.com",
      "https://user@a.com",
    ]) {
      expect(() =>
        buildContentSecurityPolicy({ nonce: NONCE, tier: "production", extraSources: { "script-src": [bad] } }),
      ).toThrow();
      expect(() =>
        buildContentSecurityPolicy({ nonce: NONCE, tier: "production", connectOrigins: [bad] }),
      ).toThrow();
    }

    expect(() =>
      buildContentSecurityPolicy({
        nonce: NONCE,
        tier: "production",
        extraSources: { "default-src": ["https://a.com"] } as never,
      }),
    ).toThrow();
  });

  describe("parity with headers.ts", () => {
    // Intentional differences (everything else must be identical per directive):
    //  - script-src: no 'unsafe-inline'; adds 'nonce-<n>' and 'strict-dynamic'.
    //  - staging tier gets upgrade-insecure-requests and no unsafe-eval/ws
    //    (headers.ts keys these on NODE_ENV; here they key on the tier).
    //  - Optional frame-src is emitted only when requested.
    const cases = [
      { nodeEnv: "production", tier: "production" },
      { nodeEnv: "development", tier: "local-test" },
    ] as const;

    for (const { nodeEnv, tier } of cases) {
      it(`${tier}: no directive from the current policy is lost`, () => {
        const current = parse(getContentSecurityPolicy(nodeEnv, {}));
        const next = parse(buildContentSecurityPolicy({ nonce: NONCE, tier }));

        for (const [name, sources] of current) {
          expect(next.has(name)).toBe(true);

          if (name === "script-src") {
            expect(sources).toContain("'unsafe-inline'");
            expect(next.get(name)).not.toContain("'unsafe-inline'");
            expect(next.get(name)).toContain("'self'");
            expect(next.get(name)).toContain(`'nonce-${NONCE}'`);
            expect(sources.filter((s) => s !== "'unsafe-inline'")).toEqual(
              next.get(name)?.filter((s) => s === "'self'" || s === "'unsafe-eval'"),
            );
          } else {
            expect(next.get(name)).toEqual(sources);
          }
        }

        expect([...next.keys()]).toEqual([...current.keys()]);
      });
    }

    it("carries the R2 origin via connectOrigins", () => {
      const next = parse(
        buildContentSecurityPolicy({
          nonce: NONCE,
          tier: "local-test",
          connectOrigins: ["https://acct.r2.cloudflarestorage.com"],
        }),
      );

      expect(next.get("connect-src")).toEqual([
        "'self'",
        "ws:",
        "wss:",
        "https://acct.r2.cloudflarestorage.com",
      ]);
    });
  });
});
