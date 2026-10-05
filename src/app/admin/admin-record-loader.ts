import { unstable_rethrow } from "next/navigation";

import { classifyUnknownError } from "@/lib/observability/classify";
import type { FailureKind } from "@/lib/observability/logger";
import { isAppError } from "@/modules/shared/errors";

export type AdminRecordResult<T> =
  | { status: "found"; record: T }
  | { status: "not-found" }
  | { status: "unavailable"; kind: FailureKind };

/**
 * Tri-state loader for admin detail records. It separates "the record does not
 * exist" (`null` or AppError NOT_FOUND) from "the read failed" (any other
 * throw), which the old `try/catch -> null` pattern merged.
 *
 * Only `null` means not-found; falsy values such as `0`, `""` and `{}` are
 * real records. Never throws, except for Next.js control-flow errors.
 *
 * `unavailable` carries the `FailureKind` so the view can pick cause-specific
 * copy. The kind is a closed enum; the raw error is never returned.
 */
export async function loadAdminRecord<T>(
  read: () => Promise<T | null>,
): Promise<AdminRecordResult<T>> {
  try {
    const record = await read();
    if (record === null) return { status: "not-found" };
    return { status: "found", record };
  } catch (error) {
    // Must run first so redirect()/notFound()/dynamic-API signals are not swallowed.
    unstable_rethrow(error);
    if (isAppError(error) && error.code === "NOT_FOUND") {
      return { status: "not-found" };
    }
    return { status: "unavailable", kind: classifyUnknownError(error) };
  }
}
