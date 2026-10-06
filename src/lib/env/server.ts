import { z } from "zod";

import { CUSTOM_FILE_MAX_BYTES } from "../../modules/policy/privacy";

import { parseDevOriginList } from "./dev-origins";
import {
  deploymentEnvironmentShape,
  resolveDeploymentTier,
  resolveProviderMode,
  type DeploymentTier,
  type ProviderMode,
} from "./deployment";
import { internalAuthEnvironmentShape } from "./internal-auth";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const blankToUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
};

const optionalNonEmptyString = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional(),
);

function hasAllowedProtocol(value: string, protocols: readonly string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const optionalHttpUrl = optionalNonEmptyString.refine(
  (value) =>
    value === undefined || hasAllowedProtocol(value, ["http:", "https:"]),
  { message: "Must be an HTTP(S) URL." },
);

function isCredentialFreeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" && url.username === "" && url.password === ""
    );
  } catch {
    return false;
  }
}

// Payment provider endpoints receive the server key in an Authorization header,
// so plain HTTP and URLs that embed credentials are rejected.
const optionalHttpsUrlWithoutCredentials = optionalNonEmptyString.refine(
  (value) => value === undefined || isCredentialFreeHttpsUrl(value),
  { message: "Must be an HTTPS URL without embedded credentials." },
);

// Comma-separated hostnames/IPs for `allowedDevOrigins`. Blank or only commas
// becomes undefined; any malformed entry rejects the whole field. Shape rules
// live in ./dev-origins so next.config.ts can share them without the "@/" alias.
const optionalDevOriginList = z
  .preprocess(blankToUndefined, z.string().optional())
  .transform((value, context) => {
    const { invalid, valid } = parseDevOriginList(value);

    if (invalid.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Must be comma-separated hostnames or IPs without scheme, port, path, or credentials.",
      });
      return z.NEVER;
    }

    return valid.length > 0 ? valid : undefined;
  });

const optionalDatabaseUrl = optionalNonEmptyString.refine(
  (value) =>
    value === undefined ||
    hasAllowedProtocol(value, ["postgres:", "postgresql:"]),
  { message: "Must be a PostgreSQL connection URL." },
);

const optionalBoolean = z.preprocess(
  blankToUndefined,
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
);

const optionalPositiveInteger = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value))
    .refine(Number.isSafeInteger)
    .optional(),
);

const optionalEmail = z.preprocess(blankToUndefined, z.email().optional());

const optionalApprovedCustomFileMaxBytes = optionalPositiveInteger.refine(
  (value) => value === undefined || value === CUSTOM_FILE_MAX_BYTES,
  {
    message: `Must equal the approved ${CUSTOM_FILE_MAX_BYTES}-byte upload limit.`,
  },
);

const serverEnvironmentSchema = z.object({
  APP_URL: optionalHttpUrl,
  ADMIN_NOTIFICATION_EMAIL: optionalEmail,
  BITESHIP_API_KEY: optionalNonEmptyString,
  BITESHIP_COURIERS: optionalNonEmptyString,
  BITESHIP_ORIGIN_AREA_ID: optionalNonEmptyString,
  BETTER_AUTH_SECRET: z.preprocess(blankToUndefined, z.string().min(32).optional()),
  BETTER_AUTH_URL: optionalHttpUrl,
  ADMIN_SMTP_HOST: optionalNonEmptyString,
  ADMIN_SMTP_PORT: optionalPositiveInteger,
  ADMIN_SMTP_USER: optionalNonEmptyString,
  ADMIN_SMTP_PASSWORD: optionalNonEmptyString,
  ADMIN_EMAIL_FROM: optionalEmail,
  // Consumer (src/app/api/analytics/retention/route.ts) only checks truthiness.
  CRON_SECRET: optionalNonEmptyString,
  CUSTOM_FILE_MAX_BYTES: optionalApprovedCustomFileMaxBytes,
  DATABASE_URL: optionalDatabaseUrl,
  // Consumer (scripts/seed-local-demo.ts) requires a PostgreSQL URL.
  DEMO_DATABASE_URL: optionalDatabaseUrl,
  EMAIL_FROM: optionalNonEmptyString,
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  GOOGLE_REDIRECT_URI: optionalHttpUrl,
  MIDTRANS_IS_PRODUCTION: optionalBoolean,
  MIDTRANS_SERVER_KEY: optionalNonEmptyString,
  // Optional Snap endpoint override (not in CAPABILITY_GROUPS). Unset keeps the
  // sandbox default in src/modules/payment/midtrans.ts; the provider guard still
  // blocks production/live regardless of this value.
  MIDTRANS_SNAP_ENDPOINT: optionalHttpsUrlWithoutCredentials,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_SENTRY_DSN: optionalHttpUrl,
  // Internal-testing auth (optional, not in CAPABILITY_GROUPS). Shape is shared
  // with src/modules/customer-auth/internal-testing.ts via ./internal-auth.
  ...internalAuthEnvironmentShape,
  // Deployment tier and provider mode (no consumers yet; shape in ./deployment).
  ...deploymentEnvironmentShape,
  // Flags below are only ever compared to the exact string "true" by consumers.
  NIUVA_ANALYTICS_ENABLED: optionalBoolean,
  NIUVA_CUSTOMER_AUTH_MOCK: optionalBoolean,
  // Consumer (next.config.ts allowedDevOrigins, `next dev` only). Not in
  // CAPABILITY_GROUPS. Default empty.
  NIUVA_DEV_ALLOWED_ORIGINS: optionalDevOriginList,
  // Consumer (next.config.ts) uses the value as a relative distDir name.
  NIUVA_NEXT_DIST_DIR: optionalNonEmptyString,
  NIUVA_RUNTIME_MODE: z
    .preprocess(blankToUndefined, z.enum(["demo", "live"]).optional()),
  NODE_ENV: z
    .preprocess(blankToUndefined, z.enum(["development", "test", "production"]).optional()),
  R2_ACCESS_KEY_ID: optionalNonEmptyString,
  R2_ACCOUNT_ID: optionalNonEmptyString,
  R2_ENDPOINT: optionalHttpUrl,
  R2_PRIVATE_BUCKET: optionalNonEmptyString,
  R2_PUBLIC_BUCKET: optionalNonEmptyString,
  R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  RESEND_API_KEY: optionalNonEmptyString,
  SENTRY_AUTH_TOKEN: optionalNonEmptyString,
  SENTRY_ORG: optionalNonEmptyString,
  SENTRY_PROJECT: optionalNonEmptyString,
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

/**
 * Demo is an explicit runtime mode, not a second NODE_ENV. It is intentionally
 * enabled only for a loopback database whose name carries a local marker. This
 * keeps a copied demo flag from turning on transactional adapters in a hosted
 * or production environment.
 */
export function isLocalDemoMode(
  source: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  if (source.NIUVA_RUNTIME_MODE?.trim().toLowerCase() !== "demo") {
    return false;
  }

  if (source.NODE_ENV !== "development" && source.NODE_ENV !== "test") {
    return false;
  }

  const databaseUrl = source.DATABASE_URL?.trim();
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    return false;
  }

  try {
    const url = new URL(databaseUrl);
    if (
      (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
      !["127.0.0.1", "localhost"].includes(url.hostname)
    ) {
      return false;
    }

    const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    return /(^|[-_])(dev|demo|test)([-_]|$)/i.test(databaseName);
  } catch {
    return false;
  }
}

export type ResolvedDeployment = Readonly<{
  providerMode: ProviderMode;
  tier: DeploymentTier;
}>;

/** Fail-closed tier/mode resolution; see ./deployment. Grants nothing by itself. */
export function resolveDeployment(
  source: EnvironmentSource = process.env,
): ResolvedDeployment {
  const environment = parseServerEnvironment(source);

  return {
    providerMode: resolveProviderMode(environment.NIUVA_PROVIDER_MODE),
    tier: resolveDeploymentTier({
      nodeEnv: environment.NODE_ENV,
      tier: environment.NIUVA_DEPLOYMENT_TIER,
    }),
  };
}

export class EnvironmentValidationError extends Error {
  readonly fields: readonly string[];

  constructor(fields: readonly string[]) {
    const uniqueFields = [...new Set(fields)].sort();
    super(`Konfigurasi environment tidak valid: ${uniqueFields.join(", ")}.`);
    this.name = "EnvironmentValidationError";
    this.fields = uniqueFields;
  }
}

function getFieldName(path: PropertyKey[]): string {
  const fieldName = path.map(String).join(".");

  return fieldName.length > 0 ? fieldName : "environment";
}

export function parseServerEnvironment(
  source: EnvironmentSource = process.env,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);

  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map((issue) => getFieldName(issue.path)),
    );
  }

  return result.data;
}

type EnvironmentKey = keyof ServerEnvironment;

type CapabilityGroup = {
  fields: readonly EnvironmentKey[];
  name: string;
};

const CAPABILITY_GROUPS: readonly CapabilityGroup[] = [
  {
    fields: ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"],
    name: "Better Auth admin",
  },
  {
    fields: [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_PRIVATE_BUCKET",
      "R2_PUBLIC_BUCKET",
      "R2_ENDPOINT",
    ],
    name: "R2 storage",
  },
  {
    fields: [
      "MIDTRANS_IS_PRODUCTION",
      "MIDTRANS_SERVER_KEY",
      "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY",
    ],
    name: "Midtrans",
  },
  {
    fields: [
      "BITESHIP_API_KEY",
      "BITESHIP_COURIERS",
      "BITESHIP_ORIGIN_AREA_ID",
    ],
    name: "Biteship",
  },
  {
    fields: ["RESEND_API_KEY", "EMAIL_FROM"],
    name: "Resend",
  },
  {
    fields: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
    name: "Customer Google auth",
  },
];

function isConfigured(value: unknown): boolean {
  return value !== undefined;
}

function assertCompleteCapabilityGroups(environment: ServerEnvironment): void {
  const incompleteFields = CAPABILITY_GROUPS.flatMap((group) => {
    const configuredFields = group.fields.filter((field) =>
      isConfigured(environment[field]),
    );

    if (
      configuredFields.length === 0 ||
      configuredFields.length === group.fields.length
    ) {
      return [];
    }

    return group.fields.filter((field) => !isConfigured(environment[field]));
  });

  const hasR2Storage = CAPABILITY_GROUPS[1].fields.every((field) =>
    isConfigured(environment[field]),
  );

  if (environment.CUSTOM_FILE_MAX_BYTES !== undefined && !hasR2Storage) {
    incompleteFields.push(...CAPABILITY_GROUPS[1].fields);
  }

  if (incompleteFields.length > 0) {
    throw new EnvironmentValidationError(incompleteFields);
  }
}

export function validateStartupEnvironment(
  source: EnvironmentSource = process.env,
): ServerEnvironment {
  const environment = parseServerEnvironment(source);
  assertCompleteCapabilityGroups(environment);

  return environment;
}

export type ServerCapabilities = {
  biteship: boolean;
  adminAuth: boolean;
  customUploads: boolean;
  customerGoogle: boolean;
  database: boolean;
  midtrans: boolean;
  objectStorage: boolean;
  resend: boolean;
};

export function getServerCapabilities(
  source: EnvironmentSource = process.env,
): ServerCapabilities {
  const environment = validateStartupEnvironment(source);
  const hasAll = (fields: readonly EnvironmentKey[]): boolean =>
    fields.every((field) => isConfigured(environment[field]));
  const objectStorage = hasAll(CAPABILITY_GROUPS[1].fields);

  return {
    biteship: hasAll(CAPABILITY_GROUPS[3].fields),
    adminAuth: hasAll(CAPABILITY_GROUPS[0].fields),
    customUploads:
      environment.DATABASE_URL !== undefined &&
      objectStorage &&
      environment.CUSTOM_FILE_MAX_BYTES !== undefined,
    customerGoogle: hasAll(CAPABILITY_GROUPS[5].fields),
    database: environment.DATABASE_URL !== undefined,
    midtrans: hasAll(CAPABILITY_GROUPS[2].fields),
    objectStorage,
    resend: hasAll(CAPABILITY_GROUPS[4].fields),
  };
}

export type DatabaseEnvironment = {
  DATABASE_URL: string;
};

export function getDatabaseEnvironment(
  source: EnvironmentSource = process.env,
): DatabaseEnvironment {
  const environment = parseServerEnvironment(source);

  if (environment.DATABASE_URL === undefined) {
    throw new EnvironmentValidationError(["DATABASE_URL"]);
  }

  return { DATABASE_URL: environment.DATABASE_URL };
}
