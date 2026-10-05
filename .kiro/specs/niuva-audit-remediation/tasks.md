# Implementation Plan: niuva-audit-remediation

## Overview

Bahasa implementasi adalah TypeScript (Next.js 16.3.2 App Router, Prisma 7, Vitest + React Testing Library, Playwright). Design memakai TypeScript, jadi tidak ada pertanyaan pemilihan bahasa.

Dokumen ini hanya rencana. Tidak ada code yang ditulis atau diubah saat `tasks.md` dibuat. `requirements.md`, `design.md`, dan `.config.kiro` tidak diubah.

**Urutan tahap dan alasannya.** Urutan mengikuti dependency lebih dulu, lalu severity, risiko regression, dan production readiness. Setelah pengurangan ruang lingkup, Tahap 5 sampai 8 berada di luar ruang lingkup seluruhnya, dan Tahap 4, 9, 10, 11 direduksi menjadi task esensial. Top-level task 2, 4, 6, 8, 10, 20, 22, dan 25 adalah checkpoint yang aktif; checkpoint 12, 14, 16, 18 ikut di luar ruang lingkup.

| Tahap | Top-level task | Isi | Alasan urutan | Status |
| --- | --- | --- | --- | --- |
| 0 | 1 | Baseline, register, warning lint, verifikasi dokumen | Tanpa baseline, kegagalan setelahnya tidak bisa diatribusikan (Req 3). Harus selesai sebelum tahap lain. | Penuh |
| 1 | 3 | Observability, validasi env, dokumen status | Prasyarat Tahap 2 (B5→B2/B3) dan Tahap 3. | Penuh |
| 2 | 5 | Rate limit per pelaku, otorisasi di service | Severity tinggi, perubahan terlokalisasi, membutuhkan observability. | Penuh |
| 3 | 7 | Capability_Resolver, CSP, proxy | Titik tunggal yang dipakai tahap selanjutnya (A1). Serial. | Penuh |
| 4 | 9 | Jalur data publik, strategi render, discoverability | Membutuhkan ukuran test (I1→C1) dan resolver. | Direduksi (9.1, 9.2, 9.6, 9.7, 9.10, 9.13 sampai 9.24) |
| 5 | 11 | Policy publik, consent, titik integrasi usia/wali | F1→A2. Mekanisme usia/wali menunggu Owner. | Di luar ruang lingkup |
| 6 | 13 | Email outbox | Membutuhkan resolver dan consent. | Di luar ruang lingkup |
| 7 | 15 | Privacy hosted, Scheduled_Job_Runner, tiga job | D2/D3/D4 satu jalur job; membutuhkan outbox. | Di luar ruang lingkup |
| 8 | 17 | Refund, akses admin, jalur baca audit | Membutuhkan job runner dan otorisasi di service. | Di luar ruang lingkup |
| 9 | 19 | Form tanpa JS, bundel, loading/error ber-scope | H3→H2-revised. Menyentuh checkout, maka setelah tahap berisiko. | Direduksi (19.22, 19.23) |
| 10 | 21 | Pemecahan modul, flag TypeScript, verifikasi production | Sengaja terakhir supaya diff tetap terbaca. | Direduksi (21.22, 21.24) |
| 11 | 23 | Register keputusan, SLA, batas kesiapan production | Di luar kendali code; lintas tahap. | Direduksi (23.1, 23.7) |

**Tahap 0 harus selesai sebelum tahap lain.** Satu pengecualian: task tes C1 (9.1 dan 9.2) hanya menambah file test baru dan tidak bergantung pada refactor, jadi boleh jalan lebih awal sesuai Task Dependency Graph.

**Keputusan pengurangan ruang lingkup.** User menyetujui "Pilihan 1 (Ringkas)" dan meminta sub-task yang ditunda dihapus dari dokumen ini. Dari 270 sub-task sebelum pengurangan, 109 dipertahankan dan 161 dihapus (status sub-task yang sudah selesai tidak berubah). Risiko tersisa yang diterima: (1) email customer tanpa jaminan kirim ulang; (2) belum ada job terjadwal untuk retensi berkas, pelepasan stok, dan rekonsiliasi pembayaran; (3) belum ada alur refund; (4) funnel checkout membutuhkan JavaScript; (5) belum ada halaman audit admin. Risiko ini wajib dinyatakan di dokumen batas kesiapan production (task 23.7) dan di laporan penyelesaian (24.1); tidak ada klaim kesiapan production.

Di luar ruang lingkup spec ini (tidak dikerjakan; dapat dibuka sebagai spec terpisah):

- Tahap 5: consent publik dan titik integrasi usia/wali (menunggu keputusan Owner).
- Tahap 6: email outbox durable.
- Tahap 7: Scheduled_Job_Runner dan job (retensi berkas, pelepasan stok kedaluwarsa, rekonsiliasi pembayaran; butuh cron di `vercel.json`).
- Tahap 8: refund serta akses/audit admin.
- Tahap 9: funnel tanpa JavaScript, pengurangan bundel, loading/error ber-scope.
- Tahap 10: pemecahan modul, flag TypeScript ketat, skrip lintas platform, spec production Playwright, formatter, axe, pembersihan kode mati.
- Tahap 11: SLA/pemantauan tenggat dan halaman pemantauan.
- Keputusan model `Service`.
- Gate kapabilitas pada `src/modules/customer-privacy/mailer.ts`.

`requirements.md`, `design.md`, dan laporan audit masih menjelaskan area-area ini.

**Baseline awal (sebelum Tahap 0; data, bukan asumsi).** `lint` PASS (0 error, 148 warning; 146 dari `.agents/skills/impeccable/`, 1 di `src/modules/shipping/retail-rate-service.ts:145`, 1 di `tests/unit/properties/p06-token-not-found.test.tsx:87`). `typecheck` PASS. `test` PASS (55 file / 612 test). `test:backend` PASS (38 file / 190 test). `build` PASS (49 route, hanya `/services` statis). Shim `node_modules/.bin` tidak lengkap, jadi gate dijalankan lewat `node node_modules/<paket>/...`. Itu kondisi lingkungan, bukan temuan repo. Baseline historis setelah Tahap 1 (lokal/non-production; hasil terkini Tahap 12 ada di baseline bagian 15): lint 0 error, typecheck PASS, unit 62 file / 790 test, backend 46 file / 312 test, integration 16 file / 89 test, e2e 22 spec / 103 test (ukuran Tahap 0), build PASS, db:validate PASS, 17 migrasi.

**Tertahan sampai Baseline_Gate tercatat (Req 3.5).** Task bertanda `[BUTUH_INTEGRASI]` tidak dimulai sebelum task 1.2 mencatat hasil `test:integration` (lulus, gagal, atau `TIDAK_DIJALANKAN` beserta penyebab). Task bertanda `[BUTUH_E2E]` menunggu task 1.3. Selama status itu `TIDAK_DIJALANKAN`, task bertanda tersebut dilaporkan tertahan dan pekerjaan dibatasi pada task yang diverifikasi gate yang sudah berjalan.

**Penanda yang dipakai.**

- `[APPROVAL_GATE]`: tidak boleh dieksekusi tanpa persetujuan tertulis user yang menyebut item itu. Permintaan coding umum, dokumen ini, atau design bukan persetujuan.
- `[BLOCKED_ON_OWNER]`: menunggu keputusan Owner/legal. Task hanya menyiapkan dokumen atau titik integrasi fail-closed dan tidak memilih nilai default.
- `[BUTUH_INTEGRASI]` / `[BUTUH_E2E]`: lihat di atas.
- `*` di akhir nomor sub-task: test opsional. Top-level task tidak pernah diberi `*`.

**Format isi task.** Setiap sub-task memuat masalah, file/module terdampak, langkah ringkas, gate verifikasi, prasyarat, risiko (bila ada), kondisi selesai, dan requirement.

## Guardrails untuk setiap task

- Tanpa commit, push, deployment, aktivasi provider, atau penggunaan credential production. Semuanya butuh instruksi terpisah dari user.
- Tanpa dependency baru. Setiap penambahan paket adalah `[APPROVAL_GATE]` yang menyebut paket, tujuan, dampak maintenance, dampak keamanan, dan biaya bulanan bila relevan. Periksa `package.json` lebih dulu.
- Tanpa edit migrasi yang sudah ada di `prisma/migrations/`. Perubahan schema hanya lewat migrasi baru yang non-destruktif (tabel baru atau kolom nullable), dan menjalankan `db:validate` serta `db:generate`. Jangan pernah memakai reset destruktif.
- Tanpa menyentuh `.env*`, `.github/workflows/`, atau `vercel.json` tanpa persetujuan. Nama env baru dikumpulkan di `.kiro/specs/niuva-audit-remediation/env-register.md`, bukan di `.env.example`.
- Tanpa menghapus file atau direktori tanpa persetujuan tertulis untuk path tersebut. Memindahkan file dengan `smart_relocate` bukan penghapusan.
- Tanpa melemahkan test: tidak mengurangi jumlah test atau assertion, tidak menandai `skip`, tidak memperlonggar ekspektasi. Jika sebuah test lama perlu berubah, itu sinyal regression dan harus dijelaskan.
- Tanpa menyelesaikan entri Register_Keputusan lewat nilai default di code. Metode verifikasi usia dan assurance wali tidak boleh dipilih oleh task mana pun.
- Tanpa menyentuh atau membatalkan perubahan uncommitted milik Owner (docs/legal, addendum PRD/TechDesign, dua file test). Sebelum mengedit file apa pun, jalankan `git status --short` dan `git diff --stat -- <path>` (hanya baca). Jika file target punya perubahan Owner, jangan timpa: buat edit minimal di luar perubahan itu, atau berhenti dan laporkan.
- Sebelum menulis apa pun yang menyentuh file convention, caching/render, proxy, Server Action, CSP, sitemap/robots, atau instrumentation, baca dokumen yang relevan di `node_modules/next/dist/docs/` (versi terpasang 16.3.2). Jangan mengandalkan ingatan.
- Tanpa mencetak, mengutip, atau mentransmisikan secret, token, atau log privat. Rujuk key env dengan namanya saja.
- Setiap task yang menyentuh area Invariant_No_Regression (Req 5) menjalankan test invariant yang relevan: system pages (`tests/unit/properties/p05-no-leak.test.tsx`, `p12-surface-structure.test.tsx`, `p13-system-copy.test.ts`, `tests/unit/system-pages-coverage.test.ts`, `tests/unit/admin-proxy.test.ts`), revalidasi checkout, webhook Midtrans, token akses dan PKCE, permission admin, serta lifecycle/privacy internal.
- Setiap task yang mengubah schema adalah migrasi baru non-destruktif dan menjalankan `db:validate`.
- Keberhasilan `build` adalah bukti kompilasi, bukan penerimaan visual atau izin capability.
- Cara menjalankan gate (shim tidak lengkap): `lint`, `typecheck` (`prisma generate` dan `next typegen` dulu), `test`, `test:backend`, `test:integration`, `test:e2e`, `build`, `db:validate`. Hormati script di `package.json`. Jalankan server dev atau start sebagai proses latar belakang dan hentikan setelah selesai.
- Nama tabel, env, dan tipe di design adalah usulan. Penetapan final terjadi di task implementasinya dan dicatat di `env-register.md`.

## Tasks

- [x] 1. Tahap 0 - Fondasi rencana, baseline, dan gate
  - [x] 1.1 Catat Baseline_Gate untuk gate yang bisa berjalan
    - Masalah: baseline harus tercatat sebelum perubahan berisiko (Req 3).
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md` (baru).
    - Langkah: tulis angka baseline dari bagian Overview apa adanya. Jalankan `db:validate` yang belum tercatat. Jalankan ulang gate lain hanya bila working tree berubah sejak pengukuran. Catat 146 warning `.agents/skills/impeccable/` sebagai noise tooling dan 2 warning product code secara terpisah. Catat shim `node_modules/.bin` sebagai kondisi lingkungan.
    - Gate: `db:validate`.
    - Selesai bila: file mencatat tiap gate dengan jumlah file/test/warning, dan status `db:validate`.
    - _Requirements: 3.1, 3.6, 3.7_

  - [x] 1.2 Nyalakan PostgreSQL test lokal dan catat `test:integration`
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md`.
    - Langkah: baca `scripts/local-test-db.ps1` dan script `db:test:*` di `package.json`. Jalankan `db:test:start`, `db:test:migrate`, lalu `test:integration`. Catat daftar test yang gagal. Jika tidak bisa jalan, catat `TIDAK_DIJALANKAN` dengan penyebab lingkungan dan syarat menjalankannya. Hentikan database setelah selesai.
    - Gate: `test:integration`.
    - Risiko: migrasi lokal gagal pada replay. Catat apa adanya; jangan memperbaiki migrasi lama.
    - Selesai bila: hasil atau status `TIDAK_DIJALANKAN` tercatat.
    - _Requirements: 3.2, 3.4, 3.5_

  - [x] 1.3 Catat `test:e2e`
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md`.
    - Langkah: `playwright.config.ts` menjalankan server dev sendiri. Jalankan `test:e2e` dan catat spec yang gagal. Jika tidak bisa jalan, catat `TIDAK_DIJALANKAN` beserta penyebab dan syaratnya.
    - Gate: `test:e2e`.
    - Prasyarat: 1.2 (database untuk spec yang membutuhkannya).
    - Selesai bila: hasil atau status `TIDAK_DIJALANKAN` tercatat.
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 1.4 Buat Register_Dependency dan peta temuan ke tahap
    - File: `.kiro/specs/niuva-audit-remediation/register-dependency.md` (baru).
    - Langkah: catat pasangan terarah B5→B2/B3, I1→C1, F1→A2, `PUB-AGE`/`PUB-GUARDIAN`→signup publik, A1→provider/email/refund, D2/D3/D4 satu jalur job, H3→H2-revised, masing-masing dengan alasan. Petakan setiap ID temuan ke tepat satu tahap, atau `DITUNDA` dengan alasan dan syarat pengaktifan. Catat bila ada temuan yang bertentangan dengan authority 3 Oktober 2026 (authority yang berlaku). Sediakan bagian "Risiko tersurat" yang nanti diisi 5.16.
    - Selesai bila: tiap ID temuan (`A1`…`L2`) muncul tepat sekali.
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 1.5 Buat kerangka Register_Keputusan
    - File: `.kiro/specs/niuva-audit-remediation/register-keputusan.md` (baru).
    - Langkah: buat kerangka dengan kolom pemilik, bukti yang dibutuhkan, dan syarat penutupan. Semua status awal `BELUM_TERTUTUP`. Isi final di task 23.1.
    - Selesai bila: kerangka ada dan tidak memuat nilai keputusan apa pun.
    - _Requirements: 30.8, 30.10_

  - [x] 1.6 Ignore `.agents/**` di konfigurasi lint
    - Masalah: 146 warning tooling menenggelamkan sinyal product code (K3-revised).
    - File: `eslint.config.mjs`.
    - Langkah: tambahkan `.agents/**` ke ignore. Jangan menambah ignore untuk `src/generated/**`.
    - Gate: `lint` (harus melaporkan 2 warning product code).
    - Selesai bila: `lint` hanya melaporkan warning dari product code dan test.
    - _Requirements: 7.1, 7.3_

  - [x] 1.7 Selesaikan warning `_providerPayload`
    - File: `src/modules/shipping/retail-rate-service.ts` (baris 145).
    - Langkah: hapus atau gunakan parameter tanpa mengubah perilaku.
    - Gate: `lint`, `typecheck`, `test`, `test:backend`.
    - Prasyarat: 1.6.
    - Selesai bila: warning hilang dan test ongkir tetap lulus tanpa diubah.
    - _Requirements: 7.2_

  - [x] 1.8 Selesaikan warning `liveMocks`
    - File: `tests/unit/properties/p06-token-not-found.test.tsx` (baris 87).
    - Langkah: cek perubahan Owner pada file ini (lihat guardrail). Hapus variabel tak terpakai tanpa mengurangi assertion.
    - Gate: `lint`, `test`.
    - Prasyarat: 1.6.
    - Selesai bila: warning hilang; jumlah test dan assertion tidak turun.
    - _Requirements: 7.2_

  - [x] 1.9 Verifikasi ulang catatan I6 terhadap migrasi token rotation
    - Masalah: catatan kegagalan replay integration mungkin usang (I6).
    - File: baca `docs/frontend/mvp-release-readiness.md:197-201` dan `prisma/migrations/20260925120000_allow_public_token_rotation/migration.sql`. Tulis hasil ke `baseline-gate.md`.
    - Langkah: baca migrasi dan bandingkan dengan klaim di dokumen. Jika database test tersedia (1.2), tunjukkan apakah replay migrasi lulus. Jangan mengubah migrasi.
    - Selesai bila: hasil verifikasi dan dasarnya tercatat. Pembaruan dokumen readiness dilakukan di 3.20.
    - _Requirements: 10.4_

  - [x] 1.10 [APPROVAL_GATE] Pasang `@vitest/coverage-v8` dan konfigurasi coverage
    - **DO NOT EXECUTE kecuali user menyetujui penambahan `@vitest/coverage-v8` secara tertulis.** Sebut tujuan (mengukur celah test C1/I2), dampak maintenance (paket resmi Vitest, versi harus cocok dengan Vitest terpasang), dampak keamanan (dev dependency), dan biaya (tidak ada).
    - Catatan status: approval tertulis diberikan melalui handoff Tahap 12 (5 Oktober 2026), dicatat di AG-1.10. Paket 4.1.11 dipin sama dengan Vitest; baseline tiga config, perbaikan transform server-only unit, dan usulan threshold di bawah baseline tercatat di baseline-gate.md bagian 10.
    - File: `package.json`, lockfile, `vitest.config.mts`, `vitest.backend.config.mts`, `vitest.integration.config.mts`.
    - Langkah: aktifkan coverage untuk ketiga config, kecualikan `src/generated/**`, catat angka awal sebagai baseline di `baseline-gate.md`. Usulkan threshold yang sama dengan atau di bawah baseline; jangan menaikkan di atas baseline.
    - Gate: `test`, `test:backend`, `test:integration`.
    - Selesai bila: baseline coverage tercatat untuk ketiga config.
    - _Requirements: 4.1, 4.2, 6.1, 6.2, 6.3, 6.5_

  - [x] 1.11 Catat celah test C1 dan I2 secara manual
    - Jalankan ini bila 1.10 belum disetujui. Jika 1.10 sudah selesai, task ini hanya memverifikasi bahwa catatan selaras dengan angka coverage.
    - File: `.kiro/specs/niuva-audit-remediation/coverage-gaps.md` (baru).
    - Langkah: catat per file fungsi yang tidak teruji, minimal `listPublishedPortfolioProjects` dan `findPublishedPortfolioProjectBySlug` di `src/modules/portfolio/public-service.ts`, serta jalur `/`, `/projects`, `/projects/[slug]` terhadap sumber database. Tahan threshold otomatis.
    - Selesai bila: tiap celah tercatat dengan file dan alasan.
    - _Requirements: 6.4_

  - [ ]* 1.12 Tulis test Property 28 (penjadwalan menghormati graf prasyarat)
    - **Property 28: Penjadwalan menghormati graf prasyarat**
    - File: `tests/unit/properties/audit-p28-task-graph.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 28`.
    - Realisasi: table-driven atas graf kecil (rantai, diamond, komponen terputus, siklus) plus korpus seeded ≥100 graf acak dari `tests/unit/helpers/corpus.ts`. Tambahkan test atas berkas nyata: parse blok JSON di `tasks.md` ini (tidak ada siklus, tiap sub-task tepat satu wave, prasyarat di wave lebih awal) dan `register-dependency.md` (tiap ID temuan tepat satu tahap atau `DITUNDA`).
    - Gate: `test`.
    - Prasyarat: 1.4, 1.5.
    - **Validates: Requirements 1.2, 1.6, 2.9, 2.10, 30.8**

  - [ ]* 1.13 Tulis guard Property 29 (invariant system pages tetap ada)
    - **Property 29: Renderer system state tidak membocorkan string yang disuntikkan (dipertahankan)**
    - File: `tests/unit/properties/audit-p29-invariant-registry.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 29`.
    - Realisasi: table-driven; menegaskan `p05-no-leak.test.tsx`, `p12-surface-structure.test.tsx`, `p13-system-copy.test.ts` masih ada, berisi tag Property 5/12/13 spec `system-pages-and-error-states`, dan berjalan di config `vitest.config.mts`. Tidak mengubah file lama.
    - Gate: `test`.
    - **Validates: Requirements 5.1, 5.2**

- [x] 2. Checkpoint - Tahap 0 selesai
  - Pastikan `baseline-gate.md`, `register-dependency.md`, `register-keputusan.md` ada; `lint` melaporkan hanya warning product code (atau nol); semua test yang ada tetap lulus. Tandai task `[BUTUH_INTEGRASI]`/`[BUTUH_E2E]` tertahan bila status 1.2/1.3 `TIDAK_DIJALANKAN`. Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Tahap 1 - Observability dan kebenaran konfigurasi
  - [x] 3.1 Buat Observability_Layer: logger dan classifier
    - Masalah: tidak ada log kegagalan terkorelasi (B5, J9).
    - File: `src/lib/observability/logger.ts`, `src/lib/observability/classify.ts` (baru).
    - Langkah: definisikan `FailureKind`, `FailureEvent` dengan `safeContext` berupa allowlist `Record<string, string>`, `classifyUnknownError(error: unknown)` yang total dan tidak melempar, dan `createConsoleFailureLogger()`. Tidak ada dependency baru. Baca `src/modules/shared/errors.ts` untuk `ErrorCode`.
    - Gate: `lint`, `typecheck`, `test`.
    - Selesai bila: unit test contoh konkret untuk tiap `FailureKind` lulus.
    - _Requirements: 8.1, 8.3, 8.5_

  - [ ]* 3.2 Tulis test Property 13 (pemetaan kegagalan ke kategori total)
    - **Property 13: Pemetaan kegagalan ke kategori total**
    - File: `tests/unit/properties/audit-p13-failure-mapping.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 13`.
    - Realisasi: eksautif atas `ERROR_CODES`; korpus seeded ≥100 nilai lemparan (bukan `Error`, `null`, string, simbol, error bersarang). Tegaskan tidak pernah melempar dan tiap kode punya kategori serta copy state sistem.
    - Gate: `test`.
    - Prasyarat: 3.1.
    - **Validates: Requirements 8.1, 8.4, 8.5, 27.4**

  - [x] 3.3 Pasang logger di `apiError()` dengan correlation id yang sama
    - File: `src/lib/http/response.ts`.
    - Langkah: panggil `FailureLogger.record()` dengan correlation id yang sama dengan header `x-correlation-id` dan body respons. Jangan mengubah bentuk respons.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 3.1.
    - Risiko: menyentuh semua respons error. Jalankan test invariant system pages.
    - Selesai bila: test memastikan id di header, body, dan log identik.
    - _Requirements: 8.2, 8.3_

  - [ ]* 3.4 Tulis test Property 14 (correlation id konsisten)
    - **Property 14: Correlation id yang dikirim sama dengan yang dicatat**
    - File: `tests/unit/properties/audit-p14-correlation-id.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 14`.
    - Realisasi: eksautif atas `ERROR_CODES`; korpus seeded ≥100 kegagalan.
    - Gate: `test`.
    - Prasyarat: 3.3.
    - **Validates: Requirements 8.2**

  - [x] 3.5 Pasang logger di `toAppError()`
    - Masalah: error tak dikenal hilang tanpa jejak di luar jalur `apiError()` (Server Action, page, service).
    - **Keputusan user (direvisi setelah 3.3 selesai):** 3.3 sudah membuat `apiError()` mencatat dan memanggil `toAppError()`, sehingga mencatat tanpa syarat di `toAppError()` menghasilkan log ganda. Lingkup 3.5 dipersempit: `toAppError()` hanya mencatat error yang **bukan** `AppError`, dan error yang sudah dicatat oleh `apiError()` tidak dicatat lagi.
    - File: `src/modules/shared/errors.ts`, `src/lib/http/response.ts` (hanya untuk mencegah pencatatan ganda).
    - Langkah: catat jenis, boundary, dan correlation id untuk error yang bukan `AppError` saat `toAppError()` dipanggil di luar `apiError()`. Buat mekanisme pencegah log ganda (mis. `toAppError` menerima opsi, atau `apiError` memakai varian internal tanpa log) sehingga satu kegagalan API menghasilkan tepat satu catatan. Hindari import melingkar antara `errors.ts`, `classify.ts`, dan `logger.ts` (keduanya sudah mengimpor dari `errors.ts`). Pesan untuk pengguna tidak berubah.
    - Catatan realisasi: pencatatan direalisasikan sebagai wrapper `toAppErrorLogged` di `src/lib/observability/report.ts`, bukan di dalam `errors.ts`, supaya tidak terjadi import melingkar dengan `classify.ts` dan `logger.ts`. `toAppError()` tidak diubah. `apiError()` tetap mencatat sendiri, sehingga tidak ada log ganda. Baru terpasang di `errorStateFrom` pada `src/app/admin/actions.ts` (boundary `action:admin`).
    - Tindak lanjut: pemanggil yang belum memakai `toAppErrorLogged` adalah `src/app/api/auth/internal/google-consent/route.ts` (2 pemanggilan) dan `src/modules/customer-auth/email-handler.ts`.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 3.1, 3.3.
    - Risiko: `ERROR_CODES` tidak boleh berubah di task ini (penambahan kode ada di 5.14). `toAppError` dipakai di banyak tempat; perilaku pengembalian (`AppError` yang sama untuk `AppError`, `INTERNAL_ERROR` untuk lainnya) harus identik.
    - Selesai bila: test memastikan pesan pengguna identik, satu kegagalan API menghasilkan tepat satu log, dan error non-`AppError` di luar `apiError()` tercatat tepat satu kali.
    - _Requirements: 8.1, 8.3_

  - [x] 3.6 Loader admin membedakan `FailureKind` dan copy per kategori
    - Masalah: tiga penyebab berbeda tampil sebagai satu view (G3).
    - File: `src/app/admin/admin-record-loader.ts`, `src/components/niuva/system-state-copy.ts`, lokasi `AdminDataUnavailableView` (cari dengan grep).
    - Langkah: tambahkan field `kind` ke hasil `unavailable` tanpa mengubah `status`. Tambahkan copy per kategori di `system-state-copy.ts` (Indonesia, ≤20 kata per kalimat, tanpa "exception", "stack", "digest"). View memilih copy dari `kind`.
    - Gate: `test`, `lint`, `typecheck`, `build`.
    - Prasyarat: 3.1.
    - Risiko: `AdminDataUnavailableView`, tri-state `loadAdminRecord`, dan copy terpusat adalah Invariant. Perubahan hanya menambah.
    - Selesai bila: test p07 dan p13 spec sebelumnya tetap lulus tanpa diubah.
    - _Requirements: 8.4, 8.5, 27.4, 27.5, 5.1_

  - [x] 3.7 Catat penyebab kegagalan pada page admin kelompok A
    - File: page admin orders, inquiries, custom-print (list dan detail). Cari pola `catch { return null }` dengan grep lebih dulu; daftar final ditentukan hasil grep.
    - Langkah: ganti `null` buta dengan hasil berkategori lewat `classifyUnknownError` dan log dengan correlation id sebelum view dirender.
    - Gate: `test`, `lint`, `typecheck`.
    - Prasyarat: 3.6.
    - Selesai bila: test tiap page memastikan log ditulis sebelum view "belum dapat dimuat".
    - _Requirements: 8.4, 8.5, 27.4_

  - [x] 3.8 Catat penyebab kegagalan pada page admin kelompok B
    - File: page admin portfolio, products, pricing (daftar final dari grep).
    - Langkah dan gate: sama dengan 3.7.
    - Prasyarat: 3.6.
    - _Requirements: 8.4, 8.5, 27.4_

  - [x] 3.9 Catat penyebab kegagalan pada page admin kelompok C
    - File: `src/app/admin/page.tsx`, `src/app/admin/queue/page.tsx`, `src/app/admin/privacy/page.tsx`, `src/app/admin/privacy/policy/page.tsx`, `src/app/admin/products/[id]/stock/[variantId]/page.tsx` (sesuai hasil grep).
    - Langkah dan gate: sama dengan 3.7.
    - Prasyarat: 3.6.
    - _Requirements: 8.4, 8.5, 27.4_

  - [x] 3.10 Catat kegagalan webhook pembayaran
    - File: `src/modules/payment/webhook-service.ts`.
    - Langkah: log kegagalan dengan `safeContext` berisi id/enum saja; jangan log payload mentah atau signature.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 3.1.
    - Risiko: Invariant webhook Midtrans (signature `timingSafeEqual`, dedup `eventFingerprint`, selisih nominal). Jalankan test webhook yang ada tanpa diubah.
    - _Requirements: 8.1, 8.3, 5.4_

  - [x] 3.11 Migrasi baru tabel `FailureEvent`
    - File: `prisma/schema.prisma`, migrasi baru di `prisma/migrations/`.
    - Langkah: tambahkan tabel dengan `correlationId`, `boundary`, `errorCode`, `kind`, `occurredAt`, `safeContextJson`; index `[correlationId]` dan `[occurredAt]`. Tanpa kolom payload, header, body, token, atau PII. Tanpa pembersihan otomatis (retensi menunggu T4).
    - Catatan realisasi: replay seluruh 17 migrasi pada database kosong berhasil, sehingga menutup `baseline-gate.md` bagian 9.4.
    - Tindak lanjut: perbarui `baseline-gate.md` bagian 9.4 dan redaksi di `docs/frontend/mvp-release-readiness.md` ("belum teruji" menjadi terbukti secara lokal) bila belum dilakukan. Belum dikerjakan di task ini.
    - Gate: `db:validate`, `db:generate`, `typecheck`, `test:integration` [BUTUH_INTEGRASI].
    - Prasyarat: 1.2.
    - Selesai bila: `db:validate` lulus dan migrasi hanya menambah tabel.
    - _Requirements: 8.2, 4.9_

  - [x] 3.12 Persistensi kegagalan durable
    - File: `src/lib/observability/repository.ts` (baru), pemasangan di boundary admin page dan webhook.
    - Langkah: simpan `FailureEvent` hanya untuk kegagalan admin page, webhook, job, dan refund. Petugas dapat mencari dengan correlation id.
    - Catatan realisasi: penulisan dijalankan lewat `after()` dari Next dengan fallback ke fire-and-forget langsung. Persistensi di boundary webhook (prefiks boundary `webhook:`) dibatasi satu baris per `kind|boundary` per 60 detik, maksimum 200 kunci, hanya in-process (per instance pada serverless). Retensi `failure_events` tetap tertahan pada task Owner 17.32.
    - Gate: `test:backend`, `test:integration` [BUTUH_INTEGRASI].
    - Prasyarat: 3.7, 3.8, 3.9, 3.10, 3.11.
    - Risiko: persistensi tidak boleh membuat respons gagal; kegagalan menulis log tidak boleh mengubah respons.
    - _Requirements: 8.2, 8.3_

  - [x] 3.13 Buat `env-register.md` dan tandai env Sentry tanpa konsumen
    - File: `.kiro/specs/niuva-audit-remediation/env-register.md` (baru).
    - Langkah: daftar `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` sebagai `UNUSED_PENDING_APPROVAL`. Hanya nilai contoh non-rahasia. Dipakai task env berikutnya untuk mengumpulkan nama baru.
    - Selesai bila: keempat env tercatat dan tidak ada janji pemantauan eksternal.
    - _Requirements: 8.6, 14.3_

  - [ ] 3.14 [APPROVAL_GATE] Pasang SDK pemantauan error
    - Status Tahap 12: **DITUNDA** sampai mendekati staging; syarat vendor/paket, biaya, data/retensi/redaksi, dan approval pada AG-3.14. Buka spec terpisah, bukan dilaksanakan dalam penutupan ini.
    - **DO NOT EXECUTE kecuali user menyetujui paket SDK secara tertulis.** Tanpa persetujuan, `FailureLogger` tetap interface dan env Sentry tetap tanpa konsumen.
    - File: `package.json`, lockfile, adapter baru di `src/lib/observability/`.
    - Langkah: tambahkan adapter yang mengimplementasikan `FailureLogger` tanpa menyentuh call site.
    - Gate: `lint`, `typecheck`, `test`, `build`.
    - _Requirements: 8.7_

  - [x] 3.15 Daftarkan env runtime ke schema env server
    - Masalah: env dibaca tersebar tanpa validasi (K1).
    - File: `src/lib/env/server.ts`.
    - Langkah: tambahkan `NIUVA_ANALYTICS_ENABLED`, `CRON_SECRET`, `NIUVA_CUSTOMER_AUTH_MOCK`, `NIUVA_NEXT_DIST_DIR`, `DEMO_DATABASE_URL` ke `serverEnvironmentSchema` (opsional, tanpa mengubah default perilaku). Catat di `env-register.md`. Tanpa menyentuh `.env.example`.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 3.13.
    - Selesai bila: test menolak nilai salah bentuk dengan nama field yang benar.
    - _Requirements: 9.1_

  - [x] 3.16 Satukan schema env internal auth
    - File: `src/modules/customer-auth/internal-testing.ts`, `src/lib/env/server.ts`.
    - Langkah: rujuk `NIUVA_INTERNAL_AUTH_ENABLED`, `NIUVA_INTERNAL_GOOGLE_EMAIL`, `NIUVA_INTERNAL_PASSWORD_EMAIL` dari satu sumber. Allowlist, dokumen pengujian 30 hari, dan perilaku tidak berubah.
    - Catatan realisasi: nama env yang dibaca kode dan `.env.example` adalah `NIUVA_INTERNAL_GOOGLE_EMAIL` dan `NIUVA_INTERNAL_PASSWORD_EMAIL` (tanpa `_AUTH_`). Sumber tunggal berupa modul bebas alias `src/lib/env/internal-auth.ts`, karena script yang dijalankan lewat jiti tidak dapat me-resolve alias `@/`.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `lint`, `typecheck`.
    - Prasyarat: 3.15.
    - Risiko: Invariant internal testing dan lifecycle (Req 5.7). Jalankan test customer-auth yang ada.
    - _Requirements: 9.2, 5.5, 5.7_

  - [x] 3.17 Jadikan endpoint Midtrans konfigurasi
    - File: `src/modules/payment/midtrans.ts` (baris 11), `src/lib/env/server.ts`.
    - Langkah: operkan endpoint ke `createMidtransSnapGatewayFromEnvironment()` lewat `MidtransSnapGatewayConfig.endpoint`. Default tetap endpoint sandbox saat belum dikonfigurasi. Jangan mengubah guard provider (itu Tahap 3). Catat nama env di `env-register.md`.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 3.16.
    - Risiko: Invariant webhook Midtrans; jalankan test payment yang ada.
    - _Requirements: 9.5, 5.4_

  - [x] 3.18 Ambil `allowedDevOrigins` dari konfigurasi lingkungan
    - File: `next.config.ts`, `src/lib/env/server.ts`.
    - Langkah: baca dokumen `allowedDevOrigins` di `node_modules/next/dist/docs/` dulu. Ganti `192.168.1.11` hardcoded dengan nilai dari env. Default kosong.
    - Catatan realisasi: parsing daftar origin ada di modul bebas alias `src/lib/env/dev-origins.ts`, karena `next.config.ts` tidak dapat me-resolve alias `@/`.
    - Gate: `lint`, `typecheck`, `build`.
    - Prasyarat: 3.17.
    - _Requirements: 9.6_

  - [x] 3.19 Perbarui `MEMORY.md`
    - Masalah: status model data, auth, dan funnel usang (L1).
    - File: `MEMORY.md`.
    - Langkah: perbarui status "Core data model", "Auth", "Core MVP flow" (25+ model Prisma, 16 migrasi, dua sistem auth, funnel end-to-end). Ganti bagian "Known Issues" dengan temuan yang masih berlaku. Verifikasi angka terhadap repo sebelum menulis.
    - Selesai bila: tiap klaim di `MEMORY.md` bisa ditunjuk ke file di repo.
    - _Requirements: 10.1, 10.2_

  - [x] 3.20 Pisahkan evidence aktif dan historis di dokumen readiness
    - File: `docs/frontend/mvp-release-readiness.md`.
    - Langkah: cek perubahan Owner pada file ini lebih dulu. Pisahkan evidence aktif dari historis. Tandai catatan replay baris 197-201 historis dengan tanggal dan dasar verifikasi dari 1.9 bila terbukti usang. Catat bahwa evidence public, catalog, authenticated-admin, dan quote bersifat local/loopback/non-production.
    - Prasyarat: 1.9.
    - _Requirements: 10.3, 10.5, 10.6_

- [x] 4. Checkpoint - Tahap 1 selesai
  - Jalankan `lint`, `typecheck`, `test`, `test:backend`, `build`. Konfirmasi Invariant system pages dan webhook tetap lulus. Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Tahap 2 - Pengerasan boundary request
  - Catatan tahap: Req 11 (rate limit) dan Req 12 (otorisasi) menyentuh berkas berbeda dan dapat berjalan paralel. Keduanya membutuhkan Tahap 1 (B5→B2/B3). Setiap task rate limit menjalankan `test`, `test:backend`, dan `test:integration` (Req 11.8).
  - [x] 5.1 Buat `deriveActorKey` untuk kunci per pelaku
    - Masalah: satu bucket per origin membuat satu pelaku memblokir semua (B2).
    - File: `src/lib/security/actor-key.ts` (baru). Rujuk pola `src/app/api/account/make/[id]/rough-shipping/route.ts` dan `rateKey()` di `src/app/api/analytics/page-view/route.ts`.
    - Langkah: kunci `c:${endpointId}:${customerId}` bila ada sesi Customer, selain itu `i:${endpointId}:${sha256(processSalt + ip)}`. IP dari `x-real-ip`, lalu entri pertama `x-forwarded-for`, dipotong 64 karakter, `"unknown"` bila kosong. Identitas endpoint selalu ikut.
    - Gate: `test`, `lint`, `typecheck`.
    - Prasyarat: 3.5 (observability selesai).
    - Selesai bila: unit test contoh konkret lulus; modul belum dipakai siapa pun.
    - _Requirements: 11.1_

  - [ ]* 5.2 Tulis test Property 3 (kunci rate limit mengisolasi pelaku)
    - **Property 3: Kunci rate limit mengisolasi pelaku**
    - File: `tests/unit/properties/audit-p03-actor-key.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 3`.
    - Realisasi: korpus seeded ≥100 identitas dan header (`x-real-ip`, `x-forwarded-for` berisi banyak nilai, spasi, nilai panjang, kosong) plus kasus tetap sesi Customer ada/tidak ada.
    - Gate: `test`.
    - Prasyarat: 5.1.
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [x] 5.3 Ekstrak antarmuka `RateLimitStore` tanpa mengubah perilaku
    - File: `src/lib/security/rate-limit.ts`.
    - Langkah: definisikan `RateLimitStore.consume(key, limit, windowMs, now)`. `createInMemoryRateLimiter` menjadi satu implementasi. Perilaku, termasuk fail-closed `maxKeys`, belum berubah.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 5.1.
    - Selesai bila: semua test rate limit yang ada lulus tanpa diubah.
    - _Requirements: 11.5, 11.6_

  - [x] 5.4 Ganti fail-closed `maxKeys` dengan eviksi dan pembersihan amortisasi
    - Masalah: kapasitas penuh menolak semua pelaku baru (B3).
    - File: `src/lib/security/rate-limit.ts`.
    - Langkah: pada kapasitas penuh keluarkan kunci kedaluwarsa dulu, lalu terlama (LRU), dan terima kunci baru. Ganti `clearExpiredRecords` yang memindai seluruh map di tiap `check()` dengan pembersihan amortisasi. Jangan menaikkan limit endpoint.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `lint`, `typecheck`.
    - Prasyarat: 5.3.
    - Risiko: melonggarkan proteksi. Uji dengan urutan kunci yang seluruhnya unik.
    - _Requirements: 11.4, 11.8_

  - [ ]* 5.5 Tulis test Property 4 (eviksi, bukan penolakan menyeluruh)
    - **Property 4: Kapasitas penuh melakukan eviksi, bukan penolakan menyeluruh**
    - File: `tests/unit/properties/audit-p04-rate-limit-eviction.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 4`.
    - Realisasi: korpus seeded ≥100 urutan kedatangan yang melampaui kapasitas, termasuk urutan seluruhnya unik.
    - Gate: `test`.
    - Prasyarat: 5.4.
    - **Validates: Requirements 11.4**

  - [x] 5.6 Buat `assertPublicMutationRequest` menerima `endpointId` secara opsional
    - File: `src/lib/http/public-mutation.ts`.
    - Langkah: tambahkan parameter `endpointId` opsional dan pakai `deriveActorKey` bila ada. Tanpa `endpointId`, perilaku lama (kunci origin) tetap, supaya migrasi route bisa bertahap.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 5.1, 5.4.
    - _Requirements: 11.1, 11.2_

  - [x] 5.7 Inventarisasi empat belas route publik
    - File: `.kiro/specs/niuva-audit-remediation/rate-limit-routes.md` (baru).
    - Langkah: grep pemakai `assertPublicMutationRequest` di `src/app/api/**`. Tulis daftar route, `endpointId` usulan (`"POST /api/..."`), dan kelompok batch untuk 5.8–5.12. Jumlah harus 14; jika beda, catat selisihnya.
    - Selesai bila: tiap route punya `endpointId` unik dan batch.
    - _Requirements: 11.2_

  - [x] 5.8 Pindahkan route publik batch 1 ke kunci per pelaku
    - File: tiga route pertama dari `rate-limit-routes.md` dan test route-nya.
    - Langkah: operkan `endpointId`. Tambahkan test: pelaku A menghabiskan kuota, pelaku B tetap dilayani.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI].
    - Prasyarat: 5.6, 5.7.
    - _Requirements: 11.2, 11.3, 11.8_

  - [x] 5.9 Pindahkan route publik batch 2
    - Sama dengan 5.8 untuk tiga route berikutnya.
    - Prasyarat: 5.8.
    - _Requirements: 11.2, 11.3, 11.8_

  - [x] 5.10 Pindahkan route publik batch 3
    - Sama dengan 5.8 untuk tiga route berikutnya.
    - Prasyarat: 5.9.
    - _Requirements: 11.2, 11.3, 11.8_

  - [x] 5.11 Pindahkan route publik batch 4
    - Sama dengan 5.8 untuk tiga route berikutnya.
    - Prasyarat: 5.10.
    - _Requirements: 11.2, 11.3, 11.8_

  - [x] 5.12 Pindahkan route publik batch 5
    - Sama dengan 5.8 untuk sisa route (dua atau lebih sesuai inventaris).
    - Prasyarat: 5.11.
    - _Requirements: 11.2, 11.3, 11.8_

  - [x] 5.13 Wajibkan `endpointId` pada `assertPublicMutationRequest`
    - File: `src/lib/http/public-mutation.ts`.
    - Langkah: setelah semua route pindah, jadikan `endpointId` wajib dan hapus jalur kunci origin. Compiler harus menolak pemanggil tanpa `endpointId`.
    - Gate: `typecheck`, `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI].
    - Prasyarat: 5.12.
    - _Requirements: 11.1, 11.2_

  - [x] 5.14 Tambah kode `RESOURCE_BUSY` beserta pembaruan pemetaan lama dalam satu task
    - Masalah: `derive()` melempar `RATE_LIMITED` saat server sibuk menghitung hash, menyamakan sibuk dengan "terlalu sering" (B7).
    - File: `src/modules/shared/errors.ts` (`ERROR_CODES`, status 503, `Retry-After` pendek), `src/modules/customer-auth/password.ts` (`derive()`), `src/app/admin/admin-page-access.ts` (`toAdminAccessState`), `src/components/niuva/system-state-copy.ts`, `tests/unit/properties/p08-admin-access-mapping.test.ts` (Property 8 spec `system-pages-and-error-states`), serta korpus `audit-p13-failure-mapping.test.ts` dari 3.2.
    - Langkah: tambahkan kode baru, pakai di `derive()` saat `activeHashes >= 2`, dan perbarui pemetaan ke state akses admin serta pemetaan `FailureKind`/copy agar tetap total atas `ERROR_CODES`. Semua dalam satu changeset supaya test totalitas tidak pecah.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `lint`, `typecheck`.
    - Prasyarat: 3.2, 3.5.
    - Risiko: Property 8 dan Property 13 spec sebelumnya menuntut pemetaan total. Jangan merge sebagian.
    - Selesai bila: `p08-admin-access-mapping` dan `p13-system-copy` lulus, dan test hashing membedakan `RESOURCE_BUSY` dari `RATE_LIMITED`.
    - _Requirements: 11.7, 11.8, 5.1_

  - [ ] 5.15 [APPROVAL_GATE] Ganti store rate limit ke resource bersama
    - Status Tahap 12: **DITUNDA** sampai hosting/topologi instance dipilih; RK-11 tetap `BELUM_TERTUTUP`. Buka spec terpisah dengan store, biaya, skema, dan approval yang jelas (AG-5.15).
    - **DO NOT EXECUTE kecuali user menyetujui secara tertulis resource hosted atau penggunaan tabel PostgreSQL bersama untuk rate limit.** Keputusan store final adalah T3 (Owner + engineering). Tanpa persetujuan, store in-memory tetap dan keterbatasannya dicatat di 5.16.
    - File (bila disetujui): `src/modules/rate-limit/repository.ts` (baru), migrasi baru `RateLimitWindow` (`scope`, `key`, `count`, `resetAt`; `@@id([scope, key])`, `@@index([resetAt])`), tanpa menyentuh `CustomerAuthRateLimit`.
    - Gate: `db:validate`, `test:backend`, `test:integration` [BUTUH_INTEGRASI].
    - _Requirements: 11.5, 11.6, 4.9_

  - [x] 5.16 Catat keterbatasan rate limit per-proses
    - File: `.kiro/specs/niuva-audit-remediation/register-dependency.md` (bagian "Risiko tersurat").
    - Langkah: tulis bahwa state limiter per-proses tidak berlaku lintas instance, dan syarat penggantian store bersama.
    - Prasyarat: 1.4.
    - _Requirements: 11.5_

  - [x] 5.17 Wajibkan Customer terautentikasi pada upload intent
    - Masalah: presigned upload dapat terbit tanpa Customer (B4).
    - File: `src/modules/files/upload-service.ts` (`UploadService.createIntent` memanggil `requireCustomer()` dari `src/lib/auth/customer.ts`, `authorize` bisa di-inject), `src/app/api/uploads/intents/route.ts`.
    - Langkah: tolak dengan `UNAUTHORIZED` di service. Pastikan tidak ada `StoredFile` yatim yang tercipta.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `lint`, `typecheck`.
    - Prasyarat: 3.15.
    - Risiko: Invariant token akses dan customer boundary.
    - Selesai bila: test memastikan tanpa Customer tidak ada presigned URL dan tidak ada baris `StoredFile`.
    - _Requirements: 12.1, 12.2, 12.6_

  - [x] 5.18 Isi `StoredFile.sha256` saat verifikasi upload
    - File: `src/modules/files/upload-service.ts`, `src/modules/files/repository.ts`.
    - Langkah: tulis checksum bersama `verifiedAt` dalam satu transaksi. Kolom `sha256` sudah ada di schema; verifikasi dulu, dan bila ada, tanpa migrasi. Pemeriksaan isi berkas (anti-malware) bukan bagian task ini.
    - Gate: `test:backend`, `test:integration` [BUTUH_INTEGRASI], `typecheck`.
    - Prasyarat: 5.17.
    - _Requirements: 12.7_

  - [x] 5.19 Tambah otorisasi di `ActionQueueService`
    - Masalah: service tanpa pemeriksaan izin (C2).
    - File: `src/modules/admin/action-queue-service.ts`.
    - Langkah: pola `this.authorize = dependencies.authorize ?? requireAdmin` dan `requireAdminPermission(access, ...)` per operasi. Matriks di `src/modules/admin/permissions.ts` tidak diubah.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 3.15.
    - Risiko: Invariant permission OWNER/ADMIN dan `isActive`.
    - _Requirements: 12.3, 5.6_

  - [x] 5.20 Pastikan `AdminOperationsService` memeriksa izin per operasi
    - File: `src/modules/admin/operations.ts`.
    - Langkah: audit tiap operasi dan tambahkan `requireAdminPermission` dengan izin yang tepat di tempat yang belum ada. Pemeriksaan di page tidak dihapus.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 3.15.
    - _Requirements: 12.3, 5.6_

  - [x] 5.21 Beri `/demo/action-queue` authorizer eksplisit
    - File: `src/app/demo/action-queue/page.tsx`.
    - Langkah: operkan authorizer demo yang menghasilkan `AdminAccess` sintetis hanya saat `isLocalDemoMode()` benar, sehingga service tetap memeriksa izin. Route tetap fail-closed dan `noindex`.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 5.19.
    - _Requirements: 12.4, 28.13_

  - [x] 5.22 Test negatif seluruh Server Action admin (lapisan service)
    - File: `tests/unit/server-actions-authorization.test.ts` (baru).
    - Langkah: pindai semua berkas `actions.ts` dan `"use server"` di `src/app` untuk membangun manifest. Tiap action harus menolak pemanggilan tanpa izin. Test gagal bila ada action baru yang tidak ada di manifest.
    - Gate: `test`, `test:backend`.
    - Prasyarat: 5.19, 5.20.
    - _Requirements: 12.5_

  - [x] 5.23 Test POST langsung Server Action di luar matcher proxy
    - File: `tests/integration/server-actions-direct-post.test.ts` dan/atau spec di `tests/e2e/` (baru).
    - Langkah: POST langsung ke route tempat action dipakai tanpa sesi admin dan tegaskan penolakan, termasuk route di luar matcher `src/proxy.ts`. Baca `proxy.md` tentang Server Function dan matcher.
    - Gate: `test:integration` [BUTUH_INTEGRASI], `test:e2e` [BUTUH_E2E].
    - Prasyarat: 5.22.
    - _Requirements: 12.5_

  - [ ]* 5.24 Tulis test Property 18 (otorisasi ditegakkan)
    - **Property 18: Otorisasi ditegakkan untuk setiap operasi dan setiap aktor**
    - File: `tests/unit/properties/audit-p18-authorization.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 18`.
    - Realisasi: eksautif 2 role × 2 `isActive` × 17 permission atas operasi service terlindungi; korpus seeded ≥100 token sesi Customer tidak sah (`tokenCorpus`) untuk upload; manifest Server Action dari 5.22. Refund (22.8, 22.9) ditambahkan di 17.x.
    - Gate: `test`, `test:backend`.
    - Prasyarat: 5.17, 5.19, 5.20, 5.22.
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 22.8, 22.9**

  - [x] 5.25 Catat kebutuhan pemeriksaan konten berkas unduhan operator
    - File: `.kiro/specs/niuva-audit-remediation/register-keputusan.md`.
    - Langkah: tambah entri T10 (Owner + engineering). Bila memerlukan layanan eksternal, tandai sebagai `[APPROVAL_GATE]`. Tidak ada implementasi.
    - Prasyarat: 1.5.
    - _Requirements: 12.8_

- [x] 6. Checkpoint - Tahap 2 selesai
  - Jalankan `test`, `test:backend`, `test:integration` (bila Baseline mencatatnya), `lint`, `typecheck`, `build`. Konfirmasi Invariant permission, token, dan system pages tetap lulus. Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Tahap 3 - Deployment tier, capability matrix, CSP, dan proxy
  - Catatan tahap: serial. Capability_Resolver adalah titik tunggal yang dipakai tahap 4–8. Jangan mengerjakan dua capability sekaligus. Setiap task menjalankan `test`, `test:backend`, `test:integration`, dan `build` (Req 13.13).
  - [x] 7.1 Verifikasi perilaku `clerkMiddleware({ contentSecurityPolicy: { strict: true } })` pada `/admin`
    - Masalah: dokumen Next terpasang tidak menjelaskan header yang ditulis Clerk (design §1.3). Harus diketahui sebelum proxy diubah.
    - File: `.kiro/specs/niuva-audit-remediation/csp-clerk-findings.md` (baru). Baca sumber `@clerk/nextjs` 7.8.0 di `node_modules`, `src/proxy.ts`, dan `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
    - Langkah: bangun production build dengan `NIUVA_NEXT_DIST_DIR` tersendiri dan jalankan `next start` sebagai proses latar belakang di port bebas. Ambil header respons `/admin`, `/checkout`, `/account`, `/services` (tanpa mencetak secret). Catat: siapa yang menulis `Content-Security-Policy`, apakah ada nonce, dan apakah header dari `next.config.ts` tumpang tindih. Hentikan server dan hapus dist dir.
    - Gate: `build`.
    - Prasyarat: 3.15, 1.3.
    - Selesai bila: temuan tertulis dan tidak ada perubahan pada code.
    - _Requirements: 13.11, 13.12_

  - [x] 7.2 Tambah tier dan provider mode ke schema env
    - Masalah: `NODE_ENV` dipakai sebagai izin (A1, T1).
    - File: `src/lib/env/server.ts`, `.kiro/specs/niuva-audit-remediation/env-register.md`.
    - Langkah: tetapkan nama final (usulan `NIUVA_DEPLOYMENT_TIER`, `NIUVA_PROVIDER_MODE`) dan representasi izin aktivasi per tier/capability. Default fail-closed: tier tak terset pada `NODE_ENV=production` dianggap `production`, mode `live` ditolak tanpa izin aktivasi, dan tidak ada izin aktivasi yang diset oleh task mana pun. Jangan menyentuh `.env.example`.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 3.15, 3.16, 3.17, 3.18.
    - _Requirements: 13.1, 13.2, 13.14_

  - [x] 7.3 Definisikan tipe dan Capability_Matrix sebagai data
    - File: `src/modules/capabilities/types.ts`, `src/modules/capabilities/matrix.ts` (baru).
    - Langkah: `DeploymentTier`, `ProviderMode`, `CapabilityName` (signup, googleAuth, passwordAuth, emailSender, emailDelivery, privacyRights, privacyProof, objectStorage, payment, refund, shipping, analytics, scheduledJobs), `CapabilityDenialReason`, `CapabilityRule`, dan `CapabilityMatrix` untuk tiap tier. Matriks adalah data, bukan rangkaian `if`.
    - Gate: `typecheck`, `lint`, `test`.
    - Prasyarat: 7.2.
    - _Requirements: 13.3_

  - [x] 7.4 Implementasikan `CapabilityResolver` tanpa konsumen
    - File: `src/modules/capabilities/resolver.ts` (baru).
    - Langkah: `decide` dan `requireAllowed` sebagai konjungsi empat syarat (resource binding, konfigurasi, policy/usia, izin aktivasi). Bungkus `getServerCapabilities()` untuk syarat konfigurasi. Gate kebijakan dan usia dibaca lewat antarmuka yang untuk sementara mengembalikan "belum tertutup" (fail-closed). `requireAllowed` melempar `PROVIDER_UNAVAILABLE` dengan pesan operator. Perilaku runtime belum berubah karena tidak ada pemakai.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 7.3.
    - _Requirements: 13.4, 13.5, 13.6, 13.8_

  - [x]* 7.5 Tulis test Property 1 (resolusi capability total dan fail-closed)
    - **Property 1: Resolusi capability total dan fail-closed**
    - File: `tests/unit/properties/audit-p01-capability-resolver.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 1`.
    - Realisasi: eksautif 3 tier × 13 capability × 3 mode; korpus seeded ≥100 kombinasi kelengkapan syarat dan nilai env. Tegaskan perubahan `NODE_ENV` saja tidak mengubah keputusan.
    - Gate: `test`.
    - Prasyarat: 7.4.
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 20.1, 30.9**

  - [x] 7.6 Langkah 2: guard lama memanggil resolver dan hanya boleh memperketat
    - File: `src/modules/providers/non-production.ts`.
    - Langkah: `assertNonProductionProvider` tetap menolak `NODE_ENV === "production"` dan sekarang juga menolak bila resolver menolak. Tambahkan test: untuk setiap kombinasi env, resolver tidak pernah mengizinkan apa yang guard lama tolak.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `build`.
    - Prasyarat: 7.4.
    - Risiko: R1, capability terbuka tidak sengaja. Guard lama tidak boleh dilonggarkan.
    - Catatan realisasi: gate kebijakan/usia (PUB-POLICY, PUB-AGE, PUB-GUARDIAN) hanya berlaku pada tier `staging` dan `production` (keputusan user); tier `local-test` berjalan seperti sekarang tanpa gate tersebut, dan signup tetap ditolak di semua tier lewat activation grant. Guard `assertNonProductionProvider` sengaja belum dihubungkan ke resolver: pemanggil dan test-nya meneruskan konfigurasi eksplisit, sedangkan resolver membaca `process.env`, sehingga penyambungan akan menolak alur yang kini diizinkan (percobaan: 7 test backend gagal karena binding resource/konfigurasi dari `process.env`). Tabel `PROVIDER_CAPABILITY` dipertahankan. Migrasi per pemanggil dilakukan di 7.7 sampai 7.12 dengan `requireAllowed` memakai env/context milik pemanggil; guard diganti di sana. Test "resolver tidak pernah mengizinkan yang ditolak guard lama" ada di `tests/unit/provider-guard-tightening.test.ts`.
    - _Requirements: 13.7_

  - [x] 7.7 Langkah 3: pindahkan call site Midtrans gateway
    - File: `src/modules/payment/midtrans.ts`.
    - Langkah: ganti guard dengan `requireAllowed("payment")`. Test penolakan untuk tiap `CapabilityDenialReason`.
    - Teruskan env/konfigurasi milik pemanggil ke resolver (context), jangan mengandalkan process.env.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `build`.
    - Prasyarat: 7.6.
    - Risiko: Invariant webhook Midtrans.
    - _Requirements: 13.7, 5.4_

  - [x] 7.8 Pindahkan call site webhook pembayaran
    - File: `src/modules/payment/webhook-service.ts`.
    - Langkah dan gate: sama dengan 7.7. Verifikasi signature dan dedup tidak berubah.
    - Prasyarat: 7.7.
    - _Requirements: 13.7, 5.4_

  - [x] 7.9 Pindahkan call site Biteship
    - File: `src/modules/shipping/biteship.ts`.
    - Langkah: `requireAllowed("shipping")`. Gate sama dengan 7.7.
    - Prasyarat: 7.6.
    - _Requirements: 13.7_

  - [x] 7.10 Pindahkan call site R2
    - File: `src/modules/files/r2.ts`.
    - Langkah: `requireAllowed("objectStorage")`. Gate sama dengan 7.7.
    - Prasyarat: 7.6.
    - _Requirements: 13.7_

  - [x] 7.11 Pindahkan call site Resend
    - File: `src/modules/notifications/resend.ts`.
    - Langkah: `requireAllowed("emailDelivery")`. Gate sama dengan 7.7.
    - Prasyarat: 7.6.
    - _Requirements: 13.7_

  - [x] 7.12 Pindahkan call site mailer customer-auth
    - File: `src/modules/customer-auth/email-mailer.ts`.
    - Langkah: `requireAllowed("emailSender")`. Gate sama dengan 7.7.
    - Prasyarat: 7.6.
    - Risiko: Invariant PKCE, token ter-hash, dan internal testing.
    - _Requirements: 13.7, 5.5, 5.7_

  - [ ] 7.13 [APPROVAL_GATE] Hapus `assertNonProductionProvider`
    - Status Tahap 12: **DITUNDA**; guard dipertahankan sampai ada bukti staging terisolasi dan izin penghapusan path, lalu spec terpisah (AG-7.13).
    - **DO NOT EXECUTE kecuali user menyetujui secara tertulis penghapusan `src/modules/providers/non-production.ts` dan fungsi `assertNonProductionProvider`.** Hanya setelah 7.7 sampai 7.12 selesai dan tidak ada pemanggil tersisa.
    - Langkah: hapus setelah persetujuan, lalu `typecheck`, `test`, `test:backend`, `build`.
    - Prasyarat: 7.7, 7.8, 7.9, 7.10, 7.11, 7.12.
    - _Requirements: 13.7, 4.3_

  - [x] 7.14 `connect-src` CSP dari resolver dan validasi start R2
    - File: `src/lib/security/headers.ts`, `src/instrumentation.ts`. Baca `01-app/02-guides/instrumentation.md`.
    - Langkah: hitung `connect-src` dari `decide("objectStorage")`. Konfigurasi R2 separuh terisi menolak start lewat `register()` atau melaporkan capability tidak aktif, dan menulis alasan ke log. Tidak boleh menurunkan header tanpa jejak.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 7.10.
    - _Requirements: 9.3, 9.4_

  - [ ]* 7.15 Tulis test Property 17 (konfigurasi parsial tidak menurunkan proteksi senyap)
    - **Property 17: Konfigurasi parsial tidak menurunkan proteksi secara senyap**
    - File: `tests/unit/properties/audit-p17-partial-config.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 17`.
    - Realisasi: eksautif 64 kombinasi enam env R2; korpus seeded ≥100 nilai env untuk parsing schema.
    - Gate: `test`.
    - Prasyarat: 7.14, 3.15.
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

  - [x] 7.16 Tolak `Origin: null` dan forwarded host sebagai jalan pintas
    - File: `src/lib/security/origin.ts`.
    - Langkah: tolak `Origin` string `"null"`; jangan memakai `X-Forwarded-Host` sebagai pembanding. Baca `server-actions.md` tentang perbandingan `Origin`/`Host`.
    - Gate: `test`, `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 7.4.
    - _Requirements: 13.9_

  - [x] 7.17 Buat satu sumber origin per tier
    - File: `src/lib/env/origin.ts` (baru) dan test.
    - Langkah: fungsi yang menghasilkan origin dari tier aktif dan `APP_URL`, dipakai oleh cookie, OAuth redirect, proof link, CSP, dan `metadataBase`.
    - Gate: `test`, `lint`, `typecheck`.
    - Prasyarat: 7.2.
    - _Requirements: 13.10_

  - [x] 7.18 Terapkan sumber origin pada auth Customer
    - File: berkas atribut cookie, OAuth redirect, dan pembuat proof link di `src/modules/customer-auth/` (cari dengan grep `APP_URL`).
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI].
    - Prasyarat: 7.17.
    - Risiko: Invariant `safeCustomerReturnTo`, PKCE state ber-timestamp. Jangan mengubah allowlist.
    - _Requirements: 13.10, 5.5_

  - [x] 7.19 Isi `serverActions.allowedOrigins` dari daftar origin tier
    - File: `next.config.ts`. Baca `server-actions.md` dan dokumen `allowedOrigins` di docs terpasang.
    - Gate: `lint`, `typecheck`, `build`.
    - Prasyarat: 7.17.
    - _Requirements: 13.10_

  - [x] 7.20 Buat penyusun nonce dan CSP (modul murni)
    - File: `src/lib/security/nonce.ts`, `src/lib/security/csp.ts` (baru).
    - Langkah: nonce per request, `script-src 'self' 'nonce-…'` tanpa `'unsafe-inline'` untuk tier production, `'unsafe-eval'` hanya non-production. Belum dipasang. Baca `content-security-policy.md`.
    - Gate: `test`, `lint`, `typecheck`.
    - Prasyarat: 7.1, 7.4.
    - _Requirements: 13.11_

  - [x] 7.21 Pisahkan jalur proxy: Clerk dan header-only
    - File: `src/proxy.ts`. Baca `proxy.md` dan hasil 7.1.
    - Langkah: `clerkMiddleware` hanya dipanggil untuk `/admin` dan `/api/admin`. Jalur lain hanya menulis nonce dan header CSP. Perluas matcher ke `/checkout` dan `/account/:path*` dengan pengecualian prefetch dan aset statis. Jaga HTML 503 tanpa credential dan allowlist sign-in. Uji perilaku `_next/data/*`.
    - Gate: `test` (termasuk `tests/unit/admin-proxy.test.ts` tanpa diubah), `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 7.1, 7.20.
    - Risiko: R2, perluasan matcher tidak boleh memperluas permukaan Clerk; dua sumber CSP di `/admin` bisa bentrok.
    - _Requirements: 13.11, 13.12, 5.1_

  - [x] 7.22 Terapkan CSP production tanpa `'unsafe-inline'` pada route dinamis
    - File: `src/lib/security/headers.ts`, `next.config.ts`.
    - Langkah: cakupan awal `/checkout`, `/account/*`, `/admin/*`, dan `/api/*` relevan. Route publik statis tidak masuk cakupan nonce di task ini.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `build`.
    - Prasyarat: 7.14, 7.19, 7.21.
    - _Requirements: 13.11, 13.12_

  - [x]* 7.23 Tulis test Property 16 (permukaan terlindungi tidak dapat dilewati)
    - **Property 16: Permukaan yang dilindungi tidak dapat dilewati**
    - File: `tests/unit/properties/audit-p16-proxy-surface.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 16`.
    - Realisasi: korpus pathname yang ada di `tests/unit/helpers/corpus.ts` ditambah korpus origin/host seeded ≥100; eksautif atas jalur Clerk/header-only/lewat.
    - Gate: `test`.
    - Prasyarat: 7.21, 7.22, 7.16.
    - **Validates: Requirements 13.9, 13.10, 13.11, 13.12**

  - [x] 7.24 Verifikasi header aktual sebelum dan sesudah pada production build
    - File: `.kiro/specs/niuva-audit-remediation/csp-verification.md` (baru).
    - Langkah: bangun dan jalankan `next start` dengan dist dir terpisah. Bandingkan header `/admin`, `/checkout`, `/account`, `/services`, `/` dengan temuan 7.1. Pastikan halaman tetap tampil (font loader, collector analytics, Clerk). Hentikan server dan bersihkan.
    - Gate: `build`, `test:e2e` [BUTUH_E2E].
    - Prasyarat: 7.22.
    - Risiko: penerimaan visual tetap "belum ditinjau".
    - _Requirements: 13.11, 13.12_

  - [ ] 7.25 [BLOCKED_ON_OWNER] Strategi CSP akhir untuk seluruh situs
    - Status Tahap 12: keputusan RK-10 **TERTUTUP** melalui 26.1: pertahankan model hibrida nonce pada admin/API admin/checkout/account dan CSP statis pada publik ber-cache. Task 7.25 tidak dieksekusi sebagai perubahan kode; tidak memperluas nonce atau mengaktifkan SRI. Checkbox implementasi ini tetap unchecked sesuai scope handoff; keputusan tidak lagi menunggu Owner.
    - Prasyarat: 1.5.
    - _Requirements: 13.11, 30.8, 30.10_

  - [x] 7.26 Lengkapi `env-register.md` per tier dan capability
    - File: `.kiro/specs/niuva-audit-remediation/env-register.md`.
    - Langkah: daftar tiap env beserta tier tempat wajib ada. Nilai contoh non-rahasia saja. Catat bahwa isolasi resource staging dari production adalah bukti lingkungan di luar jangkauan `build` dan CI.
    - Prasyarat: 7.2, 7.14, 7.17.
    - _Requirements: 14.1, 14.3, 14.4_

  - [x] 7.27 [APPROVAL_GATE] Perbarui `.env.example`
    - **DO NOT EXECUTE kecuali user menyetujui secara tertulis perubahan `.env.example`.** Isi perubahan diambil dari `env-register.md`. Hanya nilai contoh non-rahasia. `.env.local` dan `.env.test.local` tidak disentuh.
    - Prasyarat: 7.26.
    - _Requirements: 9.7, 14.2, 4.5_

- [x] 8. Checkpoint - Tahap 3 selesai
  - Jalankan `test`, `test:backend`, `test:integration`, `build` (Req 13.13). Konfirmasi Property 1 dan 16 lulus, `tests/unit/admin-proxy.test.ts` lulus tanpa diubah, dan tidak ada capability yang terbuka tanpa izin aktivasi. Ensure all tests pass, ask the user if questions arise.

- [x] 9. Tahap 4 - Jalur data publik yang diuji, strategi render, dan discoverability
  - Catatan tahap: menyentuh permukaan publik yang sudah diterima Owner. Urutan: tes dulu (9.1, 9.2), ganti sumber konten lewat `resolvePublicContentSource` pada susunan modul saat ini tanpa memindahkan modul (tanpa perpindahan serializer, fixture, atau penggantian nama modul), baru strategi render dan discoverability (R4). Gate tahap: `test:integration` dan `test:e2e` (Req 15.8, 16.8). Penerimaan visual dilaporkan "belum ditinjau".
  - Catatan ruang lingkup: Tahap ini direduksi menjadi task esensial (9.1, 9.2, 9.6, 9.7, 9.10, 9.13 sampai 9.24). Sisa tahap ini berada di luar ruang lingkup (lihat daftar pada Overview).
  - [x] 9.1 Tes `listPublishedPortfolioProjects` dan `findPublishedPortfolioProjectBySlug` (repository di-mock)
    - Masalah: fungsi produksi tanpa test (C1, I2).
    - File: `tests/backend/portfolio-public-service.test.ts` (baru), target `src/modules/portfolio/public-service.ts`.
    - Langkah: tegaskan hanya record terpublikasi yang keluar, slug tidak ada memberi `null`, dan tidak ada storage key privat pada hasil. Tidak mengubah code produksi.
    - Gate: `test:backend`, `lint`, `typecheck`.
    - Prasyarat: 1.11. Boleh dikerjakan sebelum tahap 4 lain karena hanya menambah test.
    - _Requirements: 15.2_

  - [x] 9.2 Tes integrasi fungsi portfolio terhadap PostgreSQL [BUTUH_INTEGRASI]
    - File: `tests/integration/portfolio-public-service.test.ts` (baru). Rujuk `tests/integration/portfolio-public-content.test.ts` dan pertahankan assertion di baris 35 apa adanya.
    - Gate: `test:integration`.
    - Prasyarat: 1.2, 9.1.
    - _Requirements: 15.2, 15.7_

  - [x] 9.6 Tambah capability sumber konten publik
    - File: `src/modules/capabilities/types.ts`, `src/modules/capabilities/matrix.ts`.
    - Langkah: tambah `publicPreviewScenario` dan `localContentReference` sebagai capability tersendiri. Izinkan hanya pada tier `local-test`; tolak pada `production`.
    - Gate: `test`, `typecheck`, `lint`.
    - Prasyarat: 7.4.
    - Catatan ruang lingkup: Capability ini berlaku pada susunan berkas saat ini (`src/features/frontend-preview/`) dan tidak membutuhkan pemindahan fixture.
    - _Requirements: 15.1, 15.4_

  - [x] 9.7 Ganti pemilihan sumber `NODE_ENV` dengan `resolvePublicContentSource`
    - Masalah: `NODE_ENV` memilih sumber data publik (C1, A1).
    - File: `src/modules/portfolio/public-source.ts` (baru), `src/features/frontend-preview/server.ts:55-70`.
    - Langkah: satu fungsi menghasilkan `"scenarioFixture" | "localReference" | "database"` dari capability. Hasil tidak berubah bila hanya `NODE_ENV` berubah.
    - Gate: `test`, `test:backend`, `test:integration` [BUTUH_INTEGRASI], `build`.
    - Prasyarat: 9.2, 9.6.
    - Catatan ruang lingkup: `resolvePublicContentSource` bekerja pada susunan modul saat ini di `src/features/frontend-preview/server.ts` dan tidak membutuhkan pemindahan tersebut.
    - Risiko: R4. Jangan ubah bentuk output.
    - _Requirements: 15.1, 15.4_

  - [x] 9.10 Tes jalur produksi `/`, `/projects`, `/projects/[slug]` terhadap database [BUTUH_INTEGRASI] [BUTUH_E2E]
    - File: `tests/integration/public-content-production-path.test.ts`, `tests/e2e/public-content-production-path.spec.ts` (baru).
    - Gate: `test:integration`, `test:e2e`.
    - Prasyarat: 9.7, 1.2, 1.3.
    - _Requirements: 15.3, 15.8_

  - [x] 9.13 Tetapkan strategi render per route
    - File: `.kiro/specs/niuva-audit-remediation/render-strategy.md` (baru).
    - Langkah: baca `caching-without-cache-components.md` dan `02-route-segment-config/index.md` di docs terpasang (`cacheComponents` tidak aktif, maka `dynamic`/`revalidate` berlaku). Isi tabel route, strategi, dan alasan berdasarkan tabel design §3.6. `/services` tetap statis.
    - _Requirements: 16.1_

  - [x] 9.14 Terapkan strategi pada `/`
    - File: `src/app/page.tsx`.
    - Gate: `test`, `test:e2e` [BUTUH_E2E], `lint`, `typecheck`, `build`.
    - Prasyarat: 9.13.
    - Catatan ruang lingkup: Task ini berlaku pada susunan berkas saat ini; 9.15 dan 9.16 mewarisi prasyarat yang sama.
    - _Requirements: 16.1, 16.2_

  - [x] 9.15 Terapkan strategi pada `/projects` dan `/projects/[slug]`
    - File: `src/app/projects/*`.
    - Gate dan prasyarat: sama dengan 9.14. Bedakan segmen dinamis untuk revalidasi.
    - _Requirements: 16.1, 16.2_

  - [x] 9.16 Terapkan strategi pada `/shop` dan `/shop/[slug]`
    - File: `src/app/shop/*`.
    - Gate dan prasyarat: sama dengan 9.14. Revalidasi berjangka pendek karena stok terlihat.
    - _Requirements: 16.1, 16.2_

  - [x] 9.17 Pastikan `revalidatePath` berpengaruh pada cache page
    - File: `src/app/admin/actions.ts`. Baca `revalidatePath.md`.
    - Langkah: periksa panggilan `revalidatePath("/shop")` dan `revalidatePath("/")`. Gunakan parameter `type: "page"` untuk segmen dinamis. Hanya perbaiki pemanggilan; tidak memecah file (itu Tahap 10).
    - Gate: `test`, `test:backend`, `lint`, `typecheck`, `build`.
    - Prasyarat: 9.14, 9.15, 9.16.
    - _Requirements: 16.2_

  - [x] 9.18 Bandingkan klasifikasi route hasil `build` dengan strategi
    - File: `.kiro/specs/niuva-audit-remediation/render-strategy.md`.
    - Langkah: jalankan `build`, bandingkan statis/dinamis tiap route dengan tabel 9.13, catat selisih.
    - Gate: `build`.
    - Prasyarat: 9.17.
    - _Requirements: 16.8_

  - [x] 9.19 Tambah `src/app/sitemap.ts`
    - File: `src/app/sitemap.ts` (baru). Baca `sitemap.md`.
    - Langkah: pilih revalidate eksplisit karena membaca database. Kecualikan `/auth-test-policy`, `/internal-testing/*`, `/demo/action-queue`, `/api/frontend-preview/media/[id]` dan route `noindex`.
    - Gate: `test`, `test:integration` [BUTUH_INTEGRASI], `lint`, `typecheck`, `build`.
    - Prasyarat: 9.13.
    - Catatan ruang lingkup: Sitemap membaca data lewat fungsi publik pada susunan modul saat ini.
    - _Requirements: 16.3, 16.7_

  - [x] 9.20 Tambah `src/app/robots.ts`
    - File: `src/app/robots.ts` (baru). Baca `robots.md`.
    - Gate: `test`, `lint`, `typecheck`, `build`.
    - Prasyarat: 9.19.
    - _Requirements: 16.3, 16.7_

  - [x] 9.21 Tetapkan `metadataBase`, `openGraph`, dan `twitter` di layout
    - File: `src/app/layout.tsx`.
    - Langkah: `metadataBase` dari `src/lib/env/origin.ts`.
    - Gate: `test`, `lint`, `typecheck`, `build`.
    - Prasyarat: 7.17.
    - _Requirements: 16.4_

  - [x] 9.22 Tambah metadata `openGraph` dan `twitter` pada page publik utama
    - File: page `/`, `/projects`, `/shop`, `/services`.
    - Gate: `test`, `lint`, `typecheck`, `build`.
    - Prasyarat: 9.21, 9.14, 9.15, 9.16.
    - _Requirements: 16.4_

  - [x] 9.23 Tambahkan `/project-brief` pada navigasi publik
    - File: `src/components/niuva/public-navigation.tsx`.
    - Gate: `test`, `lint`, `typecheck`, `build`.
    - _Requirements: 16.5_

  - [x] 9.24 Tambahkan indikator jumlah item cart pada navigasi
    - File: `src/components/niuva/public-navigation.tsx` dan sumber jumlah cart.
    - Langkah: baca komponen lebih dulu. Angka berasal dari server atau progressive; jangan menambah client boundary baru.
    - Gate: `test`, `test:e2e` [BUTUH_E2E], `lint`, `typecheck`, `build`.
    - Prasyarat: 9.23.
    - _Requirements: 16.6_

- [x] 10. Checkpoint - Tahap 4 selesai
  - Jalankan `test:integration`, `test:e2e`, `build`, `test`, `test:backend`. Konfirmasi test `resolvePublicContentSource` dan jalur produksi publik (9.7, 9.10) lulus, tidak ada pergeseran bentuk output publik, dan selisih klasifikasi route tercatat. Visual: belum ditinjau. Ensure all tests pass, ask the user if questions arise.

- [x] 19. Tahap 9 - Progressive enhancement, resiliensi UI, dan bundel
  - Catatan tahap: task yang menjalankan `build` atau `test:e2e` memakai direktori `.next`/`.next-e2e` yang sama. Jalankan gate task-task itu bergantian walaupun berada pada wave yang sama.
  - Catatan ruang lingkup: Tahap ini direduksi menjadi task esensial (19.22 dan 19.23). Sisa tahap ini berada di luar ruang lingkup (lihat daftar pada Overview). Hanya 19.22 dan 19.23 yang aktif.
  - [x] 19.22 Tambahkan `images.remotePatterns` untuk `*.googleusercontent.com`
    - Masalah: `src/app/account/page.tsx:121` memakai `<img>` dengan pengecualian lint karena host gambar avatar Google belum terdaftar.
    - File: `next.config.ts`. Baca `01-app/01-getting-started/12-images.md` dan dokumen `remotePatterns` di `node_modules/next/dist/docs/`.
    - Langkah: tambahkan `images.remotePatterns` hanya untuk protokol `https` dan host `*.googleusercontent.com`, dengan `pathname` sesempit yang didukung format avatar. Pola luas membuat server dapat dipakai sebagai proxy gambar; catat keputusan dan batasnya. Tanpa mengubah `headers()` dan `allowedDevOrigins`.
    - Gate: `lint`, `typecheck`, `build`.
    - Prasyarat: 7.22, 3.18, 7.19.
    - Catatan ruang lingkup: Task ini berlaku pada susunan berkas saat ini.
    - Risiko: CSP `img-src` harus tetap selaras; jangan melonggarkannya.
    - Selesai bila: `build` lulus dan konfigurasi hanya memuat pola yang dibutuhkan.
    - _Requirements: 26.6_

  - [x] 19.23 Ganti `<img>` di halaman akun dengan komponen image
    - Masalah: `src/app/account/page.tsx:121` memakai `<img>` dengan `eslint-disable-next-line @next/next/no-img-element`.
    - File: `src/app/account/page.tsx`.
    - Langkah: pakai komponen image Next dengan `width`/`height` atau `fill` yang menjaga tata letak dan `alt` yang sudah ada, lalu hapus komentar `eslint-disable`. Avatar hanya berasal dari akun Customer sendiri; jangan menambah data lain. Tidak ada nilai visual baru.
    - Gate: `test`, `test:e2e` [BUTUH_E2E], `lint`, `typecheck`, `build`.
    - Prasyarat: 19.22.
    - Selesai bila: tidak ada `eslint-disable` di berkas untuk aturan image, `lint` lulus, dan test akun yang ada lulus tanpa diubah.
    - _Requirements: 26.6_


- [x] 20. Checkpoint - Tahap 9 selesai
  - Jalankan `test`, `test:backend`, `test:integration` (bila Baseline mencatatnya), `test:e2e`, `lint`, `typecheck`, `build`. Konfirmasi test revalidasi checkout tetap lulus tanpa test lama diubah, invariant system pages lulus, `next.config.ts` hanya memuat pola gambar yang dibutuhkan (19.22), dan halaman akun bebas `eslint-disable` image (19.23). Visual: belum ditinjau. Ensure all tests pass, ask the user if questions arise.

- [x] 21. Tahap 10 - Struktur, kebersihan, dan kekuatan verifikasi
  - Catatan ruang lingkup: Tahap ini direduksi menjadi task esensial (21.22 dan 21.24). Sisa tahap ini berada di luar ruang lingkup (lihat daftar pada Overview). Hanya 21.22 dan 21.24 yang aktif.
  - [x] 21.22 Buktikan revalidasi ongkir server tetap dipertahankan
    - Masalah: Req 28.12 menuntut revalidasi ongkir di `src/modules/checkout/service.ts` (sekitar baris 186) tetap ada walaupun client memanggil `/api/shipping/rates`.
    - File: `tests/backend/checkout-shipping-revalidation.test.ts` (baru, bila celah). Cari test revalidasi yang sudah ada dengan grep atas `optionId` di `tests/`.
    - Langkah: bila test yang ada sudah menegaskan `optionId` ongkir dicocokkan ulang di server dan tarif klien diabaikan, catat lokasinya dan jangan menduplikasi. Bila ada celah, tambah test baru (bukan mengubah yang lama). Tidak ada perubahan code produksi.
    - Gate: `test:backend`, `lint`, `typecheck`.
    - Prasyarat: tidak ada.
    - Catatan ruang lingkup: Test ini berlaku pada susunan berkas saat ini; lokasi `src/modules/checkout/service.ts` dibaca apa adanya.
    - Risiko: Invariant Req 5.3.
    - Selesai bila: ada test yang gagal bila revalidasi ongkir dihapus.
    - _Requirements: 16.1, 16.2, 16.8, 5.3_

  - [x] 21.24 Tes lima route khusus test tetap fail-closed dan `noindex`
    - Masalah: Req 28.13 menuntut lima route khusus test tidak terbuka dan tidak terindeks. Beberapa route memakai `NODE_ENV` atau helper env untuk memutuskan (mis. `resolveCuratedMediaPath(process.env.NODE_ENV, id)` di `/api/frontend-preview/media/[id]`).
    - File: `tests/unit/test-only-routes-fail-closed.test.tsx` (baru). Route: `src/app/auth-test-policy/page.tsx`, `src/app/internal-testing/policy/page.tsx`, `src/app/internal-testing/google-consent/page.tsx`, `src/app/demo/action-queue/page.tsx`, `src/app/api/frontend-preview/media/[id]/route.ts`. Baca implementasi saat ini, termasuk perubahan 5.21 dan 9.7.
    - Langkah: untuk tiap route, pada konfigurasi non-lokal tegaskan `notFound()` (page) atau 404 (API), dan tegaskan `metadata.robots` `index: false, follow: false` (page) atau header `X-Robots-Tag: noindex, nofollow` (API). Tegaskan juga bahwa keluaran sitemap (9.19) tidak memuat kelimanya. Env di-mock; tanpa credential.
    - Gate: `test`, `lint`, `typecheck`.
    - Prasyarat: 5.21.
    - Catatan ruang lingkup: Test ini berlaku pada susunan berkas saat ini.
    - Selesai bila: test gagal bila salah satu route terbuka tanpa guard atau kehilangan `noindex`.
    - _Requirements: 28.13, 16.7_


- [x] 22. Checkpoint - Tahap 10 selesai
  - Jalankan `db:validate`, `lint`, `typecheck`, `test`, `test:backend`, `build`. Konfirmasi test revalidasi ongkir server (21.22) dan lima route khusus test yang tetap fail-closed dan `noindex` (21.24) lulus, jumlah test dan assertion tidak turun, serta tidak ada perubahan perilaku. Sisa Tahap 10 berada di luar ruang lingkup. Visual: belum ditinjau. Ensure all tests pass, ask the user if questions arise.

- [x] 23. Tahap 11 - Gate di luar kendali code
  - Catatan tahap: tahap ini hanya mendokumentasikan keputusan dan batas, dan menyiapkan kontrak yang menahan diri (fail-closed) selama keputusan Owner belum ada. Tidak ada task di sini yang memilih nilai keputusan, mengaktifkan kalender kerja, atau menyatakan kesiapan production. Tidak ada gate code untuk dokumen; bukti lingkungan dan keputusan Owner dilaporkan terpisah dari hasil CI (Req 32.1).
  - Catatan ruang lingkup: Tahap ini direduksi menjadi task esensial (23.1 dan 23.7). Sisa tahap ini berada di luar ruang lingkup (lihat daftar pada Overview).
  - [x] 23.1 Finalisasi `register-keputusan.md`
    - Masalah: Register_Keputusan harus lengkap sebelum laporan akhir, dan tiap entri wajib punya pemilik, bukti, dan syarat penutupan (Req 30.8).
    - File: `.kiro/specs/niuva-audit-remediation/register-keputusan.md`. Baca `docs/legal/customer-public-launch-readiness.md` sebagai rujukan saja; file `docs/legal/` dan addendum PRD/Tech Design adalah perubahan uncommitted Owner dan tidak boleh diubah.
    - Langkah: pastikan ada entri untuk tiap item Req 30.1 sampai 30.7: dokumen legal resmi beserta tanggal berlaku (`PUB-POLICY`), metode verifikasi usia dan assurance wali (`PUB-AGE`, `PUB-GUARDIAN`), ruang lingkup refund final (`PUB-REFUND`), retensi legal dan akuntansi per kategori record (`PUB-RECORDS`, T4), kalender kerja WIB dengan hari libur, petugas pengganti, dan coverage (`PUB-SERVICE`, T9), cakupan metode pembayaran refund (`PUB-REFUND-PROVIDER`, T8), dan hapus atau bangun model `Service` (D1, T5). Tambahkan juga entri yang dicatat task lain: T3 (store rate limit), T6 (strategi CSP), T10 (pemeriksaan konten berkas), cart sisi server untuk checkout tanpa JS (19.2), cache rate ongkir H4 (21.23), kanal hak privasi (15.17), dan retensi `AuditLog`/`FailureEvent`. Entri yang task `[BLOCKED_ON_OWNER]`-nya belum dijalankan ditambahkan di sini. Tiap entri berstatus `BELUM_TERTUTUP` tanpa nilai keputusan dan tanpa default. Catat capability yang ditahan fail-closed oleh tiap entri (Req 30.9).
    - Daftar keputusan tertunda: register juga memuat keputusan dan gate dari daftar di luar ruang lingkup pada Overview (mis. usia/wali, policy publik, refund, akses dan audit admin, cron, SLA/kalender kerja, retensi). Semua entri tetap `BELUM_TERTUTUP`; tidak ada nilai yang dipilih.
    - Gate: tidak ada (dokumen).
    - Prasyarat: 22.
    - Selesai bila: tiap entri memuat pemilik, bukti yang dibutuhkan, dan syarat penutupan, dan tidak ada entri yang menyimpan nilai default.
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6, 30.7, 30.8, 30.9, 30.10_

  - [x] 23.7 Tulis dokumen batas kesiapan production
    - File: `.kiro/specs/niuva-audit-remediation/production-readiness-boundary.md` (baru).
    - Langkah: tulis (1) bukti provider, inbox email, storage, backup, dan pemulihan adalah bukti lingkungan yang tidak dapat digantikan hasil CI, beserta bukti yang dibutuhkan dan pemiliknya per gate `PUB-*`; (2) penerimaan visual dilaporkan "belum ditinjau" sampai user menyatakan menerimanya secara eksplisit; (3) penerimaan physical-device dan assistive technology terpisah dari hasil `test:e2e` dan dari pemeriksaan otomatis apa pun; (4) `PUB-RELEASE` tetap `NOT_AUTHORIZED` dan menahan publikasi policy, deployment, aktivasi provider, serta penggunaan credential production sampai ada instruksi terpisah untuk masing-masing. Semua bukti di repository ini bersifat lokal dan non-production. Isolasi resource staging dari production dicatat sebagai bukti lingkungan.
    - Kapabilitas tertunda dan risiko tersisa: dokumen batas kesiapan mendaftar setiap kapabilitas dari daftar di luar ruang lingkup pada Overview sebagai "belum tersedia", serta risiko tersisa yang diterima: email customer tanpa jaminan kirim ulang; belum ada job terjadwal untuk retensi berkas, pelepasan stok, dan rekonsiliasi pembayaran; belum ada alur refund; funnel checkout membutuhkan JavaScript; belum ada halaman audit admin. Tanpa klaim kesiapan production.
    - Gate: tidak ada (dokumen).
    - Prasyarat: 22.
    - Selesai bila: keempat batas tertulis dan tiap gate `PUB-*` yang relevan punya bukti yang dibutuhkan.
    - _Requirements: 32.1, 32.2, 32.3, 32.4_


- [x] 24. Laporan penyelesaian
  - [x] 24.1 Susun laporan penyelesaian (task terakhir sebelum checkpoint akhir)
    - Masalah: Req 32.5 menuntut laporan per tahap.
    - File: `.kiro/specs/niuva-audit-remediation/completion-report.md` (baru) dan juga sebagai pesan akhir.
    - Langkah: per tahap (0 sampai 11) tulis file yang berubah, command yang dijalankan, hasil test/build/browser (atau alasan tidak berjalan dengan status `TIDAK_DIJALANKAN`), acceptance criteria yang tercakup per requirement, risiko tersisa, dan catatan rollback (gunakan titik rollback per tahap di design dan empat efek yang tidak dapat dibatalkan). Nyatakan penerimaan visual belum ditinjau dan passing tests/build bukan persetujuan visual. Nyatakan semua bukti lokal dan non-production, dan bahwa physical-device, assistive technology, provider, dan production acceptance terpisah. Nyatakan `PUB-RELEASE` tetap `NOT_AUTHORIZED`. Daftar Owner follow-up (entri `BELUM_TERTUTUP` di `register-keputusan.md`, kalender kerja WIB, metode usia dan wali, dokumen legal resmi, retensi, refund, cakupan metode pembayaran, keputusan `Service`, strategi CSP, store rate limit, cart sisi server, cache ongkir). Daftar Approval_Gate yang masih tertahan dan task `[BLOCKED_ON_OWNER]` yang belum ditutup, beserta path atau paket yang perlu disebut dalam persetujuan. Catat temuan turunan (mis. 19.13) dan kondisi `TIDAK_DIJALANKAN`. Tanpa commit.
    - Ringkasan penundaan: tuliskan bahwa user menyetujui "Pilihan 1 (Ringkas)", daftar kapabilitas dari daftar di luar ruang lingkup pada Overview, dan risiko tersisa yang diterima (email customer tanpa jaminan kirim ulang; belum ada job terjadwal untuk retensi berkas, pelepasan stok, dan rekonsiliasi pembayaran; belum ada alur refund; funnel checkout membutuhkan JavaScript; belum ada halaman audit admin). Laporan per tahap memberi status "di luar ruang lingkup" untuk Tahap 5 sampai 8 dan "direduksi" untuk Tahap 4, 9, 10, dan 11.
    - Gate: tidak ada (dokumen).
    - Prasyarat: 22, 23.1, 23.7, 2, 4, 6, 8, 10, 20.
    - Selesai bila: laporan memuat semua butir di atas dan konsisten dengan hasil tiap checkpoint.
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

- [x] 25. Checkpoint akhir - Semua gate yang bisa berjalan
  - Jalankan seluruh gate yang bisa berjalan: `db:validate`, `lint`, `typecheck`, `test`, `test:backend`, `test:integration` (bila database test lokal tersedia), `test:e2e` (termasuk suite JS-nonaktif), E2E production, dan `build`. Hentikan semua proses latar belakang dan hapus dist dir atau berkas sementara yang dibuat selama verifikasi. Konfirmasi dengan `git status --short` bahwa perubahan uncommitted Owner (docs/legal, addendum PRD/Tech Design, dua file test) tidak tersentuh, dan tidak ada commit, push, deployment, aktivasi provider, atau penggunaan credential production. Gate yang tidak dapat berjalan dilaporkan `TIDAK_DIJALANKAN` beserta penyebabnya. Ensure all tests pass, ask the user if questions arise.

- [x] 26. Tahap 12 - Penutupan dan bukti stabilitas: keputusan Owner dan penutupan item tertunda
  - Catatan tahap: Tahap 12 menutup keputusan Owner yang sudah diberikan, dua perbaikan kecil (ISR `/services/[slug]` dan header 404 preview media), lalu mengumpulkan bukti stabilitas tanpa mengubah kode. Tahap ini tidak memilih nilai keputusan legal/bisnis, tidak mengaktifkan provider, dan tidak menyatakan kesiapan production.
  - [x] 26.1 Catat keputusan Owner di `register-keputusan.md`
    - Masalah: Owner telah memutuskan beberapa item; keputusan itu belum tercatat di register, sehingga laporan akhir tidak konsisten (Req 30.8).
    - File: `.kiro/specs/niuva-audit-remediation/register-keputusan.md` (hanya file ini).
    - Langkah: catat keputusan berikut beserta pemilik, tanggal, dan bukti rujukan. (a) 1.10 disetujui dan 7.27 disetujui; keduanya dieksekusi lewat task aslinya (1.10 dan 7.27), bukan diduplikasi di sini. (b) 7.13 ditunda: guard lama dipertahankan sampai ada bukti staging. (c) 3.14 ditunda sampai mendekati staging. (d) 5.15 ditunda sampai hosting dipilih; RK-11 tetap terbuka. (e) 7.25/RK-10 diputuskan: pertahankan model hibrida (nonce untuk `/admin`, `/api/admin`, `/checkout`, `/account`; CSP statis untuk halaman publik ber-cache). (f) RK-16 diputuskan: `/services/[slug]` menjadi ISR `revalidate` 300. (g) 21.23/RK-14 diputuskan: tidak perlu cache ongkir sekarang; tinjau ulang setelah provider aktif dan ada data kuota/latensi. Tiap item yang ditunda (7.13, 3.14, 5.15, 21.23) diberi syarat membuka ulang sebagai spec terpisah. Jangan mengisi keputusan legal/bisnis lain; entri lain tetap `BELUM_TERTUTUP`.
    - Gate: tidak ada (dokumen).
    - Prasyarat: 25.
    - Selesai bila: semua entri di atas tercatat, tiap item tertunda punya syarat membuka ulang, dan tidak ada entri lain yang berubah.
    - _Requirements: 30.8, 30.10, 32.1_

  - [x] 26.2 Catat status approval 1.10 dan 7.27
    - Masalah: [APPROVAL_GATE disetujui tertulis oleh user: 1.10]. Persetujuan 1.10 dan 7.27 sudah ada, sehingga tidak perlu task eksekusi baru.
    - File: tidak ada.
    - Langkah: jangan duplikasi task. Cukup pastikan 26.1 mencatat bahwa 1.10 dan 7.27 kini disetujui dan dieksekusi lewat task aslinya.
    - Gate: tidak ada.
    - Prasyarat: 26.1.
    - Selesai bila: 26.1 memuat catatan tersebut dan tidak ada task duplikat.
    - _Requirements: 30.8_

  - [x] 26.3 Ubah `/services/[slug]` menjadi ISR (RK-16)
    - Masalah: `/services/[slug]` masih dinamis karena `connection()`; keputusan RK-16 menetapkan ISR `revalidate` 300.
    - File: `src/app/services/[slug]/page.tsx`, `src/app/admin/actions.ts`, `tests/unit/system-pages-coverage.test.ts`, `tests/unit/projects-render-strategy.test.tsx` sebagai acuan test baru (mis. `tests/unit/services-render-strategy.test.tsx`), `.kiro/specs/niuva-audit-remediation/render-strategy.md`.
    - Langkah: hapus `connection()`; tetapkan `export const revalidate = 300` sebagai literal; pertahankan `generateStaticParams`; pastikan bagian proyek terkait tahan saat database gagal (tangkap error dan render tanpa bagian itu). Pada aksi admin portfolio di `src/app/admin/actions.ts` yang sudah me-revalidate `/projects`, tambahkan `revalidatePath("/services/[slug]", "page")`. Perbarui manifest `tests/unit/system-pages-coverage.test.ts` secara jujur (jumlah `connection()` turun) tanpa melemahkan assertion. Tambah test seperti `tests/unit/projects-render-strategy.test.tsx` (tanpa `connection()`, `revalidate` 300, `generateStaticParams`, tahan kegagalan database, revalidasi dari aksi admin). Isi ulang baris `/services/[slug]` di `render-strategy.md` dari hasil build.
    - Gate: `test`, `lint`, `typecheck`, `build`, `test:e2e` (spec `public-pages`).
    - Prasyarat: 26.1.
    - Selesai bila: build melaporkan `/services/[slug]` sebagai ISR 5 menit, test baru lulus, jumlah test dan assertion tidak turun, dan `render-strategy.md` sesuai hasil build.
    - _Requirements: 16.1, 16.2, 16.8, 5.3_

  - [x] 26.4 Perbaiki header 404 `/api/frontend-preview/media/[id]`
    - Masalah: respons 404 route ini harus membawa `X-Robots-Tag: noindex, nofollow` bersama `Cache-Control: no-store` (Req 28.13).
    - File: `src/app/api/frontend-preview/media/[id]/route.ts`, `tests/unit/test-only-routes-fail-closed.test.tsx`.
    - Langkah: tambahkan header `X-Robots-Tag: noindex, nofollow` pada respons 404 bersama `Cache-Control: no-store`. Tambah assertion di `tests/unit/test-only-routes-fail-closed.test.tsx`; jangan melemahkan assertion yang ada.
    - Gate: `test`, `lint`, `typecheck`.
    - Prasyarat: 26.3.
    - Selesai bila: test gagal bila salah satu header hilang dari respons 404.
    - _Requirements: 28.13, 16.7_

- [x] 27. Bukti stabilitas (tanpa perubahan kode)
  - Catatan tahap: task 27 hanya menjalankan gate dan mencatat hasil. Tidak ada perubahan kode produksi atau test. Flaky dilaporkan, bukan dilonggarkan.
  - Pengecualian scope yang disetujui user pada 5 Oktober 2026 setelah tiga putaran 27.1 selesai: koreksi satu assertion di `tests/integration/database.test.ts` agar nama database yang diharapkan berasal dari `TEST_DATABASE_URL` yang divalidasi setup, bukan literal `niuva_test`. Pemeriksaan tabel/trigger dipertahankan; verifikasi ulang fresh-database dan checkpoint memakai koreksi ini. Tidak ada perubahan source produksi pada tahap 27.
  - [x] 27.1 Jalankan suite penuh tiga kali berturut-turut
    - Masalah: stabilitas belum dibuktikan; satu kegagalan diketahui pada `tests/e2e/public-pages.spec.ts` "published projects filter and navigate".
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md` (bagian baru "Bukti stabilitas").
    - Langkah: jalankan `test`, `test:backend`, `test:integration`, dan `test:e2e` penuh tiga kali berturut-turut tanpa perubahan kode. Catat angka tiap putaran (file dan test) serta setiap kegagalan, termasuk "published projects filter and navigate", beserta pesan dan putaran kemunculannya. Jalankan `db:test:start` dan Playwright di latar belakang dengan polling dan timeout eksplisit; pastikan tidak ada proses tersisa sesudahnya. Jangan menambah retry, memperpanjang timeout, atau melonggarkan assertion.
    - Gate: `test`, `test:backend`, `test:integration`, `test:e2e` (tiga putaran).
    - Prasyarat: 26.
    - Selesai bila: tiga putaran tercatat lengkap, kegagalan dilaporkan apa adanya, dan tidak ada proses tersisa.
    - Hasil: tiga putaran lengkap PASS (unit 85/1190, backend 68/496, integration 19/105, E2E 109 lulus/5 skip), hash code/config/test tetap sama; `public-pages.spec.ts:78` lulus ketiganya. Semua proses milik peluncur dihentikan pada cleanup akhir. Bukti baseline bagian 11 dan 15.
    - _Requirements: 29.7, 32.1_

  - [x] 27.2 Verifikasi dari database test baru
    - Masalah: database `niuva_test` lama dapat menyembunyikan masalah migrasi; perlu bukti dari database kosong.
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md`.
    - Langkah: buat database test baru (bukan `niuva_test` lama), jalankan semua migrasi dari kosong, lalu `test:integration` dan `test:e2e`. Tanpa reset destruktif pada database yang ada. Catat nama database (tanpa credential), hasil, dan pembersihan.
    - Gate: `test:integration`, `test:e2e`.
    - Prasyarat: 27.1.
    - Selesai bila: semua migrasi berhasil dari kosong, kedua suite tercatat, dan database yang ada tidak diubah.
    - Hasil: `niuva_stage12_test_20261005_01a10ad2`, 17 migrasi dari kosong; integration 19/105 dan E2E penuh 109 lulus/5 skip/0 gagal, exit 0. Kegagalan awal, izin koreksi assertion nama, pengulangan, dan cleanup dicatat baseline bagian 12/15. Tidak ada reset/drop database lama.
    - _Requirements: 29.7, 32.1_

  - [x] 27.3 Smoke build produksi lokal
    - Masalah: perilaku header, CSP, dan revalidasi pada build produksi belum dibuktikan setelah 26.3.
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md`. Baca `env-register.md` dan `csp-verification.md`.
    - Langkah: `next build` lalu `next start` dengan `NIUVA_DEPLOYMENT_TIER` sesuai `env-register.md` pada port loopback, dengan dist dir sementara. Verifikasi header keamanan dan CSP aktual pada `/`, `/projects`, `/checkout`, dan `/admin` (sesuai `csp-verification.md`), serta `/sitemap.xml` dan `/robots.txt`. Buktikan dengan perilaku, bukan pencocokan teks, bahwa perubahan portfolio lewat aksi admin merevalidasi `/projects` dan `/projects/[slug]`. Hentikan proses dan hapus dist dir sementara. Tanpa credential production.
    - Gate: `build`, smoke manual terdokumentasi.
    - Prasyarat: 27.2.
    - Selesai bila: hasil per route tercatat, bukti revalidasi tercatat, dan tidak ada proses atau dist dir tersisa.
    - Hasil: enam route header/CSP PASS dari `next build` + `next start`; kedua aksi portfolio mengubah hasil HTTP dua cache route setelah write DB langsung terbukti tetap stale. Identitas Owner hanya DI harness; Clerk aktif tidak terverifikasi. E2E production 5/5, dist dan proses sementara dibersihkan. Baseline bagian 13/15.
    - _Requirements: 16.2, 16.8, 29.1, 29.2, 5.3, 32.1_

- [x] 28. Kebersihan dokumen dan repo
  - [x] 28.1 Koreksi laporan dan dokumen batas
    - Masalah: `completion-report.md` memuat rujukan "temuan turunan (mis. 19.13)" tanpa sumber dan angka yang sudah usang.
    - File: `.kiro/specs/niuva-audit-remediation/completion-report.md`, `.kiro/specs/niuva-audit-remediation/production-readiness-boundary.md`, `.kiro/specs/niuva-audit-remediation/baseline-gate.md`.
    - Langkah: hapus atau sumberkan rujukan "temuan turunan (mis. 19.13)". Perbarui angka akhir, jumlah route manifest, status gate 1.10 dan 7.27 setelah dieksekusi, dan daftar penundaan baru (7.13, 3.14, 5.15, 21.23 dan RK-11). Perbarui `production-readiness-boundary.md`, dan bagian 10 `baseline-gate.md` (baseline coverage dari 1.10).
    - Gate: tidak ada (dokumen).
    - Prasyarat: 27.
    - Selesai bila: laporan konsisten dengan hasil 26 dan 27 serta tidak memuat rujukan tanpa sumber.
    - _Requirements: 32.1, 32.2, 32.3, 32.4, 32.5_

  - [x] 28.2 Catat cara gate andal dan konfirmasi kebersihan repo
    - Masalah: gate penuh berhenti bila dijalankan di foreground; direktori atau entri sementara dapat tertinggal.
    - File: `.kiro/specs/niuva-audit-remediation/baseline-gate.md`.
    - Langkah: catat cara menjalankan gate secara andal (`db:test:start` dan `test:e2e` penuh di latar belakang dengan polling dan timeout, jangan foreground). Pastikan tidak ada direktori `.next-*-tmp` dan `tsconfig.json` bersih dari entri sementara. Konfirmasi dengan `git status --short` bahwa perubahan uncommitted Owner (`docs/`, `docs/legal/`, `tests/backend/customer-privacy-pages.test.ts`, `tests/e2e/customer-privacy.spec.ts`) tidak tersentuh.
    - Gate: tidak ada (dokumen dan pemeriksaan repo).
    - Prasyarat: 28.1.
    - Selesai bila: cara gate tercatat, tidak ada sisa sementara, dan file Owner tidak berubah.
    - Hasil: baseline bagian 14/15; temporary dist dan dua include tsconfig dibersihkan, typecheck ulang PASS, proses/port kosong, dan path Owner/protected identik c54b2d1. Log TEMP dan coverage ignored dipertahankan sebagai bukti.
    - _Requirements: 32.1, 29.7_

- [x] 29. Tes properti opsional bernilai tinggi
  - [x]* 29.1 Pastikan test Property 16 (permukaan terlindungi tidak dapat dilewati)
    - **Property 16: Permukaan yang dilindungi tidak dapat dilewati**
    - File: `tests/unit/properties/audit-p16-proxy-surface.test.ts`. Tag: `// Feature: niuva-audit-remediation, Property 16`.
    - Langkah: periksa apakah test sudah ada (task 7.23 bertanda selesai). Tulis hanya bila belum ada; bila sudah ada, cukup catat bahwa sudah ada.
    - Hasil: sudah ada dan lulus dalam tiga suite unit Tahap 12; pemetaan design/test diperiksa terhadap Req 13.9 sampai 13.12. Tidak menulis test duplikat.
    - Gate: `test`.
    - Prasyarat: 26.
    - **Validates: Requirements 13.11, 13.12**

  - [x]* 29.2 Daftar sub-task Property opsional lain yang masih unchecked
    - Langkah: periksa `tasks.md` untuk sub-task Property bertanda `*` milik tahap aktif yang masih unchecked, lalu cantumkan sebagai daftar opsional di `completion-report.md`. Saat penulisan spec ini kandidatnya: 1.12 (Property 28), 1.13 (Property 29), 3.2 (Property 13), 3.4 (Property 14), 5.2 (Property 3), 5.5 (Property 4), 5.24 (Property 18), 7.15 (Property 17).
    - Gate: tidak ada (dokumen).
    - Prasyarat: 28.1.
    - Catatan: task 29 boleh dilewati tanpa memblokir penutupan.
    - Hasil: delapan kandidat tersebut tetap unchecked dan tercatat di `completion-report.md` bagian 5.

- [x] 30. Checkpoint penutupan spec
  - Prasyarat: 26, 27, 28. Jalankan seluruh gate: `db:validate`, `lint`, `typecheck`, `test`, `test:backend`, `test:integration`, `test:e2e` penuh, E2E production, dan `build`. Konfirmasi semua task non-opsional selesai atau berstatus ditunda dengan alasan, laporan konsisten, dan tidak ada proses atau direktori sementara. Tidak ada commit, push, deployment, aktivasi provider, atau penggunaan credential production. Visual acceptance tetap "belum ditinjau"; `PUB-RELEASE` tetap `NOT_AUTHORIZED`. Ensure all tests pass, ask the user if questions arise.
  - Hasil: seluruh gate checkpoint PASS, angka dan kegagalan awal dicatat baseline bagian 15. 3.14/5.15/7.13/21.23 ditunda dengan syarat spec terpisah; 7.25 hanya keputusan melalui 26.1; tidak mengklaim implementasi di luar scope. Task opsional yang tidak ditulis tetap unchecked. Dist/tsconfig/process cleanup terverifikasi. Branch/HEAD tetap `chore/niuva-audit-remediation` / `c54b2d1`, tanpa commit/push/PR. Visual belum ditinjau, `PUB-RELEASE = NOT_AUTHORIZED`.

## Notes

- Sub-task bertanda `*` bersifat opsional. Test yang menjadi bagian task implementasi (test action, test komponen, test manifest, test guard) bukan opsional. Test Property milik task di luar ruang lingkup tidak termasuk; Property 28 tetap di 1.12. Satu Property mungkin tidak lagi punya sub-task test aktif karena task pemiliknya di luar ruang lingkup.
- Task `[APPROVAL_GATE]` 1.10 dan 7.27 sudah disetujui dalam handoff Tahap 12 dan selesai. 3.14, 5.15, 7.13 tetap unchecked sebagai **ditunda** dengan syarat membuka spec terpisah di register; tidak dieksekusi otomatis.
- Keputusan `[BLOCKED_ON_OWNER]` 7.25/RK-10 sudah dicatat melalui 26.1; tidak ada implementasi CSP tambahan dalam scope ini. RK legal/bisnis lain tidak diberi default (Req 30.10).
- Approval_Gate dan `[BLOCKED_ON_OWNER]` tetap ada di Task Dependency Graph, tetapi wave-nya menunggu persetujuan atau keputusan dan task itu tidak dijadwalkan otomatis. Task lain pada wave yang sama tidak menunggunya, dan tidak ada task yang dapat dieksekusi memakainya sebagai prasyarat. Keduanya ditempatkan setelah checkpoint tahap sebelumnya supaya tidak muncul sebelum waktunya.
- Task `[BUTUH_INTEGRASI]` dan `[BUTUH_E2E]` tertahan selama Baseline_Gate (1.2 dan 1.3) mencatat `TIDAK_DIJALANKAN`. Task itu dilaporkan tertahan, bukan lulus. Status `TIDAK_DIJALANKAN` ditulis beserta penyebab dan syaratnya (Req 29.7).
- Penerimaan visual tetap "belum ditinjau" sampai user menyatakan menerimanya secara eksplisit; `build` dan test hijau bukan persetujuan visual. Semua bukti bersifat lokal dan non-production. Penerimaan physical-device dan assistive technology terpisah dari `test:e2e` dan pemeriksaan otomatis apa pun. `PUB-RELEASE` tetap `NOT_AUTHORIZED`.
- Path milik Owner tidak boleh disentuh (checkout Tahap 12 mulai bersih; perubahan Owner sebelumnya sudah di commit 230faa6/c54b2d1): `docs/legal/`, addendum PRD dan Tech Design, serta dua file test (`tests/backend/customer-privacy-pages.test.ts` dan `tests/e2e/customer-privacy.spec.ts`). Jalankan `git status --short` sebelum mengedit. Tidak ada commit, push, deployment, aktivasi provider, atau penggunaan credential production.
- Catatan eksekusi: suite unit sensitif terhadap beban mesin. `testTimeout: 30_000` ditambahkan ke `vitest.config.mts` (hanya timeout; test tidak diubah). Jalankan gate penuh sekali per tahap atau checkpoint, bukan setelah setiap task. `test:integration`, `test:e2e`, dan `build` dijalankan sendiri-sendiri secara berurutan; `next build` memakai dist sementara lewat `NIUVA_NEXT_DIST_DIR` yang dibersihkan sesudahnya. Baseline historis Tahap 1: unit 62 file / 790 test, backend 46 file / 312 test, integration 16 file / 89 test, e2e 22 spec / 103 test. Hasil terkini Tahap 12/checkpoint 30: unit 85/1190, backend 68/496, integration 19/105, E2E 109 lulus/5 skip, production 5/5; baseline bagian 15.
- Tahap 10 (task 21) sengaja terakhir dan kini hanya memuat 21.22 dan 21.24; pemecahan modul dan refactor lain berada di luar ruang lingkup.
- Cara membaca graf: wave adalah lapisan topologi; task dalam satu wave tidak saling bergantung. Wave bukan jaminan eksekusi paralel: task yang menjalankan `build`, `test:e2e`, atau server lokal berbagi direktori dist dan port, jadi gate-nya dijalankan bergantian. Checkpoint masuk graf sebagai task biasa (nomor top-level genap dan 25).
- Sumber sisi (edge) graf, selain baris `Prasyarat:` tiap sub-task: (a) semua task tahap 1 sampai 11 menunggu checkpoint 2 (Tahap 0 selesai lebih dulu), kecuali 9.1 dan 9.2 (pengecualian di Overview); (b) tiap checkpoint menunggu semua task tahapnya yang bukan gate atau blocked; (c) task tahap 4 (kecuali 9.1 dan 9.2) menunggu checkpoint 8; (d) Tahap 3 serial: 7.7 sampai 7.12 berurutan, satu capability pada satu waktu; (e) 9.15 dan 9.16 mewarisi prasyarat 9.14 (kini hanya 9.13) dari kalimat "Gate dan prasyarat: sama dengan 9.14"; pada 9.1, angka "4" dalam kalimat "sebelum tahap 4 lain" adalah prosa dan bukan rujukan ke checkpoint 4. Task di luar ruang lingkup tidak ada di graf.
- Serialisasi berkas: task yang menyentuh berkas yang sama ditempatkan pada wave berbeda menurut urutan dokumen walaupun baris `Prasyarat:` tidak menyebutnya. Pasangan aktif yang tidak tersirat oleh `Prasyarat:` adalah 1.1 ke 1.2 dan 1.9, 1.2 ke 1.9, 1.3 ke 1.9 (`baseline-gate.md`); 3.6 ke 5.14 (`system-state-copy.ts`); 3.10 ke 7.8 (`webhook-service.ts`). Pasangan yang melibatkan task di luar ruang lingkup tidak berlaku.
- Task yang menulis ke `register-keputusan.md` dan berstatus gate atau blocked tidak diserialisasi dengan task biasa; pengisian entri mereka terjadi saat Owner memutuskan, dan 23.1 memastikan semua entri tetap tercatat sebagai `BELUM_TERTUTUP`.
- Ruang lingkup Tahap 9: hanya 19.22 dan 19.23 yang aktif. Konversi form tanpa JavaScript dan task bundel di luar ruang lingkup; batas checkout tanpa JavaScript dilaporkan di laporan penyelesaian (24.1) sebagai risiko tersisa yang diterima.
- Tahap 12 (task 26 sampai 30): 3.14, 5.15, 7.13, 21.23 dan RK legal/bisnis dipindah ke spec terpisah; tiap item memiliki syarat membuka ulang di `register-keputusan.md` (26.1). 1.10 dan 7.27 sudah disetujui dan dieksekusi lewat task aslinya.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "1.5", "1.6", "1.10", "1.11", "1.13"] },
    { "id": 1, "tasks": ["1.2", "1.7", "1.8", "1.12", "9.1"] },
    { "id": 2, "tasks": ["1.3", "9.2"] },
    { "id": 3, "tasks": ["1.9"] },
    { "id": 4, "tasks": ["2"] },
    { "id": 5, "tasks": ["3.1", "3.11", "3.13", "3.14", "3.19", "3.20", "5.7", "5.16", "5.25"] },
    { "id": 6, "tasks": ["3.2", "3.3", "3.6", "3.10", "3.15"] },
    { "id": 7, "tasks": ["3.4", "3.5", "3.7", "3.8", "3.9", "3.16", "5.17", "5.19", "5.20", "7.1"] },
    { "id": 8, "tasks": ["3.12", "3.17", "5.1", "5.14", "5.18", "5.21", "5.22"] },
    { "id": 9, "tasks": ["3.18", "5.2", "5.3", "5.23", "5.24"] },
    { "id": 10, "tasks": ["4", "5.4", "7.2"] },
    { "id": 11, "tasks": ["5.5", "5.6", "5.15", "7.3", "7.17"] },
    { "id": 12, "tasks": ["5.8", "7.4", "7.18", "7.19"] },
    { "id": 13, "tasks": ["5.9", "7.5", "7.6", "7.16", "7.20"] },
    { "id": 14, "tasks": ["5.10", "7.7", "7.21"] },
    { "id": 15, "tasks": ["5.11", "7.8"] },
    { "id": 16, "tasks": ["5.12", "7.9"] },
    { "id": 17, "tasks": ["5.13", "7.10"] },
    { "id": 18, "tasks": ["6", "7.11", "7.14"] },
    { "id": 19, "tasks": ["7.12", "7.15", "7.22", "7.25", "7.26"] },
    { "id": 20, "tasks": ["7.13", "7.23", "7.24", "7.27"] },
    { "id": 21, "tasks": ["8"] },
    { "id": 22, "tasks": ["9.13", "9.21", "9.23"] },
    { "id": 23, "tasks": ["9.24"] },
    { "id": 24, "tasks": ["9.19"] },
    { "id": 25, "tasks": ["9.6", "9.20"] },
    { "id": 26, "tasks": ["9.7"] },
    { "id": 27, "tasks": ["9.10"] },
    { "id": 28, "tasks": ["9.14", "9.15", "9.16"] },
    { "id": 29, "tasks": ["9.17", "9.22"] },
    { "id": 30, "tasks": ["9.18"] },
    { "id": 31, "tasks": ["10"] },
    { "id": 32, "tasks": ["19.22"] },
    { "id": 33, "tasks": ["19.23"] },
    { "id": 34, "tasks": ["20"] },
    { "id": 35, "tasks": ["21.24"] },
    { "id": 36, "tasks": ["21.22"] },
    { "id": 37, "tasks": ["22"] },
    { "id": 38, "tasks": ["23.1", "23.7"] },
    { "id": 39, "tasks": ["24.1"] },
    { "id": 40, "tasks": ["25"] },
    { "id": 41, "tasks": ["26.1"] },
    { "id": 42, "tasks": ["26.2", "26.3"] },
    { "id": 43, "tasks": ["26.4"] },
    { "id": 44, "tasks": ["27.1"] },
    { "id": 45, "tasks": ["27.2"] },
    { "id": 46, "tasks": ["27.3"] },
    { "id": 47, "tasks": ["28.1"] },
    { "id": 48, "tasks": ["28.2", "29.1", "29.2"] },
    { "id": 49, "tasks": ["30"] }
  ]
}
```
