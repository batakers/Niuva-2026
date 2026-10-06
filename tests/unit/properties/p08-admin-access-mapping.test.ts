// Feature: system-pages-and-error-states, Property 8
// Property 8: Error-to-state mapping is total over ERROR_CODES.
// Validates: Requirements 7.6
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_ACCESS_STATES,
  loadAdminPageAccess,
  toAdminAccessState,
  type AdminAccessState,
} from "@/app/admin/admin-page-access";
import { ERROR_CODES, appError, type ErrorCode } from "@/modules/shared/errors";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireAdminPermission: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/modules/admin/permissions", () => ({
  requireAdminPermission: mocks.requireAdminPermission,
}));

const EXPECTED_STATE: Readonly<Partial<Record<ErrorCode, AdminAccessState>>> = {
  UNAUTHORIZED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  AUTH_UNAVAILABLE: "AUTH_UNAVAILABLE",
};

const MAPPED_CODES = Object.keys(EXPECTED_STATE) as ErrorCode[];
const UNMAPPED_CODES = ERROR_CODES.filter((code) => EXPECTED_STATE[code] === undefined);

const grantedAccess = {
  authUserId: "user_test",
  profile: { isActive: true, role: "OWNER" },
};

// Values that are not AppError instances, including look-alikes that must not be duck-typed.
const NON_APP_ERROR_VALUES: ReadonlyArray<readonly [string, unknown]> = [
  ["plain Error", new Error("boom")],
  ["TypeError", new TypeError("bad")],
  ["string", "UNAUTHORIZED"],
  ["number", 401],
  ["null", null],
  ["undefined", undefined],
  ["empty object", {}],
  ["object with mapped code", { code: "UNAUTHORIZED" }],
  ["Error with mapped code", Object.assign(new Error("x"), { code: "FORBIDDEN" })],
  ["named AppError look-alike", Object.assign(new Error("x"), { name: "AppError", code: "AUTH_UNAVAILABLE" })],
];

beforeEach(() => {
  mocks.requireAdmin.mockReset();
  mocks.requireAdminPermission.mockReset();
});

describe("Property 8: toAdminAccessState is total over ERROR_CODES", () => {
  it("leaves RESOURCE_BUSY unmapped so the caller rethrows it", () => {
    expect(ERROR_CODES).toContain("RESOURCE_BUSY");
    expect(toAdminAccessState(appError("RESOURCE_BUSY"))).toBeNull();
  });

  it("covers every ERROR_CODES entry exactly once as mapped or unmapped", () => {
    expect(MAPPED_CODES).toHaveLength(3);
    expect(MAPPED_CODES.length + UNMAPPED_CODES.length).toBe(ERROR_CODES.length);
    expect(ADMIN_ACCESS_STATES).toEqual(["UNAUTHENTICATED", "FORBIDDEN", "AUTH_UNAVAILABLE"]);
  });

  it.each(ERROR_CODES)("maps AppError %s to its exact state or null", (code) => {
    expect(toAdminAccessState(appError(code))).toBe(EXPECTED_STATE[code] ?? null);
  });

  it.each(NON_APP_ERROR_VALUES)("returns null for non-AppError value: %s", (_label, value) => {
    expect(toAdminAccessState(value)).toBeNull();
  });
});

describe("Property 8: loadAdminPageAccess returns the exact mapped state", () => {
  describe.each(ERROR_CODES)("requireAdmin throws AppError %s", (code) => {
    const expected = EXPECTED_STATE[code];

    if (expected !== undefined) {
      it(`returns denied/${expected}`, async () => {
        mocks.requireAdmin.mockRejectedValue(appError(code));
        await expect(loadAdminPageAccess()).resolves.toEqual({ kind: "denied", state: expected });
        expect(mocks.requireAdminPermission).not.toHaveBeenCalled();
      });
    } else {
      it("rethrows the same error instance", async () => {
        const error = appError(code);
        mocks.requireAdmin.mockRejectedValue(error);
        await expect(loadAdminPageAccess()).rejects.toBe(error);
      });
    }
  });

  describe.each(ERROR_CODES)("requireAdminPermission throws AppError %s", (code) => {
    const expected = EXPECTED_STATE[code];

    if (expected !== undefined) {
      it(`returns denied/${expected}`, async () => {
        mocks.requireAdmin.mockResolvedValue(grantedAccess);
        mocks.requireAdminPermission.mockImplementation(() => {
          throw appError(code);
        });
        await expect(
          loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" }),
        ).resolves.toEqual({ kind: "denied", state: expected });
      });
    } else {
      it("rethrows the same error instance", async () => {
        const error = appError(code);
        mocks.requireAdmin.mockResolvedValue(grantedAccess);
        mocks.requireAdminPermission.mockImplementation(() => {
          throw error;
        });
        await expect(
          loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" }),
        ).rejects.toBe(error);
      });
    }
  });

  it.each(NON_APP_ERROR_VALUES)("rethrows non-AppError value from requireAdmin: %s", async (_label, value) => {
    mocks.requireAdmin.mockRejectedValue(value);
    await expect(loadAdminPageAccess()).rejects.toBe(value);
  });

  it.each(NON_APP_ERROR_VALUES)("rethrows non-AppError value from requireAdminPermission: %s", async (_label, value) => {
    mocks.requireAdmin.mockResolvedValue(grantedAccess);
    mocks.requireAdminPermission.mockImplementation(() => {
      throw value;
    });
    await expect(
      loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" }),
    ).rejects.toBe(value);
  });

  it("returns granted with the access object when no error occurs", async () => {
    mocks.requireAdmin.mockResolvedValue(grantedAccess);
    await expect(loadAdminPageAccess()).resolves.toEqual({ kind: "granted", access: grantedAccess });
    expect(mocks.requireAdminPermission).not.toHaveBeenCalled();
  });

  it("checks the requested permission only when one is given", async () => {
    mocks.requireAdmin.mockResolvedValue(grantedAccess);
    mocks.requireAdminPermission.mockReturnValue(grantedAccess);
    await expect(
      loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" }),
    ).resolves.toEqual({ kind: "granted", access: grantedAccess });
    expect(mocks.requireAdminPermission).toHaveBeenCalledWith(grantedAccess, "PRIVACY_REQUEST_MANAGE");
  });
});
