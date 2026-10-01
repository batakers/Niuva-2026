# Draf internal — Kebijakan Privasi Customer Niuva

**Status:** bahan tinjauan Owner dan penasihat hukum; **belum disetujui, diterbitkan, atau berlaku**. Dokumen ini bukan versi yang dapat disetujui Customer pada formulir pendaftaran. Semua penanda **TBD** harus diputuskan berdasarkan alur data dan identitas usaha yang nyata sebelum publikasi.

## 1. Pengendali data dan kontak

Pengendali data untuk layanan Niuva adalah **TBD — nama badan usaha atau pemilik usaha yang sah**, beralamat di **TBD — alamat usaha resmi**. Permintaan terkait data pribadi dapat disampaikan ke **TBD — email/kanal privasi resmi**.

## 2. Data yang dapat diproses

Menurut rancangan produk saat ini, kategori data meliputi:

- **Akun dan autentikasi:** nama, email, status verifikasi, identitas Google bila metode tersebut digunakan, hash password untuk akun email, sesi, dan catatan persetujuan dokumen.
- **Permintaan dan transaksi:** identitas perusahaan/kontak Project Brief, informasi Custom Print dan berkas 3D/CAD, produk Shop, alamat dan pilihan pengiriman, pesanan, status pembayaran, serta komunikasi terkait layanan.
- **Keamanan dan operasional:** data teknis yang diperlukan untuk mencegah penyalahgunaan, pembatasan percobaan login, dan penyelesaian gangguan.

**TBD sebelum publikasi:** inventaris final tiap formulir, log infrastruktur/provider yang benar-benar aktif, apakah data anak dapat diproses, dan apakah ada data sensitif dalam unggahan Customer yang memerlukan pembatasan tambahan.

## 3. Tujuan dan dasar pemrosesan

Tujuan yang direncanakan adalah membuat dan mengamankan akun; menanggapi Project Brief; meninjau, menawarkan, dan memproses Custom Print; memenuhi pesanan Shop, pembayaran, dan pengiriman; serta menangani permintaan bantuan dan kewajiban pencatatan yang berlaku.

**TBD — dasar pemrosesan yang tepat untuk masing-masing tujuan, kebutuhan persetujuan terpisah bila ada, dan penggunaan data untuk komunikasi pemasaran.** Persetujuan Syarat Layanan/Kebijakan Privasi pada formulir pendaftaran tidak boleh dipakai sebagai pengganti semua dasar pemrosesan tanpa tinjauan hukum.

## 4. Penyedia layanan dan pengungkapan

Rancangan teknis menyebut Google untuk login, Resend untuk email autentikasi, penyimpanan privat untuk berkas Customer, serta penyedia pembayaran, pengiriman, hosting, dan database sesuai capability yang diaktifkan. **TBD — daftar penyedia yang benar-benar dipakai pada saat publikasi, kategori data yang diterima masing-masing, lokasi pemrosesan/transfer lintas negara, dan dasar pengungkapan.** Penyedia yang masih berada dalam tahap rencana atau sandbox tidak boleh ditulis seolah-olah sudah aktif untuk Customer produksi.

## 5. Penyimpanan dan penghapusan

Keputusan teknis Niuva untuk berkas privat Customer menetapkan batas unggahan 100 MiB per berkas dan rancangan lifecycle: unggahan tanpa lampiran atau ditolak setelah 14 hari; berkas permintaan/penawaran kustom yang batal, ditolak, atau tidak dibayar setelah 60 hari; berkas model pesanan selesai mengikuti keputusan 90 hari yang tercatat dalam [keputusan backend](../backend/phase-2-closure-decisions.md). **TBD — pembuktian bahwa proses penghapusan berjalan pada lingkungan yang diterbitkan, masa simpan akun, sesi, log, komunikasi, pesanan, pembayaran, dan catatan legal/akuntansi.** Jangan menyatakan berkas telah dihapus otomatis sebelum proses operasionalnya terverifikasi.

## 6. Keamanan dan hak Customer

Rancangan aplikasi memakai kontrol seperti verifikasi email, hash password, sesi Customer terpisah, dan akses privat untuk berkas. **TBD — kontrol keamanan yang benar-benar dioperasikan, prosedur insiden, cara Customer meminta akses/koreksi/penghapusan atau menjalankan hak lainnya, cara verifikasi pemohon, serta kanal dan waktu tanggapan resmi.** Hak dan kewajiban perlu ditinjau terhadap [UU Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022-10).

## 7. Analitik, perubahan kebijakan, dan kontak

Draf pengukuran halaman publik berada di [pemberitahuan analitik internal](../frontend/analytics-privacy-notice-draft.md) dan belum menjadi klaim aktivitas produksi. **TBD — status aktivasi analitik dan cookie/teknologi lain yang benar-benar digunakan, nomor versi, tanggal berlaku, cara pemberitahuan perubahan, serta alamat kontak privasi resmi.**

## Sebelum dokumen ini dapat diterbitkan

1. Owner menyetujui identitas pengendali, kontak, inventaris data, penyedia aktif, dasar pemrosesan, dan masa simpan yang faktual.
2. Verifikasi implementasi dan konfigurasi provider pada lingkungan yang akan diterbitkan; jangan menyamakan mock/test dengan pengiriman atau penghapusan nyata.
3. Owner/penasihat hukum meninjau draf terhadap UU Pelindungan Data Pribadi dan kewajiban lain yang berlaku.
4. Setelah disetujui, tetapkan versi/tanggal berlaku dan URL publik yang stabil; barulah hubungkan versi tersebut ke persetujuan pendaftaran Customer dan branding OAuth yang ditujukan untuk publik.
