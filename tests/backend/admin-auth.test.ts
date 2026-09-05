import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { requireAdminForSession } from "@/lib/auth/clerk";
import {
  config,
  createAdminAuthUnavailableResponse,
  hasClerkAdminCredentials,
} from "@/proxy";
import type {
  AdminProfileAccessRecord,
  AdminProfileReader,
} from "@/modules/admin/repository";
import { AppError } from "@/modules/shared/errors";

function profile(
  overrides: Partial<AdminProfileAccessRecord> = {},
): AdminProfileAccessRecord {
  return {
    clerkUserId: "user_owner",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "OWNER",
    ...overrides,
  };
}

function reader(
  result: AdminProfileAccessRecord | null,
  calls: string[] = [],
): AdminProfileReader {
  return {
    async findByClerkUserId(clerkUserId: string) {
      calls.push(clerkUserId);
      return result;
    },
  };
}

describe("admin authorization", () => {
  it("rejects anonymous and expired Clerk sessions", async () => {
    await expect(requireAdminForSession({ userId: null }, reader(profile()))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    } satisfies Partial<AppError>);
  });

  it("rejects a Clerk identity without an active Niuva profile", async () => {
    await expect(
      requireAdminForSession({ userId: "user_unprovisioned" }, reader(null)),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<AppError>);

    await expect(
      requireAdminForSession(
        { userId: "user_inactive" },
        reader(profile({ clerkUserId: "user_inactive", isActive: false })),
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<AppError>);
  });

  it("uses the Clerk session identity for the profile lookup", async () => {
    const calls: string[] = [];
    const access = await requireAdminForSession(
      { userId: "user_admin" },
      reader(profile({ clerkUserId: "user_admin", role: "ADMIN" }), calls),
    );

    expect(calls).toEqual(["user_admin"]);
    expect(access.profile.role).toBe("ADMIN");
  });
});

describe("admin proxy", () => {
  it("matches only the admin route boundary", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/api/admin/:path*"]);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/admin",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/admin/orders",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/api/admin/orders",
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "/project-brief",
      }),
    ).toBe(false);
  });

  it("requires both Clerk credentials before enabling the proxy", () => {
    expect(hasClerkAdminCredentials({})).toBe(false);
    expect(
      hasClerkAdminCredentials({
        CLERK_SECRET_KEY: "secret",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "publishable",
      }),
    ).toBe(true);
  });

  it("fails closed when Clerk is not configured", () => {
    const response = createAdminAuthUnavailableResponse();

    expect(response.status).toBe(503);
  });
});
