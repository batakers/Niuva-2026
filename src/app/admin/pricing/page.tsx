import type { Metadata } from "next";
import { connection } from "next/server";

import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { AdminDataUnavailableView, AdminPagination, AdminShell } from "@/components/niuva/admin-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { AdminOperationsService, parseAdminPage, type AdminPricingRuleRow } from "@/modules/admin/operations";

export const metadata: Metadata = { title: "Pricing Rules admin · Niuva", robots: { follow: false, index: false } };
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export default async function AdminPricingPage({ searchParams }: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  await connection();
  const page = parseAdminPage((await searchParams).page);
  const access = await loadAdminAccess();
  if (access === null) return <AdminAccessUnavailableView />;
  const result = await loadPricing(access, page);
  if (result === null) return <AdminDataUnavailableView role={access.profile.role} title="Pricing rules belum dapat dimuat" />;
  const active = result.items.filter((item) => item.status === "ACTIVE").length;

  return <AdminShell active="pricing" role={result.role}><main className="space-y-8" data-admin-surface="pricing" id="main-content"><header className="border-b border-border pb-6"><p className="text-sm font-medium text-brand-700">Niuva / Operations</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Pricing Rules</h1><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Subview live untuk versi aturan harga. Definisi dan status dibaca dari database; aktivasi tetap owner-controlled dan tidak dijalankan pada goal ini.</p></header><section aria-label="Ringkasan pricing rules" className="grid gap-3 sm:grid-cols-3"><Summary label="Tampil" value={String(result.items.length)} /><Summary label="Active" value={String(active)} /><Summary label="Draft / retired" value={String(result.items.length - active)} /></section><section aria-labelledby="pricing-list-title"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><h2 className="text-xl font-semibold" id="pricing-list-title">Versi rule</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Setiap quote menyimpan snapshot rule yang dipakai saat perhitungan.</p></div><p className="text-sm text-muted-foreground" role="status">Dibaca {dateFormatter.format(result.generatedAt)}</p></div>{result.items.length === 0 ? <div className="mt-6"><StatusNotice tone="warning" title="Belum ada pricing rule" description="Quote custom print belum dapat dibuat sampai Owner menyediakan dan menyetujui rule pricing." /></div> : <div className="mt-6 grid gap-4">{result.items.map((item) => <PricingCard item={item} key={item.id} />)}</div>}<AdminPagination basePath="/admin/pricing" hasNext={result.hasNext} page={result.page} /></section><StatusNotice tone="info" title="Aktivasi tidak dijalankan" description="Biteship dan Midtrans tetap di luar scope. Perubahan pricing rule production memerlukan persetujuan Owner dan audit yang sesuai." /></main></AdminShell>;
}

async function loadAdminAccess(): Promise<AdminAccess | null> { try { return await requireAdmin(); } catch { return null; } }
async function loadPricing(access: AdminAccess, page: number): Promise<Awaited<ReturnType<AdminOperationsService["listPricingRules"]>> | null> { try { return await new AdminOperationsService({ authorize: async () => access }).listPricingRules({ page }); } catch { return null; } }
function Summary({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>; }
function PricingCard({ item }: Readonly<{ item: AdminPricingRuleRow }>) { const definition = safeJson(item.definitionJson); return <article className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-sm font-semibold">{item.code} · v{item.version}</p><p className="mt-1 text-xs text-muted-foreground">Dibuat {dateFormatter.format(item.createdAt)} · diperbarui {dateFormatter.format(item.updatedAt)}</p></div><span className={item.status === "ACTIVE" ? "rounded-md border border-success-border bg-success-background px-2.5 py-1 text-xs font-semibold text-success" : "rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"}>{item.status}</span></div><pre className="mt-5 max-h-72 overflow-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs leading-5 text-foreground">{definition}</pre><p className="mt-4 text-xs text-muted-foreground">{item.approvedBy ? `Disetujui oleh ${item.approvedBy}` : "Belum disetujui"}{item.approvedAt ? ` · ${dateFormatter.format(item.approvedAt)}` : ""}</p></article>; }
function safeJson(value: unknown): string { try { return JSON.stringify(value, null, 2) ?? "{}"; } catch { return "{}"; } }
