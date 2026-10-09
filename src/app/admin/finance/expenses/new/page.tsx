import { Card } from "@/components/ui/card";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminShell } from "@/components/niuva/admin-shell";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";
import { ExpenseForm } from "../expense-form";
import { recordExpenseAction } from "../actions";
export default async function NewExpensePage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, unknown>> }>) {
  await connection(); const gate = await loadAdminPageAccess({ permission: "FINANCE_WRITE" }); if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const returnTo = normalizeAdminReturnTo((await searchParams).returnTo, "/admin/finance/expenses");
  return <AdminShell active="expenses" role={gate.access.profile.role}><main id="main-content" className="space-y-6" data-admin-surface="expense-new"><AdminPageHeader title="Catat pengeluaran" description="Masukkan pengeluaran usaha yang sudah terjadi." returnHref={returnTo} returnLabel="Pengeluaran" breadcrumbs={[{ label: "Keuangan", href: "/admin/finance" }, { label: "Pengeluaran", href: returnTo }, { label: "Catat" }]} /><Card as="section" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5"><ExpenseForm action={recordExpenseAction} idempotencyKey={randomUUID()} /><p className="mt-4 text-xs text-muted-foreground">Bukti bersifat opsional dan dapat dilampirkan dari halaman detail saat penyimpanan tersedia.</p></Card></main></AdminShell>;
}
