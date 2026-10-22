import {
  createConsoleFailureLogger,
  type FailureLogger,
} from "../observability/logger";
import { getObjectStorageConfiguration, ObjectStorageConfigurationError, R2_ENVIRONMENT_VARIABLES, S3_ENVIRONMENT_VARIABLES } from "./object-storage";
export { R2_ENVIRONMENT_VARIABLES } from "./object-storage";
import { EnvironmentValidationError, parseServerEnvironment } from "./server";

// Partial or ambiguous storage configuration must stop startup before CSP can
// silently omit the browser upload origin. Diagnostics contain names only.

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

/** Logs and throws for invalid S3 or legacy R2 configuration. */
export function assertObjectStorageStartup(
  source: EnvironmentSource = process.env,
  logger: FailureLogger = createConsoleFailureLogger(),
): void {
  let fields: readonly string[];
  try {
    const storageSource = Object.fromEntries(
      [...S3_ENVIRONMENT_VARIABLES, ...R2_ENVIRONMENT_VARIABLES, "CUSTOM_FILE_MAX_BYTES"].map(field => [field, source[field]]),
    );
    getObjectStorageConfiguration(parseServerEnvironment(storageSource));
    return;
  } catch (error) {
    if (!(error instanceof ObjectStorageConfigurationError) && !(error instanceof EnvironmentValidationError)) throw error;
    fields = error.fields;
  }

  logger.record({
    boundary: "startup:objectStorage",
    correlationId: "startup",
    errorCode: "PROVIDER_UNAVAILABLE",
    kind: "VALIDATION_REJECTED",
    occurredAt: new Date(),
    safeContext: { missingCount: String(fields.length) },
  });

  throw new Error(`Konfigurasi object storage tidak valid; aplikasi tidak dijalankan agar proteksi CSP tidak turun diam-diam. Periksa variabel: ${fields.join(", ")}.`);
}
