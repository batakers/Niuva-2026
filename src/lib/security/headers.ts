import { decide } from "../../modules/capabilities/resolver";

export type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityEnvironment = Readonly<Record<string, string | undefined>>;

// R2 connect-src is granted only when the capability resolver allows
// `objectStorage`. The env is passed in (no implicit process.env) and NODE_ENV
// is pinned to the caller's value so tier resolution matches the header mode.
// A half-filled R2 group is rejected at start by src/instrumentation.ts
// (see lib/env/object-storage-startup.ts), so a denial here never hides one.
function isObjectStorageAllowed(
  environment: SecurityEnvironment,
  nodeEnvironment: string | undefined,
): boolean {
  return decide("objectStorage", {
    env: { ...environment, NODE_ENV: nodeEnvironment },
  }).allowed;
}

function getSafeHttpsOrigin(endpoint: string | undefined): string | undefined {
  if (typeof endpoint !== "string" || endpoint.trim().length === 0) {
    return undefined;
  }

  try {
    const url = new URL(endpoint.trim());

    if (
      url.protocol !== "https:" ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

// The one place that decides whether the R2 origin is part of connect-src.
// Shared by the static policy below and the per-request nonce policy written by
// src/proxy.ts, so the two cannot drift. Never in production NODE_ENV.
export function getObjectStorageConnectOrigin(
  nodeEnvironment = process.env.NODE_ENV,
  environment: SecurityEnvironment = process.env,
): string | undefined {
  return nodeEnvironment === "production" ||
    !isObjectStorageAllowed(environment, nodeEnvironment)
    ? undefined
    : getSafeHttpsOrigin(environment.R2_ENDPOINT);
}

// `source` for the static CSP rule in next.config.ts headers(). It matches every
// path EXCEPT /checkout and /account(/...), whose CSP comes only from the
// nonce proxy (src/proxy.ts), so no response relies on header overwrite there.
// Next compiles this case-insensitively, the same way as the proxy matcher, and
// isHeaderOnlyPath lowercases, so both sides agree on differently-cased paths.
// /admin and /api/admin also use the nonce CSP from the NIUVA proxy.
// Authentication-unavailable HTML writes its own restricted static CSP.
export const STATIC_CSP_SOURCE = "/((?!checkout(?:/|$)|account(?:/|$)|admin(?:/|$)|api/admin(?:/|$)).*)";

export function getContentSecurityPolicy(
  nodeEnvironment = process.env.NODE_ENV,
  environment: SecurityEnvironment = process.env,
): string {
  const isProduction = nodeEnvironment === "production";
  const r2Origin = getObjectStorageConnectOrigin(nodeEnvironment, environment);
  const connectSources = [
    "'self'",
    ...(r2Origin === undefined ? [] : [r2Origin]),
    ...(isProduction ? [] : ["ws:", "wss:"]),
  ];
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' https://*.googleusercontent.com data: blob:",
    "font-src 'self' data:",
    "media-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSources.join(" ")}`,
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join("; ");
}

export function getStaticContentSecurityPolicyHeader(
  nodeEnvironment = process.env.NODE_ENV,
  environment: SecurityEnvironment = process.env,
): SecurityHeader {
  return {
    key: "Content-Security-Policy",
    value: getContentSecurityPolicy(nodeEnvironment, environment),
  };
}

// Every security header except the CSP; applied to all routes.
export function getNonCspSecurityHeaders(
  nodeEnvironment = process.env.NODE_ENV,
): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-Permitted-Cross-Domain-Policies",
      value: "none",
    },
  ];

  if (nodeEnvironment === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }

  return headers;
}

export function getSecurityHeaders(
  nodeEnvironment = process.env.NODE_ENV,
  environment: SecurityEnvironment = process.env,
): SecurityHeader[] {
  return [
    getStaticContentSecurityPolicyHeader(nodeEnvironment, environment),
    ...getNonCspSecurityHeaders(nodeEnvironment),
  ];
}
