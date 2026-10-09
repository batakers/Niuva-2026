import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeInput as Input } from "@/components/ui/input";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { sendB2BQuoteAction } from "@/app/admin/actions";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AdminOperationsService } from "@/modules/admin/operations";
import { normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";
import { B2BQuoteService } from "@/modules/inquiry/b2b-quote";
import { B2BQuoteAdminPanel } from "../b2b-quote-panel";

export const metadata: Metadata = { title: "Proposal B2B · Niuva", robots: { index: false, follow: false } };
const fieldClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AdminB2BProposalPage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<Readonly<Record<string, unknown>>>;
}>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const returnTo = normalizeAdminReturnTo((await searchParams)?.returnTo, "/admin/inquiries");
  const loaded = await loadAdminRecordLogged("page:/admin/inquiries/[id]/proposal", async () => {
    const inquiry = await new AdminOperationsService({ authorize: async () => access }).getInquiry(id);
    if (!inquiry) return null;
    const quotes = await new B2BQuoteService({ authorizeAdmin: async () => access }).listForAdmin(id);
    return { inquiry, quotes };
  }, { id, op: "proposal" });
  if (loaded.status === "not-found") notFound();
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="inquiries" role={access.profile.role} kind={loaded.kind} title="Proposal belum dapat dimuat" />;
  const { inquiry, quotes } = loaded.record;
  const inquiryId = inquiry.id;
  const terminal = ["WON", "LOST", "CLOSED"].includes(inquiry.status);
  const canPublish = Boolean(inquiry.customerId) && !terminal;
  const detailHref = withAdminReturnTo(`/admin/inquiries/${id}`, returnTo);
  return <AdminShell active="inquiries" role={access.profile.role}><main id="main-content" data-admin-surface="b2b-proposal" className="space-y-6">
    <AdminPageHeader title="Proposal B2B" description={inquiry.referenceNumber} returnHref={detailHref} returnLabel="Kembali ke detail inquiry" breadcrumbs={[{ label: "B2B Inquiries", href: returnTo }, { label: inquiry.referenceNumber, href: detailHref }, { label: "Proposal" }]} />
    <Card as="section" aria-labelledby="proposal-editor-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id="proposal-editor-title" className="text-xl font-semibold">Kirim versi proposal</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Periksa scope, asumsi, dan biaya sebelum mengirim. Versi yang dikirim tersimpan sebagai snapshot; penerimaan Customer menjadi dasar tindak lanjut manual.</p>
      <p className="mt-3 text-sm"><strong>{inquiry.projectGoal}</strong>{inquiry.description ? ` · ${inquiry.description}` : ""}</p>
      {canPublish ? <>
    <AdminActionForm action={sendB2BQuoteAction} className="mt-5" confirmMessage="Kirim proposal terstruktur ini ke akun customer? Versi yang dikirim tidak dapat diubah." submitLabel="Kirim versi proposal">
      <input name="inquiryId" type="hidden" value={inquiryId} />
      <Label className="grid gap-2 text-sm font-medium" htmlFor="b2b-scope">Scope pekerjaan<Textarea className={fieldClass} id="b2b-scope" name="scope" required rows={4} /></Label>
      <Label className="grid gap-2 text-sm font-medium" htmlFor="b2b-assumptions">Asumsi proposal<Textarea className={fieldClass} id="b2b-assumptions" name="assumptions" required rows={3} /></Label>
      <Label className="grid gap-2 text-sm font-medium" htmlFor="b2b-lines">Pos biaya IDR<Textarea className={fieldClass} id="b2b-lines" name="lineItemsText" placeholder={"Desain awal | 1500000\nPrototype | 750000"} required rows={4} /><span className="font-normal text-muted-foreground">Satu pos per baris: Nama | nominal IDR bulat positif.</span></Label>
      <Label className="grid gap-2 text-sm font-medium" htmlFor="b2b-valid">Berlaku sampai tanggal<Input className={fieldClass} id="b2b-valid" name="validUntil" required type="date" /></Label>
    </AdminActionForm>
      </> : <StatusNotice className="mt-5" tone="info" title="Proposal belum dapat dikirim" description={terminal ? "Inquiry sudah ditutup. Riwayat proposal tetap dapat dibaca." : "Customer perlu mengklaim inquiry di akunnya sebelum proposal dapat dikirim."} />}
    </Card>
    <B2BQuoteAdminPanel inquiryId={id} quotes={quotes} returnTo={returnTo} showWorkspaceLink={false} />
  </main></AdminShell>;
}
