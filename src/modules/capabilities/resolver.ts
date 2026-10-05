import {
  getServerCapabilities,
  resolveDeployment,
  type ResolvedDeployment,
  type ServerCapabilities,
} from "../../lib/env/server";
import { hasActivationGrant as defaultHasActivationGrant } from "../../lib/env/deployment";
import { appError } from "../shared/errors";
import { getAgeGateStatus } from "../customer-auth/age-declaration";

import { CAPABILITY_MATRIX } from "./matrix";
import {
  type CapabilityDecision,
  type CapabilityDenialReason,
  type CapabilityName,
  type CapabilityRule,
  type DeploymentTier,
  type PolicyGate,
  type ProviderMode,
} from "./types";

// Capability resolver (task 7.4). No consumers yet: nothing in the app calls
// this, so runtime behaviour is unchanged. It is a pure function of its
// injected inputs (env source, policy gates, activation lookup); it reads no
// clock, database, or global state beyond the default `process.env` source.
//
// Decision = conjunction, evaluated in this fixed precedence; the first failing
// condition is the reported reason:
//   1. TIER_NOT_ALLOWED       tier/mode not permitted by the matrix (or
//                             capability unknown to the matrix)
//   2. RESOURCE_NOT_BOUND     a required resource binding is missing
//   3. CONFIG_INCOMPLETE      env invalid/incomplete or a config group missing
//   4. POLICY_NOT_PUBLISHED   PUB-POLICY gate not closed
//   5. AGE_GATE_NOT_CLOSED    PUB-AGE / PUB-GUARDIAN gate not closed
//   6. ACTIVATION_NOT_GRANTED no recorded activation grant for the tier
// Unreadable deployment env (parse failure) is reported as CONFIG_INCOMPLETE
// before any other step, since tier/mode cannot be determined.

export type PolicyGateStatus = Readonly<{ closed: boolean }>;

/** Reads whether an open Owner decision gate has been closed. */
export type PolicyGateReader = Readonly<{
  getStatus: (gate: PolicyGate) => PolicyGateStatus;
}>;

/** Only the implemented self-declaration closes PUB-AGE; policy remains fail-closed. */
export const DEFAULT_POLICY_GATE_READER: PolicyGateReader = Object.freeze({
  getStatus: (gate: PolicyGate): PolicyGateStatus => ({ closed: gate === "PUB-AGE" && getAgeGateStatus().closed }),
});

export type CapabilityContext = Readonly<{
  /** Env source; defaults to `process.env`. */
  env?: Readonly<Record<string, string | undefined>>;
  /** Policy/age gate reader; defaults to the implemented age control only. */
  gates?: PolicyGateReader;
  /** Activation grant lookup; defaults to the (empty) recorded grants. */
  hasActivationGrant?: (tier: DeploymentTier, capability: string) => boolean;
}>;

type Allowed = Extract<CapabilityDecision, { allowed: true }>;

const GATE_REASON: Readonly<Record<PolicyGate, CapabilityDenialReason>> = {
  "PUB-POLICY": "POLICY_NOT_PUBLISHED",
  "PUB-AGE": "AGE_GATE_NOT_CLOSED",
  "PUB-GUARDIAN": "AGE_GATE_NOT_CLOSED",
};

function deny(
  capability: string,
  reason: CapabilityDenialReason,
  detail: string,
): CapabilityDecision {
  // Message names the capability and reason only; never env values or secrets.
  return {
    allowed: false,
    operatorMessage: `Capability "${capability}" ditolak (${reason}): ${detail}`,
    reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safely<T>(run: () => T): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: run() };
  } catch {
    return { ok: false };
  }
}

function isKnownCapability(capability: unknown): capability is CapabilityName {
  return (
    typeof capability === "string" &&
    Object.prototype.hasOwnProperty.call(CAPABILITY_MATRIX["production"], capability)
  );
}

function resourceBound(
  resource: CapabilityRule["requiredResources"][number],
  capabilities: ServerCapabilities,
): boolean {
  return resource === "database"
    ? capabilities.database === true
    : capabilities.objectStorage === true;
}

/** Total and non-throwing: any failure or malformed input yields a denial. */
export function decide(
  capability: CapabilityName,
  context?: CapabilityContext,
): CapabilityDecision {
  const name: unknown = capability;
  const label = typeof name === "string" ? name.slice(0, 64) : "(invalid)";

  if (context !== undefined && !isRecord(context)) {
    return deny(label, "CONFIG_INCOMPLETE", "konteks keputusan tidak valid.");
  }

  const source = context?.env ?? process.env;
  const deployment = safely<ResolvedDeployment>(() => resolveDeployment(source));

  if (!deployment.ok) {
    return deny(
      label,
      "CONFIG_INCOMPLETE",
      "konfigurasi deployment tidak dapat dibaca atau tidak valid.",
    );
  }

  const { providerMode, tier } = deployment.value;

  if (!isKnownCapability(name)) {
    return deny(label, "TIER_NOT_ALLOWED", "capability tidak terdaftar pada matriks.");
  }

  const rule = CAPABILITY_MATRIX[tier]?.[name];

  if (rule === undefined || !rule.allowedModes.includes(providerMode)) {
    return deny(
      name,
      "TIER_NOT_ALLOWED",
      `tier "${tier}" dengan mode "${providerMode}" tidak diizinkan oleh matriks; mode live memerlukan izin aktivasi tercatat.`,
    );
  }

  const config = safely<ServerCapabilities>(() => getServerCapabilities(source));

  if (!config.ok) {
    return deny(
      name,
      "CONFIG_INCOMPLETE",
      "konfigurasi environment tidak lengkap atau tidak valid.",
    );
  }

  const unbound = rule.requiredResources.find(
    (resource) => !resourceBound(resource, config.value),
  );

  if (unbound !== undefined) {
    return deny(name, "RESOURCE_NOT_BOUND", `resource "${unbound}" belum terpasang.`);
  }

  const missingConfig = rule.requiredConfig.find(
    (group) => config.value[group] !== true,
  );

  if (missingConfig !== undefined) {
    return deny(
      name,
      "CONFIG_INCOMPLETE",
      `grup konfigurasi "${missingConfig}" belum lengkap.`,
    );
  }

  const gates = context?.gates ?? DEFAULT_POLICY_GATE_READER;

  for (const reason of ["POLICY_NOT_PUBLISHED", "AGE_GATE_NOT_CLOSED"] as const) {
    for (const gate of rule.requiredPolicyGates) {
      if (GATE_REASON[gate] !== reason) {
        continue;
      }

      const status = safely(() => gates.getStatus(gate));

      if (!status.ok || !isRecord(status.value) || status.value.closed !== true) {
        return deny(name, reason, `gate "${gate}" belum tertutup.`);
      }
    }
  }

  if (rule.requiresActivationGrant) {
    const lookup = context?.hasActivationGrant ?? defaultHasActivationGrant;
    const granted = safely(() => lookup(tier, name));

    if (!granted.ok || granted.value !== true) {
      return deny(
        name,
        "ACTIVATION_NOT_GRANTED",
        `izin aktivasi untuk tier "${tier}" belum tercatat.`,
      );
    }
  }

  const allowed: Allowed = { allowed: true, mode: providerMode as ProviderMode, tier };

  return allowed;
}

/** Throws PROVIDER_UNAVAILABLE (operator message, no secrets) when denied. */
export function requireAllowed(
  capability: CapabilityName,
  context?: CapabilityContext,
): Allowed {
  const decision = decide(capability, context);

  if (!decision.allowed) {
    throw appError("PROVIDER_UNAVAILABLE", { message: decision.operatorMessage });
  }

  return decision;
}
