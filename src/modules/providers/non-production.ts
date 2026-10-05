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
  Resend: "emailDelivery",
  "Resend Customer auth": "emailSender",
});

export function assertNonProductionProvider(input: Readonly<{
  isLiveProvider?: boolean;
  nodeEnv?: RuntimeEnvironment;
  provider: string;
}>): void {
  if (input.nodeEnv === "production" || input.isLiveProvider === true) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: `${input.provider} belum diaktifkan untuk production.`,
    });
  }
}
