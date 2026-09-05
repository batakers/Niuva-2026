import { z } from "zod";

type PublicEnvironmentSource = Readonly<Record<string, string | undefined>>;

const blankToUndefined = (value: unknown): unknown => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
};

const optionalPublicString = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalPublicUrl = optionalPublicString.refine(
  (value) => {
    if (value === undefined) {
      return true;
    }

    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "Must be an HTTP(S) URL." },
);

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalPublicString,
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: optionalPublicString,
  NEXT_PUBLIC_SENTRY_DSN: optionalPublicUrl,
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export class PublicEnvironmentValidationError extends Error {
  readonly fields: readonly string[];

  constructor(fields: readonly string[]) {
    const uniqueFields = [...new Set(fields)].sort();
    super(`Konfigurasi public environment tidak valid: ${uniqueFields.join(", ")}.`);
    this.name = "PublicEnvironmentValidationError";
    this.fields = uniqueFields;
  }
}

export function getPublicEnvironment(
  source: PublicEnvironmentSource = process.env,
): PublicEnvironment {
  const result = publicEnvironmentSchema.safeParse(source);

  if (!result.success) {
    throw new PublicEnvironmentValidationError(
      result.error.issues.map((issue) => issue.path.map(String).join(".")),
    );
  }

  return result.data;
}
