import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { FinanceActionForm } from "@/components/niuva/finance-action-form";
import { FinancialEvidenceUpload } from "@/components/niuva/financial-evidence-upload";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";
import { ExpenseService } from "@/modules/finance/expense-service";
import { financialEvidenceRuntimeEnabled } from "@/modules/finance/evidence-policy";
import { EXPENSE_CATEGORIES } from "@/modules/finance/expense-categories";
import { formatFinanceRp, FINANCE_STATE_LABELS } from "@/modules/finance/presentation";
import { ExpenseForm } from "../expense-form";
import { correctExpenseAction, voidExpenseAction } from "../actions";
export default async function ExpenseDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<Record<string, unknown>> }>) {
  await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_READ" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { id } = await params; if (!z.uuid().safeParse(id).success) notFound();
  const loaded = await loadAdminRecordLogged("page:/admin/finance/expenses/[id]", () => new ExpenseService().detail(gate.access, id), { op: "detail" });
  if (loaded.status === "not-found") notFound(); if (loaded.status !== "found") return <AdminDataUnavailableView active="expenses" role={gate.access.profile.role} />;
  const expense = loaded.record, returnTo = normalizeAdminReturnTo((await searchParams).returnTo, "/admin/finance/expenses");
  return <AdminShell active="expenses" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="expense-detail"><AdminPageHeader title="Detail pengeluaran" description={expense.description} returnHref={returnTo} returnLabel="Pengeluaran" breadcrumbs={[{ label: "Keuangan", href: "/admin/finance" }, { label: "Pengeluaran", href: returnTo }, { label: "Detail" }]} />
    <section className="space-y-4 rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold" data-expense-amount>{formatFinanceRp(expense.amountRp)}</h2><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{FINANCE_STATE_LABELS[expense.state]}</span></div><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Tanggal aktual</dt><dd className="mt-1">{expense.date}</dd></div><div><dt className="text-xs text-muted-foreground">Kategori</dt><dd className="mt-1">{EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES] ?? expense.category}</dd></div></dl><p className="whitespace-pre-wrap break-words text-sm">{expense.description}</p>{expense.reason ? <p className="text-sm text-muted-foreground">Alasan: {expense.reason}</p> : null}<div className="flex flex-wrap gap-4">{expense.correctedFromId ? <Link className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={`/admin/finance/expenses/${expense.correctedFromId}`}>Catatan asli</Link> : null}{expense.correctionId ? <Link className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={`/admin/finance/expenses/${expense.correctionId}`}>Hasil koreksi</Link> : null}</div></section>
    <section className="space-y-3 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Bukti pengeluaran</h2>{expense.proofHref ? <a className="inline-flex min-h-11 items-center text-sm text-brand-700 underline" href={expense.proofHref}>Unduh bukti privat</a> : expense.state === "VALID" ? <FinancialEvidenceUpload expenseId={expense.id} enabled={financialEvidenceRuntimeEnabled()} /> : <p className="text-sm text-muted-foreground">Tidak ada bukti terlampir pada catatan ini.</p>}</section>
    {expense.state === "VALID" ? <div className="grid min-w-0 gap-5 xl:grid-cols-2"><section className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Koreksi pengeluaran</h2><ExpenseForm action={correctExpenseAction} idempotencyKey={randomUUID()} expense={expense} /></section><section className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Batalkan pencatatan</h2><p className="text-sm text-muted-foreground">Pembatalan menyimpan catatan asli dan mengecualikannya dari total pengeluaran berlaku.</p><FinanceActionForm action={voidExpenseAction} fields={[{ name: "reason", label: "Alasan pembatalan", type: "textarea", required: true }]} hidden={{ expenseId: expense.id, expectedVersion: String(expense.version), idempotencyKey: randomUUID() }} submitLabel="Batalkan pencatatan" confirmMessage={`Batalkan pencatatan pengeluaran ${formatFinanceRp(expense.amountRp)}? Riwayat tetap tersimpan.`} /></section></div> : null}
  </main></AdminShell>;
}
