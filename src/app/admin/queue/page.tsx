import type { Metadata } from "next";
import { connection } from "next/server";
import type { AdminAccess } from "@/lib/auth/admin";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminActionQueueErrorView, AdminActionQueueView } from "@/app/admin/action-queue-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { parseActionQueueGroup } from "@/modules/admin/action-queue";
import { ActionQueueService } from "@/modules/admin/action-queue-service";

export const metadata: Metadata = {
  title: "Action Queue Admin · Niuva",
  robots: { follow: false, index: false },
};

export default async function AdminQueuePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ group?: string | string[] }> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;

  const group = parseActionQueueGroup((await searchParams).group);
  const result = await loadQueue(group, access);
  if (result === null) return <AdminActionQueueErrorView role={access.profile.role} />;
  return <AdminActionQueueView result={result} role={access.profile.role} />;
}

async function loadQueue(group: ReturnType<typeof parseActionQueueGroup>, access: AdminAccess) {
  try {
    // Reuse the access already resolved by the page gate; the service still enforces its permission.
    return await new ActionQueueService({ authorize: async () => access }).list(group);
  } catch (error) {
    // AdminActionQueueErrorView takes no `kind`; it is left unchanged, so only the log is added.
    recordAdminPageFailure(error, "page:/admin/queue", { op: "list", group });
    return null;
  }
}
