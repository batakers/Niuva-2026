import { classifyUnknownError } from "@/lib/observability/classify";
import {
  createConsoleFailureLogger,
  type FailureKind,
  type FailureLogger,
} from "@/lib/observability/logger";
import {
  toAppError,
  type ErrorCode,
  type ErrorDetails,
} from "@/modules/shared/errors";

export const CORRELATION_ID_HEADER = "x-correlation-id";

type ApiResponseOptions = {
  correlationId?: string;
  headers?: HeadersInit;
  status?: number;
};

type ApiErrorBody = {
  code: ErrorCode;
  correlationId: string;
  error: string;
  fields?: ErrorDetails;
};

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

function createResponseHeaders(
  correlationId: string,
  headers?: HeadersInit,
): Headers {
  const responseHeaders = new Headers(headers);
  responseHeaders.set(CORRELATION_ID_HEADER, correlationId);

  return responseHeaders;
}

export function apiSuccess<T>(
  body: T,
  { correlationId = createCorrelationId(), headers, status = 200 }: ApiResponseOptions = {},
): Response {
  return Response.json(body, {
    headers: createResponseHeaders(correlationId, headers),
    status,
  });
}

type ApiErrorOptions = {
  /** Nama boundary pendek, mis. "api:POST /api/checkout". Default: "api". */
  boundary?: string;
  /** Mengganti logger aktif hanya untuk panggilan ini (dipakai test). */
  logger?: FailureLogger;
};

const DEFAULT_API_BOUNDARY = "api";
const DEFAULT_BUSY_RETRY_AFTER_SECONDS = "5";

let activeFailureLogger: FailureLogger = createConsoleFailureLogger();

/** Mengganti logger kegagalan untuk modul ini. Pasangkan dengan `resetApiFailureLogger`. */
export function setApiFailureLogger(logger: FailureLogger): void {
  activeFailureLogger = logger;
}

export function resetApiFailureLogger(): void {
  activeFailureLogger = createConsoleFailureLogger();
}

/**
 * Mencatat kegagalan dengan correlation id yang sama dengan header dan body.
 * Tidak pernah melempar: logger yang rusak tidak boleh mengubah respons.
 */
function recordApiFailure(
  logger: FailureLogger,
  event: {
    boundary: string;
    correlationId: string;
    errorCode: ErrorCode;
    kind: FailureKind;
    status: number;
  },
): void {
  try {
    logger.record({
      boundary: event.boundary,
      correlationId: event.correlationId,
      errorCode: event.errorCode,
      kind: event.kind,
      occurredAt: new Date(),
      safeContext: { status: String(event.status) },
    });
  } catch {
    // Mencatat log tidak boleh mengubah respons ke pengguna.
  }
}

export function apiError(
  error: unknown,
  correlationId = createCorrelationId(),
  options: ApiErrorOptions = {},
): Response {
  // Klasifikasi dari error asli, sebelum toAppError meratakannya ke INTERNAL_ERROR.
  const kind = classifyUnknownError(error);
  const appError = toAppError(error);

  recordApiFailure(options.logger ?? activeFailureLogger, {
    boundary: options.boundary ?? DEFAULT_API_BOUNDARY,
    correlationId,
    errorCode: appError.code,
    kind,
    status: appError.status,
  });

  const headers = createResponseHeaders(correlationId);
  const retryAfterSeconds = appError.details?.retryAfterSeconds;

  if (appError.code === "RATE_LIMITED" && retryAfterSeconds !== undefined) {
    headers.set("retry-after", retryAfterSeconds);
  } else if (appError.code === "RESOURCE_BUSY") {
    headers.set("retry-after", retryAfterSeconds ?? DEFAULT_BUSY_RETRY_AFTER_SECONDS);
  }

  const body: ApiErrorBody = {
    code: appError.code,
    correlationId,
    error: appError.message,
    ...(appError.details === undefined ? {} : { fields: appError.details }),
  };

  return Response.json(body, {
    headers,
    status: appError.status,
  });
}
