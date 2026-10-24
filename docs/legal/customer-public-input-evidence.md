# Input dan bukti menuju Customer publik

**Rekonsiliasi 13 Oktober 2026:** keputusan Owner 5 Oktober menetapkan akun **18+ dengan pernyataan usia** dan pengesahan dokumen oleh Owner; keputusan B2B 11 Oktober menetapkan WhatsApp langsung. Source Admin memakai Better Auth. Tidak ada pembacaan env/log privat atau probe provider pada rekonsiliasi ini. Snapshot presence 3 Oktober tetap historis; status/dependensi terbaru ada pada [handoff rilis](../frontend/mvp-release-readiness.md#peta-penghambat-rilis).

**Diperbarui:** 24 Oktober 2026. **Status:** Owner menyetujui semua rekomendasi isi T11 dan identifier resmi v1.0 pada tanggal ini; T11 selesai. Tanggal berlaku ditetapkan saat publikasi aktual. Provider/region dan perlindungan transfer adalah readiness PUB-PROVIDER/PUB-POLICY sebelum pemrosesan data pribadi/publikasi, bukan syarat menyelesaikan T11 atau melanjutkan development lokal. Sumber keputusan: jawaban Owner; sumber teknis: baseline lokal `5ebfdff` dan kontrak yang dirujuk; sumber hukum: dokumen resmi yang ditautkan. Snapshot konfigurasi 3 Oktober di bawah tetap historis. Tidak menyatakan aktivasi provider atau kelulusan staging.

## Paket review menyeluruh T11 — 24 Oktober 2026

Catatan T11 berstatus `BLOCKED_INPUT` pada bagian tanggal sebelumnya mencatat keadaan sebelum persetujuan lengkap Owner; status aktif kini `DONE` sesuai rekaman ini dan [TASKS.md](../../TASKS.md).

### Persetujuan rekomendasi Owner T11 — 24 Oktober 2026

Owner meminta seluruh pekerjaan T11 dilanjutkan, lalu **menyetujui semua rekomendasi paket ini pada 24 Oktober 2026**. Isi draf mengikuti jawaban Owner; identifier resmi yang disetujui adalah `NIUVA-TERMS-v1.0` dan `NIUVA-PRIVACY-v1.0`. Tanggal berlaku adalah tanggal publikasi aktual, bukan tanggal persetujuan. Persetujuan isi tidak menerbitkan policy, consent atau pendaftaran publik. T11 selesai berdasarkan persetujuan tersebut; fakta provider/region dan perlindungan transfer adalah bagian kesiapan pemrosesan/publikasi, bukan blocker persetujuan atau development lokal. Sumber scope tetap [T11 pada TASKS.md](../../TASKS.md).

### Cakupan review yang sudah disatukan

| Bagian | Posisi saat ini | Lokasi review |
| --- | --- | --- |
| Identitas, usia dan kontak | Identitas PT/kontak, Rheza, alamat retur, akun 18+ dan B2B WhatsApp mengikuti keputusan Owner; tidak ditanya ulang | Syarat 1–3; Privasi 1–2; SOP layanan |
| Perdagangan | Indonesia, titik penerimaan Shop, bukan PKP dan biaya mengikuti keputusan Owner. Cakupan penawaran mengikuti katalog/quote nyata; masa quote 7 hari serta batas pembayaran mengikuti kontrak existing. Metode hanya sesuai checkout | Syarat 2; tidak membekukan daftar SKU dalam policy |
| Keluhan/refund/sengketa | Pelaporan minimal 2 hari kerja untuk kondisi yang diatur, bukti tersedia, 1/1/1 dan total 3 hari kerja, biaya/refund penuh, hak sengketa serta pengecualian perjalanan retur tetap | Syarat 4–6; SOP layanan |
| Berkas dan hak konten | Izin terbatas, hak pemilik, review operator, akses privat, keberatan hak dan retensi 14/60/90 sudah menjadi draf utuh | Syarat 7; SOP berkas |
| Data, hak dan closure | Kategori/tujuan/dasar, akses/koreksi, hak melalui kontak, penutupan tanpa memulihkan riwayat dan tenggat kalender diperjelas | Privasi 2–7; SOP privasi |
| Arsip | PP 80/2019: data PMSE terkait transaksi keuangan minimal 10 tahun dan data PMSE non-keuangan minimal 5 tahun. UU KUP: buku/catatan/dokumen dasar pembukuan disimpan 10 tahun di Indonesia pada tempat kedudukan badan. Kategori berbeda; bukan seluruh profil/token/percakapan | [Pemetaan arsip transaksi](customer-privacy-retention-sop.md#pemetaan-arsip-transaksi-untuk-review-t11); klasifikasi serta penempatan storage yang sesuai tetap PUB-RECORDS |
| Kesesuaian implementasi | Klaim lama tentang belum adanya refund/outbox/job diperbaiki menjadi bukti lokal dengan batas hosted. Legal resolver tetap internal/test | Matriks kesiapan, kontrak runtime dan catatan validasi |

### Fakta tersisa sebelum policy diterbitkan

| Input nyata yang belum tersedia | Yang sudah disiapkan | Cara menutup |
| --- | --- | --- |
| Penerima dan lokasi pemrosesan yang benar-benar dipakai | Register provider dan data/tujuannya tersedia; S3 final belum dipilih, fakta produksi/region/salinan belum lengkap | Catat provider/region dan perlindungan transfer sebelum jenis data terkait diproses; cocokkan notice sebelum pendaftaran/rilis. Draft, persetujuan, dan development lokal dapat berlanjut tanpa memilih vendor atau region sekarang. Akses AWS/S3 tetap ditunda. |
| Versi dan tanggal berlaku | Owner menyetujui identifier `NIUVA-TERMS-v1.0`/`NIUVA-PRIVACY-v1.0` dan semua rekomendasi isi. Draf lokal terbaru adalah [Syarat v6](customer-terms-draft.md) dan [Privasi v7](customer-privacy-draft.md) | Tanggal berlaku dicatat saat publikasi aktual. Sebelum pemrosesan publik dimulai, informasi penerima/region serta perlindungan transfer yang benar-benar digunakan harus akurat pada notice; tidak ada tanggal berlaku atau aktivasi sekarang. |

Identifier resmi v1.0 disetujui, tetapi belum dipasang ke resolver atau consent. Pada rilis kelak, catat tanggal persetujuan ini, tanggal berlaku aktual, referensi isi/checksum dan bukti Owner; perubahan material setelahnya menjadi versi baru. T11 `DONE`; publikasi dan aktivasi memerlukan instruksi tersendiri. Fakta provider/region, perlindungan transfer dan tanggal efektif tetap ditutup pada gerbang kesiapan yang sudah ada sebelum publikasi/pemrosesan, bukan sebagai prasyarat pengembangan.

### Batas T11 dan backlog berikutnya

Daftar SKU, stok fisik, foto, berat/dimensi dan tarif launch milik **T31**. Isi policy memakai batas katalog/quote yang benar-benar ditawarkan, sehingga setiap SKU tidak perlu dituliskan menjadi klausul tetap. Coverage, kalender rinci, pengganti, alarm dan simulasi layanan milik **T39**; kemampuan yang belum dibuktikan tetap tidak boleh dijanjikan saat publikasi. Setelah T11 disahkan, T12/T13 dapat dikembangkan dengan gate lokal; T14 tetap memerlukan resource hosted T03. Storage/cleanup/provider, recovery dan rilis tetap pada **T03/T08/T09/T38/T40** serta gate terkait. Fakta provider dan retensi dicatat pada PUB-PROVIDER/PUB-RECORDS untuk kesiapan pemrosesan/rilis, bukan sebagai blocker umum development; tidak membuat task baru.

## Review Owner T11: 23 Oktober 2026

### Keputusan pada pembahasan ini

| Pokok | Keputusan Owner | Dampak pada draf |
| --- | --- | --- |
| Wilayah awal Shop dan Custom Print | **Indonesia terlebih dahulu**, terbatas pada alamat yang dapat dilayani dan memiliki ongkir tervalidasi | Bagian 2 Syarat v4. Bukan janji seluruh alamat Indonesia terjangkau; pengiriman internasional tidak dimasukkan pada rilis awal. |
| Penerimaan pesanan Shop | **Setelah pembayaran terverifikasi server dan konfirmasi pesanan berdasarkan hasil tersebut diterbitkan** | Order dibuat/pending, redirect dan notifikasi order diterima untuk diproses bukan bukti pembayaran atau penerimaan kontrak. MAKE tetap melalui quote diterima dan divalidasi. |
| Target layanan | Owner menetapkan **1 hari kerja tanggapan awal, 1 hari kerja pemeriksaan, dan 1 hari kerja mulai memproses refund; total 3 hari kerja penanganan Niuva** | Menggantikan target 1/2/1 pada draft sebelumnya. Waktu dana masuk bank/provider tetap dibedakan dari mulai memproses refund. |
| Pelaporan dan bukti awal | Owner memilih **minimal 2 hari kerja sejak barang diterima** sebagai ketentuan utama pelaporan pada kondisi yang diatur, menggantikan anjuran 1×24 jam. Laporan awal disertai bukti relevan yang tersedia | Hak atas cacat tersembunyi tetap dijaga. Bukti transaksi yang sudah dimiliki Niuva dipakai tanpa meminta ulang; video unboxing bukan satu-satunya bukti. |
| Waktu yang dikecualikan | Koreksi Owner: **hanya perjalanan barang retur yang diperlukan di luar hitungan 3 hari kerja**; tidak ada jeda otomatis menunggu bukti | Bukti tersedia disertakan sejak laporan awal; permintaan tambahan tidak menghentikan atau mereset tenggat. Catat awal/akhir perjalanan retur; penundaan internal tetap dihitung. |
| Detail petugas | Rheza tetap petugas utama; policy tidak menjanjikan jam buka atau menyebut petugas pengganti tetap. Instruksi retur diberikan per kasus sebelum pengiriman. | T39 membuktikan coverage operasional dan eskalasi; tidak perlu membuat jabatan, unit arsip atau jadwal publik baru. |

Identitas/kontak perusahaan, Rheza sebagai petugas utama, alamat retur, akun 18+ melalui deklarasi, approval refund oleh Owner, serta batas estimasi/quote MAKE tetap mengikuti keputusan sebelumnya. Tidak meminta keputusan yang sama kembali.

### Usulan layanan sederhana untuk dibahas

- Tetap gunakan kontak Customer/privasi yang sudah dikonfirmasi dan Rheza sebagai petugas utama. Coverage aktual dan jalur eskalasi diuji pada T39; policy tidak menetapkan petugas pengganti atau jam buka tetap.
- Nama penerima, waktu penerimaan dan cara pengiriman retur dapat disampaikan **per kasus sebelum Customer mengirim**. Jangan mengarang jam tetap atau mengumumkan detail yang belum disanggupi. Penyesuaian operasional dicatat dalam T39 yang sudah ada.
- **Target sudah diputuskan Owner:** tanggapan, pemeriksaan dan mulai refund masing-masing maksimal 1 hari kerja, total maksimal 3 hari kerja penanganan Niuva. Hanya perjalanan retur yang diperlukan dikecualikan. Laporan awal disertai bukti yang tersedia; permintaan tambahan tidak menghentikan atau mereset tenggat, dan approval/penundaan internal tetap dihitung. Waktu dana masuk dibedakan dari waktu mulai memproses. Target pemeriksaan tidak menjadi alasan menahan hak atau memperpanjang tenggat hukum. Lihat [keputusan PRD](../PRD-Niuva-MVP.md#keputusan-policy-customer--23-oktober-2026) dan [SOP layanan](customer-service-refund-sop.md).
- Tenggat akses/koreksi data tertentu adalah **3×24 jam kalender**, termasuk akhir pekan; berbeda dari target keluhan dalam hari kerja. Pembagian tanggung jawab harus memungkinkan kewajiban tersebut dipenuhi. Tidak menetapkan petugas pengganti atau jam layanan melalui asumsi.

### Fakta dan gerbang rilis yang masih terbuka

| Pokok | Posisi dan langkah pembahasan |
| --- | --- |
| Isi, versi resmi dan tanggal berlaku | Syarat `DRAFT-TERMS-2026-10-24-v6` dan Privasi `DRAFT-PRIVACY-2026-10-24-v7` mengikuti semua rekomendasi yang Owner setujui. Identifier resmi `NIUVA-TERMS-v1.0` / `NIUVA-PRIVACY-v1.0` juga disetujui, belum dipasang ke runtime. Tanggal berlaku adalah tanggal publikasi aktual. |
| Fakta perdagangan tersisa | Syarat kini membatasi penawaran pada katalog/quote nyata dan metode yang tersedia di checkout, termasuk syarat kesepakatan untuk desain/penggunaan khusus. SKU/bahan/stok/tarif rinci tetap T31; aktivasi metode memerlukan bukti provider. Aturan berkas/hak konten dan sengketa telah dirinci sebagai draf; kontak lembaga dan kesiapan penanganan tetap memerlukan bukti operasional. **Status bukan PKP sudah dikonfirmasi Owner 24 Oktober**; rumusan harga mengikuti keputusan tersebut. Pengesahan isi tidak mengesahkan dataset atau operasi launch. |
| Layanan dan retur | Target 1/1/1, total 3 hari kerja, laporan awal dengan bukti dan pengecualian perjalanan retur sudah diputuskan. Tidak ada jam buka tetap atau nama penerima/pengganti yang diumumkan; instruksi penerimaan diberikan per kasus sebelum retur dikirim. T39 tetap membuktikan coverage dan alur eskalasi. |
| Arsip transaksi/pembukuan | Kelas berkas 3D/CAD **14/60/90 hari** tidak diubah. Buku/catatan/dokumen yang menjadi dasar pembukuan disimpan 10 tahun di Indonesia pada tempat kedudukan badan; bukan seluruh profil/chat/token dan tidak memerlukan ruang/petugas khusus. Kategori data nyata dan bukti database/provider/lokasi tetap dicocokkan melalui PUB-RECORDS/PUB-PROVIDER. |
| Provider, lokasi, backup dan penghapusan | Adapter privat S3-compatible sudah ada; provider produksi belum dipilih dan akses AWS/S3 sedang ditunda. Daftar badan pemroses/lokasi/salinan nyata harus dilengkapi sebelum policy diterbitkan. Frasa provider-neutral pada kode tidak menggantikan transparansi provider yang benar-benar dipakai. |

### Tinjauan usulan perdagangan — 24 Oktober 2026

Owner mengirim tabel tujuh **saran jawaban**. Tabel itu menjadi bahan pembahasan, bukan bukti status PKP, daftar katalog/metode pembayaran aktif, atau pengesahan seluruh policy. Keputusan layanan yang sudah diterima pada 23 Oktober tetap berlaku. Pemetaan berikut memakai task existing T11, T31 dan gerbang provider terkait; tidak menambah backlog.

| Pokok | Hasil pencocokan dan posisi review |
| --- | --- |
| Status PKP | **Owner mengonfirmasi “Bukan PKP, sudah diperiksa” pada 24 Oktober 2026.** Hasil mengikuti pemeriksaan Owner, bukan inferensi dari omzet atau ketiadaan dokumen. [Catatan konfirmasi](#konfirmasi-status-bukan-pkp--24-oktober-2026) menutup input status PKP; tidak ada credential/NPWP yang dikumpulkan. |
| Harga dan PPN | Berdasarkan status bukan PKP yang dikonfirmasi, Niuva tidak memungut PPN atas penjualan produk/jasa dalam layanan ini dan tidak menerbitkan Faktur Pajak. Harga mengikuti katalog/quote yang disetujui; **ongkir tetap terpisah** dan diinformasikan sebelum pembayaran. Rumusan dimasukkan pada Syarat bagian 2. Tidak menambahkan tarif pajak atau mengubah perhitungan runtime. |
| Katalog nyata | Daftar SKU, stok fisik, harga, berat/dimensi dan bahan yang benar-benar dapat dipenuhi tetap memerlukan input/validasi **T31**. Produk contoh atau seed bukan bukti persediaan. Shop ready-made dan layanan Custom Print berbasis review tetap dua alur berbeda; tidak membuat daftar produk rekaan. |
| Metode pembayaran | Kandidat teks: **“Metode pembayaran yang dapat digunakan ditampilkan saat checkout.”** Daftar bank/e-wallet/QRIS hanya dapat disebut setelah cocok dengan akun merchant, konfigurasi aplikasi dan bukti provider. Kalimat umum tidak menutup gerbang pengujian/aktivasi yang masih terbuka. |
| Biaya tambahan | **Disetujui Owner 24 Oktober 2026:** Niuva tidak menambahkan biaya admin atau layanan di luar harga yang disepakati dan ongkir; biaya gateway merchant ditanggung Niuva. Ongkir pengiriman pesanan dibayar Customer dan pekerjaan tambahan Custom Print dirinci dalam quote sebelum disetujui. Biaya dari bank/aplikasi Customer di luar kendali Niuva tidak dijanjikan nol. [Catatan persetujuan](#persetujuan-biaya-customer--24-oktober-2026) membatasi cakupan keputusan ini. |
| Masa berlaku quote | **7 hari kalender sejak quote dikirim sudah merupakan keputusan baseline**, tercatat dalam [keputusan Phase 2](../backend/phase-2-closure-decisions.md#commercial-lifecycle) dan diterapkan oleh [policy komersial](../../src/modules/policy/commercial.ts). Hitungan runtime adalah 7 × 24 jam dari waktu kirim, bukan dari penyusunan draf. Quote kedaluwarsa/digantikan tidak dapat diterima. Batas pembayaran Custom Print tetap **24 jam sejak pembuatan pembayaran**, terpisah dari kesempatan menerima quote; tidak ada perubahan durasi baru. |
| Eskalasi sengketa | Atas instruksi Owner untuk melanjutkan, klausul telah dimasukkan dalam Syarat bagian 6 dan SOP eskalasi. Jalur kontak Niuva menjaga hak atas BPSK yang berwenang/pengadilan sesuai prosedur; bukan forum eksklusif atau syarat wajib pengaduan internal. [Catatan penyelarasan](#penyelarasan-klausul-sengketa--24-oktober-2026) memisahkan draf yang siap direview dari pengesahan final dan bukti operasional T39. |

Rumusan sengketa untuk review kini berada pada [Syarat bagian 6](customer-terms-draft.md#6-penanganan-keluhan), dengan tindak lanjut internal pada [SOP layanan](customer-service-refund-sop.md#akun-ditutup-anak-dan-eskalasi). Kedua dokumen tetap draf sampai pengesahan keseluruhan policy.

**Sumber dan batas pemeriksaan:** [DJP — pengusaha kecil dan pilihan PKP](https://www.pajak.go.id/id/pedagang-eceran), [PMK 164/2023 Pasal 17–21](https://jdih.kemenkeu.go.id/api/download/a99b8e80-9694-46ab-8de1-63c2484aa636/2023pmkeuangan164.pdf), [UU PPN Pasal 14 dalam susunan setelah UU HPP](https://www.pajak.go.id/sites/default/files/2021-12/SDSN%20UU%20PPN%20Indo-%20dengan%20tanda%20perubahan_UU%20HPP.pdf), dan [UU Perlindungan Konsumen Pasal 45, 49, 52](https://jdih.kemenkeu.go.id/api/download/fulltext/1999/8TAHUN~1999UU.htm). Halaman pedagang eceran memuat contoh/tarif historis; hanya batas pengusaha kecil yang dicocokkan, bukan tarif atau tenggat administratif lamanya. Pemeriksaan sumber bukan penetapan status pajak Niuva atau pengesahan legal final.

### Persetujuan biaya Customer — 24 Oktober 2026

Owner menjawab **“Ya, gunakan rumusan tersebut (rekomendasi)”** pada pertanyaan tentang tidak adanya biaya admin/layanan tambahan dari Niuva, penanggungan biaya gateway merchant, ongkir dibayar Customer dan rincian pekerjaan tambahan Custom Print dalam quote. Poin biaya tambahan kini diputuskan dan tidak diminta kembali.

Keputusan dicatat pada [otoritas produk](../PRD-Niuva-MVP.md#keputusan-biaya-customer--24-oktober-2026) dan [bagian 2 Syarat](customer-terms-draft.md#2-layanan-dan-pembentukan-kesepakatan). Ongkir dalam keputusan ini adalah ongkir pengiriman pesanan; biaya retur/pengganti yang menjadi tanggung jawab Niuva tetap mengikuti ketentuan ketidaksesuaian/refund. Persetujuan ini tidak menetapkan status PKP/perlakuan pajak, menjamin semua biaya langsung dari bank/aplikasi Customer nol, atau mengesahkan kandidat klausul lain. Tidak ada perubahan source, konfigurasi merchant, tarif gateway atau aktivasi provider.

### Penyiapan klausul pajak — 24 Oktober 2026

**Catatan persiapan sebelum jawaban Owner; status terbaru ada pada konfirmasi di bawah.** Saat Owner menginstruksikan melanjutkan bagian pajak T11, status PKP PT. NIUVA INOVASI UTAMA belum dikonfirmasi. Pencarian pada dokumentasi repo menemukan pembahasan PKP, tanpa hasil pemeriksaan perusahaan yang dapat dipakai sebagai konfirmasi. Tarif, tanggal mulai pemungutan, dan konfigurasi pajak tidak dipilih melalui asumsi. Kandidat dan panduan berikut dipertahankan sebagai jejak pembahasan, bukan input yang diminta ulang.

**Cara memperoleh input:** penanggung jawab yang memiliki akses membuka profil **badan PT. NIUVA INOVASI UTAMA** di Coretax, lalu **Portal Saya → Profil Saya**. Periksa **Status Pengusaha Kena Pajak** dan tanggal pengukuhannya; status NPWP aktif saja tidak menetapkan status PKP. Menurut [manual resmi DJP, halaman 15–16](https://pajak.go.id/sites/default/files/2025-01/Buku%20Manual%20Coretax%202024%20-%20Permohonan%20Pengukuhan%20PKP.pdf), status yang telah dikukuhkan ditandai centang dengan tanggal pengukuhan, dan dokumen persetujuan/penolakan tersedia melalui **Portal Saya → Dokumen Saya**. [Coretaxpedia, diperbarui 2 Februari 2026](https://www.pajak.go.id/coretaxpedia/cek-status-dan-kategori-wajib-pajak), juga mengarahkan pemeriksaan profil ke menu yang sama. Pemeriksaan ini tidak memerlukan pengajuan pengukuhan atau perubahan data.

Catat hanya hasil status, tanggal pemeriksaan dan sumber pemeriksaan; tanggal pengukuhan relevan bila sudah PKP. Credential, NPWP dan salinan dokumen pajak tidak perlu disalin ke chat/repository. Jika akses tidak tersedia atau tampilan/dokumen tidak konsisten, status tetap OPEN sampai pihak pengurus pajak/KPP mengonfirmasi; ketiadaan bukti di repo atau kendala akses bukan bukti bahwa perusahaan bukan PKP.

| Hasil pemeriksaan | Kandidat klausul untuk review, belum diterbitkan |
| --- | --- |
| Bukan PKP, telah dikonfirmasi | “Niuva tidak memungut PPN atas penjualan produk dan jasa dalam layanan ini. Harga produk atau jasa mengikuti harga yang ditampilkan atau quote yang disetujui. Ongkir diinformasikan terpisah sebelum pembayaran. Dokumen transaksi yang diterbitkan Niuva merupakan tagihan atau bukti transaksi, bukan Faktur Pajak.” |
| Sudah PKP, telah dikonfirmasi | “Harga produk Shop yang ditampilkan sudah termasuk PPN yang berlaku untuk transaksi yang terutang PPN. Rincian harga dan perlakuan PPN untuk Custom Print dijelaskan dalam quote sebelum disetujui. Ongkir diinformasikan terpisah dan total pembayaran ditampilkan sebelum pembayaran.” |
| Belum dapat dipastikan | Tidak menetapkan salah satu kandidat sebagai fakta/klausul berlaku. Status pajak pada draf Syarat tetap terbuka. |

Kandidat harga termasuk PPN merupakan **usulan komersial** sampai diterima Owner. Sebelum memilih kandidat PKP, cocokkan tanggal mulai kewajiban, jenis penyerahan, perlakuan ongkir dan proses Faktur Pajak dengan keadaan perusahaan; tidak menetapkan tarif seragam atau menyimpulkan semua produk/jasa mempunyai perlakuan yang sama. Kandidat bukan PKP tidak berarti seluruh kewajiban pajak perusahaan atau pajak dalam biaya pembelian bahan menjadi nihil. Pembedaan Faktur Pajak mengikuti [UU PPN Pasal 13–14](https://www.pajak.go.id/sites/default/files/2021-12/SDSN%20UU%20PPN%20Indo-%20dengan%20tanda%20perubahan_UU%20HPP.pdf).

**Pencocokan source lokal:** [checkout retail](../../src/modules/checkout/repository.ts) membentuk total dari subtotal barang ditambah ongkir, tanpa tambahan PPN terpisah pada perhitungan tersebut. [PDF finance](../../src/modules/finance/invoice-pdf.ts) secara eksplisit menyatakan dokumennya bukan Faktur Pajak. Temuan ini tidak membuktikan status pajak atau kesiapan pelaporan perusahaan. Input harga launch tetap mengikuti T31 existing; review T11 ini tidak menambah mesin pajak, task baru, perubahan invoice, atau aktivasi layanan DJP/provider.

### Konfirmasi status bukan PKP — 24 Oktober 2026

Owner menjawab **“Bukan PKP, sudah diperiksa”** atas pertanyaan mengenai status Pengusaha Kena Pajak pada profil badan PT. NIUVA INOVASI UTAMA. Tanggal konfirmasi: **24 Oktober 2026**. Sumber bukti: pernyataan Owner setelah pemeriksaan; agen tidak mengakses akun DJP atau menerima NPWP/salinan dokumen pajak. Tidak menyimpulkan tanggal atau metode pemeriksaan tambahan yang tidak disebutkan Owner.

Input status PKP kini **terkonfirmasi bukan PKP**. Kandidat tanpa pemungutan PPN penjualan dimasukkan pada [PRD](../PRD-Niuva-MVP.md#konfirmasi-status-pajak-customer--24-oktober-2026) dan [bagian 2 Syarat](customer-terms-draft.md#2-layanan-dan-pembentukan-kesepakatan): harga mengikuti katalog/quote yang disetujui, ongkir diinformasikan terpisah, dan dokumen tagihan/bukti transaksi bukan Faktur Pajak. Kebijakan biaya yang telah disetujui tetap berlaku. Alternatif PKP dalam catatan persiapan tidak diterapkan.

Konfirmasi ini tidak menetapkan omzet, menyatakan semua kewajiban pajak perusahaan nihil atau memberikan pengesahan seluruh policy. Input harga launch T31, katalog/metode produksi dan input T11 lainnya tetap mengikuti bukti masing-masing. Tidak ada perubahan kalkulasi runtime, tarif, akun DJP, provider atau resource eksternal.

### Penyelarasan klausul sengketa — 24 Oktober 2026

Owner menginstruksikan melanjutkan penyelesaian klausul sengketa yang sudah disiapkan. [Syarat bagian 6](customer-terms-draft.md#6-penanganan-keluhan) dan [SOP eskalasi](customer-service-refund-sop.md#akun-ditutup-anak-dan-eskalasi) kini selaras: kontak Niuva ditawarkan, hak hukum tetap tersedia, dan rujukan tidak otomatis menutup kasus atau mereset target penanganan. Instruksi ini mengizinkan penyusunan draf; tidak dicatat sebagai pengesahan seluruh policy, pemilihan forum eksklusif atau pembuktian operasi.

[UU Perlindungan Konsumen Pasal 45, 49 dan 52](https://jdih.kemenkeu.go.id/api/download/fulltext/1999/8TAHUN~1999UU.htm) diperiksa pada 24 Oktober 2026. Klausul mempertahankan pilihan sukarela penyelesaian di luar pengadilan serta prosedur beralih ke pengadilan setelah upaya tersebut dinyatakan tidak berhasil. Tidak menyatakan BPSK menangani semua jenis perkara atau menentukan kantor/alamat lembaga tanpa verifikasi.

Pengganti petugas, kalender/coverage dan bukti operasional tetap T39; kontak lembaga yang relevan perlu diperiksa saat prosedur diterapkan. Tenggat dan biaya/refund yang sudah diputuskan tidak berubah. Tidak menambah fitur pusat sengketa, status/schema, akses berkas privat atau task baru. Bagian konten/IP, fakta produksi, retensi/provider dan pengesahan isi/versi/tanggal yang belum lengkap tetap terbuka pada T11.

### Penyelarasan berkas dan hak konten — 24 Oktober 2026

Owner menginstruksikan melanjutkan aturan berkas dan hak konten Custom Print yang masih terbuka. [Syarat bagian 7](customer-terms-draft.md#7-berkas-customer-dan-hak-konten) dan [SOP penanganan](customer-service-refund-sop.md#berkas-dan-keberatan-hak-konten-custom-print) kini memuat kepemilikan yang tidak berpindah karena unggahan, izin penggunaan terbatas untuk layanan, pemeriksaan lisensi yang relevan, klarifikasi keberatan serta perlindungan akses dan bukti. Ini penyusunan draf untuk review, bukan pengesahan seluruh isi atau penetapan daftar produk baru.

- Sumber hak: [UU Hak Cipta Pasal 9, 16–17](https://www.peraturan.go.id/files/uu28-2014bt.pdf) dan [UU Desain Industri Pasal 9](https://peraturan.go.id/files/uu31-2000.pdf), diperiksa 24 Oktober 2026. Penggandaan/pemanfaatan hak dan pengalihan hak memiliki dasar tersendiri; tersedianya unduhan gratis atau pembayaran jasa cetak tidak otomatis memberikan seluruh hak. Penerapan untuk karya/lisensi tertentu tetap perlu diperiksa menurut fakta dan ketentuan yang berlaku.
- Batas teknis: `src/modules/custom-print/file-types.ts`, `src/modules/policy/privacy.ts`, `src/modules/files/upload-service.ts` dan `content-inspection.ts` menetapkan model STL/OBJ/3MF/STEP/STP 100 MiB, foto JPG/JPEG/PNG 10 MiB, validasi metadata dan pemeriksaan penanda CAD yang terbatas. 3MF hanya diperiksa header ZIP; tidak ada klaim pemeriksaan arsip/geometry penuh, antivirus, kepemilikan hak atau sertifikasi hasil. Unggahan gagal dapat ditolak/dihapus saat konfirmasi.
- Akses/retensi: `src/modules/files/download-service.ts`, `retention-core.ts` serta [keputusan 14/60/90 hari](../backend/phase-2-closure-decisions.md#private-customer-files) menjaga izin operator, akses bertenggat, perlindungan pesanan aktif dan holds. Arsip transaksi tetap terpisah; bukti penghapusan provider/backup belum digantikan oleh tes lokal.
- Scope: alur review operator, quote immutable, pembayaran server, refund existing dan kontak B2B WhatsApp tetap dipertahankan. Penanganan keberatan bersifat prosedur draf melalui kontak layanan; tidak menambah portal, status database, formulir bukti, scanner, lisensi promosi otomatis atau fitur desain baru.

Rekonsiliasi menyeluruh berikutnya membatasi klausul pada penawaran yang nyata dan kesepakatan khusus yang dapat dipenuhi; dataset produk/bahan/tarif diselesaikan pada T31. Tidak memilih diam-diam kategori bisnis baru atau menjanjikan produk bersertifikasi dapat dipesan. Pengesahan dokumen/versi/tanggal, bukti operasional T39, serta fakta provider/retensi tetap terpisah seperti pada paket review di atas; T11 tetap `BLOCKED_INPUT`.

### Pencocokan dengan implementasi dan sumber resmi

- `src/modules/customer-auth/legal.ts` masih mengembalikan dokumen hanya untuk internal/test; tidak ada policy publik resmi. Pembahasan ini tidak membuka pendaftaran. Implementasi consent/pendaftaran/privasi publik tetap T12–T14 setelah input T11 memadai.
- T21/T22 sudah selesai lokal; T23/T25 sudah mempunyai submission/rekonsiliasi lokal dengan bukti merchant/provider/hasil bank masih terbuka. Syarat v4 menghapus klaim lama bahwa integrasi refund belum tersedia, tanpa menyatakan refund hosted berhasil.
- [Kontrak object storage](../backend/object-storage-contract.md) menjadi otoritas konfigurasi dan namespace S3/legacy R2. Tidak ada klaim migrasi objek, purge provider atau pemilihan AWS produksi.
- [UU PDP Pasal 20–24, 30, 32 dan 46](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022): dasar/penjelasan pemrosesan, bukti persetujuan, tenggat akses/koreksi dan pemberitahuan insiden ditinjau dari sumber primer pada 23 Oktober. Review ini bukan klaim semua kontrol hosted telah terpenuhi.
- [PP 80/2019 Pasal 69, salinan resmi BPK](https://peraturan.bpk.go.id/Home/Download/117172/PP%20Nomor%2080%20Tahun%202019.pdf): paling sedikit dua hari kerja untuk penukaran/pembatalan pada kondisi yang diatur, dengan cacat tersembunyi termasuk kondisi yang disebut. Owner memilihnya sebagai ketentuan utama; anjuran 1×24 jam pada draf terdahulu digantikan. Tidak menyamakannya dengan retur sukarela karena berubah pikiran.
- Schema `refundRequestSchema` saat ini menerima alasan/kategori serta order yang dimiliki; tidak menyediakan field lampiran foto/video. Ketentuan bukti pada irisan T11 ini adalah prosedur melalui kanal layanan yang dikonfirmasi, bukan klaim uploader atau validasi lampiran otomatis sudah tersedia. Inventaris/retensi komunikasi dan lampiran eksternal tetap terbuka pada PUB-DATA/PUB-RECORDS; tidak membuat task atau fitur upload baru.
- [UU KUP Pasal 28 ayat (11), sumber DJP](https://www.pajak.go.id/id/undang-undang-nomor-28-tahun-2007) dan [penjelasan DJP setelah UU HPP](https://pajak.go.id/system/files/2023-10/FAQ_Sistem_Terdampak_ILAP_NPWP_16_Digit.pdf): kewajiban arsip pembukuan 10 tahun di Indonesia memerlukan klasifikasi dokumen; tidak memberi dasar penyimpanan seluruh data akun selama itu.

Tidak ada task baru, deployment, publikasi policy, penggunaan credential produksi, pengiriman email/refund, atau perubahan resource eksternal dalam irisan ini. T11 tetap `BLOCKED_INPUT` sampai pengesahan isi/versi/tanggal yang sebenarnya tersedia.

## Keputusan Owner yang sudah dicatat

| Input | Hasil | Batas yang masih perlu dilengkapi |
| --- | --- | --- |
| Petugas utama Customer, privasi dan tindak lanjut pembayaran/refund | **Rheza**, dikonfirmasi Owner | Jam layanan, coverage akhir pekan/libur, pengganti dan akses kanal belum disebutkan. Penugasan operasional tidak otomatis memberikan role Owner/Admin atau permission aplikasi. |
| Persetujuan refund | Tetap **Owner** sesuai keputusan sebelumnya | Rheza dapat menindaklanjuti kasus/pembayaran dalam kewenangannya; pengajuan provider tetap membutuhkan approval Owner dan rekonsiliasi. |
| Alamat retur | **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat**; Owner mengonfirmasi alamat profil juga menerima retur | Detail penerima serta jam penerimaan akan diisi Owner. Customer mendapat instruksi nomor kasus, penerima, jadwal dan metode sebelum mengirim. |
| Cara review / pengesahan | Kerjakan review internal berdasarkan sumber resmi; Owner menjadi pengesah dokumen sesuai RK-01, keputusan 5 Oktober. Perekrutan konsultan formal bukan syarat mulai kode | Review kewajiban, versi/tanggal berlaku, pengesahan final dan bukti provider tetap terbuka. Keputusan produk 18+ bukan bukti kepatuhan hukum; kebutuhan keahlian/keputusan pihak berwenang dicatat spesifik. |
| Usia akun | Owner 5 Oktober: 18+ melalui pernyataan usia, tanpa DOB/KYC/biometrik; menggantikan target semua usia 3 Oktober | Kontrol sudah diimplementasikan 6 Oktober. Self-declaration bukan verifikasi usia; formal RK-02/RK-03 dan izin publik tetap terpisah. Metode tidak diminta ulang. |

Nama penasihat hukum/akuntansi tidak diwajibkan sebagai isian awal. Istilah **legal** di matriks adalah fungsi menilai kewajiban dan mencatat keputusan/bukti; Owner dapat mengatur review internal. Bila suatu persoalan memerlukan keahlian, verifikasi atau keputusan pihak berwenang, kebutuhan itu dicatat secara spesifik. Jangan mengubahnya menjadi persyaratan merekrut tim formal untuk seluruh pengembangan.

## Bukti konfigurasi lokal terbaru

**Snapshot historis 3 Oktober; tidak diperiksa ulang 13 Oktober.** Angka terisi/kosong di bawah tidak menyatakan konfigurasi checkout/worktree atau resource hosted saat ini. Rujukan Clerk hanya untuk snapshot tersebut; runtime Admin kini Better Auth/database aplikasi.

Pemeriksaan 3 Oktober membaca `.env.local` hanya untuk status terisi/kosong dan scope loopback; **tidak mencetak nilai** dan tidak mengirim request ke provider. Nama group mengikuti kontrak environment runtime. File staging/production diperiksa keberadaannya saja, tanpa membaca credential. Bukti ini menutup pertanyaan presence lokal, bukan PUB-PROVIDER/PUB-STAGING.

| Group lokal | Hasil presence | Interpretasi |
| --- | --- | --- |
| Clerk | 2 dari 2 field terisi | Konfigurasi lokal tersedia; role/akses Rheza dan hosted belum dibuktikan. |
| Customer Google OAuth | 3 dari 3 field terisi | Konfigurasi lokal tersedia; OAuth hosted, akun supervised/anak dan policy eligibility perlu pengujian tersendiri. |
| Resend | 2 dari 2 field terisi | Konfigurasi lokal tersedia; sender/domain publik, penerimaan inbox dan retensi provider belum dibuktikan. |
| R2, termasuk batas file | 7 dari 7 field terisi | Konfigurasi lokal tersedia; akses privat, region/retensi/purge/restore hosted belum dibuktikan. |
| Midtrans | 0 dari 3 field terisi | Checkout ini belum mempunyai group konfigurasi Midtrans untuk smoke sandbox. Dukungan merchant/refund aktual belum dibuktikan. |
| Biteship | 0 dari 3 field terisi | Group lokal belum tersedia untuk smoke shipping provider. |
| Sentry | 0 dari 4 field terisi | Group lokal belum tersedia; ini tidak membuktikan monitoring lain tidak ada. |
| App URL dan database lokal | Keduanya loopback | Tidak merupakan lingkungan hosted. |
| File lingkungan | `.env.local` dan `.env.test.local` ada; `.env.staging` dan `.env.production` tidak ada | Ketiadaan file lokal tidak membuktikan resource/environment manager hosted tidak ada. |

Snapshot 25 September di [intake provider](../backend/provider-staging-intake.md) tetap historis. Snapshot 2 Oktober di [laporan Development](customer-policy-implementation.md) tetap bukti fase tersebut. Tidak menyalin credential, email peserta internal, URL database berpassword, log privat atau data transaksi ke catatan ini.

## Review akun anak yang dapat dikerjakan sekarang

**Arsip review 3 Oktober, bukan scope kerja aktif.** Judul dipertahankan untuk rujukan historis. Target semua usia telah digantikan 18+ Owner 5 Oktober; tabel berikut tidak memerintahkan implementasi akun anak/wali. [Kajian kelompok usia](customer-public-launch-readiness.md#penilaian-akun-anak) tetap bahan review bila target dibuka kembali. Risiko deklarasi usia keliru/temuan data anak tetap masuk review kepatuhan dan prosedur insiden yang relevan.

| Bagian review | Temuan konkret / requirement | Status kerja |
| --- | --- | --- |
| Identitas akun vs usia/wali | Google/email verified membuktikan kontrol metode autentikasi; tidak membuktikan usia, hubungan wali atau kapasitas transaksi | Ditetapkan dalam kontrak; assurance nyata belum dipilih/divalidasi. |
| Usia dan fitur | Akses anak di bawah 13 membutuhkan desain khusus anak/risiko rendah; kelompok lain mengikuti ketentuan usia/risiko dan consent | Kebutuhan sudah dipetakan; profil risiko Niuva belum ditetapkan. |
| Shop, checkout dan Custom Print berbayar | Fasilitas penawaran dan pembayaran harus masuk asesmen risiko konsumen, bukan diasumsikan rendah hanya karena situs bukan media sosial | Periksa indikator Permen 9/2026 Pasal 14–15 beserta bukti runtime dan kontrol. |
| Verifikasi/consent wali | Hasil minimum, hubungan/kewenangan, purpose/versi consent, penarikan dan bukti yang dapat diaudit | Desain dapat disiapkan. Email/OTP/checklist saja tidak diasumsikan bukti hubungan wali; tidak mengumpulkan KTP/biometrik dari paket ini. |
| Google bagi anak | Usia minimum untuk mengelola akun Google sendiri berbeda dari akun supervised; dukungan OAuth/izin orang tua perlu dibuktikan per tipe akun | Tambahkan skenario supervised/denied dan matriks metode per usia. Jangan menautkan identitas Google wali menjadi identitas anak otomatis. |
| Pembayaran/consent Niuva | Kontrol pembelian Family Link berlaku untuk billing Google Play; tidak menggantikan consent wali dan kontrol pembayaran Niuva/Midtrans | Ditetapkan sebagai batas integrasi; jangan memakai Family Link sebagai bukti otomatis persetujuan transaksi Niuva. |
| Penilaian/pelaporan profil | Penilaian mandiri, bukti pendukung, narahubung serta prosedur pelaporan/verifikasi/penetapan yang berlaku | Belum ada klaim laporan disampaikan atau penetapan diperoleh. Instruksi pengiriman ke pihak lain diperlukan terpisah. |

Rujukan: [UU PDP](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022), [PP 17/2025](https://peraturan.go.id/files/pp-no-17-tahun-2025.pdf), [Permen Komdigi 9/2026](https://jdih.komdigi.go.id/produk_hukum/view/id/1007/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B9%2Btahun%2B2026), [persyaratan usia akun Google](https://support.google.com/accounts/answer/1350409?hl=id), [Family Link](https://support.google.com/families/answer/7101025).

## Bukti provider yang masih diperlukan

Dokumentasi umum provider hanya menutup requirement produk/API, bukan fakta merchant, konfigurasi region atau penerimaan staging. Isian berikut dapat dilengkapi dari konfigurasi non-rahasia/support/account settings yang relevan; tidak meminta credential atau transaksi production lewat chat.

| Area | Yang sudah diketahui | Bukti spesifik yang diperlukan untuk lanjut |
| --- | --- | --- |
| Midtrans refund | API/refund_key, perbedaan accepted vs hasil bank, window/cutoff dan fallback terdokumentasi | Sandbox account tersedia, daftar metode/channel merchant, API refund aktif/eligible, batas waktu/ETA, prosedur saldo dan dana manual; lalu test sandbox. |
| Pendanaan refund manual/biaya retur | Owner tetap menyetujui; nominal transaksi server dan biaya luar charge terpisah | Jalur pembayaran bisnis yang berwenang, siapa eksekutor, sumber dana, bukti transfer serta verifikasi penerima. Nomor rekening pribadi/credential tidak perlu dicatat di repo. |
| Email | Snapshot presence Resend 3 Oktober tersedia; konfigurasi saat ini tidak diperiksa ulang | Sender/domain/from yang tersedia untuk hosted, penerima test, bukti inbox/bounce, retensi pesan/log dan purge provider. |
| Penyimpanan/data | Snapshot lokal R2/PostgreSQL tersedia; bukan evidence resource hosted saat ini | Vendor/resource hosted yang benar-benar dipilih, lokasi primary/backup, subprocessor/DPA, akses, retensi dan bukti delete. |
| Backup/restore | Kontrak restore harus mempertahankan closure/holds/due dan rekonsiliasi refund/outbox | Resource, jadwal/expiry, pemilik, RPO/RTO yang disetujui dan latihan restore terisolasi. Tidak mengarang angka retensi atau kemampuan delete. |
| Staging | Proyek terpisah tetap pilihan Owner | Nama/project/resource non-secret, URL HTTPS, provider sandbox, owner teknis dan aturan pengoperasian; deployment membutuhkan instruksi sendiri. |

Dokumentasi [cakupan refund](https://docs.midtrans.com/docs/what-payment-method-that-have-refund-feature) dan [Refund API](https://docs.midtrans.com/reference/refund-transaction) diperiksa ulang 3 Oktober. Perbedaan antar-halaman tentang rincian metode harus dikonfirmasi untuk merchant/channel aktual sebelum membuat janji ETA atau dukungan di policy resmi. Tidak menyalin seluruh tabel provider menjadi konfigurasi aktif Niuva.

## Urutan kerja yang ringkas

1. Catat jawaban Owner sekali pada catatan ini dan dokumen yang menggunakannya. Jangan meminta ulang nama petugas atau alamat yang sudah dikonfirmasi.
2. Siapkan implementasi bagian yang kontraknya sudah jelas: consent berversi, kasus/approval/full refund/idempotensi, outbox/expiry, tier hosted dan job/monitoring. Desain serta test dengan fixture tidak memerlukan perekrutan konsultan formal. Eksekusi batch kode mengikuti scope yang diminta pengguna; catatan ini bukan perintah mengaktifkan resource.
3. Pertahankan kontrol deklarasi 18+ yang sudah dipilih/diimplementasikan; selesaikan pengesahan policy dan review terbuka tanpa menambah akun anak/wali. Auth framework/deklarasi bukan bukti usia terverifikasi. Formal RK-02/RK-03 tidak dinaikkan oleh perubahan dokumen ini.
4. Isi detail operasional yang belum diberikan saat tersedia, lalu lakukan simulasi Rheza/Owner terhadap SLA dan tindak lanjut pasca-closure. Coverage 72 jam kalender memerlukan penugasan nyata, termasuk akhir pekan/libur.
5. Uji sandbox/staging/restore ketika resource non-production siap dan tindakan terkait diinstruksikan. Publikasi policy dan activation production mengikuti bukti serta instruksi terpisah.

PUB-BIZ/PUB-SERVICE mempunyai input terkonfirmasi, tetapi belum tertutup seluruhnya. PUB-AGE mempunyai kontrol lokal yang sudah ada; akun anak/wali di luar scope 18+, dengan status formal keputusan tetap terpisah. Pengesahan policy, provider/backup dan izin rilis tidak ditutup oleh rekonsiliasi ini. Status/bukti lengkap berada pada [matriks kesiapan](customer-public-launch-readiness.md#matriks-kesiapan).
