import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { UserRoundPlus } from "lucide-react";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessManagementService } from "@/modules/admin-auth/access-management-service";
import { PrismaAdminAccessManagementRepository } from "@/modules/admin-auth/access-management-repository";
import { DeactivateAdminButton } from "./deactivate-button";

export const metadata: Metadata = { title: "Admin & Akses · Niuva", robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminAccessPage() {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "ADMIN_PROFILE_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  let data;
  try {
    data = await new AdminAccessManagementService(new PrismaAdminAccessManagementRepository()).list(gate.access);
  } catch (error) {
    return <AdminDataUnavailableView active="admins" kind={recordAdminPageFailure(error, "page:/admin/admins", { op: "list" })} role={gate.access.profile.role} />;
  }
  return <AdminShell active="admins" role={gate.access.profile.role}>
    <main id="main-content" className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader title="Admin & Akses" description="Kelola akun operasional dan undangan. Hanya Owner yang dapat menambah atau menonaktifkan Admin." breadcrumbs={[{ label: "Admin & Akses" }]} actions={<Link href="/admin/admins/new" className={buttonVariants({ variant: "default", className: "inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })}><UserRoundPlus aria-hidden="true" className="size-4" />Undang Admin</Link>} />
      <Card as="section" aria-labelledby="admin-accounts-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="admin-accounts-title" className="text-lg font-semibold">Akun tim</h2><p className="text-xs text-muted-foreground">{data.accounts.length} akun terdaftar</p></div>
        <ul className="mt-4 divide-y divide-border">
          {data.accounts.map((account) => <li key={account.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{account.displayName}</strong><Badge variant="outline" className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">{account.role === "OWNER" ? "Owner" : "Admin"}</Badge><Badge variant="outline" aria-live="polite" className={`rounded-full px-2 py-0.5 text-xs font-medium ${account.isActive ? "bg-success-background text-success-icon" : "bg-muted text-muted-foreground"}`}>{account.isActive ? "Aktif" : "Nonaktif"}</Badge></div><p className="mt-1 break-all text-xs text-muted-foreground">{account.email ?? "Email belum terhubung"} · MFA {account.mfaEnabled ? "aktif" : "belum aktif"}</p></div>
            {account.role === "ADMIN" && account.isActive ? <DeactivateAdminButton adminId={account.id} displayName={account.displayName} /> : null}
          </li>)}
        </ul>
      </Card>
      <Card as="section" aria-labelledby="admin-invitations-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6"><h2 id="admin-invitations-title" className="text-lg font-semibold">Undangan</h2><p className="mt-1 text-sm text-muted-foreground">Status pengiriman dan batas berlaku undangan yang belum diterima.</p>
        {data.invitations.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Belum ada undangan yang menunggu.</p> : <ul className="mt-4 divide-y divide-border">{data.invitations.map((invitation) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={invitation.id}><div className="min-w-0"><strong className="text-sm">{invitation.displayName}</strong><p className="mt-1 break-all text-xs text-muted-foreground">{invitation.email}</p></div><div className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{invitation.expiresAt < new Date() ? "Kedaluwarsa" : invitation.status === "FAILED" ? "Gagal dikirim" : invitation.status === "SENT" ? "Terkirim" : "Diproses"}</span><span className="block">Berlaku sampai {dateFormat.format(invitation.expiresAt)}</span></div></li>)}</ul>}
      </Card>
    </main>
  </AdminShell>;
}
