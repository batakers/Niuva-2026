export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "INVALID_JSON",
  "REQUEST_TOO_LARGE",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "AUTH_UNAVAILABLE",
  "ORIGIN_NOT_ALLOWED",
  "NOT_FOUND",
  "CONFLICT",
  "OUT_OF_STOCK",
  "INVALID_STATE_TRANSITION",
  "PAYMENT_VERIFICATION_FAILED",
  "PAYMENT_ALREADY_PROCESSED",
  "PROVIDER_UNAVAILABLE",
  "SHIPPING_PROVIDER_UNAVAILABLE",
  "UPLOAD_REJECTED",
  "QUOTE_NOT_READY",
  "PRICING_RULE_NOT_APPROVED",
  "RATE_LIMITED",
  "LOCAL_SETUP_DISABLED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type ErrorDetails = Readonly<Record<string, string>>;

type ErrorDefinition = {
  message: string;
  status: number;
};

const ERROR_DEFINITIONS: Record<ErrorCode, ErrorDefinition> = {
  VALIDATION_ERROR: {
    message: "Data permintaan tidak valid.",
    status: 422,
  },
  INVALID_JSON: {
    message: "Data permintaan harus berupa JSON yang valid.",
    status: 400,
  },
  REQUEST_TOO_LARGE: {
    message: "Ukuran data permintaan melebihi batas yang diizinkan.",
    status: 413,
  },
  UNAUTHORIZED: {
    message: "Autentikasi diperlukan untuk tindakan ini.",
    status: 401,
  },
  FORBIDDEN: {
    message: "Anda tidak memiliki izin untuk tindakan ini.",
    status: 403,
  },
  AUTH_UNAVAILABLE: {
    message: "Layanan autentikasi admin belum tersedia.",
    status: 503,
  },
  ORIGIN_NOT_ALLOWED: {
    message: "Origin permintaan tidak diizinkan.",
    status: 403,
  },
  NOT_FOUND: {
    message: "Data yang diminta tidak ditemukan.",
    status: 404,
  },
  CONFLICT: {
    message: "Data tidak dapat diproses pada status saat ini.",
    status: 409,
  },
  OUT_OF_STOCK: {
    message: "Stok tidak mencukupi.",
    status: 409,
  },
  INVALID_STATE_TRANSITION: {
    message: "Perubahan status tidak diizinkan.",
    status: 409,
  },
  PAYMENT_VERIFICATION_FAILED: {
    message: "Pembayaran tidak dapat diverifikasi.",
    status: 422,
  },
  PAYMENT_ALREADY_PROCESSED: {
    message: "Notifikasi pembayaran sudah diproses.",
    status: 409,
  },
  PROVIDER_UNAVAILABLE: {
    message: "Layanan pendukung belum tersedia. Coba lagi nanti.",
    status: 503,
  },
  SHIPPING_PROVIDER_UNAVAILABLE: {
    message: "Layanan pengiriman sedang tidak tersedia.",
    status: 503,
  },
  UPLOAD_REJECTED: {
    message: "File tidak dapat diterima.",
    status: 422,
  },
  QUOTE_NOT_READY: {
    message: "Penawaran belum siap digunakan.",
    status: 409,
  },
  PRICING_RULE_NOT_APPROVED: {
    message: "Aturan harga belum disetujui.",
    status: 409,
  },
  RATE_LIMITED: {
    message: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi.",
    status: 429,
  },
  LOCAL_SETUP_DISABLED: {
    message: "Pengaturan ini hanya tersedia saat setup lokal.",
    status: 503,
  },
  INTERNAL_ERROR: {
    message: "Terjadi kesalahan internal. Coba lagi nanti.",
    status: 500,
  },
};

export type AppErrorOptions = {
  details?: ErrorDetails;
  message?: string;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;
  readonly status: number;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? ERROR_DEFINITIONS[code].message);
    this.name = "AppError";
    this.code = code;
    this.details = options.details;
    this.status = ERROR_DEFINITIONS[code].status;
  }
}

export function appError(
  code: ErrorCode,
  options?: AppErrorOptions,
): AppError {
  return new AppError(code, options);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  return isAppError(error) ? error : appError("INTERNAL_ERROR");
}
