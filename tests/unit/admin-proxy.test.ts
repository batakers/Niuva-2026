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

beforeEach(() => {
  clerkMocks.protect.mockClear();
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
