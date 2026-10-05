import type { DeploymentTier } from "./deployment";

// Dependency-free and alias-free (no "@/" imports), same pattern as
// ./dev-origins, so `next.config.ts` can import it. Single source of the
// canonical origin per deployment tier, derived from `APP_URL` (task 7.17).
// Nothing consumes it yet (7.18/7.19 wire cookies, OAuth, proof links,
// serverActions.allowedOrigins). It never throws and never guesses: a missing
// or invalid value yields an explicit error result on every tier.

export type OriginFailureReason =
  | "missing"
  | "malformed"
  | "credentials"
  | "path"
  | "wildcard"
  | "insecure-scheme"
  | "disallowed-host";

export type OriginResolution =
  | Readonly<{
      ok: true;
      /** Canonical origin: lowercase scheme and host, default port dropped, no trailing slash. */
      origin: string;
      /** `host[:port]` entries for `serverActions.allowedOrigins` (no scheme). */
      allowedOrigins: readonly string[];
    }>
  | Readonly<{ ok: false; reason: OriginFailureReason }>;

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Authority characters we accept before URL parsing. Anything else (percent
// escapes, backslashes, whitespace, control chars, `*`) is rejected up front so
// the WHATWG parser cannot silently reinterpret it.
const SCHEME_AND_AUTHORITY = /^(https?):\/\/([^/?#]*)(.*)$/i;
const SAFE_AUTHORITY = /^[a-z0-9.\-:[\]]+$/i;

function fail(reason: OriginFailureReason): OriginResolution {
  return { ok: false, reason };
}

function isPublicDomain(hostname: string): boolean {
  if (hostname.endsWith(".") || hostname.startsWith(".") || hostname.includes("..")) {
    return false;
  }

  const labels = hostname.split(".");

  // Rejects localhost, bare single labels, and IP literals (numeric TLD / "[").
  return labels.length >= 2 && /[a-z]/.test(labels[labels.length - 1] ?? "");
}

/**
 * Resolve the canonical app origin for a tier.
 *
 * - `production` / `staging`: `https` only, public domain host, no loopback.
 * - `local-test`: `http` or `https`, host limited to `localhost`, `127.0.0.1`,
 *   or `[::1]`.
 * - All tiers reject empty values, credentials, any path other than `/`, query,
 *   fragment, wildcards, and malformed authorities.
 */
export function resolveAppOrigin(
  input: Readonly<{ tier: DeploymentTier; appUrl: string | undefined }>,
): OriginResolution {
  const raw = input.appUrl;

  if (raw === undefined || raw.trim().length === 0) {
    return fail("missing");
  }

  // Surrounding whitespace is tolerated (env files); internal whitespace or
  // control characters are not.
  const value = raw.trim();

  if (/[\u0000-\u0020\u007f\\]/.test(value)) {
    return fail("malformed");
  }

  if (value.includes("*")) {
    return fail("wildcard");
  }

  const match = SCHEME_AND_AUTHORITY.exec(value);

  if (match === null) {
    return /^[a-z][a-z0-9+.-]*:/i.test(value)
      ? fail("insecure-scheme")
      : fail("malformed");
  }

  const scheme = (match[1] ?? "").toLowerCase();
  const authority = match[2] ?? "";
  const rest = match[3] ?? "";

  if (authority.includes("@")) {
    return fail("credentials");
  }

  if (rest !== "" && rest !== "/") {
    return fail("path");
  }

  if (!SAFE_AUTHORITY.test(authority)) {
    return fail("malformed");
  }

  let parsed: URL;

  try {
    parsed = new URL(`${scheme}://${authority}`);
  } catch {
    return fail("malformed");
  }

  if (parsed.username !== "" || parsed.password !== "") {
    return fail("credentials");
  }

  const hostname = parsed.hostname;

  if (input.tier === "local-test") {
    if (!LOOPBACK_HOSTNAMES.has(hostname)) {
      return fail("disallowed-host");
    }
  } else {
    if (scheme !== "https") {
      return fail("insecure-scheme");
    }

    if (!isPublicDomain(hostname)) {
      return fail("disallowed-host");
    }
  }

  // `URL.origin` lowercases, drops the default port, and has no trailing slash.
  return { ok: true, origin: parsed.origin, allowedOrigins: [parsed.host] };
}
