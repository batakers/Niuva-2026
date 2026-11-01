import { connection } from "next/server";
import { AdminShell } from "@/components/niuva/admin-shell";
import { Card } from "@/components/ui/card";
import { NativeInput } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/niuva/form-field";
import { portfolioServiceCategories } from "@/features/public/company-content";
import { AdminAccessView } from "../../admin-access-view";
import { loadAdminPageAccess } from "../../admin-page-access";
import { AdminPageHeader } from "../../admin-page-header";
import { AdminActionForm } from "../../admin-action-form";
import { createPortfolioDraftAction } from "../../content-create-actions";

export const metadata = { title: "Tambah project · Niuva", robots: { index: false, follow: false } };

export default async function NewPortfolioPage() {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  return <AdminShell active="portfolio" role={gate.access.profile.role}><main id="main-content" className="max-w-3xl">
    <AdminPageHeader title="Tambah project" description="Mulai dari informasi yang sudah tersedia. Lengkapi bukti, media, dan izin publikasi melalui editor." returnHref="/admin/portfolio" breadcrumbs={[{ label: "Portfolio", href: "/admin/portfolio" }, { label: "Tambah project" }]} />
    <Card as="section" className="p-5 sm:p-6">
      <h2 className="text-lg font-medium tracking-[-0.015em]">Informasi awal project</h2>
      <AdminActionForm action={createPortfolioDraftAction} submitLabel="Simpan draft project" successLinkLabel="Buka editor project" className="mt-5">
        <FormField id="new-project-title" label="Judul project" required><NativeInput name="title" required maxLength={240} /></FormField>
        <FormField id="new-project-slug" label="Tautan project" required description="Bagian alamat halaman project. Gunakan huruf kecil, angka, dan tanda hubung."><NativeInput name="slug" required maxLength={240} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></FormField>
        <FormField id="new-project-service" label="Layanan" required><NativeSelect name="serviceLabel" required defaultValue=""><option value="" disabled>Pilih layanan</option>{portfolioServiceCategories.map(label => <option key={label} value={label}>{label}</option>)}</NativeSelect></FormField>
        <FormField id="new-project-summary" label="Ringkasan project" required description="Gunakan fakta yang dapat didukung bukti; jangan menambahkan klaim client atau hasil yang belum disetujui."><Textarea name="summary" required rows={5} maxLength={2000} /></FormField>
      </AdminActionForm>
    </Card>
  </main></AdminShell>;
}
