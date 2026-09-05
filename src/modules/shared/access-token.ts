import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

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

export function issueAccessToken(input: Readonly<{
  entityId: string;
  expiresAt?: Date;
  now?: Date;
  randomBytes?: RandomBytes;
  scope: AccessTokenScope;
  tokenBytes?: number;
}>): IssuedAccessToken {
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

  const token = Buffer.from(entropy).toString("base64url");

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
