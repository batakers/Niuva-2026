import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { isAppError } from "@/modules/shared/errors";

const accessFailureCodes = new Set(["AUTH_UNAVAILABLE", "FORBIDDEN", "UNAUTHORIZED"]);

export async function loadAdminPageAccess(): Promise<AdminAccess | null> {
  try {
    return await requireAdmin();
  } catch (error) {
    if (isAppError(error) && accessFailureCodes.has(error.code)) return null;
    throw error;
  }
}
