import {
  AdminActionQueueErrorView,
  AdminActionQueueView,
} from "@/app/admin/action-queue-view";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { ActionQueueService } from "@/modules/admin/action-queue-service";
import { requireAdmin } from "@/lib/auth/clerk";
import { isAppError } from "@/modules/shared/errors";
import { connection } from "next/server";

const ADMIN_ACCESS_FAILURE_CODES = new Set([
  "AUTH_UNAVAILABLE",
  "FORBIDDEN",
  "UNAUTHORIZED",
]);

async function getAdminAccess() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (isAppError(error) && ADMIN_ACCESS_FAILURE_CODES.has(error.code)) {
      return null;
    }

    throw error;
  }
}

async function getAdminActionQueue() {
  try {
    return await new ActionQueueService().list();
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  await connection();

  const access = await getAdminAccess();

  if (access === null) {
    return <AdminAccessUnavailableView />;
  }

  const result = await getAdminActionQueue();

  if (result === null) {
    return <AdminActionQueueErrorView role={access.profile.role} />;
  }

  return (
    <AdminActionQueueView
      result={result}
      role={access.profile.role}
    />
  );
}
