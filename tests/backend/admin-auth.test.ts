import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import {
  assertAdminAccessAvailable,
  requireAdminForSession,
} from "@/lib/auth/admin";
import {
  config,
  createAdminAuthUnavailableResponse,
  hasAdminAuthConfiguration,
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
    authUserId: "user_owner",
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
    async findByAuthUserId(authUserId: string) {
      calls.push(authUserId);
      return result;
    },
  };
}

describe("admin authorization", () => {
  it("rejects a password-only session before reading an AdminProfile", async () => {
    const calls: string[] = [];
    const passwordOnly = { userId: "user_owner", mfaVerified: false, twoFactorEnabled: true };

    await expect(requireAdminForSession(passwordOnly, reader(profile(), calls))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
    expect(calls).toEqual([]);
  });

  it("rejects an identity that has not enrolled an authenticator", async () => {
    const unenrolled = { userId: "user_owner", mfaVerified: true, twoFactorEnabled: false };
    await expect(requireAdminForSession(unenrolled, reader(profile()))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("requires database capability before an AdminProfile read", () => {
    expect(() =>
      assertAdminAccessAvailable({ adminAuth: true, database: false }),
    ).toThrowError(AppError);

    try {
      assertAdminAccessAvailable({ adminAuth: true, database: false });
    } catch (error) {
      expect(error).toMatchObject({
        code: "AUTH_UNAVAILABLE",
        status: 503,
      } satisfies Partial<AppError>);
    }

    expect(() =>
      assertAdminAccessAvailable({ adminAuth: true, database: true }),
    ).not.toThrow();
  });

  it("rejects anonymous and expired Clerk sessions", async () => {
    await expect(requireAdminForSession({ userId: null }, reader(profile()))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    } satisfies Partial<AppError>);
  });

  it("rejects a Clerk identity without an active Niuva profile", async () => {
    await expect(
      requireAdminForSession({ userId: "user_unprovisioned", mfaVerified: true, twoFactorEnabled: true }, reader(null)),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<AppError>);

    await expect(
      requireAdminForSession(
        { userId: "user_inactive", mfaVerified: true, twoFactorEnabled: true },
        reader(profile({ authUserId: "user_inactive", isActive: false })),
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    } satisfies Partial<AppError>);
  });

  it("uses the Clerk session identity for the profile lookup", async () => {
    const calls: string[] = [];
    const access = await requireAdminForSession(
      { userId: "user_admin", mfaVerified: true, twoFactorEnabled: true },
      reader(profile({ authUserId: "user_admin", role: "ADMIN" }), calls),
    );

    expect(calls).toEqual(["user_admin"]);
    expect(access.profile.role).toBe("ADMIN");
  });
});

describe("admin proxy", () => {
  it("matches only the admin route boundary", () => {
    // Task 7.21: Clerk entries stay first and unchanged; header-only entries follow.
    expect(config.matcher.slice(0, 2)).toEqual(["/admin/:path*", "/api/admin/:path*"]);
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
    expect(hasAdminAuthConfiguration({})).toBe(false);
    expect(
      hasAdminAuthConfiguration({
        BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-auth-only",
        BETTER_AUTH_URL: "http://localhost:3000",
        DATABASE_URL: "postgresql://localhost/niuva_test",
      }),
    ).toBe(true);
  });

  it("fails closed when Clerk is not configured", () => {
    const response = createAdminAuthUnavailableResponse();

    expect(response.status).toBe(503);
  });
});
