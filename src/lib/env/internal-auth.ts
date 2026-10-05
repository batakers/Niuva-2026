import { z } from "zod";

// Deliberately dependency-free and alias-free (no "@/" imports). The scheduled
// cleanup scripts load `internal-testing.ts` through jiti, which does not
// resolve the "@/" tsconfig alias, so that module cannot import
// `src/lib/env/server.ts` directly. Both consume these field definitions, which
// keeps a single source for the three internal-testing variables.

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim().length === 0 ? undefined : value;

// Only the exact string "true" opens internal auth; "false" and blank keep it closed.
const optionalInternalFlag = z.preprocess(
  blankToUndefined,
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
);

// Same shape the pre-3.16 parser accepted: trimmed string that is a valid email.
const optionalInternalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email().optional(),
);

export const internalAuthEnvironmentShape = {
  NIUVA_INTERNAL_AUTH_ENABLED: optionalInternalFlag,
  NIUVA_INTERNAL_GOOGLE_EMAIL: optionalInternalEmail,
  NIUVA_INTERNAL_PASSWORD_EMAIL: optionalInternalEmail,
};

const internalAuthEnvironmentSchema = z.object(internalAuthEnvironmentShape);

export type InternalAuthEnvironment = z.infer<typeof internalAuthEnvironmentSchema>;

/**
 * Non-throwing parse of only the internal-auth variables. Returns `null` when
 * any of them is malformed. Unrelated variables are ignored on purpose so a
 * bad unrelated value can never change the internal-auth decision.
 */
export function parseInternalAuthEnvironment(
  source: EnvironmentSource,
): InternalAuthEnvironment | null {
  const result = internalAuthEnvironmentSchema.safeParse(source);

  return result.success ? result.data : null;
}
