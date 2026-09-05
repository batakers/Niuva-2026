import { z } from "zod";

import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";

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
  CLERK_SECRET_KEY: optionalNonEmptyString,
  CUSTOM_FILE_MAX_BYTES: optionalApprovedCustomFileMaxBytes,
  DATABASE_URL: optionalDatabaseUrl,
  EMAIL_FROM: optionalNonEmptyString,
  MIDTRANS_IS_PRODUCTION: optionalBoolean,
  MIDTRANS_SERVER_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_SENTRY_DSN: optionalHttpUrl,
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
    fields: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
    name: "Clerk admin",
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
    fields: ["RESEND_API_KEY", "EMAIL_FROM", "ADMIN_NOTIFICATION_EMAIL"],
    name: "Resend",
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
  clerkAdmin: boolean;
  customUploads: boolean;
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
    clerkAdmin: hasAll(CAPABILITY_GROUPS[0].fields),
    customUploads:
      objectStorage && environment.CUSTOM_FILE_MAX_BYTES !== undefined,
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
  const environment = validateStartupEnvironment(source);

  if (environment.DATABASE_URL === undefined) {
    throw new EnvironmentValidationError(["DATABASE_URL"]);
  }

  return { DATABASE_URL: environment.DATABASE_URL };
}
