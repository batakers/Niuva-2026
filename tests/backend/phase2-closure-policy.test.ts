import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import {
  ADMIN_PERMISSION_MATRIX,
  hasAdminPermission,
  requireAdminPermission,
} from "@/modules/admin/permissions";
import {
  customPaymentExpiresAt,
  getCancellationDecision,
  NIUVA_MVP_COMMERCIAL_POLICY,
  quoteExpiresAt,
  retailPaymentExpiresAt,
  retailReservationExpiresAt,
} from "@/modules/policy/commercial";
import {
  CUSTOM_FILE_MAX_BYTES,
  fileDeletionEligibleAt,
} from "@/modules/policy/privacy";

const now = new Date("2026-09-05T00:00:00.000Z");

function access(role: "ADMIN" | "OWNER"): AdminAccess {
  return {
    clerkUserId: `user_${role.toLowerCase()}`,
    profile: {
      clerkUserId: `user_${role.toLowerCase()}`,
      id: role === "OWNER"
        ? "a6f443d8-3e8a-49b5-81d0-94d56e06c208"
        : "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      isActive: true,
      role,
    },
  };
}

describe("Phase 2 closure commercial policy", () => {
  it("aligns retail reservation and payment expiry at 30 minutes", () => {
    expect(retailReservationExpiresAt(now).toISOString()).toBe(
      "2026-09-05T00:30:00.000Z",
    );
    expect(retailPaymentExpiresAt(now)).toEqual(retailReservationExpiresAt(now));
    expect(NIUVA_MVP_COMMERCIAL_POLICY.lateSettlementResolution).toBe(
      "KEEP_CANCELLED_AND_REQUIRE_FULL_REFUND",
    );
  });

  it("uses 24-hour custom payments and a 7-day quote window", () => {
    expect(customPaymentExpiresAt(now).toISOString()).toBe(
      "2026-09-06T00:00:00.000Z",
    );
    expect(quoteExpiresAt(now).toISOString()).toBe(
      "2026-09-12T00:00:00.000Z",
    );
  });

  it("allows unpaid cancellation but requires Owner and a full refund when paid", () => {
    expect(
      getCancellationDecision({
        actor: "ADMIN",
        orderStatus: "PENDING_PAYMENT",
        orderType: "RETAIL",
      }),
    ).toEqual({ allowed: true, requiresFullRefund: false });
    expect(
      getCancellationDecision({
        actor: "ADMIN",
        orderStatus: "PAID",
        orderType: "RETAIL",
      }),
    ).toEqual({ allowed: false, requiresFullRefund: false });
    expect(
      getCancellationDecision({
        actor: "OWNER",
        orderStatus: "PAID",
        orderType: "CUSTOM_PRINT",
      }),
    ).toEqual({ allowed: true, requiresFullRefund: true });
    expect(NIUVA_MVP_COMMERCIAL_POLICY.partialRefundsEnabled).toBe(false);
  });
});

describe("Phase 2 closure file policy", () => {
  it("sets a 100 MiB per-file limit and deterministic 14/60/90-day retention", () => {
    expect(CUSTOM_FILE_MAX_BYTES).toBe(104_857_600);
    expect(
      fileDeletionEligibleAt(now, "ABANDONED_OR_REJECTED_UPLOAD").toISOString(),
    ).toBe("2026-09-19T00:00:00.000Z");
    expect(
      fileDeletionEligibleAt(now, "CANCELLED_OR_UNPAID_REQUEST").toISOString(),
    ).toBe("2026-11-04T00:00:00.000Z");
    expect(
      fileDeletionEligibleAt(now, "COMPLETED_CUSTOM_ORDER").toISOString(),
    ).toBe("2026-12-04T00:00:00.000Z");
  });
});

describe("Phase 2 closure admin permission matrix", () => {
  it("grants routine operations to Admin but reserves finance and policy for Owner", () => {
    expect(hasAdminPermission("ADMIN", "ORDER_FULFILL")).toBe(true);
    expect(hasAdminPermission("ADMIN", "PAYMENT_REFUND_FULL")).toBe(false);
    expect(hasAdminPermission("OWNER", "PAYMENT_REFUND_FULL")).toBe(true);
    expect(ADMIN_PERMISSION_MATRIX.OWNER.length).toBeGreaterThan(
      ADMIN_PERMISSION_MATRIX.ADMIN.length,
    );
    expect(() =>
      requireAdminPermission(access("ADMIN"), "ADMIN_PROFILE_MANAGE"),
    ).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(() =>
      requireAdminPermission(access("OWNER"), "ADMIN_PROFILE_MANAGE"),
    ).not.toThrow();
  });
});
