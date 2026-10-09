import { Card } from "@/components/ui/card";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { connection } from "next/server";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminShell } from "@/components/niuva/admin-shell";
import { FinanceActionForm } from "@/components/niuva/finance-action-form";
import { FinanceReadService } from "@/modules/finance/read-service";
import { billingSourceSchema } from "@/modules/finance/schema";
import { formatFinanceRp } from "@/modules/finance/presentation";
import { isAppError } from "@/modules/shared/errors";
import { createInvoiceDraftAction } from "../../actions";
export default async function NewInvoicePage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, unknown>> }>) {
  await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_WRITE" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const raw = await searchParams, parsed = billingSourceSchema.safeParse(raw.kind === "B2B" ? { kind: raw.kind, inquiryId: raw.sourceId } : { kind: raw.kind, orderId: raw.sourceId });
  let ready: Awaited<ReturnType<FinanceReadService["source"]>> | null = null, message = "";
  if (parsed.success) { try { ready = await new FinanceReadService().source(gate.access, parsed.data); } catch (error) { if (isAppError(error)) message = error.message; else throw error; } }
  return <AdminShell active="invoices" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="invoice-new"><AdminPageHeader title="Siapkan invoice" description="Pilih sumber pekerjaan. Nilai tagihan mengikuti pesanan atau kesepakatan proyek." returnHref="/admin/finance/invoices" returnLabel="Invoice" breadcrumbs={[{ label: "Keuangan", href: "/admin/finance" }, { label: "Invoice", href: "/admin/finance/invoices" }, { label: "Siapkan" }]} />
    {!parsed.success ? <div className="grid gap-4 md:grid-cols-3">{[{ href: "/admin/orders?type=RETAIL", title: "Ready-made", description: "Buka pesanan dan pilih penagihan." }, { href: "/admin/orders?type=CUSTOM_PRINT", title: "Custom Print", description: "Produksi dan ongkir final memiliki tagihan terpisah." }, { href: "/admin/inquiries", title: "Proyek B2B", description: "Proposal diterima dan pola pembayaran ditentukan Owner." }].map(item => <Link className="space-y-3 rounded-xl border border-border bg-card p-5 hover:border-brand-300" href={item.href} key={item.title}><h2 className="text-lg font-semibold">{item.title}</h2><p className="text-sm text-muted-foreground">{item.description}</p></Link>)}</div> : ready ? <Card as="section" className="gap-0 py-0 ring-0 space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="break-all text-lg font-semibold">{ready.snapshot.reference}</h2><p className="text-2xl font-semibold tabular-nums">{formatFinanceRp(ready.snapshot.totalRp)}</p><p className="text-sm text-muted-foreground">{ready.snapshot.buyer.name}</p>{ready.billingCase?.currentInvoiceId ? <Link className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={`/admin/finance/invoices/${ready.billingCase.currentInvoiceId}`}>Buka invoice yang sudah tersedia</Link> : ready.snapshot.needsReview ? <p className="text-sm text-warning">Sumber atau pembayaran perlu diperiksa sebelum menyiapkan invoice.</p> : parsed.data.kind === "B2B" && !ready.billingCase ? <Link className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={`/admin/inquiries/${parsed.data.inquiryId}/billing`}>Tentukan pola pembayaran B2B</Link> : <FinanceActionForm action={createInvoiceDraftAction} fields={[]} hidden={{ sourceKind: parsed.data.kind, sourceId: parsed.data.kind === "B2B" ? parsed.data.inquiryId : parsed.data.orderId, idempotencyKey: randomUUID() }} submitLabel="Buat draft untuk ditinjau" />}</Card> : <p className="rounded-xl border border-warning-border bg-warning-background p-5 text-sm text-warning">{message || "Sumber tagihan belum tersedia."}</p>}
  </main></AdminShell>;
}
