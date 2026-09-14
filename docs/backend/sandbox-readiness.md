# Kesiapan sandbox provider

Tanggal audit: 2026-09-14. Baseline: `2cb345de78cc925075180b8f7e557f17d7efb2c4`.
Scope: checkout `C:\Portfolio\NIUVA 2026`, konfigurasi proses saat audit,
dan file environment lokal. Keberadaan akun di dashboard provider, secret
di mesin lain, dan konfigurasi deployment belum diverifikasi.

**Hasil: gate implementasi lokal lulus; uji provider nyata belum siap.**
Boundary Clerk, private-upload orchestration, server-backed checkout path, dan
integration harness sudah tersedia. Kode adapter dan test lokal tidak
membuktikan kredensial, koneksi, atau delivery provider.

## Bukti lokal

- Pemeriksaan presence-only pada `.env.local` menemukan pasangan key Clerk,
  `DATABASE_URL`, dan `APP_URL`. Group Midtrans, Biteship, R2, WhatsApp, dan
  Resend tetap absent. Nilai secret tidak dicetak atau disalin.
- `.env.test.local` ada dan mempunyai `TEST_DATABASE_URL`; `.env.local` dan
  `.env.test.local` tercakup Git ignore. Nilai secret tidak dicetak atau disalin.
- Helper `db:test:status` melaporkan PostgreSQL test tidak berjalan setelah
  smoke terakhir; database integration tidak otomatis menjadi database aplikasi
  ketika menjalankan `pnpm dev`.
- Integration test melakukan `TRUNCATE TABLE`. Dataset transaksi sandbox yang
  ingin dipertahankan harus memakai database development terpisah.

## Checklist per provider

Koneksi provider dan kesiapan dashboard masing-masing tetap berstatus
**NOT_VERIFIED**. Status di bawah hanya menyatakan keberadaan konfigurasi lokal,
bukan keberhasilan login, transaksi, upload, atau delivery.

| Provider | Status lokal | Konfigurasi wajib menurut source saat ini | Syarat sebelum pengujian nyata |
| --- | --- | --- | --- |
| Clerk | `LOCAL_KEYS_PRESENT_LIVE_SMOKE_PENDING` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Instance development; pasangan key dari instance yang sama; user test dan active `AdminProfile` dengan role sesuai policy. Bootstrap Owner mengikuti exact Clerk user ID. |
| Midtrans | `MISSING_LOCAL_CONFIG` | `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Pasangan key sandbox; flag `false`; runtime development; jalur callback yang dapat dijangkau provider menuju `/api/webhooks/midtrans`, diverifikasi sebelum transaksi. |
| Biteship | `MISSING_LOCAL_CONFIG` | `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, `BITESHIP_ORIGIN_AREA_ID` | Key berawalan `biteship_test.`; origin area valid dan daftar kurir yang dipilih; destination test serta variant dengan harga, stock, berat, dan dimensi valid. |
| R2 | `MISSING_LOCAL_CONFIG` | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `CUSTOM_FILE_MAX_BYTES` | Resource development yang terpisah; akses bucket customer tetap private; izin object sesuai operasi adapter; CORS untuk origin upload yang dipilih; limit `104857600`. |
| WhatsApp | `BLOCKED_DECISION` | Provider/API, sender, template/consent, recipient, dan token belum dipilih | Owner memilih provider dan kebijakan non-production; sender bisnis serta identitas provider tidak diisi sebelum biodata resmi tersedia. |
| Resend | `MISSING_LOCAL_CONFIG` | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Sender yang diizinkan akun dan penerima test yang disepakati; konfirmasi pembatasan pengiriman akun sebelum send. Konfigurasi development saja tidak menjamin email tidak terkirim ke penerima sungguhan. |

## Temuan yang memengaruhi urutan setup

1. **Isi satu capability group secara lengkap.** `validateStartupEnvironment`
   menolak group parsial. `.env.example` sudah mengisi
   `CUSTOM_FILE_MAX_BYTES=104857600`, sehingga menyalinnya apa adanya sebelum
   R2 lengkap akan menggagalkan startup. Saat setup parsial nanti, biarkan
   upload limit kosong sampai seluruh group R2 siap.
2. **Preview belum dapat dipakai untuk adapter ini.** Guard provider menolak
   `NODE_ENV=production`, walaupun key sandbox dipakai. Jalur awal yang cocok
   dengan kode sekarang adalah server development. Jangan mengubah NODE_ENV
   production build untuk melewati guard; dukungan staging membutuhkan perubahan
   kontrak runtime tersendiri. Callback lokal membutuhkan akses yang disepakati.
3. **Browser integration masih membutuhkan pekerjaan.** CSP sekarang membatasi
   script dan koneksi ke origin sendiri. Clerk browser SDK, Snap embed, dan
   direct PUT R2 memerlukan origin provider yang ditentukan setelah konfigurasi
   tersedia. Server-to-server fetch tidak dibatasi CSP browser.
4. **Clerk guard bukan provisioning otomatis.** Proxy dan `requireAdmin` tersedia;
   `/admin` menampilkan Action Queue server-owned atau fail-closed, tetapi live
   sign-in dan active profile tetap harus diprovisikan Owner. Valid session saja
   tidak cukup tanpa active profile di database aplikasi.
5. **R2 upload belum mencakup download operator.** Adapter menyediakan signed
   PUT, HEAD, dan delete; authenticated signed download serta cleanup retention
   masih tercatat sebagai pekerjaan lanjutan di kontrak Phase 3.

## Urutan tindak lanjut

1. Lengkapi Clerk live smoke: Owner memilih user development, menjalankan
   `corepack pnpm db:provision:admin`, lalu uji `/admin` dengan browser satu
   worker. Jangan gunakan database yang dibersihkan test suite.
2. Lengkapi group R2 secara utuh, CORS exact-origin, dan smoke intent → PUT →
   confirm; pastikan object tetap private dan row berpindah `PENDING → UPLOADED`.
3. Lengkapi group Biteship/Midtrans beserta origin/courier test, fixture catalog
   dan alamat, lalu uji rates → checkout → pembayaran sandbox → webhook.
4. Putuskan provider WhatsApp dan kebijakan pengiriman sebelum menambah send
   otomatis. Biodata resmi tetap `DEFERRED/OPEN` untuk identitas bisnis.

Setiap provider baru boleh disebut **VERIFIED_SANDBOX** setelah konfigurasi
valid, resource dipastikan non-production, dan skenario provider sebenarnya
berhasil. Kelengkapan nama environment saja belum memenuhi status tersebut.

## Verifikasi audit

- Pemeriksaan source: env server/public, Proxy, Clerk guard, Midtrans, Biteship,
  R2, Resend, guard non-production, CSP, dan harness database integration.
- `corepack pnpm test`: **73/73 lulus**; `corepack pnpm test:backend`:
  **106/106 lulus**; `corepack pnpm test:integration`: **16/16 lulus** dengan
  PostgreSQL loopback, termasuk smoke page `/admin` dari identity Clerk test
  melalui `AdminProfile` aktif ke Action Queue database-backed; focused browser
  gates: **11/11 lulus** pada checkout, custom request, dan admin fail-closed.
  Test memakai fixture/mock provider; tidak menghubungi provider nyata.
- `corepack pnpm typecheck`, `corepack pnpm build`, `corepack pnpm db:validate`,
  dan `git diff --check` lulus. Audit ini tidak menjalankan transaksi provider,
  upload R2 nyata, email, WhatsApp, atau provisioning Owner; database test dan
  server development sudah stopped setelah verifikasi.

Referensi source: `src/lib/env/server.ts`, `src/proxy.ts`,
`src/lib/auth/clerk.ts`, `src/modules/providers/non-production.ts`,
`src/modules/payment/midtrans.ts`, `src/modules/shipping/biteship.ts`,
`src/modules/files/r2.ts`, `src/modules/notifications/resend.ts`,
`src/lib/security/headers.ts`, dan `tests/integration/database.test.ts`.
Kebijakan keputusan: [Phase 2 closure](phase-2-closure-decisions.md).
Batas implementasi: [Phase 3 contract](phase-3-provider-http-contract.md).
