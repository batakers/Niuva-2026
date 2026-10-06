import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission, type AdminPermission } from "@/modules/admin/permissions";
import { isAppError } from "@/modules/shared/errors";

export const ADMIN_ACCESS_STATES = ["UNAUTHENTICATED", "FORBIDDEN", "AUTH_UNAVAILABLE"] as const;

export type AdminAccessState = (typeof ADMIN_ACCESS_STATES)[number];

export type AdminPageAccessResult =
  | Readonly<{ kind: "granted"; access: AdminAccess }>
  | Readonly<{ kind: "denied"; state: AdminAccessState }>;

/**
 * Maps an authorization failure to the exact admin access state.
 * Any other AppError, or a non-AppError value, returns null so the caller rethrows it.
 */
export function toAdminAccessState(error: unknown): AdminAccessState | null {
  if (!isAppError(error)) return null;

  switch (error.code) {
    case "UNAUTHORIZED":
      return "UNAUTHENTICATED";
    case "FORBIDDEN":
      return "FORBIDDEN";
    case "AUTH_UNAVAILABLE":
      return "AUTH_UNAVAILABLE";
    case "RESOURCE_BUSY":
      // Server busy is not an access decision; the caller rethrows it.
      return null;
    default:
      return null;
  }
}

export async function loadAdminPageAccess(
  options?: Readonly<{ permission?: AdminPermission }>,
): Promise<AdminPageAccessResult> {
  try {
    const access = await requireAdmin();
    if (options?.permission !== undefined) {
      requireAdminPermission(access, options.permission);
    }
    return { kind: "granted", access };
  } catch (error) {
    const state = toAdminAccessState(error);
    if (state !== null) return { kind: "denied", state };
    throw error;
  }
}
