import type { DeploymentTier } from "@/lib/env/deployment";
import type { CapabilityName } from "@/modules/capabilities/types";
import { appError } from "@/modules/shared/errors";

type RuntimeEnvironment = "development" | "production" | "test" | undefined;

/**
 * Explicit provider label -> capability table (task 7.6). Used by tasks 7.7-7.10
 * when each caller switches to `requireAllowed`. It is deliberately NOT yet
 * consulted by `assertNonProductionProvider`: calling the resolver from the
 * guard denies flows that are allowed today (see the task 7.6 report).
 */
export const PROVIDER_CAPABILITY: Readonly<Record<string, CapabilityName>> = Object.freeze({
  Biteship: "shipping",
  Midtrans: "payment",
  R2: "objectStorage",
  "S3 object storage": "objectStorage",
  Resend: "emailDelivery",
  "Resend Customer auth": "emailSender",
});

/**
 * Legacy guard, run before the capability resolver. A hosted build always runs
 * with NODE_ENV=production, so that runtime is refused unless the caller's env
 * states the `staging` tier explicitly; the resolver then still requires the
 * grant, sandbox/mock mode, config and policy. Production and an unset or
 * unknown tier stay refused, and a live provider is refused everywhere.
 */
export function assertNonProductionProvider(input: Readonly<{
  deploymentTier?: DeploymentTier;
  isLiveProvider?: boolean;
  nodeEnv?: RuntimeEnvironment;
  provider: string;
}>): void {
  const productionRuntime = input.nodeEnv === "production" && input.deploymentTier !== "staging";

  if (productionRuntime || input.isLiveProvider === true) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: `${input.provider} belum diaktifkan untuk production.`,
    });
  }
}
