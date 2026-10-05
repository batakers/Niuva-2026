import { describe, expect, it } from "vitest";

import { CAPABILITY_MATRIX } from "../../src/modules/capabilities/matrix";
import {
  CAPABILITY_NAMES,
  DEPLOYMENT_TIERS,
} from "../../src/modules/capabilities/types";

describe("Capability_Matrix", () => {
  it("is total over tier x capability", () => {
    expect(Object.keys(CAPABILITY_MATRIX).sort()).toEqual([...DEPLOYMENT_TIERS].sort());
    expect(CAPABILITY_NAMES).toHaveLength(15);

    for (const tier of DEPLOYMENT_TIERS) {
      expect(Object.keys(CAPABILITY_MATRIX[tier]).sort()).toEqual(
        [...CAPABILITY_NAMES].sort(),
      );
    }
  });

  it("is deeply frozen", () => {
    expect(Object.isFrozen(CAPABILITY_MATRIX)).toBe(true);

    for (const tier of DEPLOYMENT_TIERS) {
      expect(Object.isFrozen(CAPABILITY_MATRIX[tier])).toBe(true);

      for (const name of CAPABILITY_NAMES) {
        const rule = CAPABILITY_MATRIX[tier][name];

        expect(Object.isFrozen(rule)).toBe(true);
        expect(Object.isFrozen(rule.allowedModes)).toBe(true);
        expect(Object.isFrozen(rule.requiredConfig)).toBe(true);
        expect(Object.isFrozen(rule.requiredResources)).toBe(true);
        expect(Object.isFrozen(rule.requiredPolicyGates)).toBe(true);
      }
    }
  });

  it("rejects mutation of the table", () => {
    const mutable = CAPABILITY_MATRIX as unknown as Record<string, unknown>;

    expect(() => {
      mutable.production = {};
    }).toThrow(TypeError);
  });

  it("allows production in no mode for any capability", () => {
    for (const name of CAPABILITY_NAMES) {
      expect(CAPABILITY_MATRIX.production[name].allowedModes).toEqual([]);
    }
  });

  it("never lists live mode and always needs a grant outside local-test", () => {
    for (const tier of DEPLOYMENT_TIERS) {
      for (const name of CAPABILITY_NAMES) {
        const rule = CAPABILITY_MATRIX[tier][name];

        expect(rule.allowedModes).not.toContain("live");

        if (tier !== "local-test") {
          expect(rule.requiresActivationGrant).toBe(true);
        }
      }
    }
  });

  it("keeps signup behind an activation grant in every tier and the age gate where gates apply", () => {
    for (const tier of DEPLOYMENT_TIERS) {
      const rule = CAPABILITY_MATRIX[tier].signup;

      expect(rule.requiresActivationGrant).toBe(true);

      if (tier === "local-test") {
        expect(rule.requiredPolicyGates).toEqual([]);
      } else {
        expect(rule.requiredPolicyGates).toContain("PUB-AGE");
        expect(rule.requiredPolicyGates).toContain("PUB-POLICY");
      }
    }
  });

  it("allows the public content source capabilities in local-test only", () => {
    for (const name of ["publicPreviewScenario", "localContentReference"] as const) {
      expect(CAPABILITY_MATRIX["local-test"][name].allowedModes).toEqual(["mock", "sandbox"]);
      expect(CAPABILITY_MATRIX["local-test"][name].requiresActivationGrant).toBe(false);
      expect(CAPABILITY_MATRIX.staging[name].allowedModes).toEqual([]);
      expect(CAPABILITY_MATRIX.production[name].allowedModes).toEqual([]);
    }
  });

  it("applies policy/age gates only in staging and production (approved decision)", () => {
    for (const name of CAPABILITY_NAMES) {
      expect(CAPABILITY_MATRIX["local-test"][name].requiredPolicyGates).toEqual([]);
      expect(CAPABILITY_MATRIX.staging[name].requiredPolicyGates).toEqual(
        CAPABILITY_MATRIX.production[name].requiredPolicyGates,
      );
    }

    expect(CAPABILITY_MATRIX.staging.payment.requiredPolicyGates).toContain("PUB-POLICY");
    expect(CAPABILITY_MATRIX.staging.refund.requiredPolicyGates).toContain("PUB-POLICY");
    expect(CAPABILITY_MATRIX.staging.analytics.requiredPolicyGates).toContain("PUB-POLICY");
    expect(CAPABILITY_MATRIX.staging.privacyRights.requiredPolicyGates).toContain("PUB-POLICY");
  });
});
