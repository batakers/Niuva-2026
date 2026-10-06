import type { DeploymentTier } from "../env/deployment";
import { isValidNonce } from "./nonce";

// Pure CSP builder. Not wired anywhere yet (tasks 7.21/7.22 do that). The base
// directives mirror getContentSecurityPolicy() in ./headers.ts; the intentional
// differences are listed in tests/unit/csp.test.ts.

export type CspExtraSourceDirective =
  | "connect-src"
  | "font-src"
  | "frame-src"
  | "img-src"
  | "script-src"
  | "style-src"
  | "worker-src";

export type CspExtraSources = Readonly<
  Partial<Record<CspExtraSourceDirective, readonly string[]>>
>;

export type BuildContentSecurityPolicyInput = Readonly<{
  nonce: string;
  tier: DeploymentTier;
  /** Extra sources per directive for approved integrations. Validated. */
  extraSources?: CspExtraSources;
  /** Extra https origins for connect-src (for example the R2 endpoint). */
  connectOrigins?: readonly string[];
  /** Default true. Adds 'strict-dynamic' to script-src. */
  strictDynamic?: boolean;
}>;

// https origin, optional single leading wildcard label, optional port or `:*`.
// No path, query, userinfo, whitespace, `;` or `,`.
const HTTPS_SOURCE_PATTERN =
  /^https:\/\/(?:\*\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*(?::(?:\d{1,5}|\*))?$/i;

const EXTRA_DIRECTIVES: readonly CspExtraSourceDirective[] = [
  "connect-src",
  "font-src",
  "frame-src",
  "img-src",
  "script-src",
  "style-src",
  "worker-src",
];

function assertHttpsSource(value: string, label: string): string {
  if (typeof value !== "string" || !HTTPS_SOURCE_PATTERN.test(value)) {
    throw new Error(`Invalid CSP source for ${label}.`);
  }

  return value.toLowerCase();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function extraFor(
  extraSources: CspExtraSources | undefined,
  directive: CspExtraSourceDirective,
): string[] {
  return uniqueSorted(
    (extraSources?.[directive] ?? []).map((source) =>
      assertHttpsSource(source, directive),
    ),
  );
}

function joinSources(base: readonly string[], extra: readonly string[]): string {
  return [...base, ...extra.filter((source) => !base.includes(source))].join(" ");
}

export function buildContentSecurityPolicy(
  input: BuildContentSecurityPolicyInput,
): string {
  if (!isValidNonce(input.nonce)) {
    throw new Error("Invalid CSP nonce.");
  }

  for (const directive of Object.keys(input.extraSources ?? {})) {
    if (!EXTRA_DIRECTIVES.includes(directive as CspExtraSourceDirective)) {
      throw new Error("Unsupported CSP directive in extraSources.");
    }
  }

  const isProduction = input.tier === "production";
  const isLocalTest = input.tier === "local-test";
  const strictDynamic = input.strictDynamic ?? true;
  const connectOrigins = uniqueSorted(
    (input.connectOrigins ?? []).map((origin) =>
      assertHttpsSource(origin, "connectOrigins"),
    ),
  );

  const scriptBase = [
    "'self'",
    `'nonce-${input.nonce}'`,
    ...(strictDynamic ? ["'strict-dynamic'"] : []),
    ...(isProduction ? [] : isLocalTest ? ["'unsafe-eval'"] : []),
  ];
  const connectBase = ["'self'", ...(isLocalTest ? ["ws:", "wss:"] : [])];
  const connectExtra = uniqueSorted([
    ...connectOrigins,
    ...extraFor(input.extraSources, "connect-src"),
  ]);

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src ${joinSources(
      ["'self'", "https://*.googleusercontent.com", "data:", "blob:"],
      extraFor(input.extraSources, "img-src"),
    )}`,
    `font-src ${joinSources(["'self'", "data:"], extraFor(input.extraSources, "font-src"))}`,
    "media-src 'self'",
    "manifest-src 'self'",
    `worker-src ${joinSources(["'self'", "blob:"], extraFor(input.extraSources, "worker-src"))}`,
    `script-src ${joinSources(scriptBase, extraFor(input.extraSources, "script-src"))}`,
    `style-src ${joinSources(["'self'", "'unsafe-inline'"], extraFor(input.extraSources, "style-src"))}`,
    `connect-src ${joinSources(connectBase, connectExtra)}`,
    ...(extraFor(input.extraSources, "frame-src").length > 0
      ? [`frame-src ${joinSources([], extraFor(input.extraSources, "frame-src"))}`]
      : []),
    ...(isLocalTest ? [] : ["upgrade-insecure-requests"]),
  ];

  return directives.join("; ");
}
