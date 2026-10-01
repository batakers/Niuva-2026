import { notFound } from "next/navigation";
import { connection } from "next/server";
import { InternalAuthLayout } from "@/components/niuva/internal-auth-layout";
import { getInternalAuthConfig, INTERNAL_TERMS_VERSION, INTERNAL_PRIVACY_VERSION } from "@/modules/customer-auth/internal-testing";
export const metadata = { title: "Policy Pengujian Internal · Niuva", robots: { index: false, follow: false } };
export default async function Policy({ searchParams }: { searchParams: Promise<{ document?: string }> }) {
  await connection();
  if (!getInternalAuthConfig()) notFound();
  const { document } = await searchParams;
  if (document !== "terms" && document !== "privacy") notFound();
  const privacy = document === "privacy";
  return <InternalAuthLayout title={privacy ? "Pemberitahuan Privasi Pengujian" : "Ketentuan Pengujian Internal"}>
    <p className="text-sm text-muted-foreground">Versi {privacy ? INTERNAL_PRIVACY_VERSION : INTERNAL_TERMS_VERSION} · 2 Oktober 2026</p>
    <p>Dokumen ini berlaku untuk pemilik yang menguji autentikasi Niuva pada lingkungan Development lokal. Pendaftaran dibatasi pada dua email milik peserta yang ditetapkan untuk Google dan email/password.</p>
    {privacy ? <>
      <section><h2 className="text-lg font-medium">Data dan tujuan pemrosesan</h2><p>Google menyediakan identitas akun, nama, email, dan foto profil bila tersedia. Niuva menyimpan profil, identitas Google, hash password dengan salt, sesi, hash token sekali pakai, serta versi dan waktu persetujuan untuk menguji pendaftaran, login, verifikasi, dan pemulihan akun. Password asli tidak disimpan. Batas percobaan menggunakan hash email dan alamat jaringan.</p></section>
      <section><h2 className="text-lg font-medium">Google dan Resend</h2><p>Google memproses login melalui OAuth. Resend menerima alamat email tujuan, isi email, dan tautan verifikasi atau reset untuk pengiriman. Tautan berisi token sementara; jangan membagikannya. Data pengujian tidak digunakan untuk pemasaran.</p></section>
    </> : <>
      <section><h2 className="text-lg font-medium">Penggunaan akun</h2><p>Gunakan email dan data milik sendiri. Akun Google dan akun password terpisah dan tidak digabungkan berdasarkan email. Pendaftaran password memerlukan verifikasi email; setelah verifikasi, masuk melalui halaman Login. Persetujuan untuk akun Google diselesaikan sebelum akun baru dibuat.</p></section>
      <section><h2 className="text-lg font-medium">Batas pengujian</h2><p>Lingkungan ini digunakan untuk memeriksa fungsi akun. Dokumen ini tidak menetapkan harga, jaminan produksi, aturan pembatalan, refund, atau syarat transaksi komersial. Syarat Layanan dan Kebijakan Privasi untuk Customer publik masih berupa draf dengan keputusan yang belum ditetapkan.</p></section>
    </>}
    <section><h2 className="text-lg font-medium">Masa berlaku dan penghapusan lokal</h2><p>Akses akun berakhir 30 hari sejak akun dibuat. Login tidak memperpanjang tenggat. Data pendaftaran yang belum selesai juga memiliki tenggat 30 hari sejak pendaftaran dimulai.</p><p>Profil, credential, sesi, token, dan persetujuan akun internal dihapus oleh jadwal harian berikutnya yang berhasil berjalan. Komputer dan PostgreSQL perlu tersedia; penghapusan fisik dapat tertunda saat keduanya tidak tersedia, sedangkan akses tetap berakhir pada tenggat.</p></section>
    <section><h2 className="text-lg font-medium">Data di luar pembersihan akun</h2><p>Pesanan, Project Brief, permintaan Custom Print, quote, serta unggahan tidak dihapus oleh pembersihan akun; relasinya ke akun dilepas. Data tersebut mengikuti kebijakan tersendiri dan retensi legal/akuntansi yang masih menunggu keputusan. Pembersihan lokal juga tidak menghapus akun atau catatan provider Google dan Resend.</p></section>
    <section><h2 className="text-lg font-medium">Kontrol peserta</h2><p>Peserta adalah pemilik yang menjalankan pengujian ini dan dapat menghentikan pendaftaran internal pada konfigurasi lokal. Jadwal pembersihan tetap diperlukan untuk memenuhi retensi data yang sudah dibuat. Identitas usaha, kontak Customer/privasi resmi, dan kebijakan transaksi publik belum ditetapkan.</p></section>
  </InternalAuthLayout>;
}
