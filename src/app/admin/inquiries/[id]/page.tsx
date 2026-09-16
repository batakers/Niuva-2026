import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import { transitionInquiryAction } from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, type AdminInquiryDetail } from "@/modules/admin/operations";
import { INQUIRY_TRANSITIONS } from "@/modules/inquiry/transitions";
import type { InquiryStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "B2B inquiry detail admin · Niuva", robots: { follow: false, index: false } };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminInquiryDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const inquiry = await loadInquiry(access, id);
  if (inquiry === null) return <AdminDataUnavailableView role={access.profile.role} title="Detail inquiry belum dapat dimuat" />;
  const current = inquiry.status as InquiryStatus;
  const nextStatuses = INQUIRY_TRANSITIONS[current] ?? [];

  return <AdminShell active="inquiries" role={access.profile.role}><main className="space-y-8" data-admin-surface="inquiry-detail" id="main-content"><header className="border-b border-border pb-6"><Link className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/inquiries">← Kembali ke B2B Inquiries</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-sm text-muted-foreground">{inquiry.referenceNumber}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Inquiry detail</h1><p className="mt-3 text-sm text-muted-foreground">Dibuat {dateFormatter.format(inquiry.createdAt)} · diperbarui {dateFormatter.format(inquiry.updatedAt)}</p></div><span className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">{formatStatus(inquiry.status)}</span></div></header><section aria-labelledby="inquiry-actions-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="inquiry-actions-title">Transition status</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Setiap transition mengikuti state machine inquiry dan dicatat ke audit log.</p><div className="mt-5 flex flex-wrap gap-2">{nextStatuses.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada transition lanjutan dari status ini.</p> : nextStatuses.map((next) => <AdminActionForm action={transitionInquiryAction} key={next} submitLabel={`Ubah ke ${formatStatus(next)}`}><input name="inquiryId" type="hidden" value={inquiry.id} /><input name="currentStatus" type="hidden" value={inquiry.status} /><input name="nextStatus" type="hidden" value={next} /></AdminActionForm>)}</div></section><div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><section aria-labelledby="inquiry-brief-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="inquiry-brief-title">Brief B2B</h2><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><Info label="Nama" value={inquiry.name} /><Info label="Perusahaan" value={inquiry.company ?? "Tidak dicantumkan"} /><Info label="Email" value={inquiry.email} /><Info label="Telepon" value={inquiry.phone} /><Info label="Layanan" value={inquiry.preferredService ?? "Belum dipilih"} /><Info label="Target quantity" value={inquiry.targetQuantity} /><Info label="Deadline" value={inquiry.targetDeadline ? dateFormatter.format(inquiry.targetDeadline) : "Belum ditentukan"} /><Info label="Budget" value={inquiry.budgetRange ?? "Belum ditentukan"} /></dl><div className="mt-5 grid gap-5 border-t border-border pt-5"><CopyBlock label="Tujuan proyek" value={inquiry.projectGoal} /><CopyBlock label="Deskripsi" value={inquiry.description} />{inquiry.referenceLink ? <p className="text-sm"><span className="block text-xs text-muted-foreground">Reference link</span><a className="mt-1 inline-block break-all text-brand-700 underline-offset-4 hover:underline" href={inquiry.referenceLink} rel="noreferrer" target="_blank">{inquiry.referenceLink}</a></p> : null}</div></section><section aria-labelledby="inquiry-files-title" className="rounded-xl border border-border bg-card p-5 sm:p-6"><h2 className="text-xl font-semibold" id="inquiry-files-title">Lampiran & consent</h2><p className="mt-4 text-sm leading-6">Confidentiality acknowledgment: <strong>{inquiry.confidentialityAck ? "dikonfirmasi" : "belum dikonfirmasi"}</strong></p>{inquiry.files.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Tidak ada file terikat.</p> : <ul className="mt-5 grid gap-2 text-sm">{inquiry.files.map((file) => <li className="rounded-lg border border-border px-3 py-2" key={file.id}><span className="font-medium">{file.originalName}</span><span className="mt-1 block text-xs text-muted-foreground">{file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)} · {formatStatus(file.status)}</span></li>)}</ul>}<StatusNotice className="mt-5" tone="info" title="Data customer hanya untuk operasi admin" description="File dan PII inquiry tidak pernah diterbitkan sebagai halaman publik." /></section></div></main></AdminShell>;
}

async function loadAdminAccess(): Promise<AdminAccess | null> { try { return await requireAdmin(); } catch { return null; } }
async function loadInquiry(access: AdminAccess, id: string): Promise<AdminInquiryDetail | null> { try { return await new AdminOperationsService({ authorize: async () => access }).getInquiry(id); } catch { return null; } }
function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>; }
function CopyBlock({ label, value }: Readonly<{ label: string; value: string }>) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{value}</p></div>; }
function formatBytes(value: string): string { const bytes = Number(value); if (!Number.isFinite(bytes)) return `${value} byte`; if (bytes < 1024) return `${bytes} byte`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
