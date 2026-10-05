# Kesiapan policy dan operasional Customer publik

**Versi paket:** PUBLIC-PREPARATION-2026-10-03-v1. **Status:** paket review, bukan policy resmi atau izin rilis. Baseline kode: PR #38, tree yang sama dengan `origin/main` pada `6c12a5f`. Dokumen ini mencatat keputusan Owner 3 Oktober 2026 dan kebutuhan yang belum dipenuhi; tidak mengubah endpoint, schema, konfigurasi, atau kemampuan hosted.

## Keputusan dan batas bukti

| Keputusan Owner | Arti bagi batch ini |
| --- | --- |
| Pendaftaran publik penuh, Google dan email/password | Menggantikan target pilot undangan. Runtime pengujian internal tetap memakai allowlist dan dokumen pengujian tersendiri sampai implementasi publik selesai. |
| Target semua usia | Menggantikan pembatasan umum 18+ dalam draf v2. Kelayakan fitur per kelompok usia, perlindungan anak, serta verifikasi dan persetujuan wali menjadi prasyarat aktivasi, bukan pengecualian hukum. |
| Owner menyetujui; aplikasi menjalankan dan memantau refund | Kontrak implementasi berikutnya. Baseline mempunyai penanganan notifikasi pembayaran dan exception, belum service pengajuan refund otomatis. |
| Refund penuh versi pertama; metode pembayaran tetap luas | Nominal berasal dari transaksi server. Metode tanpa dukungan API ditangani melalui pengecualian manual yang disetujui dan direkonsiliasi. |
| Staging terpisah dan outbox dengan retry | Pilihan arsitektur yang dipertahankan; belum merupakan resource hosted, mekanisme pengiriman, atau bukti pemulihan yang tervalidasi. |

Identitas yang sudah dikonfirmasi: **PT. NIUVA INOVASI UTAMA**, **Jl. Telekomunikasi No.1, Sukapura, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat**, **niuvamakerspace@gmail.com**, **085117678901**. Owner kini mengonfirmasi alamat tersebut sebagai **alamat retur** dan **Rheza sebagai petugas utama** layanan, privasi serta tindak lanjut pembayaran/refund. Detail penerima/jam retur, pengganti/coverage, kalender libur, jalur dana refund, wilayah layanan, konfigurasi production dan kontrak provider masih memerlukan input/bukti. Jawaban yang sudah diberikan tidak diminta ulang; rincian ada dalam [catatan input dan bukti](customer-public-input-evidence.md).

## Isi paket dan authority

- [Syarat Layanan v3](customer-terms-draft.md) dan [Kebijakan Privasi v3](customer-privacy-draft.md): draf, belum berlaku, belum tersedia sebagai persetujuan komersial publik.
- [SOP layanan, retur, refund](customer-service-refund-sop.md): kontrak operasional yang harus ditugaskan dan dibuktikan.
- [SOP privasi, data dan retensi](customer-privacy-retention-sop.md): pemetaan per tujuan, provider, tenggat dan pemulihan.
- [Kontrak implementasi publik](customer-public-runtime-contract.md): requirement, bukan endpoint atau model database yang sudah ada.
- [Simulasi dan validasi paket](customer-public-policy-validation.md): hasil pemeriksaan dokumen serta skenario untuk batch kode/staging.
- [Input dan bukti terbaru](customer-public-input-evidence.md): jawaban Owner, presence lokal terkini, review internal dan kebutuhan konkret tersisa.
- [Snapshot implementasi Development 2 Oktober](customer-policy-implementation.md): bukti terbatas pada implementasi lama, bukan kesiapan publik.

Keputusan produk dicatat dalam [addendum PRD](../PRD-Niuva-MVP.md#addendum-persiapan-customer-publik--3-oktober-2026); kebutuhan teknis dalam [addendum Tech Design](../TechDesign-Niuva-MVP.md#addendum-kontrak-kesiapan-customer-publik--3-oktober-2026). Kontrak operasional sebelumnya, termasuk [closure pembayaran](../backend/phase-2-closure-decisions.md), [retensi berkas](../backend/phase-2-closure-decisions.md) dan [intake provider](../backend/provider-staging-intake.md), tetap berlaku pada runtime saat ini. Addendum baru menetapkan perluasan target, bukan menganggap perluasan itu telah berjalan.

## Penilaian akun anak

Dasar review: [UU PDP Pasal 20 dan 25](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022), [PP 17/2025, khususnya Pasal 20–22](https://peraturan.go.id/files/pp-no-17-tahun-2025.pdf), serta [Permen Komdigi 9/2026](https://jdih.komdigi.go.id/produk_hukum/view/id/1007/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B9%2Btahun%2B2026). Persetujuan orang tua/wali untuk pemrosesan data anak tidak menggantikan syarat usia, desain dan risiko akses layanan.

| Kelompok | Kelayakan yang harus dibuktikan sebelum aktivasi |
| --- | --- |
| Di bawah 3 tahun | Permen tidak memperbolehkan penargetan layanan kepada kelompok ini. Target semua usia bukan izin menawarkan akun mandiri untuk kelompok ini. |
| 3–5, 6–9, 10–12 tahun | Layanan yang dirancang khusus untuk anak, berisiko rendah, sesuai tahap perkembangan, dan memperoleh persetujuan orang tua/wali. Belum ada hasil penilaian/desain Niuva yang membuktikannya. |
| 13–15 tahun | Kelayakan layanan berisiko rendah dan persetujuan orang tua/wali. Penilaian setiap fitur tetap diperlukan. |
| 16–17 tahun | Persetujuan orang tua/wali serta kontrol usia/risiko yang berlaku. Bukan akses otomatis untuk seluruh fitur. |
| 18 tahun ke atas | Penerimaan policy, identitas/metode autentikasi dan kontrol transaksi biasa; hasil penilaian risiko tidak menghapus kontrol keamanan umum. |

Seluruh fitur berikut berstatus **belum dinilai/disahkan untuk akses anak**. Tabel ini merupakan pertanyaan asesmen, bukan penetapan profil risiko rendah. Permen Pasal 8 menilai tujuh aspek risiko; satu aspek tinggi dapat menghasilkan profil tinggi. Owner dan fungsi review internal menelusuri penilaian, pelaporan dan penetapan yang diperlukan beserta bukti sesuai prosedur resmi; isu yang memerlukan keahlian atau keputusan pihak berwenang ditindaklanjuti spesifik. Penunjukan konsultan formal tidak menjadi syarat memulai kode.

| Aspek asesmen | Permukaan Niuva yang perlu diperiksa | Bukti/kontrol yang diperlukan |
| --- | --- | --- |
| Kontak orang tidak dikenal | Operator, kontak B2B, kurir dan tindak lanjut keluhan | Batas komunikasi, akses petugas, pelaporan perilaku dan keterlibatan wali. |
| Konten tidak sesuai anak | Katalog, upload 3D/CAD, uraian brief dan komunikasi | Kebijakan konten, pemeriksaan unggahan dan materi layanan menurut kelompok usia. |
| Eksploitasi sebagai konsumen | Shop, quote Custom Print, checkout dan pembayaran | Informasi harga yang jelas, pihak yang bertransaksi, persetujuan wali dan batas komitmen finansial. |
| Keamanan data pribadi | Identitas, alamat, OAuth, bukti wali dan ekspor | Minimisasi, private-by-default, verifikasi kewenangan, retensi serta kontrol akses. |
| Adiksi | Interaksi, pemberitahuan, promosi/analitik yang mungkin ditambah | Audit desain dan pengaturan yang sesuai anak; tidak menganggap tidak ada risiko tanpa review. |
| Gangguan psikologis | Konten, keluhan, komunikasi dan tekanan membeli | Penilaian dampak, bahasa yang dipahami anak, jalur bantuan dan penghentian akses aman. |
| Gangguan fisiologis | Interaksi layar dan konteks produk/berkas yang dipesan | Kesesuaian fitur/produk, informasi keselamatan dan kontrol yang ditetapkan hasil asesmen. |

Keputusan metode verifikasi masih terbuka. Assurance harus proporsional dengan risiko; tanggal lahir atau checkbox saja tidak diasumsikan memadai. Utamakan hasil verifikasi minimum dibanding salinan identitas/biometrik. Tetapkan retensi bukti, penghapusan bahan verifikasi, peninjauan keputusan usia keliru, perubahan wali dan penarikan persetujuan. Bila usia belum dapat diverifikasi, pelindungan privasi anak diterapkan sebagaimana aturan; hal itu tidak membuka akses anak tanpa kelayakan dan persetujuan yang diwajibkan.

Untuk transaksi anak, review harus menetapkan pihak yang menyepakati kontrak, wali/pembayar yang berwenang, penerima refund dan penyelesaian sengketa wali. Login Google atau email terverifikasi hanya membuktikan kontrol atas identitas tersebut; tidak membuktikan usia, kapasitas transaksi atau hubungan wali. Sampai PUB-AGE dan PUB-GUARDIAN ditutup, kemampuan publik terkait tetap ditahan. Tidak ada pilihan metode verifikasi atau pengumpulan data anak baru melalui batch dokumen ini.

## Matriks kesiapan

Status mengacu pada **kesiapan publik**, bukan kualitas kode internal. `OPEN_OWNER_INPUT` membutuhkan fakta/penugasan Owner; `PARTIAL_OWNER_INPUT` mempunyai sebagian jawaban terkonfirmasi; `OPEN_LEGAL_REVIEW` membutuhkan penilaian kewajiban; `NOT_IMPLEMENTED` membutuhkan kode; `UNVERIFIED_PROVIDER`, `UNVERIFIED_RECOVERY`, dan `UNVERIFIED_STAGING` membutuhkan bukti lingkungan nyata. `NOT_AUTHORIZED` membutuhkan instruksi tindakan terpisah. **Rheza sudah ditetapkan sebagai petugas utama operasional**; pengganti/coverage dan pemilik teknis yang belum disebutkan tetap OPEN. Istilah legal/akuntansi menunjukkan fungsi review, bukan kewajiban merekrut konsultan formal sebelum menulis kode; review internal berbasis sumber resmi dapat berjalan. Keputusan pihak berwenang atau keahlian yang memang diperlukan tetap dicatat spesifik. Pemilik peran bertanggung jawab sesuai kewenangan; nama Rheza tidak otomatis mengubah permission Owner/Admin.

| ID / kebutuhan | Status terkini | Penanggung jawab | Bukti diperlukan | Syarat penutupan / tahap paling lambat |
| --- | --- | --- | --- | --- |
| PUB-BIZ — fakta layanan/kontrak | PARTIAL_OWNER_INPUT | Owner + fungsi review | Identitas/kontak/alamat retur sudah dikonfirmasi. Detail penerima/jam retur, wilayah, pajak, katalog/bahan, titik kontrak Shop, kanal sengketa dan konten/IP masih perlu dilengkapi | Fakta disetujui, cocok dengan konfigurasi dan policy; sebelum publikasi. |
| PUB-AGE — usia, desain dan risiko | OPEN_LEGAL_REVIEW | Owner + legal + penanggung jawab produk | Asesmen per kelompok/fitur, profil risiko, kewajiban pelaporan/penetapan, informasi usia dan kontrol yang disahkan | Kelayakan tiap kelompok/fitur tercatat, kewajiban dipenuhi dan kontrol diuji; sebelum akses anak/aktivasi publik. |
| PUB-GUARDIAN — wali/anak/transaksi | NOT_IMPLEMENTED | Owner + legal + engineering | Metode assurance, persetujuan terpisah, bukti wali, pihak transaksi, penarikan/keberatan/usia keliru | Legal menyetujui metode dan hasil kode/staging membuktikan akses tidak terlewati; sebelum aktivasi publik. |
| PUB-POLICY — dokumen resmi/consent | NOT_IMPLEMENTED | Owner + legal + engineering | Versi immutable, tanggal berlaku, persetujuan final, salinan publik dan bukti penerimaan kedua metode | Isi cocok kemampuan tervalidasi; bukti penerimaan terpisah dari internal; publikasi membutuhkan instruksi eksplisit. |
| PUB-DATA — field/tujuan/dasar | OPEN_LEGAL_REVIEW | Owner + penanggung jawab privasi + legal | Peta field, dasar per tujuan, data pihak ketiga/anak, minimisasi dan penghapusan | Register disetujui dan sesuai penggunaan nyata termasuk sistem eksternal; sebelum publikasi. |
| PUB-PROVIDER — penerima/lokasi | UNVERIFIED_PROVIDER | Owner + Rheza (koordinasi privasi) + engineering | Presence lokal Google/Resend/Clerk/R2 terkonfirmasi; kontrak/DPA, lokasi/subprocessor, kategori data, transfer, akses/deletion dan kanal bantuan hosted tiap provider belum terbukti | Tidak ada lokasi/retensi/kemampuan hapus yang diasumsikan; sebelum publikasi. |
| PUB-RECORDS — arsip transaksi | OPEN_LEGAL_REVIEW | Owner + akuntansi + legal | Kategori pembukuan wajib, dasar/start point retensi, lokasi Indonesia, pemisahan chat/profil | Jadwal dan akses arsip disahkan, diimplementasikan dan dibuktikan; sebelum publikasi. |
| PUB-BACKUP — backup/penghapusan/pemulihan | UNVERIFIED_RECOVERY | Owner + engineering + privasi | Jadwal/expiry, enkripsi, akses, purge provider, replay closure/holds saat restore dan latihan pemulihan | Restore tidak memulihkan akses/riwayat atau data yang wajib dihapus; sebelum aktivasi. |
| PUB-SERVICE — petugas/kalender/retur | PARTIAL_OWNER_INPUT | Owner + Rheza | Petugas utama dan alamat retur sudah dikonfirmasi. Pengganti/coverage, akses inbox/telepon, detail penerima/jam, kalender WIB/libur dan cara menghitung SLA masih perlu dilengkapi | Simulasi 1/2/1 hari kerja, kontak pasca-closure dan eskalasi berhasil; sebelum publikasi. |
| PUB-REFUND — kasus/persetujuan/nominal | NOT_IMPLEMENTED | Owner + engineering | Kasus per order/payment, audit persetujuan, ledger full refund, retur, expense ongkir dan closure | Regresi nominal/otorisasi/closure lulus, tidak mengubah status produksi/stock tanpa dasar; sebelum staging refund. |
| PUB-REFUND-PROVIDER — cakupan metode | UNVERIFIED_PROVIDER | Owner + operasi pembayaran | Daftar semua metode/channel aktif, kemampuan/aktivasi API, window/cutoff, saldo, ETA dan jalur manual | Setiap metode punya bukti atau fallback siap; tidak diam-diam mengurangi pilihan; sebelum publikasi. |
| PUB-REFUND-RECON — job/hasil/pengecualian | NOT_IMPLEMENTED | Owner + engineering + operasi pembayaran | Stable refund_key, batas retry, signed notification/status query, hasil bank, bukti manual dan review hasil tak pasti | Tidak ada refund ganda; API diterima bukan selesai; timeout/partial/late diuji sandbox; sebelum aktivasi. |
| PUB-HOSTED — guard staging/production | NOT_IMPLEMENTED | Engineering + Owner | Tier, origin/CSP, resource binding, sesi, email/privacy dan mode provider konsisten | Build saja tidak membuka capability; izin per lingkungan diuji; sebelum staging. |
| PUB-EMAIL — outbox/inbox | NOT_IMPLEMENTED | Engineering + penanggung jawab layanan | Durable outbox, expiry/retry, sender/domain, rate limit, bounce, inbox dan pesan pasca-closure | Token tidak bocor/dikirim setelah invalid, pengiriman tidak memberi otorisasi prematur; sebelum publikasi. |
| PUB-JOBS — cleanup dan SLA | NOT_IMPLEMENTED | Engineering + privasi + layanan | Jadwal hosted, dueAt tetap, monitoring lag/last success, retry/lock, alarm dan petugas | Kegagalan/hold/overdue ditangani tanpa reset tenggat; batas lag disetujui dan terukur; sebelum publikasi. |
| PUB-INCIDENT — hak lain/insiden | OPEN_LEGAL_REVIEW | Owner + privasi + legal | Kanal hak belum otomatis, verifikasi, keputusan pengecualian, breach response dan notifikasi | Jalur akses/koreksi/withdraw/restriction serta insiden diuji dengan tenggat kalender; sebelum publikasi. |
| PUB-STAGING — bukti hosted terpadu | UNVERIFIED_STAGING | Engineering + Owner + petugas operasi | Proyek staging terpisah, OAuth, inbox, sandbox payment/webhook/refund, R2, backup/restore dan SOP | Skenario paket serta penerimaan yang relevan lulus di resource terpisah; sebelum publikasi sesuai kemampuan. |
| PUB-RELEASE — publikasi/production | NOT_AUTHORIZED | Owner | Gate tertutup, persetujuan final, tanggal berlaku, konfigurasi/resource produksi, monitoring/rollback dan instruksi rilis | Publikasi, deployment, aktivasi provider dan penggunaan credential production dilakukan hanya atas instruksi masing-masing. |

Setiap gate mempunyai catatan bukti: ID, status/tanggal, pemilik bernama, dokumen/versi, lingkungan, langkah dan hasil, reviewer, temuan tersisa, serta keputusan penutupan. Link, hasil CI atau konfigurasi tanpa skenario yang relevan tidak menutup gate. Jika detail belum tersedia, catat OPEN dengan pemilik dan kebutuhan; jangan menggantinya dengan angka, alamat atau dukungan provider yang diperkirakan.

## Pekerjaan kode yang dapat dipersiapkan

Matriks ini bukan syarat menutup semua fakta production sebelum mulai pengembangan. Desain dan pengujian fixture untuk consent berversi, full refund/Owner approval/idempotensi, outbox/expiry, tier hosted serta cleanup/monitoring dapat dipersiapkan berdasarkan kontrak yang sudah jelas. Implementasi mengikuti scope permintaan pengguna. Metode verifikasi/kelayakan anak yang belum ditentukan tidak dipilih diam-diam; capability terkait tetap gagal tertutup. Bukti merchant, inbox, storage dan backup menyusul melalui staging sebelum kemampuan itu diaktifkan atau dijanjikan dalam policy resmi. Penunjukan konsultan formal tidak menjadi gate pekerjaan kode.

## Urutan pelaksanaan dan rollback

| Tahap | Keluaran dan syarat lanjut |
| --- | --- |
| Policy dan operasional — batch ini | Paket draf/review dan simulasi dokumen selesai; input terbuka serta kontrak implementasi tercatat. Review legal/Owner belum dianggap diberikan. |
| Implementasi kesiapan publik | Policy consent, usia/wali, refund, privacy hosted, outbox, job dan monitoring diimplementasikan. Lint, typecheck, unit/backend/integration, Prisma validation, E2E dan build lulus; regresi dalam kontrak dipenuhi. |
| Staging terpisah | Resource tidak berbagi data/secret production. Bukti provider sandbox, email inbox, OAuth, private R2, cleanup dan recovery serta operasi layanan disimpan. |
| Publikasi policy resmi | Isi sesuai kemampuan/konfigurasi tervalidasi, legal dan Owner menyetujui, versi/tanggal berlaku tercatat. Draf tidak otomatis berubah resmi karena merge. |
| Aktivasi production | Resource, provider, pemantauan, on-call, data operasional dan rollback siap. Instruksi rilis eksplisit diperlukan sebelum pendaftaran publik dibuka. |

Rollback dokumen memakai versi Git sebelumnya; salinan draf terdahulu bukan policy berlaku. Untuk fase runtime berikutnya, menutup pendaftaran baru tidak menghentikan penyelesaian pesanan/refund, hak privasi, email yang masih sah dan retensi. Rollback tidak menghidupkan akun tertutup, mengulang refund, menghapus catatan keuangan, atau mengganti versi persetujuan historis. Tidak ada tindakan deployment/provider/credential atau publikasi resmi dalam batch ini.
