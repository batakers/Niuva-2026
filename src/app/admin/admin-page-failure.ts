import { unstable_rethrow } from "next/navigation";

import { classifyUnknownError } from "@/lib/observability/classify";
import {
  type FailureKind,
  type FailureLogger,
  type SafeContext,
} from "@/lib/observability/logger";
import { createPersistentFailureLogger } from "@/lib/observability/persistent-logger";
import { isAppError, type ErrorCode } from "@/modules/shared/errors";

import { loadAdminRecord, type AdminRecordResult } from "./admin-record-loader";

/**
 * Failure recording for admin pages (task 3.7; reused by 3.8 and 3.9).
 *
 * Two entry points, both of which log BEFORE returning so the log line exists
 * by the time the "belum dapat dimuat" view is rendered:
 *
 * - `recordAdminPageFailure(error, boundary, safeContext?)` for list pages and
 *   other reads that catch a throw themselves. Returns the `FailureKind` to
 *   hand to `AdminDataUnavailableView`.
 * - `loadAdminRecordLogged(boundary, read, safeContext?)` for detail pages. Same
 *   tri-state result as `loadAdminRecord`; logs only the `unavailable` case.
 *
 * Neither logs success or not-found. Neither throws, except to re-raise Next.js
 * control-flow errors (`redirect()`, `notFound()`, dynamic-API signals).
 *
 * `boundary` is a short route name such as `"page:/admin/orders"`.
 * `safeContext` must hold only ids/enums (short strings, no spaces); it is
 * sanitised again by the logger. Never put error messages or records in it.
 */

const DEFAULT_BOUNDARY = "page:/admin";

let activeFailureLogger: FailureLogger = createPersistentFailureLogger();

/** Replaces the logger for this module (tests). Pair with `resetAdminPageFailureLogger`. */
export function setAdminPageFailureLogger(logger: FailureLogger): void {
  activeFailureLogger = logger;
}

export function resetAdminPageFailureLogger(): void {
  activeFailureLogger = createPersistentFailureLogger();
}

/**
 * Classifies `error`, writes one failure log line with a fresh correlation id,
 * and returns the `FailureKind`.
 *
 * Calls `unstable_rethrow(error)` first, so Next.js control-flow errors are
 * re-thrown instead of being logged or swallowed. Any other value is total:
 * a broken logger never changes the result.
 */
export function recordAdminPageFailure(
  error: unknown,
  boundary: string = DEFAULT_BOUNDARY,
  safeContext?: SafeContext,
): FailureKind {
  // Must run first so redirect()/notFound()/dynamic-API signals are not swallowed.
  unstable_rethrow(error);

  const kind = classifyUnknownError(error);
  const errorCode: ErrorCode = isAppError(error) ? error.code : "INTERNAL_ERROR";

  try {
    activeFailureLogger.record({
      boundary,
      correlationId: crypto.randomUUID(),
      errorCode,
      kind,
      occurredAt: new Date(),
      ...(safeContext === undefined ? {} : { safeContext }),
    });
  } catch {
    // Logging must never change what the operator sees.
  }

  return kind;
}

/**
 * `loadAdminRecord` plus failure logging. `not-found` (null or AppError
 * NOT_FOUND) and `found` are not logged; `unavailable` is logged once, before
 * this function resolves.
 */
export function loadAdminRecordLogged<T>(
  boundary: string,
  read: () => Promise<T | null>,
  safeContext?: SafeContext,
): Promise<AdminRecordResult<T>> {
  return loadAdminRecord(async () => {
    try {
      return await read();
    } catch (error) {
      if (!(isAppError(error) && error.code === "NOT_FOUND")) {
        recordAdminPageFailure(error, boundary, safeContext);
      }
      throw error;
    }
  });
}
