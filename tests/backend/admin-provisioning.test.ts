import { describe, expect, it } from "vitest";

import {
  assertDevelopmentDatabaseUrl,
  parseAdminProvisioningInput,
  requiresAdminProfileUpdate,
} from "@/modules/admin/provisioning";

const validEnvironment = {
  ADMIN_PROFILE_CLERK_USER_ID: "user_test_owner",
  ADMIN_PROFILE_CONFIRMATION: "I_UNDERSTAND_NON_PRODUCTION",
  ADMIN_PROFILE_DISPLAY_NAME: "Owner Smoke",
  ADMIN_PROFILE_ROLE: "OWNER",
};

describe("guarded AdminProfile provisioning", () => {
  it("requires an explicit identity, role, display name, and non-production confirmation", () => {
    expect(parseAdminProvisioningInput(validEnvironment)).toEqual({
      clerkUserId: "user_test_owner",
      confirmation: "I_UNDERSTAND_NON_PRODUCTION",
      displayName: "Owner Smoke",
      role: "OWNER",
    });
    expect(() => parseAdminProvisioningInput({ ...validEnvironment, ADMIN_PROFILE_ROLE: "" })).toThrow();
    expect(() => parseAdminProvisioningInput({ ...validEnvironment, ADMIN_PROFILE_CONFIRMATION: "YES" })).toThrow();
  });

  it("accepts only loopback development databases", () => {
    expect(assertDevelopmentDatabaseUrl("postgresql://localhost:5432/niuva_dev")).toContain("niuva_dev");
    expect(assertDevelopmentDatabaseUrl("postgresql://127.0.0.1:5432/niuva_development")).toContain("niuva_development");
    expect(() => assertDevelopmentDatabaseUrl("postgresql://db.example.test/niuva_dev")).toThrow();
    expect(() => assertDevelopmentDatabaseUrl("postgresql://localhost:5432/niuva")).toThrow();
    expect(() => assertDevelopmentDatabaseUrl("postgresql://localhost:5432/niuva_test")).toThrow();
  });

  it("requires an extra explicit flag before changing an existing profile", () => {
    const existing = { displayName: "Old", isActive: false, role: "ADMIN" as const };
    expect(requiresAdminProfileUpdate(existing, parseAdminProvisioningInput(validEnvironment))).toBe(true);
    expect(requiresAdminProfileUpdate({ displayName: "Owner Smoke", isActive: true, role: "OWNER" }, parseAdminProvisioningInput(validEnvironment))).toBe(false);
    expect(requiresAdminProfileUpdate(null, parseAdminProvisioningInput(validEnvironment))).toBe(false);
  });
});
