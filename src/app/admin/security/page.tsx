import Link from "next/link";
import { connection } from "next/server";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminSecurityForm } from "@/components/niuva/admin-security-form";

export default async function AdminSecurityPage() {
  await connection();
  const access = await loadAdminPageAccess();
  if (access.kind === "denied") return <AdminAccessView state={access.state} />;
  return <main id="main-content" className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8"><div className="mx-auto max-w-3xl space-y-6">
    <Link href="/admin" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Kembali ke Dashboard</Link>
    <h1 className="text-3xl font-semibold">Keamanan akun Admin</h1>
    <p className="text-sm leading-6 text-muted-foreground">Kelola password dan kode pemulihan akun Anda. Simpan kode pemulihan terpisah dari perangkat authenticator.</p>
    <AdminSecurityForm/>
  </div></main>;
}
