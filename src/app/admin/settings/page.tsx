import Link from "next/link";
import { connection } from "next/server";
import { AdminShell } from "@/components/niuva/admin-shell";
import { AdminAccessView } from "../admin-access-view";
import { loadAdminPageAccess } from "../admin-page-access";

export default async function AdminSettingsPage() {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  if (gate.access.profile.role !== "OWNER") return <AdminAccessView state="FORBIDDEN" />;
  return <AdminShell active="settings" role="OWNER"><main id="main-content" className="space-y-6">
    <div><h1 className="text-3xl font-semibold tracking-tight">Pengaturan</h1><p className="mt-2 text-sm text-muted-foreground">Kelola akses tim dan kebijakan operasional Niuva.</p></div>
    <section className="divide-y divide-border rounded-xl border border-border bg-card" aria-label="Pengaturan Owner">
      <Link href="/admin/settings/custom-print-rates" className="block rounded-xl p-6 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><h2 className="font-semibold">Tarif Custom Print</h2><p className="mt-1 text-sm text-muted-foreground">Ubah tarif bahan dan waktu mesin, tinjau, lalu terapkan versi baru.</p></Link>
      <Link href="/admin/admins" className="block rounded-xl p-6 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><h2 className="font-semibold">Admin & Akses</h2><p className="mt-1 text-sm text-muted-foreground">Undang anggota tim, lihat status, dan nonaktifkan akses Admin.</p></Link>
      <Link href="/admin/finance/settings" className="block rounded-xl p-6 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><h2 className="font-semibold">Penagihan & Rekening</h2><p className="mt-1 text-sm text-muted-foreground">Atur identitas penerbit dan rekening Niuva untuk invoice.</p></Link>
      <Link href="/admin/privacy" className="block rounded-xl p-6 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><h2 className="font-semibold">Privasi Customer</h2><p className="mt-1 text-sm text-muted-foreground">Tinjau permintaan privasi dan penanganan data customer.</p></Link>
    </section>
  </main></AdminShell>;
}
