"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { getAdminInvitationService } from "@/modules/admin-auth/invitation-runtime";
import { isAppError } from "@/modules/shared/errors";

export type AdminInvitationState = Readonly<{ status: "idle" | "success" | "error"; message?: string; email?: string }>;
export async function inviteAdminAction(_previous: AdminInvitationState, formData: FormData): Promise<AdminInvitationState> {
  try {
    const access = await requireAdmin();
    requireAdminPermission(access, "ADMIN_PROFILE_MANAGE");
    const displayName = formData.get("displayName");
    const email = formData.get("email");
    await getAdminInvitationService().invite(access, { displayName, email: typeof email === "string" ? email.trim() : email });
    return { status: "success", email: typeof email === "string" ? email.trim().toLowerCase() : "", message: "Undangan sudah dikirim." };
  } catch (reason) {
    const error = toAppErrorLogged(reason, { boundary: "action:admin-invite" });
    return { status: "error", message: isAppError(reason) ? error.message : "Undangan belum dapat dikirim. Coba lagi beberapa saat lagi." };
  }
}
