# Niuva v1.0 — backlog aktif

**Persetujuan implementasi:** 18 Oktober 2026. Baseline audit:
`f4799c77fedb86f185db29d6f9b9cbfd63828047`. Branch kerja:
`codex/niuva-v1-closure`. Scope [PRODUCT.md](PRODUCT.md), dependensi
[ROADMAP.md](ROADMAP.md), selesai menurut [DoD](docs/v1-definition-of-done.md).
Status awal di bawah tidak mengklaim hasil provider/staging/production.

## Cara bekerja

Satu task atau rantai dependensi yang jelas per irisan. Status: `TODO`,
`IN_PROGRESS`, `BLOCKED_INPUT`, `BLOCKED_EXTERNAL`, `DONE`. DONE memerlukan
acceptance criteria dan bukti, bukan hanya kode/merge. Milestone mempunyai
checkpoint sebelum konsumen berikutnya; ulangi gate bila ada perubahan/failure
yang membenarkannya. Tidak ada review Owner per file atau batas jumlah file.

Input/ref fixture memungkinkan persiapan kode meskipun task induk belum selesai
di hosted. Kemajuan parsial dicatat pada log, task tetap terbuka sampai seluruh
acceptance criteria selesai. Angka dan penerimaan historis tidak dipromosikan.

## Task dan acceptance criteria

| ID | M | Status | Hasil kecil | Dependensi | Acceptance criteria dan verifikasi minimum |
| --- | --- | --- | --- | --- | --- |
| T01 | M0 | DONE | Rekonsiliasi dokumen v1 | — | Empat dokumen punya fungsi jelas; keputusan lama tidak menjadi backlog aktif; setiap blocker punya ID/pemilik. Link/authority review. |
| T02 | M0 | DONE | Sinkronkan baseline lokal | T01 | Generate resmi sesuai schema; lint/typecheck resmi lulus; migration/database lama tidak berubah. |
| T03 | M1 | BLOCKED_EXTERNAL | Kontrak hosted sandbox | T02 | Binding/origin/cookie/CSP konsisten; resource salah ditolak; production tetap tertutup. Integration. |
| T04 | M1 | DONE | Producer auth ke outbox | T03 | Proof dan enqueue atomik; proof invalid tidak dikirim; retry tidak memberikan akun/sesi prematur. Integration lokal lulus; hosted delivery tetap menunggu T03. |
| T05 | M1 | DONE | Producer privacy ke outbox | T04 | Proof sekali pakai/closure aman; revoked/expired dibatalkan. Integration lokal lulus; hosted delivery tetap menunggu T03. |
| T06 | M1 | DONE | Launcher worker dan status | T04–T05 | CLI dan endpoint bearer-protected memakai JobRunner/OperationalJobState yang sama dengan resource binding, role terbatas, policy eksplisit, lease/cooldown lintas run, monitor dan safe counters; unknown tidak memicu resend otomatis. Unit/backend/integration lokal lulus; scheduler/provider hosted belum diaktifkan. |
| T07 | M1 | BLOCKED_EXTERNAL | Job expiry reservasi retail | T03 | Reservation due mengikuti policy existing; pending payment yang masih berlaku menahan pembatalan; attempt kedaluwarsa menjadi EXPIRED, order unpaid menjadi CANCELLED, dan stok dilepas atomik/idempoten; settled/refunded tidak pernah dilepas. Runner/backend/integration lokal lulus. Cadence dan scheduler hosted menunggu Owner/T03. |
| T08 | M1 | BLOCKED_EXTERNAL | Job retensi file Customer | T03 | Delivery terpisah di draft PR #58, head `64f9e96`, Quality sukses. 14/60/90, hold, retry/lease/cursor dan proteksi data diuji lokal. Scheduler/R2 hosted belum terbukti; kode PR #58 bukan ancestor branch T21–T22. |
| T09 | M1 | BLOCKED_EXTERNAL | Cleanup auth/privacy hosted | T03 | Handler auth/privacy berbatas dari PR #56 memakai runner/lease/role/monitor canonical. Tenggat dan hold tetap; bukti lokal diwarisi lalu diuji ulang saat rekonsiliasi. Scheduler/role/resource hosted belum tersedia. |
| T10 | M1 | IN_PROGRESS | Rate limit lintas instance | T03 | PostgreSQL bersama, HMAC IP stabil dengan secret bersama, dan pembersihan row kedaluwarsa diuji lokal; binding/topologi hosted belum dibuktikan. Integration. |
| T11 | M2 | BLOCKED_INPUT | Pengesahan policy publik | T01; Owner | Isi/versi/tanggal disahkan; tidak menjanjikan kemampuan belum terbukti. Review Owner/fungsi review. |
| T12 | M2 | BLOCKED_INPUT | Consent Google publik | T04/T11 | Consent/deklarasi terikat identitas server; tanpa proof ditolak; riwayat tertutup tidak tertaut ulang. Integration/E2E. |
| T13 | M2 | BLOCKED_INPUT | Signup email publik | T04/T11 | Consent resmi, verified-email boundary, expiry/resend/reset/revocation benar. Integration/E2E. |
| T14 | M2 | BLOCKED_INPUT | Privacy hosted | T05/T11 | Export sendiri, hak data/closure dan kontak kasus aktif tanpa restore akun/riwayat. Integration/E2E/hosted. |
| T15 | M3 | DONE | Draft produk dari Dashboard | T02 | Owner/Admin membuat draft; kategori dapat dipilih tanpa UUID manual; draft tidak tampil publik. Unit, integration, authenticated E2E lokal lulus. |
| T16 | M3 | DONE | Varian dari Dashboard | T15 | SKU unik, harga/berat/dimensi valid, stok awal mengikuti inventory/ledger. Unit, integration, authenticated E2E lokal lulus. |
| T17 | M3 | DONE | Draft portfolio dari Dashboard | T02 | Draft baru tersedia; bukti dan data publikasi diperiksa sebelum publish. Unit, integration, authenticated E2E lokal lulus. |
| T18 | M3 | DONE | Upload media publik Admin | T03 | Signed PUT membatasi ukuran deklarasi; gambar diverifikasi server; upload tertolak dibersihkan dari quarantine; key/storage publik terpisah dari file Customer. Boundary dan storage fixture integration lokal lulus; provider hosted menunggu T03. |
| T19 | M3 | IN_PROGRESS | Editor media dan publikasi | T15–T18 | Upload/pilih, urutan/alt, ownership benar, renderer mendukung media baru. Unit/integration lokal lulus; browser upload/render media dengan storage hosted belum dibuktikan. |
| T20 | M3 | DONE | Hero mengikuti published state | T17 | Unpublish/missing/card-only tidak menaut ke detail invalid. Regression unit lulus. |
| T21 | M4 | DONE | Pengajuan kasus refund | T02; kontrak aktif | Kasus/alokasi persisten, nominal Decimal server dan ownership/closure diuji integration lokal; UI/API dan native form tersedia. Provider/hasil dana tetap T23/T25. |
| T22 | M4 | DONE | Persetujuan refund Owner | T21 | Owner aktif saja; alasan/retur/audit, version/snapshot immutable, overlap dan approval/receipt ulang diuji integration lokal. Persetujuan belum mengeksekusi uang. |
| T23 | M4 | TODO | Submission refund | T22; merchant | Stable key/attempt; timeout perlu reconciliation; fallback manual berizin punya bukti. Adapter/integration/sandbox. |
| T24 | M4 | TODO | Reconciliation pembayaran | T03 | Status tak pasti/terlambat diperiksa ke provider; order/settlement/stock movement tidak ganda. Integration/sandbox. |
| T25 | M4 | TODO | Reconciliation refund | T23 | Accepted belum selesai; hasil provider/manual direkonsiliasi; tidak ada refund ganda. Integration/sandbox. |
| T26 | M4 | TODO | Email order received | T06 | Pesan persisten/dedup; email gagal tidak membatalkan order. Integration. |
| T27 | M4 | TODO | Email payment confirmed | T06 | Hanya settlement otoritatif; webhook duplikat tidak menduplikasi pesan. Integration. |
| T28 | M4 | TODO | Email quote available | T06 | Quote/version/access benar; quote superseded/invalid tidak dikirim sebagai aktif. Integration. |
| T29 | M4 | TODO | Email order shipped | T06 | Status sah; isi berizin; tanpa private URL permanen. Integration. |
| T30 | M4 | TODO | Notifikasi Admin persisten | T06 | Failure terlihat; request/order tetap tersimpan; tanpa WhatsApp otomatis. Integration. |
| T31 | M4 | BLOCKED_INPUT | Dataset dan tarif launch | T15–T19; Owner | SKU/stok fisik/media/berat/dimensi/rule disetujui untuk target; seed lokal bukan aktivasi launch. Review/import verification. |
| T32 | M5 | DONE | E2E Admin di CI | T02 | Quality pada `4eb8471` sukses, termasuk seluruh 24 journey Owner/Admin/anonim. Regresi landing MFA 6s mencakup respons TOTP 200, navigasi, status ready dan guard 401; sumber auth tidak diubah. [Bukti CI](https://github.com/batakers/Niuva-2026/actions/runs/39155145353). |
| T33 | M5 | BLOCKED_EXTERNAL | Dua BUY staging | T03–T14/T21–T31 | Dua variasi transaksi sukses; order/stock/payment/email/status konsisten. Hosted records. |
| T34 | M5 | BLOCKED_EXTERNAL | Satu MAKE staging | T03–T14/T21–T31 | Model→review→estimasi→quote→bayar→produksi/QC→ongkir final→kirim pada request/order benar. Hosted records/operator. |
| T35 | M5 | BLOCKED_EXTERNAL | Failure/refund staging | T21–T25 | Duplicate/nominal salah/late/timeout/full refund/manual exception benar dan teraudit. Sandbox. |
| T36 | M5 | BLOCKED_INPUT | UAT operasi Admin | T15–T20/T32 | Owner/Admin menambah konten, stock, quote, fulfillment dan keuangan dasar tanpa database/source. UAT record Owner masih diperlukan. |
| T37 | M5 | BLOCKED_EXTERNAL | UI/perangkat/AT | T33–T36 | Route aktual: viewport, keyboard/fokus/error, zoom/reduced motion; fisik/AT dibuktikan terpisah. |
| T38 | M5 | BLOCKED_INPUT | Backup/restore | T07–T09/T14/T25; sasaran Owner | Sasaran pemulihan Owner dan resource belum tersedia; drill harus mencegah restore akun tertutup atau replay refund/email. Recovery evidence. |
| T39 | M5 | BLOCKED_INPUT | SOP dan handover operasi | T33–T38; Owner | Coverage/kalender/eskalasi/alarm/kontak pasca-closure/petugas dibuktikan lewat simulasi. |
| T40 | M6 | BLOCKED_EXTERNAL | Rilis terkendali | Seluruh wajib; instruksi rilis | Kandidat sama dengan bukti; gate ditutup; activation/smoke/monitoring/rollback sesuai izin eksplisit. |

## Kontrak implementasi lintas task

- Create Admin memakai Server Actions terotorisasi, validasi Zod, domain service
  dan repository. Jangan menaruh business rule di route atau mempercayai ID
  pemilik/harga/stock/versi dari browser.
- Media publik Admin: JPEG/PNG/WebP maksimal 10 MiB/file, maksimal 12/gallery,
  key server, ownership, intent/confirm dan renderer untuk host/key yang
  dikendalikan aplikasi. Tetap dukung media statis lama. Tidak memakai file
  privat Customer sebagai media publik dan tidak menambah page builder.
- Outbox bisnis memperluas event yang didukung tanpa melemahkan proof
  auth/privacy, encryption, expiry, revalidation atau penanganan unknown.
- Refund membutuhkan kasus/approval/attempt/reconciliation persisten, Decimal,
  stable key/locking dan pengecualian manual berizin; notifikasi bukan pengajuan.
- Job terautorisasi/resource-bound, terbatas per batch, aman diulang/overlap,
  memiliki lag/last-success/failure dan tidak mereset tenggat bisnis.
- Perubahan schema memakai migration baru yang ditinjau. Existing migration
  dan data historis tidak diubah untuk membuat pengujian lulus.

## Bukti awal dan keputusan pelaksanaan

- 2026-10-18: audit pada baseline di atas menemukan 73 page, 42 route API,
  31 modul, 62 model schema, 28 migration SQL, 289 file test. Ini inventaris
  source, bukan kondisi database/provider.
- 2026-10-18: metadata [Quality baseline](https://github.com/batakers/Niuva-2026/actions/runs/38539939083)
  success, selesai 2026-10-14. Hasil tersebut bukan CI untuk diff implementasi ini.
- 2026-10-18: pengguna menyetujui seluruh rencana; pengelolaan konten mandiri
  termasuk v1. Policy resmi, provider/staging/production, merchant coverage,
  dataset, retensi arsip, coverage operasi dan recovery belum disahkan oleh
  persetujuan implementasi ini.
- Ruling: TASKS.md menjadi backlog aktif dan log pelaksanaan; histori tasks dan
  ledger readiness tetap dipertahankan. Ini menghindari dua status aktif tanpa
  menghapus bukti lama; risiko bila keliru adalah tooling lama masih membaca
  checklist historis, sehingga entry point dokumentasi diberi pointer eksplisit.
- Ruling awal 2026-10-18 sebelum instruksi delivery: bekerja pada branch
  terpisah tanpa commit/push atau implementer paralel. Pengguna kemudian
  mengizinkan commit/push dan menyetujui urutan rekonsiliasi, pengujian serta PR.
  Checkpoint 9 commit diakhiri `817b57a` dan sudah di-push; izin ini bukan merge
  ke main, deployment atau aktivasi provider.
- Pre-flight: T04/T05 mengonsumsi transaksi dan proof dari outbox existing;
  T26–T30 memerlukan perluasan purpose, bukan pemakaian token auth sebagai event
  bisnis. T18/T19 memerlukan renderer dan ownership media publik; storage key
  statis existing tidak otomatis mendukung upload R2. T11/T31/T33–T40 memuat
  input/evidence eksternal yang tidak dapat diganti fixture.

## Log pelaksanaan

### T21–T22 — kasus dan persetujuan refund, 2026-10-19

- Baseline `54a97bb` dari `origin/main`; branch `codex/v1-refund-cases` tidak
  membawa commit T08. Delivery T08 telah selesai pada branch tersendiri:
  commit kode `239247a`, checkpoint `64f9e96`, [draft PR #58](https://github.com/batakers/Niuva-2026/pull/58).
  [Quality head T08](https://github.com/batakers/Niuva-2026/actions/runs/39193466516)
  sukses pada `64f9e961cc72bfb74d67a6b54d1f26fb093e330c`; PR tetap draft/open,
  tidak di-merge dan hosted tetap BLOCKED_EXTERNAL.
- Domain refund menyimpan satu kasus per order, alokasi unik per pembayaran,
  Decimal IDR dari pembayaran server, submission key/hash, version dan audit.
  MAKE mengalokasikan pembayaran order dan ongkir final terpisah. Pending retry
  tidak menjadi penerimaan; late settlement yang terverifikasi tidak membuka
  kembali order batal. Refund lama/parsial/exception tak pasti menunggu
  reconciliation, bukan dikirim ulang atau diasumsikan gagal.
- Owner aktif dengan permission `PAYMENT_REFUND_FULL` menyetujui snapshot
  immutable. Admin biasa/Owner nonaktif/role palsu ditolak. Retur PENDING
  membuat approval bersyarat tanpa readyAt; receipt Owner eksplisit membuka
  kesiapan setelah bukti. Refresh membatalkan approval aktif, menjaga waktu
  penerimaan asli dan riwayat. Tidak mengubah lifecycle order atau stock.
- Route aktual Customer dan Admin berada di detail order `/refund`, dengan
  Server Actions native, origin/body/Zod/rate limit pada API, nilai server,
  error recovery dan summary kasus. Intake staf membutuhkan referensi
  verifikasi kontak; akun tertutup tidak dipulihkan. Ekspor privacy memakai
  proyeksi refund milik akun dan tidak membawa approval internal/key/reference.
- Migration baru `20261019030000_refund_cases` diterapkan bersama 33 migration
  baseline ke database loopback baru `niuva_refund_test_20261019`. Tidak ada
  migration historis, database aplikasi atau resource provider yang diubah.
- Verifikasi akhir diff lokal: lint **0 error/4 warning existing**, typecheck,
  Prisma validate, **127 file/1.466 unit-component**, **95/706 backend**,
  **50/390 integration**, production build **93/93 static pages** dan
  **2 authenticated browser journey** lulus. Integration mencakup **18 skenario
  refund** dan **10 direct-action**, termasuk cookie Customer hilang, unknown,
  expired dan revoked melalui guard nyata. Browser membuktikan Customer,
  Owner/TOTP, penolakan Admin, approval ulang, retur, serta native POST/error
  recovery tanpa JavaScript. Capture fixture pada 1440/390/320px, keyboard/fokus
  dan reduced motion dicatat di `.local/refund/captures/`. Acceptance visual
  Owner, perangkat fisik/AT, provider/staging dan production tetap terpisah.
  Capture menunggu font/frame layout dan tetap memeriksa overflow pada 320px.
- Regresi scan action/loading/proxy diperluas dengan route yang benar dan
  otorisasi Customer sendiri; tidak melemahkan scan atau mengubah proxy Admin.
  Fixture ekspor privacy diberi field refund yang baru. Satu invocation target
  ditolak safety guard karena URL aplikasi/test disamakan dalam shell; invocation
  dikoreksi tanpa mengubah guard, env file atau database. Semua hasil akhir di
  atas berasal dari pengulangan pada konfigurasi terisolasi yang sah.
- Gate penuh memakai `niuva_refund_regression_test_20261019`, browser memakai
  `niuva_refund_test_20261019`; keduanya baru dan loopback port 55432. Migration
  34/34 berhasil. Perintah resmi: `pnpm lint`, `pnpm typecheck`, `pnpm db:validate`,
  `pnpm test --reporter=dot --maxWorkers=2`, `pnpm test:backend --reporter=dot
  --maxWorkers=2`, `pnpm test:integration`, `pnpm build`, dan
  `pnpm test:e2e:admin-auth tests/e2e-admin-auth/admin-refund.spec.ts` melalui
  `corepack`. Build saja memakai tier production/mode mock dan satu worker;
  override build tidak diberikan ke unit/backend. Diff check dan scan credential
  pattern lulus; tidak ada env, workflow atau migration historis di diff.
- Cakupan DONE T21/T22 adalah acceptance criteria kasus/approval lokal pada
  tabel, bukan keseluruhan SOP atau release. Kode dan bukti lokal dikirim sebagai
  `790387000db8c925aec5f8c76044940747a10649` pada branch
  `codex/v1-refund-cases`, [draft PR #59](https://github.com/batakers/Niuva-2026/pull/59).
  PR tidak di-merge. CI diff masih menunggu pada checkpoint delivery ini dan
  tidak diganti dengan hasil historis main/T08. Rollback mempertahankan seluruh
  tabel/history/audit; jangan drop/reset tabel saat menutup entry point baru.
- Kontrak rinci: [refund workflow](docs/backend/refund-workflow.md). Submission,
  merchant/window/manual exception dan hasil dana/reconciliation tetap T23/T25;
  task ini tidak menyatakan dana telah dikembalikan. Kalender SLA/coverage dan
  retensi legal finansial tetap input Owner, tanpa default baru.

### Rekonsiliasi dengan main — 2026-10-19

- Merge source `7b3a09d` (PR #56) ke checkpoint `817b57a`; tidak mengubah main.
- Ruling: producer dan runner `modules/jobs` dari main menjadi jalur canonical;
  HTTP outbox/inventory memakai role, lease, cooldown dan monitor yang sama.
  Tabel scheduled lama tetap dormant untuk menjaga migration immutable;
  biayanya satu tabel kompatibilitas tanpa pembaca/penulis runtime.
- Inventory expiry dipindahkan ke transaksi lease canonical dengan audit atomik
  dan pemeriksaan lease akhir; kegagalan lease me-rollback status dan audit.
- Migration gabungan 33/33 diterapkan ke database baru
  `niuva_reconcile_test_20261019`; database lama tidak di-reset.
- Adapter HTTP menerima policy eksplisit, GET membutuhkan maxLagMs; tidak
  menetapkan cadence atau mengaktifkan scheduler/provider. T03/T07/T09 tetap
  menunggu bukti hosted; policy publik masih draf.
- Gate lokal pada kode `6440ccf`: unit/component **127/1.457**, backend
  **93/695**, integration **49/368**, Chromium **112 passed/5 expected skips**,
  Owner/Admin **24 passed**, dan build **93 static pages** lulus. Typecheck dan
  Prisma validation lulus; lint 0 error/4 warning destructuring existing pada
  handler Batch 2. Seluruhnya lokal/test/mock, bukan provider/staging/production.
- [CI pertama](https://github.com/batakers/Niuva-2026/actions/runs/39153463094)
  lulus sampai browser smoke, lalu 23/24 Admin lulus: landing MFA menunggu
  navigasi /admin tetapi assertion default 5s habis pada runner baru.
- Reproduksi delay landing 6s gagal dengan pesan yang sama (RED). Test sekarang
  menunggu respons verifikasi TOTP 200, navigasi DOMContentLoaded dan status auth
  ready, lalu meneruskan pemeriksaan logout/password/TOTP existing (GREEN 1/1).
  Tidak ada perubahan auth runtime, retry atau bypass MFA.
- [CI ulang](https://github.com/batakers/Niuva-2026/actions/runs/39155145353)
  **success** pada `4eb8471`, termasuk 24/24 Owner/Admin dan production build.
  T32 ditutup berdasarkan bukti tersebut. Commit setelahnya hanya mencatat
  status/bukti dokumentasi; gate provider/staging/production tetap terbuka.

### Bukti lokal 2026-10-18 — sebelum rekonsiliasi

- T01: PRODUCT/ROADMAP/TASKS/AGENTS, DoD, pointer histori dan authority addenda
  direkonsiliasi. Validasi 12 dokumen: 216 tautan lokal valid, tanpa target
  hilang/heading H2 duplikat; 40 task dan 12 gate kandidat tercatat.
- T02: generate Prisma resmi dan typecheck lulus; lint lulus dengan satu
  warning unused import existing. Semua 28 migration existing berhasil
  diterapkan ke database test baru `niuva_v1_test_20261018_closure`, tanpa
  reset database lama atau perubahan migration. Hasil ini bersifat lokal.
- Input Owner 2026-10-18: resource staging **belum tersedia** dan Syarat/Privasi
  **masih draf, belum disahkan**. T11 dan bukti hosted T03/T14/T33–T35 tetap
  terbuka; implementasi fixture tidak menggantikan resource/pengesahan tersebut.
- Verifikasi lokal awal 2026-10-18 sebelum penutupan T07: `pnpm lint`,
  `pnpm typecheck`, `pnpm db:validate`, unit **126 file / 1.454 passed**,
  backend **91 / 686**, integration **45 / 333**, default E2E **112 passed / 5
  skipped**, authenticated Admin E2E **24 passed**, dan production build sukses
  dengan **93 static pages**.
  Unit, Playwright, dan Next build lulus dengan worker dibatasi karena percobaan
  paralel awal mencapai batas memori lokal. Build memakai `CIRCLE_NODE_TOTAL=2`
  (satu worker). Pengujian database memakai PostgreSQL test terisolasi; tidak
  ada database lama yang di-reset/diperbaiki atau provider yang diaktifkan.
  Hasil ini lokal, bukan CI pada diff, staging, perangkat fisik/AT atau production.
- T15–T17: entry point Dashboard dan Server Actions draft/varian tersedia;
  aturan stok awal existing tetap digunakan. Test service, integration, dan
  full authenticated Admin browser suite lulus lokal; input dataset launch dan
  bukti hosted/publikasi tetap terpisah.
- T20: tiga regression test terbukti gagal sebelum perbaikan dan lulus
  sesudahnya; seluruh 5 test homepage lulus. Hero memakai record published
  yang memiliki media publik; project card-only tidak menjadi tautan detail.
- T04/T05: producer auth dan privacy memasukkan pesan terenkripsi ke outbox
  dalam transaksi proof yang sama; integration producer 5/5. Forgot password
  juga antri tanpa inline mailer. Queue berarti tertunda, bukan terkirim.
- T06: `POST /api/internal/jobs/outbox` menerima dry-run/execute dengan
  `CRON_SECRET`; `GET` menampilkan status terproteksi. State job persist, lease
  mencegah overlap, cooldown provider dipatuhi lintas run, dan unknown tidak
  memicu resend otomatis. Backend runner 4/4, cron auth unit 2/2 dan scheduled
  state integration 1/1 lulus pada database test. Tidak ada Vercel cadence,
  provider send atau hosted activation.
- T07: `GET/POST /api/internal/jobs/inventory-reservations` memakai
  `CRON_SECRET`, capability/database binding, job lease, batch maksimum 100,
  dan status lag/remaining. Expiry mengikuti policy 30 menit: attempt PENDING
  yang masih berlaku menahan perubahan; attempt yang due menjadi EXPIRED, order
  retail unpaid menjadi CANCELLED, dan reservation dilepas dalam transaksi yang
  sama. Lock attempt → variant → order mengikuti jalur settlement webhook;
  settled/refunded tetap terlindungi. Backend **92/690**, full integration
  **45/337** serial, typecheck, lint, dan build route lulus lokal. Full integration
  paralel sempat gagal pada invariant outbox clock; tes tersebut lulus sendiri
  dan seluruh suite lulus serial. `vercel.json` belum menjadwalkan job ini karena
  cadence Owner dan staging belum tersedia; T07 tetap BLOCKED_EXTERNAL.
- T10: shared PostgreSQL limiter dan dua klien lokal memiliki test integration;
  anonymous key kini memakai HMAC stabil dengan `BETTER_AUTH_SECRET` pada
  runtime hosted, dan row expired dibersihkan bertahap. T03 tetap menghambat
  pembuktian binding/topologi hosted.
- T15–T18: create draft produk/varian/portfolio serta boundary upload media
  publik tersedia dari Dashboard dan diuji pada service/integration/browser
  lokal. Signed URL mengikat batas ukuran, dan confirm yang gagal menghapus
  object quarantine. Upload UI, storage provider hosted dan alur publikasi
  media end-to-end tetap terbuka pada T19.
- T32: workflow Quality kini memasukkan konfigurasi authenticated Admin E2E.
  Uji menu mobile diperkuat agar menunggu tombol Sheet pascahidrasi. Full suite
  24/24 lulus lokal pada resource test terisolasi; status tetap IN_PROGRESS
  sampai CI menjalankan diff ini.
