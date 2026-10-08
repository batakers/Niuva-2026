import { z } from "zod";
import type { AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { appError } from "@/modules/shared/errors";
import type { AdminAccessManagementRepository, ManagedAdminList } from "./access-management-repository";

const deactivateInput = z.object({ adminId: z.uuid() }).strict();

export class AdminAccessManagementService {
  constructor(private readonly repository: AdminAccessManagementRepository) {}

  async list(access: AdminAccess): Promise<ManagedAdminList> {
    requireAdminPermission(access, "ADMIN_PROFILE_MANAGE");
    if (!await this.repository.isActiveOwner(access.profile.id)) throw appError("FORBIDDEN");
    return this.repository.list();
  }

  async deactivate(access: AdminAccess, raw: unknown): Promise<void> {
    requireAdminPermission(access, "ADMIN_PROFILE_MANAGE");
    const parsed = deactivateInput.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR", { message: "Akun Admin yang dipilih tidak valid." });
    const targetId = parsed.data.adminId;
    if (targetId === access.profile.id) throw appError("FORBIDDEN", { message: "Akun Owner sendiri tidak dapat dinonaktifkan dari sini." });
    await this.repository.withLockedProfiles(access.profile.id, targetId, async (store) => {
      const owner = await store.findOwner(access.profile.id);
      if (!owner?.isActive || owner.role !== "OWNER") throw appError("FORBIDDEN");
      const target = await store.findTarget(targetId);
      if (target === null) throw appError("NOT_FOUND", { message: "Akun Admin tidak ditemukan." });
      if (target.role !== "ADMIN") throw appError("FORBIDDEN", { message: "Akun Owner tidak dapat dinonaktifkan dari sini." });
      if (!target.isActive) throw appError("CONFLICT", { message: "Akun Admin ini sudah nonaktif." });
      if (!await store.disable(target, access.profile.id)) throw appError("CONFLICT", { message: "Status akun berubah. Muat ulang daftar Admin." });
    });
  }
}
