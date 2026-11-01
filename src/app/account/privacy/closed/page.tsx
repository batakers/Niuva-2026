import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
export const metadata: Metadata = { title: "Penutupan akun · Niuva", robots: { index: false, follow: false } };
// This page contains no receipt or identity data. Only a successful POST
// redirects here; a direct visit is not evidence that an account was closed.
export default function AccountClosedPage() {
  return <PublicShell functionalStatus="server-backed" scope="account"><main id="main-content" className="mx-auto max-w-public overflow-x-hidden px-5 pt-10 pb-16 sm:px-12 sm:pt-14 sm:pb-24">
    <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Hasil penutupan akun</h1>
    <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">Jika Anda tiba di sini setelah konfirmasi berhasil, akses akun telah dihentikan. Profil akun, credential, sesi, token autentikasi, dan persetujuan akun dihapus secara permanen.</p>
    <section aria-labelledby="closed-retained-heading" className="mt-8 max-w-2xl rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
      <h2 className="text-xl font-medium tracking-[-0.015em]" id="closed-retained-heading">Data yang tetap diperlukan</h2>
      <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Pesanan, pembayaran, pengiriman, Project Brief, Custom Print, dan berkas sesuai retensinya tetap disimpan untuk menyelesaikan pekerjaan serta kewajiban pencatatan. Kasus privasi aktif diteruskan melalui kontak terverifikasi. Bukti keamanan minimum disimpan maksimal 30 hari. Riwayat tidak tertaut kembali otomatis saat daftar ulang.</p>
      <p className="mt-3 text-ui font-normal leading-[1.55]">Penutupan tidak membatalkan pesanan, menghapus akun Google, atau membuktikan penghapusan pada backup/provider.</p>
    </section>
    <p className="mt-6 max-w-2xl text-ui font-normal leading-[1.55] text-muted-foreground">Tindak lanjut atau permintaan data setelah penutupan: <a href="mailto:niuvamakerspace@gmail.com" className="font-medium text-primary underline underline-offset-4">niuvamakerspace@gmail.com</a> · 085117678901. Sertakan nomor permintaan/pesanan; Niuva memverifikasi pemohon sebelum menyediakan data.</p>
    <NiuvaLink className="mt-8 min-h-11" href="/">Kembali ke situs</NiuvaLink>
  </main></PublicShell>;
}
