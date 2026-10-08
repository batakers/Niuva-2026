import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { getPrismaClient } from "@/lib/db/prisma";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { recordAdminPageFailure } from "@/app/admin/admin-page-failure";

export const metadata: Metadata = { title: "Akun Admin · Niuva", robots: { index: false, follow: false } };

export default async function AdminAccountPage() {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  let account;
  try { account = await getPrismaClient().adminProfile.findUnique({ where: { id: gate.access.profile.id }, select: { displayName: true, authUser: { select: { name: true, email: true, twoFactorEnabled: true } } } }); }
  catch (error) { return <AdminDataUnavailableView active="account" kind={recordAdminPageFailure(error, "page:/admin/account", { op: "identity" })} role={gate.access.profile.role} />; }
  return <AdminShell active="account" role={gate.access.profile.role}><main className="mx-auto max-w-3xl space-y-6" id="main-content"><header><h1 className="mt-1 text-3xl font-semibold tracking-tight">Akun saya</h1><p className="mt-2 text-sm text-muted-foreground">Identitas akun yang digunakan untuk bekerja di Dashboard Niuva.</p></header><section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6"><h2 className="text-lg font-semibold">Profil</h2><dl className="mt-5 divide-y divide-border text-sm"><div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">Nama</dt><dd className="font-medium">{account?.displayName ?? account?.authUser?.name ?? "Admin Niuva"}</dd></div><div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">Email</dt><dd className="break-all font-medium">{account?.authUser?.email ?? "Belum terhubung"}</dd></div><div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">Peran</dt><dd className="font-medium">{gate.access.profile.role === "OWNER" ? "Owner" : "Admin"}</dd></div><div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted-foreground">Authenticator</dt><dd className="font-medium">{account?.authUser?.twoFactorEnabled ? "Aktif" : "Belum aktif"}</dd></div></dl><Link href="/admin/security" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Kelola keamanan akun</Link></section></main></AdminShell>;
}
