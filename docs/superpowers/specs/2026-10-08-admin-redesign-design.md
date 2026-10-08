# Niuva Admin — Kesepakatan Fitur dan UX

**Tanggal:** 8 Oktober 2026, Asia/Jakarta.
**Status:** proposal fitur dan arah UX disetujui Owner dalam percakapan; permintaan saat ini adalah membuat plan sebelum implementasi kode. Penerimaan visual aplikasi hasil implementasi belum dilakukan.
**Baseline inspeksi:** checkout `C:\Portfolio\NIUVA 2026`, branch `main`, HEAD `4c60f69`, beserta perubahan lokal yang sudah ada.

## 1. Tujuan

Merancang ulang seluruh Admin Niuva berdasarkan referensi Owner: sidebar ramping, navbar dengan pencarian/lonceng/akun, Overview bento yang ringkas, serta halaman kerja yang konsisten. Memperluas fitur dengan Customers, Konten, Keuangan, dan Laporan sesuai keputusan di bawah.

## 2. Kesepakatan yang sudah disetujui

| ID | Keputusan |
|---|---|
| S01 | Overview memakai bento grid dengan susunan tetap. Owner dan Admin memakai komposisi yang sama; menu/tindakan mengikuti hak akses. |
| S02 | Empat kartu perhatian: B2B, Custom Print, Orders, isu operasional. Sumbernya pekerjaan terbuka saat ini, independen dari periode laporan. |
| S03 | Overview memuat ringkasan penerimaan/pengeluaran tercatat dan order dibayar, aktivitas terbaru sekitar 4–5 item, serta trafik ringkas. Rincian panjang berada di halaman layanan dan Laporan. |
| S04 | Action Queue dihapus sebagai menu dan halaman kerja. Pekerjaan tetap dapat ditemukan lewat daftar layanan, kartu perhatian, pencarian, dan notifikasi. |
| S05 | Navbar menyediakan pencarian global, situs publik, lonceng, avatar/nama/peran. Menu akun: Akun saya, Keamanan akun, Keluar. |
| S06 | Lonceng membuka panel riwayat aktivitas/pemberitahuan. Status dibaca per akun. Membaca pemberitahuan tidak menyelesaikan pekerjaan. |
| S07 | Pop-up otomatis hanya untuk kejadian baru yang membutuhkan perhatian. Riwayat lama tersedia di panel; login tidak memutar ulang pop-up lama. Setiap pemberitahuan mengarah ke record terkait. |
| S08 | Daftar → Detail lengkap → Lakukan tindakan. Tidak memakai panel ringkasan sebagai langkah wajib. Filter, pencarian, halaman, dan posisi daftar dipertahankan saat kembali. |
| S09 | Custom Print review dan proposal B2B memiliki halaman kerja lengkap. DEVELOP, MAKE, dan BUY tetap terpisah. |
| S10 | Customers menjadi direktori dan riwayat Orders/Custom Print/B2B. Relasi menggunakan customerId yang sah; tidak menggabungkan atau memulihkan riwayat dengan mencocokkan email. |
| S11 | Konten memuat Portfolio dan Informasi Situs: deskripsi singkat bisnis, kontak, alamat, tautan media sosial, dengan pratinjau sebelum diterapkan. |
| S12 | Keuangan memuat Invoice, Transaksi Pembayaran, Pengeluaran. Invoice mencakup ready-made, Custom Print, dan B2B; sumber masing-masing jelas. |
| S13 | Owner memilih pembayaran penuh atau DP + pelunasan per proyek B2B dan menentukan nominal DP sesuai kesepakatan. |
| S14 | B2B memakai transfer langsung ke rekening Niuva. Owner/Admin memeriksa dana masuk, lalu mencatat pembayaran terkonfirmasi, tanggal, nominal, referensi/catatan. |
| S15 | Konfirmasi tambahan saat planning: satu invoice B2B senilai total proyek dengan dua jadwal pembayaran, riwayat transfer, jumlah terbayar, dan sisa tagihan. Nilai invoice tidak berubah karena pembayaran masuk. |
| S16 | Owner dan Admin dapat menerbitkan/mengelola invoice, mencatat pengeluaran, memverifikasi transfer B2B. Konfirmasi tambahan: keduanya juga dapat mengoreksi/membatalkan catatan keuangan dengan alasan serta riwayat tersimpan. |
| S17 | Laporan menjadi satu menu untuk operasional, keuangan, dan trafik situs, dengan bagian yang jelas. |
| S18 | Pricing Rules dipindahkan ke Pengaturan → Tarif Custom Print, khusus Owner. Alur Ubah → Tinjau → Terapkan; langsung berlaku setelah konfirmasi, tanpa langkah simpan draft. Versi baru tidak mengubah quote yang sudah diterbitkan. |
| S19 | Admin & Akses lengkap khusus Owner, termasuk undangan dan penonaktifan Admin. Privasi Customer tetap khusus Owner. Peran hanya Owner dan Admin. |
| S20 | Diskon ditunda. Tidak menambahkan Add Widget, AI Assistant, Upgrade Premium, layout personal, atau metrik bisnis yang belum memiliki sumber data. |

## 3. Navigasi tujuan

| Menu | Route utama tujuan | Detail |
|---|---|---|
| Overview | `/admin` | susunan tetap, kedua peran |
| Orders | `/admin/orders` | detail existing `/admin/orders/[id]` |
| Custom Print | `/admin/custom-print` | detail dan workspace review existing |
| B2B Inquiries | `/admin/inquiries` | detail dan workspace proposal existing |
| Customers | `/admin/customers` | detail `/admin/customers/[id]` |
| Products & Stock | `/admin/products` | detail/riwayat stok existing |
| Konten → Portfolio | `/admin/portfolio` | route existing, breadcrumb di bawah Konten |
| Konten → Informasi Situs | `/admin/content/site-information` | formulir dan preview |
| Keuangan → Invoice | `/admin/finance/invoices` | detail `/admin/finance/invoices/[id]` |
| Keuangan → Transaksi Pembayaran | `/admin/finance/payments` | detail `/admin/finance/payments/[id]` |
| Keuangan → Pengeluaran | `/admin/finance/expenses` | tambah dan detail |
| Laporan | `/admin/reports` | ringkasan, orders, custom-print, B2B, keuangan, trafik |
| Pengaturan | `/admin/settings` | indeks Owner; tautan tarif, akses, privasi |
| Tarif Custom Print | `/admin/settings/custom-print-rates` | Owner |
| Admin & Akses | `/admin/admins` | pertahankan route existing |
| Privasi Customer | `/admin/privacy` | pertahankan detail dan policy existing |

Route `/admin/queue` menjadi redirect kompatibilitas ke Overview/daftar domain yang tepat; tidak merender antrean tersendiri. `/admin/pricing` menjadi redirect Owner-only ke Tarif Custom Print. File lama tidak perlu dihapus untuk mencapai perubahan navigasi tersebut.

## 4. Hak akses

| Kemampuan | Owner | Admin |
|---|---|---|
| Overview, operasional, Customers, Konten, Laporan | ya | ya, mengikuti izin domain |
| Invoice, pengeluaran, transfer B2B, koreksi/pembatalan pencatatan | ya | ya |
| Pola pembayaran/nominal DP B2B | ya | tidak |
| Tarif Custom Print | ya | tidak |
| Undang/nonaktifkan Admin dan Privasi Customer | ya | tidak |

Koreksi pencatatan menggunakan versi pengganti/reversal yang terlacak. Izin ini tidak memberikan kewenangan baru untuk mengubah status Midtrans, melakukan refund provider, melewati hold pembayaran/pengiriman, atau menghapus riwayat. Izin refund provider existing tetap dipertahankan.

## 5. Invarian sumber dan visual

- `DESIGN.md` tetap acuan identitas: Space Grotesk untuk UI kerja; logo resmi; semantic tokens; tinggi kontrol minimal 44px; radius control 8px/card 12px; reduced motion.
- Referensi menentukan komposisi, bukan sumber angka. Jangan membuat pendapatan, laba, unique visitors, pertumbuhan, atau customer fiktif pada aplikasi.
- Jumlah pekerjaan berasal dari status bisnis, bukan jumlah notifikasi belum dibaca.
- Pembayaran ready-made/Custom Print berasal dari konfirmasi pembayaran existing; invoice tidak membuat pembayaran duplikat. Ongkir Custom Print tetap menunggu paket final.
- Data finansial memakai Decimal dan IDR; draft invoice tidak dihitung sebagai uang masuk; pengeluaran terkoreksi tidak dihitung ganda.
- Quote yang diterbitkan adalah snapshot. Perubahan tarif tidak mengganti harga quote lama, tetapi perubahan review/model/expired quote dan persyaratan accept existing tetap berlaku.
- Customer closure/fences, accountClosedAt, MFA wajib, profil aktif, private storage, audit, serta lock pembayaran existing tetap dipertahankan.

## 6. Batas plan dan rincian teknis yang diajukan

Rincian berikut adalah usulan implementasi yang ditinjau melalui plan, bukan fakta bisnis baru dari Owner:

- Invoice diterbitkan operator dari sumber yang sah. B2B satu dokumen proyek; produksi dan ongkir Custom Print memiliki dokumen terpisah ketika keduanya ditagihkan pada waktu berbeda. Invoice produk memakai order existing.
- Nomor invoice usulan `INV-YYYYMM-000001`, urutan atomik per bulan Jakarta; nomor yang dibatalkan tetap dipertahankan.
- Pengaturan identitas penerbit/instruksi rekening ditempatkan di `/admin/finance/settings`, dapat diubah Owner; kedua peran membaca instruksi melalui invoice. Nilai rekening diisi Owner melalui UI, tidak dikarang atau diminta di chat.
- Koreksi/pembatalan wajib alasan; nilai dokumen terbit tidak ditimpa; pembayaran manual/pengeluaran memakai reversal/pengganti. Pembatalan dokumen tidak menjalankan refund atau membatalkan pekerjaan otomatis.
- Lampiran pengeluaran opsional, private, JPEG/PNG/PDF maksimal 10 MiB; disimpan hanya bila storage tersedia. Retensi bukti finansial tidak menggunakan retensi CAD 14/60/90 hari.
- Penerimaan tercatat disajikan sebagai pembayaran masuk terkonfirmasi bruto, dengan refund/exception ditandai terpisah; tidak dilabeli laba atau saldo rekening.
- Download invoice PDF dari Admin; pengiriman otomatis email dan portal invoice Customer tidak termasuk perluasan ini.
- Informasi Situs mengedit field profil yang disebut S11; service IDs, intake enum, layout halaman, kebijakan legal, dan logo bukan field bebas CMS.

## 7. Keputusan yang tetap terpisah

Aktivasi produksi, data rekening/identitas legal asli, pajak/faktur pajak, serta retensi dokumen finansial untuk penggunaan nyata mengikuti keputusan Owner yang relevan sebelum penerbitan nyata/penyimpanan bukti nyata. Plan dapat diuji dengan fixture sintetis berlabel TEST. Tidak memilih pajak, jangka retensi finansial, persentase DP, rekening, atau tarif baru melalui kode.

Persetujuan proposal/plan tidak otomatis merupakan instruksi commit, push, perubahan migration lama, deployment, penggunaan kredensial produksi, atau delegasi. Pengerjaan saat ini hanya menyimpan dokumen planning.
