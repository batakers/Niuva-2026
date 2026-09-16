import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { appError } from "./errors";

const DEFAULT_TOKEN_BYTES = 32;

export type AccessTokenScope =
  | "B2B_INQUIRY"
  | "CUSTOM_PRINT_QUOTE"
  | "CUSTOM_PRINT_REQUEST"
  | "FILE_UPLOAD"
  | "ORDER_STATUS";

export type IssuedAccessToken = Readonly<{
  entityId: string;
  expiresAt?: Date;
  scope: AccessTokenScope;
  token: string;
  tokenHash: string;
}>;

/**
 * Route-bound tokens carry the public entity identifier next to their
 * high-entropy secret. The identifier is only a lookup hint; authorization is
 * still decided by the stored hash bound to scope, entity, and full token.
 */
export type AccessTokenIssueOptions = Readonly<{
  entityId: string;
  expiresAt?: Date;
  includeEntityId?: boolean;
  now?: Date;
  randomBytes?: RandomBytes;
  scope: AccessTokenScope;
  tokenBytes?: number;
}>;

export type AccessTokenVerifierInput = Readonly<{
  entityId: string;
  expectedHash: string;
  now?: Date;
  revokedAt?: Date;
  scope: AccessTokenScope;
  token: string;
  expiresAt?: Date;
}>;

function assertBinding(scope: AccessTokenScope, entityId: string): void {
  if (scope.trim().length === 0 || entityId.trim().length === 0) {
    throw appError("VALIDATION_ERROR", {
      details: { entity: "Scope dan entity ID token wajib diisi." },
    });
  }
}

function tokenMaterial(
  scope: AccessTokenScope,
  entityId: string,
  token: string,
): string {
  return `${scope}\u0000${entityId}\u0000${token}`;
}

export function hashAccessToken(input: Readonly<{
  entityId: string;
  scope: AccessTokenScope;
  token: string;
}>): string {
  assertBinding(input.scope, input.entityId);

  return createHash("sha256")
    .update(tokenMaterial(input.scope, input.entityId, input.token), "utf8")
    .digest("hex");
}

export function issueAccessToken(input: AccessTokenIssueOptions): IssuedAccessToken {
  assertBinding(input.scope, input.entityId);

  const tokenBytes = input.tokenBytes ?? DEFAULT_TOKEN_BYTES;

  if (!Number.isSafeInteger(tokenBytes) || tokenBytes < DEFAULT_TOKEN_BYTES) {
    throw appError("VALIDATION_ERROR", {
      details: { tokenBytes: "Token harus memiliki entropy minimal 256 bit." },
    });
  }

  if (input.expiresAt !== undefined) {
    const now = input.now ?? new Date();

    if (!Number.isFinite(input.expiresAt.getTime()) || input.expiresAt <= now) {
      throw appError("VALIDATION_ERROR", {
        details: { expiresAt: "Waktu kedaluwarsa token harus di masa depan." },
      });
    }
  }

  const entropy = (input.randomBytes ?? randomBytes)(tokenBytes);
  if (entropy.length < tokenBytes) {
    throw appError("INTERNAL_ERROR", {
      message: "Entropy token tidak tersedia sesuai ukuran yang diminta.",
    });
  }

  const secret = Buffer.from(entropy).toString("base64url");
  const token = input.includeEntityId
    ? `v1.${Buffer.from(input.entityId, "utf8").toString("base64url")}.${secret}`
    : secret;

  return {
    entityId: input.entityId,
    expiresAt: input.expiresAt,
    scope: input.scope,
    token,
    tokenHash: hashAccessToken({
      entityId: input.entityId,
      scope: input.scope,
      token,
    }),
  };
}

/**
 * Reads the lookup hint from a route-bound token without treating it as
 * authorization. Opaque legacy tokens intentionally return null.
 */
export function getRouteAccessTokenEntityId(token: string): string | null {
  const parts = token.split(".");

  if (
    parts.length !== 3 ||
    parts[0] !== "v1" ||
    !/^[A-Za-z0-9_-]+$/.test(parts[1]) ||
    !/^[A-Za-z0-9_-]+$/.test(parts[2])
  ) {
    return null;
  }

  try {
    const entityId = Buffer.from(parts[1], "base64url").toString("utf8");

    if (
      entityId.length === 0 ||
      Buffer.from(entityId, "utf8").toString("base64url") !== parts[1] ||
      !z.uuid().safeParse(entityId).success
    ) {
      return null;
    }

    return entityId;
  } catch {
    return null;
  }
}

export function verifyAccessToken(input: AccessTokenVerifierInput): void {
  assertBinding(input.scope, input.entityId);
  const now = input.now ?? new Date();

  if (
    input.expiresAt !== undefined &&
    (!Number.isFinite(input.expiresAt.getTime()) || now >= input.expiresAt)
  ) {
    throw appError("UNAUTHORIZED");
  }

  if (
    input.revokedAt !== undefined &&
    (!Number.isFinite(input.revokedAt.getTime()) || now >= input.revokedAt)
  ) {
    throw appError("UNAUTHORIZED");
  }

  if (!/^[0-9a-f]{64}$/i.test(input.expectedHash)) {
    throw appError("UNAUTHORIZED");
  }

  const actual = Buffer.from(
    hashAccessToken({
      entityId: input.entityId,
      scope: input.scope,
      token: input.token,
    }),
    "hex",
  );
  const expected = Buffer.from(input.expectedHash, "hex");

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw appError("UNAUTHORIZED");
  }
}

export type RandomBytes = (size: number) => Uint8Array;
