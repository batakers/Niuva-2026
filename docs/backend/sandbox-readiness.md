# Kesiapan sandbox provider

Tanggal audit: 2026-09-06. Baseline: `542375db56f0a8313bf0596ac0c127b7368cad0f`.
Scope: checkout `C:\Portfolio\NIUVA 2026`, konfigurasi proses saat audit,
dan file environment lokal. Keberadaan akun di dashboard provider, secret
di mesin lain, dan konfigurasi deployment belum diverifikasi.

**Hasil: audit selesai; uji transaksi provider belum siap.** Kelima provider
belum dikonfigurasi pada runtime development checkout ini. Kode adapter dan
test lokal tidak membuktikan kredensial, koneksi, atau delivery provider.

## Bukti lokal

- Loader environment milik instalasi Next, dalam mode development, tidak
  menemukan file environment development untuk dimuat. Semua nama konfigurasi
  pada tabel di bawah absent dari environment efektif.
- `.env.test.local` ada dan mempunyai `TEST_DATABASE_URL`; `.env.local` dan
  `.env.test.local` tercakup Git ignore. Nilai secret tidak dicetak atau disalin.
- Helper `db:test:status` melaporkan PostgreSQL test tidak berjalan; exit 1
  adalah hasil pemeriksaan status stopped, bukan kegagalan test provider.
- `DATABASE_URL` aplikasi dan `APP_URL` belum tersedia. Database integration
  tidak otomatis menjadi database aplikasi ketika menjalankan `pnpm dev`.
- Integration test melakukan `TRUNCATE TABLE`. Dataset transaksi sandbox yang
  ingin dipertahankan harus memakai database development terpisah.

## Checklist per provider

Semua status konfigurasi berikut adalah **MISSING_LOCAL_CONFIG**. Koneksi
provider dan kesiapan dashboard masing-masing berstatus **NOT_VERIFIED**.

| Provider | Konfigurasi wajib menurut source saat ini | Syarat sebelum pengujian nyata |
| --- | --- | --- |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Instance development; pasangan key dari instance yang sama; user test dan active `AdminProfile` dengan role sesuai policy. Bootstrap Owner mengikuti exact Clerk user ID. |
| Midtrans | `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Pasangan key sandbox; flag `false`; runtime development; jalur callback yang dapat dijangkau provider menuju `/api/webhooks/midtrans`, diverifikasi sebelum transaksi. |
| Biteship | `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, `BITESHIP_ORIGIN_AREA_ID` | Key berawalan `biteship_test.`; origin area valid dan daftar kurir yang dipilih; destination test serta variant dengan harga, stock, berat, dan dimensi valid. |
| R2 | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `CUSTOM_FILE_MAX_BYTES` | Resource development yang terpisah; akses bucket customer tetap private; izin object sesuai operasi adapter; CORS untuk origin upload yang dipilih; limit `104857600`. |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Sender yang diizinkan akun dan penerima test yang disepakati; konfirmasi pembatasan pengiriman akun sebelum send. Konfigurasi development saja tidak menjamin email tidak terkirim ke penerima sungguhan. |

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
4. **Clerk guard bukan admin UI lengkap.** Proxy dan `requireAdmin` tersedia,
   tetapi inventaris route belum mempunyai halaman admin/sign-in operasional.
   Valid session saja tidak cukup tanpa active profile di database aplikasi.
5. **R2 upload belum mencakup download operator.** Adapter menyediakan signed
   PUT, HEAD, dan delete; authenticated signed download serta cleanup retention
   masih tercatat sebagai pekerjaan lanjutan di kontrak Phase 3.

## Urutan tindak lanjut

1. Tentukan database development terpisah dan APP_URL; sediakan konfigurasi
   lokal terlindungi. Jangan gunakan database yang dibersihkan test suite
   untuk menyimpan bukti transaksi sandbox.
2. Lengkapi group Biteship dan Midtrans beserta origin/courier test, kemudian
   verifikasi konfigurasi tanpa mencetak key. Tetapkan jalur callback sebelum
   memulai transaksi. Ini membuka pengujian retail lewat HTTP/service.
3. Siapkan fixture catalog dan alamat test. Uji rates → checkout → pembayaran
   sandbox → webhook; catat referensi non-secret dan state database, termasuk
   duplicate notification dan late settlement.
4. Lengkapi Clerk dan bootstrap Owner untuk pengujian operasi admin; lanjutkan
   R2 dan Resend dengan resource serta penerima test yang terkonfirmasi.

Setiap provider baru boleh disebut **VERIFIED_SANDBOX** setelah konfigurasi
valid, resource dipastikan non-production, dan skenario provider sebenarnya
berhasil. Kelengkapan nama environment saja belum memenuhi status tersebut.

## Verifikasi audit

- Pemeriksaan source: env server/public, Proxy, Clerk guard, Midtrans, Biteship,
  R2, Resend, guard non-production, CSP, dan harness database integration.
- `corepack pnpm exec vitest run --config vitest.backend.config.mts tests/backend/env.test.ts tests/backend/admin-auth.test.ts tests/backend/phase3-providers.test.ts tests/backend/biteship-retail-rates.test.ts`: **29/29 lulus** pada 4 file. Test memakai fixture/mock; tidak menghubungi provider.
- Audit ini tidak menjalankan transaksi, upload, email, atau provisioning.
  Database test tetap stopped. Perubahan hanya dokumen ini; tidak ada perubahan
  runtime/dependency/migration yang membutuhkan build ulang.

Referensi source: `src/lib/env/server.ts`, `src/lib/env/public.ts`,
`src/proxy.ts`, `src/lib/auth/clerk.ts`, `src/modules/providers/non-production.ts`,
`src/modules/payment/midtrans.ts`, `src/modules/shipping/biteship.ts`,
`src/modules/files/r2.ts`, `src/modules/notifications/resend.ts`,
`src/lib/security/headers.ts`, dan `tests/integration/database.test.ts`.
Kebijakan keputusan: [Phase 2 closure](phase-2-closure-decisions.md).
Batas implementasi: [Phase 3 contract](phase-3-provider-http-contract.md).
