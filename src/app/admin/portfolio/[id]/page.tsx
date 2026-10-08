import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";
import { z } from "zod";

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminMediaEditor } from "@/app/admin/admin-media-editor";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { replacePortfolioMediaAction, updatePortfolioAction } from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AdminOperationsService } from "@/modules/admin/operations";
import { isApprovedCardOnlyPortfolioProject } from "@/modules/portfolio/public-content";

export const metadata: Metadata = { title: "Portfolio detail admin · Niuva", robots: { follow: false, index: false } };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminPortfolioDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const accessResult = await loadAdminPageAccess();
  if (accessResult.kind === "denied") return <AdminAccessView state={accessResult.state} />;
  const { access } = accessResult;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const service = new AdminOperationsService({ authorize: async () => access });
  const result = await loadAdminRecordLogged("page:/admin/portfolio/[id]", () => service.getPortfolio(id), { id, op: "detail" });
  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") return <AdminDataUnavailableView active="portfolio" kind={result.kind} role={access.profile.role} title="Detail portfolio belum dapat dimuat" />;
  const project = result.record;
  const returnTo = normalizeAdminReturnTo((await searchParams)?.returnTo, "/admin/portfolio");
  const isCardOnly = isApprovedCardOnlyPortfolioProject(project);

  return (
    <AdminShell active="portfolio" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="portfolio-detail" id="main-content">
        <AdminPageHeader title={project.title} description={`${project.slug} · ${project.isPublished ? "Published" : "Draft"}`} returnHref={returnTo} returnLabel="Kembali ke Portfolio" breadcrumbs={[{ label: "Portfolio", href: returnTo }, { label: project.title }]} />

        <section aria-labelledby="portfolio-editor-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="portfolio-editor-title">Informasi proyek</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{isCardOnly ? "Ini adalah Selected Works yang disetujui Owner. Ringkasan dan metadata tetap wajib; media serta narasi studi kasus dapat ditambahkan kemudian." : "Lengkapi konteks proyek dan pastikan izin publikasi client sudah disetujui Owner sebelum publish. Featured project wajib memiliki narasi dan minimal satu media."}</p><AdminActionForm action={updatePortfolioAction} className="mt-5" submitLabel="Simpan proyek"><input name="projectId" type="hidden" value={project.id} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Judul" name="title" required value={project.title} /><Field label="Slug" name="slug" required value={project.slug} /><Field label="Layanan" name="serviceLabel" required value={project.serviceLabel} /><Field label="Nama client (opsional)" name="clientName" value={project.clientName ?? ""} /></div><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-summary"><span>Ringkasan</span><textarea className={textareaClass} defaultValue={project.summary} id="portfolio-summary" name="summary" required rows={3} /></label><div className="grid gap-4 lg:grid-cols-3"><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-challenge"><span>Tantangan</span><textarea className={textareaClass} defaultValue={project.challenge} id="portfolio-challenge" name="challenge" required={!isCardOnly} rows={5} /></label><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-process"><span>Proses</span><textarea className={textareaClass} defaultValue={project.process} id="portfolio-process" name="process" required={!isCardOnly} rows={5} /></label><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-result"><span>Hasil</span><textarea className={textareaClass} defaultValue={project.result} id="portfolio-result" name="result" required={!isCardOnly} rows={5} /></label></div><div className="flex flex-wrap gap-5"><label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor="portfolio-featured"><input className="size-5 accent-primary" defaultChecked={project.isFeatured} id="portfolio-featured" name="isFeatured" type="checkbox" /><span>Featured</span></label><label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor="portfolio-published"><input className="size-5 accent-primary" defaultChecked={project.isPublished} id="portfolio-published" name="isPublished" type="checkbox" /><span>Publish ke situs publik</span></label></div></AdminActionForm></section>

        <section aria-labelledby="portfolio-media-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="portfolio-media-title">Foto portfolio</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Gunakan foto proyek yang sudah disetujui untuk publikasi. Tulis deskripsi yang menjelaskan isi setiap foto.</p><AdminActionForm action={replacePortfolioMediaAction} className="mt-5" submitLabel="Simpan foto"><input name="projectId" type="hidden" value={project.id} /><AdminMediaEditor label="Foto portfolio" media={project.media} /></AdminActionForm>{project.media.length === 0 ? <StatusNotice className="mt-5" tone="warning" title="Belum ada media" description={isCardOnly ? "Card-only tetap dapat published tanpa media. Tambahkan media nanti hanya jika aset dan provenance project sudah disetujui." : "Project tetap sebagai draft sampai minimal satu media production dipetakan."} /> : <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{project.media.map((media) => <li className="rounded-lg border border-border px-3 py-2" key={media.id}><span className="font-mono text-xs">{media.storageKey}</span><span className="mt-1 block text-muted-foreground">{media.altText}</span></li>)}</ul>}</section>

        <section aria-labelledby="publish-gate-title" className="rounded-xl border border-warning-border bg-warning-background p-5 sm:p-6"><h2 className="text-xl font-semibold text-warning" id="publish-gate-title">Persiapan publikasi</h2><p className="mt-2 text-sm leading-6 text-warning">{isCardOnly ? "Status card-only adalah keputusan publikasi Owner untuk kartu Selected Works. Ia tidak membutuhkan media untuk tampil sebagai ringkasan, tetapi tidak boleh dipromosikan menjadi studi kasus penuh tanpa bukti." : "Status published hanya membuktikan record lolos validasi teknis. Owner tetap perlu memastikan izin client, akurasi hasil, dan media production sebelum menayangkan bukti proyek."}</p><p className="mt-4 text-xs text-warning">Terakhir terbit: {project.publishedAt ? dateFormatter.format(project.publishedAt) : "Belum pernah"}</p></section>
      </main>
    </AdminShell>
  );
}

function Field({ label, name, required, value }: Readonly<{ label: string; name: string; required?: boolean; value: string }>) { return <label className="grid gap-2 text-sm font-medium" htmlFor={name}><span>{label}</span><input className={inputClass} defaultValue={value} id={name} name={name} required={required} type="text" /></label>; }
const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const textareaClass = "min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
