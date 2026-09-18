import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import {
  assertPricingRuleDevelopmentEnvironment,
  PricingRuleAdminService,
} from "@/modules/pricing/admin-service";
import type { DomainAuditEvent } from "@/modules/shared/audit";

const owner: AdminAccess = {
  clerkUserId: "user_owner",
  profile: {
    clerkUserId: "user_owner",
    id: "a6258b47-9d35-4a76-95c4-f8266c62069a",
    isActive: true,
    role: "OWNER",
  },
};

const admin: AdminAccess = {
  ...owner,
  clerkUserId: "user_admin",
  profile: { ...owner.profile, clerkUserId: "user_admin", role: "ADMIN" },
};

const developmentEnvironment = {
  DATABASE_URL: "postgresql://localhost:5432/niuva_dev",
  NODE_ENV: "development",
};

describe("development pricing rule administration", () => {
  it("requires an explicit quantity semantic and records Owner approval", async () => {
    let activationInput: Record<string, unknown> | undefined;
    const events: DomainAuditEvent[] = [];
    const service = new PricingRuleAdminService({
      audit: (event) => {
        events.push(event);
      },
      authorizeAdmin: async () => owner,
      environmentSource: developmentEnvironment,
      repository: {
        async activate(input) {
          activationInput = input as unknown as Record<string, unknown>;
          return {
            code: "CUSTOM_PRINT_V1",
            id: "rule-1",
            idempotent: false,
            previousStatus: null,
            quantitySemantics: input.quantitySemantics,
            status: "ACTIVE",
            version: 1,
          };
        },
      },
    });

    await expect(
      service.activate({
        confirmation: "I_UNDERSTAND_NON_PRODUCTION",
        quantitySemantics: "AGGREGATE",
      }),
    ).resolves.toMatchObject({
      id: "rule-1",
      quantitySemantics: "AGGREGATE",
    });

    expect(activationInput).toMatchObject({
      approvedByAdminId: owner.profile.id,
      quantitySemantics: "AGGREGATE",
    });
    expect(activationInput?.definitionJson).toMatchObject({
      code: "CUSTOM_PRINT_V1",
      quantitySemantics: "AGGREGATE",
      version: 1,
    });
    expect(events.at(-1)).toMatchObject({
      action: "pricing-rule.activated",
      actorId: owner.profile.id,
      entityId: "rule-1",
      entityType: "PricingRuleVersion",
    });
  });

  it("denies routine Admin profiles before touching the repository", async () => {
    let called = false;
    const service = new PricingRuleAdminService({
      authorizeAdmin: async () => admin,
      environmentSource: developmentEnvironment,
      repository: {
        async activate() {
          called = true;
          return {
            code: "CUSTOM_PRINT_V1",
            id: "rule-1",
            idempotent: false,
            previousStatus: null,
            quantitySemantics: "PER_UNIT",
            status: "ACTIVE",
            version: 1,
          };
        },
      },
    });

    await expect(
      service.activate({
        confirmation: "I_UNDERSTAND_NON_PRODUCTION",
        quantitySemantics: "PER_UNIT",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(called).toBe(false);
  });

  it("blocks production and non-loopback databases", () => {
    expect(() =>
      assertPricingRuleDevelopmentEnvironment({
        DATABASE_URL: "postgresql://localhost:5432/niuva_dev",
        NODE_ENV: "production",
      }),
    ).toThrow("development lokal");
    expect(() =>
      assertPricingRuleDevelopmentEnvironment({
        DATABASE_URL: "postgresql://db.example.test/niuva_dev",
        NODE_ENV: "development",
      }),
    ).toThrow("development loopback");
  });
});
