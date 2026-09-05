import { appError } from "@/modules/shared/errors";

type RuntimeEnvironment = "development" | "production" | "test" | undefined;

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
