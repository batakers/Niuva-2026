import { randomUUID } from "node:crypto";
import { PrivacyForm } from "@/components/niuva/privacy-form";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import { PRIVACY_CONTACT, privacyKindLabels, privacyStatusLabels } from "@/modules/customer-privacy/core";

export type PrivacyRequestRow = Readonly<{
  contentPurgedAt: Date | null;
  correction: string | null;
  createdAt: Date;
  details: string | null;
  dueAt: Date;
  id: string;
  kind: string;
  referenceNumber: string;
  response: string | null;
  status: string;
}>;

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const cardClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6";
const cardTitleClass = "text-xl font-medium tracking-[-0.015em]";
const cardTextClass = "mt-2 text-ui font-normal leading-[1.55] text-muted-foreground";

export function PrivacyCenterView({ available, errorMessage, initialErrors, requests, statusMessage }: Readonly<{
  available: boolean;
  errorMessage: string | null;
  initialErrors: Readonly<Record<string, string>>;
  requests: readonly PrivacyRequestRow[];
  statusMessage: string | null;
}>) {
  return <main id="main-content" className="overflow-x-hidden pb-16 sm:pb-24">
    <div className="mx-auto max-w-public px-5 pt-8 sm:px-12 sm:pt-10">
      <NiuvaLink className="min-h-11" href="/account" size="sm" variant="outline">
        <Icon aria-hidden="true" className="size-4" name="arrow-left" />
        Kembali ke akun
      </NiuvaLink>
      <h1 className={`${type.display.className} mt-8 max-w-[16em] text-balance`}>Kendali atas data Anda.</h1>
      <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">Unduh salinan data, ajukan koreksi, atau tutup akun Niuva secara permanen. Permintaan terkait pesanan tetap ditangani melalui kontak resmi.</p>
      <p className="mt-3 max-w-[56ch] text-caption leading-[1.45] text-muted-foreground">Pusat privasi saat ini hanya aktif untuk pengujian. Kebijakan privasi untuk Customer publik belum terbit.</p>
      {errorMessage ? <StatusNotice className="mt-6 max-w-3xl" size="compact" title={errorMessage} tone="error" /> : null}
      {statusMessage ? <StatusNotice className="mt-6 max-w-3xl" size="compact" title={statusMessage} tone="info" /> : null}
    </div>
    <div className="mx-auto grid max-w-public items-start gap-12 px-5 pt-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {!available ? (
        <div className="min-w-0"><StatusNotice description={`Hubungi ${PRIVACY_CONTACT} untuk permintaan terkait data Anda.`} title="Pusat privasi belum aktif pada lingkungan ini." tone="info" /></div>
      ) : (
        <div className="min-w-0 space-y-4">
          <section aria-labelledby="export-heading" className={cardClass}>
            <h2 id="export-heading" className={cardTitleClass}>Salinan data</h2>
            <p className={cardTextClass}>JSON memuat profil, persetujuan, pesanan, Project Brief, Custom Print, metadata berkas, dan permintaan privasi milik Anda. Komunikasi di luar aplikasi dapat diminta melalui Data tambahan.</p>
            <ul className="my-4 list-disc space-y-1.5 pl-5 text-caption leading-[1.45] text-muted-foreground"><li>Password, token, kredensial provider, dan tautan berkas privat tidak disertakan.</li><li>Salinan disiapkan setelah Anda mengonfirmasi email dalam sesi ini.</li></ul>
            <PrivacyForm prefix="export-email" mode="email" action="/api/account/privacy/confirmation-email" hidden={{ purpose: "EXPORT" }} label="Minta tautan unduhan" />
          </section>
          <section aria-labelledby="correction-heading" className={cardClass}>
            <h2 id="correction-heading" className={cardTitleClass}>Koreksi data</h2>
            <p className={`${cardTextClass} mb-5`}>Owner memeriksa koreksi. Email login, metode akun, dan transaksi historis tidak diubah otomatis.</p>
            <PrivacyForm prefix="correction" mode="request" action="/api/account/privacy/requests" hidden={{ kind: "CORRECTION", submissionKey: randomUUID() }} initialErrors={initialErrors} fields={[{ name: "details", label: "Data yang salah", kind: "textarea", required: true, help: "Sebutkan bagian data atau nomor pesanan. Jangan kirim password atau token." }, { name: "correction", label: "Koreksi yang diminta", kind: "textarea", required: true }]} label="Ajukan koreksi" />
          </section>
          <section aria-labelledby="additional-heading" className={cardClass}>
            <h2 id="additional-heading" className={cardTitleClass}>Data tambahan</h2>
            <p className={`${cardTextClass} mb-5`}>Minta komunikasi atau data milik Anda yang belum tercakup JSON. Owner memeriksa kepemilikan dan melindungi data pihak lain. Tenggat akses dan koreksi dihitung 3×24 jam sejak permintaan diterima.</p>
            <PrivacyForm prefix="additional" mode="request" action="/api/account/privacy/requests" hidden={{ kind: "ADDITIONAL", submissionKey: randomUUID() }} initialErrors={initialErrors} fields={[{ name: "details", label: "Data yang ingin Anda peroleh", kind: "textarea", required: true, help: "Jelaskan kanal komunikasi, rentang tanggal, atau referensi yang relevan." }]} label="Minta data tambahan" />
          </section>
          <section aria-labelledby="closure-heading" className="rounded-[var(--radius-card)] border border-destructive-border bg-card p-5 sm:p-6">
            <h2 id="closure-heading" className={cardTitleClass}>Tutup akun permanen</h2>
            <p className="mt-2 text-ui font-normal leading-[1.55]">Akses berhenti dan semua sesi dicabut. Profil akun, password, token autentikasi, serta persetujuan akun dihapus. Tidak ada masa pemulihan.</p>
            <p className={cardTextClass}>Pesanan, pekerjaan, berkas sesuai kelas retensinya, dan kasus aktif tetap disimpan untuk penyelesaian serta kewajiban pencatatan. Penutupan tidak membatalkan pesanan. Kontak terverifikasi pada transaksi/kasus digunakan untuk tindak lanjut. Akun baru tidak mendapat riwayat lama secara otomatis.</p>
            <p className="mb-5 mt-3 text-ui font-medium">Unduh data terlebih dahulu jika Anda memerlukannya.</p>
            <PrivacyForm prefix="close-email" mode="email" action="/api/account/privacy/confirmation-email" hidden={{ purpose: "CLOSE" }} label="Minta konfirmasi penutupan" danger />
          </section>
        </div>
      )}
      <aside aria-label="Permintaan dan kontak privasi" className="space-y-4 lg:sticky lg:top-24">
        <section aria-labelledby="requests-heading" className={cardClass}>
          <h2 id="requests-heading" className={cardTitleClass}>Permintaan Anda</h2>
          {requests.length === 0 ? <p className={cardTextClass}>Belum ada permintaan privasi.</p> : (
            <ul className="mt-4 divide-y divide-border border-t border-border">
              {requests.map((row) => (
                <li className="py-4" key={row.id}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-medium">{privacyKindLabels[row.kind]}</h3>
                      <p className="mt-0.5 break-all text-caption text-muted-foreground">{row.referenceNumber}</p>
                    </div>
                    <span className="inline-flex w-fit rounded-full border border-border bg-neutral-50 px-2.5 py-0.5 text-caption font-medium">{privacyStatusLabels[row.status]}</span>
                  </div>
                  <p className="mt-2 text-caption leading-[1.45] text-muted-foreground">Diterima {date.format(row.createdAt)} · Tenggat {date.format(row.dueAt)} WIB</p>
                  {row.details ? <p className="mt-3 whitespace-pre-wrap break-words text-ui leading-[1.55]">{row.details}</p> : null}
                  {row.correction ? <p className="mt-2 whitespace-pre-wrap break-words text-ui leading-[1.55]">Koreksi: {row.correction}</p> : null}
                  {row.response ? (
                    <div className="mt-3 rounded-[var(--radius-control)] bg-neutral-50 p-3">
                      <p className="text-caption font-medium">Tanggapan Owner</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-ui leading-[1.55]">{row.response}</p>
                    </div>
                  ) : null}
                  {row.contentPurgedAt ? <p className="mt-3 text-caption leading-[1.45] text-muted-foreground">Isi kasus sudah dibersihkan sesuai retensi. Bukti minimum disimpan sampai batas 30 hari.</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="px-1 text-ui font-normal leading-[1.55] text-muted-foreground">Tindak lanjut setelah akun ditutup atau hak privasi lain: <a className="font-medium text-primary underline underline-offset-4" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a> · 085117678901.</p>
      </aside>
    </div>
  </main>;
}
