import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import { isLocalDemoMode, parseServerEnvironment } from "@/lib/env/server";
import { appError, isAppError } from "@/modules/shared/errors";

import {
  parseGoogleIdentity,
  type CustomerGoogleIdentity,
} from "./core";

const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

export type CustomerGoogleOAuthConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}>;

export type GoogleOAuthAdapter = Readonly<{
  createAuthorizationUrl(input: Readonly<{
    codeChallenge: string;
    state: string;
  }>): string;
  exchangeCode(input: Readonly<{
    code: string;
    codeVerifier: string;
  }>): Promise<CustomerGoogleIdentity>;
}>;

export function getCustomerGoogleOAuthConfig(
  source: Readonly<Record<string, string | undefined>> = process.env,
): CustomerGoogleOAuthConfig {
  try {
    const environment = parseServerEnvironment(source);

    if (
      environment.GOOGLE_CLIENT_ID === undefined ||
      environment.GOOGLE_CLIENT_SECRET === undefined ||
      environment.GOOGLE_REDIRECT_URI === undefined
    ) {
      throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    }

    return {
      clientId: environment.GOOGLE_CLIENT_ID,
      clientSecret: environment.GOOGLE_CLIENT_SECRET,
      redirectUri: environment.GOOGLE_REDIRECT_URI,
    };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw appError("CUSTOMER_AUTH_UNAVAILABLE");
  }
}

export function createGoogleOAuthAdapter(
  config: CustomerGoogleOAuthConfig,
  now: () => number = Date.now,
): GoogleOAuthAdapter {
  if (isLocalCustomerAuthMockEnabled()) {
    return createLocalCustomerAuthMockAdapter(config);
  }

  const client = new OAuth2Client(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );

  return {
    createAuthorizationUrl({ codeChallenge, state }) {
      return client.generateAuthUrl({
        access_type: "online",
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256,
        prompt: "select_account",
        scope: ["openid", "email", "profile"],
        state,
      });
    },
    async exchangeCode({ code, codeVerifier }) {
      const { tokens } = await client.getToken({
        code,
        codeVerifier,
        redirect_uri: config.redirectUri,
      });

      if (typeof tokens.id_token !== "string" || tokens.id_token.length === 0) {
        throw appError("UNAUTHORIZED");
      }

      const ticket = await client.verifyIdToken({
        audience: config.clientId,
        idToken: tokens.id_token,
        maxExpiry: 10 * 60,
      });
      const payload = ticket.getPayload();

      return validateGoogleIdTokenPayload(payload, config, now);
    },
  };
}

/**
 * This adapter is intentionally limited to the loopback demo/test runtime.
 * It exercises the same state, PKCE, callback, identity, session, and database
 * boundaries without pretending that a production Google login succeeded.
 */
function createLocalCustomerAuthMockAdapter(
  config: CustomerGoogleOAuthConfig,
): GoogleOAuthAdapter {
  return {
    createAuthorizationUrl({ state }) {
      const callback = new URL(config.redirectUri);
      callback.searchParams.set("code", "local-demo-google-code");
      callback.searchParams.set("state", state);
      return callback.toString();
    },
    async exchangeCode({ code, codeVerifier }) {
      if (code !== "local-demo-google-code" || codeVerifier.length < 43) {
        throw appError("UNAUTHORIZED");
      }

      return parseGoogleIdentity({
        email: "demo-customer@example.test",
        email_verified: true,
        name: "Demo Customer",
        sub: "local-demo-google-subject",
      });
    },
  };
}

function isLocalCustomerAuthMockEnabled(
  source: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return (
    source.NIUVA_CUSTOMER_AUTH_MOCK === "true" &&
    (isLocalDemoMode(source) || isLocalTestDatabase(source))
  );
}

function isLocalTestDatabase(
  source: Readonly<Record<string, string | undefined>>,
): boolean {
  if (source.NODE_ENV !== "test") {
    return false;
  }

  const databaseUrl = source.DATABASE_URL?.trim();
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    return false;
  }

  try {
    const url = new URL(databaseUrl);
    const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      ["127.0.0.1", "localhost"].includes(url.hostname) &&
      /(^|[-_])test([-_]|$)/i.test(databaseName)
    );
  } catch {
    return false;
  }
}

export function validateGoogleIdTokenPayload(
  payload: unknown,
  config: CustomerGoogleOAuthConfig,
  now: () => number = Date.now,
): CustomerGoogleIdentity {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw appError("UNAUTHORIZED");
  }

  const claims = payload as Record<string, unknown>;
  const issuer = claims.iss;
  const audience = claims.aud;
  const expiry = claims.exp;

  if (
    typeof issuer !== "string" ||
    !GOOGLE_ISSUERS.has(issuer) ||
    !isAudience(audience) ||
    !hasExpectedAudience(audience, config.clientId) ||
    typeof expiry !== "number" ||
    !Number.isFinite(expiry) ||
    expiry * 1_000 <= now()
  ) {
    throw appError("UNAUTHORIZED");
  }

  return parseGoogleIdentity(payload);
}

function isAudience(value: unknown): value is string | string[] {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function hasExpectedAudience(
  audience: string | string[] | undefined,
  expected: string,
): boolean {
  return Array.isArray(audience)
    ? audience.includes(expected)
    : audience === expected;
}
