# Kesiapan policy dan operasional Customer publik

**Versi paket:** PUBLIC-PREPARATION-2026-10-03-v1, rekonsiliasi dokumentasi **13 Oktober 2026**. **Status:** paket review, bukan policy resmi atau izin rilis. Baseline sumber terkini: `a577b7c326ff42d3a642cf5f0b93ccdf59c26bef`; PR #38 / `6c12a5f` tetap baseline historis paket awal. Rekonsiliasi mengikuti keputusan Owner 5 dan 11 Oktober serta source terkini, tanpa mengubah endpoint, schema, konfigurasi atau kemampuan hosted.

Authority aktif: [PRD](../PRD-Niuva-MVP.md#rekonsiliasi-kontrak-rilis--13-oktober-2026), [Tech Design](../TechDesign-Niuva-MVP.md#rekonsiliasi-kontrak-teknis-rilis--13-oktober-2026) dan [register keputusan](../../.kiro/specs/niuva-audit-remediation/register-keputusan.md). Status/dependensi rilis berada pada [handoff aktif](../frontend/mvp-release-readiness.md#peta-penghambat-rilis). Pengesahan formal, implementasi dan evidence lingkungan dicatat terpisah.

## Keputusan dan batas bukti

| Keputusan Owner | Arti bagi batch ini |
| --- | --- |
| Pendaftaran publik penuh, Google dan email/password | Menggantikan target pilot undangan. Runtime pengujian internal tetap memakai allowlist dan dokumen pengujian tersendiri sampai implementasi publik selesai. |
| Akun 18+ dengan pernyataan usia — Owner 5 Oktober | Menggantikan target semua usia 3 Oktober. Kontrol internal/test tersedia sejak 6 Oktober; self-declaration tidak memverifikasi usia. Akun anak/wali di luar scope aktif; penutupan formal RK-02/RK-03, review kepatuhan dan izin publik tetap terpisah. |
| Owner menjadi pengesah dokumen — Owner 5 Oktober | Versi resmi/tanggal berlaku dan pengesahan final belum diberikan. Review berbasis sumber resmi tetap dicatat; perekrutan konsultan formal bukan gate coding dan keputusan ini bukan bukti kepatuhan. |
| B2B WhatsApp langsung — Owner 11 Oktober | Website tidak membuat brief/proposal/penagihan B2B baru; data historis dan inventaris kanal eksternal tetap dilindungi. |
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

Addendum PRD/Tech Design 3 Oktober merupakan snapshot paket awal; kontrak aktif mengikuti rekonsiliasi 13 Oktober dan keputusan yang dirujuk di atas. [Closure pembayaran](../backend/phase-2-closure-decisions.md), [retensi berkas](../backend/phase-2-closure-decisions.md) dan batas [intake provider](../backend/provider-staging-intake.md) tetap berlaku sejauh tidak digantikan keputusan berikutnya. Target publik tidak berarti kemampuan tersebut telah berjalan.

## Penilaian akun anak

**Arsip target semua usia — 3 Oktober 2026.** Bagian ini mempertahankan kajian/sumber fase tersebut; akun anak/wali tidak menjadi requirement implementasi rilis 18+ yang dipilih Owner 5 Oktober. Sumber hukum di bawah merupakan rujukan review saat itu, bukan pemeriksaan hukum baru pada 13 Oktober. Perluasan usia membutuhkan keputusan tersendiri. Temuan data/pengguna di bawah umur dan risiko deklarasi yang keliru tetap memerlukan review/prosedur yang tepat; batas 18+ tidak membuktikan semua kewajiban telah dipenuhi.

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

Status pada tabel direkonsiliasi **13 Oktober 2026** terhadap source, bukan uji hosted. `PARTIAL_OWNER_INPUT` mempunyai sebagian jawaban terkonfirmasi; `OPEN_REVIEW` membutuhkan penilaian/keputusan tercatat; `NOT_IMPLEMENTED` membutuhkan kode; `PARTIALLY_IMPLEMENTED` mempunyai fondasi tanpa kemampuan publik lengkap. `IMPLEMENTED_LOCAL_PENDING_FORMAL` memisahkan kontrol lokal dari penutupan formal; `OUT_OF_SCOPE_18_PLUS` tidak menjadi klaim legal approval. `UNVERIFIED_PROVIDER/RECOVERY/STAGING` membutuhkan bukti lingkungan; `NOT_AUTHORIZED` membutuhkan instruksi tindakan tersendiri. **Rheza sudah petugas utama**; nama engineering, pengganti dan coverage yang belum ditetapkan tetap OPEN. Owner menjadi pengesah dokumen sesuai RK-01. Legal/akuntansi menunjukkan fungsi review, bukan keharusan merekrut konsultan sebelum coding; kebutuhan keahlian/keputusan pihak berwenang tetap dicatat spesifik. Penugasan tidak otomatis mengubah permission aplikasi.

| ID / kebutuhan | Status terkini | Penanggung jawab | Bukti diperlukan | Syarat penutupan / tahap paling lambat |
| --- | --- | --- | --- | --- |
| PUB-BIZ — fakta layanan/kontrak | PARTIAL_OWNER_INPUT | Owner + fungsi review | Identitas/kontak/alamat retur sudah dikonfirmasi. Detail penerima/jam retur, wilayah, pajak, katalog/bahan, titik kontrak Shop, kanal sengketa dan konten/IP masih perlu dilengkapi | Fakta disetujui, cocok dengan konfigurasi dan policy; sebelum publikasi. |
| PUB-AGE — kontrol usia 18+ dan batasnya | IMPLEMENTED_LOCAL_PENDING_FORMAL | Owner + fungsi review + engineering | [Kontrol deklarasi](../../src/modules/customer-auth/age-declaration.ts) dan [hasil 6 Oktober](../../.kiro/specs/niuva-keputusan-lanjutan/implementation-report.md) tersedia; RK-02 masih formal terbuka | Keputusan 18+ dipertahankan, batas deklarasi/review dicatat, penutupan formal dan penerimaan hosted terpisah; tidak meminta ulang metode. |
| PUB-GUARDIAN — akun anak/wali | OUT_OF_SCOPE_18_PLUS | Owner + fungsi review | RK-03 mencatat tidak ada akun di bawah 18 tahun dalam scope; status formal register tetap terbuka | Tidak menambah workflow anak/wali untuk rilis ini. Perluasan usia memerlukan keputusan/kontrak baru; kewajiban atas temuan data anak tetap ditinjau. |
| PUB-POLICY — dokumen resmi/consent | DRAFT_PENDING_OWNER_AND_IMPLEMENTATION | Owner (pengesah) + fungsi review + engineering | Versi resmi immutable, tanggal berlaku, pengesahan final, salinan publik dan bukti penerimaan kedua metode belum tersedia; resolver hanya internal/test | Owner mengesahkan versi/tanggal, isi cocok kemampuan terbukti, public consent diimplementasikan terpisah dari internal; publikasi memerlukan instruksi sendiri. |
| PUB-DATA — field/tujuan/dasar | OPEN_REVIEW | Owner + penanggung jawab privasi + fungsi review | Peta field/tujuan, deklarasi usia, data pihak ketiga atau temuan data anak, minimisasi dan penghapusan | Register disetujui sesuai penggunaan nyata termasuk sistem eksternal; bukan requirement akun anak baru. |
| PUB-PROVIDER — penerima/lokasi | UNVERIFIED_PROVIDER | Owner + Rheza (koordinasi privasi) + engineering | Snapshot presence lokal terdahulu adalah histori; Admin sekarang Better Auth/database aplikasi. Resource/kontrak/lokasi/subprocessor, akses/deletion dan kanal bantuan hosted tiap sistem belum terbukti | Inventaris sistem yang benar-benar digunakan dan data historis; tidak mengasumsikan lokasi/retensi/kemampuan hapus atau provider aktif dari library/key. |
| PUB-RECORDS — arsip transaksi | OPEN_REVIEW | Owner + fungsi akuntansi/kepatuhan | Kategori pembukuan wajib, dasar/start point retensi, lokasi Indonesia, pemisahan chat/profil | Jadwal/akses arsip disahkan, diimplementasikan dan dibuktikan; angka per kategori tidak ditetapkan oleh revisi ini. |
| PUB-BACKUP — backup/penghapusan/pemulihan | UNVERIFIED_RECOVERY | Owner + engineering + privasi | Jadwal/expiry, enkripsi, akses, purge provider, replay closure/holds saat restore dan latihan pemulihan | Restore tidak memulihkan akses/riwayat atau data yang wajib dihapus; sebelum aktivasi. |
| PUB-SERVICE — petugas/kalender/retur | PARTIAL_OWNER_INPUT | Owner + Rheza | Petugas utama dan alamat retur sudah dikonfirmasi. Pengganti/coverage, akses inbox/telepon, detail penerima/jam, kalender WIB/libur dan cara menghitung SLA masih perlu dilengkapi | Simulasi 1/2/1 hari kerja, kontak pasca-closure dan eskalasi berhasil; sebelum publikasi. |
| PUB-REFUND — kasus/persetujuan/nominal | NOT_IMPLEMENTED | Owner + engineering | Kasus per order/payment, audit persetujuan, ledger full refund, retur, expense ongkir dan closure | Regresi nominal/otorisasi/closure lulus, tidak mengubah status produksi/stock tanpa dasar; sebelum staging refund. |
| PUB-REFUND-PROVIDER — cakupan metode | UNVERIFIED_PROVIDER | Owner + operasi pembayaran | Daftar semua metode/channel aktif, kemampuan/aktivasi API, window/cutoff, saldo, ETA dan jalur manual | Setiap metode punya bukti atau fallback siap; tidak diam-diam mengurangi pilihan; sebelum publikasi. |
| PUB-REFUND-RECON — job/hasil/pengecualian | NOT_IMPLEMENTED | Owner + engineering + operasi pembayaran | Stable refund_key, batas retry, signed notification/status query, hasil bank, bukti manual dan review hasil tak pasti | Tidak ada refund ganda; API diterima bukan selesai; timeout/partial/late diuji sandbox; sebelum aktivasi. |
| PUB-HOSTED — guard staging/production | PARTIALLY_IMPLEMENTED | Engineering (nama belum ditetapkan) + Owner | Tier/mode, canonical origin dan [matrix/resolver](../../src/modules/capabilities/matrix.ts) tersedia; grant kosong, production/mode live serta guard lama tetap menolak. Email/privacy publik belum lengkap | Lengkapi konsistensi resource/origin/cookie/CSP/capability untuk staging sandbox; uji sebelum klaim hosted. Tidak melepas guard atau memberi grant lewat dokumen. |
| PUB-EMAIL — outbox/inbox | NOT_IMPLEMENTED | Engineering + penanggung jawab layanan | Durable outbox, expiry/retry, sender/domain, rate limit, bounce, inbox dan pesan pasca-closure | Token tidak bocor/dikirim setelah invalid, pengiriman tidak memberi otorisasi prematur; sebelum publikasi. |
| PUB-JOBS — cleanup dan SLA | PARTIALLY_IMPLEMENTED | Engineering (nama belum ditetapkan) + privasi + Rheza | Cleanup lokal dan cron retensi analytics ada; scheduler retensi berkas/stock/payment, monitoring lag/last success, retry/lock, alarm dan batas lag masih dibutuhkan | Job operasional hosted dan kegagalan/hold/overdue terbukti tanpa reset tenggat; cron analytics tidak menutup gate ini. |
| PUB-INCIDENT — hak lain/insiden | OPEN_REVIEW | Owner + penanggung jawab privasi + fungsi review | Kanal hak belum otomatis, verifikasi, pengecualian, temuan usia/data keliru, breach response dan notifikasi | Jalur hak/insiden diuji dengan pemilik dan tenggat kalender; tidak menyimpulkan kepatuhan dari batas usia. |
| PUB-STAGING — bukti hosted terpadu | UNVERIFIED_STAGING | Engineering + Owner + petugas operasi | Proyek staging terpisah, OAuth, inbox, sandbox payment/webhook/refund, R2, backup/restore dan SOP | Skenario paket serta penerimaan yang relevan lulus di resource terpisah; sebelum publikasi sesuai kemampuan. |
| PUB-RELEASE — publikasi/production | NOT_AUTHORIZED | Owner | Gate tertutup, persetujuan final, tanggal berlaku, konfigurasi/resource produksi, monitoring/rollback dan instruksi rilis | Publikasi, deployment, aktivasi provider dan penggunaan credential production dilakukan hanya atas instruksi masing-masing. |

Setiap gate mempunyai catatan bukti: ID, status/tanggal, pemilik bernama, dokumen/versi, lingkungan, langkah dan hasil, reviewer, temuan tersisa, serta keputusan penutupan. Link, hasil CI atau konfigurasi tanpa skenario yang relevan tidak menutup gate. Jika detail belum tersedia, catat OPEN dengan pemilik dan kebutuhan; jangan menggantinya dengan angka, alamat atau dukungan provider yang diperkirakan.

## Pekerjaan kode yang dapat dipersiapkan

Matriks ini bukan syarat menutup semua fakta production sebelum mulai pengembangan. Desain dan pengujian fixture untuk consent berversi akun 18+, full refund/Owner approval/idempotensi, outbox/expiry, hosted serta cleanup/monitoring dapat disiapkan berdasarkan kontrak yang jelas. Implementasi mengikuti instruksi scope pengguna. Akun anak/wali tidak ditambahkan; kontrol deklarasi existing dipertahankan tanpa klaim verifikasi usia. Bukti merchant, inbox, storage dan backup menyusul melalui staging sebelum kemampuan diaktifkan atau dijanjikan dalam policy resmi. Perekrutan konsultan formal bukan gate coding.

## Urutan pelaksanaan dan rollback

| Tahap | Keluaran dan syarat lanjut |
| --- | --- |
| Policy dan operasional — batch ini | Paket draf/review dan simulasi dokumen selesai; input terbuka serta kontrak implementasi tercatat. Review legal/Owner belum dianggap diberikan. |
| Implementasi kesiapan publik | Lengkapi public consent/akun 18+, refund, privacy hosted, outbox, job dan monitoring di atas fondasi yang sudah ada. Gate aplikasi dan regresi kontrak lulus; kontrol deklarasi tidak diulang sebagai fitur baru. |
| Staging terpisah | Resource tidak berbagi data/secret production. Bukti provider sandbox, email inbox, OAuth, private R2, cleanup dan recovery serta operasi layanan disimpan. |
| Publikasi policy resmi | Isi sesuai kemampuan/konfigurasi terbukti, review kepatuhan tercatat, Owner mengesahkan versi/tanggal berlaku dan memberi instruksi publikasi. Rekonsiliasi draf/merge tidak menjadi pengesahan resmi. |
| Aktivasi production | Resource, provider, pemantauan, on-call, data operasional dan rollback siap. Instruksi rilis eksplisit diperlukan sebelum pendaftaran publik dibuka. |

Rollback dokumen memakai versi Git sebelumnya; salinan draf terdahulu bukan policy berlaku. Untuk fase runtime berikutnya, menutup pendaftaran baru tidak menghentikan penyelesaian pesanan/refund, hak privasi, email yang masih sah dan retensi. Rollback tidak menghidupkan akun tertutup, mengulang refund, menghapus catatan keuangan, atau mengganti versi persetujuan historis. Tidak ada tindakan deployment/provider/credential atau publikasi resmi dalam batch ini.
