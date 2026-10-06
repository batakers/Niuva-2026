import {
  DEPLOYMENT_TIERS,
  PROVIDER_MODES,
  type DeploymentTier,
  type ProviderMode,
} from "../../lib/env/deployment";

// Pure types and name lists. No resolver logic (task 7.4) and no consumers.
// Defining a capability here grants nothing.

export { DEPLOYMENT_TIERS, PROVIDER_MODES };
export type { DeploymentTier, ProviderMode };

export const CAPABILITY_NAMES = [
  "signup",
  "googleAuth",
  "passwordAuth",
  "emailSender",
  "emailDelivery",
  "privacyRights",
  "privacyProof",
  "objectStorage",
  "payment",
  "refund",
  "shipping",
  "analytics",
  "scheduledJobs",
  "publicPreviewScenario",
  "localContentReference",
] as const;
export type CapabilityName = (typeof CAPABILITY_NAMES)[number];

/** Why a capability is denied; one per failed condition of the conjunction. */
export const CAPABILITY_DENIAL_REASONS = [
  "TIER_NOT_ALLOWED",
  "CONFIG_INCOMPLETE",
  "RESOURCE_NOT_BOUND",
  "POLICY_NOT_PUBLISHED",
  "AGE_GATE_NOT_CLOSED",
  "ACTIVATION_NOT_GRANTED",
] as const;
export type CapabilityDenialReason = (typeof CAPABILITY_DENIAL_REASONS)[number];

/** Env capability groups (mirrors ServerCapabilities keys in lib/env/server). */
export type ConfigGroup =
  | "biteship"
  | "adminAuth"
  | "customerGoogle"
  | "midtrans"
  | "objectStorage"
  | "resend";

/** Infrastructure that must be bound before use. */
export type ResourceBinding = "database" | "privateObjectStorage";

/** Policy/age gates that must be closed before use. */
export type PolicyGate = "PUB-POLICY" | "PUB-AGE" | "PUB-GUARDIAN";

export type CapabilityRule = Readonly<{
  /** Provider modes this tier may ever run; empty means never allowed. */
  allowedModes: readonly ProviderMode[];
  requiredConfig: readonly ConfigGroup[];
  requiredResources: readonly ResourceBinding[];
  requiredPolicyGates: readonly PolicyGate[];
  requiresActivationGrant: boolean;
}>;

export type CapabilityMatrix = Readonly<
  Record<DeploymentTier, Readonly<Record<CapabilityName, CapabilityRule>>>
>;

export type CapabilityDecision =
  | Readonly<{ allowed: true; mode: ProviderMode; tier: DeploymentTier }>
  | Readonly<{
      allowed: false;
      reason: CapabilityDenialReason;
      operatorMessage: string;
    }>;
