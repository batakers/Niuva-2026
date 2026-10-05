# SOP keluhan, retur dan refund Customer

**Versi:** SERVICE-REFUND-2026-10-03-v1. **Status:** kontrak operasional untuk review dan implementasi; alur kasus/refund aplikasi belum tersedia pada baseline PR #38. Mengikuti [Syarat Layanan v3](customer-terms-draft.md), [addendum PRD](../PRD-Niuva-MVP.md#addendum-persiapan-customer-publik--3-oktober-2026) dan [matriks kesiapan](customer-public-launch-readiness.md). Nama status di bawah adalah konsep kontrak, bukan enum/schema runtime.

## Petugas, kanal dan kalender

Owner bertanggung jawab atas keputusan, persetujuan refund dan eskalasi. **Rheza** telah ditetapkan Owner sebagai petugas utama layanan, privasi dan tindak lanjut pembayaran/refund pada 3 Oktober 2026. Petugas layanan menerima dan memantau kasus; petugas pembayaran memeriksa provider/rekonsiliasi; petugas privasi menangani data/closure. Aksi dan kewenangan tetap tercatat. Pengganti saat tidak tersedia, jam/coverage dan akses kanal belum dikonfirmasi (PUB-SERVICE). Penugasan ini tidak otomatis memberi Rheza role Owner atau permission aplikasi; tindakan yang memerlukan izin Owner tetap dilakukan/diperiksa pihak berizin. Aplikasi tidak memutuskan kelayakan refund tanpa Owner.

Kanal yang dikonfirmasi: **niuvamakerspace@gmail.com** dan **085117678901**. Petugas mencatat penerimaan dari seluruh kanal ke satu nomor kasus. Tidak mensyaratkan akun aktif untuk keluhan, retur atau refund. Perpindahan kanal tidak membuat kasus/tenggat baru. Jangan meminta password, OTP, token login, seluruh data kartu atau salinan data yang tidak relevan.

Hari kerja adalah **Senin–Jumat, selain libur nasional, WIB**. `receivedAt` menyimpan saat penerimaan pertama. Kalender tahunan, jam awal/akhir kerja, aturan permintaan di luar jam kerja dan perlakuan cuti bersama harus disahkan Owner sebelum publikasi; tanggal SLA tidak boleh dihitung memakai kalender yang belum disetujui. Hari libur tidak dipakai untuk mengubah tenggat privasi 72 jam kalender. Contoh perhitungan layanan dalam simulasi memakai tanggal non-libur dan tetap membutuhkan kalender/jam yang disahkan.

| Target layanan yang sudah dipilih | Pemicu yang dicatat | Tindakan/bukti |
| --- | --- | --- |
| Tanggapan awal maksimal 1 hari kerja | Penerimaan pertama keluhan | Nomor kasus, ringkasan, petugas dan langkah berikutnya disampaikan. Auto-reply saja tidak membuktikan pemeriksaan. |
| Pemeriksaan maksimal 2 hari kerja | Bukti yang diperlukan lengkap; atau retur diterima jika pemeriksaan fisik diperlukan | Kelengkapan, alasan pemeriksaan fisik dan hasil dicatat. Bukti tambahan harus spesifik/proporsional; tidak mengulang tenggat untuk menunda. |
| Mulai memproses refund maksimal 1 hari kerja | Persetujuan Owner dan semua syarat retur yang relevan terpenuhi | Job refund dikirim/dijalankan atau pengecualian manual mulai ditindaklanjuti dengan bukti. Antrean yang tidak dikerjakan bukan pemrosesan. |

Simpan waktu persetujuan, terpenuhinya retur dan pemicu pemrosesan; `refundReadyAt` adalah yang terakhir dari syarat wajib tersebut. Owner dapat menyetujui setelah retur atau memberikan persetujuan bersyarat; aplikasi tidak mengirim sebelum syaratnya terpenuhi. Waktu dana diterima bank/penerima adalah ETA metode/provider tersendiri, bukan tambahan SLA yang menjanjikan dana pasti tiba dalam satu hari kerja.

Petugas meninjau antrean pada awal dan akhir setiap hari kerja, memeriksa risiko lewat SLA sebelum berakhir, lalu mengeskalasi ke Owner/pengganti pada hari yang sama. Kasus terlambat tetap ditampilkan, diberi alasan dan rencana tindak lanjut serta pembaruan ke Customer; ganti petugas/status tidak mereset jam. Ambang alarm, jadwal coverage, pengganti dan cara eskalasi inbox/telepon harus dibuktikan PUB-SERVICE/PUB-JOBS. Hak privasi yang diterima pada kasus yang sama langsung masuk jalur tenggat kalender terpisah.

## Penerimaan dan pemeriksaan

1. Catat nomor kasus, waktu awal, order/quote yang dimaksud, kontak terverifikasi, alasan, hasil yang diminta dan bukti relevan. Jangan menampilkan order melalui pencocokan email semata; verifikasi kepemilikan/pihak berwenang melalui jalur aman yang ditetapkan. Untuk anak, ikuti keputusan wali/pihak transaksi PUB-GUARDIAN; pernyataan menjadi wali bukan bukti.
2. Periksa batas kirim yang disepakati, status pengiriman nyata, transaksi server, quote dan hasil/berkas terkait. Bedakan keterlambatan penyerahan ke kurir dari estimasi tiba. Jika batas kirim terlewati dan belum dikirim, tawarkan refund penuh atau jadwal baru yang disepakati. Catat pilihan; perubahan jadwal tidak sepihak.
3. Untuk cacat/ketidaksesuaian akibat Niuva, tawarkan penggantian/pengerjaan ulang atau retur dan refund penuh. Anjurkan laporan dalam 24 jam; bukan penggugur hak. Pertahankan paling sedikit 2 hari kerja sejak diterima dan hak cacat tersembunyi sesuai tinjauan [PP 80/2019 Pasal 69](https://www.peraturan.go.id/id/pp-no-80-tahun-2019). Video pembukaan paket bukan satu-satunya bukti yang diterima.
4. Owner mencatat hasil pemeriksaan, alasan menerima/menolak, pilihan Customer dan syarat retur jika perlu. Penolakan mempunyai alasan serta jalur eskalasi yang disahkan. Pembatalan saat jadwal masih dipenuhi memerlukan pemeriksaan kondisi/kesepakatan; tidak menciptakan potongan biaya atau retur berubah pikiran baru.

Keputusan keluhan pasca-produksi/pengiriman tidak memaksa pembatalan lifecycle order yang tidak diperbolehkan kontrak lama. Kebutuhan kasus keuangan pasca-pengiriman adalah perluasan target yang harus diimplementasikan terpisah; barang yang telah dikirim tetap mempunyai jejak tersebut. Refund tidak otomatis menambah stock. Barang retur yang benar-benar diterima/diperiksa mengikuti pencatatan stock/adjustment beralasan yang sesuai, bukan hasil refund API.

## Retur dan biaya

Alamat retur yang dikonfirmasi Owner adalah **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat**. Rheza mengoordinasikan kasus. Sebelum Customer mengirim, petugas memberikan **detail penerima/jam, nomor kasus, metode pengiriman, biaya yang ditanggung Niuva dan bukti serah terima**. Detail penerima serta jam akan diisi Owner; penugasan Rheza tidak otomatis mengonfirmasi ia adalah penerima fisik paket. Proses reimbursement ongkir juga masih perlu dilengkapi (PUB-BIZ, PUB-SERVICE); alamat tidak diminta ulang sebagai keputusan terbuka.

Jika retur diperlukan, simpan persetujuan instruksi, resi, waktu tiba dan hasil pemeriksaan; tidak mensyaratkan prosedur yang menghapus hak wajib Customer. Hilang/rusak dalam retur menjadi pengecualian yang diperiksa Owner, bukan penutupan otomatis. Jika tidak perlu retur atau Owner mengesampingkan syarat yang sah, catat alasannya dan pemicu SLA yang sesuai.

## Alur persetujuan hingga penyelesaian

Alur target: **Customer mengajukan → Owner memeriksa → syarat retur dipenuhi bila diperlukan → Owner menyetujui → aplikasi mengirim refund → hasil direkonsiliasi → penyelesaian dikonfirmasi**. Persetujuan bersyarat sebelum retur mengikuti guard yang sama. Tidak ada proses di bawah yang sudah dianggap diimplementasikan.

| Tahap konseptual | Syarat dan bukti berpindah tahap |
| --- | --- |
| Diterima / diperiksa | Nomor dan tenggat awal, order/pembayar terverifikasi; hasil pemeriksaan/kelengkapan terlihat. |
| Menunggu retur, bila perlu | Instruksi disetujui, alamat benar dan biaya ditetapkan; tidak memulai refund tanpa syarat terpenuhi. |
| Disetujui Owner | Identitas/izin Owner, alasan, hasil pilihan, snapshot nominal/alokasi server dan syarat retur dicatat. Persetujuan untuk nominal/cakupan berbeda wajib diperbarui. |
| Siap / antrean provider | Retur selesai atau tidak wajib; payment masih eligible, tidak ada refund berhasil/tak pasti yang tumpang tindih; job dengan identitas operasi tetap. |
| Dikirim / menunggu hasil | Permintaan/hasil provider minimum disimpan. Timeout, HTTP sukses atau respons accepted tidak otomatis selesai. |
| Pengecualian / rekonsiliasi | Cakupan metode, status/notification, saldo dan hasil bank diperiksa; retry atau manual hanya jika aman. |
| Penyelesaian terkonfirmasi | Hasil dana/refund terverifikasi dan diberitahukan ke Customer melalui kontak berwenang; bukti dan waktu penyelesaian dicatat. |

Penggantian/pengerjaan ulang mempunyai bukti penyerahan/penyelesaian sendiri. Jangan menandai kasus selesai sekadar jawaban dikirim, Owner menyetujui, job diantrekan atau permintaan provider diterima. Jika provider menyatakan dana dikonfirmasi tetapi Customer belum melihatnya, lanjutkan tindak lanjut yang tercatat; jangan menutup keluhan atas selisih tanpa pemeriksaan.

## Nominal dan identitas pembayaran

Versi pertama **refund penuh**, berasal dari ledger pembayaran server yang benar-benar berhasil diterima untuk pesanan. Ongkir awal yang ada dalam pembayaran termasuk refund. Fee provider tidak dipotong diam-diam dari hak Customer. Decimal digunakan pada domain uang; adapter provider memvalidasi unit/format tanpa mengambil nominal dari browser.

Custom Print dapat mempunyai pembayaran order dan ongkir akhir terpisah. Kasus penuh mengalokasikan pengembalian per pembayaran yang sah, tidak menghitung ulang retry pembayaran, dan tidak mengirim lebih dari nominal pembayaran asal dikurangi refund yang telah terverifikasi. Refund yang sudah diterima diperhitungkan dalam total kasus; bila provider melaporkan refund sebagian tak terduga, jadikan pengecualian untuk menyelesaikan hak penuh, bukan fitur refund sebagian umum. Pembayaran ganda atau settlement terlambat mempunyai exception terpisah; order batal tidak dibuka kembali.

Ongkir retur/pengganti di luar pembayaran awal dicatat sebagai kewajiban/expense terpisah: nominal dan dasar, persetujuan Owner, penerima terverifikasi, metode serta bukti pembayaran. Jangan menambahkan biaya tersebut ke request melebihi pembayaran asal. Kasus belum selesai selama kewajiban biaya yang disetujui belum dipenuhi.

## Provider, retry dan pengecualian

Daftar aktif setiap metode/channel wajib diisi PUB-REFUND-PROVIDER: merchant/acquirer, API tersedia/diaktifkan, status eligible, window dan cutoff, saldo, ETA, kebutuhan informasi penerima dan prosedur fallback. [Cakupan refund Midtrans](https://docs.midtrans.com/docs/what-payment-method-that-have-refund-feature) berbeda menurut metode; jangan menjanjikan dukungan universal atau angka ETA yang belum dikonfirmasi. Bank transfer/VA dan OTC yang tidak mendukung API tetap dapat dilayani dengan jalur manual yang siap.

[Refund API Midtrans](https://docs.midtrans.com/reference/refund-transaction) memakai identitas transaksi dan `refund_key`. Untuk permintaan yang sama, retry memakai key yang sama; dokumentasi membatasi reattempt dengan key tersebut sampai tujuh hari dari request pertama. Sesudah batas tersebut, hentikan retry otomatis dan rekonsiliasi; key baru bukan jalan pintas untuk hasil yang belum pasti. Status settled memakai refund; status pending/authorize/capture memerlukan evaluasi Cancel sesuai status provider, bukan refund secara buta. Penerimaan API berbeda dari hasil bank; notification `bank_confirmed_at` dan bukti/status sesuai metode perlu direkonsiliasi sebelum selesai. Alasan yang dikirim ke provider harus berupa kode/teks umum yang aman, sebab dapat muncul pada riwayat Customer.

| Kondisi | Tindakan petugas/aplikasi yang harus tersedia | Bukti sebelum lanjut/selesai |
| --- | --- | --- |
| Tidak mendukung API / window habis | Jangan mengubah metode yang sudah dibayar. Owner menyetujui pengecualian manual setelah memastikan tidak ada refund pending/berhasil. | Capability transaksi, hasil cek provider, nominal dan penerima terverifikasi. |
| Saldo provider tidak cukup | Eskalasi Owner untuk pendanaan sesuai prosedur atau fallback yang aman; kasus tetap terbuka, SLA/pembaruan dicatat. | Hasil provider, tindak lanjut pendanaan, retry terkontrol atau keputusan manual. |
| Timeout / koneksi putus / hasil tak pasti | Tahan jalur manual dan key baru; query/status/notification/support provider direkonsiliasi. Retry hanya key operasi yang sama dalam batas aman. | Identitas operasi, request pertama, hasil query/notification dan keputusan rekonsiliasi; tidak ada asumsi gagal hanya dari timeout. |
| Penolakan provider yang pasti | Bedakan kegagalan validasi/permanen dari kegagalan sementara. Perbaikan nominal/cakupan membutuhkan persetujuan baru; simpan operasi lama. | Kode kategori aman, verifikasi tidak ada refund berjalan, alasan perubahan dan audit Owner. |
| API accepted tetapi bank belum konfirmasi | Tetap menunggu/rekonsiliasi dan beri ETA yang terverifikasi; eskalasi jika terlambat. | Bukti akhir sesuai metode, waktu bank/provider dan tindak lanjut Customer. |
| Notification duplikat/terlambat atau refund sebagian | Verifikasi signature, amount, transaksi dan identitas refund; dedup. Rekonsiliasi seluruh ledger sebelum perubahan. | Tidak ada job/expense/refund ganda; exception atas selisih tidak menghapus jejak pembayaran. |
| Retry mencapai batas tujuh hari | Stop pengiriman otomatis; petugas cek status/support. Operasi pengganti memerlukan bukti operasi lama tidak dapat membayar lagi dan persetujuan Owner. | Tidak ada refund lama yang mungkin settle bersamaan; hubungan operasi lama/pengganti tercatat. |
| Refund manual | Verifikasi kewenangan pembayar/penerima, data minimum tujuan pembayaran lewat kanal aman, Owner menyetujui dan petugas mencatat transfer. Jangan meminta OTP/password. | Bukti transfer/reference, tanggal/nominal, kecocokan penerima dan konfirmasi/tindak lanjut dana; rekonsiliasi provider memastikan tidak membayar kedua kali. |

Tidak ada retry tanpa batas, pergantian key otomatis, atau pergantian manual hanya karena Customer mendesak. Bila provider belum memastikan bahwa operasi lama tidak akan membayar, Owner mengeskalasi; aplikasi tetap menandai hasil tak pasti. Risiko dan rencana penyelesaian diinformasikan tanpa membebankan kegagalan teknis kepada Customer.

## Akun ditutup, anak dan eskalasi

Closure tetap mencabut akses dan tidak memulihkan riwayat. Kasus, order, nominal, refund_key, kewajiban biaya dan bukti tetap dapat ditangani terpisah dari FK akun; kontak terverifikasi minimum dipakai untuk penyelesaian. Daftar ulang tidak memberikan akses kasus lama. Penerima dana atau wali harus diverifikasi kewenangannya, bukan diambil dari akun baru dengan email sama.

Owner meninjau sengketa, kegagalan provider, keterlambatan SLA dan hak konsumen. Kanal/lembaga penyelesaian luar dan petugas backup wajib dikonfirmasi legal/Owner sebelum policy resmi (PUB-BIZ, PUB-SERVICE); jangan mengarang kontak lembaga atau forum eksklusif. Keluhan data diteruskan ke SOP privasi tanpa menunggu refund selesai.

## Catatan, retensi dan kontrol

Catatan minimum: ID kasus/order/payment, pemicu tenggat awal, alasan/hasil, petugas/Owner, bukti retur, snapshot nominal/alokasi, identitas operasi/key, transisi pekerjaan, hasil rekonsiliasi, biaya terpisah serta bukti pemberitahuan/penyelesaian. Audit hanya metadata yang perlu; payload provider mentah, credential, token dan isi private berkas tidak masuk log. Bukti sensitif disimpan privat dengan izin yang sempit.

Isi percakapan/lampiran kasus yang benar-benar selesai: target hapus +7 hari, receipt minimum +30 hari. **Bukti refund/pembukuan yang wajib disimpan diproyeksikan ke arsip transaksi terpisah sebelum purge**, bukan dihapus bersama receipt. Retensi keuangan, kontak aktif, holds dan sistem email/telepon mengikuti [SOP privasi/retensi](customer-privacy-retention-sop.md). Cleanup privacy Development tidak menghapus kasus refund atau komunikasi eksternal secara otomatis. Publikasi mensyaratkan proses, petugas, tool, sumber dana dan bukti simulasi yang benar-benar tersedia.
