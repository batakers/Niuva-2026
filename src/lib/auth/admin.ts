import { headers } from "next/headers";
import { getServerCapabilities } from "@/lib/env/server";
import { getAdminAuth } from "@/lib/auth/admin-engine";
import { PrismaAdminProfileRepository, type AdminProfileAccessRecord, type AdminProfileReader } from "@/modules/admin/repository";
import { appError } from "@/modules/shared/errors";

export type AdminSession = Readonly<{ userId: string | null; mfaVerified?: boolean; twoFactorEnabled?: boolean }>;
export type AdminAccess = Readonly<{ authUserId: string; profile: AdminProfileAccessRecord }>;
export type AdminAccessCapabilities = Pick<ReturnType<typeof getServerCapabilities>, "adminAuth" | "database">;

export function assertAdminAccessAvailable(capabilities: AdminAccessCapabilities): void {
  if (!capabilities.adminAuth || !capabilities.database) throw appError("AUTH_UNAVAILABLE");
}

export async function requireAdminForSession(session: AdminSession, profiles: AdminProfileReader): Promise<AdminAccess> {
  if (session.userId === null || session.mfaVerified !== true || session.twoFactorEnabled !== true) throw appError("UNAUTHORIZED");
  const profile = await profiles.findByAuthUserId(session.userId);
  if (profile === null || !profile.isActive) throw appError("FORBIDDEN");
  return { authUserId: session.userId, profile };
}

export async function requireAdmin(): Promise<AdminAccess> {
  assertAdminAccessAvailable(getServerCapabilities());
  const session = await getAdminAuth().api.getSession({ headers: await headers() });
  return requireAdminForSession({ userId: session?.user.id ?? null, mfaVerified: session?.session.mfaVerified ?? false, twoFactorEnabled: session?.user.twoFactorEnabled ?? false }, new PrismaAdminProfileRepository());
}
