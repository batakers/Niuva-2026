import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Bell } from "lucide-react";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { AdminActivityTimelineService } from "@/modules/admin/activity-timeline";

export const metadata: Metadata = { title: "Aktivitas Admin · Niuva", robots: { index: false, follow: false } };
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminActivityPage({ searchParams }: Readonly<{ searchParams: Promise<{ page?: string | string[] }> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  let activity;
  try { activity = await new AdminActivityTimelineService().list(gate.access, (await searchParams).page); }
  catch (error) { return <AdminDataUnavailableView active="activity" kind={recordAdminPageFailure(error, "page:/admin/activity", { op: "list" })} role={gate.access.profile.role} />; }
  return <AdminShell active="activity" role={gate.access.profile.role}>
    <main id="main-content" className="mx-auto max-w-4xl space-y-6"><header><h1 className="mt-1 text-3xl font-semibold tracking-tight">Linimasa aktivitas</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Peristiwa operasional yang tercatat, terbaru lebih dulu. Buka record terkait untuk meninjau dan menindaklanjuti pekerjaan.</p></header>
      <section aria-labelledby="activity-title" className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6"><div className="flex items-center gap-2"><Bell aria-hidden="true" className="size-5 text-brand-700" /><h2 className="text-lg font-semibold" id="activity-title">Aktivitas terbaru</h2></div>
        {activity.items.length ? <ol className="mt-4 divide-y divide-border">{activity.items.map(item => <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0"><span className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.group} · {item.actor}</p></div><time className="text-xs text-muted-foreground" dateTime={item.createdAt.toISOString()}>{dateFormat.format(item.createdAt)}</time></div>{item.href ? <Link href={item.href} className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Buka {item.group}</Link> : null}</div></li>)}</ol> : <p className="mt-4 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>}
        <AdminPagination basePath="/admin/activity" hasNext={activity.hasNext} page={activity.page} />
      </section>
    </main>
  </AdminShell>;
}
