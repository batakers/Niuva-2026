import {
  CAPABILITY_NAMES,
  DEPLOYMENT_TIERS,
  type CapabilityMatrix,
  type CapabilityName,
  type CapabilityRule,
  type DeploymentTier,
} from "./types";

// The matrix is data. It states the requirements each (tier, capability) pair
// must meet; the resolver (task 7.4) evaluates the conjunction. Fail-closed:
// - production allows no mode anywhere (denied today by NODE_ENV=production);
// - `live` is in no tier's allowedModes, and activation grants are empty, so
//   provider activation stays denied until a separate instruction;
// - policy/age gates (PUB-POLICY, PUB-AGE, PUB-GUARDIAN) are effective ONLY in
//   the `staging` and `production` tiers (user-approved decision). `local-test`
//   rows have empty requiredPolicyGates so local/test flows keep working as
//   before; they are still bound by config/resource requirements. The SPECS
//   below name the gates a capability needs once it leaves local-test;
// - signup stays denied in every tier, including local-test, through the
//   activation grant (forced true below; recorded grants are empty), not
//   through a policy gate;
// - open Owner decisions are not resolved here: the rules only name gates.

const GATED_TIERS: readonly DeploymentTier[] = ["staging", "production"];

type Spec = Omit<CapabilityRule, "allowedModes" | "requiresActivationGrant">;

const SPECS: Readonly<Record<CapabilityName, Spec>> = {
  signup: {
    requiredConfig: [],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY", "PUB-AGE"],
  },
  googleAuth: {
    requiredConfig: ["customerGoogle"],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  passwordAuth: {
    requiredConfig: [],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  emailSender: {
    requiredConfig: ["resend"],
    requiredResources: [],
    requiredPolicyGates: [],
  },
  emailDelivery: {
    requiredConfig: ["resend"],
    requiredResources: ["database"],
    requiredPolicyGates: [],
  },
  privacyRights: {
    requiredConfig: [],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  privacyProof: {
    requiredConfig: ["resend"],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  objectStorage: {
    requiredConfig: ["objectStorage"],
    requiredResources: ["privateObjectStorage"],
    requiredPolicyGates: [],
  },
  payment: {
    requiredConfig: ["midtrans"],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  refund: {
    requiredConfig: ["midtrans"],
    requiredResources: ["database"],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  shipping: {
    requiredConfig: ["biteship"],
    requiredResources: ["database"],
    requiredPolicyGates: [],
  },
  analytics: {
    requiredConfig: [],
    requiredResources: [],
    requiredPolicyGates: ["PUB-POLICY"],
  },
  scheduledJobs: {
    requiredConfig: [],
    requiredResources: ["database"],
    requiredPolicyGates: [],
  },
  // Public content sources that are not the database path. They need no
  // provider, config, or database and exist only for local visual checks.
  publicPreviewScenario: {
    requiredConfig: [],
    requiredResources: [],
    requiredPolicyGates: [],
  },
  localContentReference: {
    requiredConfig: [],
    requiredResources: [],
    requiredPolicyGates: [],
  },
};

/** Capabilities allowed in the local-test tier only (no mode in staging/production). */
const LOCAL_TEST_ONLY: ReadonlySet<CapabilityName> = new Set<CapabilityName>([
  "publicPreviewScenario",
  "localContentReference",
]);

const TIER_POLICY: Readonly<
  Record<
    DeploymentTier,
    Pick<CapabilityRule, "allowedModes" | "requiresActivationGrant">
  >
> = {
  "local-test": { allowedModes: ["mock", "sandbox"], requiresActivationGrant: false },
  staging: { allowedModes: ["mock", "sandbox"], requiresActivationGrant: true },
  production: { allowedModes: [], requiresActivationGrant: true },
};

function freezeRule(name: CapabilityName, tier: DeploymentTier): CapabilityRule {
  const spec = SPECS[name];
  const policy = TIER_POLICY[tier];
  // Signup is never activation-free: it is gated by the (open) age decision.
  const requiresActivationGrant =
    name === "signup" ? true : policy.requiresActivationGrant;

  const allowedModes =
    LOCAL_TEST_ONLY.has(name) && tier !== "local-test" ? [] : policy.allowedModes;

  return Object.freeze({
    allowedModes: Object.freeze([...allowedModes]),
    requiredConfig: Object.freeze([...spec.requiredConfig]),
    requiredResources: Object.freeze([...spec.requiredResources]),
    requiredPolicyGates: Object.freeze(
      GATED_TIERS.includes(tier) ? [...spec.requiredPolicyGates] : [],
    ),
    requiresActivationGrant,
  });
}

function buildTier(tier: DeploymentTier): Readonly<Record<CapabilityName, CapabilityRule>> {
  return Object.freeze(
    Object.fromEntries(
      CAPABILITY_NAMES.map((name) => [name, freezeRule(name, tier)]),
    ) as Record<CapabilityName, CapabilityRule>,
  );
}

export const CAPABILITY_MATRIX: CapabilityMatrix = Object.freeze(
  Object.fromEntries(
    DEPLOYMENT_TIERS.map((tier) => [tier, buildTier(tier)]),
  ) as Record<DeploymentTier, Readonly<Record<CapabilityName, CapabilityRule>>>,
);
