import { auth } from "@clerk/nextjs/server";

import { getServerCapabilities } from "@/lib/env/server";
import {
  PrismaAdminProfileRepository,
  type AdminProfileAccessRecord,
  type AdminProfileReader,
} from "@/modules/admin/repository";
import { appError } from "@/modules/shared/errors";

export type ClerkSession = Readonly<{
  userId: string | null;
}>;

export type AdminAccess = Readonly<{
  clerkUserId: string;
  profile: AdminProfileAccessRecord;
}>;

export type AdminAccessCapabilities = Pick<
  ReturnType<typeof getServerCapabilities>,
  "clerkAdmin" | "database"
>;

export function assertAdminAccessAvailable(
  capabilities: AdminAccessCapabilities,
): void {
  if (!capabilities.clerkAdmin || !capabilities.database) {
    throw appError("AUTH_UNAVAILABLE");
  }
}

export async function requireAdminForSession(
  session: ClerkSession,
  profiles: AdminProfileReader,
): Promise<AdminAccess> {
  if (session.userId === null) {
    throw appError("UNAUTHORIZED");
  }

  const profile = await profiles.findByClerkUserId(session.userId);

  if (profile === null || !profile.isActive) {
    throw appError("FORBIDDEN");
  }

  return {
    clerkUserId: session.userId,
    profile,
  };
}

export async function requireAdmin(): Promise<AdminAccess> {
  assertAdminAccessAvailable(getServerCapabilities());

  const session = await auth();

  return requireAdminForSession(
    { userId: session.userId ?? null },
    new PrismaAdminProfileRepository(),
  );
}
