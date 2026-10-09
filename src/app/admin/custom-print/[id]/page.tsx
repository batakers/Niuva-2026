import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadCustomPrintPageData } from "./custom-print-page-data";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import {
  downloadPrivateFileAction,
  reissueCustomPrintRequestTokenAction,
} from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { isEstimateCurrent } from "@/modules/custom-print/estimate";
import { readCustomerPreviewSnapshot } from "@/modules/custom-print/customer-preview";

export const metadata: Metadata = {
  title: "Custom print detail admin · Niuva",
  robots: { follow: false, index: false },
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const currencyFormatter = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });

export default async function AdminCustomPrintDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const requestResult = await loadCustomPrintPageData(id, access);
  if (requestResult.status === "not-found") notFound();
  if (requestResult.status === "unavailable") return <AdminDataUnavailableView active="custom-print" kind={requestResult.kind} role={access.profile.role} title="Detail custom print belum dapat dimuat" />;
  const { request, latestEstimate, linkedOrders } = requestResult.record;
  const returnTo = normalizeAdminReturnTo((await searchParams)?.returnTo, "/admin/custom-print");
  const review = request.review;
  const estimateCurrent = latestEstimate !== null && isEstimateCurrent(latestEstimate.snapshot, review?.updatedAt);
  const referenceLink = safeHttpsUrl(request.referenceLink);
  const customerPreview = readCustomerPreviewSnapshot(request.customerPreviewSnapshot);

  return (
    <AdminShell active="custom-print" role={access.profile.role}>
      <main className="space-y-8" data-admin-surface="custom-print-detail" id="main-content">
        <AdminPageHeader title="Custom Print Review" description={`${request.referenceNumber} · ${formatStatus(request.status)} · diperbarui ${dateFormatter.format(request.updatedAt)}`} returnHref={returnTo} returnLabel="Kembali ke Custom Print" breadcrumbs={[{ label: "Custom Print", href: returnTo }, { label: request.referenceNumber }]} actions={<Link className={buttonVariants({ variant: "default", className: "inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })} href={withAdminReturnTo(`/admin/custom-print/${id}/review?step=review`, returnTo)}>Buka Review & Quote</Link>} />

        <Card as="section" aria-labelledby="request-summary-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="request-summary-title">Permintaan & lampiran</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Customer" value={`${request.customerName} · ${request.customerEmail}`} />
            <Info label="Telepon" value={request.customerPhone} />
            <Info label="Material / warna" value={`${request.materialRequested}${request.colorRequested ? ` · ${request.colorRequested}` : ""}`} />
            <Info label="Jumlah" value={`${request.quantity} unit`} />
            <Info label="Kondisi awal" value={request.intakeMode === "REFERENCE_ONLY" ? "Baru punya referensi" : "Model siap"} />
            <Info label="Model 3D/CAD" value={request.modelReady ? "Tersedia dan terverifikasi" : "Belum tersedia"} />
            <Info label="Foto referensi" value={`${request.photoCount} foto privat`} />
            <Info label="Unit / skala" value={request.unitConfirmation ? formatStatus(request.unitConfirmation) : "Belum dikonfirmasi"} />
          </dl>
          {referenceLink ? <p className="mt-5 break-words border-t border-border pt-4 text-sm">Link referensi: <a className="font-medium text-brand-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={referenceLink} rel="noopener noreferrer" target="_blank">Buka referensi customer</a></p> : null}
          {request.notes ? <div className="mt-5 border-t border-border pt-4 text-sm leading-6"><p className="text-xs text-muted-foreground">Catatan customer</p><p className="mt-1 whitespace-pre-wrap">{request.notes}</p></div> : null}
          <div className="mt-5 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Lampiran terverifikasi</p>{request.files.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Tidak ada file terikat.</p> : <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{request.files.map((file) => <li className="rounded-lg border border-border px-3 py-2" key={file.id}><span className="font-medium">{file.originalName}</span><span className="mt-1 block text-xs text-muted-foreground">{file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)} · {formatStatus(file.status)}</span>{file.status === "VERIFIED" ? <AdminActionForm action={downloadPrivateFileAction} className="mt-3" submitLabel="Buat tautan unduh"><input name="fileId" type="hidden" value={file.id} /><input name="ownerId" type="hidden" value={request.id} /><input name="ownerType" type="hidden" value="CUSTOM_PRINT_REQUEST" /></AdminActionForm> : null}</li>)}</ul>}<p className="mt-3 text-xs text-muted-foreground">URL dan storage key file privat tidak ditampilkan di browser admin. Tautan unduh dibuat ulang dan kedaluwarsa dalam lima menit.</p></div>
        </Card>

        {customerPreview ? <Card as="section" aria-labelledby="customer-preview-title" className="gap-0 py-0 ring-0 rounded-xl border border-info-border bg-info-background p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-info" id="customer-preview-title">Simulasi biaya awal customer</h2>
          <p className="mt-2 text-sm leading-6 text-info">Angka ini dinyatakan customer dari slicer sendiri. Operator belum memverifikasi berat, durasi, konfigurasi, atau biaya pekerjaan.</p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Material / filamen" value={`${customerPreview.input.material} · stok Niuva`} />
            <Info label="Berat per unit" value={`${customerPreview.input.weightGramsPerUnit} g`} />
            <Info label="Durasi per unit" value={`${customerPreview.input.printDurationSecondsPerUnit} detik`} />
            <Info label="Jumlah" value={`${customerPreview.input.quantity} unit`} />
            <Info label="File" value={`${customerPreview.fileExtension.toUpperCase()} · ${customerPreview.fileId}`} />
            <Info label="Rule saat submit" value={`${customerPreview.pricingRule.code} v${customerPreview.pricingRule.version}`} />
            <Info label="Material + mesin" value={`Rp ${customerPreview.result.materialSubtotalRp} + Rp ${customerPreview.result.machineSubtotalRp}`} />
            <Info label="Total komponen indikatif" value={`Rp ${customerPreview.result.finalTotalRp}`} />
          </dl>
        </Card> : null}

        <Card as="section" aria-labelledby="request-access-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="request-access-title">Akses status privat customer</h2>
          {request.customerId === null ? <><p className="mt-2 text-sm leading-6 text-muted-foreground">Jika customer kehilangan tautan, verifikasi identitas melalui proses manual sebelum menerbitkan token baru. Token lama langsung tidak berlaku. Tautan baru dibagikan manual; tidak ada pesan otomatis.</p>
          <AdminActionForm action={reissueCustomPrintRequestTokenAction} className="mt-5" confirmMessage="Token lama akan langsung dicabut. Identitas customer sudah diverifikasi secara manual?" submitLabel="Terbitkan ulang tautan request" successLinkLabel="Buka tautan request baru">
            <input name="requestId" type="hidden" value={request.id} />
            <Label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 size-4" name="identityVerified" required type="checkbox" value="yes" /><span>Saya sudah memverifikasi identitas customer melalui proses manual.</span></Label>
          </AdminActionForm></> : <p className="mt-2 text-sm leading-6 text-muted-foreground">Request ini dimiliki akun Customer. Status dan keputusan quote tersedia di akun; token lama tidak dapat diterbitkan ulang.</p>}
        </Card>
        <Card as="section" aria-labelledby="review-summary-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 id="review-summary-title" className="text-xl font-semibold">Hasil review dan estimasi</h2>
          {review ? <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3"><Info label="Berat terverifikasi" value={`${review.verifiedWeightG} g`} /><Info label="Durasi print" value={`${review.printDurationSeconds} detik`} /><Info label="Material / jumlah" value={`${review.materialCode} · ${review.quantity} unit`} /></dl> : <p className="mt-3 text-sm text-muted-foreground">Belum ada review slicer operator.</p>}
          {latestEstimate ? <p className="mt-4 text-sm">Estimasi v{latestEstimate.version}: {currencyFormatter.format(BigInt(latestEstimate.lowerRp.toFixed(0)))}–{currencyFormatter.format(BigInt(latestEstimate.upperRp.toFixed(0)))}{estimateCurrent ? "" : " · Review berubah; perlu estimasi baru."} Ongkir tidak termasuk.</p> : <p className="mt-3 text-sm text-muted-foreground">Belum ada estimasi terbit.</p>}
          <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/custom-print/${id}/review?step=estimate`, returnTo)}>Buka tahap estimasi</Link>
        </Card>
        <Card as="section" aria-labelledby="quote-history-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 id="quote-history-title" className="text-xl font-semibold">Riwayat quote</h2>
          {request.quotes.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Belum ada quote untuk request ini.</p> : <ul className="mt-4 grid gap-3">{request.quotes.map(quote => <li className="rounded-lg border border-border p-4" key={quote.id}><p className="font-mono text-sm font-semibold">{quote.quoteNumber} · v{quote.version}</p><p className="mt-2 text-sm">{formatStatus(quote.status)} · {currencyFormatter.format(BigInt(quote.finalTotalRp))}</p></li>)}</ul>}
          <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/custom-print/${id}/review?step=quote`, returnTo)}>Buka tahap quote</Link>
        </Card>
        <Card as="section" aria-labelledby="linked-orders-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 id="linked-orders-title" className="text-xl font-semibold">Order terkait</h2>
          {linkedOrders.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Belum ada order dari quote request ini.</p> : <ul className="mt-3 grid gap-2">{linkedOrders.map(order => <li key={order.id}><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={withAdminReturnTo(`/admin/orders/${order.id}`, returnTo)}>{order.orderNumber} · {formatStatus(order.status)}</Link><div className="flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={`/admin/finance/invoices/new?kind=ORDER_TOTAL&sourceId=${order.id}`}>Invoice produksi</Link><Link className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={`/admin/finance/invoices/new?kind=CUSTOM_SHIPPING&sourceId=${order.id}`}>Invoice ongkir final</Link></div></li>)}</ul>}
        </Card>
      </main>
    </AdminShell>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>; }
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function formatBytes(value: string): string { const bytes = Number(value); if (!Number.isFinite(bytes)) return `${value} byte`; if (bytes < 1024) return `${bytes} byte`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
function safeHttpsUrl(value: string | null): string | null { if (!value) return null; try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; } }
