import type { ErrorCode } from "@/modules/shared/errors";

/**
 * Penyebab kegagalan dari sudut pandang operator. `ErrorCode` menjawab "apa
 * yang dilihat pemanggil"; `FailureKind` menjawab "apa penyebabnya".
 */
export type FailureKind =
  | "DATABASE_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_REJECTED"
  | "CODE_DEFECT"
  | "VALIDATION_REJECTED"
  | "AUTHORIZATION_REJECTED"
  | "RATE_LIMITED";

export const FAILURE_KINDS = [
  "DATABASE_UNAVAILABLE",
  "PROVIDER_TIMEOUT",
  "PROVIDER_REJECTED",
  "CODE_DEFECT",
  "VALIDATION_REJECTED",
  "AUTHORIZATION_REJECTED",
  "RATE_LIMITED",
] as const satisfies readonly FailureKind[];

/**
 * Konteks aman: hanya string pendek (id, enum, nama route, angka sebagai
 * string). Jangan isi dengan email, nama, alamat, token, isi pesan, objek
 * request, header, body, atau row database.
 */
export type SafeContext = Readonly<Record<string, string>>;

export type FailureEvent = Readonly<{
  /** Contoh: "api:POST /api/uploads/intents", "page:/admin/orders". */
  boundary: string;
  correlationId: string;
  errorCode: ErrorCode;
  kind: FailureKind;
  occurredAt: Date;
  safeContext?: SafeContext;
}>;

export type FailureLogger = { record: (event: FailureEvent) => void };

const MAX_CONTEXT_ENTRIES = 10;
const MAX_CONTEXT_VALUE_LENGTH = 64;
export const MAX_BOUNDARY_LENGTH = 120;
export const MAX_CORRELATION_ID_LENGTH = 100;
const CONTEXT_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,39}$/;
const SENSITIVE_KEY_PATTERN =
  /token|secret|password|passwd|email|name|address|phone|cookie|authorization|signature|key|body|header|message|payload/i;

/**
 * Pertahanan terakhir untuk `safeContext`: tipe sudah membatasi bentuk, dan
 * fungsi ini membuang entri yang kuncinya terlihat sensitif atau nilainya
 * bukan token pendek tanpa spasi (mis. email atau kalimat bebas).
 */
export function sanitizeSafeContext(
  context: unknown,
): Record<string, string> | undefined {
  if (typeof context !== "object" || context === null) {
    return undefined;
  }

  const sanitized: Record<string, string> = {};
  let count = 0;

  try {
    for (const key of Object.keys(context)) {
      if (count >= MAX_CONTEXT_ENTRIES) break;
      if (!CONTEXT_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) {
        continue;
      }

      const value: unknown = Reflect.get(context, key);
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        value.length > MAX_CONTEXT_VALUE_LENGTH ||
        /[\s@]/.test(value)
      ) {
        continue;
      }

      sanitized[key] = value;
      count += 1;
    }
  } catch {
    // Getter/proxy yang melempar: buang seluruh konteks, jangan bocorkan sebagian.
    return undefined;
  }

  return count === 0 ? undefined : sanitized;
}

function toIsoTimestamp(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Logger konsol berstruktur (satu baris JSON per kejadian). Tidak pernah
 * melempar: kegagalan mencatat tidak boleh mengubah respons ke pengguna.
 */
export function createConsoleFailureLogger(): FailureLogger {
  return {
    record(event) {
      try {
        const safeContext = sanitizeSafeContext(event.safeContext);
        const line = JSON.stringify({
          event: "failure",
          boundary: String(event.boundary).slice(0, MAX_BOUNDARY_LENGTH),
          correlationId: String(event.correlationId).slice(
            0,
            MAX_CORRELATION_ID_LENGTH,
          ),
          errorCode: event.errorCode,
          kind: event.kind,
          occurredAt: toIsoTimestamp(event.occurredAt),
          ...(safeContext === undefined ? {} : { safeContext }),
        });
        console.error(line);
      } catch {
        // Mencatat log tidak boleh menjatuhkan request.
      }
    },
  };
}
