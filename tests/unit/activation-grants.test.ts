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
  it("records exactly the Owner's E6 staging grants and none elsewhere", () => {
    // Adding or removing a grant must update this expectation in the same reviewed change.
    expect(ACTIVATION_GRANTS["local-test"]).toEqual([]);
    expect(ACTIVATION_GRANTS.production).toEqual([]);
    expect(ACTIVATION_GRANTS.staging.map(grant => grant.capability)).toEqual(["payment", "shipping", "emailSender", "emailDelivery", "objectStorage", "scheduledJobs"]);
    for (const grant of ACTIVATION_GRANTS.staging) {
      expect(grant).toMatchObject({ instruction: "TASKS.md#keputusan-owner-untuk-staging-2026-10-28", grantedOn: "2026-10-28" });
      expect(hasActivationGrant("staging", grant.capability), grant.capability).toBe(true);
      expect(hasActivationGrant("production", grant.capability), grant.capability).toBe(false);
    }
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
  it("closes for the policy the Owner published effective 28 October 2026", () => {
    expect(PUBLIC_CUSTOMER_POLICY.publishedAt).toBe("2026-10-28T00:00:00+07:00");
    expect(PUBLIC_CUSTOMER_POLICY.effectiveAt).toBe("2026-10-28T00:00:00+07:00");
    expect(isPolicyPublished(PUBLIC_CUSTOMER_POLICY, Date.parse("2026-10-27T16:59:59Z"))).toBe(false);
    expect(isPolicyPublished(PUBLIC_CUSTOMER_POLICY, NOW)).toBe(true);
    expect(DEFAULT_POLICY_GATE_READER.getStatus("PUB-POLICY")).toEqual({ closed: true });
  });

  it("leaves capabilities outside the Owner's E6 decision ungranted in staging", () => {
    for (const capability of ["refund", "googleAuth", "signup", "passwordAuth", "analytics", "privacyRights", "privacyProof", "publicPreviewScenario", "localContentReference"]) {
      expect(hasActivationGrant("staging", capability), capability).toBe(false);
    }
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
