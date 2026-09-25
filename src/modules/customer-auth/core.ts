import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const CUSTOMER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const CUSTOMER_SESSION_COOKIE = "niuva_customer_session";
export const CUSTOMER_OAUTH_STATE_COOKIE = "niuva_customer_oauth_state";
export const CUSTOMER_OAUTH_VERIFIER_COOKIE = "niuva_customer_oauth_verifier";
export const CUSTOMER_OAUTH_RETURN_TO_COOKIE = "niuva_customer_oauth_return_to";
export const CUSTOMER_OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
const CUSTOMER_RETURN_TO_PATHS = new Set(["/account", "/checkout"]);

const googleIdentitySchema = z.object({
  sub: z.string().trim().min(1),
  email: z.string().trim().email(),
  email_verified: z.literal(true),
  name: z.string().trim().min(1).optional(),
  picture: z
    .string()
    .url()
    .refine((value) => {
      const hostname = new URL(value).hostname.toLowerCase();
      return (
        hostname === "googleusercontent.com" ||
        hostname.endsWith(".googleusercontent.com")
      );
    }, "Avatar Google tidak valid.")
    .optional(),
});

export type CustomerGoogleIdentity = Readonly<{
  googleSubject: string;
  email: string;
  normalizedEmail: string;
  displayName?: string;
  avatarUrl?: string;
}>;

export type PkcePair = Readonly<{
  verifier: string;
  challenge: string;
}>;

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseGoogleIdentity(input: unknown): CustomerGoogleIdentity {
  const parsed = googleIdentitySchema.parse(input);

  return {
    googleSubject: parsed.sub,
    email: parsed.email,
    normalizedEmail: normalizeCustomerEmail(parsed.email),
    ...(parsed.name ? { displayName: parsed.name } : {}),
    ...(parsed.picture ? { avatarUrl: parsed.picture } : {}),
  };
}

export function safeCustomerReturnTo(input: string | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/account";
  }

  try {
    const url = new URL(input, "https://niuva.internal");

    if (
      url.origin !== "https://niuva.internal" ||
      !CUSTOMER_RETURN_TO_PATHS.has(url.pathname)
    ) {
      return "/account";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/account";
  }
}

export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  return { verifier, challenge };
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createCustomerOAuthState(now = Date.now()): string {
  return `${Math.floor(now / 1_000)}.${createOpaqueToken()}`;
}

export function isCustomerOAuthStateFresh(
  state: string,
  now = Date.now(),
): boolean {
  const [issuedAtSeconds, nonce, ...extra] = state.split(".");
  if (
    extra.length > 0 ||
    nonce === undefined ||
    !/^\d+$/.test(issuedAtSeconds) ||
    !/^[A-Za-z0-9_-]{43,}$/.test(nonce)
  ) {
    return false;
  }

  const issuedAt = Number(issuedAtSeconds) * 1_000;
  const age = now - issuedAt;
  return Number.isSafeInteger(issuedAt) && age >= 0 && age <= CUSTOMER_OAUTH_STATE_MAX_AGE_SECONDS * 1_000;
}

export function isPkceVerifier(value: string): boolean {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function secureTokenEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function customerSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

export function customerOAuthCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: CUSTOMER_OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/api/auth/google",
  };
}
