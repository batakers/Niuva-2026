import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { parseActionQueueGroup } from "@/modules/admin/action-queue";

export const metadata: Metadata = {
  title: "Navigasi Admin · Niuva",
  robots: { follow: false, index: false },
};

export default async function AdminQueuePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ group?: string | string[] }> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const group = parseActionQueueGroup((await searchParams).group);
  const destination = group === "orders" ? "/admin/orders?view=needs-action" : group === "custom-print" ? "/admin/custom-print?view=needs-action" : group === "inquiries" ? "/admin/inquiries?view=needs-action" : "/admin";
  redirect(destination);
}
