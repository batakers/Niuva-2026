import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { Card } from "@/components/ui/card";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ShieldCheck } from "lucide-react";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminShell } from "@/components/niuva/admin-shell";
import { typographySystemTokens } from "@/design/typography";
import { isAdminSmtpConfigured } from "@/modules/admin-auth/mail";
import { AdminInvitationForm } from "./invitation-form";

export const metadata: Metadata = { title: "Tambah Admin · Niuva", robots: { index: false, follow: false } };
export default async function AddAdminPage() {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "ADMIN_PROFILE_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const mailReady = isAdminSmtpConfigured();
  return <AdminShell active="admins" role={gate.access.profile.role}>
    <main id="main-content" className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader title="Tambah Admin" description="Undang anggota tim untuk mengelola operasi Niuva. Setiap Admin menggunakan akun dan authenticator miliknya sendiri." breadcrumbs={[{ label: "Tambah Admin" }]} returnHref="/admin/admins" />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card as="section" aria-labelledby="invitation-heading" className="gap-0 py-0 ring-0 min-w-0 space-y-6 rounded-xl border border-border bg-card p-5 sm:p-8">
          <h2 id="invitation-heading" className={typographySystemTokens.subheading.className}>Kirim undangan</h2>
          {!mailReady && <div role="status" className="space-y-2 rounded-lg border border-warning-border bg-warning-background p-4 text-warning-icon"><p className="text-sm font-semibold">Email undangan belum tersedia</p><p className="text-sm leading-6">SMTP Admin belum dikonfigurasi. Minta pengelola menyiapkan layanan email agar undangan dapat dikirim.</p></div>}
          <AdminInvitationForm mailReady={mailReady} />
        </Card>
        <aside className="space-y-6 py-1" aria-labelledby="activation-heading">
          <h2 id="activation-heading" className="text-lg font-semibold">Setelah undangan dikirim</h2>
          <ol className="space-y-5 text-sm leading-6">
            <li className="space-y-1"><p className="font-medium">1. Buka email undangan</p><p className="text-muted-foreground">Penerima membuka tautan dalam 30 menit. Jika kedaluwarsa, kirim undangan baru dari halaman ini.</p></li>
            <li className="space-y-1"><p className="font-medium">2. Buat password pribadi</p><p className="text-muted-foreground">Password sepanjang 8–15 karakter dibuat langsung oleh penerima.</p></li>
            <li className="space-y-1"><p className="font-medium">3. Aktifkan authenticator</p><p className="text-muted-foreground">Setelah masuk, penerima memindai QR dan menyimpan kode pemulihan. Kode pertama membuka akses Dashboard.</p></li>
          </ol>
          <div className="flex items-start gap-3 border-t border-border pt-6"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm leading-6 text-muted-foreground">Hanya Owner yang dapat mengundang Admin. Akun baru mendapat peran Admin; pengaturan khusus Owner tetap terbatas.</p></div>
        </aside>
      </div>
    </main>
  </AdminShell>;
}
