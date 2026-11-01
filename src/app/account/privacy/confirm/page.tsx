import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { PublicShell } from "@/components/niuva/public-shell";
import { PrivacyForm } from "@/components/niuva/privacy-form";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { CUSTOMER_SESSION_COOKIE, hashOpaqueToken } from "@/modules/customer-auth/core";
import { isCustomerPrivacyAvailable, privacyPurposeSchema, privacyTokenSchema } from "@/modules/customer-privacy/core";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { typographySystemTokens as type } from "@/design/typography";
export const metadata: Metadata = { title: "Konfirmasi privasi · Niuva", robots: { index: false, follow: false }, referrer: "same-origin" };
export default async function PrivacyConfirmation({ searchParams }: { searchParams: Promise<{ token?: string; action?: string }> }) {
  await connection(); const query = await searchParams;
  const token = privacyTokenSchema.safeParse(query.token); const purpose = privacyPurposeSchema.safeParse(query.action);
  const customer = isCustomerPrivacyAvailable() ? await getCurrentCustomer() : null;
  const session = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  const proof = customer && session && token.success && purpose.success ? await new CustomerPrivacyRepository().preview({ customerId: customer.id, sessionHash: hashOpaqueToken(session) }, token.data, purpose.data, new Date()) : null;
  const close = purpose.success && purpose.data === "CLOSE";
  return <PublicShell functionalStatus="server-backed" scope="account"><main id="main-content" className="mx-auto min-h-[60vh] max-w-public overflow-x-hidden px-5 pt-8 pb-16 sm:px-12 sm:pt-10 sm:pb-24">
    <NiuvaLink className="min-h-11" href="/account/privacy" size="sm" variant="outline">
      <Icon aria-hidden="true" className="size-4" name="arrow-left" />
      Ke Pusat privasi
    </NiuvaLink>
    <h1 className={`${type.display.className} mt-8 max-w-[16em] text-balance`}>{close ? "Konfirmasi penutupan akun" : "Konfirmasi salinan data"}</h1>
    <div className="mt-8 max-w-2xl">
      {!proof || !token.success ? (
        <p role="alert" className="rounded-[var(--radius-control)] border border-warning-border bg-warning-background p-4 text-ui font-normal leading-[1.55] text-warning">Tautan tidak berlaku atau sesi berbeda. Buka melalui browser yang meminta tautan. Jika sesi sudah berakhir atau tautan terpakai/kedaluwarsa, masuk dan minta tautan baru.</p>
      ) : (
        <section aria-label={close ? "Penutupan akun" : "Unduhan data"} className={`rounded-[var(--radius-card)] border bg-card p-5 sm:p-6 ${close ? "border-destructive-border" : "border-border"}`}>
          <p className="text-ui font-normal leading-[1.55]">{close ? "Tindakan ini permanen dan tidak dapat dipulihkan. Akses akun berhenti; profil, credential, sesi, token, dan persetujuan akun dihapus. Pesanan serta pekerjaan aktif tetap diselesaikan melalui kontak terverifikasi. Data bisnis dan berkas dengan retensi tersendiri tetap disimpan. Akun Google dan data provider tidak dihapus." : "Unduh data milik Anda dalam format JSON. Setelah dipakai, tautan ini tidak dapat digunakan kembali. Membuka halaman ini belum mengunduh atau mengubah data."}</p>
          {close ? <p className="mt-3 text-ui font-normal leading-[1.55] text-muted-foreground">Unduh data terlebih dahulu melalui <Link href="/account/privacy" className="font-medium text-primary underline underline-offset-4">Pusat privasi</Link>. Tidak ada masa pemulihan atau pemulihan riwayat otomatis setelah daftar ulang.</p> : null}
          <div className="mt-5">
            <PrivacyForm prefix="privacy-confirm" mode={close ? "close" : "export"} action={close ? "/api/account/privacy/close" : "/api/account/privacy/export"} hidden={{ token: token.data }} label={close ? "Tutup akun secara permanen" : "Unduh JSON data saya"} danger={close} fields={close ? [{ name: "permanent", kind: "checkbox", required: true, label: "Saya memahami konsekuensinya dan menyetujui penutupan permanen akun Niuva." }] : []} />
          </div>
        </section>
      )}
      <p className="mt-6 text-ui font-normal leading-[1.55] text-muted-foreground">Kontak tindak lanjut: <a className="font-medium text-primary underline underline-offset-4" href="mailto:niuvamakerspace@gmail.com">niuvamakerspace@gmail.com</a>.</p>
    </div>
  </main></PublicShell>;
}
