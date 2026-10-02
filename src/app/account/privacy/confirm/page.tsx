import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { PublicShell } from "@/components/niuva/public-shell";
import { PrivacyForm } from "@/components/niuva/privacy-form";
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
  return <PublicShell functionalStatus="server-backed" scope="account"><main id="main-content" className="mx-auto min-h-[60vh] max-w-2xl px-5 py-12 sm:px-8 sm:py-16"><p className="text-sm font-medium text-primary">Niuva / Privasi</p><h1 className={`mt-4 ${type.heading.className}`}>{close ? "Konfirmasi penutupan akun" : "Konfirmasi salinan data"}</h1>{!proof || !token.success ? <><p role="alert" className="mt-6 leading-7">Tautan tidak berlaku atau sesi berbeda. Buka melalui browser yang meminta tautan. Jika sesi sudah berakhir atau tautan terpakai/kedaluwarsa, masuk dan minta tautan baru.</p><Link className="mt-6 inline-flex min-h-11 items-center text-primary underline" href="/account/privacy">Ke Pusat privasi</Link></> : <><p className="my-6 leading-7 text-muted-foreground">{close ? "Tindakan ini permanen dan tidak dapat dipulihkan. Akses akun berhenti; profil, credential, sesi, token, dan persetujuan akun dihapus. Pesanan serta pekerjaan aktif tetap diselesaikan melalui kontak terverifikasi. Data bisnis dan berkas dengan retensi tersendiri tetap disimpan. Akun Google dan data provider tidak dihapus." : "Unduh data milik Anda dalam format JSON. Setelah dipakai, tautan ini tidak dapat digunakan kembali. Membuka halaman ini belum mengunduh atau mengubah data."}</p>{close ? <p className="mb-6 text-sm leading-6">Unduh data terlebih dahulu melalui <Link href="/account/privacy" className="inline-flex min-h-11 items-center text-primary underline">Pusat privasi</Link>. Tidak ada masa pemulihan atau pemulihan riwayat otomatis setelah daftar ulang.</p> : null}<PrivacyForm prefix="privacy-confirm" mode={close ? "close" : "export"} action={close ? "/api/account/privacy/close" : "/api/account/privacy/export"} hidden={{ token: token.data }} label={close ? "Tutup akun secara permanen" : "Unduh JSON data saya"} danger={close} fields={close ? [{ name: "permanent", kind: "checkbox", required: true, label: "Saya memahami konsekuensinya dan menyetujui penutupan permanen akun Niuva." }] : []} /></>}<p className="mt-8 text-sm text-muted-foreground">Kontak tindak lanjut: <a className="inline-flex min-h-11 items-center text-primary underline" href="mailto:niuvamakerspace@gmail.com">niuvamakerspace@gmail.com</a>.</p></main></PublicShell>;
}
