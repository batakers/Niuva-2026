# Batch 2, Slice 2.1 — Database Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: gunakan superpowers:executing-plans untuk menjalankan tugas secara berurutan. Implementasi disetujui dalam percakapan 13 Oktober 2026; checkbox dan bukti di bawah mencatat hasil aktual.

**Goal:** Menolak operasi calon outbox/job pada database yang binding/tier-nya tidak cocok, dan mengikat pemeriksaan dengan perubahan database dalam transaksi yang sama.

**Architecture:** Pertahankan deployment/origin/capability resolver yang ada. Tambahkan penanda database tunggal, fungsi validasi deterministik, repository transaksi dengan `FOR SHARE`, serta service yang menjalankan capability gate sebelum mengakses repository. Consumer lama tidak dimigrasikan oleh slice ini.

**Tech Stack:** TypeScript strict, Zod, Prisma/PrismaPg, PostgreSQL 18, Vitest dan gate proyek yang sudah ada; tanpa dependency atau vendor baru.

**Spec:** [Rancangan Slice 2.1](../specs/2026-10-13-batch-2-database-binding-design.md). Perancangan dan implementasi diizinkan 13 Oktober 2026; status implementasi lokal dan batas hosted dicatat di bawah.

## Global Constraints

- Ikuti [AGENTS.md](../../../AGENTS.md), Tech Design dan kontrak hosted/outbox/job yang dirujuk spec. Rancangan tidak menutup REL/PUB atau mengaktifkan capability.
- Tidak ada perubahan `.env*`, secret, existing migration, activation grants, allowed modes, policy resolver, provider guard lama, workflow/deployment config, atau layanan provider.
- `NIUVA_DATABASE_BINDING_ID` diusulkan sebagai server-only dan hanya diwajibkan oleh guard baru. Jangan mengubah parser environment global sehingga flow lama/build memerlukan marker.
- Database access tetap di repository. Semua callback memakai transaction client repository yang sama; tidak ada request jaringan/provider di dalam transaksi.
- Tabel marker tidak diisi/diperbaiki saat startup. Kegagalan atau mismatch menolak callback dan tidak membocorkan config/UUID/raw database error.
- Role runtime marker bukan owner/superuser: SELECT + UPDATE(id) untuk kebutuhan `FOR SHARE`, dengan `CHECK (id = 1)`; tidak ada privilege perubahan identity/tier, INSERT/DELETE/TRUNCATE atau privilege warisan yang melewati pembatasan. Provisioning role nyata tetap terpisah.
- TDD berlaku untuk kode: lihat kegagalan yang sesuai requirement, implementasikan minimum, lihat lulus. Jangan menurunkan assertion, coverage, timeout global, atau safety test untuk meluluskan gate.
- Test memakai database terisolasi dan fixture milik suite. Jangan reset database lama atau menghapus marker/data milik pihak lain. Tidak menguji dengan credential/data production.
- Instruksi implementasi kelak mencakup schema additive dan migration baru sesuai spec; bukan izin commit, push, merge, provisioning, migration staging/production, deployment, atau provider activation.

## Review Focus

- Tidak ada celah capability deny → database work atau marker match → activation grant.
- Config yang dipercaya berasal dari server; row/request/job tidak dapat menentukan expected binding.
- Pemeriksaan dan callback berada pada transaksi/client yang sama, dan error callback ikut rollback.
- SQL constraint/lock dibuktikan pada PostgreSQL, bukan hanya mock; shared readers tidak diserialisasi tanpa kebutuhan.
- Batas clone/privileged writer, consumer yang belum memakai guard, dan keterpisahan delivery/provider dinyatakan jujur.
- Perubahan kompatibel dengan seluruh flow lama dan tidak menganggap unit/integration probe sebagai bukti hosted.

## Task 1: Schema penanda dan validasi deterministik

**Files:**

- Modify: `prisma/schema.prisma`.
- Create: `prisma/migrations/20261013010000_database_execution_binding/migration.sql` (nama belum ada saat desain; periksa ulang sebelum membuat dan gunakan nama baru bila sudah terpakai).
- Create: `src/modules/database-binding/core.ts`.
- Create: `tests/unit/database-binding.test.ts`.
- Modify: `.kiro/specs/niuva-audit-remediation/env-register.md` untuk nama/tujuan variabel, tanpa nilai resource nyata.

**Interfaces:** `DatabaseBindingExpectation`, parser expected config, validator/comparator row; mengonsumsi tipe deployment yang sudah ada. Parsing menerima `unknown`, memakai Zod/guard, dan menghasilkan nilai immutable yang dinormalisasi atau failure terklasifikasi.

- [x] Tulis kasus missing/blank/invalid UUID, normalisasi UUID, row hilang/invalid, tier mismatch dan UUID mismatch. Tegaskan tidak membaca expected ID dari row/request.
- [x] Jalankan `corepack pnpm test tests/unit/database-binding.test.ts`; pastikan kegagalan berasal dari perilaku yang belum diimplementasikan, bukan masalah fixture/import saja.
- [x] Implementasikan parser/comparator minimum dan jalankan ulang test sampai lulus.
- [x] Tambahkan model/SQL additive sesuai field/constraint spec. Tidak ada INSERT, UPDATE, DROP, atau modifikasi existing migration; tidak ada marker default/generated yang otomatis dianggap sah.
- [x] Jalankan `corepack pnpm db:generate` dan `corepack pnpm db:validate`. Baca SQL baru dan verifikasi constraint/tidak adanya seed; bukti SQL nyata dilanjutkan Task 2.
- [x] Catat env server-only yang opsional global tetapi diperlukan saat guard dipakai. Jangan membuat/edit/membaca `.env*` untuk tugas ini.

## Task 2: Repository transaksi dan bukti PostgreSQL

**Files:**

- Create: `src/modules/database-binding/repository.ts`.
- Create: `tests/integration/database-binding.test.ts`.

**Interfaces:** `DatabaseBindingRepository.withVerifiedBinding(expected, work)` dari spec; menerima Prisma client melalui factory/injection. Query parametrik membaca `id = 1` dengan `FOR SHARE`. Core memvalidasi row; repository hanya menjalankan callback setelah pembandingan sukses.

- [x] Tulis fixture marker dan probe `IdempotencyRecord` dengan identitas acak yang dimiliki suite. Gunakan safe test database setup yang ada. Bila marker asing sudah ada, gagal dengan instruksi memakai database test baru; jangan menghapus/mengganti marker tersebut.
- [x] Tulis integration cases untuk missing/mismatch, constraint singleton/tier/UUID, callback berhasil/commit dan callback throw/rollback. Denial tidak meninggalkan probe. Fixture cleanup dibatasi pada kepemilikan suite.
- [x] Jalankan `corepack pnpm test:integration` dengan `TEST_DATABASE_URL` database test terisolasi yang telah diizinkan, melalui wrapper repository. Wrapper menerapkan migration test lalu menjalankan suite; tidak meneruskan argumen filter. Verifikasi kegagalan fitur yang dimaksud. Jangan mengganti URL eksplisit dengan fallback atau menjalankan reset.
- [x] Implementasikan repository minimum memakai interactive transaction dan transaction client yang sama untuk pembacaan marker/callback. Jangan menerima flag `verified` dari luar atau menyimpan proof lintas transaksi.
- [x] Tambahkan uji dua koneksi dengan barrier: shared readers dapat bersamaan; UPDATE/DELETE terhalang sampai transaksi pertama dilepas. Pakai `lock_timeout` lokal fixture dan SQLSTATE `55P03`, bukan sleep/timeouts global.
- [x] Buktikan DBB-09 dengan role fixture terbatas yang bukan pemilik tabel: grant SELECT + UPDATE(id), lock berhasil; perubahan UUID/tier/timestamp, INSERT/DELETE/TRUNCATE ditolak dan `id != 1` ditolak constraint. Gunakan setup/cleanup role milik suite pada cluster test terisolasi. Bila setup role tidak tersedia, perbaiki fixture atau laporkan gate belum terbukti; jangan silent skip atau memakai hasil superuser sebagai penggantinya.
- [x] Jalankan ulang `corepack pnpm test:integration`; periksa hasil assertion SQL/rollback/locking dan cleanup fixture. Jangan menganggap koneksi database terpisah di fixture sebagai bukti resource deployment terpisah.

## Task 3: Service capability dan regresi

**Files:**

- Create: `src/modules/database-binding/service.ts`.
- Create: `tests/backend/database-binding-service.test.ts`.
- Modify: `docs/frontend/mvp-release-readiness.md`, hanya bukti implementasi Slice 2.1 setelah benar-benar diverifikasi.

**Interfaces:** `BoundDatabaseService.run("outbox" | "job", work)`; gunakan `emailDelivery`/`scheduledJobs` dari resolver yang ada. Dependencies meliputi config server yang konsisten, reader gate/grant yang sudah didukung resolver, dan repository factory lazy.

- [x] Tulis backend cases capability denied, grants default kosong, production/live denied, marker/config failure dan error repository; callback/repository tidak dipanggil sebelum gate yang relevan lulus.
- [x] Tulis allowed fixture cases kedua operasi dengan injected grant/config/client yang eksplisit; pastikan transaction handle diteruskan utuh. Test bahwa perubahan object input setelah snapshot tidak mencampurkan config eksekusi. Guard tidak memberi grant/mode sendiri.
- [x] Jalankan `corepack pnpm test:backend tests/backend/database-binding-service.test.ts` dan amati kegagalan yang tepat.
- [x] Implementasikan service minimum tanpa SQL, raw error disclosure, global env mutation atau consumer/route/provider baru. Gunakan error `PROVIDER_UNAVAILABLE`/503 yang sudah ada dengan pesan aman; internal reason tidak membawa UUID/URL/payload.
- [x] Jalankan ulang backend test terarah dan unit validasi. Cakup regresi resolver deployment/capability/origin yang sudah ada dalam suite proyek; jangan mengubah assertion lama untuk mengizinkan mode/activation baru.
- [x] Jalankan gate penutup: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm test:backend`, `corepack pnpm test:integration`, `corepack pnpm db:validate`, `corepack pnpm test:e2e`, `corepack pnpm build`. Prisma generation dan test migration memakai script repository; tidak menjalankan migration staging/production.
- [x] Lakukan satu fresh-context review keseluruhan slice memakai Superpowers. Selesaikan finding yang terbukti, ulang hanya pemeriksaan yang dipengaruhi perbaikannya, dan catat hasil aktual DBB-01–09 pada ledger rilis.
- [x] Laporkan diff, commands/results, acceptance criteria, keterbatasan hosted/provider serta rollback. Jangan commit/push/merge/deploy/activate tanpa instruksi tersendiri.

## Pengoperasian dan rollback yang belum termasuk implementasi

Migration menghasilkan tabel kosong. Pemakaian guard pada resource nyata membutuhkan provisioning penanda/role melalui instruksi lingkungan tersendiri, sebelum consumer hosted dihubungkan. Slice ini tidak menambahkan command provisioning atau endpoint bypass agar test lulus.

Jika kelak kode perlu dibatalkan, revert terbatas pada modul/wiring yang ditambahkan; tabel additive dapat dibiarkan tidak dipakai. Jangan menghapus data/marker atau mengubah existing migration sebagai rollback otomatis. Rollback capability/consumer hosted harus tetap menjaga pekerjaan privasi/keuangan yang memiliki kewajiban sendiri pada slice berikut.

## Hasil tahap perancangan

Snapshot sebelum instruksi implementasi: tahap perancangan hanya menulis spec, plan dan pointer pada ledger rilis. File kode/schema/test/env/deployment saat itu tidak diedit dan checklist Task 1–3 belum dikerjakan. Catatan historis berikut tidak menggantikan hasil implementasi di bawah.

- **13 Oktober 2026 — DESIGN_REVIEWED; IMPLEMENTATION_NOT_STARTED.** Dua dokumen baru dan satu paragraf handoff pada ledger rilis adalah seluruh delta tahap ini. Seluruh 21 langkah kode tetap belum dicentang.
- Pemeriksaan Markdown/source: **182 tautan/anchor lokal pada 20 dokumen paket Batch 1 + Slice 2.1 valid**, tanpa target/anchor hilang. Inventori file implementasi cocok dengan checkout: target create belum ada, target modify ada. Nama migration diperiksa belum terpakai.
- Review fresh-context menemukan **1 P2**: SELECT saja tidak cukup untuk `FOR SHARE`. Kontrak SELECT + UPDATE(id), larangan privilege yang lebih luas dan DBB-09 ditambahkan; reviewer memeriksa koreksi dan menutup finding pada tingkat dokumen, **0 finding tersisa**. Perilaku SQL/privilege belum diuji melalui eksekusi.
- `git diff --check` lulus; index kosong; branch tetap `codex/release-contract-batch-1`, HEAD tetap `a577b7c326ff42d3a642cf5f0b93ccdf59c26bef`. Primary checkout tetap bersih. SHA-256 17 dokumen Batch 1 lain identik; ledger mvp identik dengan hasil Batch 1 setelah paragraf handoff baru dikeluarkan. Tidak mengubah status REL/PUB/RK/AG melalui tahap desain.
- Gate aplikasi, migration/provisioning, browser dan provider: **tidak dijalankan pada tahap desain**; tidak dinyatakan lulus oleh dokumen ini.

Scope rollback tahap desain adalah dua dokumen baru dan satu paragraf handoff tersebut. Jangan memulihkan seluruh ledger mvp ke HEAD untuk membatalkan tahap ini, karena rekonsiliasi Batch 1 pada file yang sama juga belum di-commit. Tidak ada rollback yang dijalankan.

## Hasil implementasi lokal — 13 Oktober 2026

Kode slice tersedia sebagai modul internal; belum ada consumer aplikasi yang dipindahkan ke guard ini. Model/migration hanya menambah tabel kosong. Tidak ada provisioning penanda/grant, perubahan `.env*`, provider activation, deployment, commit atau push.

TDD terarah: unit **19 assertion gagal → 22/22 lulus**; repository **9 assertion gagal → 10/10 integration lulus**; service **20 assertion gagal → 20/20 backend lulus**. Signature scaffold dipakai setelah import awal belum tersedia agar RED membuktikan perilaku yang hilang. Probe terarah memakai `--coverage.enabled=false`; seluruh gate suite di bawah tetap memakai konfigurasi coverage repository tanpa perubahan.

| Gate | Hasil aktual |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | Lulus; dependency/lockfile tidak diubah. |
| `corepack pnpm db:generate`, `corepack pnpm db:validate` | Client berhasil dibuat; schema valid. |
| `corepack pnpm lint`, `corepack pnpm typecheck` | Lulus. |
| `corepack pnpm test` | **122 file / 1.359 test lulus**; coverage aktif, tanpa warning remap. |
| `corepack pnpm test:backend` | **85 file / 609 test lulus**; coverage aktif. |
| `corepack pnpm test:integration` | **38 file / 190 test lulus** pada PostgreSQL 18 worktree terisolasi; migration test diterapkan melalui wrapper, coverage aktif. |
| `corepack pnpm test:e2e` | **112 lulus / 5 skipped**, Chromium lokal port 3317. Lima skenario `public-content-production-path` mensyaratkan tier production dan memang tidak dijalankan oleh smoke local-test. |
| `corepack pnpm build` | Lulus; **90/90** static-page generation. Bukan deployment atau acceptance provider. |

| Kriteria | Bukti lokal |
| --- | --- |
| DBB-01 | Unit missing/invalid UUID + kompatibilitas parser lama; backend menolak sebelum repository; build tanpa config binding baru. |
| DBB-02 | Backend menggunakan resolver nyata: default grants kosong, production/live/resource/config ditolak; factory/callback tidak dijalankan. |
| DBB-03 | Unit malformed row, backend missing/mismatch, PostgreSQL UUID/tier mismatch/missing marker tanpa probe write. |
| DBB-04 | Probe sintetis commit pada transaction client repository yang sama. |
| DBB-05 | Probe rollback saat callback throw; service mengembalikan 503 aman tanpa UUID/URL/raw error. |
| DBB-06 | UPDATE/DELETE gagal dengan SQLSTATE 55P03 selama barrier callback; dua shared readers dapat masuk bersamaan. |
| DBB-07 | SQL check/UUID/NOT NULL menolak operasi invalid; migration additive tanpa seed. |
| DBB-08 | Lint/typecheck, seluruh suite dan build lulus; matrix/origin/grants/policy serta consumer lama tidak diubah. |
| DBB-09 | Role fixture non-owner dengan SELECT + UPDATE(id) dapat menjalankan repository; perubahan identitas/tier/timestamp, INSERT/DELETE/TRUNCATE ditolak 42501 dan id selain 1 ditolak 23514. Ini bukan bukti privilege login/resource hosted. |

Review kode independen selesai: **0 Critical, 0 Important, 0 Minor**; tidak ada perbaikan kode yang diminta. Reviewer menilai source/assertion, executor menjalankan gate di atas. Verifikasi **184 tautan/anchor lokal pada 21 dokumen** dan `git diff --check` lulus. Index kosong, HEAD tidak berubah, primary checkout bersih. SHA-256 17 dokumen Batch 1 lain tetap sama; ledger mvp tetap identik dengan Batch 1 setelah paragraf handoff slice dikeluarkan. Setelah integration/E2E, tabel marker kosong dan role fixture tersisa 0; tidak ada penanda/grant aktivasi otomatis.

REL-02 tetap partial lokal/unwired; REL-03/04 belum memiliki durable outbox atau worker/job hosted. Clone/privileged writer tetap batas pengaman ini. Penanda/role/resource hosted dan recovery memerlukan instruksi serta evidence tersendiri.

Penyesuaian workflow: ledger dan catatan task memakai native edits di Windows, sehingga metadata helper dicatat manual; tidak ada commit/push atau penghapusan workspace tanpa instruksi, sehingga hasil tetap lokal; focused TDD tidak mengumpulkan coverage, sehingga tidak dapat menggantikan full-suite coverage yang tetap dijalankan dan lulus.

Batas review yang dipertahankan: consumer lama belum memakai guard; outbox/worker/delivery belum tersedia; provisioning/login role/rebind/resource hosted belum terbukti; clone/admin berprivilege dapat melewati equality; callback server wajib memakai transaction client dan menghindari network; atomicity provider/retry/kapasitas memerlukan slice worker; reviewer tidak mengulang eksekusi gate executor; Batch 1 di luar delta tidak diaudit ulang oleh review kode ini. Batas-batas ini tidak diubah menjadi penerimaan hosted.

Rollback kode slice: batalkan hanya modul/schema/migration baru, test dan dokumentasi slice yang belum di-commit, dengan menjaga hasil Batch 1. Untuk database yang sudah menerima migration additive, tabel kosong dapat dibiarkan tidak digunakan; jangan drop data atau mengubah migration yang telah diterapkan sebagai rollback otomatis. Database pada tahap ini hanya test lokal; tidak ada rollback production.
