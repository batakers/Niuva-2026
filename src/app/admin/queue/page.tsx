import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminActionQueueErrorView, AdminActionQueueView } from "@/app/admin/action-queue-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
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
  const access = await loadAdminPageAccess();
  if (access === null) return <AdminAccessUnavailableView />;

  const group = parseActionQueueGroup((await searchParams).group);
  const result = await loadQueue(group);
  if (result === null) return <AdminActionQueueErrorView role={access.profile.role} />;
  return <AdminActionQueueView result={result} role={access.profile.role} />;
}

async function loadQueue(group: ReturnType<typeof parseActionQueueGroup>) {
  try {
    return await new ActionQueueService().list(group);
  } catch {
    return null;
  }
}
