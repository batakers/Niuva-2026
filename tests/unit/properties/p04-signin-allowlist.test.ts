// Feature: system-pages-and-error-states, Property 4: Exact sign-in allowlist
// Validates: Requirements 10.3, 10.5, 10.6, 9.10
import { NextRequest, type NextFetchEvent } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SEED, forEachCase, pathnameCorpus } from "../helpers/corpus";

type ProtectOptions = Readonly<{ unauthenticatedUrl: string }>;
type ClerkAuth = Readonly<{
  protect: (options: ProtectOptions) => Promise<void>;
}>;
type MiddlewareHandler = (
  auth: ClerkAuth,
  request: NextRequest,
  event: NextFetchEvent,
) => Promise<unknown> | unknown;
type ClerkMiddlewareOptions = Readonly<{
  contentSecurityPolicy?: Readonly<{ strict?: boolean }>;
}>;

const clerkMocks = vi.hoisted(() => ({
  protect: vi.fn(async (options: ProtectOptions): Promise<void> => {
    if (options.unauthenticatedUrl === "") {
      return;
    }
  }),
  middlewareOptions: undefined as ClerkMiddlewareOptions | undefined,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: MiddlewareHandler, options: ClerkMiddlewareOptions) => {
    clerkMocks.middlewareOptions = options;

    return async (request: NextRequest, event: NextFetchEvent) =>
      handler({ protect: clerkMocks.protect }, request, event);
  },
}));

import proxy from "@/proxy";
import { isAdminSignInPath } from "@/lib/auth/admin-proxy-response";

const ORIGIN = "http://localhost:3000";
const SIGN_IN_URL = `${ORIGIN}/admin/sign-in`;

/** Independent oracle for the allowlist: exact path or prefix `/admin/sign-in/`. */
function expectedAllowlisted(pathname: string): boolean {
  return pathname === "/admin/sign-in" || pathname.startsWith("/admin/sign-in/");
}

const requiredCases: ReadonlyArray<Readonly<{ pathname: string; allowed: boolean }>> = [
  { pathname: "/admin/sign-in", allowed: true },
  { pathname: "/admin/sign-in/", allowed: true },
  { pathname: "/admin/sign-in/factor-one", allowed: true },
  { pathname: "/admin/sign-in/sso-callback", allowed: true },
  { pathname: "/admin/sign-in/factor-one/", allowed: true },
  { pathname: "/admin/sign-in-other", allowed: false },
  { pathname: "/admin/sign-inx", allowed: false },
  { pathname: "/admin/sign-in%2Fx", allowed: false },
  { pathname: "/admin/sign-in%2fx", allowed: false },
  { pathname: "/admin/Sign-In", allowed: false },
  { pathname: "/admin/sign-i", allowed: false },
  { pathname: "/admin", allowed: false },
  { pathname: "/admin/", allowed: false },
  { pathname: "/admin/pricing", allowed: false },
  { pathname: "/api/admin/sign-in", allowed: false },
];

async function runProxy(pathname: string): Promise<string> {
  clerkMocks.protect.mockClear();
  // A real HTTP request target always starts with "/"; some corpus entries do not.
  const target = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const request = new NextRequest(`${ORIGIN}${target}`);

  await proxy(request, {} as NextFetchEvent);

  return request.nextUrl.pathname;
}

beforeEach(() => {
  clerkMocks.protect.mockClear();
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Property 4: exact sign-in allowlist", () => {
  it("isAdminSignInPath matches only the exact path or the /admin/sign-in/ prefix", () => {
    for (const { pathname, allowed } of requiredCases) {
      expect(isAdminSignInPath(pathname), pathname).toBe(allowed);
    }

    const corpus = pathnameCorpus();
    expect(corpus.length).toBeGreaterThanOrEqual(100);

    forEachCase(corpus, (pathname) => {
      expect(isAdminSignInPath(pathname)).toBe(expectedAllowlisted(pathname));
    });
  });

  it("skips auth.protect for the required allowlisted and look-alike paths", async () => {
    for (const { pathname, allowed } of requiredCases) {
      const observed = await runProxy(pathname);

      if (allowed) {
        expect(clerkMocks.protect, pathname).not.toHaveBeenCalled();
      } else {
        expect(clerkMocks.protect, pathname).toHaveBeenCalledTimes(1);
        expect(clerkMocks.protect).toHaveBeenCalledWith({ unauthenticatedUrl: SIGN_IN_URL });
      }

      expect(expectedAllowlisted(observed), `${pathname} -> ${observed}`).toBe(allowed);
    }
  });

  it("calls auth.protect exactly for non-allowlisted seeded pathnames, with an absolute sign-in URL", async () => {
    const corpus = pathnameCorpus();
    expect(corpus.length).toBeGreaterThanOrEqual(100);

    let allowlistedSeen = 0;
    let protectedSeen = 0;

    // Expectation is derived from the pathname the proxy actually receives, since URL
    // parsing normalizes some corpus entries (query, hash, dot segments).
    const results: Array<Readonly<{ observed: string; calls: number; args: unknown }>> = [];

    for (const value of corpus) {
      const observed = await runProxy(value);
      results.push({
        observed,
        calls: clerkMocks.protect.mock.calls.length,
        args: clerkMocks.protect.mock.calls[0]?.[0],
      });
    }

    forEachCase(
      corpus,
      (_value, index) => {
        const result = results[index];
        if (result === undefined) {
          throw new Error("missing result");
        }

        if (expectedAllowlisted(result.observed)) {
          allowlistedSeen += 1;
          expect(result.calls, `observed ${result.observed}`).toBe(0);
        } else {
          protectedSeen += 1;
          expect(result.calls, `observed ${result.observed}`).toBe(1);
          expect(result.args).toEqual({ unauthenticatedUrl: SIGN_IN_URL });
        }
      },
      DEFAULT_SEED,
    );

    // Guard against a vacuous corpus: both outcomes must be exercised.
    expect(allowlistedSeen).toBeGreaterThan(0);
    expect(protectedSeen).toBeGreaterThan(0);
  });

  it("keeps the strict CSP option and never loosens protection (Req 9.10)", () => {
    expect(clerkMocks.middlewareOptions).toEqual({
      contentSecurityPolicy: { strict: true },
    });
  });
});
