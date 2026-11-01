import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { RefundCaseSummary } from "@/components/niuva/refund-case-summary";
import { refundOutcomeLabels } from "@/components/niuva/refund-case-summary";
import { RefundExecutionForm } from "@/components/niuva/refund-execution-form";
import { RefundWorkflowForm } from "@/components/niuva/refund-workflow-form";
import { Card } from "@/components/ui/card";
import { RefundService } from "@/modules/refund/service";
import { isAppError } from "@/modules/shared/errors";
import { executeRefundAction, reviewRefundAction } from "./actions";
import { StatusNotice } from "@/components/niuva/status-notice";

export const metadata: Metadata = { title: "Kasus refund · Admin Niuva", robots: { index: false, follow: false } };
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export default async function AdminRefundPage({ params }: PageProps<"/admin/orders/[id]/refund">) {
  await connection();
  const pageAccess = await loadAdminPageAccess({ permission: "FINANCE_READ" });
  if (pageAccess.kind === "denied") return <AdminAccessView state={pageAccess.state} />;
  const { access } = pageAccess, { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const service = new RefundService({ authorizeAdmin: async () => access });
  const result = await loadAdminRecordLogged("page:admin.refund", () => service.adminOrder(id).catch(error => { if (isAppError(error) && error.code === "NOT_FOUND") return null; throw error; }), { id, op: "detail" });
  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") return <AdminDataUnavailableView active="orders" role={access.profile.role} kind={result.kind} title="Kasus refund belum dapat dimuat" />;
  const view = result.record, path = `/admin/orders/${id}/refund`, owner = access.profile.role === "OWNER", refund = view.refund;
  return <AdminShell active="orders" role={access.profile.role}><main id="main-content" className="max-w-reading space-y-6" data-admin-surface="refund-review">
    <AdminPageHeader title="Kasus refund" description={`${view.orderNumber} · ${view.orderStatus}`} returnHref={`/admin/orders/${id}`} returnLabel="Kembali ke pesanan" breadcrumbs={[{ label: "Pesanan", href: "/admin/orders" }, { label: view.orderNumber, href: `/admin/orders/${id}` }, { label: "Refund" }]} />
    {view.accountClosed ? <StatusNotice description="Tindak lanjut memakai verifikasi pihak yang berwenang melalui nomor kasus ini." role="note" size="compact" title="Akun terkait sudah ditutup." tone="warning" /> : null}
    {refund ? <Card as="section" aria-labelledby="refund-summary-title" className="gap-5 p-5 sm:p-6"><h2 id="refund-summary-title" className="text-xl font-medium tracking-[-0.015em]">Pengajuan dan pembayaran</h2><RefundCaseSummary refund={refund} /></Card> : null}
    {view.eligibilityIssue ? <StatusNotice size="compact" title={view.eligibilityIssue} tone="warning" /> : null}
    {!refund && view.eligibleAmountRp ? <Card as="section" className="gap-0 p-5 sm:p-6"><h2 className="text-xl font-medium tracking-[-0.015em]">Catat pengajuan dari kanal layanan</h2><p className="mt-3 text-sm leading-6">Pembayaran server: <strong className="tabular-nums">{money.format(BigInt(view.eligibleAmountRp))}</strong>. Catat referensi verifikasi pembayar atau pihak yang berwenang sebelum menyimpan pengajuan.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "intake")} mode="intake" permalink={path} submissionKey={randomUUID()} /></Card> : null}
    {refund && view.snapshotChanged ? <StatusNotice description="Persetujuan atau pemrosesan harus ditinjau ulang." size="compact" title="Rincian pembayaran berubah sejak pengajuan." tone="warning" /> : null}
    {refund && owner && refund.status === "REQUESTED" && !view.snapshotChanged && !view.eligibilityIssue ? <Card as="section" className="gap-0 p-5 sm:p-6"><h2 className="text-xl font-medium tracking-[-0.015em]">Persetujuan Owner</h2><p className="mt-3 text-sm leading-6">Periksa seluruh alokasi pembayaran, alasan pengajuan dan syarat retur. Persetujuan ini mencatat keputusan; dana belum dinyatakan kembali ke Customer.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "approve")} mode="approve" permalink={path} submissionKey={randomUUID()} version={refund.version} /></Card> : null}
    {refund && owner && refund.status === "APPROVED" && refund.returnState === "PENDING" && !view.snapshotChanged && !view.eligibilityIssue ? <Card as="section" className="gap-0 p-5 sm:p-6"><h2 className="text-xl font-medium tracking-[-0.015em]">Pemeriksaan retur</h2><p className="mt-3 text-sm leading-6">Kasus menunggu retur. Catat bukti penerimaan dan hasil pemeriksaan agar syarat persetujuan dapat dipenuhi.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "receive-return")} mode="receive-return" permalink={path} submissionKey={randomUUID()} version={refund.version} /></Card> : null}
    {refund && owner && ["REQUESTED", "APPROVED"].includes(refund.status) && view.eligibleAmountRp ? <details className="rounded-xl border border-border bg-card p-5 sm:p-6"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Tinjau ulang pembayaran atau persetujuan</summary><p className="mt-3 text-sm leading-6">Memperbarui rincian pembayaran mencabut persetujuan aktif dan membutuhkan pemeriksaan Owner yang baru. Nomor kasus, waktu penerimaan dan riwayat lama tetap disimpan.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "refresh")} mode="refresh" permalink={path} submissionKey={randomUUID()} version={refund.version} /></details> : null}
    {refund && !owner ? <p className="text-sm text-muted-foreground">Persetujuan dan pemenuhan syarat retur dilakukan oleh Owner.</p> : null}
    {refund && owner && refund.readyAt && ["APPROVED", "RECONCILING"].includes(refund.status) ? <Card as="section" aria-labelledby="refund-execution-title" className="gap-5 p-5 sm:p-6">
      <h2 id="refund-execution-title" className="text-xl font-medium tracking-[-0.015em]">Pemrosesan pengembalian</h2>
      <p className="text-sm leading-6">Ajukan hanya setelah memeriksa kontrak metode/channel, batas waktu dan saldo merchant. Jika aturan merchant belum tercatat, pengajuan provider ditahan. Respons diterima belum berarti dana kembali; tunggu bukti bank yang cocok. Jangan mengulang pengajuan yang hasilnya belum pasti.</p>
      {!view.snapshotChanged && !view.eligibilityIssue ? refund.allocations.map(allocation => {
        const execution = view.executions?.find(value => value.allocationId === allocation.id);
        return allocation.id && (!execution || ["READY", "RETRYABLE"].includes(execution.state)) ? <details key={allocation.id} className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer py-2 font-medium">{allocation.purpose === "CUSTOM_SHIPPING" ? "Pengiriman final" : "Pembayaran pesanan"} · {money.format(BigInt(allocation.amountRp))}</summary>
          <RefundExecutionForm action={executeRefundAction.bind(null, id, "submit")} mode="submit" permalink={path} submissionKey={randomUUID()} version={refund.version} allocationId={allocation.id} publicReason={view.executions?.[0]?.publicReason} /></details> : null;
      }) : null}
      {(view.executions?.length ?? 0) > 0 ? <RefundExecutionForm action={executeRefundAction.bind(null, id, "reconcile")} mode="reconcile" permalink={path} submissionKey={randomUUID()} version={refund.version} /> : null}
      {!(view.manualAuthorizations?.some(value => value.active)) && !view.snapshotChanged && !view.eligibilityIssue ? <details className="rounded-lg border border-border p-4"><summary className="min-h-11 cursor-pointer py-2 font-medium">Tindak lanjut manual setelah verifikasi provider</summary>
        <p className="mt-2 text-sm leading-6">Satu persetujuan mencakup seluruh sisa alokasi yang belum dilunasi. Simpan bukti bahwa provider tidak memiliki refund tertunda atau berhasil, lalu verifikasi nominal dan penerima. Persetujuan ini belum menjadi receipt transfer.</p>
        <RefundExecutionForm action={executeRefundAction.bind(null, id, "authorize-manual")} mode="authorize-manual" permalink={path} submissionKey={randomUUID()} version={refund.version} /></details> : null}
      {view.manualAuthorizations?.filter(value => value.active).map(value => <div key={value.id} className="border-t border-border pt-4"><h3 className="font-semibold">Catat hasil transfer manual · {money.format(BigInt(value.amountRp))}</h3>
        <RefundExecutionForm action={executeRefundAction.bind(null, id, "confirm-manual")} mode="confirm-manual" authorizationId={value.id} permalink={path} submissionKey={randomUUID()} version={refund.version} /><RefundExecutionForm action={executeRefundAction.bind(null, id, "revoke-manual")} mode="revoke-manual" authorizationId={value.id} permalink={path} submissionKey={randomUUID()} version={refund.version} /></div>)}
    </Card> : null}
    {(view.executions?.length ?? 0) > 0 ? <Card as="section" className="gap-4 p-5 sm:p-6"><h2 className="text-xl font-medium tracking-[-0.015em]">Riwayat pemrosesan</h2><ul className="divide-y divide-border text-sm">{view.executions?.map(execution => <li key={execution.id} className="space-y-2 py-4"><p className="font-medium">{refundOutcomeLabels[execution.state] ?? "Sedang diperiksa"}</p><p className="break-all text-xs text-muted-foreground">Key tetap: {execution.refundKey}</p><p>{execution.attemptCount} attempt POST tercatat{execution.lastCheckedAt ? ` · Diperiksa ${new Date(execution.lastCheckedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB` : ""}</p><ul className="space-y-1 text-xs text-muted-foreground" aria-label="Hasil attempt terbaru">{execution.attempts.map((attempt, index) => <li key={index}>{attempt.state}{attempt.finishedAt ? ` · ${new Date(attempt.finishedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB` : " · menunggu hasil"}</li>)}</ul></li>)}</ul></Card> : null}
    {(view.manualAuthorizations?.length ?? 0) > 0 ? <Card as="section" className="gap-4 p-5 sm:p-6"><h2 className="text-xl font-medium tracking-[-0.015em]">Bukti penanganan manual</h2><ul className="divide-y divide-border text-sm">{view.manualAuthorizations?.map(value => <li key={value.id} className="space-y-2 break-words py-4"><p className="font-medium">{money.format(BigInt(value.amountRp))} · {value.paidAt ? "Transfer tercatat" : value.active ? "Menunggu bukti transfer" : "Persetujuan tidak aktif"}</p><p>{value.reason}</p><p className="text-muted-foreground">Provider: {value.providerResolutionReference}</p><p className="text-muted-foreground">Verifikasi penerima: {value.recipientVerificationReference}</p>{value.transferReference ? <p className="text-muted-foreground">Transfer: {value.transferReference}</p> : null}</li>)}</ul></Card> : null}
    {view.approvals.length > 0 ? <Card as="section" className="gap-4 p-5 sm:p-6"><h2 className="text-xl font-medium tracking-[-0.015em]">Riwayat persetujuan</h2><ol className="divide-y divide-border text-sm">{view.approvals.map(approval => <li className="space-y-2 py-4" key={approval.version}><p className="font-medium">Revisi {approval.version} · <span className="tabular-nums">{money.format(BigInt(approval.amountRp))}</span></p><p className="whitespace-pre-wrap break-words leading-6">{approval.reason}</p><p className="break-words text-muted-foreground">{approval.returnState}{approval.returnEvidenceReference ? ` · ${approval.returnEvidenceReference}` : ""}</p></li>)}</ol></Card> : null}
  </main></AdminShell>;
}
