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
import { RefundWorkflowForm } from "@/components/niuva/refund-workflow-form";
import { Card } from "@/components/ui/card";
import { RefundService } from "@/modules/refund/service";
import { isAppError } from "@/modules/shared/errors";
import { reviewRefundAction } from "./actions";

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
    <AdminPageHeader title="Kasus refund" description={`${view.orderNumber} · ${view.orderStatus}`} returnHref={`/admin/orders/${id}`} returnLabel="Kembali ke order" breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: view.orderNumber, href: `/admin/orders/${id}` }, { label: "Refund" }]} />
    {view.accountClosed ? <p className="rounded-lg border border-warning-border bg-warning-background p-4 text-sm text-warning">Akun terkait sudah ditutup. Tindak lanjut memakai verifikasi pihak yang berwenang melalui nomor kasus ini.</p> : null}
    {refund ? <Card as="section" aria-labelledby="refund-summary-title" className="gap-5 p-5 sm:p-6"><h2 id="refund-summary-title" className="text-xl font-semibold">Pengajuan dan pembayaran</h2><RefundCaseSummary refund={refund} /></Card> : null}
    {view.eligibilityIssue ? <p role="status" className="rounded-lg border border-warning-border bg-warning-background p-4 text-sm text-warning">{view.eligibilityIssue}</p> : null}
    {!refund && view.eligibleAmountRp ? <Card as="section" className="gap-0 p-5 sm:p-6"><h2 className="text-xl font-semibold">Catat pengajuan dari kanal layanan</h2><p className="mt-3 text-sm leading-6">Pembayaran server: <strong className="tabular-nums">{money.format(BigInt(view.eligibleAmountRp))}</strong>. Catat referensi verifikasi pembayar atau pihak yang berwenang sebelum menyimpan pengajuan.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "intake")} mode="intake" permalink={path} submissionKey={randomUUID()} /></Card> : null}
    {refund && view.snapshotChanged ? <p role="status" className="rounded-lg border border-warning-border bg-warning-background p-4 text-sm text-warning">Rincian pembayaran berubah sejak pengajuan. Persetujuan atau pemrosesan harus ditinjau ulang.</p> : null}
    {refund && owner && refund.status === "REQUESTED" && !view.snapshotChanged && !view.eligibilityIssue ? <Card as="section" className="gap-0 p-5 sm:p-6"><h2 className="text-xl font-semibold">Persetujuan Owner</h2><p className="mt-3 text-sm leading-6">Periksa seluruh alokasi pembayaran, alasan pengajuan dan syarat retur. Persetujuan ini mencatat keputusan; dana belum dinyatakan kembali ke Customer.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "approve")} mode="approve" permalink={path} submissionKey={randomUUID()} version={refund.version} /></Card> : null}
    {refund && owner && refund.status === "APPROVED" && refund.returnState === "PENDING" && !view.snapshotChanged && !view.eligibilityIssue ? <Card as="section" className="gap-0 p-5 sm:p-6"><h2 className="text-xl font-semibold">Pemeriksaan retur</h2><p className="mt-3 text-sm leading-6">Kasus menunggu retur. Catat bukti penerimaan dan hasil pemeriksaan agar syarat persetujuan dapat dipenuhi.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "receive-return")} mode="receive-return" permalink={path} submissionKey={randomUUID()} version={refund.version} /></Card> : null}
    {refund && owner && ["REQUESTED", "APPROVED"].includes(refund.status) && view.eligibleAmountRp ? <details className="rounded-xl border border-border bg-card p-5 sm:p-6"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Tinjau ulang pembayaran atau persetujuan</summary><p className="mt-3 text-sm leading-6">Memperbarui rincian pembayaran mencabut persetujuan aktif dan membutuhkan pemeriksaan Owner yang baru. Nomor kasus, waktu penerimaan dan riwayat lama tetap disimpan.</p>
      <RefundWorkflowForm action={reviewRefundAction.bind(null, id, "refresh")} mode="refresh" permalink={path} submissionKey={randomUUID()} version={refund.version} /></details> : null}
    {refund && !owner ? <p className="text-sm text-muted-foreground">Persetujuan dan pemenuhan syarat retur dilakukan oleh Owner.</p> : null}
    {view.approvals.length > 0 ? <Card as="section" className="gap-4 p-5 sm:p-6"><h2 className="text-xl font-semibold">Riwayat persetujuan</h2><ol className="divide-y divide-border text-sm">{view.approvals.map(approval => <li className="space-y-2 py-4" key={approval.version}><p className="font-medium">Revisi {approval.version} · <span className="tabular-nums">{money.format(BigInt(approval.amountRp))}</span></p><p className="whitespace-pre-wrap break-words leading-6">{approval.reason}</p><p className="break-words text-muted-foreground">{approval.returnState}{approval.returnEvidenceReference ? ` · ${approval.returnEvidenceReference}` : ""}</p></li>)}</ol></Card> : null}
  </main></AdminShell>;
}
