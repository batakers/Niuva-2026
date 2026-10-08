import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { connection } from "next/server";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminSecurityForm } from "@/components/niuva/admin-security-form";
import { AdminShell } from "@/components/niuva/admin-shell";

export default async function AdminSecurityPage() {
  await connection();
  const access = await loadAdminPageAccess();
  if (access.kind === "denied") return <AdminAccessView state={access.state} />;
  return <AdminShell active="account" role={access.access.profile.role}><main id="main-content" className="mx-auto max-w-3xl space-y-6">
    <AdminPageHeader title="Keamanan akun Admin" description="Kelola password dan kode pemulihan akun Anda. Simpan kode pemulihan terpisah dari perangkat authenticator." returnHref="/admin/account" breadcrumbs={[{ label: "Akun saya", href: "/admin/account" }, { label: "Keamanan" }]} />
    <AdminSecurityForm/>
  </main></AdminShell>;
}
