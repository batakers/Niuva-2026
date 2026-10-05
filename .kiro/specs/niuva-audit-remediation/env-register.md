# Env Register

Spec: `niuva-audit-remediation`. Dibuat oleh task 3.13 (Req 8.6, 14.1, 14.3). Dokumen ini hanya mendaftar nama env; tidak ada `.env*`, `.env.example`, `package.json`, `src/`, atau config yang diubah. Perubahan `.env.example` tetap Approval_Gate (Req 9.7, 14.2).

Aturan isi:

- Hanya **nama** env dan **nilai contoh non-rahasia** (Req 14.3). Tidak ada nilai dari `.env.local` atau `.env.test.local`; keduanya tidak dibaca untuk dokumen ini.
- Nama di design adalah usulan. Nama final ditetapkan di task implementasinya lalu dicatat di sini.
- Deployment tier mengikuti Req 13.1: `local/test`, `staging`, `production`. Isolasi resource staging dari production adalah bukti lingkungan di luar jangkauan `build` dan CI (Req 14.4).

## 1. Kolom dan nilai status

| Kolom | Arti |
| --- | --- |
| Nama env | Nama persis variabel lingkungan. |
| Tier wajib | Tier tempat env wajib ada (`local/test`, `staging`, `production`), atau `tidak wajib` bila opsional/belum berkonsumen. |
| Status | Lihat daftar status di bawah. |
| Sumber / konsumen | Tempat env divalidasi dan tempat env dibaca. `—` berarti belum ada konsumen. |
| Task pencatat | Task yang menambah atau mengubah baris. |
| Contoh non-rahasia | Bentuk nilai, bukan nilai asli. |

Status:

- `UNUSED_PENDING_APPROVAL`: ada di schema env, tidak ada konsumen; konsumen bergantung pada Approval_Gate.
- `PLANNED`: dicatat task perencanaan, belum masuk schema.
- `IN_SCHEMA`: sudah divalidasi di `serverEnvironmentSchema`.
- `IN_USE`: divalidasi dan dibaca oleh code yang ditunjuk.

## 2. Env tanpa konsumen (Sentry)

| Nama env | Tier wajib | Status | Sumber / konsumen | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | tidak wajib | `UNUSED_PENDING_APPROVAL` | Divalidasi `src/lib/env/server.ts` baris 91 (`optionalHttpUrl`). Konsumen: — | 3.13 | `https://examplePublicKey@o0.ingest.example.invalid/0` |
| `SENTRY_AUTH_TOKEN` | tidak wajib | `UNUSED_PENDING_APPROVAL` | Divalidasi `src/lib/env/server.ts` baris 111 (`optionalNonEmptyString`). Konsumen: — | 3.13 | `<token-placeholder>` (bukan nilai asli) |
| `SENTRY_ORG` | tidak wajib | `UNUSED_PENDING_APPROVAL` | Divalidasi `src/lib/env/server.ts` baris 112 (`optionalNonEmptyString`). Konsumen: — | 3.13 | `example-org` |
| `SENTRY_PROJECT` | tidak wajib | `UNUSED_PENDING_APPROVAL` | Divalidasi `src/lib/env/server.ts` baris 113 (`optionalNonEmptyString`). Konsumen: — | 3.13 | `example-project` |

Keempat nama juga muncul sebagai baris kosong di `.env.example` (baris 50-53, tanpa nilai), tercantum di `docs/TechDesign-Niuva-MVP.md` (daftar env dan paket `@sentry/nextjs` sebagai rencana), dan tidak ada di `package.json`.

### 2.1 Bukti verifikasi (dijalankan 3.13)

Pencarian tanpa membedakan huruf besar/kecil untuk `SENTRY|sentry` (pencarian `sentry` saja pada file manifest). Hasil dicatat apa adanya.

| Lingkup | Pencarian | Hasil |
| --- | --- | --- |
| `package.json` | `sentry` | Tidak ada kecocokan. Tidak ada paket Sentry (`@sentry/*`). |
| `pnpm-lock.yaml` | `sentry` | Tidak ada kecocokan. Tidak ada paket Sentry terkunci. |
| `src/**` | `SENTRY\|sentry` | Hanya `src/lib/env/server.ts`: baris 91 (`NEXT_PUBLIC_SENTRY_DSN`), 111 (`SENTRY_AUTH_TOKEN`), 112 (`SENTRY_ORG`), 113 (`SENTRY_PROJECT`); nomor baris digeser 3.16. Semuanya definisi field schema. Tidak ada `process.env.*SENTRY*`, import SDK, atau pemanggilan `Sentry.init`. |
| `next.config.*` | `SENTRY\|sentry` | Tidak ada kecocokan. Tidak ada `withSentryConfig`. |
| `scripts/**` | `SENTRY\|sentry` | Tidak ada kecocokan. |
| `tests/**` | `SENTRY\|sentry` | Tidak ada kecocokan. |
| Nama file | `sentry` | Tidak ada file (mis. `sentry.client.config.*`, `instrumentation` Sentry). |
| Root config (`*.ts`, `*.mjs`, `*.js`, `*.json`, `*.yml`, `*.yaml`, `*.toml`, `.github/**`) | `SENTRY\|sentry` | Tidak ada kecocokan di luar `pnpm-lock.yaml` (yang juga kosong). |
| `.env.example` | `SENTRY` | Empat baris `KEY=` tanpa nilai (baris 50-53). |
| `docs/`, `agent_docs/` | `SENTRY\|sentry` | Hanya teks dokumentasi/rencana. `docs/backend/foundation.md` menyatakan Sentry belum terpasang dan tidak aktif; `docs/legal/customer-policy-implementation.md` dan `docs/legal/customer-public-input-evidence.md` menyatakan tidak ada konfigurasi Sentry aktif pada snapshot lokal; `docs/Niuva Document/NIUVA_System_Architecture.md` menyatakan SDK Sentry belum terintegrasi. |

Kesimpulan: klaim terbukti. Keempat env hanya didefinisikan sebagai field schema di `src/lib/env/server.ts` dan tidak dibaca oleh code lain. Tidak ada SDK, tidak ada konfigurasi build, dan tidak ada skrip yang mengonsumsinya. Tidak ada temuan konsumen yang membatalkan status.

Batas bukti: pencarian ini membaca repository saja. Ketiadaan konfigurasi di repository tidak membuktikan dashboard Sentry atau variabel di Vercel tidak ada (lihat Req 14.4). Nilai env lokal tidak dibaca.

### 2.2 Tidak ada janji pemantauan eksternal

- Selama SDK pemantauan belum disetujui, tidak ada klaim bahwa error, kegagalan webhook, atau kegagalan admin dikirim ke layanan pemantauan eksternal (Req 8.6).
- Task 3.14 adalah `[APPROVAL_GATE]`: paket SDK, tujuan, dampak maintenance, dampak keamanan, dan biaya bulanan harus disetujui tertulis oleh user sebelum pemasangan (Req 8.7). Tanpa itu, `FailureLogger` tetap interface dan keempat env tetap `UNUSED_PENDING_APPROVAL`.
- Mengisi nilai keempat env di lingkungan mana pun tidak mengaktifkan pemantauan, dan tidak boleh dilaporkan sebagai pemantauan aktif.
- Bila 3.14 disetujui dan selesai, baris di bagian 2 diperbarui ke `IN_USE` dengan konsumen yang ditunjuk; sebelum itu status tidak berubah.
- Pilihan vendor, PII redaction, region, retensi, dan subprocessor Sentry masih OPEN menurut `docs/legal/customer-privacy-retention-sop.md`.

## 3. Env lain yang sudah ada di schema (rujukan, tidak diubah task 3.13)

Daftar ini hanya memberi konteks agar task berikutnya tidak menduplikasi. Status mengikuti pembacaan `serverEnvironmentSchema` oleh 3.13; konsumen tiap env tidak diverifikasi di sini, sehingga tidak diberi status `IN_USE`.

| Nama env | Status | Sumber |
| --- | --- | --- |
| `APP_URL`, `ADMIN_NOTIFICATION_EMAIL`, `DATABASE_URL`, `EMAIL_FROM`, `NODE_ENV`, `NIUVA_RUNTIME_MODE`, `CUSTOM_FILE_MAX_BYTES` | `IN_SCHEMA` | `src/lib/env/server.ts` |
| `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, `BITESHIP_ORIGIN_AREA_ID` | `IN_SCHEMA` | `src/lib/env/server.ts` |
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `IN_SCHEMA` | `src/lib/env/server.ts` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | `IN_SCHEMA` | `src/lib/env/server.ts` |
| `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | `IN_SCHEMA` | `src/lib/env/server.ts` |
| `R2_ACCESS_KEY_ID`, `R2_ACCOUNT_ID`, `R2_ENDPOINT`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `R2_SECRET_ACCESS_KEY` | `IN_SCHEMA` | `src/lib/env/server.ts` |
| `RESEND_API_KEY` | `IN_SCHEMA` | `src/lib/env/server.ts` |

### 3.1 Env runtime yang didaftarkan task 3.15

Semua opsional di `serverEnvironmentSchema` (`src/lib/env/server.ts`): kosong atau tidak diset diterima dan hasilnya `undefined`; nilai salah bentuk ditolak dengan nama field (`EnvironmentValidationError.fields`). Tidak ada yang masuk `CAPABILITY_GROUPS`, jadi `getServerCapabilities` dan `assertCompleteCapabilityGroups` tidak berubah. Konsumen tetap membaca `process.env` langsung; task ini hanya mendaftarkan. Kolom "Tier wajib" diisi task 7.26 dari Capability_Matrix dan kode.

| Nama env | Tier wajib | Status | Bentuk nilai di schema | Sumber / konsumen (path:baris, hasil grep 3.15) | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- | --- |
| `NIUVA_ANALYTICS_ENABLED` | tidak wajib di semua tier (default nonaktif); capability `analytics`, lihat bagian 6 | `IN_SCHEMA` | `optionalBoolean` (`true` atau `false` persis; menjadi boolean) | Schema `src/lib/env/server.ts:96`. Dibaca `=== "true"` di `src/app/layout.tsx:38`, `src/modules/analytics/service.ts:107`; `!== "true"` di `src/app/api/analytics/page-view/route.ts:52` | 3.15 | `false` |
| `CRON_SECRET` | tidak wajib di `local-test`; wajib di `staging`/`production` bila job retensi analytics dipanggil terjadwal (kosong = 503); capability `scheduledJobs`, lihat bagian 6 | `IN_SCHEMA` | `optionalNonEmptyString` | Schema `src/lib/env/server.ts:78`. Dibaca di `src/app/api/analytics/retention/route.ts:5` (kosong memberi 503, baris 7) | 3.15 | `<secret-placeholder>` (bukan nilai asli) |
| `NIUVA_CUSTOMER_AUTH_MOCK` | tidak wajib; hanya `local-test` (`true` untuk mock); harus kosong/`false` di `staging`/`production`; capability `googleAuth`/`passwordAuth`, lihat bagian 6 | `IN_SCHEMA` | `optionalBoolean` | Schema `src/lib/env/server.ts:97`. Dibaca `=== "true"` di `src/modules/customer-auth/google.ts:143` dan `src/modules/customer-auth/email-test-runtime.ts:2`; `internal-testing.ts:30` menutup akses bila nilai bukan kosong/`false`. Diset `true` oleh `playwright.config.ts:50`, `playwright.demo.config.ts:31`, `scripts/local-e2e-web.ps1:44` | 3.15 | `false` |
| `NIUVA_NEXT_DIST_DIR` | tidak wajib di semua tier (default `.next`); dipakai `local-test` untuk isolasi build/E2E; tanpa capability | `IN_SCHEMA` | `optionalNonEmptyString` | Schema `src/lib/env/server.ts:99`. Dibaca di `next.config.ts:5` (`?? ".next"`). Diset oleh `playwright.config.ts:45`, `playwright.demo.config.ts:36`, `scripts/local-e2e-web.ps1:45` | 3.15 | `.next-local` |
| `DEMO_DATABASE_URL` | tidak wajib; hanya `local-test` (skrip seed demo lokal); tanpa capability | `IN_SCHEMA` | `optionalDatabaseUrl` (protokol `postgres:` atau `postgresql:`) | Schema `src/lib/env/server.ts:82`. Dibaca di `scripts/seed-local-demo.ts:11` (yang juga menuntut host loopback dan marker nama database). Diset oleh `playwright.config.ts:40`, `playwright.demo.config.ts:29`, `scripts/local-demo-web.ps1:27`, `scripts/local-e2e-web.ps1:36` | 3.15 | `postgresql://user:password@localhost:5432/niuva_demo` |

Catatan bentuk nilai:

- `NIUVA_ANALYTICS_ENABLED` dan `NIUVA_CUSTOMER_AUTH_MOCK`: konsumen hanya menganggap `"true"` sebagai aktif. Schema menolak nilai lain selain `true`/`false` (mis. `1`, `TRUE`, `yes`), yang sebelumnya diam-diam dianggap nonaktif. `validateStartupEnvironment` dipanggil di `src/instrumentation.ts`, sehingga nilai seperti itu kini menggagalkan start dengan nama field. Pola ini sama dengan `MIDTRANS_IS_PRODUCTION`.
- `DEMO_DATABASE_URL`: schema hanya memeriksa protokol PostgreSQL. Pembatasan loopback dan marker nama database tetap di `scripts/seed-local-demo.ts`, tidak dipindahkan.
- Nilai yang diparse schema untuk `NIUVA_NEXT_DIST_DIR`, `CRON_SECRET`, dan `DEMO_DATABASE_URL` di-trim; konsumen tetap membaca `process.env` mentah.

### 3.2 Env internal auth yang didaftarkan task 3.16

Opsional di `serverEnvironmentSchema`; kosong/tidak diset diterima (hasil `undefined`), nilai salah bentuk ditolak dengan nama field. Tidak masuk `CAPABILITY_GROUPS`. Definisi field ada di satu sumber, `src/lib/env/internal-auth.ts` (`internalAuthEnvironmentShape`), yang di-spread ke `serverEnvironmentSchema` (`src/lib/env/server.ts:94`) dan dipakai `parseInternalAuthEnvironment` oleh `getInternalAuthConfig` (`src/modules/customer-auth/internal-testing.ts:29`).

**Koreksi nama.** `tasks.md` dan design §3.2 menulis `NIUVA_INTERNAL_AUTH_GOOGLE_EMAIL` dan `NIUVA_INTERNAL_AUTH_PASSWORD_EMAIL`. Nama yang benar-benar dibaca kode, test, dan `.env.example` (baris 55-57) adalah **`NIUVA_INTERNAL_GOOGLE_EMAIL`** dan **`NIUVA_INTERNAL_PASSWORD_EMAIL`** (tanpa `_AUTH_`). Env tidak diganti namanya; hanya dokumen ini yang dikoreksi. Nama di `tasks.md` dan `design.md` belum dikoreksi.

| Nama env | Tier wajib | Status | Bentuk nilai di schema | Sumber / konsumen (path:baris, hasil grep 3.16) | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- | --- |
| `NIUVA_INTERNAL_AUTH_ENABLED` | tidak wajib di semua tier; hanya bermakna di `local-test` (butuh `APP_URL` loopback); tanpa capability matrix | `IN_SCHEMA` | `true` atau `false` persis (menjadi boolean); kosong = tidak diset. Hanya `true` membuka internal auth | Schema `src/lib/env/internal-auth.ts:30`. Dibaca lewat `parseInternalAuthEnvironment` di `src/modules/customer-auth/internal-testing.ts:29`. Baris kosong di `.env.example:55` | 3.16 | `false` |
| `NIUVA_INTERNAL_GOOGLE_EMAIL` | tidak wajib; wajib hanya bila `NIUVA_INTERNAL_AUTH_ENABLED=true` (`local-test`) | `IN_SCHEMA` | string yang di-trim dan berbentuk email; kosong = tidak diset | Schema `src/lib/env/internal-auth.ts:31`. Dibaca di `internal-testing.ts:29`. `.env.example:56` | 3.16 | `owner@example.invalid` |
| `NIUVA_INTERNAL_PASSWORD_EMAIL` | tidak wajib; wajib hanya bila `NIUVA_INTERNAL_AUTH_ENABLED=true` (`local-test`) | `IN_SCHEMA` | sama dengan di atas | Schema `src/lib/env/internal-auth.ts:32`. Dibaca di `internal-testing.ts:29`. `.env.example:57` | 3.16 | `owner@example.invalid` |

Catatan:

- Aturan tambahan tetap di `internal-testing.ts` dan tidak dipindahkan: `isInternalAuthDatabase`, `APP_URL` loopback dan origin polos, dua email harus berbeda, `NIUVA_CUSTOMER_AUTH_MOCK`.
- `getInternalAuthConfig` memparse hanya tiga field ini (`z.object(...).safeParse`), bukan `parseServerEnvironment`, sehingga env lain yang salah bentuk tidak pernah membuatnya melempar.
- Modul `internal-auth.ts` sengaja tanpa alias `@/`: skrip cleanup terjadwal (`scripts/cleanup-internal-auth.ts`, `scripts/cleanup-customer-privacy.ts`) memuat `internal-testing.ts` lewat jiti, yang tidak meresolusi alias `@/`. Mengimpor `server.ts` langsung dari `internal-testing.ts` membuat kedua skrip gagal (`Cannot find module '@/modules/policy/privacy'`, dibuktikan 3.16).
- Perubahan di startup: nilai tak kosong yang salah bentuk (mis. `NIUVA_INTERNAL_AUTH_ENABLED=1` atau email tanpa `@`) kini menggagalkan `validateStartupEnvironment` dengan nama field, padahal sebelumnya diam-diam membuat internal auth tertutup. `getInternalAuthConfig` tetap mengembalikan `null` untuk nilai itu. `APP_URL` sudah ada di schema (`optionalHttpUrl`) dan tidak diubah.

### 3.3 Env endpoint Midtrans yang didaftarkan task 3.17

Opsional di `serverEnvironmentSchema`; kosong/tidak diset diterima (hasil `undefined`), nilai salah bentuk ditolak dengan nama field. Tidak masuk `CAPABILITY_GROUPS`, sehingga `getServerCapabilities` dan `assertCompleteCapabilityGroups` tidak berubah (dibuktikan test).

| Nama env | Tier wajib | Status | Bentuk nilai di schema | Sumber / konsumen (path:baris, hasil 3.17) | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- | --- |
| `MIDTRANS_SNAP_ENDPOINT` | tidak wajib di semua tier (default sandbox); capability `payment`/`refund` tetap butuh grup `midtrans`, lihat bagian 6 | `IN_SCHEMA` | URL **HTTPS** saja (di-trim), tanpa username/password; `http:`, protokol lain, dan URL salah bentuk ditolak. Kosong = tidak diset | Schema `src/lib/env/server.ts:111` (`optionalHttpsUrlWithoutCredentials`, didefinisikan baris 50). Dibaca di `src/modules/payment/midtrans.ts:184-187` (`createMidtransSnapGatewayFromEnvironment` mengoper `endpoint` hanya bila diset) lalu dipakai `MidtransSnapGateway` baris 81 (`config.endpoint ?? MIDTRANS_SANDBOX_SNAP_ENDPOINT`, konstanta baris 11-12). Test: `tests/backend/midtrans-endpoint-config.test.ts` | 3.17 | `https://snap.staging.example.test/snap/v1/transactions` |

Catatan:

- **Nama final `MIDTRANS_SNAP_ENDPOINT`** (sesuai usulan): mengikuti awalan `MIDTRANS_*` pada env Midtrans lain dan menyebut yang dikonfigurasi, yaitu endpoint pembuatan transaksi Snap, bukan endpoint webhook atau dashboard.
- Tanpa env: perilaku identik dengan sebelumnya (`https://app.sandbox.midtrans.com/snap/v1/transactions`).
- **Bukan izin aktivasi.** `assertNonProductionProvider` tidak diubah dan tetap dipanggil di `createMidtransSnapGatewayFromEnvironment` dan `MidtransSnapGateway.createPayment`. Mengisi env ini dengan URL produksi tetap ditolak `PROVIDER_UNAVAILABLE` bila `NODE_ENV=production` atau `MIDTRANS_IS_PRODUCTION=true`, dan tidak ada request keluar. Capability_Matrix dan guard berbasis tier adalah task 7.x.
- Header `Authorization` (server key) dikirim ke URL ini, sehingga schema menolak `http:` dan URL ber-kredensial. Schema tidak membatasi host; allowlist host (mis. hanya `*.midtrans.com`) tidak dikerjakan di 3.17 dan tetap tanggung jawab yang menyetel env. Nilai yang tak lolos schema menggagalkan `validateStartupEnvironment` dengan nama field, tanpa mencetak nilainya.
- `.env.example` tidak diubah (Req 9.7, 14.2).

### 3.4 Env origin dev yang didaftarkan task 3.18

Opsional di `serverEnvironmentSchema`; kosong/tidak diset (atau hanya koma/spasi) diterima dan hasilnya `undefined`; nilai salah bentuk ditolak dengan nama field. Tidak masuk `CAPABILITY_GROUPS`, sehingga `getServerCapabilities` dan `assertCompleteCapabilityGroups` tidak berubah (dibuktikan `tests/backend/dev-origins.test.ts`).

| Nama env | Tier wajib | Status | Bentuk nilai di schema | Sumber / konsumen (path:baris, hasil 3.18) | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- | --- |
| `NIUVA_DEV_ALLOWED_ORIGINS` | tidak wajib (default kosong) | `IN_SCHEMA` | Daftar dipisah koma; tiap entri di-trim, entri kosong dibuang. Entri sah: hostname atau IPv4 polos (`localhost`, `dev.example.test`, `192.0.2.10`) atau wildcard di depan (`*.` / `**.`) di atas domain non-numerik dengan minimal dua label. Skema, port, path, kredensial, spasi di tengah, IPv6, `*`, `*.com`, dan `*.<angka>` ditolak. Hasil parse: `string[]` atau `undefined` | Schema `src/lib/env/server.ts:143` (`optionalDevOriginList`, didefinisikan baris 59). Bentuk nilai di `src/lib/env/dev-origins.ts` (`isValidDevOrigin`, `parseDevOriginList`, `getDevAllowedOrigins`). Dibaca di `next.config.ts:11` (`allowedDevOrigins: getDevAllowedOrigins()`). Test: `tests/backend/dev-origins.test.ts` | 3.18 | `192.0.2.10` atau `192.0.2.10,*.lan.example.test` |

Catatan:

- **Nama final `NIUVA_DEV_ALLOWED_ORIGINS`** (sesuai usulan): awalan `NIUVA_*` seperti env runtime lain, dan "DEV" menandai bahwa hanya `next dev` yang membacanya.
- **Dokumen Next yang dibaca:** `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md` (salinan Pages Router: `02-pages/04-api-reference/04-config/01-next-config-js/allowedDevOrigins.md`). Contohnya memakai hostname polos dan wildcard `*.local-origin.dev`; dokumen tidak menyebut port atau URL penuh. Implementasi dibaca langsung untuk memastikan: `node_modules/next/dist/server/app-render/csrf-protection.js` (`isCsrfOriginAllowed`, `matchWildcardDomain`) membandingkan dengan **hostname** request saja (port dibuang oleh `block-cross-site-dev.js` lewat `parseUrl(...).hostname`), sehingga entri ber-port atau ber-skema tidak akan pernah cocok. `*` tunggal ditolak Next; `*.com` tidak ditolak Next, karena itu schema ini menolaknya.
- **Hanya dev server.** `allowedDevOrigins` dipakai di `node_modules/next/dist/server/lib/router-server.js:207, 336, 669` di balik `development &&`; `config-schema.js:497` hanya memvalidasi `array<string>` opsional. `next build` dan server production tidak memakainya. Default kosong berarti perilaku bawaan Next (hanya `localhost`, `**.localhost`, dan hostname server).
- **Pendekatan:** modul kecil bebas-alias `src/lib/env/dev-origins.ts` (pola 3.16) yang diimpor **relatif** oleh `next.config.ts` dan oleh `server.ts`. `next.config.ts` tidak bisa mengimpor `server.ts` karena rantainya memuat `@/modules/policy/privacy`, dan tidak memakai `parseServerEnvironment` yang melempar. Di `next.config.ts`, entri tak valid diabaikan tanpa melempar; schema melaporkannya dengan nama field saat `validateStartupEnvironment` (`src/instrumentation.ts`).
- **Dampak untuk developer:** IP LAN `192.168.1.11` tidak lagi tertanam. Developer yang menguji dari perangkat LAN harus menambahkan `NIUVA_DEV_ALLOWED_ORIGINS=<ip-atau-host-perangkat>` ke `.env.local` mereka sendiri lalu me-restart `next dev`. `.env.local` dan `.env.example` tidak diubah di task ini (Req 9.7, 14.2); baris `.env.example` baru menunggu persetujuan user.

### 3.5 Env tier dan provider mode yang didaftarkan task 7.2

Opsional di `serverEnvironmentSchema`; kosong/tidak diset diterima (hasil `undefined`), nilai salah bentuk ditolak dengan nama field. Tidak masuk `CAPABILITY_GROUPS`. Belum ada konsumen (Capability_Resolver adalah 7.4); mendefinisikan env ini tidak memberi izin apa pun. Definisi field di `src/lib/env/deployment.ts` (bebas alias), di-spread ke `serverEnvironmentSchema`.

| Nama env | Tier wajib | Status | Bentuk nilai di schema | Sumber / konsumen | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- | --- |
| `NIUVA_DEPLOYMENT_TIER` | wajib eksplisit di `staging` dan `production` (bila kosong, kode jatuh ke `production` lewat `NODE_ENV`); opsional di `local-test`; lihat bagian 6 | `IN_SCHEMA` | `local-test`, `staging`, atau `production`; di-trim dan tidak peka huruf besar/kecil. Kosong = tidak diset | Schema `src/lib/env/server.ts` (spread `deploymentEnvironmentShape`). Konsumen: — (`resolveDeployment` belum dipanggil siapa pun) | 7.2 | `staging` |
| `NIUVA_PROVIDER_MODE` | tidak wajib (kosong = `mock`); `live` tidak diizinkan matrix di tier mana pun; lihat bagian 6 | `IN_SCHEMA` | `mock`, `sandbox`, atau `live`; di-trim dan tidak peka huruf besar/kecil. Kosong = tidak diset | sama; konsumen: — | 7.2 | `mock` |

Resolusi fail-closed (`resolveDeploymentTier`, `resolveProviderMode`, `resolveDeployment`):

- Tier tak terset: `NODE_ENV` `development`/`test` menjadi `local-test`; `production` atau `NODE_ENV` tak terset menjadi `production`.
- Tier eksplisit `local-test` dengan `NODE_ENV=production` diperlakukan `production`, agar env tier tidak mencabut penolakan yang berlaku hari ini.
- Mode tak terset menjadi `mock`.
- `ACTIVATION_GRANTS` per tier kosong; `hasActivationGrant` selalu `false`. `NIUVA_PROVIDER_MODE=live` tidak membuka apa pun. Tidak ada task yang menetapkan izin aktivasi.
- `assertNonProductionProvider` dan `isLocalDemoMode` tidak diubah. `.env.example` tidak diubah (Req 9.7, 14.2).

## 4. Env baru yang direncanakan (diisi task berikutnya)

Baris di bawah dicatat oleh task yang menyebutnya. Nama final ditetapkan di task implementasi; kolom "Tier wajib" diisi saat Capability_Matrix (task 7.x) menetapkan tier. Sampai saat itu nilainya `TBD`, bukan tebakan.

| Nama env | Tier wajib | Status | Sumber / konsumen | Task pencatat | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- |
| — | — | — | Tidak ada baris rencana tersisa (baris 3.17 di bagian 3.3, baris 3.18 di bagian 3.4) | — | — |

Catatan: task pencatat memverifikasi dan mengganti kolom "Sumber / konsumen" dengan bukti saat mengerjakannya. Tier dan env lain (mis. untuk 7.x) ditambahkan di bagian ini dengan format yang sama.

## 5. Cara menambah baris

1. Tambahkan satu baris di bagian 4 (atau pindahkan ke bagian 3 saat masuk schema) dengan kolom yang sama.
2. Isi "Tier wajib" dari Capability_Matrix; jangan menebak. Tulis `TBD` bila belum ada.
3. Isi "Sumber / konsumen" dengan path dan baris yang diperiksa, bukan dugaan.
4. Contoh nilai hanya non-rahasia: placeholder, domain `.invalid`/`example`, atau alamat dokumentasi. Jangan menyalin nilai dari `.env.local`/`.env.test.local`.
5. Perubahan `.env.example` tetap butuh persetujuan user (Req 9.7, 14.2); tulis nama di sini, bukan di `.env.example`.

## 6. Register per tier dan capability (task 7.26; Req 14.1, 14.3, 14.4)

Diturunkan dari `src/lib/env/server.ts` (`serverEnvironmentSchema`, `CAPABILITY_GROUPS`), `deployment.ts`, `origin.ts`, `server-actions-origins.ts`, `internal-auth.ts`, `dev-origins.ts`, `object-storage-startup.ts`, dan `requiredConfig` di `src/modules/capabilities/matrix.ts`. Tidak ada persyaratan yang ditambah di luar yang dibaca dari kode. Dokumen ini hanya docs: `.env.example` dan `.env*` tidak disentuh (Req 9.7, 14.2; perubahan `.env.example` adalah task 7.27, Approval_Gate).

Arti "wajib": kode gagal start, atau capability yang bergantung padanya ditolak (fail-closed), bila env tidak ada di tier itu. `-` berarti tidak wajib di tier itu. Nilai contoh hanya placeholder; `<set-in-host>` berarti nilai diisi di host/secret store, tidak pernah di repository.

### 6.1 Capability dan grup config (dari matrix)

| Capability | `requiredConfig` (matrix) | Resource | Grup env |
| --- | --- | --- | --- |
| `signup` | — | database | Ditolak di semua tier lewat activation grant (kosong), bukan lewat env |
| `googleAuth` | `customerGoogle` | database | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| `passwordAuth` | — | database | hanya `DATABASE_URL` |
| `emailSender`, `emailDelivery`, `privacyProof` | `resend` | `emailDelivery`/`privacyProof`: database | `RESEND_API_KEY`, `EMAIL_FROM` |
| `privacyRights` | — | database | hanya `DATABASE_URL` |
| `objectStorage` | `objectStorage` | privateObjectStorage | enam env R2 (bagian 6.4) |
| `payment`, `refund` | `midtrans` | database | `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` |
| `shipping` | `biteship` | database | `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, `BITESHIP_ORIGIN_AREA_ID` |
| `analytics` | — | — | `NIUVA_ANALYTICS_ENABLED` (flag, bukan grup) |
| `scheduledJobs` | — | database | `DATABASE_URL` (plus `CRON_SECRET` untuk endpoint retensi, lihat tabel 6.2) |

Catatan matrix: mode yang diizinkan `local-test` = `mock`/`sandbox` tanpa activation grant; `staging` = `mock`/`sandbox` dengan activation grant (daftar grant kosong, jadi tertolak sampai ada instruksi terpisah); `production` = tidak ada mode (tertolak). `live` tidak ada di `allowedModes` tier mana pun. Gate kebijakan (`PUB-POLICY`, `PUB-AGE`, `PUB-GUARDIAN`) hanya efektif di `staging` dan `production`. Grup `clerkAdmin` (Clerk admin) ada di `CAPABILITY_GROUPS` tetapi **tidak** ada di `requiredConfig` capability mana pun.

Konsekuensi penting: pada grup env di atas, mengisi sebagian saja ditolak saat start (`assertCompleteCapabilityGroups` lewat `validateStartupEnvironment`, `src/instrumentation.ts`); mengisi semua tidak otomatis mengaktifkan provider (perlu mode yang diizinkan dan activation grant).

### 6.2 Env per tier

Kolom tier: `LT` = `local-test`, `ST` = `staging`, `PR` = `production`. "Wajib (grup)" berarti wajib bila capability terkait dipakai di tier itu, dan grupnya harus lengkap.

| Nama env | LT | ST | PR | Capability / fungsi | Contoh non-rahasia |
| --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | dibentuk tool (`development`/`test`) | `production` (dibentuk `next start`) | `production` | Dasar resolusi tier; `production` menolak tier `local-test` dan provider non-aman | `production` |
| `NIUVA_DEPLOYMENT_TIER` | - (default dari `NODE_ENV`) | wajib eksplisit `staging` | wajib eksplisit `production` | Memilih baris matrix; kosong di host = `production` (paling ketat), sehingga staging tanpa env ini diperlakukan production | `staging` |
| `NIUVA_PROVIDER_MODE` | - (kosong = `mock`) | - (`mock`/`sandbox`) | - (tidak ada mode diizinkan) | Mode provider; `live` tidak diizinkan di tier mana pun | `mock` |
| `NIUVA_RUNTIME_MODE` | opsional (`demo` hanya bila `NODE_ENV` development/test, DB loopback bermarker) | - | - | `isLocalDemoMode`; nilai `demo` di host hosted tidak berlaku | `demo` |
| `APP_URL` | wajib loopback bila memakai internal auth / origin check | wajib (bagian 6.3) | wajib (bagian 6.3) | Origin kanonis (cookie, OAuth, link bukti, `serverActions.allowedOrigins`) | `https://staging.example.test` |
| `DATABASE_URL` | wajib untuk fitur ber-database | wajib | wajib | Resource `database` (hampir semua capability), katalog live `/shop`, `/cart`, dll. | `postgresql://user:<set-in-host>@db.example.invalid:5432/niuva` |
| `DEMO_DATABASE_URL` | opsional | - | - | Skrip seed demo lokal | `postgresql://user:<placeholder>@localhost:5432/niuva_demo` |
| `GOOGLE_CLIENT_ID` | wajib (grup) bila `googleAuth` non-mock | wajib (grup) | wajib (grup) | `googleAuth` | `<set-in-host>` |
| `GOOGLE_CLIENT_SECRET` | wajib (grup) | wajib (grup) | wajib (grup) | `googleAuth` | `<set-in-host>` |
| `GOOGLE_REDIRECT_URI` | wajib (grup); URL HTTP(S) | wajib (grup); harus di origin `APP_URL` | wajib (grup); harus di origin `APP_URL` | `googleAuth` | `https://staging.example.test/api/auth/google/callback` |
| `RESEND_API_KEY` | wajib (grup) bila kirim email | wajib (grup) | wajib (grup) | `emailSender`, `emailDelivery`, `privacyProof` | `<set-in-host>` |
| `EMAIL_FROM` | wajib (grup) | wajib (grup) | wajib (grup) | sama | `Niuva <noreply@example.invalid>` |
| `ADMIN_NOTIFICATION_EMAIL` | - | - | - | Opsional (format email); tidak ada di matrix. Lihat bagian 6.6 | `admin@example.invalid` |
| `MIDTRANS_IS_PRODUCTION` | wajib (grup) bila `payment`; `false` | wajib (grup); `false` | wajib (grup) | `payment`, `refund` (nilai `true` ditolak guard non-produksi) | `false` |
| `MIDTRANS_SERVER_KEY` | wajib (grup) | wajib (grup) | wajib (grup) | `payment`, `refund` | `<set-in-host>` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | wajib (grup) | wajib (grup) | wajib (grup) | `payment`, `refund` (nilai publik, tetap bukan untuk repository) | `<set-in-host>` |
| `MIDTRANS_SNAP_ENDPOINT` | - | - | - | Override endpoint Snap; HTTPS tanpa kredensial. Bukan bagian grup | `https://snap.staging.example.test/snap/v1/transactions` |
| `BITESHIP_API_KEY` | wajib (grup) bila `shipping` | wajib (grup) | wajib (grup) | `shipping` | `<set-in-host>` |
| `BITESHIP_COURIERS` | wajib (grup) | wajib (grup) | wajib (grup) | `shipping` (daftar kurir dipisah koma; kosong = ongkir "menyusul") | `jne,sicepat` |
| `BITESHIP_ORIGIN_AREA_ID` | wajib (grup) | wajib (grup) | wajib (grup) | `shipping` | `<area-id-placeholder>` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `R2_ENDPOINT` | wajib semua atau tidak sama sekali | wajib semua bila upload/`objectStorage` dipakai | sama | `objectStorage`; unggah custom 3D (bagian 6.4) | `<set-in-host>`; endpoint `https://account-id.r2.example.invalid` |
| `CUSTOM_FILE_MAX_BYTES` | opsional; bila diisi harus `104857600` dan grup R2 lengkap | sama | sama | Mengaktifkan `customUploads` (bersama `DATABASE_URL` dan R2 lengkap) | `104857600` |
| `CLERK_SECRET_KEY` | wajib (grup) bila area admin dipakai | wajib (grup) | wajib (grup) | Admin auth; di luar matrix (lihat 6.6) | `<set-in-host>` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | wajib (grup) bila admin dipakai (`/admin` fail-closed bila kosong) | wajib (grup) | wajib (grup) | Admin auth; di luar matrix | `<set-in-host>` |
| `CRON_SECRET` | - | wajib bila endpoint retensi analytics dijadwalkan (kosong = 503) | sama | `scheduledJobs` (endpoint `/api/analytics/retention`) | `<set-in-host>` |
| `NIUVA_ANALYTICS_ENABLED` | - | - (opt-in `true`; capability `analytics` tetap butuh gate `PUB-POLICY` di ST/PR) | - (sama) | `analytics` | `false` |
| `NIUVA_CUSTOMER_AUTH_MOCK` | opsional (`true` untuk mock) | harus kosong/`false` | harus kosong/`false` | Mock auth customer; `internal-testing.ts` menutup akses bila diisi selain kosong/`false` | `false` |
| `NIUVA_INTERNAL_AUTH_ENABLED` | opsional | harus kosong/`false` | harus kosong/`false` | Internal auth; mensyaratkan `APP_URL` loopback dan DB internal, jadi tidak berfungsi di hosted | `false` |
| `NIUVA_INTERNAL_GOOGLE_EMAIL`, `NIUVA_INTERNAL_PASSWORD_EMAIL` | wajib (dan beda) hanya bila internal auth aktif | - | - | Internal auth | `owner@example.invalid` |
| `NIUVA_DEV_ALLOWED_ORIGINS` | opsional (hanya `next dev`) | - (tidak dibaca) | - (tidak dibaca) | `allowedDevOrigins` | `192.0.2.10` |
| `NIUVA_NEXT_DIST_DIR` | opsional (isolasi build/E2E) | - | - | `next.config.ts` `distDir`; relatif, default `.next` | `.next-local` |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | - | - | - | Tidak ada konsumen (bagian 2); tidak wajib di tier mana pun | lihat bagian 2 |

### 6.3 Aturan `APP_URL` per tier (`src/lib/env/origin.ts`)

- `staging` dan `production`: skema `https` saja, host domain publik (minimal dua label, TLD berhuruf; `localhost`, label tunggal, dan IP literal ditolak).
- `local-test`: `http` atau `https`, host hanya `localhost`, `127.0.0.1`, atau `[::1]`.
- Semua tier: kosong, kredensial (`user@`), path selain `/`, query, fragment, wildcard `*`, spasi/karakter kontrol, dan authority salah bentuk ditolak. Hasil kanonis: skema dan host huruf kecil, port default dibuang, tanpa slash akhir.
- Fail-closed, tanpa menebak: `getServerActionsOrigins` memberi daftar kosong (hanya same-origin) bila `APP_URL` kosong atau tidak valid, dan menulis peringatan (nama dan kode alasan, bukan nilai) di `staging`/`production`.
- `APP_URL` di `serverEnvironmentSchema` hanya diperiksa sebagai URL HTTP(S); aturan tier di atas diterapkan `resolveAppOrigin`, bukan schema. Nilai `APP_URL` wajib benar di host staging/production sebagai bukti lingkungan (bagian 6.5).

Contoh: `local-test` `http://localhost:3000`; `staging` `https://staging.example.test`; `production` `https://www.example.test`.

### 6.4 Grup R2: semua atau tidak sama sekali

Enam env `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BUCKET`, `R2_ENDPOINT` adalah satu grup. Dua lapis guard:

- `validateStartupEnvironment` (`server.ts`): sebagian terisi menolak start dengan daftar nama field yang kosong. `CUSTOM_FILE_MAX_BYTES` terisi tanpa R2 lengkap juga ditolak (semua field R2 dilaporkan).
- `assertObjectStorageStartup` (`object-storage-startup.ts`, task 7.14): grup setengah terisi, atau `CUSTOM_FILE_MAX_BYTES` terisi tanpa satu pun R2, dicatat ke failure log (nama variabel saja, nilai tidak pernah) lalu melempar; server tidak start agar origin `connect-src` R2 di CSP tidak turun diam-diam. Grup kosong seluruhnya dan `CUSTOM_FILE_MAX_BYTES` kosong dianggap konfigurasi sah tanpa object storage.
- Nilai `R2_ENDPOINT` harus URL HTTP(S). `CUSTOM_FILE_MAX_BYTES` hanya boleh sama dengan batas yang disetujui (104857600 byte = 100 MiB).
- Bucket private menyimpan file 3D/CAD customer dengan akses tertanda tangan berumur pendek; bucket dan kredensial staging harus terpisah dari production (bagian 6.5).

### 6.5 Isolasi staging dari production: bukti lingkungan (Req 14.4)

Register ini mendaftar **nama** env dan aturan bentuknya. Ia tidak dan tidak bisa membuktikan bahwa resource staging terpisah dari production. Kebenaran berikut adalah bukti lingkungan di luar jangkauan `build` dan CI (keduanya hanya memakai PostgreSQL ephemeral dan tanpa kredensial provider):

- database staging berbeda dari database production (host, nama, dan kredensial);
- bucket R2 staging dan production terpisah, dengan access key terpisah;
- key Midtrans, Biteship, Resend, Google OAuth client, dan Clerk instance staging terpisah dari production (key sandbox/mock di staging);
- `APP_URL`, `GOOGLE_REDIRECT_URI`, dan webhook callback di host mengarah ke domain tier yang benar;
- `NIUVA_DEPLOYMENT_TIER` benar-benar `staging`/`production` di host;
- tidak ada secret production yang dibagikan ke environment staging.

Hasil `lint`, `typecheck`, `test`, Prisma validate, Chromium E2E, dan `build` yang hijau tidak boleh dilaporkan sebagai bukti isolasi atau kesiapan staging/production. Sampai pemilik lingkungan menunjukkan bukti dari host, statusnya `unverified`.

### 6.6 Env yang hanya dibaca skrip atau tooling (tidak lewat schema)

Dibaca langsung dari `process.env` oleh skrip/konfigurasi lokal; hanya `local-test`, tidak wajib di tier mana pun, tidak boleh diisi di host staging/production.

| Nama env | Konsumen | Contoh non-rahasia |
| --- | --- | --- |
| `NIUVA_E2E_PORT` | `playwright.config.ts` (port lokal 1024-65535) | `3000` |
| `TEST_DATABASE_URL` | `scripts/seed-approved-public-content.ts` (wajib untuk skrip itu) | `postgresql://user:<placeholder>@localhost:5432/niuva_test` |
| `CATALOG_DATABASE_URL`, `CATALOG_SEED_FILE`, `CATALOG_SEED_CONFIRMATION` | `scripts/seed-catalog.ts` (DB loopback; konfirmasi literal `I_UNDERSTAND_NON_PRODUCTION`) | `./seed/catalog.json` |
| `PUBLIC_CONTENT_DATABASE_URL`, `PUBLIC_CONTENT_SEED_CONFIRMATION` | `scripts/seed-local-public-content.ts` | `I_UNDERSTAND_NON_PRODUCTION` |
| `SHOP_DATASET_DIR` | `scripts/prepare-shop-catalog.ts` | `docs/source/Dataset Shop Niuva` |
| `ADMIN_PROFILE_ALLOW_UPDATE` | `scripts/provision-admin-profile.ts` (`YES` untuk ubah profil admin yang sudah ada) | kosong |
| `CI` | `playwright.config.ts` (bawaan CI) | `true` |

Catatan: `ADMIN_NOTIFICATION_EMAIL` dan `ADMIN_PROFILE_ALLOW_UPDATE` dicatat berdasarkan schema/skrip; konsumen runtime `ADMIN_NOTIFICATION_EMAIL` tidak diverifikasi task ini.

### 6.7 Batas dan yang tidak terklasifikasi

- Clerk (`CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`): kewajiban tier diturunkan dari kode (`/admin` fail-closed tanpa publishable key; grup harus lengkap), bukan dari matrix, karena tidak ada capability admin di matrix. Tier wajib ini perlu dikonfirmasi saat capability admin ditambahkan.
- `ADMIN_NOTIFICATION_EMAIL`: hanya ada di schema (opsional); konsumen tidak dilacak, jadi tier wajib tidak dapat ditetapkan dan dicatat "tidak wajib".
- `CRON_SECRET` di `staging`/`production` wajib hanya bila job dijadwalkan; penjadwal di host belum terlihat dari repository.
- `NIUVA_ANALYTICS_ENABLED`: aktif tidaknya di tier gated juga bergantung gate `PUB-POLICY` (keputusan Owner terbuka); register tidak memutuskannya.
- Nilai nyata tidak dibaca dari `.env.local` atau `.env.test.local`. `.env.example` tidak diubah; selisih dengan register ini menjadi masukan task 7.27 setelah persetujuan tertulis.
