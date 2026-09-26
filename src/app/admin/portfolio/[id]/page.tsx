import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import { replacePortfolioMediaAction, updatePortfolioAction } from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, type AdminPortfolioDetail } from "@/modules/admin/operations";
import { isApprovedCardOnlyPortfolioProject } from "@/modules/portfolio/public-content";

export const metadata: Metadata = { title: "Portfolio detail admin · Niuva", robots: { follow: false, index: false } };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminPortfolioDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const project = await loadProject(access, id);
  if (project === null) return <AdminDataUnavailableView active="portfolio" role={access.profile.role} title="Detail portfolio belum dapat dimuat" />;
  const isCardOnly = isApprovedCardOnlyPortfolioProject(project);

  return (
    <AdminShell active="portfolio" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="portfolio-detail" id="main-content">
        <header className="border-b border-border pb-6"><Link className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/portfolio">← Kembali ke Portfolio</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">{project.serviceLabel}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{project.title}</h1><p className="mt-2 font-mono text-sm text-muted-foreground">{project.slug}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">{project.isPublished ? "Published" : "Draft"}</span>{isCardOnly ? <span className="rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-semibold text-muted-foreground">Card-only</span> : null}</div></div></header>

        <section aria-labelledby="portfolio-editor-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="portfolio-editor-title">Editor project proof</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{isCardOnly ? "Ini adalah Selected Works yang disetujui Owner. Ringkasan dan metadata tetap wajib; media serta narasi studi kasus dapat ditambahkan kemudian." : "Lengkapi konteks proyek dan pastikan izin publikasi client sudah disetujui Owner sebelum publish. Featured project wajib memiliki narasi dan minimal satu media."}</p><AdminActionForm action={updatePortfolioAction} className="mt-5" submitLabel="Simpan project"><input name="projectId" type="hidden" value={project.id} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Judul" name="title" required value={project.title} /><Field label="Slug" name="slug" required value={project.slug} /><Field label="Layanan" name="serviceLabel" required value={project.serviceLabel} /><Field label="Nama client (opsional)" name="clientName" value={project.clientName ?? ""} /></div><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-summary"><span>Ringkasan</span><textarea className={textareaClass} defaultValue={project.summary} id="portfolio-summary" name="summary" required rows={3} /></label><div className="grid gap-4 lg:grid-cols-3"><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-challenge"><span>Tantangan</span><textarea className={textareaClass} defaultValue={project.challenge} id="portfolio-challenge" name="challenge" required={!isCardOnly} rows={5} /></label><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-process"><span>Proses</span><textarea className={textareaClass} defaultValue={project.process} id="portfolio-process" name="process" required={!isCardOnly} rows={5} /></label><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-result"><span>Hasil</span><textarea className={textareaClass} defaultValue={project.result} id="portfolio-result" name="result" required={!isCardOnly} rows={5} /></label></div><div className="flex flex-wrap gap-5"><label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor="portfolio-featured"><input className="size-5 accent-primary" defaultChecked={project.isFeatured} id="portfolio-featured" name="isFeatured" type="checkbox" /><span>Featured</span></label><label className="inline-flex min-h-11 items-center gap-3 text-sm font-medium" htmlFor="portfolio-published"><input className="size-5 accent-primary" defaultChecked={project.isPublished} id="portfolio-published" name="isPublished" type="checkbox" /><span>Publish ke situs publik</span></label></div></AdminActionForm></section>

        <section aria-labelledby="portfolio-media-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="portfolio-media-title">Mapping media production</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Mapping hanya menerima key publik terkontrol seperti `media/portfolio/...`; alt text wajib untuk setiap media.</p><AdminActionForm action={replacePortfolioMediaAction} className="mt-5" submitLabel="Simpan mapping media"><input name="projectId" type="hidden" value={project.id} /><label className="grid gap-2 text-sm font-medium" htmlFor="portfolio-media-json"><span>Media JSON</span><textarea className={`${textareaClass} min-h-40 font-mono`} defaultValue={JSON.stringify(project.media, null, 2)} id="portfolio-media-json" name="mediaJson" required rows={8} /></label></AdminActionForm>{project.media.length === 0 ? <StatusNotice className="mt-5" tone="warning" title="Belum ada media" description={isCardOnly ? "Card-only tetap dapat published tanpa media. Tambahkan media nanti hanya jika aset dan provenance project sudah disetujui." : "Project tetap sebagai draft sampai minimal satu media production dipetakan."} /> : <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{project.media.map((media) => <li className="rounded-lg border border-border px-3 py-2" key={media.id}><span className="font-mono text-xs">{media.storageKey}</span><span className="mt-1 block text-muted-foreground">{media.altText}</span></li>)}</ul>}</section>

        <section aria-labelledby="publish-gate-title" className="rounded-xl border border-warning-border bg-warning-background p-5 sm:p-6"><h2 className="text-xl font-semibold text-warning" id="publish-gate-title">Gate publikasi</h2><p className="mt-2 text-sm leading-6 text-warning">{isCardOnly ? "Status card-only adalah keputusan publikasi Owner untuk kartu Selected Works. Ia tidak membutuhkan media untuk tampil sebagai ringkasan, tetapi tidak boleh dipromosikan menjadi studi kasus penuh tanpa bukti." : "Status published hanya membuktikan record lolos validasi teknis. Owner tetap perlu memastikan izin client, akurasi hasil, dan media production sebelum menayangkan bukti proyek."}</p><p className="mt-4 text-xs text-warning">Terakhir terbit: {project.publishedAt ? dateFormatter.format(project.publishedAt) : "Belum pernah"}</p></section>
      </main>
    </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> { try { return await requireAdmin(); } catch { return null; } }
async function loadProject(access: AdminAccess, id: string): Promise<AdminPortfolioDetail | null> { try { return await new AdminOperationsService({ authorize: async () => access }).getPortfolio(id); } catch { return null; } }
function Field({ label, name, required, value }: Readonly<{ label: string; name: string; required?: boolean; value: string }>) { return <label className="grid gap-2 text-sm font-medium" htmlFor={name}><span>{label}</span><input className={inputClass} defaultValue={value} id={name} name={name} required={required} type="text" /></label>; }
const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const textareaClass = "min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
