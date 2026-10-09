import { Card } from "@/components/ui/card";
import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { loadAdminRecordLogged } from "@/app/admin/admin-page-failure";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminShell, AdminDataUnavailableView } from "@/components/niuva/admin-shell";
import { PrivacyForm, type PrivacyField } from "@/components/niuva/privacy-form";
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { isCustomerPrivacyAvailable, privacyKindLabels, privacyStatusLabels } from "@/modules/customer-privacy/core";
import { PRIVACY_ERROR_MESSAGES } from "@/modules/customer-privacy/handler";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";
import { typographySystemTokens as type } from "@/design/typography";
export const metadata: Metadata = { title: "Detail privasi Customer · Owner Niuva", robots: { index: false, follow: false } };
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export default async function OwnerPrivacyDetail({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const gate = await loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" });
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const access = gate.access;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  if (!isCustomerPrivacyAvailable()) return <AdminShell active="privacy" role={access.profile.role}><main id="main-content"><AdminPageHeader title="Detail privasi Customer" /><p>Pusat privasi hanya aktif pada Development lokal dan test yang diizinkan.</p></main></AdminShell>;
  const loaded = await loadAdminRecordLogged("page:/admin/privacy/[id]", () => new CustomerPrivacyService().getOwnerDetail(access, id), { id, op: "detail" });
  if (loaded.status === "not-found") notFound();
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="privacy" role={access.profile.role} kind={loaded.kind} title="Detail privasi belum dapat dimuat" />;
  const row = loaded.record;
  const query = await searchParams ?? {};
  const returnTo = normalizeAdminReturnTo(query.returnTo, "/admin/privacy");
  const initialErrors: Record<string, string> = {};
  if (typeof query.fields === "string") {
    try { const parsed: unknown = JSON.parse(query.fields); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) for (const [key, value] of Object.entries(parsed)) if (["response", "status", "outcome", "fulfilled", "holdReason", "holdReviewAt", "correctedDisplayName"].includes(key) && typeof value === "string") initialErrors[key] = value; } catch { /* Malformed feedback is ignored. */ }
  }
  const now = new Date();
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
  return <AdminShell active="privacy" role={access.profile.role}><main id="main-content" data-admin-surface="privacy-detail" className="space-y-6">
    <AdminPageHeader title="Detail permintaan privasi" description={row.referenceNumber} returnHref={returnTo} returnLabel="Kembali ke Privasi Customer" breadcrumbs={[{ label: "Privasi Customer", href: returnTo }, { label: row.referenceNumber }]} />
    {typeof query.error === "string" ? <p role="alert" className="rounded-lg border border-destructive-border bg-destructive-background p-4 text-destructive">{PRIVACY_ERROR_MESSAGES[query.error] ?? "Tindakan gagal diproses."}</p> : null}
    {query.status === "updated" ? <p role="status" className="rounded-lg border border-success-border bg-success-background p-4 text-success">Tanggapan dan hasil tersimpan.</p> : null}
    <p className="text-sm leading-6 text-muted-foreground">Tenggat 3×24 jam kalender tetap dihitung dari penerimaan awal. Perubahan status tidak memulai ulang tenggat; setelah akun ditutup, tindak lanjut menggunakan kontak terverifikasi.</p>
    <Card as="article" key={row.id} className="gap-0 py-0 ring-0 min-w-0 rounded-xl border border-border bg-card p-5 sm:p-8"><header className="flex flex-wrap justify-between gap-4"><div className="min-w-0"><h2 className={type.subheading.className}>{privacyKindLabels[row.kind]}</h2><p className="mt-2 break-all text-sm">{row.referenceNumber}</p></div><p className="text-sm font-medium">{privacyStatusLabels[row.status]}{!row.resolvedAt && row.dueAt <= now ? " · Tenggat terlewati" : ""}</p></header><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Diterima</dt><dd>{date.format(row.createdAt)} WIB</dd></div><div><dt className="text-muted-foreground">Tenggat awal</dt><dd>{date.format(row.dueAt)} WIB</dd></div><div><dt className="text-muted-foreground">Kontak terverifikasi</dt><dd className="break-all">{row.contactEmail ?? "Sudah dibersihkan"}</dd></div><div><dt className="text-muted-foreground">Akun</dt><dd>{row.customerId ? "Masih tertaut" : "Ditutup atau retensi akun selesai"}</dd></div></dl>{row.details ? <p className="mt-5 whitespace-pre-wrap break-words leading-7">{row.details}</p> : null}{row.correction ? <p className="mt-3 whitespace-pre-wrap break-words leading-7">Koreksi yang diminta: {row.correction}</p> : null}{row.holdCategory ? <p className="mt-4 text-sm font-medium">{held ? "Ditahan sampai peninjauan" : "Penahanan jatuh tempo"}: {row.holdCategory} · {row.holdReviewAt ? date.format(row.holdReviewAt) : "Tanggal belum tersedia"}</p> : null}{row.contentPurgedAt ? <p className="mt-5 text-muted-foreground">Isi telah dibersihkan; hanya bukti minimum sampai batas 30 hari.</p> : <details open className="mt-6 border-t border-border pt-4"><summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">Tanggapi dan catat hasil / penahanan</summary><div className="mt-4 max-w-2xl"><PrivacyForm prefix={`owner-${row.id}`} mode="owner" action="/api/admin/privacy" hidden={{ id: row.id, responseView: "detail", returnTo }} initialErrors={initialErrors} fields={fields} label="Simpan penanganan" /></div></details>}</Card>
  </main></AdminShell>;
}
