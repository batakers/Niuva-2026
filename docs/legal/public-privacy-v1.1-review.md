# Kebijakan Privasi Niuva v1.1 — draf untuk review Owner

**Status:** draf T44, 30 Oktober 2026. Belum disetujui, belum terbit, dan
tidak dipakai aplikasi. Versi berlaku tetap `NIUVA-PRIVACY-v1.0`
(`src/content/customer-policy/privacy-v1.0.md`).

## Catatan untuk Owner

**Alasan versi baru.** Production pindah ke satu Helipod VPS di Jakarta (Q5),
cadangan database dan arsip pembukuan ke Biznet Gio (Q12), sementara berkas
tetap di Cloudflare R2 (Q13). Bagian 3 v1.0 menyebut Netlify (Ohio) dan Neon
(Singapura) dan menyatakan perubahan material terbit sebagai versi baru.

**Perubahan dibanding v1.0** (selain bagian di bawah, teks sama persis):

1. Bagian 3: baris Netlify dan Neon diganti satu baris Helipod (Jakarta).
   Baris baru Biznet Gio untuk cadangan dan arsip pembukuan.
2. Bagian 3: lokasi Resend menjadi "Amerika Serikat dan Jepang (Tokyo)",
   karena domain kirim `mail.niuva.id` dibuat di region Tokyo (log TASKS
   28 Oktober). Mohon dikonfirmasi; bila Owner memilih teks lama, baris ini
   dikembalikan.
3. Bagian 6: paragraf cadangan kini menjelaskan cadangan harian milik Niuva,
   disimpan terpisah dari server, dengan masa simpan yang perlu ditetapkan.

**Yang perlu diputuskan Owner sebelum terbit:**

- **Masa simpan cadangan database**, misalnya 30 hari. Ini menentukan berapa
  lama data yang sudah dihapus masih ada di cadangan. Agen tidak mengisi nilai
  ini.
- **Tanggal terbit dan tanggal berlaku**, dengan pemberitahuan sebelum berlaku
  (bagian 8).

**Yang harus terbukti sebelum terbit** (policy tidak boleh menjanjikan hal
yang belum ada):

- VPS Helipod Jakarta sudah aktif dan menyimpan database production (T41).
- Cadangan harian ke Biznet Gio berjalan, terpisah dari server, dan
  penghapusan sesuai masa simpan berjalan (T38). Lokasi Indonesia untuk bucket
  Biznet Gio belum diverifikasi.
- Bucket R2 production dibuat dengan lokasi Asia Pasifik.

**Langkah teknis setelah teks disetujui** (bagian dari T44, belum dikerjakan):
file `privacy-v1.1.md`, checksum dan metadata di
`src/modules/customer-auth/public-policy.ts`, tanggal terbit/berlaku,
pemberitahuan kepada pemilik akun, serta perlakuan persetujuan v1.0 yang sudah
tercatat. Bagian ini ikut kontrak `docs/legal/customer-policy-implementation.md`.

---

# Kebijakan Privasi Niuva

**Versi:** NIUVA-PRIVACY-v1.1
**Diterbitkan:** [TANGGAL TERBIT — ditetapkan Owner]
**Berlaku sejak:** [TANGGAL BERLAKU — ditetapkan Owner]

Kebijakan ini menjelaskan data pribadi apa yang dikumpulkan Niuva, untuk apa,
kepada siapa data dibagikan, berapa lama disimpan dan bagaimana Anda
menggunakan hak Anda.

## 1. Pengendali data dan kontak

**PT. NIUVA INOVASI UTAMA**, Jl. Telekomunikasi No.1, Sukapura, Kec.
Dayeuhkolot, Kabupaten Bandung, Jawa Barat.

Kontak privasi: **niuvamakerspace@gmail.com** dan **085117678901**. Kontak ini
tetap dapat digunakan setelah akun Anda ditutup.

## 2. Data yang dikumpulkan dan tujuannya

| Kategori | Contoh data | Tujuan |
| --- | --- | --- |
| Akun | Nama, email dan status verifikasinya, identitas akun Google bila Anda memakainya, hash password, sesi login, pernyataan usia, catatan persetujuan Syarat dan Kebijakan Privasi | Membuat dan mengamankan akun serta membuktikan tindakan Anda |
| Transaksi | Pesanan Shop, alamat dan nomor telepon penerima, rincian pembayaran dan pengiriman | Memproses, membayar dan mengirim pesanan |
| Custom Print | Spesifikasi permintaan, berkas desain, quote | Review, penawaran dan produksi |
| Layanan | Komunikasi keluhan, retur, refund dan permintaan privasi | Menangani keluhan dan hak Anda |
| Keamanan | Data pembatasan percobaan login dalam bentuk digest, catatan audit yang diperlukan | Mencegah penyalahgunaan dan menangani insiden |

Password asli tidak disimpan. Niuva tidak mengumpulkan tanggal lahir,
identitas resmi, data biometrik atau melakukan verifikasi usia; akun hanya
untuk usia 18 tahun ke atas berdasarkan pernyataan Anda. Niuva tidak memakai
data Anda untuk promosi atau pemasaran.

**Dasar pemrosesan.** Data akun, transaksi dan Custom Print diproses untuk
melaksanakan perjanjian dengan Anda atau langkah sebelum perjanjian. Arsip
pembukuan disimpan untuk memenuhi kewajiban hukum. Data keamanan diproses
seminimal mungkin untuk kepentingan sah menjaga layanan. Bila suatu pemrosesan
memakai persetujuan, tujuannya dijelaskan secara khusus dan persetujuan dapat
ditarik melalui kontak privasi; penarikan tidak menghapus dasar sah untuk
kewajiban transaksi atau arsip wajib.

Jika Anda memasukkan data orang lain, misalnya nama dan alamat penerima, Anda
perlu memastikan orang tersebut mengetahui dan menyetujui penggunaannya untuk
pengiriman.

## 3. Penyedia layanan dan lokasi pemrosesan

Niuva memakai penyedia berikut untuk menjalankan layanan:

| Penyedia | Fungsi | Data yang diterima | Lokasi pemrosesan |
| --- | --- | --- | --- |
| Helipod | Server website, aplikasi dan database (VPS) | Seluruh data akun, transaksi dan layanan | Indonesia (Jakarta) |
| Biznet Gio | Penyimpanan cadangan database harian dan salinan arsip pembukuan | Salinan database dan dokumen pembukuan | Indonesia |
| Cloudflare R2 | Penyimpanan berkas desain dan media | Berkas Custom Print, foto produk | Asia Pasifik |
| Resend | Pengiriman email verifikasi, reset password dan konfirmasi | Nama, email, isi email layanan | Amerika Serikat dan Jepang (Tokyo) |
| Midtrans | Pembayaran | Nomor pesanan dan nominal. Data pembayaran yang Anda isi di halaman Midtrans diproses langsung oleh Midtrans | Indonesia |
| Biteship | Perhitungan ongkos kirim | Kode pos atau area tujuan, nama dan nilai barang, berat dan ukuran paket | Indonesia |
| Kurir pengiriman | Mengantar paket | Nama, telepon dan alamat penerima pada label paket | Indonesia |
| Google | Login dengan akun Google, bila Anda memilihnya | Identitas akun Google | Global |

Sebagian data diproses di luar Indonesia. Niuva memilih penyedia yang
menerapkan perlindungan data yang memadai sesuai Undang-Undang Pelindungan
Data Pribadi. Daftar ini diperbarui bila penyedia berubah, termasuk saat
hosting aplikasi dipindahkan, dan perubahan material diterbitkan sebagai
versi baru kebijakan ini.

Menutup akun Niuva tidak menutup akun Google Anda.

## 4. Hak Anda dan Pusat Privasi

Melalui **Pusat Privasi** di akun Anda, Anda dapat:

- **mengunduh salinan data** dalam format JSON: profil, persetujuan, pesanan,
  permintaan Custom Print, metadata berkas dan permintaan privasi. Salinan
  tidak memuat password, token akses, kredensial, data internal penyedia atau
  data akun lain;
- **meminta koreksi** data yang salah;
- **meminta data tambahan**, misalnya komunikasi di luar unduhan otomatis;
- **menutup akun** secara permanen.

Unduhan dan penutupan akun memerlukan konfirmasi email sekali pakai yang
berlaku **15 menit** dan terikat pada sesi browser Anda. Nomor permintaan,
status dan tanggapan dapat dilihat di akun selama akun masih aktif. Setelah
akun ditutup, gunakan kontak privasi.

Permintaan akses dan koreksi ditanggapi paling lambat **3×24 jam** sejak
diterima, sesuai UU PDP. Untuk hak lain, seperti menarik persetujuan, meminta
penundaan atau pembatasan pemrosesan, keberatan atau portabilitas data,
hubungi kontak privasi.

## 5. Penutupan akun

Kami sarankan mengunduh data sebelum menutup akun. Setelah penutupan
dikonfirmasi, akses dihentikan, semua sesi dicabut, dan profil, kredensial
serta persetujuan akun dihapus dari akun. Tidak ada masa pemulihan.

Data yang masih diperlukan, seperti pesanan, pembayaran, pengiriman, berkas
dengan jadwal penyimpanan sendiri dan kasus yang belum selesai, tidak ikut
dihapus dan dipisahkan dari profil. Riwayat tersebut tidak otomatis
ditautkan ke akun baru meskipun Anda mendaftar ulang dengan email yang sama.

## 6. Masa penyimpanan

| Data | Masa penyimpanan |
| --- | --- |
| Akun aktif | Sampai akun ditutup |
| Pendaftaran yang belum selesai, sesi dan token sementara | 7 hari setelah selesai atau kedaluwarsa |
| Catatan persetujuan Syarat dan Kebijakan Privasi setelah akun ditutup | 30 hari setelah penutupan |
| Bukti keamanan penutupan akun (digest, tanpa profil) | 30 hari setelah penutupan |
| Log keamanan aplikasi | Paling lama 30 hari |
| Isi komunikasi permintaan privasi | 7 hari setelah permintaan selesai |
| Ringkasan kasus (nomor, jenis, tanggal, hasil) | 30 hari setelah selesai |
| Berkas yang tidak dilanjutkan, ditolak atau tidak terhubung | 14 hari |
| Berkas pengajuan atau quote yang dibatalkan, ditolak atau tidak dibayar | 60 hari |
| Berkas pesanan Custom Print | 90 hari sejak pesanan selesai |
| Dokumen pembukuan dan transaksi | 10 tahun, sesuai UU KUP Pasal 28 ayat (11) |

Penyimpanan dapat diperpanjang untuk sengketa, insiden atau kewajiban hukum
tertentu, dengan alasan, penanggung jawab dan tanggal tinjauan yang dicatat.
Kewajiban arsip 10 tahun tidak berarti seluruh profil, token atau percakapan
disimpan 10 tahun.

Penghapusan dari database aplikasi tidak langsung menghapus salinan cadangan.
Salinan cadangan harian disimpan terpisah dari server aplikasi paling lama
[MASA SIMPAN CADANGAN — ditetapkan Owner], lalu dihapus. Salinan cadangan
tidak dipakai untuk memulihkan data yang sudah dihapus kecuali untuk pemulihan
bencana.

## 7. Keamanan dan pemberitahuan insiden

Niuva menggunakan verifikasi email, hash password, pembatasan percobaan
login, pemeriksaan asal permintaan, token sekali pakai, akses terbatas untuk
pengurus Niuva dengan autentikasi dua langkah, serta penyimpanan berkas secara
privat dengan tautan akses berjangka pendek.

Jika terjadi kegagalan pelindungan data pribadi, Niuva memberi tahu Anda dan
lembaga yang berwenang **paling lambat 3×24 jam** sejak diketahui, sesuai UU
PDP Pasal 46, berisi data yang terdampak, waktu dan cara kejadian, serta
upaya penanganan dan pemulihan.

## 8. Perubahan kebijakan

Perubahan material diterbitkan sebagai versi baru dengan tanggal berlaku dan
pemberitahuan yang jelas sebelum berlaku.

## Dasar hukum yang dirujuk

- Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi
- Undang-Undang No. 28 Tahun 2007 tentang Ketentuan Umum dan Tata Cara
  Perpajakan, Pasal 28 ayat (11), sebagaimana telah diubah
