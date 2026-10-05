# Simulasi dan validasi paket Customer publik

**Tanggal:** 3 Oktober 2026. **Paket:** PUBLIC-PREPARATION-2026-10-03-v1, Syarat/Privasi v3. Baseline tree kode sama dengan PR #38 / `origin/main` `6c12a5f`. Status: pemeriksaan dokumen dan regresi preview yang relevan; bukan hasil legal approval, uji provider, atau penerimaan production.

## Metode dan batas

Simulasi di bawah menelusuri keputusan Customer, kewenangan Owner/wali, tenggat, nominal, hasil provider serta data setelah closure melalui [Syarat](customer-terms-draft.md), [Privasi](customer-privacy-draft.md), [SOP layanan](customer-service-refund-sop.md), [SOP privasi](customer-privacy-retention-sop.md) dan [kontrak runtime](customer-public-runtime-contract.md). `COVERED_DOCUMENT` berarti alur/hasil yang diperlukan tertulis konsisten; tidak berarti fitur sudah diuji atau gate kesiapan tertutup. Blocker dirujuk ke [matriks kesiapan](customer-public-launch-readiness.md#matriks-kesiapan).

Authority yang dicocokkan: addendum PRD/Tech Design 1–3 Oktober, kontrak closure/lifecycle pembayaran dan retensi berkas, serta resolver legal, guard internal/email/privacy/provider/CSP, repository closure, cleanup dan webhook pada checkout. Endpoint/schema runtime tidak diubah. Dokumen historis v2 tidak dipakai untuk mengaktifkan batas 18+ kembali atau menganggap alur publik ada.

Sumber primer dicek: [UU PDP](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang%2Bnomor%2B27%2Btahun%2B2022), [PP 17/2025](https://peraturan.go.id/files/pp-no-17-tahun-2025.pdf), [Permen Komdigi 9/2026](https://jdih.komdigi.go.id/produk_hukum/view/id/1007/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Bdigital%2Bnomor%2B9%2Btahun%2B2026), [PP 80/2019](https://www.peraturan.go.id/id/pp-no-80-tahun-2019), [UU KUP](https://www.pajak.go.id/id/undang-undang-nomor-28-tahun-2007), [cakupan metode refund](https://docs.midtrans.com/docs/what-payment-method-that-have-refund-feature) dan [Refund API](https://docs.midtrans.com/reference/refund-transaction). Ini pemeriksaan requirement terhadap sumber, bukan keputusan hukum atas kelayakan Niuva.

## Hasil simulasi dokumen

| ID | Pemicu contoh | Hasil yang ditelusuri dalam paket | Hasil / bukti lanjutan |
| --- | --- | --- | --- |
| SIM-01 | Anak 10 tahun mendaftar dengan Google; wali menyatakan setuju | OAuth bukan verifikasi usia/wali. Akses belum dibuka tanpa desain khusus anak/risiko rendah dan bukti persetujuan yang sah. Target semua usia dipertahankan tanpa menjanjikan akun mandiri. | COVERED_DOCUMENT; PUB-AGE/PUB-GUARDIAN masih terbuka, perlu asesmen dan regresi gate server. |
| SIM-02 | Anak 14 tahun memakai email; fitur belum dinilai atau wali menolak | Email verified tidak melewati kelayakan kelompok/fitur atau persetujuan wali. Tidak membuat sesi/akses transaksi. | COVERED_DOCUMENT; perlu metode assurance/legal dan implementasi; bukan penolakan berdasarkan blanket 18+. |
| SIM-03 | Anak 17 tahun membeli dengan wali; kemudian meminta refund | Pihak kesepakatan/pembayar/penerima diverifikasi menurut scope yang disahkan. Nominal/alokasi server, Owner approval, retur dan bukti akhir tetap wajib; wali tidak otomatis mendapat ekspor akun. | COVERED_DOCUMENT; PUB-GUARDIAN, PUB-REFUND dan metode provider harus dibuktikan. |
| SIM-04 | Usia tidak dapat diverifikasi atau hasil usia/wali keliru | Pelindungan privasi anak tidak menjadi pengecualian akses. Ada peninjauan usia/kewenangan, minimisasi bahan bukti dan jalur penarikan consent; tidak menyerahkan data kepada pengaku wali semata. | COVERED_DOCUMENT; prosedur/metode dan petugas legal belum disahkan. |
| SIM-05 | Wali menarik persetujuan ketika pesanan berjalan | Efek pada akses/data ditentukan berdasarkan purpose dan hukum; kewajiban transaksi dengan dasar lain ditangani terpisah. Withdrawal memiliki tenggat sendiri, tidak menunggu refund selesai. | COVERED_DOCUMENT; PUB-GUARDIAN/PUB-INCIDENT membutuhkan keputusan dan implementasi. |
| SIM-06 | Batas kirim yang disepakati lewat, barang belum dikirim | Verifikasi keadaan; Customer memilih refund penuh atau jadwal baru yang disepakati. Estimasi tiba tidak mengganti batas kirim; tidak membalik status produksi dengan mutasi yang dilarang. | COVERED_DOCUMENT; PUB-SERVICE/PUB-REFUND perlu data jadwal, petugas dan kasus keuangan. |
| SIM-07 | Barang cacat akibat Niuva, dilaporkan setelah anjuran 24 jam | Hak tidak gugur; waktu minimal 2 hari kerja dan cacat tersembunyi tetap diperiksa. Pilihan penggantian/pengerjaan ulang atau retur+refund; bukti relevan, alamat retur dikonfirmasi. | COVERED_DOCUMENT; legal/Owner memvalidasi alamat, kanal, bukti dan hak. |
| SIM-08 | Owner menyetujui bersyarat; retur tiba kemudian dan ada ongkir retur | Pengiriman refund menunggu syarat wajib. Pemicu 1 hari kerja dari syarat terakhir. Charge awal penuh; ongkir luar charge sebagai expense terpisah, tanpa over-refund. | COVERED_DOCUMENT; PUB-SERVICE, PUB-REFUND/PUB-RECORDS masih terbuka. |
| SIM-09 | Provider menerima request tetapi client timeout; notifikasi datang terlambat | Operasi menjadi unknown/rekonsiliasi, retry memakai key sama dalam window aman. Manual/key baru ditahan sampai operasi lama terbukti tidak akan membayar. API accepted belum selesai. | COVERED_DOCUMENT; perlu regresi crash/timeout/out-of-order dan sandbox PUB-REFUND-RECON. |
| SIM-10 | API menolak karena saldo tidak cukup atau validasi gagal | Kategori failure dicatat, Owner menangani pendanaan/perbaikan; perubahan scope/nominal memerlukan approval baru. SLA dan komunikasi tidak diulang; kasus tidak selesai. | COVERED_DOCUMENT; sumber dana, capability dan prosedur provider OPEN. |
| SIM-11 | Pembayaran VA/OTC tanpa refund API atau refund window telah habis | Pilihan metode tetap dilayani. Rekonsiliasi dahulu, verifikasi penerima, persetujuan manual dan bukti transfer/hasil; keterbatasan provider bukan biaya yang dipotong diam-diam. | COVERED_DOCUMENT; PUB-REFUND-PROVIDER/PUB-SERVICE perlu matriks setiap metode dan jalur pembayaran manual yang siap. |
| SIM-12 | Dua worker/dua klik dan retry melewati tujuh hari | Constraint/lock/submission key mencegah job ganda; operasi/parameter sama memakai refund_key sama. Cutoff menghentikan retry, bukan membuat key baru otomatis. | COVERED_DOCUMENT; perlu regresi concurrency/cutoff/idempotensi. |
| SIM-13 | Custom Print punya pembayaran order dan ongkir akhir; ada refund sebagian tak terduga/settlement terlambat | Alokasi per charge terverifikasi, tanpa menghitung retry dua kali. Partial/late menjadi exception; hak penuh/expense diselesaikan, order batal tidak dibuka dan stok tidak otomatis ditambah. | COVERED_DOCUMENT; ledger/reconciliation dan skenario multi-payment diperlukan. |
| SIM-14 | Akun ditutup ketika order, kasus privasi atau refund masih aktif | Closure tetap mencabut akses/token, melepas FK dan mempertahankan marker. Kontak terverifikasi minimum/kasus keuangan menyelesaikan kewajiban; akun baru tidak mengambil riwayat lewat email. | COVERED_DOCUMENT; baseline closure Development ada, refund/hosted/race lintas job belum diimplementasikan. |
| SIM-15 | Permintaan akses diterima Jumat 16.00 WIB, status berubah pada Minggu | Due akses tetap Senin 16.00 WIB (+72 jam), termasuk libur bila ada; bukan tambahan tiga hari kerja. Penerimaan awal dari kanal resmi dipertahankan, menunggu verifikasi tidak reset jam. | COVERED_DOCUMENT; coverage/monitoring kalender PUB-JOBS/PUB-SERVICE belum dibuktikan. |
| SIM-16 | Kasus selesai 1 Oktober; hold lewat hingga 5 November | Due isi 8 Oktober dan receipt 31 Oktober tidak berubah. Saat hold berakhir tanpa perpanjangan sah, purge overdue segera eligible; bukan +7/+30 hari lagi. Bukti finansial wajib tetap terpisah. | COVERED_DOCUMENT; rule privacy lokal ada, kasus refund/eksternal dan arsip masih target. |
| SIM-17 | Job cleanup gagal/database offline, sementara signup dimatikan | Deadline asli/overdue terlihat, alert ke petugas dan retry scope gagal; cleanup tetap independen signup. Tidak menjanjikan data telah terhapus atau maksimum lag tanpa bukti. | COVERED_DOCUMENT; PUB-JOBS membutuhkan hosted scheduler, lag limit, petugas dan fault exercise. |
| SIM-18 | Restore backup lama memuat akun/proof/refund/outbox yang sudah selesai | Terapkan closure/revocation/hold/due terbaru sebelum traffic; purge dan rekonsiliasi agar tidak menghidupkan akun/claim atau mengirim uang/token lama. | COVERED_DOCUMENT; PUB-BACKUP/PUB-STAGING membutuhkan latihan nyata dan sumber state mutakhir. |
| SIM-19 | Draf v3 berubah; register Google/password melihat policy; ordinary Admin/anon mencoba preview | Draft/internal bukan consent komersial. Public gate tetap tertutup. Preview Owner memakai versi v3; denial memakai penanda versi umum agar tidak lolos palsu saat draft berganti. | COVERED_DOCUMENT; regresi preview/denial relevan batch ini, public consent masih NOT_IMPLEMENTED. |
| SIM-20 | Email proof gagal/expired atau resend setelah closure | Tidak mengotorisasi aksi tanpa delivery yang sah; lifetime proof tidak diperpanjang retry. Pesan bisnis pasca-closure terpisah, tidak memulihkan sesi. | COVERED_DOCUMENT; baseline proof tersedia Development, outbox hosted/expiry dan inbox belum dibuktikan. |
| SIM-21 | Akun Google anak supervised/izin provider ditolak; wali memakai Family Link | Matriks metode memeriksa akun supervised dan provider denied tanpa membuat identitas wali menjadi identitas anak. Kontrol pembelian Google Play tidak menggantikan consent/pembayaran Niuva. | COVERED_DOCUMENT; kebutuhan ditambahkan dari sumber resmi, belum diuji terhadap akun/provider nyata. |

## Pemeriksaan checkout

Tabel berikut merekam **hasil batch awal**, sebelum jawaban Owner dan
pembaruan input/bukti lanjutan 3 Oktober. Hasil pembaruan ada di bagian handoff.

| Pemeriksaan | Hasil pada batch ini | Batas |
| --- | --- | --- |
| Link/anchor lokal, referensi gate, inventory dan whitespace baru | 143 link/anchor valid, 18 gate terdefinisi, 9 dokumen legal terindeks; tidak ada error | Audit script read-only sementara; authority lama mempunyai Markdown hard breaks yang tidak diubah. |
| Simulasi dokumen | 20 skenario awal COVERED_DOCUMENT; SIM-21 ditambahkan pada pembaruan berikutnya | Bukan pengujian legal, wali, refund provider atau recovery yang berjalan. |
| Backend terarah | 4 file, 21 tes lulus | Owner preview v3, permission, privacy/auth/email boundary yang sudah ada; mocking bukan bukti provider/hosted. |
| Unit terarah | 4 file, 16 tes lulus | Auth core/email/Google/privacy core; tidak menguji implementasi usia/wali/refund baru karena belum ada. |
| Prisma client / route types / TypeScript strict | Generate client 7.10.0, Next typegen dan tsc non-incremental lulus | Bukan Prisma validation atau migrasi schema baru. |
| ESLint | 0 error, 147 warning pada file yang tidak berubah | Warning existing terutama script skill desain dan variabel shipping; scope paket tidak memperbaikinya. |
| Chromium E2E terarah | 1 tes lulus pada test loopback port 3039, Turbopack dengan cache baru | Menguji pemulihan pending form dan penolakan preview Owner bagi Customer. Tidak menjalankan seluruh suite E2E. |
| Git diff check / scope | Lulus; perubahan hanya 11 dokumen dan 2 ekspektasi tes | Tidak ada perubahan source runtime, schema/migration, dependency, env, workflow atau konfigurasi proyek akhir. |

Perintah `corepack pnpm lint` dan launcher `test:backend` awal gagal karena shim `eslint`/`vitest` tidak ditemukan; prehook Prisma generate berhasil. Gate terkait lalu dijalankan melalui entrypoint Node dependency yang sudah terpasang, tanpa install atau bypass assertion. TypeScript dijalankan setelah Prisma generate dan Next typegen.

Smoke E2E awal pada cache `.next-e2e` lama tersendat error Turbopack junction Windows (`Access is denied`). Dua percobaan Webpack sementara gagal di assertion pending form yang tidak diubah, sebelum mencapai assertion preview. Run akhir menggunakan Turbopack dengan dist baru `.next-e2e/policy-turbo-20261003` dan konfigurasi sementara di TEMP, lalu **1 passed**. Config sementara mengimpor config proyek, memakai database test loopback/mocks, origin port 3039, direct Next CLI dan resource cache terpisah; assertion tes tidak dilemahkan. Hasil Webpack tersebut tetap failure percobaan, tidak dinyatakan lulus. Source runtime/config proyek tidak diperbaiki melalui batch dokumentasi ini.

```powershell
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js
node node_modules/vitest/vitest.mjs run --config vitest.backend.config.mts tests/backend/customer-privacy-pages.test.ts tests/backend/customer-privacy-routes.test.ts tests/backend/customer-auth-routes.test.ts tests/backend/customer-email-routes.test.ts
node node_modules/vitest/vitest.mjs run tests/unit/customer-auth-core.test.ts tests/unit/customer-email-auth.test.ts tests/unit/customer-auth-google.test.ts tests/unit/customer-privacy-core.test.ts
$env:NIUVA_E2E_PORT = '3039'
$taskTurboConfig = Join-Path $env:TEMP 'niuva-policy-turbo-20261003.config.ts'
node node_modules/@playwright/test/cli.js test --config $taskTurboConfig customer-privacy.spec.ts --grep 'pending restores after navigation and Owner privacy never becomes public'
git diff --check
```

Database test lokal dimulai dan menggunakan migrasi/seed test yang sudah ada untuk E2E; database Development/production tidak dipakai sebagai fixture. Next menambahkan include tipe cache sementara ke tsconfig, lalu perubahan otomatis itu dikembalikan secara sempit setelah tes. Script audit dan config runner sementara bukan dependency/konfigurasi runtime baru dan tidak memuat nilai credential di dokumentasi/Git.

Integration penuh, Prisma validation, seluruh unit/backend/E2E dan production build tidak dijalankan ulang untuk batch dokumen ini. Batch kode berikutnya tetap wajib **seluruh lint/typecheck/unit/backend/integration/Prisma/E2E/build** dan regresi dalam kontrak. Hasil CI baseline PR #38 tidak dianggap hasil CI perubahan yang belum di-commit ini. Pemeriksaan dokumen dan tes terarah tidak menutup gate legal/Owner/provider atau menghasilkan penerimaan visual/device/AT.

## Handoff dan batas penerimaan

**Pembaruan input Owner 3 Oktober:** Rheza sebagai petugas utama dan alamat
Bandung sebagai alamat retur sudah dicatat pada policy/SOP/PRD. Detail
penerima/jam, pengganti/coverage serta bukti hosted tetap terbuka. Review
internal berbasis sumber resmi dipakai untuk menyiapkan keputusan; perekrutan
konsultan formal tidak menjadi gate mulai kode. [Catatan input/bukti](customer-public-input-evidence.md)
memuat presence lokal terbaru, requirement Google supervised dan kebutuhan
merchant/provider/backup. Simulasi kini 21 skenario dokumen; hasil pengujian
batch awal dalam tabel di atas tetap hasil fase tersebut, bukan pengujian
ulang seluruh suite atas pembaruan input ini.

Verifikasi pembaruan: **158 link/anchor lokal valid, 18 gate terdefinisi,
10 dokumen legal terindeks dan 21 skenario dokumen**; tidak ada error audit.
`git diff --check` lulus. Tes preview/permission Owner diulang dengan
`node node_modules/vitest/vitest.mjs run --config vitest.backend.config.mts tests/backend/customer-privacy-pages.test.ts`:
**1 file, 3 tes lulus**. Pemeriksaan konfigurasi hanya mengeluarkan jumlah
field terisi dan scope loopback, tanpa nilai secret atau request provider.
Tidak ada perubahan kode runtime, schema, permission, env atau konfigurasi
proyek melalui penugasan Rheza dan pembaruan dokumen ini. Lint/typecheck,
integration, E2E dan build tidak diulang untuk pembaruan dokumen lanjutan.

Paket siap diajukan untuk review Owner/legal berdasarkan konsistensi dokumen dan regresi terarah di atas. Yang masih diperlukan: keputusan kelayakan/metode anak-wali, fakta bisnis/kalender/petugas/alamat retur, register data/provider/arsip/backup, capability/pendanaan refund per metode, lalu implementasi dan staging/recovery. Semua pemilik/bukti/syarat penutupan ada di matriks; tidak mengisi unknown dengan klaim kemampuan yang belum ada.

Tidak ada policy resmi/tanggal berlaku final, signup publik, refund otomatis, schema/endpoint baru, deployment, aktivasi provider, penggunaan credential production atau penerimaan visual/device/AT melalui pemeriksaan batch ini. Rollback draf memakai versi Git sebelumnya; transaksi/closure/refund yang nyata tidak diuji dengan destructive cleanup.
