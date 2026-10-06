import type { AdminAccess } from "@/lib/auth/admin";
import { isLocalDemoMode } from "@/lib/env/server";
import { appError } from "@/modules/shared/errors";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

/**
 * Demo-only synthetic admin access for `/demo/action-queue`. Ids are clearly
 * fake and never match a real auth identity or AdminProfile. It is produced only
 * by `createDemoActionQueueAuthorizer` while `isLocalDemoMode()` is true.
 */
function syntheticDemoAdminAccess(): AdminAccess {
  return {
    authUserId: "demo-fake-auth-user",
    profile: {
      id: "demo-fake-admin-profile",
      authUserId: "demo-fake-auth-user",
      isActive: true,
      role: "ADMIN",
    },
  };
}

/**
 * Authorizer for ActionQueueService. Fails closed outside local demo mode; the
 * service still runs `requireAdminPermission(..., "AUDIT_READ")` on the result.
 */
export function createDemoActionQueueAuthorizer(
  source: EnvironmentSource = process.env,
): () => Promise<AdminAccess> {
  return async () => {
    if (!isLocalDemoMode(source)) {
      throw appError("UNAUTHORIZED");
    }

    return syntheticDemoAdminAccess();
  };
}
