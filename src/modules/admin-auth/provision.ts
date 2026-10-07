import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { requiresAdminProfileUpdate, type AdminProvisioningInput } from "../admin/provisioning";

/** Trusted Owner/CLI operation only. Never expose this as public signup or infer an identity from Customer data. */
export async function provisionAdminIdentity(prisma: PrismaClient, input: AdminProvisioningInput, allowProfileUpdate = false) {
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async tx => {
    if (input.profileId) await tx.$queryRaw`SELECT "id" FROM "admin_profiles" WHERE "id" = ${input.profileId}::uuid FOR UPDATE`;
    const existingUser = await tx.adminAuthUser.findUnique({ where: { email: input.email }, include: { profile: true } });
    const profile = input.profileId ? await tx.adminProfile.findUniqueOrThrow({ where: { id: input.profileId } }) : existingUser?.profile ?? null;
    if (existingUser && (!profile || existingUser.profile?.id !== profile.id)) throw new Error("Identitas sudah terdaftar pada profil lain. Mapping otomatis tidak diizinkan.");
    if (profile?.authUserId && profile.authUserId !== existingUser?.id) throw new Error("Profil sudah terhubung ke identitas lain.");
    if (requiresAdminProfileUpdate(profile, input) && !allowProfileUpdate) throw new Error("Perubahan profil memerlukan ADMIN_PROFILE_ALLOW_UPDATE=YES.");
    const newUserId = randomUUID();
    const user = existingUser ?? await tx.adminAuthUser.create({ data: { id: newUserId, name: input.displayName, email: input.email, emailVerified: false, accounts: { create: { id: randomUUID(), accountId: newUserId, providerId: "credential", password: passwordHash } } } });
    const result = profile ? await tx.adminProfile.update({ where: { id: profile.id }, data: { authUserId: user.id, displayName: input.displayName, role: input.role, isActive: true } }) : await tx.adminProfile.create({ data: { authUserId: user.id, displayName: input.displayName, role: input.role, isActive: true } });
    if (existingUser && requiresAdminProfileUpdate(profile, input)) await tx.adminAuthSession.deleteMany({ where: { userId: user.id } });
    return { profileId: result.id, role: result.role, requiresEmailVerification: !user.emailVerified };
  });
}
