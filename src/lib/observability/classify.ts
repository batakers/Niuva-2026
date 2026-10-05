import { isAppError, type ErrorCode } from "@/modules/shared/errors";

import type { FailureKind } from "./logger";

/**
 * Pemetaan total `ErrorCode` -> `FailureKind`. `Record<ErrorCode, ...>` membuat
 * penambahan kode baru gagal kompilasi sampai kategorinya ditentukan.
 */
const FAILURE_KIND_BY_ERROR_CODE: Record<ErrorCode, FailureKind> = {
  VALIDATION_ERROR: "VALIDATION_REJECTED",
  INVALID_JSON: "VALIDATION_REJECTED",
  REQUEST_TOO_LARGE: "VALIDATION_REJECTED",
  UPLOAD_REJECTED: "VALIDATION_REJECTED",
  NOT_FOUND: "VALIDATION_REJECTED",
  CONFLICT: "VALIDATION_REJECTED",
  OUT_OF_STOCK: "VALIDATION_REJECTED",
  INVALID_STATE_TRANSITION: "VALIDATION_REJECTED",
  PAYMENT_ALREADY_PROCESSED: "VALIDATION_REJECTED",
  QUOTE_NOT_READY: "VALIDATION_REJECTED",
  PRICING_RULE_NOT_APPROVED: "VALIDATION_REJECTED",
  UNAUTHORIZED: "AUTHORIZATION_REJECTED",
  FORBIDDEN: "AUTHORIZATION_REJECTED",
  ORIGIN_NOT_ALLOWED: "AUTHORIZATION_REJECTED",
  LOCAL_SETUP_DISABLED: "AUTHORIZATION_REJECTED",
  RATE_LIMITED: "RATE_LIMITED",
  RESOURCE_BUSY: "RATE_LIMITED",
  AUTH_UNAVAILABLE: "PROVIDER_REJECTED",
  CUSTOMER_AUTH_UNAVAILABLE: "PROVIDER_REJECTED",
  PROVIDER_UNAVAILABLE: "PROVIDER_REJECTED",
  SHIPPING_PROVIDER_UNAVAILABLE: "PROVIDER_REJECTED",
  PAYMENT_VERIFICATION_FAILED: "PROVIDER_REJECTED",
  INTERNAL_ERROR: "CODE_DEFECT",
};

export function failureKindForErrorCode(code: ErrorCode): FailureKind {
  return FAILURE_KIND_BY_ERROR_CODE[code];
}

const MAX_CAUSE_DEPTH = 5;

const DATABASE_ERROR_CODES: ReadonlySet<string> = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a connection from the pool
  "ECONNREFUSED",
  "ETIMEDOUT",
]);

const DATABASE_ERROR_NAMES: ReadonlySet<string> = new Set([
  "PrismaClientInitializationError",
]);

const DATABASE_MESSAGE_PATTERN =
  /can'?t reach database server|connection terminated|timed out fetching a new connection|server has closed the connection|\bECONNREFUSED\b|\bETIMEDOUT\b/i;

const TIMEOUT_ERROR_NAMES: ReadonlySet<string> = new Set([
  "AbortError",
  "TimeoutError",
]);

const TIMEOUT_ERROR_CODES: ReadonlySet<string> = new Set([
  "ABORT_ERR",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

type Signals = { database: boolean; timeout: boolean };

function readString(source: object, key: string): string | undefined {
  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" ? value : undefined;
}

/**
 * Membaca sinyal dari satu error dan rantai `cause`-nya. Pesan mentah hanya
 * dicocokkan dengan pola dan tidak pernah disimpan atau dikembalikan.
 */
function collectSignals(error: unknown): Signals {
  const signals: Signals = { database: false, timeout: false };
  const visited = new Set<object>();
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== "object" || current === null) break;
    if (visited.has(current)) break;
    visited.add(current);

    const name = readString(current, "name");
    const code = readString(current, "code");
    const message = readString(current, "message");

    if (name !== undefined && TIMEOUT_ERROR_NAMES.has(name)) {
      signals.timeout = true;
    }
    if (code !== undefined && TIMEOUT_ERROR_CODES.has(code)) {
      signals.timeout = true;
    }
    if (
      (name !== undefined && DATABASE_ERROR_NAMES.has(name)) ||
      (code !== undefined && DATABASE_ERROR_CODES.has(code)) ||
      (message !== undefined && DATABASE_MESSAGE_PATTERN.test(message))
    ) {
      signals.database = true;
    }

    current = Reflect.get(current, "cause");
  }

  return signals;
}

/**
 * Mengklasifikasi nilai yang dilempar menjadi `FailureKind`. Total: menerima
 * nilai apa pun (termasuk `null`, string, simbol, objek dengan getter yang
 * melempar) dan tidak pernah melempar. Nilai yang tidak dikenali menjadi
 * `CODE_DEFECT`.
 *
 * Catatan: `ECONNREFUSED`/`ETIMEDOUT` dibaca sebagai kegagalan database. Sinyal
 * `AbortError`/`TimeoutError` lebih dulu dianggap timeout provider, karena
 * itulah yang dilempar `AbortSignal` pada panggilan `fetch` ke provider.
 */
export function classifyUnknownError(error: unknown): FailureKind {
  try {
    if (isAppError(error)) {
      const kind: FailureKind | undefined = FAILURE_KIND_BY_ERROR_CODE[error.code];
      return kind ?? "CODE_DEFECT";
    }

    const signals = collectSignals(error);
    if (signals.timeout) return "PROVIDER_TIMEOUT";
    if (signals.database) return "DATABASE_UNAVAILABLE";
    return "CODE_DEFECT";
  } catch {
    return "CODE_DEFECT";
  }
}
