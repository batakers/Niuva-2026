import { describe, expect, it } from "vitest";
import { hasAdminPermission, requireAdminPermission } from "@/modules/admin/permissions";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";
import type { AdminAccess } from "@/lib/auth/admin";

const admin: AdminAccess = { authUserId: "test-admin", profile: { id: "test-profile", authUserId: "test-admin", role: "ADMIN", isActive: true } };

describe("redesigned Admin access and return context", () => {
  it("allows a bounded customer history return target without nested redirects", () => {
    const path = "/admin/customers/1143aeb6-e56c-451e-bd31-45a4276f8073";
    expect(normalizeAdminReturnTo(`${path}?tab=custom-print&page=2&returnTo=https://evil.test`, "/admin")).toBe(`${path}?tab=custom-print&page=2`);
    expect(normalizeAdminReturnTo("/admin/customers/not-a-uuid", "/admin")).toBe("/admin");
  });
  it("allows both operators to correct financial records but reserves project terms and rates for Owner", () => {
    for (const role of ["ADMIN", "OWNER"] as const) {
      expect(hasAdminPermission(role, "FINANCE_READ")).toBe(true);
      expect(hasAdminPermission(role, "FINANCE_WRITE")).toBe(true);
      expect(hasAdminPermission(role, "FINANCE_CORRECT")).toBe(true);
      expect(hasAdminPermission(role, "SITE_CONTENT_WRITE")).toBe(true);
    }
    expect(hasAdminPermission("ADMIN", "B2B_BILLING_TERMS_MANAGE")).toBe(false);
    expect(hasAdminPermission("ADMIN", "BILLING_SETTINGS_MANAGE")).toBe(false);
    expect(hasAdminPermission("ADMIN", "PRICING_RULE_ACTIVATE")).toBe(false);
    expect(() => requireAdminPermission({ ...admin, profile: { ...admin.profile, isActive: false } }, "FINANCE_CORRECT")).toThrow();
  });
  it("keeps Finance and attention-list context while removing untrusted query values", () => {
    expect(normalizeAdminReturnTo("/admin/finance/invoices?page=2&q=INV-2026&status=ISSUED&returnTo=https://evil.test", "/admin")).toBe("/admin/finance/invoices?page=2&q=INV-2026&status=ISSUED");
    expect(normalizeAdminReturnTo("/admin/orders?view=needs-action&page=3", "/admin")).toBe("/admin/orders?view=needs-action&page=3");
    expect(normalizeAdminReturnTo("/admin/reports?range=13m&tab=finance", "/admin")).toBe("/admin/reports?range=13m&tab=finance");
    expect(normalizeAdminReturnTo("https://evil.test/admin/orders", "/admin")).toBe("/admin");
    expect(normalizeAdminReturnTo("/admin/orders?view=anything", "/admin")).toBe("/admin/orders");
  });
});
