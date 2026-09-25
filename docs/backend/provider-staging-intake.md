# Provider dan Staging Intake — Niuva

Status: **OPEN — menunggu input Owner non-production**

Tanggal snapshot: **2026-09-25**

Dokumen ini adalah formulir intake dan urutan readiness. Ia tidak meminta
secret dikirim melalui chat, commit, issue, atau dokumen repository. Secret
harus tetap berada di environment manager atau `.env.local` yang diabaikan
Git. Pemeriksaan yang dilakukan dari checkout ini hanya membaca nama key dan
status kosong/non-empty, tanpa mencetak nilainya.

## Snapshot presence-only saat ini

| Environment/group | Snapshot | Interpretasi |
| --- | --- | --- |
| `.env.local` | Ada | Development lokal tersedia; bukan staging atau production |
| `.env.test.local` | Ada | Test database terpisah tersedia |
| `.env.staging` | Tidak ada | Staging environment belum disiapkan |
| `.env.production` | Tidak ada | Production environment belum disiapkan |
| Clerk | Dua key non-empty | Live development smoke tetap perlu user test dan `AdminProfile` aktif |
| R2 | Semua tujuh field group non-empty | Validitas resource, private access, CORS, dan lifecycle harus diverifikasi ulang sebelum klaim baru |
| Midtrans | Group blank/absent | Belum siap sandbox smoke |
| Biteship | Group blank/absent | Belum siap rates/shipping smoke |
| Resend | Group blank/absent | Belum siap email smoke |
| WhatsApp | Tidak ada group yang disepakati | `BLOCKED_DECISION`; provider, sender, template, consent, dan recipient belum dipilih |

Presence tidak sama dengan validitas, konektivitas, atau acceptance provider.
Snapshot ini juga tidak mengubah status R2 non-production smoke yang sudah
tercatat sebelumnya.

## Input Owner yang diperlukan

Isi nilai non-secret pada tabel ini. Key atau token tetap diisi langsung pada
environment non-production; jangan ditempelkan ke tabel.

| Area | Input non-secret yang perlu diputuskan | Status |
| --- | --- | --- |
| Scope environment | Nama environment `development` atau `staging`, owner teknis, dan tanggal smoke | `OPEN` |
| Clerk | Development instance, exact test user ID, role (`OWNER`/`ADMIN`), dan database loopback yang dipakai | `OPEN` untuk live smoke |
| Midtrans | Sandbox account, public HTTPS notification URL, test order reference, expiry/cleanup owner | `OPEN` |
| Biteship | Test account, origin area ID, courier allowlist, destination fixture, dan package dimensions | `OPEN` |
| R2 | Development account/bucket names, endpoint, exact `APP_URL` CORS origin, cleanup owner | `PARTIAL`; resource presence ada, re-verification diperlukan |
| Resend | Verified sender domain/from address, test recipient, send-limit policy, dan cleanup owner | `OPEN` |
| WhatsApp | Provider, sender, template, opt-in/consent policy, recipient test, retry/idempotency policy | `BLOCKED_DECISION` |
| Staging app | HTTPS URL, deployment owner, environment variable store, preview-to-staging promotion rule | `OPEN` |
| Staging database | Isolated non-production database URL owner, migration window, seed/fixture policy | `OPEN` |
| Observability | Error tracking destination, alert recipients, 5xx/payment/shipping/upload/DB signals, retention | `OPEN` |
| Backup/rollback | Backup owner, retention, restore proof, deployment rollback procedure, incident contact | `OPEN` |

## Capability-specific acceptance

### Clerk and Admin

1. Owner memilih satu Clerk Development instance dan satu test user.
2. Key disimpan lokal/non-production; exact user ID dipakai untuk
   `corepack pnpm db:provision:admin` tanpa mengirim key.
3. Smoke `/admin` memverifikasi role dari `AdminProfile`, Action Queue, dan
   penolakan user tanpa profile aktif.
4. Setelah smoke, profile test dinonaktifkan atau dihapus dan key dirotasi bila
   kebijakan instance mengharuskannya.

### R2

1. Pastikan bucket customer private, bucket media publik terpisah, dan CORS
   exact-origin hanya untuk `APP_URL` yang disetujui.
2. Jalankan intent → signed PUT → HEAD/confirm → ownership verification dengan
   file sintetis kecil.
3. Pastikan object dan row fixture dibersihkan; jangan menguji production bucket.

### Biteship dan Midtrans

1. Lengkapi capability group masing-masing secara utuh; startup menolak group
   parsial.
2. Biteship: validasi origin/destination, courier allowlist, stock, price,
   weight, dan dimensions.
3. Midtrans: set `MIDTRANS_IS_PRODUCTION=false`, daftarkan HTTPS notification
   URL `/api/webhooks/midtrans`, lalu jalankan sandbox payment.
4. Verifikasi rates → checkout → payment sandbox → webhook, termasuk duplicate
   webhook, invalid signature, late settlement, dan stock reservation.

### Resend dan WhatsApp

1. Uji hanya dengan sender yang sudah diverifikasi dan recipient test yang
   disetujui.
2. Verifikasi idempotency, failure recovery, minimisasi data, dan batas
   pengiriman.
3. WhatsApp tidak boleh diimplementasikan sebelum provider, sender, template,
   consent, dan recipient policy menjadi keputusan Owner.

## Readiness sequence

Urutan yang direkomendasikan:

1. Owner mengisi input non-secret pada tabel dan menyimpan key langsung di
   environment non-production.
2. Jalankan presence/shape validation tanpa mencetak secret:

   ```text
   corepack pnpm db:validate
   corepack pnpm typecheck
   corepack pnpm test:backend
   ```

3. Jalankan satu capability group pada satu waktu dan catat evidence request,
   response class, callback, state transition, cleanup, dan rollback.
4. Setelah semua sandbox gate lulus, siapkan staging terisolasi dengan database
   dan environment variable store terpisah.
5. Production tetap menunggu domain/DNS, database production, monitoring,
   backup/restore, rollback, provider production onboarding, dan Owner release
   acceptance.

## Submission template

Owner dapat mengembalikan jawaban dalam format berikut tanpa secret:

```text
Environment: development | staging
Owner teknis:
Clerk test user ID dan role:
Midtrans sandbox account + notification URL:
Biteship test account + origin area/couriers:
R2 bucket names + APP_URL/CORS origin:
Resend verified sender + test recipient:
WhatsApp decision: provider/sender/template/consent/recipient | NOT APPLICABLE
Staging URL + deployment owner:
Staging database owner:
Observability destination + alert owner:
Backup/restore owner + rollback owner:
Target smoke window:
```

Setelah input ini tersedia, goal berikutnya adalah **Sandbox Provider Smoke**.
Tidak ada langkah pada intake ini yang mengaktifkan production, mengubah DNS,
atau mengirim pesan/email ke penerima nyata.
