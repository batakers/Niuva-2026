import { describe, expect, it } from "vitest";
import { privacyOwnerSchema, privacyRequestSchema, privacyDeadline } from "@/modules/customer-privacy/core";
import { hasAdminPermission } from "@/modules/admin/permissions";
describe("privacy contracts", () => {
  it("uses 72 calendar hours across weekends", () => { const now = new Date("2026-10-02T10:00:00Z"); expect(privacyDeadline(now).toISOString()).toBe("2026-10-05T10:00:00.000Z"); });
  it("limits operations to Owner", () => { expect(hasAdminPermission("OWNER", "PRIVACY_REQUEST_MANAGE")).toBe(true); expect(hasAdminPermission("ADMIN", "PRIVACY_REQUEST_MANAGE")).toBe(false); });
  it("requires concrete correction, resolution and documented holds", () => {
    expect(privacyRequestSchema.safeParse({ submissionKey: crypto.randomUUID(), kind: "CORRECTION", details: "My profile is wrong" }).success).toBe(false);
    expect(privacyOwnerSchema.safeParse({ id: crypto.randomUUID(), status: "RESOLVED", response: "A long response", outcome: "FULFILLED" }).success).toBe(false);
    expect(privacyOwnerSchema.safeParse({ id: crypto.randomUUID(), status: "IN_REVIEW", response: "A long response", holdCategory: "DISPUTE" }).success).toBe(false);
  });
});
