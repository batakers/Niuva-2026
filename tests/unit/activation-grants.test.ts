import { describe, expect, it } from "vitest";

import { ACTIVATION_GRANTS, DEPLOYMENT_TIERS, hasActivationGrant, type ActivationGrant, type DeploymentTier } from "@/lib/env/deployment";
import { CAPABILITY_NAMES } from "@/modules/capabilities/types";
import { DEFAULT_POLICY_GATE_READER } from "@/modules/capabilities/resolver";
import { isPolicyPublished, PUBLIC_CUSTOMER_POLICY } from "@/modules/customer-auth/public-policy";

const NOW = Date.parse("2026-11-01T00:00:00Z");
const recorded: ActivationGrant = { capability: "payment", instruction: "TASKS.md#owner-instruction", grantedOn: "2026-10-30" };
const grants = (tier: DeploymentTier, entries: readonly ActivationGrant[]) =>
  ({ "local-test": [], staging: [], production: [], [tier]: entries }) as Record<DeploymentTier, readonly ActivationGrant[]>;

describe("recorded activation grants", () => {
  it("records no grant in any tier until an explicit Owner instruction is added in review", () => {
    // Adding a grant must update this expectation in the same reviewed change.
    for (const tier of DEPLOYMENT_TIERS) expect(ACTIVATION_GRANTS[tier], tier).toEqual([]);
  });

  it("names only known capabilities", () => {
    const known: readonly string[] = CAPABILITY_NAMES;
    for (const tier of DEPLOYMENT_TIERS) {
      for (const grant of ACTIVATION_GRANTS[tier]) expect(known, `${tier}:${grant.capability}`).toContain(grant.capability);
    }
  });

  it("grants a staging capability only for an entry with an instruction reference and a valid date", () => {
    expect(hasActivationGrant("staging", "payment", grants("staging", [recorded]))).toBe(true);
    expect(hasActivationGrant("staging", "refund", grants("staging", [recorded]))).toBe(false);
    expect(hasActivationGrant("staging", "payment", grants("staging", [{ ...recorded, instruction: "  " }]))).toBe(false);
    for (const grantedOn of ["", "2026-13-40", "30-10-2026", "2026-10-30T00:00:00Z"]) {
      expect(hasActivationGrant("staging", "payment", grants("staging", [{ ...recorded, grantedOn }])), grantedOn).toBe(false);
    }
  });

  it("never grants production, even when an entry is present", () => {
    expect(hasActivationGrant("production", "payment", grants("production", [recorded]))).toBe(false);
  });

  it("keeps tiers separate", () => {
    expect(hasActivationGrant("local-test", "payment", grants("staging", [recorded]))).toBe(false);
    expect(hasActivationGrant("staging", "payment", grants("local-test", [recorded]))).toBe(false);
  });
});

describe("PUB-POLICY publication", () => {
  it("stays open for the current Owner-approved but unpublished policy", () => {
    expect(PUBLIC_CUSTOMER_POLICY.publishedAt).toBeNull();
    expect(PUBLIC_CUSTOMER_POLICY.effectiveAt).toBeNull();
    expect(isPolicyPublished(PUBLIC_CUSTOMER_POLICY, NOW)).toBe(false);
    expect(DEFAULT_POLICY_GATE_READER.getStatus("PUB-POLICY")).toEqual({ closed: false });
  });

  it("closes only when both times are recorded, ordered and already effective", () => {
    const published = "2026-10-30T00:00:00Z";
    expect(isPolicyPublished({ publishedAt: published, effectiveAt: "2026-10-31T00:00:00Z" }, NOW)).toBe(true);
    expect(isPolicyPublished({ publishedAt: published, effectiveAt: null }, NOW)).toBe(false);
    expect(isPolicyPublished({ publishedAt: null, effectiveAt: published }, NOW)).toBe(false);
    expect(isPolicyPublished({ publishedAt: published, effectiveAt: "2026-11-02T00:00:00Z" }, NOW)).toBe(false);
    expect(isPolicyPublished({ publishedAt: "2026-10-31T00:00:00Z", effectiveAt: published }, NOW)).toBe(false);
    expect(isPolicyPublished({ publishedAt: "not-a-date", effectiveAt: published }, NOW)).toBe(false);
  });
});
