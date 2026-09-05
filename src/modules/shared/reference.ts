import { randomBytes } from "node:crypto";

import { appError } from "./errors";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 8;
const MAX_REFERENCE_ATTEMPTS = 8;

export type RandomBytes = (size: number) => Uint8Array;

function assertPrefix(prefix: string): string {
  const normalized = prefix.trim().toUpperCase();

  if (!/^[A-Z]{2,8}$/.test(normalized)) {
    throw appError("VALIDATION_ERROR", {
      details: { prefix: "Prefix reference harus 2–8 huruf." },
    });
  }

  return normalized;
}

function encodeReferencePart(bytes: Uint8Array): string {
  if (bytes.length < REFERENCE_LENGTH) {
    throw appError("VALIDATION_ERROR", {
      details: { randomBytes: "Entropy reference tidak cukup." },
    });
  }

  let value = "";

  for (let index = 0; index < REFERENCE_LENGTH; index += 1) {
    value += REFERENCE_ALPHABET[bytes[index] % REFERENCE_ALPHABET.length];
  }

  return value;
}

export function createHumanReference(input: Readonly<{
  now?: Date;
  prefix?: string;
  randomBytes?: RandomBytes;
}> = {}): string {
  const prefix = assertPrefix(input.prefix ?? "NVA");
  const now = input.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw appError("VALIDATION_ERROR", {
      details: { now: "Waktu reference tidak valid." },
    });
  }
  const entropy = (input.randomBytes ?? randomBytes)(REFERENCE_LENGTH);
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");

  return `${prefix}-${date}-${encodeReferencePart(entropy)}`;
}

export async function createUniqueHumanReference(input: Readonly<{
  exists: (reference: string) => Promise<boolean>;
  maxAttempts?: number;
  now?: Date;
  prefix?: string;
  randomBytes?: RandomBytes;
}>): Promise<string> {
  const maxAttempts = input.maxAttempts ?? MAX_REFERENCE_ATTEMPTS;

  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw appError("VALIDATION_ERROR", {
      details: { maxAttempts: "Jumlah percobaan reference tidak valid." },
    });
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const reference = createHumanReference(input);

    if (!(await input.exists(reference))) {
      return reference;
    }
  }

  throw appError("CONFLICT", {
    message: "Reference unik tidak dapat dibuat setelah beberapa percobaan.",
  });
}
