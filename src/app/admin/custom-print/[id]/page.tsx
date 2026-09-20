import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import {
  createQuoteDraftAction,
  recordCustomPrintReviewAction,
  reissueQuoteTokenAction,
  sendQuoteAction,
} from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import {
  AdminOperationsService,
  type AdminCustomPrintDetail,
} from "@/modules/admin/operations";

export const metadata: Metadata = {
  title: "Custom print detail admin · Niuva",
  robots: { follow: false, index: false },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const currencyFormatter = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });

export default async function AdminCustomPrintDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const [request, pricing, activeRule] = await Promise.all([
    loadRequest(access, id),
    loadPricing(access),
    loadActivePricing(access),
  ]);
  if (request === null) return <AdminDataUnavailableView role={access.profile.role} title="Detail custom print belum dapat dimuat" />;
  const review = request.review;
  const hasDraft = request.quotes.some((quote) => quote.status === "DRAFT");

  return (
    <AdminShell active="custom-print" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="custom-print-detail" id="main-content">
        <header className="border-b border-border pb-6">
          <Link className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/custom-print">← Kembali ke Custom Print</Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div><p className="font-mono text-sm text-muted-foreground">{request.referenceNumber}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Custom Print Review</h1><p className="mt-3 text-sm text-muted-foreground">{request.customerName} · diperbarui {dateFormatter.format(request.updatedAt)}</p></div>
            <span className="inline-flex rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">{formatStatus(request.status)}</span>
          </div>
        </header>

        <section aria-labelledby="request-summary-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="request-summary-title">Request & file privat</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Customer" value={`${request.customerName} · ${request.customerEmail}`} />
            <Info label="Telepon" value={request.customerPhone} />
            <Info label="Material / warna" value={`${request.materialRequested}${request.colorRequested ? ` · ${request.colorRequested}` : ""}`} />
            <Info label="Jumlah" value={`${request.quantity} unit`} />
          </dl>
          {request.notes ? <div className="mt-5 border-t border-border pt-4 text-sm leading-6"><p className="text-xs text-muted-foreground">Catatan customer</p><p className="mt-1 whitespace-pre-wrap">{request.notes}</p></div> : null}
          <div className="mt-5 border-t border-border pt-4"><p className="text-xs text-muted-foreground">File terverifikasi</p>{request.files.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Tidak ada file terikat.</p> : <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{request.files.map((file) => <li className="rounded-lg border border-border px-3 py-2" key={file.id}><span className="font-medium">{file.originalName}</span><span className="mt-1 block text-xs text-muted-foreground">{file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)} · {formatStatus(file.status)}</span></li>)}</ul>}<p className="mt-3 text-xs text-muted-foreground">URL dan storage key file privat tidak ditampilkan di browser admin.</p></div>
        </section>

        <section aria-labelledby="review-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="review-title">Review slicer operator</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Catat berat dan durasi yang sudah diverifikasi. Quantity harus sama dengan request agar quote dapat dihitung server.</p>
          <AdminActionForm action={recordCustomPrintReviewAction} className="mt-5" submitLabel="Simpan review slicer">
            <input name="requestId" type="hidden" value={request.id} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Berat terverifikasi (g)" name="verifiedWeightG" required type="text" value={review?.verifiedWeightG ?? ""} />
              <Field label="Durasi print (detik)" name="printDurationSeconds" required type="number" value={String(review?.printDurationSeconds ?? "")} />
              <Field label="Material code" name="materialCode" required type="text" value={review?.materialCode ?? request.materialRequested.toUpperCase()} />
              <Field label="Quantity" name="quantity" required type="number" value={String(review?.quantity ?? request.quantity)} />
            </div>
            <label className="grid gap-2 text-sm font-medium" htmlFor="review-notes"><span>Catatan review</span><textarea className={textareaClass} defaultValue={review?.notes ?? ""} id="review-notes" name="notes" rows={3} /></label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="review-config"><span>Konfigurasi JSON <span className="font-normal text-muted-foreground">(opsional)</span></span><textarea className={`${textareaClass} font-mono`} defaultValue={review?.configurationJson ? JSON.stringify(review.configurationJson, null, 2) : ""} id="review-config" name="configurationJson" rows={4} /></label>
          </AdminActionForm>
        </section>

        <section aria-labelledby="quote-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="quote-title">Quote & pricing rule</h2>
          {pricing === null ? <StatusNotice className="mt-4" tone="warning" title="Pricing rules belum dapat dimuat" description="Draft quote ditahan sampai daftar aturan harga dapat dibaca oleh admin." /> : activeRule === null ? <StatusNotice className="mt-4" tone="warning" title="Belum ada pricing rule aktif" description="Owner harus mengaktifkan rule yang disetujui sebelum operator membuat quote." /> : <>
            <div className="mt-4 rounded-lg border border-info-border bg-info-background p-4 text-sm"><p className="font-semibold text-info">Rule aktif: {activeRule.code} v{activeRule.version}</p><p className="mt-1 text-info">Quote akan menyimpan snapshot rule ini. Perubahan rule baru tidak mengubah quote yang sudah dikirim.</p></div>
            {review && !hasDraft && (request.status === "QUOTE_READY" || request.status === "QUOTE_SENT") ? <AdminActionForm action={createQuoteDraftAction} className="mt-5" submitLabel="Buat draft quote"><input name="requestId" type="hidden" value={request.id} /><input name="pricingRuleVersionId" type="hidden" value={activeRule.id} /><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium" htmlFor="quote-material"><span>Material</span><select className={inputClass} defaultValue={review.materialCode} id="quote-material" name="materialCode"><option value="PLA">PLA</option><option value="ABS">ABS</option></select></label><label className="grid gap-2 text-sm font-medium" htmlFor="filament-source"><span>Sumber filament</span><select className={inputClass} defaultValue="NIUVA_STOCK" id="filament-source" name="filamentSource"><option value="NIUVA_STOCK">Stok Niuva</option><option value="COMMUNAL">Komunal</option><option value="CUSTOMER_OWN">Punya customer</option></select></label></div><label className="grid gap-2 text-sm font-medium" htmlFor="quote-config"><span>Konfigurasi tambahan <span className="font-normal text-muted-foreground">(opsional)</span></span><textarea className={`${textareaClass} font-mono`} id="quote-config" name="configurationJson" rows={3} /></label></AdminActionForm> : <p className="mt-5 text-sm text-muted-foreground">{hasDraft ? "Draft quote sudah tersedia. Kirim draft tersebut atau terbitkan versi baru setelah workflow sebelumnya selesai." : "Simpan review slicer dan pastikan request berstatus Quote Ready sebelum membuat draft."}</p>}
          </>}

          <div className="mt-6 border-t border-border pt-5">
            {request.quotes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada quote untuk request ini.</p> : <div className="grid gap-3">{request.quotes.map((quote) => <article className="rounded-lg border border-border p-4" key={quote.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">{quote.quoteNumber} · v{quote.version}</p><p className="mt-1 text-xs text-muted-foreground">Dibuat {dateFormatter.format(quote.createdAt)}{quote.expiresAt ? ` · berlaku sampai ${dateFormatter.format(quote.expiresAt)}` : ""}</p></div><span className="rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">{formatStatus(quote.status)}</span></div><p className="mt-4 text-lg font-semibold tabular-nums">{currencyFormatter.format(BigInt(quote.finalTotalRp))}</p><div className="mt-4 flex flex-wrap gap-2">{quote.status === "DRAFT" ? <AdminActionForm action={sendQuoteAction} confirmMessage="Kirim quote ini ke customer? Setelah dikirim, snapshot quote menjadi immutable." submitLabel="Kirim quote"><input name="quoteId" type="hidden" value={quote.id} /><input name="requestId" type="hidden" value={request.id} /></AdminActionForm> : quote.status === "SENT" ? <AdminActionForm action={reissueQuoteTokenAction} confirmMessage="Terbitkan tautan quote baru dan cabut token lama?" submitLabel="Terbitkan ulang tautan"><input name="quoteId" type="hidden" value={quote.id} /><input name="requestId" type="hidden" value={request.id} /></AdminActionForm> : null}</div></article>)}</div>}
          </div>
        </section>
      </main>
    </AdminShell>
  );
}

async function loadAdminAccess(): Promise<AdminAccess | null> { try { return await requireAdmin(); } catch { return null; } }
async function loadRequest(access: AdminAccess, id: string): Promise<AdminCustomPrintDetail | null> { try { return await new AdminOperationsService({ authorize: async () => access }).getCustomPrintRequest(id); } catch { return null; } }
async function loadPricing(access: AdminAccess): Promise<Awaited<ReturnType<AdminOperationsService["listPricingRules"]>> | null> { try { return await new AdminOperationsService({ authorize: async () => access }).listPricingRules(); } catch { return null; } }
async function loadActivePricing(access: AdminAccess): Promise<Awaited<ReturnType<AdminOperationsService["getActivePricingRule"]>> | null> { try { return await new AdminOperationsService({ authorize: async () => access }).getActivePricingRule(); } catch { return null; } }
function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>; }
function Field({ label, name, required, type, value }: Readonly<{ label: string; name: string; required?: boolean; type: string; value: string }>) { return <label className="grid gap-2 text-sm font-medium" htmlFor={name}><span>{label}</span><input className={inputClass} defaultValue={value} id={name} name={name} required={required} type={type} /></label>; }
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function formatBytes(value: string): string { const bytes = Number(value); if (!Number.isFinite(bytes)) return `${value} byte`; if (bytes < 1024) return `${bytes} byte`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const textareaClass = "min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
