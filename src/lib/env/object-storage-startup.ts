import {
  createConsoleFailureLogger,
  type FailureLogger,
} from "../observability/logger";

// Startup guard for the R2 object-storage group (task 7.14). A half-filled R2
// configuration makes the capability resolver deny `objectStorage`, which would
// silently drop the R2 `connect-src` origin from the CSP. Instead the server
// refuses to start, and the reason (variable NAMES only, never values) is
// written to the failure log first.

export const R2_ENVIRONMENT_VARIABLES = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_PRIVATE_BUCKET",
  "R2_PUBLIC_BUCKET",
  "R2_ENDPOINT",
] as const;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function isPresent(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Names (not values) of R2 variables that are missing while the group is partly set. */
export function findMissingR2Variables(source: EnvironmentSource): string[] {
  const present = R2_ENVIRONMENT_VARIABLES.filter((name) => isPresent(source[name]));

  if (present.length === R2_ENVIRONMENT_VARIABLES.length) {
    return [];
  }

  // Upload limit set with no R2 at all is also a partial configuration.
  if (present.length === 0 && !isPresent(source.CUSTOM_FILE_MAX_BYTES)) {
    return [];
  }

  return R2_ENVIRONMENT_VARIABLES.filter((name) => !isPresent(source[name]));
}

export function buildPartialR2Message(missing: readonly string[]): string {
  return `Konfigurasi R2 tidak lengkap; aplikasi tidak dijalankan agar proteksi CSP tidak turun diam-diam. Variabel belum terisi: ${missing.join(", ")}.`;
}

/** Logs and throws when R2 is half-filled; a no-op for complete or fully absent config. */
export function assertObjectStorageStartup(
  source: EnvironmentSource = process.env,
  logger: FailureLogger = createConsoleFailureLogger(),
): void {
  const missing = findMissingR2Variables(source);

  if (missing.length === 0) {
    return;
  }

  logger.record({
    boundary: "startup:objectStorage",
    correlationId: "startup",
    errorCode: "PROVIDER_UNAVAILABLE",
    kind: "VALIDATION_REJECTED",
    occurredAt: new Date(),
    safeContext: { missingCount: String(missing.length) },
  });

  throw new Error(buildPartialR2Message(missing));
}
