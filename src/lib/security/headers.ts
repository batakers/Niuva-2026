import { CUSTOM_FILE_MAX_BYTES } from "../../modules/policy/privacy";

export type SecurityHeader = {
  key: string;
  value: string;
};

type SecurityEnvironment = Readonly<Record<string, string | undefined>>;

function isNonEmptyString(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasCompleteR2UploadCapability(environment: SecurityEnvironment): boolean {
  return (
    environment.CUSTOM_FILE_MAX_BYTES?.trim() === String(CUSTOM_FILE_MAX_BYTES) &&
    isNonEmptyString(environment.R2_ACCESS_KEY_ID) &&
    isNonEmptyString(environment.R2_ACCOUNT_ID) &&
    isNonEmptyString(environment.R2_ENDPOINT) &&
    isNonEmptyString(environment.R2_PRIVATE_BUCKET) &&
    isNonEmptyString(environment.R2_PUBLIC_BUCKET) &&
    isNonEmptyString(environment.R2_SECRET_ACCESS_KEY)
  );
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

export function getContentSecurityPolicy(
  nodeEnvironment = process.env.NODE_ENV,
  environment: SecurityEnvironment = process.env,
): string {
  const isProduction = nodeEnvironment === "production";
  const r2Origin = isProduction || !hasCompleteR2UploadCapability(environment)
    ? undefined
    : getSafeHttpsOrigin(environment.R2_ENDPOINT);
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
    "img-src 'self' data: blob:",
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

export function getSecurityHeaders(
  nodeEnvironment = process.env.NODE_ENV,
  environment: SecurityEnvironment = process.env,
): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    {
      key: "Content-Security-Policy",
      value: getContentSecurityPolicy(nodeEnvironment, environment),
    },
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
