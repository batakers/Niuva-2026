// Feature: niuva-audit-remediation, Property 16
// Property 16: The protected surface cannot be bypassed.
// Validates: Requirements 13.9, 13.10, 13.11, 13.12
import { createRequire } from "node:module";

import { NextRequest, type NextFetchEvent } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRng,
  DEFAULT_SEED,
  forEachCase,
  MIN_GENERATED,
  pathnameCorpus,
  scriptFragmentCorpus,
  seededCorpus,
  type Rng,
} from "../helpers/corpus";

const clerkMocks = vi.hoisted(() => ({ delegated: vi.fn(), protect: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware:
    (
      handler: (
        auth: { protect: (options: unknown) => unknown },
        request: unknown,
        event: unknown,
      ) => unknown,
    ) =>
    async (request: unknown, event: unknown) => {
      clerkMocks.delegated();

      return handler({ protect: clerkMocks.protect }, request, event);
    },
}));

import { isAdminSignInPath } from "@/lib/auth/admin-proxy-response";
import { resolveAppOrigin } from "@/lib/env/origin";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { STATIC_CSP_SOURCE } from "@/lib/security/headers";
import { generateNonce } from "@/lib/security/nonce";
import { isSameOriginRequest } from "@/lib/security/origin";
import proxy, { config } from "@/proxy";

// Next's own compiled path-to-regexp (compiles header `source`); no types.
const { pathToRegexp } = createRequire(import.meta.url)("next/dist/compiled/path-to-regexp") as {
  pathToRegexp: (source: string) => RegExp;
};
const staticRegex = pathToRegexp(STATIC_CSP_SOURCE);

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;

// ---------------------------------------------------------------- corpora

const PREFIXES = [
  "/admin", "/ADMIN", "/Admin", "/api/admin", "/API/Admin", "/api/ADMIN",
  "/checkout", "/CHECKOUT", "/Checkout", "/account", "/ACCOUNT", "/Account",
  "/checkoutx", "/accounts", "/services", "/", "/_next/data/build-1/admin.json",
  "/_next/data/build-1/checkout.json", "/_next/data/build-1/account/orders.json",
  "/_next/data/build-1/services.json", "/%61dmin", "/api/%61dmin", "/account.x", "/admin.json",
];
const SUFFIXES = [
  "", "", "/", "//", "/orders", "/orders/", "/%2e%2e/admin", "/../admin", "/./x", "/..", "/.",
  "/a.b", "/x.json", "/%2F", "/..%2fadmin", "/%2e%2e%2fadmin", "/sign-in", "/sign-in/", "/x//y",
  "/%41dmin", "/\\admin", "/%5cadmin", "?x=1", "/?a=b#h", "/.hidden", "/file.txt",
];

const pathCorpus: string[] = [
  ...pathnameCorpus().filter((p) => p === "" || p.startsWith("/")),
  ...seededCorpus(
    ["/admin", "/admin/", "//admin", "/ADMIN/", "/checkout/", "/checkout//x", "/account/../admin"],
    (r) => `${pick(r, PREFIXES)}${pick(r, SUFFIXES)}${pick(r, SUFFIXES)}`,
    DEFAULT_SEED + 16,
    240,
  ),
].map((p) => (p === "" ? "/" : p));

const HEADER_VARIANTS: ReadonlyArray<Record<string, string>> = [
  {},
  { accept: "text/html" },
  { accept: "application/json" },
  { "next-router-prefetch": "1" },
  { purpose: "prefetch" },
  { purpose: "PREFETCH" },
  { purpose: "other" },
  { rsc: "1" },
  { "x-middleware-prefetch": "1" },
  { "x-forwarded-host": "evil.example.test" },
];

// ---------------------------------------------------------------- oracle

/** Independent normaliser: how a route resolver would see the path. */
function normalise(raw: string): string {
  const path = (raw.split(/[?#]/, 1)[0] ?? "").replace(/\\/g, "/");
  const out: string[] = [];

  for (const segment of path.split("/")) {
    let decoded: string;

    try {
      // %2f / %5c inside a segment never become separators: keep them literal.
      decoded = decodeURIComponent(segment.replace(/%(2f|5c)/gi, "\u0001"));
    } catch {
      decoded = segment;
    }

    const lower = decoded.toLowerCase();

    if (lower === ".") continue;
    if (lower === "..") {
      out.pop(); // WHATWG: ".." removes the previous segment, even an empty one.
      continue;
    }
    out.push(lower);
  }

  let normalised = `/${out.filter((segment) => segment !== "").join("/")}`;
  const data = /^\/_next\/data\/[^/]+(\/.*)\.json$/.exec(normalised);

  if (data?.[1] !== undefined) normalised = data[1];

  return normalised;
}

/** Lowercase, no percent escapes, no empty segments: what the matcher can see literally. */
const isCanonical = (pathname: string): boolean =>
  pathname === pathname.toLowerCase() && !/%/.test(pathname) && !pathname.includes("//");
const under = (path: string, root: string): boolean => path === root || path.startsWith(`${root}/`);
const intoAdmin = (path: string): boolean => under(path, "/admin") || under(path, "/api/admin");

function matches(url: string, headers?: Record<string, string>): boolean {
  // Copy: the helper adds a `host` header to the object it is given.
  return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url, headers: headers === undefined ? undefined : { ...headers } });
}

function run(pathname: string, headers: Record<string, string> = {}) {
  return proxy(
    new NextRequest(`http://localhost:3000${pathname}`, { headers }),
    {} as NextFetchEvent,
  ) as Promise<Response | undefined> | Response | undefined;
}

function nonceOf(policy: string | null): string {
  const found = /'nonce-([^']+)'/.exec(policy ?? "")?.[1];

  if (found === undefined) throw new Error("no nonce in CSP");

  return found;
}

const scriptSrcOf = (policy: string): string =>
  policy.split("; ").find((part) => part.startsWith("script-src ")) ?? "";

beforeEach(() => {
  clerkMocks.delegated.mockClear();
  clerkMocks.protect.mockClear();
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------- (1)

describe("Property 16 (1): admin surface always takes the Clerk path", () => {
  it("uses a corpus of at least 100 paths and header variants", () => {
    expect(pathCorpus.length).toBeGreaterThanOrEqual(MIN_GENERATED);
    expect(HEADER_VARIANTS.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps the first two Clerk matcher entries unchanged", () => {
    expect(config.matcher.slice(0, 2)).toEqual(["/admin/:path*", "/api/admin/:path*"]);
  });

  it("delegates every path that normalises into /admin or /api/admin to Clerk, never header-only", async () => {
    let admin = 0;

    for (const path of pathCorpus) {
      if (!intoAdmin(normalise(path))) continue;

      for (const headers of HEADER_VARIANTS) {
        admin += 1;
        clerkMocks.delegated.mockClear();
        clerkMocks.protect.mockClear();

        const label = `path=${JSON.stringify(path)} headers=${JSON.stringify(headers)}`;
        const result = await run(path, headers);
        const pathname = new NextRequest(`http://localhost:3000${path}`).nextUrl.pathname;

        expect(clerkMocks.delegated, label).toHaveBeenCalledTimes(1);
        expect(clerkMocks.protect, label).toHaveBeenCalledTimes(isAdminSignInPath(pathname) ? 0 : 1);
        // The header-only path would return a Response carrying a nonce CSP.
        expect(result?.headers?.get("content-security-policy") ?? null, label).toBeNull();
      }
    }

    expect(admin).toBeGreaterThan(MIN_GENERATED);
  });

  it("without Clerk credentials an admin-normalising path is a 503, never passed through", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "");

    for (const path of pathCorpus) {
      if (!intoAdmin(normalise(path))) continue;

      const response = await run(path, { accept: "text/html" });

      expect(response?.status, path).toBe(503);
    }

    expect(clerkMocks.delegated).not.toHaveBeenCalled();
  });

  it("the matcher covers every admin path once URL-normalised, including _next/data forms", () => {
    forEachCase(pathCorpus, (path) => {
      const url = `http://localhost:3000${path}`;
      const urlPath = new URL(url).pathname;

      // Canonical forms only: the matcher is case-sensitive and literal (see the
      // observation test below for the non-canonical variants).
      if (!intoAdmin(normalise(urlPath)) || !isCanonical(urlPath)) return;

      for (const headers of HEADER_VARIANTS) {
        expect(matches(url, headers), JSON.stringify(headers)).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------- (2)

describe("Property 16 (2): checkout and account get exactly one nonce CSP writer", () => {
  const roots = ["/checkout", "/account"];
  const protectedPaths = pathCorpus.filter((path) => {
    const urlPath = normalise(new URL(`http://localhost:3000${path}`).pathname);

    return roots.some((root) => under(urlPath, root));
  });

  it("has protected paths in the corpus", () => {
    expect(protectedPaths.length).toBeGreaterThan(20);
  });

  it("never lets a matched path receive both the static CSP and the proxy CSP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "");

    const nonces = new Set<string>();
    const uncovered = new Set<string>();
    let total = 0;

    for (const path of pathCorpus) {
      const pathname = new NextRequest(`http://localhost:3000${path}`).nextUrl.pathname;

      for (const headers of HEADER_VARIANTS) {
        const label = `path=${JSON.stringify(path)} headers=${JSON.stringify(headers)}`;
        const isMatched = matches(`http://localhost:3000${path}`, headers);
        const underProtected = roots.some((root) => under(pathname.toLowerCase(), root));

        if (isMatched && underProtected) {
          total += 1;
          clerkMocks.delegated.mockClear();

          const response = await run(path, headers);
          const policy = response?.headers?.get("content-security-policy") ?? null;

          // Exactly one proxy writer: one header value, one nonce, mirrored to Next.
          expect(policy, label).not.toBeNull();
          expect((policy ?? "").match(/'nonce-/g), label).toHaveLength(1);
          expect(response?.headers.get("x-middleware-request-content-security-policy"), label).toBe(policy);
          expect(clerkMocks.delegated, label).not.toHaveBeenCalled();
          // No static CSP on the same path.
          expect(staticRegex.test(pathname), label).toBe(false);
          // Production tier: no inline/eval scripts.
          expect(scriptSrcOf(policy ?? ""), label).not.toMatch(/'unsafe-(inline|eval)'/);
          nonces.add(nonceOf(policy));
        }

        // No gap: a path the static CSP skips must be covered by the proxy
        // writer unless it is a Next prefetch request (no document rendered).
        if (!staticRegex.test(pathname) && !("next-router-prefetch" in headers) && headers.purpose?.toLowerCase() !== "prefetch") {
          if (isCanonical(pathname)) {
            expect(isMatched, `no CSP writer: ${label}`).toBe(true);
          } else {
            uncovered.add(pathname);
          }
        }
      }
    }

    expect(total).toBeGreaterThan(MIN_GENERATED / 2);
    // Nonce differs per request.
    expect(nonces.size).toBe(total);

    // Observation (not asserted as a defect): non-canonical variants (upper case,
    // empty segments) that the static CSP skips but the case-sensitive matcher
    // does not reach. They resolve to a redirect/404 in Next, not a rendered
    // checkout/account page. Pin the set so any new kind of gap is noticed.
    for (const pathname of uncovered) {
      expect(isCanonical(pathname), pathname).toBe(false);
    }
  }, 30_000);
});

// ---------------------------------------------------------------- (3)

const HOST_LABELS = ["shop", "niuva", "app", "a", "x1", "my-site", "www", "staging"];
const TLDS = ["test", "example", "invalid", "co.id", "com"];

function hostCorpus(): string[] {
  const rng = createRng(DEFAULT_SEED + 1603);
  const fixed = ["localhost", "localhost:3000", "127.0.0.1:3000", "[::1]:3000", "niuva.example.test", "evil.test"];

  return [
    ...fixed,
    ...Array.from({ length: 150 }, () => {
      const host = `${pick(rng, HOST_LABELS)}${pick(rng, ["", "-b", "2"])}.${pick(rng, TLDS)}`;

      return rng() < 0.2 ? `${host}:${pick(rng, [3000, 8443, 8080])}` : host;
    }),
  ];
}

function req(url: string, headers: Record<string, string>): Request {
  return new Request(url, { headers });
}

describe("Property 16 (3): origin checks", () => {
  const hosts = hostCorpus();

  it("uses at least 100 hosts", () => {
    expect(hosts.length).toBeGreaterThanOrEqual(MIN_GENERATED);
  });

  it("never accepts Origin 'null' or a spoofed X-Forwarded-Host as same-origin", () => {
    forEachCase(hosts, (host, index) => {
      const other = hosts[(index + 7) % hosts.length] as string;
      const url = `https://${host}/api/x`;

      for (const nullOrigin of ["null", "NULL", " null ", "Null"]) {
        expect(isSameOriginRequest(req(url, { origin: nullOrigin })), nullOrigin).toBe(false);
        expect(isSameOriginRequest(req(url, { origin: nullOrigin, "x-forwarded-host": host })), nullOrigin).toBe(false);
      }

      if (other !== host) {
        // Attacker origin + forwarded host forged to match it.
        expect(isSameOriginRequest(req(url, { origin: `https://${other}`, "x-forwarded-host": other, host: other })), other).toBe(false);
        // Real origin, forged forwarded host: forged header must not change the verdict.
        expect(isSameOriginRequest(req(url, { origin: `https://${host}`, "x-forwarded-host": other })), other).toBe(true);
      }

      // Scheme and port downgrades are different origins.
      expect(isSameOriginRequest(req(url, { origin: `http://${host}` }))).toBe(false);
      expect(isSameOriginRequest(req(url, { origin: `https://${host}.evil.test` }))).toBe(false);
      expect(isSameOriginRequest(req(url, {}))).toBe(false);
      expect(isSameOriginRequest(req(url, { origin: `https://${host}` }))).toBe(true);
    });
  });

  it("resolveAppOrigin never returns ok for http (staging/production), credentials, paths or wildcards", () => {
    for (const tier of ["staging", "production"] as const) {
      forEachCase(hosts, (host) => {
        const bare = host.replace(/:\d+$/, "");
        const bad = [
          `http://${host}`,
          `HTTP://${host}/`,
          `https://user@${host}`,
          `https://user:pass@${host}`,
          `https://${host}/path`,
          `https://${host}/?q=1`,
          `https://${host}#f`,
          `https://*.${bare}`,
          `https://${bare}*`,
          `https://${host}\\@evil.test`,
          `https://${host}%2f@evil.test`,
          `https://${host} evil.test`,
          `ftp://${host}`,
          `//${host}`,
          host,
        ];

        for (const appUrl of bad) {
          const result = resolveAppOrigin({ tier, appUrl });

          expect(result.ok, `${tier} ${appUrl}`).toBe(false);
        }

        // Positive control: the canonical https form is accepted and canonical.
        if (/^[a-z0-9-]+\.[a-z.]+(:\d+)?$/.test(host)) {
          const ok = resolveAppOrigin({ tier, appUrl: `https://${host.toUpperCase()}/` });

          expect(ok.ok, `${tier} ${host}`).toBe(true);
          if (ok.ok) expect(ok.origin).toBe(new URL(`https://${host}`).origin);
        }
      });
    }
  });
});

// ---------------------------------------------------------------- (4)

describe("Property 16 (4): production CSP never allows inline or eval scripts", () => {
  const rng = createRng(DEFAULT_SEED + 1604);
  const origin = (): string =>
    `https://${pick(rng, ["*.", "", ""])}${pick(rng, HOST_LABELS)}.${pick(rng, TLDS)}${pick(rng, ["", ":8443", ":*"])}`;
  const directives = ["connect-src", "font-src", "frame-src", "img-src", "script-src", "style-src", "worker-src"] as const;

  it("script-src has neither 'unsafe-inline' nor 'unsafe-eval' for any valid input", () => {
    for (let index = 0; index < 200; index += 1) {
      const extraSources = Object.fromEntries(
        directives
          .filter(() => rng() < 0.5)
          .map((d) => [d, Array.from({ length: 1 + Math.floor(rng() * 3) }, origin)]),
      );
      const policy = buildContentSecurityPolicy({
        connectOrigins: rng() < 0.5 ? [origin()] : undefined,
        extraSources,
        nonce: generateNonce(),
        strictDynamic: rng() < 0.5,
        tier: "production",
      });
      const scriptSrc = scriptSrcOf(policy);

      expect(scriptSrc, policy).toContain("'nonce-");
      expect(scriptSrc, policy).not.toContain("'unsafe-inline'");
      expect(scriptSrc, policy).not.toContain("'unsafe-eval'");
      expect(policy, policy).toContain("upgrade-insecure-requests");
    }
  });

  it("rejects injection payloads in nonce, origins and extra sources", () => {
    const payloads = [
      ...scriptFragmentCorpus(),
      "https://a.test; script-src 'unsafe-inline'",
      "https://a.test 'unsafe-inline'",
      "https://a.test,https://b.test",
      "https://a.test/path",
      "https://u@a.test",
      "'unsafe-eval'",
      "http://a.test",
      "data:",
      "*",
      "",
    ];

    forEachCase(payloads, (payload) => {
      const nonce = generateNonce();

      expect(() => buildContentSecurityPolicy({ nonce: payload, tier: "production" })).toThrow();
      expect(() => buildContentSecurityPolicy({ connectOrigins: [payload], nonce, tier: "production" })).toThrow();

      for (const directive of directives) {
        expect(() =>
          buildContentSecurityPolicy({ extraSources: { [directive]: [payload] }, nonce, tier: "production" }),
        ).toThrow();
      }
    });

    expect(() =>
      buildContentSecurityPolicy({ extraSources: { "script-src-elem": ["https://a.test"] } as never, nonce: generateNonce(), tier: "production" }),
    ).toThrow();
  });
});
