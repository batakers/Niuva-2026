# Batas Kesiapan Production: niuva-audit-remediation

Dokumen ini dibuat oleh task 23.7 dan diperbarui pada Tahap 12 (5 Oktober 2026; Req 32.1 sampai 32.4). Ini dokumen batas, bukan klaim kesiapan. Hasil checkpoint penutupan dirujuk dari `baseline-gate.md`.

**Pernyataan utama:**

- Tidak ada klaim kesiapan production, staging, atau hosted di spec ini.
- `PUB-RELEASE` tetap `NOT_AUTHORIZED`.
- Semua bukti di repository ini bersifat lokal, loopback, dan non-production.
- Hasil CI dan hasil gate lokal yang hijau bukan bukti lingkungan, bukan penerimaan visual, dan bukan penerimaan perangkat fisik atau assistive technology.

Dokumen ini merujuk keputusan teknis eksplisit dari handoff Owner di `register-keputusan.md`, tanpa memilih keputusan legal/bisnis baru atau mengubah `docs/` milik Owner. Rujukan lain: `env-register.md` bagian 6.5, `render-strategy.md`, `baseline-gate.md`, `tasks.md` (Overview).

## 1. Yang terverifikasi (lokal, loopback, non-production)

### 1.1 Angka gate terkini

Angka berikut adalah hasil checkpoint penutupan Tahap 12 (task 30); catatan historis task 23.7/25 tetap tersedia di `baseline-gate.md`. Bukti stabilitas, seluruh kegagalan awal dan pengulangan database test baru/production lokal, serta cleanup dicatat terpisah di sana (bagian 11 sampai 15). Tidak ada credential production atau provider nyata yang diaktifkan.

| Gate | Hasil terkini |
| --- | --- |
| `lint` | PASS, 0 error, 0 warning |
| `typecheck`, `db:validate` | PASS; typecheck ulang setelah cleanup PASS |
| `test` | PASS, 85 file / 1190 test |
| `test:backend` | PASS, 68 file / 496 test |
| `test:integration` | PASS, 19 file / 105 test |
| `test:e2e` | 109 lulus, 5 dilewati (skip) |
| E2E production pada `next start` loopback port 3101 | 5/5 PASS, tanpa skip |
| Fresh database: 17 migrasi dari kosong, integration, E2E penuh | PASS, 19/105 dan 109 lulus/5 skip/0 gagal; exit suite/peluncur 0 |
| `build` | PASS, 68 entri halaman; empat slug layanan ISR 300 |

Catatan:

- 5 test E2E yang dilewati tidak dihitung sebagai bukti apa pun.
- `build` adalah bukti kompilasi, bukan penerimaan visual atau kesiapan production (Req 5.10).
- Shim `node_modules/.bin` kini dapat menjalankan gate lewat `corepack pnpm`; masalah shim di `baseline-gate.md` bagian 5 adalah snapshot historis.

### 1.2 Apa yang dibuktikan hasil tersebut

- Perilaku code pada database test lokal dan mock lokal (`NIUVA_CUSTOMER_AUTH_MOCK`, Clerk/R2 dikosongkan untuk E2E).
- Replay 17 migrasi pada database lokal baru `niuva_stage12_test_20261005_01a10ad2` berhasil dari kosong; integration dan E2E penuh sesudahnya lulus (`baseline-gate.md` bagian 12/15, task 27.2). Bukti task 3.11 tetap historis di bagian 9.4. Ini bukti lokal, bukan migration/deployment production.
- Pembandingan render hasil `build` terhadap `render-strategy.md`: selisih `/services/[slug]` ditutup oleh RK-16 dan task 26.3. Empat slug menjadi SSG/ISR 300 detik (5m di build dan manifest), dengan fallback saat database gagal.
- Coverage V8 4.1.11 pada ketiga config mengukur masing-masing 360 file sumber dan mengecualikan generated. Baseline dan usulan threshold di bawah baseline ada di `baseline-gate.md` bagian 10; persentase tidak membuktikan ketepatan semua cabang atau kesiapan production.
- Header/CSP enam route dibuktikan pada build/`next start` aktual. Perilaku cache `/projects` dan detail berubah setelah kedua aksi portfolio, sesudah write database langsung terbukti tetap stale. Identitas Owner pada smoke cache hanya constructor DI harness lokal; Clerk HTTP/session tetap tidak terverifikasi. Dist, dua include tsconfig, listener, dan proses milik peluncur dibersihkan; data test dan coverage retained (baseline bagian 13/15).
- Fail-closed berjalan di code untuk capability yang bergantung pada keputusan yang belum tertutup (mis. `getAgeGateStatus()` tetap `DECISION_PENDING`, `decide("signup")` menolak dengan `AGE_GATE_NOT_CLOSED`).

## 2. Yang TIDAK terverifikasi

Daftar ini tidak lengkap sebagai jaminan. Apa pun yang tidak tercantum di bagian 1 berstatus tidak terverifikasi.

| Area | Status | Alasan / bukti yang dibutuhkan | Rujukan |
| --- | --- | --- | --- |
| Provider (Google, Resend, Clerk, R2, Midtrans, Biteship) | Tidak terverifikasi | E2E memakai mock lokal. Butuh bukti per provider (kontrak/DPA, lokasi, subprocessor, sandbox) dari lingkungan nyata | RK-21, `PUB-PROVIDER` |
| Inbox email dan domain pengirim | Tidak terverifikasi | Tidak ada pengiriman nyata. Butuh bukti inbox | RK-24, `PUB-EMAIL` |
| Object storage R2 dan akses bertanda tangan | Tidak terverifikasi di lingkungan nyata | Butuh bucket terpisah dan bukti akses | `PUB-STAGING`, `env-register.md` 6.4 |
| Backup, penghapusan, dan pemulihan | Tidak terverifikasi | Butuh latihan pemulihan nyata | RK-22, `PUB-BACKUP` |
| Isolasi resource staging dari production | Tidak terverifikasi | Bukti lingkungan dari host (database, bucket, key provider, `APP_URL`, callback, `NIUVA_DEPLOYMENT_TIER`). CI hanya memakai PostgreSQL ephemeral tanpa credential provider. Status: `unverified` | RK-23, `env-register.md` 6.5 |
| Staging terpadu | Tidak ada | Belum ada proyek staging terpisah dengan skenario lulus | RK-23, `PUB-STAGING` |
| Rate limit multi-instance | Tidak terverifikasi, tidak dijamin | Store rate limit bersifat per proses (in-memory). Berperilaku benar hanya untuk satu instance | RK-11, AG-5.15 |
| Penerimaan visual | **Belum ditinjau** | Tidak ada pernyataan penerimaan eksplisit dari user. Lulus test/build bukan persetujuan visual | Req 32.2, `AGENTS.md` |
| Physical-device | Tidak terverifikasi | Terpisah dari `test:e2e`. Chromium di mesin lokal bukan perangkat fisik | Req 32.3 |
| Assistive technology (pembaca layar, dll.) | Tidak terverifikasi | Terpisah dari `test:e2e` dan dari pemeriksaan otomatis mana pun | Req 32.3 |
| Pemantauan error eksternal | Tidak ada | SDK ditunda sampai mendekati staging. Env Sentry tidak punya konsumen (`UNUSED_PENDING_APPROVAL`); logger/FailureEvent lokal tidak membuktikan pemantauan eksternal | AG-3.14, `env-register.md` bagian 2 |
| Cakupan seluruh cabang sumber | Tidak lengkap | Coverage sudah diukur; sejumlah cabang belum teruji. Tidak ada threshold di atas baseline atau pengecualian modul untuk menaikkan angka | AG-1.10, `coverage-gaps.md`, `baseline-gate.md` bagian 10 |
| CSP dengan Clerk aktif | Tidak terverifikasi | RK-10 memutuskan model hibrida: nonce pada cakupan admin/API admin/checkout/account, CSP statis pada publik ber-cache. Tanpa Clerk, `/admin` hanya membuktikan jalur 503 statis. Tidak ada perluasan nonce/SRI | RK-10, 26.1, `csp-verification.md` |
| Kesiapan hukum dan kebijakan (dokumen resmi, usia, wali, retensi, data, SLA) | Tidak tertutup | Semua entri `BELUM_TERTUTUP` | `register-keputusan.md` bagian A sampai C |

## 3. Lima risiko tersisa yang diterima

User menyetujui "Pilihan 1 (Ringkas)" (Overview `tasks.md`). Kapabilitas berikut tidak dikerjakan di spec ini. Risikonya diterima, bukan dihilangkan.

| No | Risiko | Dampak | Status |
| --- | --- | --- | --- |
| 1 | Email Customer tanpa jaminan kirim ulang | Tidak ada outbox durable. Email verifikasi atau proof privasi yang gagal terkirim tidak dijamin terkirim ulang | Tahap 6 di luar ruang lingkup. RK-24 |
| 2 | Belum ada job terjadwal untuk retensi berkas, pelepasan stok kedaluwarsa, dan rekonsiliasi pembayaran | Retensi berkas, pelepasan stok, dan rekonsiliasi pembayaran tidak berjalan otomatis dan tidak ada monitoring lag. Butuh cron di `vercel.json` | Tahap 7 di luar ruang lingkup. RK-25 |
| 3 | Belum ada alur refund | Aplikasi tidak mengajukan, menyetujui, atau mengirim refund. Ruang lingkup dan cakupan metode pembayaran belum diputuskan | Tahap 8 di luar ruang lingkup. RK-04, RK-07, RK-26 |
| 4 | Funnel checkout membutuhkan JavaScript | Checkout tidak berfungsi tanpa JavaScript. Guest checkout tidak dipulihkan | Tahap 9 sebagian di luar ruang lingkup. RK-13 |
| 5 | Belum ada halaman audit admin | Tidak ada halaman audit dan tidak ada pengelolaan akses admin lewat aplikasi | Tahap 8 di luar ruang lingkup. RK-27, RK-09 |

Risiko ini juga wajib muncul di laporan penyelesaian (task 24.1).

## 4. Gate dan approval yang tertahan

Approval 1.10 dan 7.27 sudah diberikan melalui handoff Tahap 12 dan dieksekusi melalui task aslinya. Keputusan RK-10, RK-14, RK-16 tertutup; keputusan ini tidak membuka capability/provider atau izin rilis. Item berikut ditunda atau dicatat dengan batas pelaksanaan eksplisit.

| Gate | Jenis | Yang menunggu | Dampak selama tertahan | Rujukan |
| --- | --- | --- | --- | --- |
| 1.10 | Disetujui, selesai | Paket dev 4.1.11 sama dengan Vitest | Coverage tiga config dan baseline terukur; threshold hanya diusulkan di bawah baseline | AG-1.10 |
| 3.14 | Ditunda | Buka spec terpisah mendekati staging: vendor/paket, biaya, pemrosesan data, retensi, redaksi PII dan approval tertulis | Tidak ada pengiriman kegagalan ke layanan eksternal | AG-3.14 |
| 5.15 | Ditunda | Buka spec terpisah setelah hosting/topologi instance dipilih dan opsi store/biaya/skema disetujui; RK-11 tetap terbuka | Rate limit tetap per proses | AG-5.15, RK-11 |
| 7.13 | Ditunda | Bukti capability/provider di staging terisolasi, tidak ada pemanggil tersisa, dan approval penghapusan path sebelum spec terpisah dikerjakan | `assertNonProductionProvider` dan berkas guard lama tetap ada | AG-7.13 |
| 7.25 | Keputusan saja, melalui 26.1 | Pertahankan model hibrida (RK-10 tertutup) | Tidak ada perluasan nonce ke publik atau aktivasi SRI | RK-10 |
| 7.27 | Disetujui, selesai | Sembilan nama runtime baru dari register ditambahkan kosong ke `.env.example` | Tidak menyalin nilai env privat; tidak mengaktifkan provider | AG-7.27 |

21.23 ditunda sesuai keputusan RK-14: cache ongkir tidak diperlukan sekarang. Buka spec terpisah setelah provider aktif dan tersedia data kuota/latensi; tidak memilih TTL atau mengurangi revalidasi ongkir server. RK-01 sampai RK-09 dan RK-19 sampai RK-28 tetap `BELUM_TERTUTUP`.

## 5. `PUB-RELEASE` tetap `NOT_AUTHORIZED`

`PUB-RELEASE` = `NOT_AUTHORIZED` (RK-28). Status ini menahan empat tindakan, masing-masing butuh instruksi terpisah dari Owner:

1. publikasi policy;
2. deployment;
3. aktivasi provider;
4. penggunaan credential production.

Instruksi untuk satu tindakan tidak berlaku untuk tindakan lain. Penutupan satu entri register tidak mengaktifkan capability. `ACTIVATION_GRANTS` per tier kosong, dan `NIUVA_PROVIDER_MODE=live` tidak membuka apa pun (`env-register.md` bagian 3.5).

## 6. Bukti lingkungan yang dibutuhkan per gate `PUB-*`

Hasil CI tidak menggantikan bukti ini (Req 32.1). Pemilik mengikuti `register-keputusan.md`.

| Gate | Bukti yang dibutuhkan | Pemilik | Entri |
| --- | --- | --- | --- |
| `PUB-PROVIDER` | Kontrak/DPA, lokasi dan subprocessor, kategori data, transfer, akses/penghapusan, kanal bantuan tiap provider | Owner + Rheza (koordinasi privasi) + engineering | RK-21 |
| `PUB-EMAIL` | Outbox, expiry/retry, rate limit, bukti inbox | Engineering + penanggung jawab layanan | RK-24 |
| `PUB-BACKUP` | Jadwal dan expiry, enkripsi, akses, purge provider, replay closure/holds saat restore, latihan pemulihan | Owner + engineering + privasi | RK-22 |
| `PUB-STAGING` | Proyek staging terpisah, OAuth, inbox, sandbox payment/webhook, R2, backup/restore, SOP, isolasi resource dari production | Engineering + Owner + petugas operasi | RK-23 |
| `PUB-JOBS` | Jadwal hosted, monitoring lag/last success, alarm, petugas, batas lag | Engineering + privasi + layanan; persetujuan user untuk `vercel.json` | RK-25 |
| `PUB-POLICY`, `PUB-AGE`, `PUB-GUARDIAN`, `PUB-DATA`, `PUB-RECORDS`, `PUB-BIZ` | Lihat `register-keputusan.md` RK-01 sampai RK-05, RK-19, RK-20 | Owner, legal, akuntansi | RK-01 sampai RK-05, RK-19, RK-20 |
| `PUB-SERVICE` | Kalender kerja WIB, hari libur, petugas pengganti, coverage. Tanpa itu tenggat SLA hari kerja "belum ditetapkan" (Req 31.4) | Owner | RK-06 |
| `PUB-REFUND`, `PUB-REFUND-PROVIDER`, `PUB-REFUND-RECON` | Ruang lingkup, cakupan metode, rekonsiliasi | Owner + operasi pembayaran + engineering | RK-04, RK-07, RK-26 |
| `PUB-INCIDENT` | Kanal hak privasi dan respons insiden, dengan pemilik dan tenggat | Owner + privasi + legal | RK-15 |
| `PUB-RELEASE` | Semua gate tertutup, persetujuan final, konfigurasi produksi, monitoring/rollback, instruksi rilis | Owner | RK-28 |

Bukti isolasi staging dari production (database, bucket R2, key provider, `APP_URL`, callback, `NIUVA_DEPLOYMENT_TIER`, tidak ada secret production di staging) adalah bukti lingkungan dari host (`env-register.md` bagian 6.5).

## 7. Cara membaca dokumen ini

- "Terverifikasi" berarti diukur atau dijalankan secara lokal di loopback non-production. Artinya bukan "siap production".
- Penerimaan visual, physical-device, dan assistive technology dilaporkan terpisah dan tetap "belum ditinjau" atau "tidak terverifikasi" sampai user atau pemilik lingkungan menyatakannya.
- Dokumen ini diperbarui hanya ketika bukti baru masuk atau keputusan ditutup oleh pemilik yang menyebut ID entri.
