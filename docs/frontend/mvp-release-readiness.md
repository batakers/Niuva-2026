# MVP release readiness — non-provider closure

Snapshot: **2026-09-20** · checkout `main` · commit `a171686` · scope
non-provider dan non-production.

Dokumen ini adalah ledger status terkini untuk handoff. Checklist fase lama di
`tasks/todo.md` dan `tasks/plan.md` tetap dipertahankan sebagai histori rencana;
untuk status saat ini gunakan tabel di bawah dan
[`operational-readiness-report.md`](./operational-readiness-report.md).

## Keputusan readiness

Jalur teknis MVP yang tidak membutuhkan provider eksternal sudah diaudit dan
siap untuk development/loopback handoff. Ini bukan klaim production-ready:
deployment, identitas bisnis resmi, pengiriman customer, WhatsApp, Biteship,
dan Midtrans masih berada di gate terpisah.

| Area | Status saat ini | Bukti terakhir |
| --- | --- | --- |
| TypeScript | `READY` | `corepack pnpm typecheck` lulus |
| Lint | `READY_WITH_EXISTING_WARNINGS` | `corepack pnpm lint` lulus, 0 error dan 294 warning existing |
| Unit/backend | `READY` | unit 81/81; backend 125/125 |
| Schema/build | `READY` | `corepack pnpm db:validate`, `corepack pnpm build`, dan `git diff --check` lulus |
| Public + preview browser | `READY_LOCAL` | serial Playwright subset 55 passed, 1 skipped; tidak memakai provider/customer nyata |
| Clerk authorization | `READY_NON_PRODUCTION` | active Owner smoke, unknown/inactive profile denial, dan restore state tercatat di task map; test boundary blank-credential tetap terpisah dari server yang sedang memakai Clerk |
| Customer Google OAuth | `IMPLEMENTED_LOCAL_MOCK_PENDING_LIVE` | `/login`, `/register`, `/account`, DB session, safe return, auto-link, logout, dan mandatory checkout boundary teruji lokal; Google Development credentials dan live callback belum diverifikasi |
| Authenticated admin visual | `ACCEPTED_NON_PRODUCTION` | desktop/mobile acceptance untuk shell, list, detail yang memiliki data; custom-print detail tetap empty karena tidak ada request nyata |
| Catalog/public Shop | `ACCEPTED_LOOPBACK` | 3 ready-made published, 5 custom-flow draft, 34 varian, 50 JPG; gallery fallback disetujui Owner |
| Custom Print + quote/order | `ACCEPTED_LOOPBACK_SYNTHETIC` | quote route-bound, accept → `WAITING_PAYMENT`, decline regression |
| R2 upload | `PASSED_NON_PRODUCTION_SMOKE` | `PENDING → UPLOADED → VERIFIED`, exact-origin CORS, cleanup selesai |
| Customer-link reissue | `READY_SERVER_SIDE_PENDING_MANUAL_SEND` | server reissue dan invalidasi token lama siap; daftar customer dan kanal resmi belum diberikan |
| WhatsApp otomatis | `BLOCKED_DECISION` | provider, sender, template/consent, retry/idempotency, dan recipient belum dipilih |
| Biteship/Midtrans | `DEFERRED_BY_USER` | tidak diaktifkan atau di-smoke sesuai keputusan Owner |

## Scope expansion addendum — Customer Google OAuth (2026-09-25)

Implementasi lokal Customer Google OAuth sudah mencakup `/login`, `/register`,
`/account`, session opaque database 30 hari, logout/revoke, safe `returnTo`,
auto-link order lama yang belum memiliki owner, dan login wajib untuk checkout
serta shipping rates. Clerk tetap khusus Owner/Admin.

Evidence terbaru:

- `corepack pnpm test`: 20 file, 93 test lulus.
- `corepack pnpm test:backend`: 30 file, 148 test lulus.
- `corepack pnpm test:e2e`: 63 test lulus dengan mock OAuth pada database test
  loopback.
- `corepack pnpm test:e2e:demo`: 1 test lulus dengan checkout demo dan mock OAuth.
- `corepack pnpm test:integration`: 20 test lulus; 2 replay test historis masih
  gagal karena trigger `orders_commercial_snapshot_immutable` menolak rotasi
  `public_token_hash` yang sudah dilakukan oleh `recoverReplay`; ini belum
  diubah dalam scope Customer Auth.

Google Development credentials dan redirect URI non-production masih harus
disediakan Owner untuk live smoke. Secret tidak boleh masuk repository atau
chat.

## Browser boundary

Run final yang memakai server development aktif:

```text
corepack pnpm test:e2e --workers=1 --grep-invert "Clerk credentials"
```

Hasilnya **55 passed, 1 skipped**. Dua test blank-credential Clerk tidak
disatukan ke run ini karena server lokal yang sedang dipakai tab Owner memang
memiliki credential Clerk; keduanya tetap memiliki evidence boundary dan
negative authorization pada test/backend serta acceptance live sebelumnya.
Test preview file failure di-skip saat runtime `server-backed` karena kontrol
simulasi itu hanya boleh muncul pada mode preview.

## Input yang masih diperlukan

- Daftar customer dan kanal resmi untuk mengirim tautan route-bound v1. Jangan
  menerbitkan atau mengirim tautan tanpa penerima yang terkonfirmasi.
- Biodata perusahaan resmi untuk klaim publik, sender bisnis, invoice, dan
  onboarding provider. Nilai sintetis tidak boleh dipromosikan.
- Akun, sandbox key, callback, dan keputusan katalog/provider bila Owner ingin
  membuka Biteship atau Midtrans.
- Keputusan provider/template/consent bila Owner ingin mengaktifkan WhatsApp;
  legal/accounting retention di luar lifecycle binary juga tetap TBD.

## Handoff berikutnya

1. Owner memberikan daftar penerima dan kanal; operator menjalankan reissue
   manual satu per satu dari detail quote/order dan mencatat bukti delivery
   tanpa menyimpan secret token.
2. Setelah biodata dan provider tersedia, buka Goal terpisah untuk staging,
   provider smoke, callback/payment, dan production acceptance.
3. Jangan menandai `READY` di tabel ini sebagai bukti deployment atau aktivasi
   provider.

## Gate closure addendum — 2026-09-22

Evidence terarah untuk checkout, Admin fail-closed, provider boundaries, touch
emulation, dan OptionChip tercatat di
[`gate-closure-audit.md`](./gate-closure-audit.md). Checkout dan Admin local
technical proof lulus; touch proof masih emulated; physical screen-reader,
provider activation, production deployment, dan OptionChip product propagation
belum ditutup. Tidak ada provider atau production resource yang diaktifkan oleh
audit ini.
