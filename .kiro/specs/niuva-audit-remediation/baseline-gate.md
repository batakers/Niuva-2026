# Baseline_Gate: niuva-audit-remediation

Dokumen ini mencatat hasil Gate_Verifikasi sebelum perubahan berisiko (Req 3). Isinya hanya hasil yang benar-benar diukur atau dijalankan. Gate yang belum dijalankan diberi status `BELUM_DIJALANKAN` dan tidak diisi angka.

## 1. Kondisi saat pencatatan

- Tanggal pencatatan task 1.1: 2026-10-03.
- Commit `HEAD`: `5a5acc925bc9c22aac8aa11643b28beba51f0dac` (2026-10-03T13:12:58+07:00).
- Working tree saat pencatatan punya perubahan uncommitted milik Owner. Perubahan ini tidak disentuh:
  - Dimodifikasi: `docs/PRD-Niuva-MVP.md`, `docs/README.md`, `docs/TechDesign-Niuva-MVP.md`, `docs/backend/provider-staging-intake.md`, `docs/legal/customer-policy-implementation.md`, `docs/legal/customer-privacy-draft.md`, `docs/legal/customer-terms-draft.md`, `tests/backend/customer-privacy-pages.test.ts`, `tests/e2e/customer-privacy.spec.ts`.
  - Belum di-track: `docs/legal/customer-privacy-retention-sop.md`, `customer-public-input-evidence.md`, `customer-public-launch-readiness.md`, `customer-public-policy-validation.md`, `customer-public-runtime-contract.md`, `customer-service-refund-sop.md`, serta folder spec `.kiro/specs/niuva-audit-remediation/`.
- Tidak ada file code di `src/` yang berubah pada working tree saat pencatatan. Dua file test yang berubah (`tests/backend/customer-privacy-pages.test.ts`, `tests/e2e/customer-privacy.spec.ts`) milik Owner.

## Baseline terkini (checkpoint akhir, task 25)

Diukur ulang pada checkpoint akhir di working tree yang memuat seluruh perubahan uncommitted (`HEAD` `5a5acc9`). Angka ini menggantikan tabel checkpoint 2 di bagian 2 sebagai baseline terkini; bagian 2, 6, dan 7 dipertahankan sebagai catatan historis.

| Gate | Hasil | File | Test | Catatan |
| --- | --- | --- | --- | --- |
| `lint` | PASS | n/a | n/a | 0 error, 0 warning |
| `typecheck` | PASS | n/a | n/a | `prisma generate`, `next typegen`, `tsc --noEmit`; exit 0 |
| `test` | PASS | 84 | 1181 | 86,91 detik; mencakup invariant p05, p12, p13, `system-pages-coverage`, dan `admin-proxy` |
| `test:backend` | PASS | 68 | 496 | 4,62 detik |
| `db:validate` | PASS | n/a | n/a | schema valid |
| `build` | PASS | n/a | n/a | `distDir` default (`.next`); 68 halaman dihasilkan; route statis/SSG: `/`, `/_not-found`, `/account/privacy/closed`, `/projects`, `/projects/[slug]`, `/robots.txt`, `/services`, `/shop`, `/shop/[slug]`, `/sitemap.xml`; `/services/[slug]` tetap dinamis (RK-16) |
| `test:integration` | PASS | 19 | 105 | 54,15 detik; `niuva_test` di loopback `127.0.0.1:55432`; 17 migrasi, tidak ada migrasi tertunda |
| `test:e2e` (penuh) | PASS | n/a | 109 lulus, 5 dilewati, 0 gagal | 2,7 menit; 5 yang dilewati adalah `public-content-production-path.spec.ts` (butuh tier production, dijalankan terpisah di baris berikut) |
| `tests/e2e/public-content-production-path.spec.ts` (`NIUVA_DEPLOYMENT_TIER=production`, `NIUVA_E2E_PORT=3101`) | PASS | 1 | 5 lulus, 0 dilewati | 11,3 detik |

Catatan:

- Gate dijalankan lewat `corepack pnpm <script>` (shim `node_modules/.bin` sekarang lengkap) kecuali `test:e2e`, yang dijalankan lewat `node node_modules/@playwright/test/cli.js test` dengan `playwright.config.ts`, di latar belakang dengan polling.
- `db:test:start` di proses latar belakang (server mati bila proses pembungkusnya selesai, jadi pembungkus ditahan hidup). `db:test:stop` dijalankan di akhir.
- Semua bukti lokal, loopback, non-production. Bukan bukti visual, physical-device, AT, provider, atau production.
- Tidak ada gate `TIDAK_DIJALANKAN` di checkpoint ini. Task yang tertahan (1.10, 3.14, 5.15, 7.13, 7.25, 7.27, 21.23) tidak punya gate sendiri dan tetap menunggu persetujuan/keputusan Owner.
- `tests/e2e/local-demo.spec.ts` tetap dikecualikan oleh `testIgnore`.
- `tsconfig.json` tidak berubah; tidak ada dist dir sementara dibuat.

## 2. Gate yang sudah berjalan

Semua gate di tabel ini **diukur ulang di checkpoint 2 (task 2), 2026-10-04**, pada working tree yang sudah memuat perubahan task 1.6–1.8 dan perubahan uncommitted milik Owner (bagian 1). Angka tidak disalin dari pengukuran lama. Baseline awal (sebelum task 1.6–1.8, dari Overview `tasks.md`) dicatat di kolom terakhir sebagai pembanding historis.

| Gate | Hasil | File | Test | Error | Warning | Sumber | Baseline awal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lint` | PASS | n/a | n/a | 0 | 0 (lihat bagian 3) | Diukur ulang di checkpoint 2 | 0 error / 148 warning |
| `typecheck` | PASS | n/a | n/a | 0 | n/a | Diukur ulang di checkpoint 2 | PASS |
| `test` | PASS | 55 | 612 | 0 | n/a | Diukur ulang di checkpoint 2 | 55 file / 612 test |
| `test:backend` | PASS | 38 | 190 | 0 | n/a | Diukur ulang di checkpoint 2 | 38 file / 190 test |
| `build` | PASS | n/a | n/a | 0 | n/a | Diukur ulang di checkpoint 2 | PASS, "49 route" |
| `db:validate` | PASS | n/a | n/a | 0 | 0 | Diukur ulang di checkpoint 2 | PASS (task 1.1, bagian 4) |

Perintah yang dijalankan (lewat `node node_modules/<paket>/...`, lihat bagian 5), semuanya exit code 0:

- `lint`: `node node_modules/eslint/bin/eslint.js .` tanpa output sama sekali (0 problem).
- `typecheck`: `prisma generate` (Prisma Client 7.10.0), lalu `next typegen`, lalu `tsc --noEmit`.
- `test`: `node node_modules/vitest/vitest.mjs run`, Vitest v4.1.11, durasi 64,70 detik.
- `test:backend`: `vitest run --config vitest.backend.config.mts`, durasi 2,46 detik.
- `db:validate`: `node node_modules/prisma/build/index.js validate`, schema valid.
- `build`: `node node_modules/next/dist/bin/next build` (Next.js 16.3.2) dengan `NIUVA_NEXT_DIST_DIR=.next-checkpoint2-tmp` supaya `.next` tidak tertimpa. Dist dir sementara dihapus setelahnya.

Catatan `build`:

- Tabel route di output build memuat 83 entri: 49 route halaman (termasuk `/_not-found` dan `/`) dan 34 route API. Angka "49 route" di baseline awal cocok dengan jumlah route halaman, tetapi metode hitung baseline awal tidak tercatat, jadi kecocokan ini tidak dapat dibuktikan.
- Route statis (○) sekarang ada tiga: `/_not-found`, `/account/privacy/closed`, dan `/services`. Baseline awal hanya mencatat `/services` sebagai statis. Saya tidak membandingkan dengan build baseline, jadi tidak diketahui apakah selisih ini berasal dari cara hitung baseline awal atau dari perubahan code. Tidak ada perubahan `src/` selain `retail-rate-service.ts` pada working tree (lihat bagian 1), dan file itu tidak terkait route statis.
- `next typegen` dan `next build` menambahkan dua entri `.next-checkpoint2-tmp/...` ke `tsconfig.json`. Perubahan itu dikembalikan dengan `git checkout -- tsconfig.json`.

Yang **tidak** dijalankan ulang di checkpoint 2: `test:integration` dan `test:e2e`. Hasil keduanya tetap seperti di bagian 6 (15 file / 83 test) dan bagian 7 (22 file spec / 103 test). Satu-satunya perubahan runtime sejak run itu adalah `toPublicRateOption` di `src/modules/shipping/retail-rate-service.ts`; perubahan itu dicakup oleh `test` dan `test:backend` yang lulus di atas, tetapi tidak oleh run integrasi/E2E ulang.

## 3. Rincian warning `lint`

Noise tooling dicatat terpisah dari warning product code supaya sinyal product code tidak tenggelam (Req 3.6).

**Diukur ulang di checkpoint 2 (2026-10-04): 0 error, 0 warning.**

| Kelompok | Baseline awal | Diukur ulang di checkpoint 2 | Penyelesaian |
| --- | --- | --- | --- |
| Noise tooling (`.agents/skills/impeccable/`) | 146 | 0 | Task 1.6: `.agents/**` masuk ignore di `eslint.config.mjs` |
| Product code (`src/modules/shipping/retail-rate-service.ts:145`, `_providerPayload`) | 1 | 0 | Task 1.7: dihapus lewat `toPublicRateOption` |
| Test (`tests/unit/properties/p06-token-not-found.test.tsx:87`, `liveMocks`) | 1 | 0 | Task 1.8: variabel `liveMocks` dihapus |
| **Total** | **148** | **0** | |

Catatan historis: baseline awal 148 warning = 146 noise tooling + 2 warning product code/test (1 di product code, 1 di test). Ketiga kelompok itu kini diselesaikan oleh task 1.6–1.8. Pengukuran ulang hanya memverifikasi hasil akhir; task ini tidak memeriksa ulang isi diff task 1.6–1.8.

## 4. `db:validate` (dijalankan di task 1.1)

- Command: `node node_modules/prisma/build/index.js validate` (setara script `db:validate` = `prisma validate`, dijalankan lewat `node` karena shim tidak lengkap, lihat bagian 5).
- Direktori: root repository.
- Versi: Prisma CLI dan `@prisma/client` 7.10.0, Node.js v24.14.0, TypeScript 5.9.3.
- Config: `prisma.config.ts` dimuat; schema `prisma/schema.prisma`.
- Exit code: 0.
- Hasil: **PASS**. Output: `The schema at prisma\schema.prisma is valid`.
- `db:validate` memvalidasi schema saja. Command ini tidak membuka koneksi database dan tidak membuktikan migrasi bisa direplay.

## 5. Kondisi lingkungan (bukan temuan repository)

Shim `node_modules/.bin` tidak lengkap (Req 3.7). Saat pencatatan hanya dua shim yang ada: `next.cmd` dan `prisma.cmd`. Shim untuk `eslint`, `tsc`, `vitest`, dan `playwright` tidak ada, sehingga `corepack pnpm <script>` tidak bisa diandalkan untuk gate tersebut.

Gate dijalankan lewat `node node_modules/<paket>/...`. Contoh yang terbukti berjalan di task ini:

```powershell
node node_modules/prisma/build/index.js validate
```

Ini adalah kondisi lingkungan mesin lokal ini, bukan cacat repo. Jangan membuat task perbaikan untuk shim.

## 6. `test:integration` (diisi task 1.2)

Status: **PASS** (dicatat 2026-10-04). 15 file, 83 test, 0 gagal.

| Field | Nilai |
| --- | --- |
| Status | PASS |
| File / test | 15 file / 83 test lulus |
| Test gagal | Tidak ada |
| Durasi | 55,86 detik (vitest) |
| Penyebab / syarat (bila `TIDAK_DIJALANKAN`) | n/a, gate berjalan |

Langkah yang dijalankan (database test lokal saja: `niuva_test`, loopback `127.0.0.1:55432`, cluster di `.local/postgres-test/data`):

1. `db:test:start` lewat `powershell.exe -File scripts/local-test-db.ps1 start`: exit 0, PostgreSQL 18 siap di loopback port 55432. Cluster sudah ada dari sesi sebelumnya; database `niuva_test` sudah ada.
2. `db:test:migrate` lewat `scripts/local-test-db.ps1 migrate`: exit 0. Prisma menemukan 16 migrasi dan melaporkan `No pending migrations to apply`.
3. `test:integration`: `corepack pnpm test:integration` **gagal karena shim**, bukan karena test. Script mencapai langkah `corepack pnpm exec vitest` lalu berhenti dengan `Command "vitest" not found` (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`), sesuai kondisi di bagian 5. Gate lalu dijalankan langsung dengan `node node_modules/vitest/vitest.mjs run --config vitest.integration.config.mts`, dengan environment yang sama seperti script: variabel dari `.env.test.local` dimuat, `DATABASE_URL` tidak di-set, `NODE_ENV=test`.
4. `db:test:stop`: exit 0, server berhenti dan `pg_isready` di port 55432 tidak merespons. Data test lokal dipertahankan oleh script.

File yang lulus (`tests/integration/`): `admin-page-route`, `analytics`, `custom-reference-intake`, `customer-auth`, `customer-email-auth`, `customer-internal-auth`, `customer-privacy`, `customer-work-slice`, `database`, `local-demo-route`, `portfolio-public-content`, `private-upload-route`, `project-brief-route`, `stock-ledger`, `stock-migration`.

Batasan hasil ini:

- **Replay migrasi dari database kosong tidak terbukti.** Database `niuva_test` sudah berisi 16 migrasi dari sesi sebelumnya, jadi `migrate deploy` tidak menerapkan apa pun. Hasil ini membuktikan test lulus pada state yang sudah termigrasi, bukan bahwa 16 migrasi bisa direplay dari nol. Risiko "replay gagal" di task ini belum teruji. Tidak ada migrasi yang diubah dan direktori `prisma/migrations/` tidak disentuh.
- Satu percobaan awal menjalankan vitest dengan `DATABASE_URL` disamakan dengan `TEST_DATABASE_URL`. Percobaan itu ditolak guard `TestDatabaseSafetyError` dan 15 file gagal di setup sebelum ada test berjalan. Penyebabnya kesalahan environment pada percobaan itu (script memang mengosongkan `DATABASE_URL` sebelum vitest), bukan temuan repository. Percobaan itu tidak dihitung sebagai hasil. Guard tersebut bekerja sesuai desain.
- Exit code proses vitest tidak terbaca oleh runner, jadi status PASS diambil dari ringkasan vitest (`15 passed (15)`, `83 passed (83)`), bukan dari exit code.
- Hanya ada dua `DeprecationWarning` dari `pg` (`client.query()` dipanggil saat client masih menjalankan query). Ini bukan kegagalan dan tidak ditindaklanjuti di task ini.
- Hanya database test lokal yang dipakai. Tidak ada database non-test yang disentuh dan tidak ada secret yang dicetak.
## 7. `test:e2e` (diisi task 1.3)

Status: **PASS** (dicatat 2026-10-04). 22 file spec, 103 test lulus, 0 gagal, 0 dilewati, 0 flaky. Durasi 2,6 menit (Playwright).

| Field | Nilai |
| --- | --- |
| Status | PASS |
| Spec / test | 22 file spec / 103 test lulus |
| Spec gagal | Tidak ada |
| Penyebab / syarat (bila `TIDAK_DIJALANKAN`) | n/a, gate berjalan |

Langkah yang dijalankan (database test lokal saja: `niuva_test`, loopback `127.0.0.1:55432`):

1. `db:test:start` lewat `powershell.exe -File scripts/local-test-db.ps1 start`: exit 0, PostgreSQL siap di port 55432 (task 1.2 sudah menghentikannya).
2. Migrasi: `playwright.config.ts` (non-CI) menjalankan `scripts/local-e2e-web.ps1`. Skrip itu memuat `.env.test.local`, menjalankan `local-test-db.ps1 migrate` sendiri, lalu menyamakan `DATABASE_URL` dengan `TEST_DATABASE_URL` di dalam proses server (skrip resmi, bukan manual), dan menjalankan `corepack pnpm exec next dev -p 3000` dengan `NIUVA_NEXT_DIST_DIR=.next-e2e`. Tidak ada langkah migrasi terpisah yang saya jalankan.
3. `test:e2e`: `corepack pnpm test:e2e` **tidak dipakai**. Karena shim `playwright` tidak ada (bagian 5), gate dijalankan langsung dengan `node node_modules/@playwright/test/cli.js test`. Setara isi script `test:e2e`, dan `playwright.config.ts` tetap memulai server dev sendiri. Satu worker (`workers: 1`), tanpa retry. `global-setup.ts` menyemai konten publik yang disetujui ke `niuva_test` (guard loopback dan nama database test lolos).
4. `db:test:stop`: exit 0, server berhenti. Tidak ada proses yang listen di port 3000 maupun 55432 setelahnya. Data test lokal dipertahankan oleh skrip.

Ruang lingkup: `testIgnore` di `playwright.config.ts` mengecualikan `tests/e2e/local-demo.spec.ts`, jadi file itu tidak termasuk dalam 22 file / 103 test. Dari 24 file di `tests/e2e/`, satu adalah `global-setup.ts` (bukan spec) dan satu `local-demo.spec.ts` (diabaikan). Spec yang berjalan: `account-work`, `admin-access`, `admin-action-queue`, `cart`, `checkout`, `custom-print`, `custom-request`, `customer-auth`, `customer-email-auth`, `customer-privacy`, `home`, `order-status`, `page-readiness`, `product-detail`, `product-route-proof`, `public-pages`, `quote-review`, `redesign-journeys`, `reference-intake`, `security-headers`, `shop`, `system-pages`.

Batasan hasil ini:

- `tests/e2e/customer-privacy.spec.ts` memuat perubahan uncommitted milik Owner (bagian 1). Spec itu lulus (4 test) dengan isi working tree saat ini. Hasil ini bukan hasil pada `HEAD` murni untuk file tersebut. Tidak ada file test yang disentuh.
- Working tree juga punya perubahan uncommitted dari task 1.6–1.8 (`eslint.config.mjs`, `src/modules/shipping/retail-rate-service.ts`, `tests/unit/properties/p06-token-not-found.test.tsx`). Perubahannya tidak memengaruhi perilaku runtime yang diuji E2E, tetapi hasil ini tetap diambil pada working tree tersebut, bukan pada `HEAD` murni.
- E2E berjalan dengan mock lokal (`NIUVA_CUSTOMER_AUTH_MOCK=true`, Clerk/R2 dikosongkan) di loopback non-production. Hasil ini bukan bukti provider, perangkat fisik, AT, atau visual acceptance.
- Server dev mengeluarkan `DeprecationWarning` dari `pg` (`client.query()` dipanggil saat client masih menjalankan query). Bukan kegagalan dan tidak ditindaklanjuti.
- Exit code proses tidak terbaca oleh runner. Status PASS diambil dari ringkasan Playwright (`103 passed`), tanpa baris gagal/dilewati/flaky.
- Direktori `.next-e2e/` sudah ada sebelum task ini dan tidak dihapus (abaikan git; berisi build dev dari sesi sebelumnya). `test-results/` (abaikan git) ditulis ulang oleh run ini (screenshot dan outbox mock Customer); saya tidak dapat memastikan apakah direktori itu sudah ada sebelumnya, jadi tidak dihapus. `tsconfig.json` tidak berubah.
- Hanya database test lokal yang dipakai. Tidak ada secret yang dicetak.

## 8. Dampak pada penjadwalan (Req 3.5)

- Bagian 6 sudah berisi hasil (`test:integration` PASS, 15 file / 83 test). Task bertanda `[BUTUH_INTEGRASI]` tidak lagi tertahan oleh bagian ini dan boleh dimulai, dengan dua syarat: database test lokal dinyalakan lewat `db:test:start` dan `db:test:migrate`, serta vitest dijalankan lewat `node node_modules/vitest/vitest.mjs` karena shim (bagian 5).
- Replay migrasi dari database kosong belum teruji (bagian 6, "Batasan hasil ini"). Task yang mengubah schema atau bergantung pada replay dari nol harus membuktikannya sendiri pada database test baru. Jangan memakai reset destruktif.
- Bagian 7 sudah berisi hasil (`test:e2e` PASS, 22 file spec / 103 test). Task bertanda `[BUTUH_E2E]` tidak lagi tertahan oleh bagian ini dan boleh dimulai, dengan syarat: database test lokal dinyalakan lewat `db:test:start` (skrip `local-e2e-web.ps1` menjalankan migrasi sendiri), dan Playwright dijalankan lewat `node node_modules/@playwright/test/cli.js test` karena shim (bagian 5). Port 3000 harus bebas, atau atur `NIUVA_E2E_PORT`.
- `tests/e2e/local-demo.spec.ts` dikecualikan oleh `testIgnore` di `playwright.config.ts`. Task yang bergantung pada jalur demo lokal tidak punya cakupan dari gate ini dan harus memverifikasinya sendiri.
- Bagian 6 dan 7 sama-sama diukur pada working tree yang memuat perubahan Owner dan perubahan task 1.6–1.8. Selisih di task berikutnya dibandingkan dengan baseline ini, bukan dengan `HEAD` murni.
## 9. Verifikasi I6 (diisi task 1.9)

Dicatat 2026-10-04 oleh task 1.9. Analisis statis saja: tidak ada database yang dinyalakan, tidak ada test yang dijalankan, tidak ada migrasi atau `docs/frontend/mvp-release-readiness.md` yang diubah (Req 10.4).

### 9.1 Klaim yang diperiksa

`docs/frontend/mvp-release-readiness.md:197-201`: `test:integration` "20 test lulus; 2 replay test historis masih gagal karena trigger `orders_commercial_snapshot_immutable` menolak rotasi `public_token_hash` yang sudah dilakukan oleh `recoverReplay`; ini belum diubah dalam scope Customer Auth."

Klaim itu masuk di commit `9ba87d0` (2026-09-25 18:52:28 +0700). Migrasi rotasi masuk dua menit sebelumnya di commit `d385bfe` (18:50:31), yang merupakan leluhur `9ba87d0`. Keduanya ada di `HEAD`. Dokumen readiness tidak punya perubahan uncommitted.

### 9.2 Bukti (a): migrasi mengecualikan `public_token_hash` dari kolom immutable (terbukti dari SQL)

Fungsi `niuva_reject_committed_snapshot_mutation` hanya didefinisikan di dua migrasi (grep seluruh `prisma/migrations/`), jadi tidak ada migrasi lain yang menimpanya.

| Cabang | Migrasi dasar `20260904090000_core_domain_persistence` | Setelah `20260925120000_allow_public_token_rotation` |
| --- | --- | --- |
| `orders` | `order_type`, `currency`, `items_subtotal_rp`, `shipping_total_rp`, `grand_total_rp`, **`public_token_hash`** | `order_type`, `currency`, `items_subtotal_rp`, `shipping_total_rp`, `grand_total_rp` (**`public_token_hash` dihapus**) |
| `custom_print_quotes` (status `SENT`) | 18 kolom termasuk **`public_token_hash`** | 17 kolom (**`public_token_hash` dihapus**); sisanya identik |
| `order_items`, `shipment_rate_snapshots`, `payment_attempts` | tidak berubah | tidak berubah |

Fakta tambahan dari SQL:

- Migrasi rotasi memakai `CREATE OR REPLACE FUNCTION`. Trigger `orders_commercial_snapshot_immutable` (`BEFORE UPDATE ON "orders"`) dibuat di migrasi dasar dan memanggil fungsi berdasarkan nama. Trigger tidak dibuat ulang dan tidak perlu, karena fungsi yang terpasang ikut berganti.
- Migrasi `20260925120000` berada setelah `20260904090000` dan `20260925101339` dalam urutan nama, dan tidak ada migrasi berikutnya yang mendefinisikan ulang fungsi itu.
- Kolom uang dan tipe order tetap dijaga. Hanya kredensial rotasi yang dilonggarkan, sesuai komentar di berkas migrasi.
- Dari sisi code, `recoverReplay` (`src/modules/checkout/service.ts:307`) memanggil `replacePublicTokenHash`, yang di `src/modules/checkout/repository.ts:438` melakukan `order.updateMany({ data: { publicTokenHash } })`, yaitu UPDATE yang hanya mengubah `public_token_hash`. Dengan fungsi hasil migrasi rotasi, UPDATE itu tidak lagi memicu pengecualian `23514`.

Kesimpulan (a): **terbukti secara statis.** Pada state skema setelah 16 migrasi diterapkan, rotasi `public_token_hash` oleh `recoverReplay` tidak ditolak trigger `orders_commercial_snapshot_immutable`. Alasan yang disebut klaim 197-201 tidak berlaku lagi untuk skema saat ini.

### 9.3 Bukti (b): test replay ada dan lulus pada run 1.2 (terbukti dari bagian 6, dengan batas)

Test yang menjalankan jalur replay checkout ada di `tests/integration/`, dan ketiga file-nya termasuk 15 file yang lulus di bagian 6:

| File | Test | Replay lewat |
| --- | --- | --- |
| `database.test.ts:481` | "persists a retail checkout vertical slice and replays it idempotently" | `checkout.create(input)` kedua, mengharapkan `kind: "REPLAY"` dengan `prisma` nyata |
| `project-brief-route.test.ts:268` | "persists a checkout POST through the real route and replays it" | `postCheckout` kedua, mengharapkan `kind: "REPLAY"` |
| `local-demo-route.test.ts:141` | replay POST checkout | `postCheckout` kedua, mengharapkan `kind: "REPLAY"` |

Kesimpulan (b): **terbukti pada level file.** Bagian 6 mencatat 15 file / 83 test lulus, 0 gagal, dan ketiga file di atas ada di daftar lulus. Batasan:

- Bagian 6 tidak mencatat hasil per nama test, hanya ringkasan vitest. Saya tidak dapat menunjuk dua test yang disebut klaim "historis" dengan nama. Dugaan paling masuk akal adalah test replay di `database.test.ts` dan salah satu test route, tetapi itu tidak terbukti.
- Jumlah berubah dari 20 test (klaim) menjadi 83 test (run 1.2), jadi angka klaim memang usang. Angka itu tidak bisa dipakai untuk menyimpulkan apa pun tentang dua test yang gagal.
- Saya tidak membaca isi penuh ketiga test untuk memastikan masing-masing benar-benar melewati `recoverReplay` dengan `replacePublicTokenHash` pada baris order yang ada. Dari potongan yang dibaca, `database.test.ts` menyatakan `kind: "REPLAY"` lalu memeriksa `order.count() === 1`, yang konsisten dengan jalur itu.

### 9.4 Bukti (c): replay migrasi dari database kosong (diperbarui task 3.11: berhasil)

**Pembaruan task 3.11:** replay seluruh 17 migrasi pada database lokal kosong berhasil (bukti lokal, non-production). Paragraf di bawah adalah catatan historis saat task 1.9 (status saat itu: tidak teruji).

**Tidak teruji (saat task 1.9).** Bagian 6 mencatat `migrate deploy` melaporkan `No pending migrations to apply` pada `niuva_test` yang sudah termigrasi. Run 1.2 membuktikan test lulus pada state yang sudah termigrasi, bukan bahwa 16 migrasi bisa dijalankan berurutan dari nol dan menghasilkan fungsi trigger versi rotasi. Secara statis urutan nama migrasi sudah benar (dasar lebih dulu, rotasi kemudian), tetapi itu bukan bukti eksekusi. Hal yang juga tidak bisa dibedakan dari data yang ada: apakah `niuva_test` pada 2026-09-25 belum menerima migrasi `20260925120000` saat klaim ditulis. Jarak dua menit antara kedua commit membuat skenario itu masuk akal, tetapi tidak terbukti.

### 9.5 Status catatan 197-201

**Terbukti usang untuk alasan kegagalan, belum terbukti usang untuk hasil run historisnya.**

- Alasan yang diklaim (trigger menolak rotasi `public_token_hash`) **tidak lagi berlaku** pada skema yang didefinisikan oleh 16 migrasi saat ini. Dasar: 9.2 (SQL) dan 9.3 (run 1.2, 0 test gagal, file replay ikut lulus).
- Pernyataan "2 replay test masih gagal" **tidak lagi benar** sebagai keadaan saat ini pada `niuva_test` yang sudah termigrasi: run 1.2 tidak punya kegagalan.
- Yang **belum terbukti**: bahwa skema yang dibangun dari database kosong juga lulus (9.4), dan identitas tepat dari dua test yang dulu gagal (9.3).

Kesimpulan ringkas: catatan I6 **usang menurut bukti statis dan run 1.2**, dengan batas eksplisit bahwa replay dari nol tidak teruji. Jangan menuliskan "replay migrasi dari nol terbukti lulus" berdasarkan bagian 9.5 ini; bukti replay dari nol kini berasal dari task 3.11 (lihat 9.4).

### 9.6 Tindak lanjut

- Pembaruan `docs/frontend/mvp-release-readiness.md:197-201` dilakukan di task 3.20, bukan di sini. Saran isi: ganti angka 20 test dan klaim 2 kegagalan dengan hasil run 1.2 (15 file / 83 test lulus), tulis bahwa trigger tidak lagi menolak rotasi sejak migrasi `20260925120000`, dan tulis bahwa replay dari database kosong belum teruji.
- Untuk menutup (c), satu task yang punya izin memakai database test baru harus menjalankan `migrate deploy` dari database kosong lalu `test:integration`. Tanpa reset destruktif pada `niuva_test` yang ada.
- Tidak ada perubahan pada `prisma/migrations/`, `src/`, `tests/`, atau database oleh task ini.

## 10. Baseline coverage (diisi task 1.10, hanya bila disetujui)

_Belum dikerjakan. `[APPROVAL_GATE]`: bagian ini diisi hanya jika user menyetujui `@vitest/coverage-v8` secara tertulis._
