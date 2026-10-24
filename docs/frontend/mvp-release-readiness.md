# MVP release readiness — non-provider closure

## Pelaksanaan v1 — 18 Oktober 2026

Owner menyetujui implementasi [ROADMAP](../../ROADMAP.md) dan
[TASKS](../../TASKS.md) dari audit baseline
`f4799c77fedb86f185db29d6f9b9cbfd63828047`.
[DoD](../v1-definition-of-done.md) memisahkan task, kandidat siap rilis dan
RELEASED. TASKS adalah backlog aktif; ledger ini tetap pemilik bukti lingkungan
dan penutupan REL/PUB, bukan backlog kedua. Checklist `tasks/` lama merupakan
histori. Snapshot bertanggal tetap menunjukkan evidence pada baseline masing-
masing; addenda 18–19 Oktober dan tabel aktif mencatat status diff lokal serta
jawaban Owner. Persetujuan rencana tidak menutup REL/PUB, mengesahkan policy
atau memberi izin deployment/provider. Hasil CI baseline tidak dipromosikan
menjadi hasil CI diff.

Snapshot ledger awal: **2026-10-01** · checkout `codex/admin-navigation-docs-v03` · baseline
`9605a96e936236b7e54b526f05e6b344747b24ab` sebagai sumber runtime; revisi sidebar/dokumentasi
dikirim melalui branch di atas · scope lokal, non-provider dan non-production.
Snapshot 2026-09-20 pada `a171686` dan addenda bertanggal tetap histori evidence
masing-masing. Rekonsiliasi kontrak **13 Oktober 2026** tetap menjadi latar
produk/teknis; addendum 18 Oktober di Bagian 1 memperbarui status implementasi
dan evidence lokal. Angka dan penerimaan snapshot lama tidak dipromosikan.

Dokumen ini adalah ledger status terkini untuk handoff. Checklist fase lama di
`tasks/todo.md` dan `tasks/plan.md` tetap dipertahankan sebagai histori rencana;
untuk status saat ini gunakan tabel di bawah dan
[`operational-readiness-report.md`](./operational-readiness-report.md).

## Bagian 1 — Status terkini (evidence aktif)

Bagian ini berisi status yang dipakai untuk handoff: kontrak aktif, addendum
implementasi lokal 18 Oktober, tabel readiness, input yang masih diperlukan,
dan langkah berikutnya. Snapshot bertanggal di bawah dan
[Bagian 2](#bagian-2--arsip-evidence-bertanggal-historis) dipertahankan sebagai
histori. Angka gate dan penerimaan lama tidak digabung menjadi hasil baru.

### T23/T25 — kelanjutan refund, 21 Oktober 2026

Patch existing T23/T25 diterapkan tiga-arah pada worktree terpisah dari
`origin/main` `a183c81d96defd3f410987efe65be763a0de5b44`, yang sudah mencakup
PR #59–#61. Worktree asal `v1-refund-execution` dan checkout primary tetap
dipertahankan; snapshot patch asal diverifikasi cocok. Implementasi tidak
diulang dari awal. Ledger pelaksanaan dan bukti final ada di [TASKS](../../TASKS.md).

T23 mempunyai key/attempt/clock durable, preflight/rule merchant serta fallback
manual Owner dengan persetujuan, bukti transfer dan pencabutan persetujuan
yang belum dibayar. T25 memakai receipt bank matching/immutable, status
accepted/unknown terpisah dari finality, GET-only reconciliation pada lease
canonical, dan seluruh alokasi MAKE harus confirmed sebelum kasus selesai.
Histori partial/external/reference-conflict menahan pembayaran manual nilai
penuh; polling atau revoke tidak menghapus hold. Lihat
[kontrak refund](../backend/refund-workflow.md).

Gate final lokal lulus: lint 0 error/4 warning existing, strict typecheck,
Prisma validation, unit/component 127 file/1.469 tes, backend dengan coverage
aktif 105/770, integration 54/473, Chromium Owner/Admin 31 passed, default
112 passed/5 existing production-tier skips, dan production build 93/93.
Ada 73 integration dan enam journey Chromium refund terarah yang lulus;
review independen ulang tidak menemukan defect material tambahan setelah
perbaikan. Capture route aktual 1440/390/320px tanpa overflow, native/no-JS,
keyboard pencabutan dan reduced motion tersedia; zoom 200% belum dibuktikan.
Database loopback baru menerima 38 migration, termasuk satu migration refund
execution additive; migration historis tidak diubah. Provider fixture dan
browser lokal tidak merupakan bukti sandbox merchant atau dana nyata.

T23/T25 tetap BLOCKED_EXTERNAL dan REL-05 belum menutup
PUB-REFUND-PROVIDER/PUB-REFUND-RECON/T35:
kemampuan metode/channel/window/saldo/ETA, hasil bank sandbox, penanganan
manual, role/resource/cadence hosted dan petugas belum dibuktikan. Resolusi
nominal sisa partial/external tetap memerlukan bukti dan irisan eksplisit.
Owner visual/UAT, perangkat/AT, staging dan production tetap terpisah.
Tidak ada CI untuk diff lokal baru, commit/push/PR/merge baru, deployment,
aktivasi provider/scheduler, email atau refund dana nyata dalam kelanjutan ini.

### Email bisnis T26–T30 — 19 Oktober 2026

Branch `codex/v1-business-notifications` berawal dari `adc28f0` PR #60,
dengan dependensi eksplisit pada guard pembayaran/refund T24 dan T21/T22.
AC teknis lokal minimum T26–T30 selesai: source facts/proof, encrypted outbox,
dedup/expiry/retry, current quote/recipient/closure, first-shipped timestamp dan
feed Admin persisten. [Kontrak](../backend/business-notifications.md) menjelaskan
deadline teknis 24 jam/key provider, tanpa default SLA/kalender atau activation.
Kode T08 tetap terpisah; kandidat gabungan harus menguji urutan migration.

Gate lokal: lint 0 error/4 warning existing, typecheck/schema; unit 127/1.466,
backend 100/736 (empat worker, coverage tetap aktif), integration penuh 52/423
pada resource baru dengan 36 migration. Ada 19 skenario bisnis. Chromium Admin
27/27, default 112 passed/5 production-tier-specific skipped pada local-test
port 3118. Build 93/93 halaman statis lulus. Import utility snapshot dipisahkan
dari modul auth/Next setelah loader browser menemukan dependensi transitif;
RPC timeout bukan hasil tes dan diganti run native yang terpantau.

Inbox/bounce, scheduler/cadence/role hosted, policy publik, visual Owner,
perangkat/AT dan release tetap terbuka. Semua provider fixture, tanpa email,
refund, deployment atau activation sungguhan. CI diff notifikasi belum diklaim
sebelum head PR tersedia. Detail bukti dan checkpoint delivery ada di TASKS.
Kode `ae36ad68eb0462320eb45f2aae47c96224c0644c` telah di-push dan dikirim pada
[draft PR #61](https://github.com/batakers/Niuva-2026/pull/61), dengan #60/#59
sebagai dependensi eksplisit. CI PR notifikasi masih menunggu; hasil CI
dependensi tidak digunakan sebagai penggantinya. Tidak ada merge/deployment.

Quality head `2e6cc708` PR #61 gagal pada poll receipt read notifikasi 5 detik,
dengan 25 journey lulus. Tes diperkuat untuk menunggu POST read 200/no-store
sebelum poll DB, tanpa mengubah batas poll atau persistence/reload assertion.
Skenario request tertunda 6 detik dan baris fixture berdasarkan UUID order
lulus dalam dua journey notifikasi lokal pada DB retained; lint/typecheck
lulus (empat warning existing). Runtime dan workflow tidak berubah; CI pada
SHA perbaikan harus diperiksa sebelum menyebut diff ini lulus CI.
Head `4f77b3c` kemudian melewati tes notifikasi, namun gagal pada heading
linimasa Admin dengan 26 journey lulus. Tes navigasi menunggu URL terkomit
sebelum assertion heading existing; regression request tertunda 6 detik dan
seluruh journey search/activity/account/deactivation lulus lokal (55 detik).
CI SHA berikutnya tetap memerlukan verifikasi sendiri.

### Rekonsiliasi PR #61 terhadap main PR #60 — 20 Oktober 2026

PR #61 telah direkonsiliasi ke `main` `d956c186cae40d76624c4fb4c0f297ed66954f82`;
diff gabungan hanya menyisakan T26–T30 (41 file). Review independen tidak
menemukan defect actionable. Lint, typecheck, Prisma validation, unit
127/1.466, backend 102/747, integration 53/441, Chromium default 112 pass/5
skip, Admin 28/28 dan build 93/93 lulus lokal. Dua database test baru menerima
37 migration; histori migration lama tidak berubah. CI pada SHA final PR, merge
PR dan acceptance eksternal masih harus diverifikasi terpisah.

### Reconciliation T24 — 19 Oktober 2026

Branch `codex/v1-payment-reconciliation` bergantung eksplisit pada `28f9037`
PR #59. Status tetap BLOCKED_EXTERNAL: fixture bukan bukti Get Status sandbox,
merchant, cadence atau role/resource hosted. Launcher tidak mengaktifkan
provider/scheduler. [Kontrak](../backend/payment-reconciliation.md) mencatat
identity/amount/signature, lease, receipt, refund hold, migrasi dan rollback.

Lokal: lint 0 error/4 warning existing, typecheck/schema, unit 127/1.466, backend
97/724, integration penuh 51/404, build 93/93 dan dua browser refund lulus.
Ada 14 skenario integration reconciliation; database file terpisah mencegah
polling fixture file lain. Regresi penuh terakhir memakai resource baru dengan
35 migration dan tidak mereset database lama. Tidak ada klaim CI T24 sebelum
run pada head PR tersedia; Quality PR #59 di bawah tetap bukti dependensi.
Kode T24 `e3941f6` dikirim pada [draft PR #60](https://github.com/batakers/Niuva-2026/pull/60),
menarget main untuk Quality dan mencatat dependency #59.
[Quality head adc28f01774646dc9ca40a4cf14edc7ae5af60fe](https://github.com/batakers/Niuva-2026/actions/runs/39246997823/job/118053840138)
SUCCESS, selesai 19 Oktober 12:33 UTC setelah satu rerun pada SHA yang sama.
Run pertama gagal di satu navigasi linimasa Admin, 25 journey lain lulus;
tidak ada perubahan/pelemahan test atau workflow untuk rerun tersebut.

### Refund T21–T22 — 19 Oktober 2026

Branch `codex/v1-refund-cases` berawal dari main `54a97bb`, terpisah dari T08.
Pengajuan/alokasi server, approval Owner/retur/idempotency dan lifecycle diuji
dengan fixture pada database loopback baru `niuva_refund_test_20261019` dan
`niuva_refund_regression_test_20261019` (34 migration, tanpa reset database lama).
Gate akhir: lint 0 error/4 warning existing, typecheck/schema, unit/component
127/1.466, backend 95/706, integration 50/390, build 93/93 static pages dan dua
journey authenticated browser lulus. Ada 18 skenario refund dan 10 direct-action,
termasuk boundary Customer tanpa proxy Admin. Browser mencakup Customer,
Owner dengan TOTP, penolakan Admin,
native POST/error recovery tanpa JavaScript serta capture 1440/390/320px.
Kode `7903870` dikirim pada [draft PR #59](https://github.com/batakers/Niuva-2026/pull/59).
[Quality head `28f9037`](https://github.com/batakers/Niuva-2026/actions/runs/39240507304)
telah sukses. Ini CI T21/T22; hasil provider/staging tetap belum dibuktikan.
Pemulihan integrasi 20 Oktober mempertahankan T08 dan menutup dua temuan review
retensi refund/waktu intake. [Quality head `85f63c5`](https://github.com/batakers/Niuva-2026/actions/runs/39308159415)
sukses; PR #59 terverifikasi merged pada `bcd04d9`. Bukti lokal gabungan dan
cakupannya dicatat di TASKS; provider/staging tetap belum dibuktikan.

Approval tidak mengirim uang. T23/T25, merchant/window/fallback manual,
reconciliation/sandbox dan REL-05 tetap terbuka; penerimaan visual Owner,
physical-device/AT, provider/staging dan production tidak ditutup oleh tes ini.
T08 telah dikirim pada [draft PR #58](https://github.com/batakers/Niuva-2026/pull/58),
Quality sukses di head `64f9e96`; scheduler/private R2 hosted tetap terbuka.

### Baseline sumber dan batas bukti — 2026-10-13

Baseline sumber: **`a577b7c326ff42d3a642cf5f0b93ccdf59c26bef`**, `main`, working tree bersih ketika inspeksi dimulai. [CI Quality pada commit tersebut](https://github.com/batakers/Niuva-2026/actions/runs/38331266192) berstatus success: lint, typecheck, unit/component, backend, Prisma validation, migration/integration pada PostgreSQL ephemeral, Chromium E2E dan production build. Ini evidence CI baseline kode, bukan hasil CI perubahan dokumen Batch 1 yang belum di-commit, provider/staging, atau produksi.

Rekonsiliasi Batch 1 dilakukan pada worktree `codex/release-contract-batch-1`. Scope hanya authority/draf/status/handoff; tidak ada runtime, test aplikasi, schema/migration, dependency, env, workflow atau deployment config yang diubah. Tidak ada pembacaan env/log privat atau request provider. Validasi/review dokumen dicatat pada [plan Batch 1](../superpowers/plans/2026-10-13-release-contract-batch-1.md).

Kontrak aktif berada pada [PRD](../PRD-Niuva-MVP.md#rekonsiliasi-kontrak-rilis--13-oktober-2026) dan [Tech Design](../TechDesign-Niuva-MVP.md#rekonsiliasi-kontrak-teknis-rilis--13-oktober-2026): Customer publik tetap target, akun **18+ melalui self-declaration** Owner 5 Oktober, Better Auth/TOTP khusus Admin, dan DEVELOP/B2B WhatsApp langsung sejak 11 Oktober. Kontrol deklarasi lokal sudah tersedia; pengesahan policy, public consent, bukti hosted dan aktivasi tetap terpisah. Formal RK-02/RK-03/RK-18 yang masih terbuka tidak berarti metode usia/sitemap harus dipilih atau dibangun ulang.

### Addendum implementasi lokal dan input Owner — 2026-10-18

Pada checkout `codex/niuva-v1-closure`, lint penuh dan typecheck resmi lulus
setelah T07. Backend terbaru **92 / 690**, integration terbaru **45 / 337**
pada PostgreSQL test terisolasi (serial), dan production build mengenali route
job baru serta menghasilkan **93 static pages**. Prisma validation, unit
**126 / 1.454**, default E2E **112 passed / 5 skipped**, dan authenticated Admin
E2E **24 passed** berasal dari verifikasi lokal sebelumnya pada diff yang sama;
tidak diulang untuk perubahan backend T07. Integration serial diperlukan karena
suite berbagi database fixture; run paralel sempat mendapat satu kegagalan
`outbox_clock`, sedangkan test itu lulus saat dijalankan sendiri dan suite serial
lulus seluruhnya. Build memakai `CIRCLE_NODE_TOTAL=2` (satu worker). Workflow CI
pada diff ini belum dijalankan. Hasil lokal tidak membuktikan provider, staging,
perangkat fisik, assistive technology atau production.

Owner mengonfirmasi resource staging belum tersedia dan Syarat/Kebijakan
Privasi masih draf. Karena itu hosted capability tetap tertutup dan public
consent/signup/privacy belum siap. Producer auth/privacy kini enqueue pesan
terenkripsi secara atomik pada source; password reset menggunakan jalur outbox
ketika inline mailer tidak ada. Upload media mengikat ukuran pada signed PUT
dan membuang quarantine object setelah confirm gagal. Launcher outbox dan
reservation-expiry tersedia pada source; cadence scheduler hosted, provider send,
dan inbox belum terbukti. Pembuatan draft
produk, varian, portfolio dan boundary upload media Admin memiliki bukti lokal;
storage hosted dan jalur browser upload/render media tetap terbuka.

### Rekonsiliasi main dan v1 closure — 2026-10-19

Source PR #56 (`7b3a09d`) digabung dengan checkpoint v1 `817b57a`.
Producer auth/privacy dan runner `modules/jobs` dari main dipertahankan;
adapter HTTP memakai runtime, role guard, lease/cooldown dan
`OperationalJobState` yang sama dengan CLI. Inventory expiry memakai
transaksi lease dan audit yang sama, termasuk pemeriksaan lease terakhir.
Tabel scheduled lama hanya kompatibilitas migration dan tidak dipakai runtime.
Migration gabungan 33/33 lulus pada database test baru. Kode `6440ccf`
lulus lokal: 127/1.457 unit/component, 93/695 backend, 49/368 integration,
112 Chromium + 5 expected skips, 24 Owner/Admin, dan build 93 static pages.
Typecheck/Prisma validation lulus; lint 0 error dan 4 warning destructuring
existing dari Batch 2.

[CI pertama](https://github.com/batakers/Niuva-2026/actions/runs/39153463094)
lulus sampai browser smoke, tetapi 1/24 Admin gagal pada assertion 5s ketika
navigasi MFA ke /admin masih berjalan. Delay landing 6s mereproduksi kegagalan
lokal; test kini menunggu respons TOTP 200, navigasi dan status auth ready.
Regresi terarah lulus tanpa perubahan guard/MFA runtime.
[CI ulang pada `4eb8471`](https://github.com/batakers/Niuva-2026/actions/runs/39155145353)
**success**, termasuk 24 journey Owner/Admin dan production build. T32 kini
DONE berdasarkan bukti CI kode tersebut; pembaruan penutup hanya dokumentasi.
Bukti hosted/provider tidak berubah.

Handoff lokal PR #56 tanggal 14 Oktober mencatat unit/component 1.437,
backend 670, integration 338, E2E 112 dengan 5 expected skip dan build
90 static pages. Angka historis ini tidak menjadi hasil gabungan branch v1.
Runbook sekarang merujuk TASKS/ROADMAP sebagai backlog aktif.

### T08 — retensi binary Customer, 2026-10-19

PR #57 sudah squash merge ke main sebagai `54a97bb`;
[Quality pada commit main](https://github.com/batakers/Niuva-2026/actions/runs/39185705585)
success. Pekerjaan T08 berikutnya berada pada diff lokal
`codex/v1-customer-file-retention` berdasarkan commit tersebut dan belum
di-commit/push; bukti CI main tidak dipromosikan ke diff T08.

Job canonical `CUSTOMER_FILE_RETENTION` memakai binding/role/lease/cooldown
existing, cursor scan bounded, HTTP bearer dan CLI, serta monitoring safe.
Kelas 14/60/90 mempertahankan order aktif, hold dan batas financial evidence.
Klaim `DELETE_PENDING` disimpan sebelum storage I/O; timeout/error setelah
panggilan storage tetap unknown. Konfirmasi delete dan final lease diperlukan
sebelum tombstone/audit selesai; retry memakai key sama tanpa membuka ulang
file atau quote/order baru. Media publik dan histori B2B dikecualikan.

Regresi awal menunjukkan hold privacy dapat hilang saat FK Customer dilepas
oleh account erasure. Snapshot ID hold kini tetap pada file, termasuk setelah
receipt dipurge; release Owner menghapus hanya hold kasus terkait. Tidak ada
pemulihan akun/history otomatis atau perubahan tenggat cleanup privacy.
Kontrol kasus memakai UI Owner existing. Hold file khusus/orphan tersedia
sebagai layanan domain; interface/SOP perlu dibuktikan pada UAT T36/T39.

Pada diff ini: **127/1.457** unit/component, **95/706** backend, **50/382**
integration serial, lint **0 error/4 warning existing**, strict TypeScript,
Prisma validation, dan build **93 static pages** lulus. **34/34** migration
diterapkan pada database test baru `niuva_file_retention_test_20261019_v4`;
database aplikasi dan migration lama tidak diubah. Build memakai satu worker,
tier production/mock dan origin loopback; HTTPS hosted tidak dibuktikan.
E2E browser tidak diulang untuk diff backend ini. Storage memakai fixture
sintetis; ini bukan bukti R2/cron/provider, staging, device/AT atau production.

T08 berstatus **BLOCKED_EXTERNAL** sampai resource, grants, cadence, alarm dan
delete R2 hosted dibuktikan. Syarat/Privasi tetap draf. Kontrak dan rollback
berada pada [runbook](../backend/batch-2-operations.md#retensi-binary-customer--t08-19-oktober-2026)
dan [service contract](../backend/phase-2-service-contract.md#customer-binary-retention--19-october-2026).

### Peta penghambat rilis

Status berikut menggabungkan pencocokan source/dokumen, bukti diff lokal 18
Oktober, dan jawaban Owner tentang staging/policy. Ini bukan audit seluruh
runtime atau jaminan readiness. `PARTIAL` berarti fondasi ada tanpa kemampuan
publik lengkap; `MISSING_WORKFLOW` berarti alur target lengkap belum tersedia;
`UNVERIFIED` membutuhkan evidence lingkungan. Nama engineering/pengganti yang
belum ditetapkan tetap terbuka. Rincian gate dimiliki [paket kesiapan publik](../legal/customer-public-launch-readiness.md#matriks-kesiapan).

| ID / penghambat | Status | Pemilik | Bukti tersedia / bukti yang masih diperlukan | Syarat penutupan |
| --- | --- | --- | --- | --- |
| REL-01 — akun dan consent publik | OWNER_APPROVED_PENDING_RELEASE | Owner (pengesah), fungsi review; engineering | [Resolver](../../src/modules/customer-auth/legal.ts) hanya internal/test; [akun Google baru](../../src/modules/customer-auth/repository.ts) membutuhkan proof internal. Kontrol 18+ ada. Owner menyetujui isi/identifier Syarat dan Privasi 24 Oktober; public consent dan tanggal efektif belum tersedia | T12/T13 membangun consent Google/email dengan bukti server yang benar; internal/test tetap terpisah dan riwayat tertutup tidak tertaut ulang. Publikasi/tanggal berlaku dan aktivasi hanya setelah gate readiness terkait. PUB-POLICY, PUB-AGE; formal register tetap terpisah. |
| REL-02 — capability hosted | BLOCKED_EXTERNAL; aktivasi tertutup | Engineering belum bernama; Owner untuk resource/izin | [Tier/mode/grants](../../src/lib/env/deployment.ts), [matrix/resolver](../../src/modules/capabilities/matrix.ts) dan origin ada; [guard lama](../../src/modules/providers/non-production.ts) menolak production/live, grants kosong. Owner mengonfirmasi staging resource belum tersedia; shared PostgreSQL limiter hanya diuji lokal dan binding hosted belum dibuktikan | Sediakan staging sandbox terpisah dan putuskan origin/cookie/CSP/capability yang konsisten. Production tetap tertutup sampai instruksi aktivasi tersendiri; tidak sekadar melepas guard. PUB-HOSTED. |
| REL-03 — email persisten dan inbox | PARTIAL_LOCAL; hosted delivery belum tersedia | Engineering belum bernama; Rheza untuk kanal/operasi; Owner untuk sender | [Outbox](../../src/modules/outbox/service.ts) menyimpan pesan terenkripsi/dedup/revalidation/expiry. [Worker](../../src/modules/outbox/worker.ts) memakai lease/retry/fencing dan [sender Customer](../../src/modules/outbox/customer-sender.ts). Producer auth/privacy enqueue atomik; [launcher](../../src/app/api/internal/jobs/outbox/route.ts) mencatat hasil safe ke job state, termasuk outcome unknown. Queue accepted belum membuktikan inbox; provider hosted/bounce dan email bisnis belum tersedia | Pesan persisten, retry terbatas/idempoten, proof expired/revoked/closed tidak terkirim ulang, kegagalan terlihat dan inbox/bounce diuji. PUB-EMAIL. |
| REL-04 — job operasional | PARTIAL_LOCAL; scheduler/hosted belum tersedia | Engineering belum bernama; Rheza/privasi; Owner untuk cadence/lag/coverage | [Outbox](../../src/app/api/internal/jobs/outbox/route.ts), [inventory expiry](../../src/app/api/internal/jobs/inventory-reservations/route.ts) dan [retensi file](../../src/app/api/internal/jobs/customer-file-retention/route.ts) berbagi JobRunner/OperationalJobState, bearer auth, binding dan role guard. Inventory melindungi settlement; retensi memakai klaim pending, final lease dan hold persisten setelah closure/receipt purge. Backend 95/706 dan integration 50/382 serial lulus lokal pada diff T08. `vercel.json` hanya menjadwalkan analytics; R2/scheduler hosted, cadence, alarm eksternal dan payment reconciliation belum terbukti | Job resource-bound, aman diulang/overlap, deadline tetap, lag/last-success/alarm dan petugas terbukti. Owner menetapkan cadence; staging memverifikasi launcher/scheduler. Cron analytics tidak menutup PUB-JOBS. |
| REL-05 — refund lengkap | BLOCKED_EXTERNAL | Owner (approval); engineering belum bernama; Rheza/operasi pembayaran | T21/T22 telah terintegrasi; kelanjutan T23/T25 mempunyai submission/reconciliation dan manual berizin pada diff lokal 21 Oktober. Key/clock, receipt, lease dan hold partial/external diuji fixture; hasil bank dan cakupan merchant sandbox/hosted belum terbukti. [Kontrak refund](../backend/refund-workflow.md). | Bukti sandbox metode/channel/window/saldo/ETA, hasil bank, fallback manual, role/resource/cadence dan petugas; partial/external exception membutuhkan rekonsiliasi bukti sebelum sisa kewajiban dibayar. PUB-REFUND-PROVIDER, PUB-REFUND-RECON, T35. |
| REL-06 — provider dan data pemenuhan | BLOCKED_EXTERNAL | Owner untuk akun/resource/data; engineering belum bernama; Rheza/operator | Adapter/test Google, email, payment/shipping dan R2 ada. Smoke development bertanggal tetap hanya evidence fase tersebut. Owner mengonfirmasi resource staging/provider sandbox belum tersedia; tidak ada secret/env yang diperiksa | OAuth/inbox, Midtrans sandbox/webhook, Biteship dan private R2 terbukti pada staging; stok/berat/dimensi paket sesuai produk dan paket MAKE diukur setelah selesai. PUB-PROVIDER, PUB-STAGING. |
| REL-07 — privasi, operasi dan recovery | PARTIAL_LOCAL; review/resource terbuka | Owner; Rheza/privasi; fungsi akuntansi/review; engineering belum bernama | [Availability privasi](../../src/modules/customer-privacy/core.ts) masih internal/test. Identitas/alamat retur/Rheza terkonfirmasi; coverage/kalender, retensi arsip, provider delete dan restore belum terbukti | Hak Customer hosted, kontak pasca-closure, retensi per kategori, prosedur insiden dan latihan restore terbukti tanpa memulihkan akun/riwayat atau mengulang refund/email. PUB-DATA, PUB-RECORDS, PUB-SERVICE, PUB-INCIDENT, PUB-BACKUP. |
| REL-08 — bukti alur terpadu dan rilis | BLOCKED_EXTERNAL; release belum diizinkan | Engineering belum bernama; Owner untuk penerimaan/izin; Rheza/operator | [Quality pada squash merge main `54a97bb`](https://github.com/batakers/Niuva-2026/actions/runs/39185705585) success. Diff T08 sesudahnya lulus lint/typecheck/unit/backend/integration/build lokal; browser E2E tidak diulang dan CI T08 belum tersedia karena diff belum di-commit/push. Evidence browser/Owner/Admin pada main tetap terpisah dari diff T08. Staging belum tersedia. B2B WhatsApp dan layanan BUY/MAKE memiliki source | Uji hosted BUY lalu MAKE termasuk failure/fulfillment/refund yang relevan; B2B membuka tujuan WhatsApp yang benar. Catat scope visual/device/AT, monitoring/rollback, hasil operasi dan keputusan rilis. Deployment/provider/production memerlukan instruksi tersendiri. PUB-STAGING, PUB-RELEASE. |

### Urutan rekomendasi setelah Batch 1 — snapshot 2026-10-13

1. **Batch 1 — rekonsiliasi dokumen ini.** Selaraskan keputusan/source, pisahkan snapshot dan catat delapan penghambat. Hasilnya bukan policy resmi atau penutupan gate lingkungan.
2. **Batch 2 — fondasi hosted, outbox dan kerangka job** (REL-02/03/04). Rancang slice implementasi yang dapat diuji dengan fixture. Resource/sender/topologi hosting dan petugas dikumpulkan sejak tahap ini; tidak harus menunggu semua fakta production untuk coding yang kontraknya jelas.
3. **Batch 3 — akun publik dan privasi hosted** (REL-01, bagian REL-07). Memakai fondasi Batch 2; kontrol deklarasi 18+ yang ada dipertahankan. Versi policy final dan izin terkait diperlukan sebelum kemampuan dijanjikan/diaktifkan.
4. **Batch 4 — refund dan rekonsiliasi** (REL-05). Memakai outbox/job untuk hasil dan retry; detail merchant/fallback dipenuhi bersamaan dengan pengembangan fixture.
5. **Batch 5 — staging/provider/operasi/recovery** (REL-06/07/08). BUY lebih dahulu membuktikan akun→katalog→ongkir→payment→order→fulfillment, lalu MAKE menambah file/review/quote/paket akhir. Scope deployment/smoke diminta tersendiri saat resource dan skenario konkret siap.
6. **Batch 6 — pemeriksaan rilis production** (REL-08). Evidence relevan, data operasional, dokumen berlaku, monitoring dan rollback dinilai sebelum instruksi deployment/aktivasi.

Urutan Batch 2–6 di atas adalah rekomendasi pada snapshot 13 Oktober. Urutan
eksekusi aktif kini mengikuti [ROADMAP](../../ROADMAP.md) dan backlog
[TASKS](../../TASKS.md) yang disetujui pada 18 Oktober. Persetujuan itu tetap
tidak memberikan izin aktivasi provider/deployment. Bukti readiness dicatat
di ledger ini berdasarkan tanggal, source, lingkungan dan hasil aktual.

**Handoff Batch 2 — 13 Oktober 2026:** Owner mengizinkan perancangan dan implementasi Slice 2.1. [Kontrak binding database](../superpowers/specs/2026-10-13-batch-2-database-binding-design.md) sudah diimplementasikan sebagai modul internal dengan **52 test baru**; [bukti lokal](../superpowers/plans/2026-10-13-batch-2-database-binding.md#hasil-implementasi-lokal--13-oktober-2026) mencatat gate aplikasi yang lulus, batas skip browser, dan review kode independen **0 findings**. Guard belum dihubungkan ke consumer aplikasi; penanda/resource hosted belum diprovision. REL-02 tetap partial lokal/unwired, REL-03/04 belum mempunyai durable outbox atau worker/job hosted; seluruh status PUB/RK/AG mengikuti evidence masing-masing. Provisioning, provider dan bukti hosted tetap hasil berikut yang terpisah.

**Handoff Slice 2.2 — 14 Oktober 2026:** Owner meminta implementasi [durable outbox](../superpowers/specs/2026-10-14-batch-2-durable-outbox-design.md). API internal menyediakan enqueue atomik dengan producer, payload auth/privacy terenkripsi, identitas pesan immutable/idempoten, pemeriksaan proof/akun/sesi dan scrub expiry/cancellation. Waktu database dibaca sebagai epoch agar tidak bergeser oleh zona waktu. [Plan dan hasil lokal](../superpowers/plans/2026-10-14-batch-2-durable-outbox.md) mencatat **108 tes baru**, gate aplikasi lulus dan satu finding Important review independen yang sudah diperbaiki dengan RED→GREEN serta full suites. Verifikasi pending lain dengan email sama yang sudah membuat akun membatalkan pesan sibling dan menolak enqueue baru. Enqueue tidak mengubah delivery flags; tidak ada worker, send provider, scheduler, consumer wiring atau provisioning hosted dari slice ini. REL-03 hanya maju menjadi partial internal; PUB/RK/AG dan izin aktivasi tetap mengikuti evidence masing-masing. Titik lanjut adalah Slice 2.3 worker/kerangka job, lalu pembuktian hosted.

**Handoff Slice 2.3 — 14 Oktober 2026:** Owner memilih worker/job dan sambungan mailer Customer existing, tanpa key produksi/aktivasi. [Rancangan](../superpowers/specs/2026-10-14-batch-2-outbox-worker-design.md) mengikat empat purpose, claim/finalize dalam transaksi singkat, send di luar transaksi, revalidation/lease fencing, receipt/abort dan flags hanya setelah acceptance proof yang masih sah. **144 tes worker lulus** (35 unit, 38 backend, 71 integrasi); [plan dan bukti penutup](../superpowers/plans/2026-10-14-batch-2-outbox-worker.md) mencatat seluruh gates final: 1.434 unit/component, 664 backend, 312 integrasi, 112 E2E dengan 5 expected skips dan build 90 static pages. Satu review fresh context menemukan 3 Important yang diperbaiki dengan 9 regression assertions RED→GREEN serta full suites: preparation/config failure mempertahankan row, elapsed claim/commit mengurangi validitas sebelum send, dan envelope terenkripsi immutable dipersist melalui satu migration aditif untuk replay persis setelah worker reconstruction. Existing migrations utuh; penerapan migration hanya pada DB tes lokal. Dry-run hanya job authority dan tidak membuka cipher/sender. Timeout/hasil tidak pasti/lease abandoned berhenti tanpa resend otomatis; batch mengembalikan cooldown dan berhenti pada retryable/unknown. Sambungan worker→mailer belum mengalihkan producer inline atau menjalankan cron. Producer enqueue, launcher/identity/cadence/rate coordination/monitoring serta bukti hosted/inbox tetap berikutnya; seluruh PUB/RK/AG dan production activation mengikuti evidence masing-masing.

### Keputusan yang tidak dibuka ulang

- Akun 18+ dengan deklarasi, Owner sebagai pengesah, refund penuh, identitas/kontak/alamat retur/Rheza, B2B WhatsApp serta batas file/lifecycle sudah tercatat. Detail operasional yang masih kosong dipenuhi tanpa mengulang keputusan tersebut.
- Checkout membutuhkan JavaScript sesuai RK-13; guest checkout tidak dipulihkan. Cache ongkir deferred sesuai RK-14. Social OG asset menunggu Owner, bukan pengganti penyelesaian alur transaksi.
- Rate limit kini memakai store PostgreSQL bersama dan memiliki bukti dua-klien lokal; batas lintas instance pada topologi hosted belum diverifikasi karena resource staging belum tersedia. Keputusan store mengikuti topologi hosting RK-11/AG-5.15.
- WhatsApp otomatis/cloud API merupakan roadmap terpisah. B2B direct link tidak membutuhkan implementasi sender/template otomatis. Redesign luas tidak menjadi prasyarat penyelesaian capability hosted yang tidak bergantung padanya.

**Batas evidence snapshot terdahulu.** Evidence public, catalog, authenticated-admin, dan quote pada
snapshot di bawah bersifat **local/loopback/non-production**: database test loopback,
mock Customer OAuth, Clerk development, serta data katalog/quote lokal atau
sintetis (lihat status `ACCEPTED_LOOPBACK`, `ACCEPTED_LOOPBACK_SYNTHETIC`,
`ACCEPTED_HISTORICAL_NON_PRODUCTION`, dan `READY_NON_PRODUCTION` pada tabel
keputusan). Tidak ada evidence di sini yang berasal dari staging, provider
nyata, atau production. Penerimaan visual Owner, pemeriksaan perangkat fisik/AT,
provider, dan production readiness tetap gate terpisah.

### Admin Operations architecture — 2026-10-07

**Snapshot historis 7 Oktober.** Status lokal/uncommitted dan permukaan B2B pada laporan berikut adalah konteks saat itu; B2B aktif dipensiunkan 11 Oktober dan Admin kini Better Auth. Gunakan baseline/peta 13 Oktober di atas untuk handoff terkini.

Sumber: [laporan implementasi dan validasi](./admin-operations-implementation-2026-10-07.md) dan [approved plan / checklist selesai](../superpowers/plans/2026-10-07-admin-operations-architecture.md). Baseline PR #46 `5b8aaad05882389df83776a3800367b768b94850`; working tree `codex/admin-operations-architecture`. Belum di-commit/push atau diterapkan hosted/production.

- Delapan batch selesai lokal: shared shell/context; tiga Core lists; B2B proposal workspace; MAKE review/estimate/quote workspace; Orders fulfillment/related request; Overview/Queue; management context; Owner Privacy detail.
- Hanya tiga route produk baru: `/admin/inquiries/[id]/proposal`, `/admin/custom-print/[id]/review`, `/admin/privacy/[id]`. Existing URL tetap; business/domain policy dan fitur deferred tidak diperluas.
- Gate akhir: **1.331 unit/component**, **582 backend**, **149 integration**, **11 browser Admin**, **111 browser publik lulus + 5 expected skip**; lint, strict typecheck, Prisma validation dan production build PASS.
- Browser Admin memakai Better Auth dan MFA sungguhan; Customer mock tetap test/loopback. B2B return halaman kedua, Orders/MAKE related links, dan Privacy JS/native POST/303 tercakup. Automatic Admin loading boundary dipindahkan dengan content utuh agar HTML final tersedia tanpa JavaScript; initial navigation menunggu data lengkap.
- Validation memakai database test terisolasi baru port 55439 setelah cluster test lama gagal sebelum tes aplikasi dengan PostgreSQL `58P01`. Dua puluh migration existing lulus pada database baru; cluster lama tidak direset/diperbaiki manual. Backend final memakai satu worker setelah timeout optimizer pada run parallel.
- **78 capture sintetis local/actual-route**, termasuk desktop/mobile dan transisi shared shell. Penerimaan visual Owner untuk composition baru **belum tercatat**; walkthrough Owner BUY/MAKE/DEVELOP serta perangkat fisik/AT, provider/staging dan production tetap terpisah.

### Baseline Tahap 0 — 2026-10-04

Sumber: `.kiro/specs/niuva-audit-remediation/baseline-gate.md` (bagian 2, 6, 7).
Diukur pada working tree lokal, yang memuat perubahan uncommitted Owner, dengan
database test lokal. Bukan hasil CI, staging, atau production.

| Gate | Hasil | Angka |
| --- | --- | --- |
| `lint` | PASS | 0 error, 0 warning |
| `typecheck` | PASS | 0 error |
| Unit/component (`test`) | PASS | 55 file / 612 test |
| Backend (`test:backend`) | PASS | 38 file / 190 test |
| Integration (`test:integration`) | PASS | 15 file / 83 test, dicatat 2026-10-04 |
| E2E Chromium (`test:e2e`) | PASS | 22 file spec / 103 test, dicatat 2026-10-04 |
| `build` | PASS | Production build lulus |
| `db:validate` | PASS | Schema valid |

Integration dan E2E tidak diukur ulang di checkpoint 2; angkanya berasal dari
run 2026-10-04 yang tercatat di `baseline-gate.md`. Baris ini tidak
menggantikan angka bertanggal di tabel Keputusan readiness dan tidak diukur
pada checkout yang sama dengan angka-angka tersebut, jadi tidak dibandingkan
langsung. Baseline ini tidak menambah penerimaan visual atau klaim production
readiness.

### Catatan replay integration — status historis

Catatan "2 replay test historis masih gagal" pada
[addendum Customer Google OAuth 2026-09-25](#scope-expansion-addendum--customer-google-oauth-2026-09-25)
sudah ditandai historis (verifikasi 2026-10-04): trigger
`orders_commercial_snapshot_immutable` tidak lagi menolak rotasi
`public_token_hash`, dan run integration 2026-10-04 lulus. **Replay seluruh 17 migrasi
pada database lokal kosong berhasil (task 3.11; bukti lokal, non-production).**
Rincian ada pada penanda di addendum tersebut.

## Keputusan readiness

**Snapshot keputusan 30 September–1 Oktober.** Tabel ini dipertahankan sebagai evidence bertanggal, bukan daftar status kode/provider terkini. Rujukan Clerk, B2B dan pengiriman tautan historis dibaca dalam konteks fase tersebut. Handoff aktif adalah baseline/peta 13 Oktober di atas; angka historis tidak dinaikkan atau dijumlahkan.

Jalur teknis MVP yang tidak membutuhkan provider eksternal sudah diaudit dan
siap untuk development/loopback handoff. Ini bukan klaim production-ready:
deployment, identitas bisnis resmi, pengiriman customer, WhatsApp, Biteship,
dan Midtrans masih berada di gate terpisah.

| Area | Status saat ini | Bukti terakhir |
| --- | --- | --- |
| TypeScript | `READY` | `corepack pnpm typecheck` lulus |
| Lint | `READY_WITH_EXISTING_WARNINGS` | 2026-10-01: `corepack pnpm lint` lulus, 0 error dan 147 warning existing |
| Unit/backend/integration | `READY_LOCAL` | 2026-10-01: unit 120/120. Backend 169/169 dan integration 55/55 tetap evidence 2026-09-30 pada database test terisolasi. |
| Schema/build | `READY_LOCAL` | Schema tidak berubah; evidence db:validate pada addendum 2026-09-28. Typecheck/build checkout kerja 2026-10-01 dan pemeriksaan whitespace/diff lulus. |
| Public + preview browser | `READY_LOCAL` | 2026-10-01: E2E 70/70 lulus dengan mock Customer OAuth dan database test; tidak memakai provider/customer nyata |
| Clerk authorization | `READY_NON_PRODUCTION` | active Owner smoke, unknown/inactive profile denial, dan restore state tercatat di task map; test boundary blank-credential tetap terpisah dari server yang sedang memakai Clerk |
| Customer Google OAuth | `IMPLEMENTED_LOCAL_MOCK_PENDING_LIVE` | `/login`, `/register`, `/account`, DB session, safe return, auto-link, logout, dan mandatory checkout boundary teruji lokal; Google Development credentials dan live callback belum diverifikasi |
| Authenticated admin visual | `ACCEPTED_HISTORICAL_NON_PRODUCTION` | Penerimaan versi sebelum shell 2026-09-28/revisi sidebar 2026-09-30, untuk shell/list/detail dengan data. Tidak mengesahkan versi baru. |
| Redesigned live Admin Overview + Action Queue (2026-09-27) | `OWNER_VISUAL_ACCEPTED_HISTORICAL_LOCAL` | Owner menerima versi saat itu setelah review Chrome lokal dengan Clerk Owner dan `AdminProfile` aktif pada 320/390/768/1280 px; cakupan dan batas bukti ada di `gate-closure-audit.md` |
| Admin Overview Figma adoption + shared Admin shell (2026-09-28) | `IMPLEMENTED_VISUAL_UNREVIEWED` | Komposisi dan shell baru menggantikan tampilan yang diterima pada baris historis di atas. Penerimaan Owner untuk versi baru, perangkat fisik/AT, dan bukti produksi belum ada. |
| Admin sidebar dapat dilipat (2026-09-30) | `IMPLEMENTED_HISTORICAL_NON_PRODUCTION` | Evidence toggle header dan logo lama dipertahankan sebagai histori; presentasi diganti oleh revisi 2026-10-01. |
| Admin sidebar footer/logo (2026-10-01) | `IMPLEMENTED_LOCAL_ACCEPTED_OWNER` | Toggle footer, header Situs publik, logo putih konsisten, tombol ikon dan lebar penuh diterima Owner pada Overview lokal 2026-10-01; keyboard/tooltip, persistence, menu scroll dan mobile terverifikasi. |
| First-party traffic analytics | `IMPLEMENTED_DISABLED_LOCAL_VALIDATED` | Collector default mati; angka traffic dimulai setelah aktivasi. Unit/backend/integration lokal dengan database test lulus; pemberitahuan privasi Owner/legal, uji batas laju edge, dan instruksi deployment/aktivasi terpisah masih diperlukan. |
| Catalog/public Shop | `ACCEPTED_LOOPBACK` | 3 ready-made published, 5 custom-flow draft, 34 varian, 50 JPG; gallery fallback disetujui Owner |
| Custom Print + quote/order | `ACCEPTED_LOOPBACK_SYNTHETIC` | quote route-bound, accept → `WAITING_PAYMENT`, decline regression |
| R2 upload | `PASSED_NON_PRODUCTION_SMOKE` | `PENDING → UPLOADED → VERIFIED`, exact-origin CORS, cleanup selesai |
| Customer-link reissue | `READY_SERVER_SIDE_PENDING_MANUAL_SEND` | server reissue dan invalidasi token lama siap; daftar customer dan kanal resmi belum diberikan |
| WhatsApp otomatis | `ROADMAP_DECIDED_NOT_IMPLEMENTED` | Sesi Owner: Meta Cloud API langsung, sender nomor bisnis publik bergantung eligibility, opt-in per request dan satu retry sementara. Template/eligibility/idempotency/delivery serta input bisnis tetap gate; belum ada aktivasi. |
| Biteship/Midtrans | `DEFERRED_BY_USER` | tidak diaktifkan atau di-smoke sesuai keputusan Owner |

Angka pada kolom "Bukti terakhir" (lint 147 warning, unit 120/120, backend
169/169, integration 55/55, E2E 70/70) adalah hasil bertanggal 2026-09-30 dan
2026-10-01 yang dipertahankan apa adanya. Angka gate terbaru ada pada tabel
[Baseline Tahap 0 — 2026-10-04](#baseline-tahap-0--2026-10-04) di atas, yang
diukur pada working tree berbeda dan tidak dibandingkan langsung dengan angka
di tabel ini. Token status tabel ini tidak diubah oleh pembaruan baseline.

## Input yang masih diperlukan

- Identitas/kontak/alamat retur dan Rheza sudah dikonfirmasi; lengkapi hanya
  detail penerima/jam, coverage/pengganti, kalender, wilayah dan fakta layanan
  yang masih terbuka pada [catatan input](../legal/customer-public-input-evidence.md).
- Daftar penerima/kanal diperlukan hanya bila reissue tautan historis akan
  dijalankan. Ini bukan allowlist atau prasyarat daftar Customer publik penuh.
- Akun, sandbox key, callback, dan keputusan katalog/provider bila Owner ingin
  membuka Biteship atau Midtrans.
- Input nomor bisnis/eligibility, template, penerima serta implementasi delivery
  hanya bila Owner kelak mengaktifkan roadmap WhatsApp otomatis; bukan gate
  B2B WhatsApp langsung. Pilihan sesi dan opt-in
  tercatat pada [keputusan Owner](../Niuva%20Document/NIUVA_Use_Case_Specification.md#9-keputusan-owner-dan-input-terbuka).
- Angka retensi legal/accounting per kategori record dari Owner dan akuntan/
  penasihat legal; tetap terbuka di luar lifecycle binary 14/60/90 hari.
- Fakta peran/tahun/deliverable/hasil studi kasus yang masih OPEN_FACT pada
  [dossier kurasi](../content/niuva-content-curation-dossier.md). Nama/logo yang
  sudah CONFIRMED tidak dibuka ulang.

## Handoff berikutnya

Gunakan urutan setelah Batch 1 dan REL-01–08 di atas. Pekerjaan pertama yang
direkomendasikan adalah rancangan slice Batch 2 dengan source/kontrak yang
sudah selaras. Reissue manual historis tetap mengikuti penerima terkonfirmasi
bila diminta, tanpa menjadi pekerjaan wajib signup publik. Jangan memakai
`READY` pada tabel historis sebagai bukti deployment atau aktivasi provider.

## Bagian 2 — Arsip evidence bertanggal (historis)

Addendum di bagian ini dipertahankan sebagai histori evidence pada tanggal
masing-masing. Angka di dalamnya (misalnya lint 147 warning, unit 120/120,
integration 55/55, E2E 70/70) adalah hasil checkout pada saat itu, bukan status
saat ini. Status penerimaan visual Owner yang tercatat (`ACCEPTED_OWNER_LOCAL`
dan sejenisnya) tidak diubah oleh penataan ini; ringkasan status terkini ada
pada tabel Keputusan readiness di Bagian 1. Urutan: terbaru lebih dulu, bagian
tanpa tanggal di akhir.

## Revisi posisi kontrol dan logo — 2026-10-01

Tindak lanjut lebar shell: batas `max-w-admin` dan pemusatan `mx-auto` dihapus dari AdminSidebarLayout agar sidebar dan area kerja memenuhi viewport. Padding konten tetap mengikuti breakpoint. Owner menerima visual koreksi ini pada 2026-10-01 (`ACCEPTED_OWNER_LOCAL`). Verifikasi: 5 tes sidebar, lint komponen, build/TypeScript, dan diff/whitespace lulus. Route Admin aktual diperiksa pada browser desktop: shell dari x=0 sampai 1895px sama dengan lebar viewport 1895px, baik terbuka maupun terlipat, tanpa overflow horizontal. Capture `admin-footer-20261001/desktop-full-width.jpg` disimpan di luar repo.

Tindak lanjut tinjauan Owner pada tanggal yang sama: kontrol footer memakai tombol ikon saja pada sidebar terbuka maupun rail. Nama aksesibel dan tooltip tetap tersedia; Owner menerima visual hasil final pada 2026-10-01 (`ACCEPTED_OWNER_LOCAL`). Verifikasi tindak lanjut: 8 tes sidebar/Action Queue lulus, lint kedua komponen lulus, build beserta pemeriksaan TypeScript lulus, validator dokumen dan diff/whitespace lulus. Pada pemeriksaan awal, koneksi browser timeout. Pemeriksaan berikutnya berhasil pada Overview Admin aktual dengan tombol ikon dan lebar penuh; Owner menerima visual hasil final pada 2026-10-01. Tidak ada blok Mermaid yang berubah pada tindak lanjut ini.

**IMPLEMENTED_LOCAL · ACCEPTED_OWNER_LOCAL (2026-10-01).** Revisi ini mengikuti review dan
pilihan Owner: toggle menjadi satu-satunya kontrol pada footer sidebar desktop,
Situs publik berada di header kanan sebelum role/Keluar, dan logo lengkap serta
simbol memakai latar putih konsisten. Lebar 212px/64px dan breakpoint `lg`
tetap. Area logo/footer tetap terlihat; daftar navigasi menggulir sendiri pada
viewport pendek. Rail mempertahankan target klik minimal 44px dan ruang ring
fokus; scrollbar rail disembunyikan secara visual, dengan gulir/keyboard tetap
berfungsi. Mobile memakai logo lengkap terang dan Situs publik di Menu Admin.

Horizontal light dan simbol biru runtime adalah salinan persis aset resmi Logo
System v1.0; tinggi visual gambar 24px, posisi simbol selaras dengan selisih
horizontal kurang dari 1px pada pengukuran desktop. Warna, bentuk dan proporsi
asli tetap. Key `niuva.admin.sidebar.v1`, default terbuka, persistence lintas
route/reload, storage event dan fallback memori tetap berlaku. Fokus bertahan
pada tombol setelah toggle; label aksesibel dan tooltip rail tetap tersedia.

Verifikasi final revisi ini:

- Lint **0 error / 147 warning existing**, typecheck dan production build lulus.
  Unit/component **120/120** dan E2E Chromium **70/70** lulus. E2E memakai
  database test loopback, mock Customer OAuth dan gate Admin fail-closed tanpa
  Clerk; browser Admin berizin diperiksa terpisah dengan Clerk development
  serta AdminProfile Owner aktif.
- Gate CLI memakai PATH per proses ke launcher sementara di luar repo untuk
  executable dependensi terpasang, karena shim `.bin` lokal tidak tersedia.
  Tidak ada penambahan dependensi atau perubahan konfigurasi repository.
- Browser memeriksa Enter/Space, fokus setelah toggle, tooltip/Escape, urutan
  Situs publik → role → Keluar, route aktif, serta pilihan rail yang bertahan
  saat Overview → Action Queue dan reload. Mobile Menu Admin dibuka dengan
  Enter dan ditutup dengan Space, dengan label serta link Situs publik utuh.
- Viewport 320, 390, 768, 1023, 1024, 1280 dan 1440px tidak memiliki scroll
  horizontal dokumen. Pada 1024×480px, menu dapat digulir sampai item terakhir
  sementara footer tetap terlihat, tinggi tombol 44px dan lebar target rail
  terukur 47px. Sidebar tersembunyi di bawah `lg`; preference desktop tidak
  mengubah disclosure mobile.
- Revisi ini mengubah **1 blok Mermaid** pada wireframe navigasi: **1 dirender**
  dan **1 diperiksa visual** dengan renderer sementara di luar repo. Inventori
  paket tetap 43 blok; evidence render/visual 43 diagram pada 2026-09-30 tetap
  histori, bukan klaim render ulang seluruh paket pada 2026-10-01.
- Rujukan dokumen, 28 ID Use Case, status Draft v0.3 REFERENCE, cakupan indeks,
  serta whitespace/diff diperiksa, termasuk draf dan source baru untracked.

Owner menyatakan telah melihat dan menerima visual hasil final pada 2026-10-01.
Penerimaan ini mencakup shell Admin yang ditampilkan pada Overview lokal: posisi
kontrol/footer, tombol ikon, logo, utilitas header dan lebar penuh. Evidence
perangkat fisik/AT, provider dan produksi tetap terpisah. Alert traffic pada
database development tetap unavailable seperti catatan 2026-09-30 di bawah.
API/schema/lifecycle pembayaran tidak berubah; analytics tetap mati default.

## Revisi sidebar dan referensi runtime — 2026-09-30

**HISTORICAL_LOCAL — versi sebelum revisi 2026-10-01.** Evidence berikut
dipertahankan untuk histori; posisi kontrol dan logo terkini mengikuti bagian
2026-10-01 di atas. AdminShell pada versi ini menggunakan toggle di
header untuk sidebar desktop 13.25rem atau rail 4rem pada breakpoint `lg`.
Default pertama terbuka; `niuva.admin.sidebar.v1` menyimpan pilihan lokal di
browser. Jika storage ditolak, toggle tetap bekerja dengan fallback memori.
Rail memakai salinan persis simbol biru Logo System v1.0; nama aksesibel,
tooltip fokus/hover, `aria-current`, `aria-expanded` dan `aria-controls` tetap
tersedia. Menu mobile tetap disclosure Menu Admin.

Bukti implementasi: [AdminShell](../../src/components/niuva/admin-shell.tsx),
[preferensi/sidebar client](../../src/components/niuva/admin-sidebar.tsx),
[tes sidebar](../../tests/unit/admin-sidebar.test.tsx),
[DESIGN](../../DESIGN.md), dan [spec queue](../backend/SPEC-action-queue.md).
API publik, schema/migrasi dan lifecycle pembayaran tidak berubah.

Verifikasi pada checkout kerja:

- Lint lulus: 0 error, 147 warning existing. Typecheck dan production build
  lulus; tidak menambahkan dependensi repository.
- Unit/component **119/119**, backend **169/169**, integration **55/55**,
  E2E Chromium **70/70** lulus. Integration dan E2E memakai database test
  loopback terisolasi; E2E memakai mock Customer OAuth dan boundary Clerk
  tanpa kredensial. Uji sidebar mencakup default/invalid preference, remount
  route, perubahan storage, storage ditolak, serta tooltip fokus dan hover.
- Browser Admin berizin memakai Clerk development dan AdminProfile Owner
  aktif, terpisah dari server E2E. Expanded/collapsed, Enter/Space, fokus
  keyboard/tooltip, route aktif, preferensi setelah navigasi/reload dan
  disclosure mobile diperiksa. Lebar viewport 320, 390, 768, 1023, 1024,
  1280 dan 1440 px tidak memiliki scroll horizontal dokumen. Lebar sidebar
  desktop terukur 212 px terbuka dan 64 px terlipat. Toggle tidak menganimasikan
  perubahan lebar; aturan reduced motion global tetap berlaku.
- Sembilan draf **Draft v0.3 — REFERENCE** dan indeks diselaraskan dengan
  authority, 21 handler produk dan 22 nama Server Action aktual. Sebanyak
  **43 blok Mermaid dirender** dengan renderer sementara di luar repo;
  **43 diagram diperiksa visual** secara terpisah. Pemeriksaan mencakup
  Brief, MAKE → estimate → quote → order, cart → login → checkout → webhook,
  analytics Admin dan navigasi rail. Tautan/anchor relatif, 28 ID Use Case,
  sembilan entri indeks REFERENCE, fence Markdown, lampiran `/api/v1` dan
  whitespace diperiksa, termasuk berkas draf untracked.

Traffic pada database development yang dipakai preview belum dapat dibaca
(tabel agregat analytics belum tersedia di database tersebut). UI menampilkan
unavailable; metrik bisnis dan Action Queue tetap terbaca. Ini bukan angka nol,
bukan bukti collector aktif, dan tidak ditutup dengan migrasi/aktivasi di luar
scope. Pengumpulan analytics tetap mati secara default.

Status visual hasil revisi ini menunggu tinjauan Owner. Pemeriksaan browser
lokal bukan penerimaan Owner, bukti perangkat fisik/AT, provider/staging,
deployment atau production readiness. Tidak ada aktivasi provider/WhatsApp,
commit atau push dalam irisan ini.

## Bukti implementasi Admin analytics — 2026-09-28

Worktree terisolasi, database PostgreSQL test pada loopback port 55434, dan
Clerk development dipakai untuk pemeriksaan lokal. `db:validate`, `typecheck`,
`build`, serta `git diff --check` lulus. `lint` lulus dengan 0 error dan
147 warning yang sudah ada di area lain. Unit 115/115, backend 169/169,
integration 55/55, dan E2E fail-closed tanpa Clerk 1/1 lulus. Integrasi
analytics mencakup 25 hit serentak pada satu bucket, batas hari Jakarta,
range 30 hari/13 bulan, tiga hitungan bisnis dari record database, serta
retensi pada batas bulan.

Route Admin berizin diperiksa di browser pada 320, 390, 768, 1024, 1280, dan
1440 px: tidak ada scroll horizontal dokumen; navigasi delapan halaman memakai
sidebar/header bersama; menu mobile, fokus keyboard, empty state, dan
preservasi `group` saat `range` berubah terlihat. Contoh traffic sementara
di database test dibersihkan setelah grafik diperiksa. Saat flag dinyalakan
hanya pada server lokal, pemuatan beranda menghasilkan bucket `home/direct`,
perpindahan client ke layanan menghasilkan `services/internal`, dan membuka
`/account` tidak menambah hitungan. Collector lalu dikembalikan mati dan
agregat test dibersihkan. Pada build tanpa
kredensial Clerk, `/admin` mengembalikan 503 dan E2E fail-closed lulus.
Aturan `prefers-reduced-motion` tetap ada di CSS global, tetapi pemeriksaan
emulasi perangkat fisik dan AT belum dilakukan. Screenshot browser tidak
menjadi penerimaan visual Owner; statusnya tetap belum ditinjau.

## Addendum penerimaan visual Owner — 2026-09-27

Owner menyatakan telah meninjau manual dan menyetujui tampilan **Layanan dan MAKE** hasil irisan Target IA, serta tampilan **Account dan Admin**. Catatan ini mencakup permukaan yang disebut; daftar viewport dan state visual tidak diberikan sebagai bukti terpisah. Pengujian pada perangkat fisik/AT, aktivasi provider, deployment, dan kesiapan produksi tetap memerlukan bukti terpisah.

Owner secara khusus juga menyetujui tampilan **riwayat stok per varian** yang baru. Catatan ini tidak menyertakan daftar viewport atau state visual yang ditinjau.

## CI quality-gate addendum — 2026-09-26

`PASSED_PR_CHECK` — GitHub Actions workflow `Quality` lulus pada PR #23,
commit `4721cac928c3c9c9ae26cc2905f6dfaf77bebe1a`:
[run 36233414587](https://github.com/batakers/Niuva-2026/actions/runs/36233414587).
Lint, typecheck, unit/component tests, backend tests, validasi Prisma,
migration dan integration tests pada PostgreSQL 18 sementara, instalasi
Chromium, browser E2E, serta production build semuanya lulus. Build hosted
runner juga berhasil mengambil font yang digunakan `next/font/google`.

Bukti ini hanya menutup quality check otomatis untuk commit PR tersebut; bukan
bukti visual acceptance baru, physical-device atau accessibility acceptance,
provider/staging smoke, deployment, backup/restore, rollback, maupun production
readiness. Workflow tidak memakai provider secrets dan tidak melakukan deploy.

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

> **HISTORIS — ditandai 2026-10-04; bukan status saat ini.** Butir
> `test:integration` di atas (20 test lulus, 2 replay test gagal) adalah hasil
> run sekitar 2026-09-25 dan dipertahankan apa adanya. Verifikasi ulang
> 2026-10-04 (task 1.9, dicatat di
> `.kiro/specs/niuva-audit-remediation/baseline-gate.md` bagian 9.2–9.6):
>
> - Alasan kegagalan tidak lagi berlaku. Migrasi
>   `20260925120000_allow_public_token_rotation` mengeluarkan `public_token_hash`
>   dari kolom immutable yang dijaga trigger `orders_commercial_snapshot_immutable`
>   (terbukti dari SQL migrasi pada skema 16 migrasi saat ini).
> - Run `test:integration` 2026-10-04 lulus: 15 file, 83 test, 0 gagal. Tiga
>   file test replay checkout (`database.test.ts`, `project-brief-route.test.ts`,
>   `local-demo-route.test.ts`) ikut lulus. Angka 20 test tidak dapat
>   dibandingkan dengan 83 test.
> - Run tersebut memakai `niuva_test` yang sudah termigrasi. Pembaruan task
>   3.11: replay seluruh 17 migrasi pada database lokal kosong berhasil (bukti
>   lokal, non-production). Identitas tepat dua test yang dulu gagal tetap tidak
>   terbukti.

Google Development credentials dan redirect URI non-production masih harus
disediakan Owner untuk live smoke. Secret tidak boleh masuk repository atau
chat.

## Gate closure addendum — 2026-09-22

Evidence terarah untuk checkout, Admin fail-closed, provider boundaries, touch
emulation, dan OptionChip tercatat di
[`gate-closure-audit.md`](./gate-closure-audit.md). Checkout dan Admin local
technical proof lulus; touch proof masih emulated; physical screen-reader,
provider activation, production deployment, dan OptionChip product propagation
belum ditutup. Tidak ada provider atau production resource yang diaktifkan oleh
audit ini.

## Browser boundary (tanpa tanggal)

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
