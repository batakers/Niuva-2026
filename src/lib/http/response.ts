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

export function apiError(
  error: unknown,
  correlationId = createCorrelationId(),
): Response {
  const appError = toAppError(error);
  const headers = createResponseHeaders(correlationId);
  const retryAfterSeconds = appError.details?.retryAfterSeconds;

  if (appError.code === "RATE_LIMITED" && retryAfterSeconds !== undefined) {
    headers.set("retry-after", retryAfterSeconds);
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
