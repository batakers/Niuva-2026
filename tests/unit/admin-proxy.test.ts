import { NextRequest, type NextFetchEvent } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  delegated: vi.fn(),
  middlewareOptions: undefined as ClerkMiddlewareOptions | undefined,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: MiddlewareHandler, options: ClerkMiddlewareOptions) => {
    clerkMocks.middlewareOptions = options;

    return async (request: NextRequest, event: NextFetchEvent) => {
      clerkMocks.delegated();

      return handler({ protect: clerkMocks.protect }, request, event);
    };
  },
}));

import proxy, { config, createAdminAuthUnavailableResponse } from "@/proxy";

const EXPECTED_JSON_BODY = {
  error: {
    code: "AUTH_UNAVAILABLE",
    message: "Layanan autentikasi admin belum tersedia.",
  },
};

beforeEach(() => {
  clerkMocks.protect.mockClear();
  clerkMocks.delegated.mockClear();
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin proxy redirect", () => {
  it("configures Clerk strict CSP for Admin responses", () => {
    expect(clerkMocks.middlewareOptions).toEqual({
      contentSecurityPolicy: { strict: true },
    });
  });

  it("passes an absolute sign-in URL to Clerk protection", async () => {
    const request = new NextRequest("http://localhost:3000/admin/pricing");

    await proxy(request, {} as NextFetchEvent);

    expect(clerkMocks.protect).toHaveBeenCalledWith({
      unauthenticatedUrl: "http://localhost:3000/admin/sign-in",
    });
  });

  it("keeps the sign-in route outside protected redirect handling", async () => {
    const request = new NextRequest("http://localhost:3000/admin/sign-in");

    await proxy(request, {} as NextFetchEvent);

    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });
});

function stubNoCredentials(): void {
  vi.stubEnv("CLERK_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
}

function requestWithAccept(pathname: string, accept?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: accept === undefined ? {} : { accept },
  });
}

describe("admin proxy without Clerk credentials", () => {
  it("returns the static Indonesian HTML 503 for a browser navigation", async () => {
    stubNoCredentials();

    const response = (await proxy(
      requestWithAccept("/admin/orders", "text/html,application/xhtml+xml"),
      {} as NextFetchEvent,
    )) as Response;

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("content-language")).toBe("id");

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    expect(doc.documentElement.getAttribute("lang")).toBe("id");
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("Layanan autentikasi admin belum tersedia");
    expect(doc.querySelectorAll("main#main-content")).toHaveLength(1);
    expect(doc.querySelectorAll("main")).toHaveLength(1);
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");

    const homeLinks = Array.from(doc.querySelectorAll("a")).filter(
      (anchor) => anchor.getAttribute("href") === "/",
    );
    expect(homeLinks).toHaveLength(1);
    expect(homeLinks[0]?.textContent).toBe("Kembali ke beranda");
  });

  it("does not leak error codes, env var names or provider names in the HTML", async () => {
    stubNoCredentials();

    const response = (await proxy(
      requestWithAccept("/admin/orders", "text/html"),
      {} as NextFetchEvent,
    )) as Response;
    const html = await response.text();

    expect(html).not.toContain("AUTH_UNAVAILABLE");
    expect(html).not.toMatch(/CLERK_SECRET_KEY|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|_KEY\b/);
    expect(html).not.toMatch(/clerk|google|midtrans|biteship|cloudflare|stack|exception|digest/i);
  });

  it("returns the exact JSON 503 for API requests", async () => {
    stubNoCredentials();

    for (const [pathname, accept] of [
      ["/api/admin/orders", "text/html"],
      ["/api/admin/orders", undefined],
      ["/admin/orders", "application/json"],
      ["/admin/orders", undefined],
      ["/admin/orders", "*/*"],
    ] as const) {
      const response = (await proxy(
        requestWithAccept(pathname, accept),
        {} as NextFetchEvent,
      )) as Response;

      expect(response.status, `${pathname} ${accept}`).toBe(503);
      expect(response.headers.get("content-type"), `${pathname} ${accept}`).toContain(
        "application/json",
      );
      expect(await response.json(), `${pathname} ${accept}`).toEqual(EXPECTED_JSON_BODY);
    }
  });

  it("never runs the Clerk middleware or auth.protect", async () => {
    stubNoCredentials();

    await proxy(requestWithAccept("/admin/orders", "text/html"), {} as NextFetchEvent);
    await proxy(requestWithAccept("/api/admin/orders", "application/json"), {} as NextFetchEvent);
    await proxy(requestWithAccept("/admin/sign-in", "text/html"), {} as NextFetchEvent);

    expect(clerkMocks.delegated).not.toHaveBeenCalled();
    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });
});

describe("admin proxy with Clerk credentials", () => {
  it("delegates to Clerk and keeps auth.protect for an HTML navigation", async () => {
    const request = requestWithAccept("/admin/orders", "text/html");

    await proxy(request, {} as NextFetchEvent);

    expect(clerkMocks.delegated).toHaveBeenCalledTimes(1);
    expect(clerkMocks.protect).toHaveBeenCalledWith({
      unauthenticatedUrl: "http://localhost:3000/admin/sign-in",
    });
  });

  it("delegates API requests to Clerk without returning the 503 response", async () => {
    const result = await proxy(
      requestWithAccept("/api/admin/orders", "application/json"),
      {} as NextFetchEvent,
    );

    expect(clerkMocks.delegated).toHaveBeenCalledTimes(1);
    expect(clerkMocks.protect).toHaveBeenCalledTimes(1);
    expect(result).toBeUndefined();
  });

  it("leaves the Clerk sign-in sub-steps unprotected", async () => {
    for (const pathname of [
      "/admin/sign-in",
      "/admin/sign-in/",
      "/admin/sign-in/factor-one",
      "/admin/sign-in/sso-callback",
    ]) {
      await proxy(requestWithAccept(pathname, "text/html"), {} as NextFetchEvent);
    }

    expect(clerkMocks.delegated).toHaveBeenCalledTimes(4);
    expect(clerkMocks.protect).not.toHaveBeenCalled();
  });

  it("keeps look-alike sign-in paths protected", async () => {
    for (const pathname of ["/admin/sign-in-other", "/admin/sign-inx"]) {
      clerkMocks.protect.mockClear();

      await proxy(requestWithAccept(pathname, "text/html"), {} as NextFetchEvent);

      expect(clerkMocks.protect, pathname).toHaveBeenCalledWith({
        unauthenticatedUrl: "http://localhost:3000/admin/sign-in",
      });
    }
  });
});

describe("admin proxy unchanged contracts", () => {
  it("keeps the route matcher unchanged", () => {
    // Task 7.21: the Clerk entries stay first and unchanged; header-only entries follow.
    expect(config.matcher.slice(0, 2)).toEqual(["/admin/:path*", "/api/admin/:path*"]);
  });

  it("keeps createAdminAuthUnavailableResponse output identical", async () => {
    const response = createAdminAuthUnavailableResponse();

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(EXPECTED_JSON_BODY);
  });
});
