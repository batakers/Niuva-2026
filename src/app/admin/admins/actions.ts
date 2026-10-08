"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import { AdminAccessManagementService } from "@/modules/admin-auth/access-management-service";
import { PrismaAdminAccessManagementRepository } from "@/modules/admin-auth/access-management-repository";
import { isAppError } from "@/modules/shared/errors";

export type DeactivateAdminState = Readonly<{ status: "idle" | "success" | "error"; message?: string }>;

export async function deactivateAdminAction(_previous: DeactivateAdminState, formData: FormData): Promise<DeactivateAdminState> {
  try {
    const access = await requireAdmin();
    await new AdminAccessManagementService(new PrismaAdminAccessManagementRepository()).deactivate(access, { adminId: formData.get("adminId") });
    revalidatePath("/admin/admins");
    return { status: "success", message: "Akun Admin dinonaktifkan. Sesi aktifnya sudah dicabut." };
  } catch (reason) {
    const error = toAppErrorLogged(reason, { boundary: "action:admin-deactivate" });
    return { status: "error", message: isAppError(reason) ? error.message : "Akun belum dapat dinonaktifkan. Coba lagi." };
  }
}
