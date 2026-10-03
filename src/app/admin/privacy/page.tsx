import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminShell, AdminPagination } from "@/components/niuva/admin-shell";
import { PrivacyForm, type PrivacyField } from "@/components/niuva/privacy-form";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { isCustomerPrivacyAvailable, privacyKindLabels, privacyStatusLabels } from "@/modules/customer-privacy/core";
import { PRIVACY_ERROR_MESSAGES } from "@/modules/customer-privacy/handler";
import { typographySystemTokens as type } from "@/design/typography";
export const metadata: Metadata = { title: "Privasi Customer · Owner Niuva", robots: { index: false, follow: false } };
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export default async function OwnerPrivacyPage({ searchParams }: { searchParams: Promise<{ page?: string; error?: string; status?: string; fields?: string; form?: string }> }) {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const access = gate.access;
  const query = await searchParams;
  const initialErrors: Record<string, string> = {};
  try { const parsed: unknown = JSON.parse(query.fields ?? "{}"); if (parsed && typeof parsed === "object") for (const [key, value] of Object.entries(parsed)) if (["response", "outcome", "fulfilled", "holdReason", "holdReviewAt", "correctedDisplayName"].includes(key) && typeof value === "string") initialErrors[key] = value; } catch { /* Ignore malformed status. */ }
  const page = /^\d+$/.test(query.page ?? "") ? Math.max(1, Math.min(10000, Number(query.page))) : 1;
  const available = isCustomerPrivacyAvailable();
  const rows = available ? await new CustomerPrivacyRepository().listOwner(page) : [];
  const now = new Date();
  return <AdminShell active="privacy" role={access.profile.role}><main id="main-content" className="space-y-8"><header className="border-b border-border pb-6"><p className="text-sm font-medium text-primary">Niuva / Owner</p><h1 className={`mt-3 ${type.heading.className}`}>Privasi Customer</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Tangani akses dan koreksi data dalam 3×24 jam kalender dari penerimaan awal. Perubahan status tidak memulai ulang tenggat. Setelah akun ditutup, gunakan kontak terverifikasi untuk tindak lanjut.</p><div className="mt-4 flex flex-wrap gap-4"><Link href="/admin/privacy/policy?document=terms" className="inline-flex min-h-11 items-center text-primary underline">Tinjau draf Syarat Layanan</Link><Link href="/admin/privacy/policy?document=privacy" className="inline-flex min-h-11 items-center text-primary underline">Tinjau draf Kebijakan Privasi</Link></div></header>
    {query.error ? <p role="alert" className="rounded-lg border border-destructive p-4">{PRIVACY_ERROR_MESSAGES[query.error] ?? "Tindakan gagal diproses."}</p> : null}{query.status === "updated" ? <p role="status" className="rounded-lg border border-border p-4">Tanggapan dan hasil tersimpan.</p> : null}
    {!available ? <p>Pusat privasi hanya aktif pada Development lokal dan test yang diizinkan.</p> : rows.length === 0 ? <p className="text-muted-foreground">Belum ada permintaan privasi.</p> : <section className="space-y-6" aria-label="Permintaan privasi">{rows.slice(0, 20).map(row => {
      const held = Boolean(row.holdCategory && row.holdReviewAt && row.holdReviewAt > now);
      const fields: PrivacyField[] = [
        ...(row.kind === "CORRECTION" && row.customerId && !row.resolvedAt ? [{ name: "correctedDisplayName", label: "Nama profil setelah koreksi (opsional)", help: "Hanya nama profil aktif. Email login dan transaksi historis tidak berubah." }, { name: "applyProfileCorrection", kind: "checkbox" as const, label: "Terapkan nama profil ini setelah memeriksa koreksi dan menyampaikan hasil kepada Customer." }] : []),
        { name: "status", kind: "select", label: "Status penanganan", defaultValue: row.status === "OPEN" ? "IN_REVIEW" : row.status, options: [{ value: "IN_REVIEW", label: "Sedang ditangani" }, { value: "RESOLVED", label: "Selesai" }] },
        { name: "response", kind: "textarea", label: "Tanggapan untuk Customer", required: true, defaultValue: row.response ?? "", help: "Berikan data aman atau hasil koreksi. Jangan menyalin token, kredensial, maupun data pihak lain." },
        { name: "outcome", kind: "select", label: "Hasil penanganan", defaultValue: row.outcome ?? "", options: [{ value: "", label: "Belum selesai" }, { value: "FULFILLED", label: "Dipenuhi" }, { value: "PARTIALLY_FULFILLED", label: "Dipenuhi sebagian, alasan dijelaskan" }, { value: "REFUSED", label: "Ditolak, dasar dijelaskan" }] },
        { name: "fulfilled", kind: "checkbox", label: "Hasil sudah disampaikan dan tindakan benar-benar selesai, termasuk tindak lanjut melalui email bila akun ditutup.", defaultValue: row.resolvedAt ? "on" : "" },
        { name: "holdCategory", kind: "select", label: "Kategori penahanan data", defaultValue: row.holdCategory ?? "", options: [{ value: "", label: "Tidak ditahan / lepaskan penahanan" }, { value: "DISPUTE", label: "Sengketa" }, { value: "SECURITY_INCIDENT", label: "Insiden keamanan" }, { value: "LEGAL_OBLIGATION", label: "Kewajiban hukum" }] },
        { name: "holdReason", kind: "textarea", label: "Alasan penahanan", defaultValue: row.holdReason ?? "", help: "Alasan spesifik wajib untuk penahanan; Anda tercatat sebagai penanggung jawab." },
        { name: "holdReviewAt", kind: "date", label: "Tanggal peninjauan penahanan (WIB)", defaultValue: row.holdReviewAt ? new Date(row.holdReviewAt.getTime() + 7 * 3600000).toISOString().slice(0, 10) : "", help: "Maksimal 30 hari ke depan. Tanpa perpanjangan terdokumentasi, penahanan berakhir dan cleanup mengikuti tenggat asli." },
      ];
      return <article key={row.id} className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-8"><header className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><h2 className={type.subheading.className}>{privacyKindLabels[row.kind]}</h2><p className="mt-2 break-all text-sm">{row.referenceNumber}</p></div><p className="text-sm font-medium">{privacyStatusLabels[row.status]}{!row.resolvedAt && row.dueAt <= now ? " · Tenggat terlewati" : ""}</p></header><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Diterima</dt><dd>{date.format(row.createdAt)} WIB</dd></div><div><dt className="text-muted-foreground">Tenggat awal</dt><dd>{date.format(row.dueAt)} WIB</dd></div><div><dt className="text-muted-foreground">Kontak terverifikasi</dt><dd className="break-all">{row.contactEmail ?? "Sudah dibersihkan"}</dd></div><div><dt className="text-muted-foreground">Akun</dt><dd>{row.customerId ? "Masih tertaut" : "Ditutup atau retensi akun selesai"}</dd></div></dl>{row.details ? <p className="mt-5 whitespace-pre-wrap break-words leading-7">{row.details}</p> : null}{row.correction ? <p className="mt-3 whitespace-pre-wrap break-words leading-7">Koreksi yang diminta: {row.correction}</p> : null}{row.holdCategory ? <p className="mt-4 text-sm font-medium">{held ? "Ditahan sampai peninjauan" : "Penahanan jatuh tempo"}: {row.holdCategory} · {row.holdReviewAt ? date.format(row.holdReviewAt) : "Tanggal belum tersedia"}</p> : null}{row.contentPurgedAt ? <p className="mt-5 text-muted-foreground">Isi telah dibersihkan; hanya bukti minimum sampai batas 30 hari.</p> : <details open={query.form === row.id} className="mt-6 border-t border-border pt-4"><summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Tanggapi dan catat hasil / penahanan</summary><div className="mt-4 max-w-2xl"><PrivacyForm prefix={`owner-${row.id}`} mode="owner" action="/api/admin/privacy" hidden={{ id: row.id }} initialErrors={query.form === row.id ? initialErrors : {}} fields={fields} label="Simpan penanganan" /></div></details>}</article>;
    })}</section>}
    <AdminPagination basePath="/admin/privacy" page={page} hasNext={rows.length > 20} />
  </main></AdminShell>;
}
