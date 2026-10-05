// Deliberately dependency-free and alias-free (no "@/" imports). `next.config.ts`
// is loaded by Next before the tsconfig "@/" alias applies and must never throw
// on a bad value, so it cannot import `src/lib/env/server.ts` (which pulls
// `@/modules/policy/privacy`). Both `next.config.ts` and `serverEnvironmentSchema`
// consume this module, which keeps a single definition of the accepted shape.
//
// Shape follows node_modules/next/dist/docs/01-app/03-api-reference/05-config/
// 01-next-config-js/allowedDevOrigins.md and the matcher in
// node_modules/next/dist/server/app-render/csrf-protection.js: entries are
// compared against the request *hostname* only, so scheme, port, path, and
// credentials are never valid. Wildcards are allowed only as a leading `*.` or
// `**.` label in front of a real domain.

export const DEV_ALLOWED_ORIGINS_ENV = "NIUVA_DEV_ALLOWED_ORIGINS";

const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function isHostname(value: string): boolean {
  if (value.length === 0 || value.length > 253) {
    return false;
  }

  return value.split(".").every((label) => HOSTNAME_LABEL.test(label));
}

/**
 * True for a bare hostname or IPv4 address (`localhost`, `dev.example.test`,
 * `192.0.2.10`) or a leading-wildcard domain (`*.dev.example.test`,
 * `**.dev.example.test`). Wildcards need at least two labels after them and a
 * non-numeric domain, so `*`, `*.com`, and `*.168.1.11` are rejected.
 */
export function isValidDevOrigin(value: string): boolean {
  const wildcard = /^\*{1,2}\./.exec(value);

  if (wildcard === null) {
    return isHostname(value);
  }

  const domain = value.slice(wildcard[0].length);
  const labels = domain.split(".");

  return (
    labels.length >= 2 &&
    isHostname(domain) &&
    labels.some((label) => /[a-z-]/i.test(label))
  );
}

export type DevOriginList = {
  invalid: string[];
  valid: string[];
};

/**
 * Splits a comma-separated list, trims each entry, drops empty entries, and
 * separates valid from invalid ones. Never throws.
 */
export function parseDevOriginList(raw: string | undefined): DevOriginList {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return {
    invalid: entries.filter((entry) => !isValidDevOrigin(entry)),
    valid: entries.filter(isValidDevOrigin),
  };
}

/**
 * Value for `allowedDevOrigins` in `next.config.ts`: valid entries only, empty
 * by default. Invalid entries are ignored here; `serverEnvironmentSchema`
 * reports them by field name at startup.
 */
export function getDevAllowedOrigins(
  source: Readonly<Record<string, string | undefined>> = process.env,
): string[] {
  return parseDevOriginList(source[DEV_ALLOWED_ORIGINS_ENV]).valid;
}
