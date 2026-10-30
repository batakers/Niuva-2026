# Niuva v1.0 — backlog aktif

**Persetujuan implementasi:** 18 Oktober 2026. Baseline audit:
`f4799c77fedb86f185db29d6f9b9cbfd63828047`. Branch kerja kini `claude/*` per
PR dari `main`; branch `codex/*` lama adalah histori. Scope
[PRODUCT.md](PRODUCT.md), dependensi [ROADMAP.md](ROADMAP.md), selesai menurut
[DoD](docs/v1-definition-of-done.md).
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

## Fokus aktif (audit 30 Oktober 2026)

Papan kerja ringkas. Status resmi tetap di tabel di bawah, bukti di log.
Pelaksana: **A** = agen, **O** = Owner. Kelompok disusun menurut siapa yang
bisa menggerakkan task; baris yang selesai pindah ke log. Setiap task terbuka
ada di papan ini; pekerjaan baru masuk tabel task, bukan file lain.

| Kelompok | Task | Pelaksana | Langkah berikutnya | Penghambat |
| --- | --- | --- | --- | --- |
| Owner, bisa sekarang | T33 | O + A | BUY #2: dua produk, QRIS/GoPay simulator, fulfillment/resi manual sampai email shipped. Agen memverifikasi DB, job dan email, termasuk B2 berhenti di budget dengan pesan sungguhan | — |
| | T03, T19 | O + A | Smoke R2 privat/publik lewat unggah media Admin | Sesi Admin Owner |
| | T09 | O | `CUSTOMER_AUTH_CLEANUP` lewat CLI berkredensial DB di terminal Owner | Sesi Owner |
| | T23, T25, T35 | O | Cek metode dan fitur refund di dashboard Midtrans sandbox; grant `refund` sudah ada | Q1 |
| | T36 | O + A | UAT operasi Admin, bisa bersamaan dengan T33/T34 | — |
| Berantai | T34 → T08 | O + A | MAKE: unggah R2 → review/quote → bayar → produksi/QC → paket final → kirim; lalu retensi file pada berkas MAKE | T33 dulu |
| | T14 | O + A | Privacy hosted dengan sesi Customer penguji; grant sudah ter-deploy (#89) | Sesi Customer Owner |
| | T43 | O + A | Redirect URI Google staging dan env OAuth, lalu login Google | Google Cloud dan instruksi env (Owner) |
| Menunggu waktu | T24 | A | Cek pengecualian B5 pada attempt 29 Okt mulai 5 Nov; jalur `found` saat BUY #2 | Tanggal 5 Nov |
| Production | T41 | O + A | Beli VPS B Jakarta (dryRun harga dulu), lalu hardening dan jalur deploy | Pembelian (Owner); Q11 |
| | T42 | A | Scheduler job di VPS; IP klien setelah Q11 | Q11 untuk bagian IP |
| Rilis | T37 | O | Android + TalkBack (Owner), iPhone + VoiceOver (pinjam); checklist dari agen | T33–T36 |
| | T38 | O + A | `pg_dump` harian ke Biznet Gio (Q12) dan latihan restore | T41; akun dan bucket Biznet Gio (Owner) |
| | T44 | O + A | Draf policy privacy versi baru dengan penyedia production; Owner menyetujui teks | T41; penyedia sudah dipilih (Q12–Q13) |
| | T39 | O + A | SOP + simulasi | T33–T38 |
| | T07, T31, T40 | O + A | Scheduler production (lewat T42), aktivasi rule/dataset production, ledger readiness (D12), instruksi rilis | T41–T43 |

### Keputusan Owner paket Q

Judul ini stabil: kode grant dan jadwal job merujuk anchor-nya. Jawaban
30 Oktober 2026 ("ya saya menyetujui semua rekomendasi nya. kecuali Q5"):

- **Q1:** v1 memakai QRIS dan GoPay; refund diuji satu otomatis lewat Midtrans
  dan satu manual. Fitur yang aktif di dashboard sandbox belum dicek.
- **Q2, Q3, Q4:** grant `refund`, `privacy` dan `googleAuth` untuk staging
  disetujui. Login Google butuh Owner menambah redirect URI staging di Google
  Cloud.
- **Q5:** production di provider hosting Indonesia, demi biaya yang masuk
  budget. Keputusan lanjutan 30 Oktober ("Ya, satu VPS"): aplikasi dan
  PostgreSQL self-managed di **satu Helipod VPS B Jakarta** (2 vCPU, 4 GB,
  60 GB; Rp118.900/bulan, bayar bulanan dulu), backup harian ke S3 Jakarta.
  Belum dibeli; pembelian menunggu persetujuan harga final Owner.
- **Q6, Q7:** backup otomatis harian ke penyimpanan terpisah, satu tempat
  dengan salinan arsip pembukuan, region Jakarta. Penyedia dan biaya belum
  diverifikasi; agen mengajukan opsi.
- **Q8:** build staging boleh dibiarkan Active khusus `main`; Deploy Preview
  tetap mati.
- **Q9:** Owner menguji Android + TalkBack; iPhone + VoiceOver dipinjam dari
  teman/keluarga, memakai checklist dari agen.
- **Q10:** attempt kedaluwarsa tanpa transaksi Midtrans berhenti diperiksa
  setelah 7 hari.
- **Q14 (30 Okt, Owner menyetujui rencana T42):** jadwal job production.
  Email akun dan bisnis tiap 1 menit (limit 10); expiry reservasi tiap
  5 menit (100); rekonsiliasi pembayaran (10) dan expiry outbox (100) tiap
  15 menit; rekonsiliasi refund tiap 60 menit (10); retensi file (10),
  cleanup auth dan privacy (100) tiap 24 jam; alarm bila job tertinggal
  lebih dari 1 jam. Nilai teknis mengikuti staging: lease job 60 detik,
  budget outbox 20 detik, `maxAgeMs` email bisnis 24 jam, tanpa retry
  otomatis email. Dicatat di `JOB_SCHEDULES` (`src/modules/jobs/schedule.ts`).
  Tujuan alarm dan petugas tetap terbuka (T39/D07).
- **Q12 (30 Okt, Owner "Setuju keduanya"):** backup database harian dan
  salinan arsip pembukuan di **Biznet Gio NEO Object Storage** single region
  (Rp1.000/GB/bulan, tagihan bulanan). Akun dan bucket belum dibuat; fitur
  versioning/object lock dan cara tagih belum diverifikasi (log "Perbandingan
  S3 Jakarta").
- **Q13 (30 Okt, Owner "Setuju keduanya"):** file Customer dan media publik
  production tetap di **Cloudflare R2**, seperti staging dan policy privacy
  v1.0. Bucket R2 production terpisah dari staging dan belum dibuat.

Keputusan Owner yang masih terbuka (rekomendasi agen, belum diputuskan):

- **Q11:** cara aplikasi di VPS mengenali IP asli pengunjung (rate limit,
  T42). Rekomendasi: tanyakan ke Helipod apakah NAT-nya mendukung PROXY
  protocol; bila tidak, Cloudflare gratis di depan `niuva.id` (nameserver
  pindah dari Rumahweb, record Resend dipasang ulang).

Perbarui papan ini saat gelombang bergeser; log tetap di bagian bawah.

## Task dan acceptance criteria

| ID | M | Status | Hasil kecil | Dependensi | Acceptance criteria dan verifikasi minimum |
| --- | --- | --- | --- | --- | --- |
| T01 | M0 | DONE | Rekonsiliasi dokumen v1 | — | Empat dokumen punya fungsi jelas; keputusan lama tidak menjadi backlog aktif; setiap blocker punya ID/pemilik. Link/authority review. |
| T02 | M0 | DONE | Sinkronkan baseline lokal | T01 | Generate resmi sesuai schema; lint/typecheck resmi lulus; migration/database lama tidak berubah. |
| T03 | M1 | IN_PROGRESS | Kontrak hosted sandbox | T02 | Binding/origin/cookie/CSP konsisten; resource salah ditolak; production tetap tertutup. Konfigurasi dan adapter S3-compatible mengikuti kontrak object storage. Staging Netlify/Neon aktif sejak 28 Okt: binding marker, origin kanonik (#78), header CSP/HSTS/noindex, sesi Admin/Customer dan production tertutup terbukti (log 28–29 Okt). Sisa: smoke R2 privat/publik hosted. Histori 22 Okt di [runbook](docs/backend/t03-hosted-sandbox-runbook.md). |
| T04 | M1 | DONE | Producer auth ke outbox | T03 | Proof dan enqueue atomik; proof invalid tidak dikirim; retry tidak memberikan akun/sesi prematur. Integration lokal lulus; hosted delivery tetap menunggu T03. |
| T05 | M1 | DONE | Producer privacy ke outbox | T04 | Proof sekali pakai/closure aman; revoked/expired dibatalkan. Integration lokal lulus; hosted delivery tetap menunggu T03. |
| T06 | M1 | DONE | Launcher worker dan status | T04–T05 | CLI dan endpoint bearer-protected memakai JobRunner/OperationalJobState yang sama dengan resource binding, role terbatas, policy eksplisit, lease/cooldown lintas run, monitor dan safe counters; unknown tidak memicu resend otomatis. Unit/backend/integration lokal lulus; scheduler/provider hosted belum diaktifkan. |
| T07 | M1 | BLOCKED_EXTERNAL | Job expiry reservasi retail | T03; T42 | Reservation due mengikuti policy existing; pending payment yang masih berlaku menahan pembatalan; attempt kedaluwarsa menjadi EXPIRED, order unpaid menjadi CANCELLED, dan stok dilepas atomik/idempoten; settled/refunded tidak pernah dilepas. Runner/backend/integration lokal lulus. Run hosted manual 29 Okt membatalkan order kedaluwarsa dan melepas stok, aman diulang (log "Gelombang 1"). Sisa: scheduler production di VPS; jadwal Q14 sudah ada di kode (T42), pemasangan timer dan bukti menunggu T41. |
| T08 | M1 | BLOCKED_EXTERNAL | Job retensi file Customer | T03 | 14/60/90 sesuai kelas; hold Owner/privasi tetap setelah closure/purge receipt; order aktif dan bukti keuangan/histori B2B/media publik dilindungi. Klaim DELETE_PENDING, retry key sama, final lease, cursor bounded, HTTP/CLI canonical dan monitoring lulus lokal. PR #58 merged ke main pada `87d47fa`; adapter S3-compatible mempertahankan pembatalan I/O. Resource/scheduler/provider hosted menunggu T03. |
| T09 | M1 | BLOCKED_EXTERNAL | Cleanup auth/privacy hosted | T03 | Handler auth/privacy berbatas dari PR #56 memakai runner/lease/role/monitor canonical. Tenggat dan hold tetap; bukti lokal diwarisi lalu diuji ulang saat rekonsiliasi. Scheduler/role/resource hosted belum tersedia. |
| T10 | M1 | DONE | Rate limit lintas instance | T03 | PostgreSQL bersama, HMAC IP stabil dengan secret bersama, dan pembersihan row kedaluwarsa diuji lokal. Hosted 29 Okt (`main@82dd380`): bucket bersama di database staging berbinding, kunci dari `x-nf-client-connection-ip` (pemalsuan header tidak membuka bucket baru), baris kedaluwarsa terhapus. Identitas instance tidak diamati terpisah; store-nya database bersama. |
| T11 | M2 | DONE | Pengesahan policy publik | T01; Owner | Owner menyetujui isi dan identifier `NIUVA-TERMS-v1.0`/`NIUVA-PRIVACY-v1.0`; tanggal berlaku ditetapkan saat publikasi aktual. Fakta provider, transfer data dan gerbang rilis dicatat terpisah pada readiness yang sudah ada; tidak menghambat T11 atau development lokal. Tidak menjanjikan kemampuan yang belum dibuktikan. |
| T12 | M2 | DONE | Consent Google publik | T04/T11 | Consent/deklarasi 18+ server terikat state/browser/tujuan dan identitas provider terverifikasi; konsumsi atomik. Proof hilang/expired/replay/race/provider-denied, state/versi berubah, email akun sama, dan closure ditolak. Unit/backend/integration/E2E lokal lulus; aktivasi hosted tetap terpisah. |
| T13 | M2 | DONE | Signup email publik | T04/T11 | Persetujuan policy dan deklarasi 18+ terpisah; pending sampai email verified; tanpa sesi otomatis; expiry/cooldown/resend/reset/revoke dan pencegahan reattachment setelah closure diuji. Integration/E2E lokal lulus; tanggal publikasi/berlaku dan aktivasi hosted tetap terpisah. |
| T14 | M2 | TODO | Privacy hosted | T05/T11; T03 | Export sendiri, hak data/closure dan kontak kasus aktif tanpa restore akun/riwayat. Integration/E2E/hosted. Resource staging sudah ada; grant `privacyRights`/`privacyProof` staging diberikan Owner 30 Okt (Q3), dicatat di `ACTIVATION_GRANTS`. |
| T15 | M3 | DONE | Draft produk dari Dashboard | T02 | Owner/Admin membuat draft; kategori dapat dipilih tanpa UUID manual; draft tidak tampil publik. Unit, integration, authenticated E2E lokal lulus. |
| T16 | M3 | DONE | Varian dari Dashboard | T15 | SKU unik, harga/berat/dimensi valid, stok awal mengikuti inventory/ledger. Unit, integration, authenticated E2E lokal lulus. |
| T17 | M3 | DONE | Draft portfolio dari Dashboard | T02 | Draft baru tersedia; bukti dan data publikasi diperiksa sebelum publish. Unit, integration, authenticated E2E lokal lulus. |
| T18 | M3 | DONE | Upload media publik Admin | T03 | Signed PUT membatasi ukuran deklarasi; gambar diverifikasi server; upload tertolak dibersihkan dari quarantine; key/storage publik terpisah dari file Customer. Boundary dan storage fixture integration lokal lulus; provider hosted menunggu T03. |
| T19 | M3 | IN_PROGRESS | Editor media dan publikasi | T15–T18 | Upload/pilih, urutan/alt, ownership benar, renderer mendukung media baru. Unit/integration lokal lulus; browser upload/render media dengan storage hosted belum dibuktikan. |
| T20 | M3 | DONE | Hero mengikuti published state | T17 | Unpublish/missing/card-only tidak menaut ke detail invalid. Regression unit lulus. |
| T21 | M4 | DONE | Pengajuan kasus refund | T02; kontrak aktif | Kasus/alokasi persisten, nominal Decimal server dan ownership/closure diuji integration lokal; UI/API dan native form tersedia. Provider/hasil dana tetap T23/T25. |
| T22 | M4 | DONE | Persetujuan refund Owner | T21 | Owner aktif saja; alasan/retur/audit, version/snapshot immutable, overlap dan approval/receipt ulang diuji integration lokal. Persetujuan belum mengeksekusi uang. |
| T23 | M4 | BLOCKED_EXTERNAL | Submission refund | T22; merchant | Key/attempt/clock durable, gate merchant/window/retry dan manual Owner termasuk revoke diuji lokal 21 Oktober. Bukti metode/channel/saldo/window sandbox serta jalur manual hosted belum tersedia. Grant `refund` staging diberikan Owner 30 Okt (Q2); menunggu cek fitur dashboard Midtrans sandbox (Q1). |
| T24 | M4 | BLOCKED_EXTERNAL | Reconciliation pembayaran | T03; guard refund T21/T22; T42 | Get Status/receipt/lease canonical, late/unknown/refund hold dan balapan webhook diuji fixture lokal. Hosted 29 Okt: Get Status sampai ke Midtrans sandbox (404 menjadi unknown). Batas 7 hari B5 ter-deploy 30 Okt (#89); pengecualian teramati paling cepat 5 Nov. Sisa: jalur `found` saat BUY #2 dan scheduler production; jadwal Q14 sudah ada di kode (T42), pemasangan timer dan bukti menunggu T41. |
| T25 | M4 | BLOCKED_EXTERNAL | Reconciliation refund | T23 | Receipt bank/manual immutable, finality seluruh alokasi, hold partial/external dan GET-only lease diuji lokal 21 Oktober. Hasil bank sandbox dan role/resource/cadence hosted belum terbukti; exception tetap ditahan sampai resolusi berbukti. Grant `refund` staging ada (Q2); menunggu T23. |
| T26 | M4 | DONE | Email order received | T06; rantai T24 | Pesan persisten/dedup; email gagal tidak membatalkan order. Integration lokal lulus; inbox/hosted tetap T03/T33–T34. |
| T27 | M4 | DONE | Email payment confirmed | T06/T24 | Hanya settlement otoritatif; webhook duplikat tidak menduplikasi pesan. Integration lokal lulus; provider/hosted terpisah. |
| T28 | M4 | DONE | Email quote available | T06; rantai T26 | Quote/version/access benar; quote superseded/invalid tidak dikirim sebagai aktif. Integration lokal lulus. |
| T29 | M4 | DONE | Email order shipped | T06; rantai T26 | Status sah; isi berizin; tanpa private URL permanen. Integration lokal lulus, tanpa backfill tanggal historis. |
| T30 | M4 | DONE | Notifikasi Admin persisten | T06/T26–T29 | Failure terlihat; request/order tetap tersimpan; tanpa WhatsApp otomatis. Integration dan browser lokal lulus; visual Owner/perangkat/AT belum diterima. |
| T31 | M4 | IN_PROGRESS | Dataset dan tarif launch | T15–T19; Owner | SKU/stok fisik/media/berat/dimensi/rule disetujui untuk target; seed lokal bukan aktivasi launch. Review/import verification. Shop: 8 produk, 34 varian berdimensi paket disetujui Owner dan diimpor ke staging (log 29 Okt). Pricing rule `CUSTOM_PRINT_V1` v1 `PER_UNIT` aktif di staging sejak 30 Okt (log "Aktivasi pricing MAKE"). Sisa: aktivasi production pada gate rilis terpisah. |
| T32 | M5 | DONE | E2E Admin di CI | T02 | Quality pada `4eb8471` sukses, termasuk seluruh 24 journey Owner/Admin/anonim. Regresi landing MFA 6s mencakup respons TOTP 200, navigasi, status ready dan guard 401; sumber auth tidak diubah. [Bukti CI](https://github.com/batakers/Niuva-2026/actions/runs/39155145353). |
| T33 | M5 | BLOCKED_EXTERNAL | Dua BUY staging | T03, akun staging, provider sandbox, T31 (Owner 28 Okt; T14/T19 diuji terpisah) | Dua variasi transaksi sukses; order/stock/payment/email/status konsisten. Hosted records. |
| T34 | M5 | BLOCKED_EXTERNAL | Satu MAKE staging | T03, akun staging, provider sandbox, T31 (Owner 28 Okt; T14/T19 diuji terpisah) | Model→review→estimasi→quote→bayar→produksi/QC→ongkir final→kirim pada request/order benar. Hosted records/operator. |
| T35 | M5 | BLOCKED_EXTERNAL | Failure/refund staging | T21–T25 | Duplicate/nominal salah/late/timeout/full refund/manual exception benar dan teraudit. Sandbox. Owner Q1: QRIS + GoPay, satu refund otomatis lewat Midtrans dan satu manual. |
| T36 | M5 | BLOCKED_INPUT | UAT operasi Admin | T15–T20/T32 | Owner/Admin menambah konten, stock, quote, fulfillment dan keuangan dasar tanpa database/source. UAT record Owner masih diperlukan. |
| T37 | M5 | BLOCKED_EXTERNAL | UI/perangkat/AT | T33–T36 | Route aktual: viewport, keyboard/fokus/error, zoom/reduced motion; fisik/AT dibuktikan terpisah. |
| T38 | M5 | BLOCKED_INPUT | Backup/restore | T07–T09/T14/T25; T41; akun Biznet Gio (Owner) | Sasaran Owner E11: RPO 24 jam, RTO 1 hari kerja. Q5–Q7: `pg_dump` harian terenkripsi dari PostgreSQL di VPS ke S3 region Jakarta, satu tempat dengan salinan arsip pembukuan; penyedia Biznet Gio NEO Object Storage (Q12); akun dan bucket belum dibuat. Drill harus mencegah restore akun tertutup atau replay refund/email. Recovery evidence. |
| T39 | M5 | TODO | SOP dan handover operasi | T33–T38; Owner | Coverage/kalender/eskalasi/alarm/kontak pasca-closure/petugas dibuktikan lewat simulasi. Input Owner E12 (29 Okt) tersedia; menunggu dependensi. |
| T40 | M6 | BLOCKED_EXTERNAL | Rilis terkendali | Seluruh wajib; T41–T44; instruksi rilis | Kandidat sama dengan bukti; gate ditutup; ledger readiness diperbarui (D12); activation/smoke/monitoring/rollback di VPS (T41) sesuai izin eksplisit; DNS `niuva.id` diarahkan; Google Search Console dan Bing Webmaster terverifikasi dan sitemap terkirim. |
| T41 | M6 | BLOCKED_INPUT | Infrastruktur production VPS Jakarta | Q5; pembelian VPS (Owner); Q11 | Helipod VPS B Jakarta aktif dengan auto-renew; SSH khusus key; firewall hanya 80/443/SSH; PostgreSQL hanya localhost; Caddy HTTPS `niuva.id` dan `www`; env production di server dengan izin ketat, tidak di Git; unattended-upgrades; monitor uptime eksternal; jalur deploy dan rollback terdokumentasi; smoke pra-DNS di VPS. Production tetap tertutup sampai T40. Rencana di log "Checklist keamanan dan SEO untuk VPS". |
| T42 | M6 | TODO | Adaptasi runtime untuk VPS | T10; Q11 untuk bagian IP | IP klien terpercaya di VPS menggantikan header Netlify di `src/lib/security/client-ip.ts` (rate limit dan Better Auth), dengan tes pemalsuan header. Scheduler job production lewat timer di VPS memakai runner `src/modules/jobs/`, menutup sisa scheduler T07/T24. Unit/backend/integration lokal, lalu bukti di VPS. 30 Okt: jadwal Q14 dan route tick `/api/internal/jobs/schedule` selesai dengan tes lokal (log "T42 scheduler"); timer dan bukti VPS menunggu T41, bagian IP menunggu Q11. |
| T43 | M2 | BLOCKED_INPUT | Login Google hosted (D04) | T12; grant Q4 | Owner menambah redirect URI staging di Google Cloud; env OAuth staging diisi atas instruksi Owner; consent dan login Google berhasil di staging dengan akun uji. Production ikut T40. |
| T44 | M6 | BLOCKED_INPUT | Policy privacy untuk penyedia production | T11; Q5; Q12–Q13; Owner | Daftar penyedia dan lokasi pemrosesan di `src/content/customer-policy/privacy-v1.0.md` (Netlify Ohio, Neon Singapura) diganti versi baru yang mencantumkan Helipod VPS Jakarta, penyedia backup dan storage file production; Owner menyetujui teks; versi baru terbit sebelum production menerima data Customer (T40). Ditemukan saat perbandingan S3, 30 Okt. |

## Backlog setelah v1

Bukan gate v1: menurut `ROADMAP.md`, perubahan di luar DoD masuk versi
berikutnya. Dikerjakan hanya atas permintaan Owner.

- Data terstruktur JSON-LD untuk Organization/LocalBusiness dan Product.
- Gambar Open Graph saat link dibagikan; menunggu aset yang disetujui Owner.
- Google Business Profile dengan data usaha yang benar (langkah Owner).

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

### T03 / T33–T34 — verifikasi patch Rates LOCAL ONLY, 24–25 Oktober 2026

- Preflight sesi AO `niuva-2026-3`: worktree baru
  `C:/Users/FAIZ/.ao/data/worktrees/niuva-2026/niuva-2026-3`, branch
  `ao/shipping-hardening/root` bersih, tanpa commit sesi. HEAD dan `main` live
  melalui `git ls-remote` cocok pada
  `13bdeb954de819b3959ee41e6cb36a1860687aeb`; tidak ada fetch/repoint ref lama.
- Adapter/tes persis dari diagnostics yang disetujui, tanpa penyesuaian isi:
  SHA-256 source `0c1ce0dece3800972c9e419472d43ac3a4cfacac6a3481be110a0c54ff485e22`;
  tes `e7ad8793b0754979f7f9f36974a30f007701bf92354147ec96ec4d718313f68c`.
  Source sandbox hanya dipakai sementara pada worktree AO untuk reproduksi;
  environment, data, helper dan artefak worktree lama tidak disalin.
- RED: `corepack pnpm test:backend tests/backend/biteship-retail-rates.test.ts`
  dengan source sandbox exit 1: 14 kasus aktual, 12 lulus/2 gagal
  (cancellation oversized macet; body error melewati sisa timeout).
  Source diagnostics menghasilkan GREEN pada perintah sama, exit 0, 14/14;
  seluruh tes sandbox tetap tercakup. Kegagalan tooling awal bukan bukti RED.
- Error diagnosis tetap 4 KiB/kode numerik delapan digit, safe log status/kode,
  publik 503 `SHIPPING_PROVIDER_UNAVAILABLE`. Timer mengikuti pembacaan error
  dan cancellation tidak ditunggu. Payload/harga, capability/non-production
  guards, auth dan checkout tidak diperluas. `40001002` adalah fixture,
  bukan bukti penyebab HTTP 400 provider historis.
- Gate aktual: `corepack pnpm lint` exit 0 (0 error/4 warning existing pada
  `src/modules/jobs/handlers.ts`); `corepack pnpm typecheck` exit 0;
  `corepack pnpm test:backend --maxWorkers=1` exit 0, 107 file/812 tes;
  `corepack pnpm test --maxWorkers=1` exit 0, 127 file/1.469 tes.
  Prehook Prisma dan coverage tetap aktif. `corepack pnpm db:validate` exit 0
  memakai URL sintetis process-only tanpa koneksi database.
- `corepack pnpm build` default Turbopack exit 0, 93/93 halaman. Font asli
  melalui allowlist loopback foreground `fonts.googleapis.com` dan
  `fonts.gstatic.com`, TLS aktif; listener ditutup saat build selesai.
  Tidak memakai font/CSS tiruan, cache lama atau perubahan config/runtime.
- Build tambahan `corepack pnpm build --webpack` exit 1 setelah compile:
  TS2344 pada generated types untuk
  `src/app/admin/sign-in/[[...sign-in]]/page.tsx` (props opsional) dan
  `src/app/api/analytics/page-view/route.ts` (export `handlePageView`).
  Kedua route tidak diubah; baseline Webpack tidak dijalankan.
  Hasil tambahan ini tidak menggantikan hasil build default.
- Dependency frozen/offline dengan package copy: 698 paket/0 unduhan paket,
  tanpa writable link worktree lama. Engine Prisma 7.10.0
  `0edf323efd1d98336f3f0a68684b56f689b900d3` tidak ada di cache awal;
  coordinator mengizinkan artifact tooling existing dari `binaries.prisma.sh`,
  dengan TLS/checksum tetap aktif. `corepack pnpm db:generate` exit 0.
- Bukti lokal/mock dan build inputs yang diizinkan; tidak ada database/
  provider bisnis nyata atau request Biteship/Midtrans/Maps/email/AWS/S3.
  Integration DB, browser/E2E, staging dan production tidak dijalankan.
  T03/T33–T34 tetap BLOCKED_EXTERNAL, T11 DONE dan T12/T13 TODO; seluruh tabel
  status main dipertahankan. Blok diagnosis 23 Oktober tidak diduplikasi.
- Hanya empat file yang disetujui berubah, belum commit/push/PR; tidak ada
  merge, deployment atau aktivasi provider. Seluruh DoD/gerbang hosted tetap
  memerlukan bukti dan izin masing-masing.

### T11 — pengesahan selesai; kesiapan rilis terpisah, 24 Oktober 2026

- Seluruh bagian policy disatukan dalam [paket review dan input tersisa](docs/legal/customer-public-input-evidence.md#paket-review-menyeluruh-t11--24-oktober-2026).
- Status `BLOCKED_INPUT` pada catatan T11 terdahulu di bawah adalah snapshot
  sebelum pengesahan Owner menyeluruh; status aktif mengikuti tabel dan catatan
  final ini.
- Syarat v6 dan Privasi v7 (24 Oktober) adalah draf review; rekomendasi isinya
  dan identifier resmi v1.0 disetujui Owner. Preview internal mengikuti
  identifier draf masing-masing; persetujuan ini belum mengaktifkan consent.
  Tanggal berlaku ditetapkan pada publikasi aktual, bukan pada tanggal persetujuan.
  Rekomendasi melengkapi cakupan katalog/quote, masa berlaku dan batas pembayaran
  existing serta metode sesuai checkout. Privasi/SOP memperjelas dasar per
  tujuan, penanganan hak dan inventaris minimum arsip transaksi tanpa membuat
  retensi baru di runtime. Matriks/kontrak memperbaiki klaim refund/outbox/job
  yang tertinggal dari baseline serta target lama 1/2/1 menjadi 1/1/1.
- SKU/stok/tarif rinci tetap T31; simulasi/coverage tetap T39; consent/hosted,
  storage, recovery dan rilis tetap pada task existing masing-masing. Tidak ada
  fakta provider yang menjadi prasyarat pengesahan T11 atau development lokal.
- Owner mengklarifikasi belum ada unit, petugas, atau lokasi arsip khusus.
  Paket tidak mensyaratkan fasilitas, tahun buku atau petugas baru; dokumen
  wajib pembukuan tetap disimpan 10 tahun di Indonesia pada tempat kedudukan
  badan. PP 80/2019 juga menetapkan retensi minimum data PMSE terkait transaksi
  keuangan 10 tahun dan data PMSE non-keuangan 5 tahun; kategori dan penempatan
  yang benar-benar berlaku dicatat pada PUB-RECORDS, bukan digeneralisasi ke
  semua profil/chat/token. Owner menyetujui rekomendasi dan identifier resmi
  v1.0 pada 24 Oktober; T11 `DONE`.
- Lokasi di luar Indonesia tidak otomatis melarang PSE privat; akses pengawasan
  dan perlindungan transfer lintas negara tetap dipenuhi. Fakta penerima,
  region, dan safeguard dicatat sebelum jenis data terkait diproses; notice
  mencerminkan alur aktual sebelum pendaftaran/rilis pada PUB-PROVIDER/PUB-POLICY.
  PUB-RECORDS juga memisahkan dokumen pembukuan
  tertentu yang wajib disimpan di Indonesia. Ini readiness rilis, bukan blocker
  T11/AWS untuk development. S3/AWS tetap ditunda; tidak ada publikasi,
  aktivasi consent atau deployment.
- Verifikasi koreksi ini: `corepack pnpm test:backend
  tests/backend/customer-privacy-pages.test.ts
  tests/backend/cad-upload-confirmation.test.ts
  tests/backend/file-retention-core.test.ts
  tests/backend/phase2-quote-order.test.ts` **4 file / 28 test lulus**;
  206 target tautan lokal pada 10 dokumen Markdown berubah terverifikasi ada;
  40 task tetap tanpa penambahan task (T11 DONE, T12/T13 TODO, T14 external);
  dan `git diff --check` lulus. Lint/typecheck sebelumnya lulus pada baseline
  runtime yang sama (0 error, 4 warning existing); tidak diulang karena koreksi
  ini hanya mengubah dokumentasi.
  Build, full E2E, full database integration dan provider tidak dijalankan.
  Tidak ada perubahan runtime/schema/env/workflow atau aktivasi eksternal.

### T11 — berkas dan hak konten Custom Print, 24 Oktober 2026

- Atas instruksi Owner, Syarat bagian 7 dan SOP layanan merinci hak atas berkas,
  izin terbatas untuk layanan serta klarifikasi keberatan tanpa membuka berkas
  privat atau membuat pembayaran hangus otomatis. Lihat
  [catatan input T11](docs/legal/customer-public-input-evidence.md#penyelarasan-berkas-dan-hak-konten--24-oktober-2026).
- Draft dicocokkan dengan format/ukuran unggahan, batas inspeksi CAD, akses
  operator, quote, refund dan retensi 14/60/90 existing serta sumber resmi hak
  cipta/desain industri. Cakupan produk/penggunaan khusus dan jasa desain belum
  diputuskan; tidak menambah kapabilitas, task atau identifier policy resmi.
- T11 tetap `BLOCKED_INPUT`; pengesahan isi/versi/tanggal dan input lain masih
  terbuka, dengan kesiapan operasional T39 serta akses AWS/S3 tetap terpisah.
- Verifikasi: `corepack pnpm test:backend
  tests/backend/customer-privacy-pages.test.ts
  tests/backend/cad-upload-confirmation.test.ts
  tests/backend/file-retention-core.test.ts` **3 file / 19 test lulus**;
  60 tautan/anchor lokal pada empat dokumen valid, 40 baris task/dependensi
  tetap sama, dan `git diff --check` lulus. Runtime tidak berubah; build, E2E,
  database integration dan provider tidak dijalankan untuk perubahan dokumen.

### T11 — penyelarasan klausul sengketa, 24 Oktober 2026

- Atas instruksi Owner, klausul kontak Niuva dan jalur sengketa konsumen
  diselaraskan pada Syarat bagian 6, SOP layanan dan
  [catatan input T11](docs/legal/customer-public-input-evidence.md#penyelarasan-klausul-sengketa--24-oktober-2026).
- Rujukan UU Perlindungan Konsumen Pasal 45/49/52 diperiksa; tidak menetapkan
  forum eksklusif atau kewajiban menuntaskan pengaduan internal. SOP menjaga
  nomor kasus, tenggat, bukti penyelesaian nyata, privasi dan kewenangan refund.
- T11 tetap `BLOCKED_INPUT` sampai pengesahan isi/versi/tanggal dan input lain
  lengkap. Kontak lembaga yang relevan dan kesiapan operasional T39 tetap
  memerlukan bukti. Tidak menambah task/fitur/status kasus atau mengubah runtime.
- Verifikasi: `corepack pnpm test:backend
  tests/backend/customer-privacy-pages.test.ts` **1 file / 3 test lulus**;
  55 tautan/anchor lokal pada empat dokumen valid, 40 baris task/dependensi
  tetap sama, dan `git diff --check` lulus. Build, E2E, database integration
  dan provider tidak dijalankan untuk perubahan dokumen ini.

### T11 — konfirmasi bukan PKP, 24 Oktober 2026

- Owner menjawab **“Bukan PKP, sudah diperiksa”** untuk status badan Niuva.
  [Input status PKP](docs/legal/customer-public-input-evidence.md#konfirmasi-status-bukan-pkp--24-oktober-2026)
  kini terkonfirmasi berdasarkan pemeriksaan Owner; tidak meminta credential,
  NPWP atau salinan dokumen pajak dan tidak mengakses akun DJP.
- PRD dan draf Syarat bagian 2 memakai rumusan tanpa pemungutan PPN penjualan
  oleh Niuva; harga mengikuti katalog/quote, ongkir terpisah, dan dokumen
  transaksi bukan Faktur Pajak. Keputusan biaya sebelumnya tetap berlaku.
- Catatan penyiapan dua kandidat di bawah bersifat kronologis; bukan blocker
  status PKP yang masih berjalan. T11 tetap `BLOCKED_INPUT` untuk pengesahan
  keseluruhan isi/versi/tanggal dan input lain, tanpa task baru atau perubahan
  perhitungan harga/pajak maupun resource eksternal.
- Verifikasi: `corepack pnpm test:backend
  tests/backend/customer-privacy-pages.test.ts` **1 file / 3 test lulus**;
  67 tautan/anchor lokal valid, 40 baris task/dependensi tetap sama, dan
  `git diff --check` lulus. Draf Syarat tidak lagi menyatakan status pajak
  belum dikonfirmasi. Build, E2E, database integration dan provider tidak
  dijalankan untuk perubahan dokumen ini.

### T11 — penyiapan klausul pajak, 24 Oktober 2026

- Instruksi Owner untuk melanjutkan bagian pajak ditindaklanjuti dengan
  [panduan pemeriksaan status dan dua kandidat klausul](docs/legal/customer-public-input-evidence.md#penyiapan-klausul-pajak--24-oktober-2026).
  Sumber DJP/Coretax diperiksa; hasil status badan Niuva tetap menunggu input.
- Kandidat bukan PKP dan PKP disiapkan untuk review. Tidak menetapkan status,
  tarif, harga termasuk PPN atau tanggal mulai kewajiban sebagai fakta Owner.
- Total checkout retail dan batas dokumen invoice dicocokkan dengan source;
  tidak ada perubahan kalkulasi harga, source, konfigurasi atau akun DJP.
  Input harga launch tetap T31 existing, tanpa task baru.
- T11 tetap `BLOCKED_INPUT`; status PKP tidak dapat ditentukan dari ketiadaan
  dokumen dalam repo, omzet yang belum dikonfirmasi atau status NPWP aktif.

### T11 — persetujuan biaya Customer, 24 Oktober 2026

- Owner menyetujui tanpa biaya admin/layanan tambahan dari Niuva, biaya gateway
  merchant ditanggung Niuva, ongkir pengiriman pesanan dibayar Customer dan
  pekerjaan tambahan Custom Print dirinci dalam quote sebelum disetujui.
- Keputusan diselaraskan pada PRD, draf Syarat bagian 2 dan
  [input/bukti T11](docs/legal/customer-public-input-evidence.md#persetujuan-biaya-customer--24-oktober-2026).
  Kewajiban biaya retur/pengganti Niuva mengikuti ketentuan yang sudah ada.
- Poin biaya tambahan kini disetujui; catatan review awal di bawah bersifat
  kronologis. T11 tetap `BLOCKED_INPUT` untuk isi lengkap, versi/tanggal resmi
  dan input lain yang masih terbuka. Tidak mengubah status/dependensi task,
  perhitungan harga/pajak, source pembayaran, atau resource eksternal.
- Verifikasi: `corepack pnpm test:backend
  tests/backend/customer-privacy-pages.test.ts` **1 file / 3 test lulus**;
  58 tautan/anchor lokal pada empat dokumen valid, 40 baris task sama dengan
  ledger sebelum pembahasan, dan `git diff --check` lulus. Build, E2E,
  database integration dan provider tidak dijalankan untuk perubahan dokumen.

### T11 — review usulan perdagangan, 24 Oktober 2026

- Tujuh saran Owner dicocokkan dengan kontrak dan source lokal pada
  `codex/v1-owner-policy`; hasil dan kandidat klausul berada di
  [catatan input T11](docs/legal/customer-public-input-evidence.md#tinjauan-usulan-perdagangan--24-oktober-2026).
- Status PKP/perlakuan pajak, katalog T31 dan metode pembayaran produksi belum
  dikonfirmasi. Saran tidak dipromosikan menjadi fakta atau pengesahan policy.
- Quote 7 hari kalender sejak dikirim sudah merupakan keputusan Phase 2 dan
  diterapkan di runtime; pembayaran Custom Print memiliki tenggat 24 jam
  tersendiri. Tidak mengubah durasi atau menambah task implementasi.
- Usulan tanpa biaya admin/layanan dipisahkan dari ongkir dan rincian pekerjaan
  Custom Print dalam quote. Kandidat sengketa mempertahankan hak hukum Customer;
  keputusan biaya dan pengesahan isi lengkap masih terbuka.
- T11 tetap `BLOCKED_INPUT`. Perubahan hanya catatan input/ledger; tidak mengubah
  policy runtime, pajak, pembayaran, atau status/dependensi 40 task existing.
- Verifikasi lokal: `corepack pnpm test:backend
  tests/backend/customer-privacy-pages.test.ts
  tests/backend/phase2-closure-policy.test.ts` **2 file / 8 test lulus**;
  22 tautan/anchor lokal pada dua dokumen valid; `git diff --check` lulus.
  Enam file policy/test yang sudah berubah sebelumnya tetap identik dengan
  snapshot sebelum review ini. Build, E2E, database integration dan provider
  tidak dijalankan pada perubahan catatan ini; tidak ada publikasi/deployment.

### T11 — pembahasan policy Owner, 23 Oktober 2026

- Owner menginstruksikan pembahasan T11 sambil seluruh akses AWS/S3 ditunda.
  Worktree `codex/v1-owner-policy` dibuat dari baseline lokal terverifikasi
  `5ebfdff`; ledger lokal terbaru termasuk bukti diagnosis shipping dibawa
  dari worktree shipping tanpa menyalin patch aplikasinya. Tidak membuat
  task baru atau mengubah 40 baris task/status/dependensi.
- Owner menetapkan wilayah awal Shop/MAKE **Indonesia**, hanya alamat yang
  dapat dilayani dengan ongkir tervalidasi. Shop diterima setelah pembayaran
  terverifikasi server dan konfirmasi berdasarkan hasil tersebut diterbitkan;
  order pending/redirect/notifikasi order dibuat bukan bukti pembayaran.
  Quote MAKE tetap mengikuti kontrak sebelumnya.
- [Syarat v4](docs/legal/customer-terms-draft.md) dan
  [Privasi v4](docs/legal/customer-privacy-draft.md) tetap draf, tanpa tanggal
  berlaku atau consent resmi. Klaim lama refund belum diimplementasikan
  direkonsiliasi dengan T21–T25 lokal; provider/hasil dana tidak diklaim lulus.
  Register SOP privasi v2 mengikuti S3-compatible, provider final OPEN,
  tanpa mengubah retensi 14/60/90, menyalin credential atau memigrasi objek.
- [Bahan pembahasan](docs/legal/customer-public-input-evidence.md#review-owner-t11-23-oktober-2026)
  mencatat jawaban Owner tentang formalitas sebagai pertanyaan, bukan
  approval SLA 1/2/1, jam layanan atau pengganti. Usulan memakai kontak/Rheza
  yang ada, eskalasi Owner dan detail retur per kasus belum disahkan;
  detail operasional tetap dalam T39 existing. Review UU PDP/PP 80/KUP
  memakai sumber resmi, tanpa menyatakan kepatuhan hosted sudah terpenuhi.
- Verifikasi: backend preview Owner/penolakan Admin dan boundary consent
  internal **2 file / 9 tes lulus**; halaman auth **1 file / 14 tes lulus**;
  **40 link/anchor dokumen resolve**; `pnpm lint` lulus dengan 0 error dan
  4 warning existing pada handler job; `git diff --check` lulus. Hanya expectation identifier draf pada
  tes existing yang diperbarui; source aplikasi dan resolver legal publik
  tidak berubah. Build, DB integration, browser E2E dan provider/hosted tidak
  dijalankan untuk revisi dokumen ini; hasil render server bukan bukti browser.
- T11 tetap `BLOCKED_INPUT`: pengesahan isi lengkap, versi resmi/tanggal
  berlaku dan input yang dirinci dalam bahan pembahasan belum tersedia.
  T12–T14 tidak diaktifkan. Worktree shipping/AWS dan perubahan lama
  dipertahankan; tidak ada commit, push, PR, publikasi atau resource eksternal.

#### Keputusan lanjutan T11 — target 1/1/1, 23 Oktober 2026

- Owner menetapkan tanggapan awal, pemeriksaan dan mulai refund masing-masing
  maksimal **1 hari kerja**, total maksimal **3 hari kerja penanganan Niuva**.
  Owner juga memilih waktu menunggu bukti Customer/perjalanan retur di luar
  hitungan; waktu dana masuk bank/provider tetap terpisah. Ini menggantikan
  target 1/2/1 yang masih terbuka pada awal pembahasan di atas.
- Keputusan diselaraskan ke PRD, Syarat draf v4, SOP layanan/refund v2 dan
  catatan input. Pergantian status/petugas tidak mereset tenggat; penundaan
  internal termasuk approval Owner tetap dihitung. Kalender/jam, bukti
  monitoring/operasi hosted dan pengesahan seluruh policy masih terbuka.
  Tidak membuat default kalender atau mengubah kode refund/auth/jobs.
- Verifikasi ulang `pnpm test:backend tests/backend/customer-privacy-pages.test.ts`:
  **3 tes lulus**; **55 link/anchor lokal** pada enam dokumen resolve;
  `git diff --check` lulus. 40 baris task/status/dependensi tetap sama.
  Build/E2E/provider tidak diulang untuk perubahan dokumentasi ini.
  T11 tetap `BLOCKED_INPUT`; tidak ada commit, publikasi atau aktivasi eksternal.

#### Keputusan lanjutan T11 — laporan dan bukti awal, 23 Oktober 2026

- Owner mengoreksi alur: laporan awal sudah disertai bukti yang tersedia,
  bukan menambahkan masa tunggu bukti dalam target penanganan. Setelah
  review ulang sumber primer PP 80/2019 Pasal 69, Owner memilih **minimal
  2 hari kerja sejak barang diterima** sebagai ketentuan utama pengajuan
  pada kondisi yang diatur, menggantikan anjuran 1×24 jam. Hak atas cacat
  tersembunyi dan bukti selain video unboxing tetap dijaga.
- PRD, Syarat v4, SOP layanan/refund v2 dan catatan input diselaraskan.
  Target 1/1/1 dan total 3 hari kerja tetap sejak laporan diterima; hanya
  perjalanan retur yang diperlukan dikecualikan. Koreksi ini menggantikan
  pengecualian menunggu bukti pada keputusan sebelumnya. Bukti tambahan
  tidak menghentikan/mereset tenggat; approval dan kontrol keamanan tetap.
- Schema pengajuan refund belum memiliki field lampiran foto/video.
  Bukti pada prosedur ini disampaikan melalui kanal layanan yang sudah
  dikonfirmasi; tidak mengklaim uploader/validasi lampiran otomatis atau
  retensi komunikasi eksternal sudah tersedia, dan tidak membuat fitur/task baru.
- Verifikasi ulang preview Owner **3 tes lulus**; **55 link/anchor lokal**
  resolve; `git diff --check` lulus. 40 baris task/status/dependensi dan
  source aplikasi/schema/dependency tetap. Build/E2E/provider tidak diulang
  untuk perubahan dokumen; T11 tetap `BLOCKED_INPUT` menunggu pengesahan lengkap.

### T03 → T08 / T18–T19 — migrasi S3-compatible, 22–23 Oktober 2026

- Instruksi Owner mengizinkan migrasi provider-neutral dan rekonsiliasi lokal,
  kemudian pengiriman melalui PR/CI. Provider final, resource hosted, cutover,
  deployment dan aktivasi production tetap menunggu keputusan/izin terpisah.
  Tidak ada ID task baru; 40 task existing dan status gate eksternal dipertahankan.
- Kandidat memakai `main` `48eacd4`, termasuk T08 PR #58, refund, reconciliation
  dan notifikasi existing. Patch lokal awal dari `49c0a73` direkonsiliasi pada
  worktree terpisah; checkout asal dan dua dokumen untracked lainnya dipertahankan.
  Catatan lama tentang T08 yang belum ada hanya berlaku pada branch awal.
- Kontrak ada di [object storage](docs/backend/object-storage-contract.md):
  endpoint/region/addressing dan credential S3 eksplisit, satu namespace lengkap,
  CSP sesuai origin signed PUT, private/public terpisah, serta fallback R2 utuh.
  AWS SDK existing dipakai tanpa dependency/schema/migration baru.
- Upload/download Customer, bukti privat keuangan dan quarantine/publish media
  memakai adapter yang sama tanpa mengubah service/repository, ownership,
  content/size/SHA-256, intent/confirm, public renderer atau state bisnis.
- Handler T08 memakai factory S3 dan mempertahankan AbortSignal/deadline dua detik,
  DELETE_PENDING, retry key yang sama, hold dan final lease. Tes regresi sempat
  gagal karena adapter mengabaikan abort, lalu lulus setelah signal diteruskan
  ke SDK. Integration nyata pada DB/HTTP loopback membuktikan klaim pending
  tersimpan sebelum I/O dan tombstone hanya sesudah konfirmasi delete.
- Verifikasi lokal: lint 0 error/4 warning existing; typecheck lulus; unit
  127 file/1.469 tes; backend 107 file/803 tes; integration 54 file/474 tes;
  browser umum 112 lulus/5 skip existing/0 gagal; Owner/Admin 31 lulus/0 gagal;
  Prisma validate lulus. Production build lokal terakhir pada 23 Oktober
  menghasilkan 93/93 halaman, memakai database test terisolasi dan provider
  tetap off/mock. Tidak ada assertion, timeout, atau skip baru untuk membuat
  gate lulus.
- Database baru terisolasi di loopback menerapkan 38 migration existing tanpa
  reset atau perubahan migration. Runner browser sementara hanya mengatur cwd
  dan URL database uji; konfigurasi/asersi suite existing tetap dipakai.
- T03/T08 tetap BLOCKED_EXTERNAL; T19 tetap IN_PROGRESS. TLS/at-rest, CORS,
  credential/grant/binding, semantik DELETE/versioning/object lock, scheduler,
  upload/render hosted dan smoke BUY/MAKE belum dibuktikan. Policy provider T11,
  inventaris/copy/recovery T38 dan rilis T40 tetap mengikuti dependensi/izin existing.
  Tidak ada objek sumber atau data production yang dipindahkan/dihapus.

### T03 / T33–T34 — worktree dan diagnosis Rates lokal, 23 Oktober 2026

- Owner menunda seluruh akses AWS/S3 sampai verifikasi akun selesai, lalu
  mengizinkan kelanjutan lokal berdasarkan backlog existing. Tidak ada ID task
  baru, deployment, aktivasi, resource atau request provider pada pekerjaan ini.
- Inventaris mencakup sembilan worktree Git Niuva yang terdaftar; tidak ditemukan
  checkout Git Niuva tambahan di direktori managed worktree. Ref lokal `main`
  masih `54a97bb`; ref lokal `origin/main` sudah `5ebfdff`. Tree `5ebfdff`
  identik dengan kandidat S3 `881a6fe`. Tidak ada fetch atau verifikasi remote
  baru. `TASKS.md` pada baseline ini menjadi ledger; salinan lama dan
  `TASKS (1).md` tidak dipakai untuk mengulang task yang sudah dikirim.

| Worktree saat pemeriksaan | HEAD | Kondisi dan kelanjutan |
| --- | --- | --- |
| Checkout primary / `codex/v1-business-notifications` | `49c0a73` | 22 tracked berubah + 9 untracked: patch awal S3 dan dokumen existing. Dipertahankan; bukan baseline untuk mengulang notifikasi/storage yang sudah dikirim. |
| `batch-2-durable-outbox` | `20cc5e3` | Tree sama dengan merge #56 `7b3a09d`; dua artefak `.superpowers` untracked. Tidak ada kode aktif yang perlu diimplementasikan ulang. |
| `midtrans-local-sandbox` | `48eacd4` detached | Lima tracked berubah + 218 untracked, termasuk 217 artefak build dan satu runbook. Patch diagnosis Biteship dua file belum ada di baseline; ledger/readiness dan seluruh artefak dipertahankan. |
| `s3-storage-reconcile` | `881a6fe` | Bersih; tree sama dengan #63 `5ebfdff`. Diparkir utuh selama verifikasi AWS. |
| `v1-pr59-recovery` | `85f63c5` | Bersih; tree sama dengan #59 `bcd04d9`. Gate refund provider tetap mengikuti T23/T25. |
| `v1-pr60-integration` | `5b98b2b` | Bersih; tree sama dengan #60 `d956c18`. Implementasi T24 tidak diulang. |
| `v1-pr61-integration` | `eb99f7a` | Bersih; tree sama dengan #61 `a183c81`. Implementasi T26–T30 tidak diulang. |
| `v1-refund-completion` | `032774b` | Bersih; tree sama dengan #62 `48eacd4`. Implementasi lokal T23/T25 sudah dikirim. |
| `v1-refund-execution` | `adc28f0` | 25 tracked berubah + 17 untracked: patch refund historis sebelum kandidat completion. Dipertahankan; tidak diterapkan ulang di atas hasil #62. |

- Tidak ada task TODO independen pada ledger terbaru. T10 dan T19 sudah
  mempunyai implementasi/bukti lokal; sisa AC memerlukan topologi atau storage
  hosted. Task terbuka lain memerlukan resource/provider atau input Owner.
  Bagian lokal yang dapat dituntaskan adalah patch diagnosis Rates existing
  untuk T03/T33–T34, tanpa menutup gate transaksi atau hosted.
- Worktree baru `v1-shipping-diagnostics`, branch
  `codex/v1-shipping-diagnostics`, dibuat dari SHA lokal `5ebfdff` yang bersih.
  Hanya `src/modules/shipping/biteship.ts` dan regression test-nya diambil dari
  sandbox; environment, credential, data, migration dan artefak lama tidak disalin.
- Diagnosis non-2xx membaca paling banyak 4 KiB, menerima hanya kode numerik
  delapan digit, dan mencatat status/kode aman melalui logger existing.
  Pesan/body/header provider tidak dicatat atau dikirim ke browser; respons
  publik tetap `SHIPPING_PROVIDER_UNAVAILABLE`/503. Kegagalan logger tidak
  mengubah respons. Penyebab HTTP 400 historis tidak disimpulkan dari fixture.
- Regresi body error yang macet direproduksi: respons belum selesai setelah
  deadline pada patch awal (RED). Pembacaan diagnosis sekarang mengikuti sisa
  timeout request; stream dibatalkan dan pembatalan diagnostic tidak menahan
  respons (GREEN). Default lima detik, guard testing key/production, payload
  Rates, normalisasi harga dan kontrak checkout dipertahankan.
- Verifikasi pada diff lokal: baseline terarah 5/5; regresi terarah sesudah
  perbaikan 8/8; lint 0 error/4 warning existing; backend 107 file/812 tes lulus,
  termasuk 14 kasus gateway Biteship; unit/component 127 file/1.469 tes lulus;
  strict typecheck dan Prisma validate lulus. Production build exit 0,
  93/93 halaman, memakai cache lokal baseline yang sama, proxy HTTP/HTTPS
  loopback dan tanpa respons font tiruan. Tidak ada credential/provider/DB
  nyata pada pengujian gateway. Browser/E2E dan integration DB tidak diulang
  untuk perubahan diagnosis adapter tanpa perubahan UI, route, schema atau DB.
- Pemeriksaan penutup membandingkan HEAD, branch, jumlah perubahan dan SHA-256
  gabungan path/isi seluruh perubahan tracked/untracked pada sembilan worktree
  awal: semuanya identik dengan sebelum pekerjaan. Worktree baru hanya memuat
  tiga file berubah (adapter, regression test, ledger); 40 baris task beserta
  status/dependensinya tetap sama. `git diff --check` lulus.
- T03/T33–T34 tetap BLOCKED_EXTERNAL; T10/T19 dan seluruh status gate existing
  dipertahankan. Penyelesaian patch lokal tidak membuktikan provider, hosted,
  perangkat/AT atau production. Belum ada commit, push atau PR.

### T23/T25 — submission dan hasil refund, 19 Oktober 2026

- Audit: main tetap `54a97bb`; PR #58–#61 draft/open. Worktree terpisah
  `C:\Users\FAIZ\.codex\worktrees\v1-refund-execution\NIUVA 2026`, branch
  `codex/v1-refund-execution`, berasal dari `adc28f0` (#60), dengan dependensi
  eksplisit pada kasus/approval T21/T22 dan status/hold T24. Kode notifikasi
  #61 tidak menjadi dependensi. Checkout primary #61 dibiarkan bersih.
- Sinkronisasi ledger lintas branch: T26–T30 telah dikirim pada
  [draft PR #61](https://github.com/batakers/Niuva-2026/pull/61), kode `ae36ad6`,
  checkpoint `2e6cc70`. DONE mengikuti AC teknis lokal; unit 127/1.466, backend
  100/736, integration 52/423, Admin Chromium 27/27, default 112 passed/5
  production-tier skipped, build 93/93, lint/type/schema lulus. Bukti/kode
  lengkap ada pada branch/PR itu, bukan pada baseline runtime worktree ini.
- Baseline worktree diverifikasi sebelum kode: install frozen lockfile tanpa
  upgrade/dependency baru; Prisma generate/validate dan typecheck; backend
  97/724 (empat worker, coverage aktif), kasus refund integration 18/18.
  Database baru `niuva_refund_execution_test_20261019` memakai 35 migration;
  cluster test primary diverifikasi, database lama tidak di-reset.
- Scope fixture mengikuti SOP: satu key per operasi, request pertama tidak
  direset, reattempt key yang sama maksimal tujuh hari, accepted belum hasil
  bank, unknown menahan fallback manual/key baru. Bukti manual memerlukan
  Owner, verifikasi tidak ada refund pending/berhasil dan penerima/bukti hasil.
  Readiness merchant/metode/channel/window/saldo/ETA/receiver tetap input
  eksternal PUB-REFUND-PROVIDER; tidak diisi dengan default atau aktivasi.

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

### T23 lalu T25 — kelanjutan dan integrasi aman, 2026-10-21

- Baseline kerja `origin/main`/HEAD
  `a183c81d96defd3f410987efe65be763a0de5b44`, terverifikasi mencakup squash
  PR #59 `bcd04d9`, #60 `d956c18` dan #61 `a183c81`. Ini baseline dependensi,
  bukan CI diff T23/T25 baru.
- Audit patch asal: worktree `v1-refund-execution`, branch
  `codex/v1-refund-execution`, HEAD `adc28f0`; 25 tracked modified dan 17 file
  baru, index kosong. Snapshot 42 path disimpan sebagai tree
  `cd9d6c41c5fd15f1d82a41e2124363634cc7c8c2` dan patch di
  `C:/Users/FAIZ/.codex/tmp/niuva-refund-completion-20261021/`.
  Patch existing diterapkan tiga-arah di worktree managed
  `C:/Users/FAIZ/.codex/worktrees/v1-refund-completion/NIUVA 2026`, branch
  `codex/v1-refund-completion`, dari main terbaru. Worktree asal dan dua file
  untracked checkout primary tidak diubah; snapshot asal diverifikasi ulang.
- Konflik integrasi mempertahankan waktu intake staf dari #59, retensi model
  T08, reconciliation pembayaran T24 dan notifikasi bisnis #61. Satu runner
  canonical berisi sembilan job; tidak dibuat runner atau scheduler kedua.
  Hanya migration additive existing-patch `20261019060000_refund_execution`
  ditambahkan; migration historis identik dengan main.
- T23: stable key per alokasi dan attempt/clock durable sebelum POST; merchant
  rule/channel/window/max-attempt/cooldown serta approval/retur/snapshot
  diperiksa ulang. Timeout/hasil tak pasti tidak memberi izin POST/key baru.
  Fallback manual Owner memakai verifikasi provider/penerima dan bukti transfer;
  jalur pencabutan persetujuan yang belum dibayar disambungkan ke API, action,
  form native dan riwayat. Pencabutan mempertahankan bukti dan menolak payout
  atas authorization lama. Regresi T23 dan adapter/backend terarah lulus.
- T25: accepted bukan bank final; receipt matching tepercaya immutable dan
  dedup, total MAKE meliputi order + ongkir final, dan seluruh alokasi harus
  mempunyai receipt serta state CONFIRMED sebelum kasus COMPLETED. Job GET-only
  memakai role/binding/lease canonical; kehilangan lease membatalkan apply.
  Closure, ekspor privacy, retensi file, payment hold dan perhatian Admin tetap
  memakai batas kewenangan masing-masing.
- Defect yang dibuktikan lalu diperbaiki: receipt yang sama tidak memulihkan
  status setelah exception; polling receipt alokasi lain menutup kasus yang
  masih mempunyai exception; retry preflight macet CHECKING; dan manual nilai
  penuh dapat menimpa bukti partial/external refund. RED terakhir enam gagal /
  66 passed. GREEN typecheck, 4 file / 73 integration dan 6 journey browser
  refund lulus. Histori partial/external/reference-conflict menahan manual
  meskipun observation berikutnya settled/unavailable atau authorization
  dicabut. Tidak ada perkiraan nominal sisa atau fitur partial refund umum.
- Review independen source/diff menemukan tiga defect terakhir di atas;
  review ulang versi GREEN tidak menemukan defect material tambahan. Reviewer
  tidak mengubah file, menjalankan provider, atau menggantikan hasil gate.
- Gate penuh diff lokal lulus: lint 0 error/4 warning existing; typecheck dan
  Prisma validation; unit/component 127 file/1.469 tes; backend dengan coverage
  aktif 105/770; integration 54/473; Chromium Owner/Admin 31 passed; Chromium
  default 112 passed/5 existing production-tier skips; production build lokal
  93/93 halaman. Browser refund mencakup JavaScript/no-JS, keyboard pencabutan,
  reduced motion, serta capture route aktual 1440/390/320px tanpa overflow.
  Visual Owner, zoom 200%, perangkat fisik/AT tetap belum dibuktikan.
  Perintah: `corepack pnpm lint`, `typecheck`, `db:validate`, `test
  --reporter=dot --maxWorkers=1`, `test:backend --reporter=dot --maxWorkers=1`,
  `exec vitest run --config vitest.integration.config.mts --reporter=dot
  --maxWorkers=1`, `test:e2e:admin-auth --workers=1`, `test:e2e --config
  .local/refund-completion.playwright.config.mts --workers=1`, dan `build`.
  Adapter browser ignored mewarisi suite canonical dan tidak memakai server
  existing. Bukti final di
  `C:/Users/FAIZ/.codex/tmp/niuva-refund-completion-20261021/`; full run
  `lint,unit,backend,integration,browser-admin,browser-default,build-1792519820969`
  berstatus PASSED. T23/T25 tetap BLOCKED_EXTERNAL untuk bukti di bawah,
  bukan DONE global atau CI untuk diff baru.
- Database test baru `niuva_refund_completion_test_20261021` dan
  `niuva_refund_completion_browser_test_20261021` berada pada cluster loopback
  test yang identitasnya diverifikasi. Masing-masing menerima 38 migration;
  fixture job membuat database UUID terisolasi tambahan. Tidak ada database
  lama yang di-reset/drop dan tidak ada resource production yang dipakai.
- Bukti sandbox merchant/metode/channel/window/saldo/ETA, hasil bank sandbox,
  penerima/jalur manual dan scheduler/role/resource hosted masih dibutuhkan
  PUB-REFUND-PROVIDER/PUB-REFUND-RECON/T35. Partial/external exception tetap
  membutuhkan rekonsiliasi bukti dan resolusi eksplisit sebelum kewajiban sisa
  dapat diselesaikan. T35, Owner visual/UAT, perangkat/AT dan production tidak
  ditutup oleh fixture atau browser lokal.
- Kontrak diperbarui di [refund workflow](docs/backend/refund-workflow.md).
  Rollback menghentikan submission baru sambil mempertahankan key/clock,
  attempts, receipt, audit dan penanganan kewajiban; jangan drop/reset tabel
  atau replay accepted/unknown. Tidak ada commit/push/PR/merge baru,
  deployment/activation, pengiriman email atau refund dana nyata pada kelanjutan
  ini. Checkout primary dan worktree asal tetap dipertahankan.

### Rekonsiliasi PR #61 terhadap main PR #60 — 2026-10-20

- `main` telah diverifikasi memuat squash PR #60 `d956c186cae40d76624c4fb4c0f297ed66954f82`; branch PR #61 direkonsiliasi tanpa menulis ulang branch remote. Review independen pada tree gabungan tidak menemukan defect actionable.
- Diff akhir terhadap `main` hanya memuat T26–T30: 41 file, 1.089 penambahan dan 69 penghapusan. Resolusi mempertahankan T08 retensi file, T24 payment reconciliation, serta sinkronisasi E2E notifikasi PR #60.
- Satu-satunya migration baru pada diff adalah `20261019050000_business_notifications`; seluruh 37 migration berhasil diterapkan pada masing-masing database test baru yang terisolasi. Migration historis identik dengan `main`; database existing tidak di-reset atau di-drop.
- Gate lokal lulus: lint (0 error, 4 warning existing), typecheck, Prisma validation, unit 127 file/1.466 test, backend 102/747, integration 53/441, Chromium default 112 pass/5 skip, Admin 28/28, dan build 93/93 halaman.
- Checkpoint ini belum mengklaim CI final, merge PR #61, provider/email/scheduler hosted, acceptance Owner/perangkat, atau v1.0 release. T24 tetap `BLOCKED_EXTERNAL`; T23/T25 tetap terbuka.

### T26–T30 — email bisnis minimum dan perhatian Admin, 2026-10-19

- Audit ulang: main `54a97bb`; PR #58/#59/#60 draft/open; working tree T24
  bersih sesudah checkpoint `adc28f0`. Branch `codex/v1-business-notifications`
  bergantung eksplisit pada #60: proyeksi email settlement memakai guard
  ketidakpastian/refund T24 dan helper database fixture terisolasi yang sama.
  Ini perluasan satu worker/proof/purpose untuk empat email minimum, bukan
  pemakaian token auth sebagai event bisnis. Main tidak diubah.
- Order/payment/quote/fulfillment canonical menjadi bukti persisten; proyeksi
  ke antrean dilakukan job sesudah transaksi agar kegagalan email tidak
  membatalkan request/order. Deadline pengiriman berasal dari event asli dan
  policy eksplisit, tanpa default kalender/SLA atau konfigurasi hosted baru.
  Recipient/access/closure, versi quote dan status pembayaran diperiksa ulang.
- Konten minimum mengarahkan ke akun milik Customer; tidak menaruh token auth,
  quote capability atau private storage URL pada email. Penerimaan provider,
  inbox/bounce, scheduler dan production tetap memiliki gate sendiri.
- Implementasi: `src/modules/outbox/business-{core,repository,job,mailer,attention}.ts`
  dan core/service/repository/worker/cipher contract existing; `src/modules/jobs/`
  memakai satu runner/lease dengan OUTBOX_BUSINESS dan policy eksplisit.
  Endpoint `src/app/api/internal/jobs/business-notifications/route.ts` memakai
  bearer, body 4 KiB, no-store dan batas execute 10. Schema/migration baru
  `20261019050000_business_notifications` menambah Order.shippedAt nullable;
  `src/modules/order/repository.ts` membekukan transisi SHIPPED pertama.
  `src/modules/custom-print/estimate-current.ts` memisahkan pemeriksaan snapshot
  murni dari modul auth/Next; export API lama tetap tersedia.
- AC terbukti: T26 source/order intent persisten, publisher overlap/dedup dan
  kegagalan cipher/sender tidak membatalkan order; T27 settlement/ongkir final,
  duplikat webhook serta penahanan pending/late/verification/refund; T28 quote
  current/version/review/model/expiry, termasuk DRAFT pengganti dan pricing
  rule SENT yang retired; T29 status, timestamp pertama, resi terkini dan
  account URL; T30 audit gagal/unknown, toast/history/read per akun, target
  berizin dan record bisnis tetap tersimpan. Semua memakai fixture sintetis.
- Gate final lokal 19 Oktober: `pnpm lint` 0 error/4 warning existing,
  `pnpm typecheck`, `pnpm db:validate`; `pnpm test --maxWorkers=4`
  **127 file/1.466 test**, `pnpm test:backend --maxWorkers=4`
  **100/736**, full `pnpm test:integration` **52/423**, termasuk 19 skenario
  bisnis. Chromium Admin **27/27**, default **112 passed/5 skipped** pada
  port 3118; kelima skip adalah spec public-content-production-path yang
  mensyaratkan tier production. Build produksi **93/93 halaman statis** lulus
  dengan database test dan provider guard tertutup. Bukan bukti production.
- Resource baru: `niuva_business_test_20261019`,
  `niuva_business_regression_test_20261019`, dan
  `niuva_business_final_test_20261019`; replay 36 migration sukses. Publisher
  dan reconciliation masing-masing memakai database UUID baru melalui helper
  terisolasi; resource dipertahankan, database lama tidak di-reset.
  File test berubah: `tests/backend/business-{email-core,mailer,notifications-route}.test.ts`,
  `tests/integration/business-notifications.test.ts`, tiga regression outbox,
  job-monitoring, serta `tests/e2e-admin-auth/admin-notifications.spec.ts`.
- Temuan/perbaikan aktual: fixture file VERIFIED wajib memiliki satu pemilik;
  setup/cleanup diurutkan atomik tanpa melemahkan constraint. Ekspektasi payload
  Resend diperbaiki menjadi array recipient. Test image optimizer existing
  timeout pada full backend default, lulus sendiri dan full suite empat worker
  tanpa mengubah timeout/assertion/coverage. Loader browser sempat gagal akibat
  import auth/Next transitif; ekstraksi utility murni memperbaikinya. RPC tool
  300 detik tidak dipakai sebagai hasil browser; run native terpantau membuktikan
  hasil Admin/default di atas. Tidak ada test/workflow yang dilemahkan.
- Batas teknis umur pesan 24 jam mengikuti window key Resend, diperiksa pula
  pada enqueue langsung; policy operasional tetap wajib diisi, bukan default
  SLA. Retry memakai key/envelope lama, unknown terminal tidak diulang.
  [Kontrak dan rollback](docs/backend/business-notifications.md) serta ledger
  readiness diperbarui; tidak ada dependency, credential, activation, atau
  kalender/SLA baru. DONE di sini mengikuti AC teknis lokal minimum, bukan
  penerimaan inbox, bounce, cadence/role hosted, visual atau rilis. Commit/PR
  dan CI head dicatat pada checkpoint delivery berikutnya.
- Verifikasi dependensi T24: Quality pada head `adc28f01774646dc9ca40a4cf14edc7ae5af60fe`
  [SUCCESS](https://github.com/batakers/Niuva-2026/actions/runs/39246997823/job/118053840138),
  selesai 19 Oktober 12:33 UTC. Run pertama gagal pada navigasi linimasa Admin
  dengan 25 journey lain lulus; satu rerun job pada SHA sama lulus. Tidak ada
  pelemahan test/workflow. Hasil itu bukan CI diff T26–T30 dan tidak menutup
  BLOCKED_EXTERNAL T24.
- Checkpoint delivery T26–T30: kode `ae36ad68eb0462320eb45f2aae47c96224c0644c`,
  40 file (1.033 penambahan/68 penghapusan), sudah di-push pada
  `codex/v1-business-notifications` dan diajukan sebagai
  [draft PR #61](https://github.com/batakers/Niuva-2026/pull/61).
  Main menjadi target Quality dengan dependency #60/#59 eksplisit;
  [diff notifikasi saja](https://github.com/batakers/Niuva-2026/compare/codex/v1-payment-reconciliation...codex/v1-business-notifications)
  tersedia terpisah. Seluruh command/gate di atas lulus pada runtime diff kode;
  CI PR #61 masih menunggu verifikasi SHA head, bukan memakai CI #60.
  Rollback menghentikan launcher baru sambil mempertahankan intent/key/receipt
  terminal. Tidak ada merge ke main, force push, deployment, email provider,
  scheduler, atau operasi uang nyata. Berikutnya T23/T25 memakai baseline aman
  T24 dengan dependensi kasus/approval yang sudah dicatat.
- Perbaikan verifikasi PR #61, 19 Oktober: Quality pada head `2e6cc708`
  [gagal](https://github.com/batakers/Niuva-2026/actions/runs/39262424690/job/118093387737)
  saat poll receipt read notifikasi 5 detik (25 journey lulus, satu belum berjalan).
  Tes kini menunggu acknowledgment POST read yang berstatus 200/no-store sebelum
  memeriksa DB; batas poll dan assertion persistence/reload tetap. Fixture baris
  memakai order UUID sendiri agar run berulang aman tanpa reset DB. Skenario
  bisnis menunda request 6 detik untuk membuktikan sinkronisasi tersebut.
  Kedua journey notifikasi lulus lokal pada DB test retained; lint 0 error/4
  warning existing dan strict typecheck lulus. Penyebab durasi CI tidak diasumsikan
  sebagai bug runtime; runtime/workflow tidak diubah. CI SHA berikutnya menunggu.
- Quality head `4f77b3c` melewati kedua journey notifikasi, namun
  [gagal](https://github.com/batakers/Niuva-2026/actions/runs/39269592478/job/118118068595)
  pada heading linimasa Admin setelah klik navigasi (26 journey lulus). Kasus
  yang sama muncul di run pertama T24. Tes navigasi kini menunggu URL tujuan
  terkomit sebelum assertion heading 5 detik; request linimasa sengaja ditunda
  6 detik. Journey lengkap search → activity → account → deactivation lulus
  lokal pada DB retained (55 detik), tanpa mengubah runtime/workflow.
### Pemulihan sinkronisasi E2E PR #60 — 2026-10-20

- Quality run `39329168932` pada head integrasi `ce8b6ab` gagal pada satu test notifikasi Admin (26 passed, 1 failed): poll persistence `readAt` selama 5 detik dimulai setelah klik tanpa menunggu POST selesai. Review ulang tidak menemukan regresi runtime T24 pada jalur Custom Print tersebut; log CI konsisten dengan kegagalan sinkronisasi, tanpa bukti bahwa respons HTTP akhirnya sukses.
- Respons POST yang sengaja ditunda 6 detik mereproduksi kegagalan assertion database yang sama (RED: 1 failed). Helper `confirmRead` yang sudah ada pada branch #61 diambil hanya untuk test existing ini: waiter dipasang sebelum klik, respons wajib `200` dan `Cache-Control: no-store`, lalu assertion database semula tetap dijalankan tanpa mengubah timeout. Penundaan satu request dipertahankan sebagai regresi. Tidak ada fitur email #61 atau kode runtime yang diambil.
- GREEN: test notifikasi tersebut lulus dengan respons lambat dan seluruh assertion persistence, no replay, navigasi/focus serta mobile tetap aktif. Review independen tidak menemukan pelemahan test. Lint ulang (0 error; 4 warning existing) dan strict typecheck ulang lulus.
- Bukti RED `C:/Users/FAIZ/.codex/tmp/niuva-integration-20261020/pr60-1792446751263/`; GREEN `pr60-1792446830798/`; static ulang `pr60-1792446880776/`. Seluruh gate lokal pada produk T24 sebelumnya telah lulus seperti log berikut. Commit perbaikan test harus memperoleh Quality baru yang sukses sebelum Ready/merge; run gagal tidak dipakai sebagai bukti kelulusan.

### Integrasi PR #60 setelah PR #59 — 2026-10-20

- PR #59 terverifikasi MERGED dengan squash `bcd04d9ee6f806524a37b243ff27921897f5c0d8`; Quality pada head `85f63c5` dan hasil squash main keduanya SUCCESS. T24 kemudian diintegrasikan pada worktree terpisah tanpa menyentuh worktree T23/T25.
- Konflik merge mempertahankan T08, refund hold pada retensi model serta waktu penerimaan pertama intake staf dari #59. Runner/monitoring canonical kini memuat tujuh job, termasuk `CUSTOMER_FILE_RETENTION` dan `PAYMENT_RECONCILIATION`. Review independen atas diff final terhadap main tidak menemukan defect actionable.
- Gate lokal pada database baru `niuva_pr60_gate_test_20261020` dan `niuva_pr60_browser_test_20261020`: lint (0 error; 4 warning existing), strict typecheck, Prisma validate, unit/component 127 file/1.466 test, backend 99 file/735 test, integration 52 file/422 test, Chromium 112 passed/5 existing skips, Owner/Admin 27 passed, serta production build 93/93 halaman — seluruhnya lulus.
- Perintah: `corepack pnpm lint`, `typecheck`, `db:validate`, `test --reporter=dot --maxWorkers=1`, `test:backend --reporter=dot --maxWorkers=1`, `exec prisma migrate deploy` ke masing-masing database baru, `exec vitest run --config vitest.integration.config.mts --reporter=dot --maxWorkers=1`, `test:e2e --config .local/integration-recovery.playwright.config.mts --workers=1`, `test:e2e:admin-auth --workers=1`, dan `build`. Adapter browser sementara/ignored mewarisi suite canonical dan menggunakan server baru pada cluster test yang identitasnya diverifikasi; assertion produk dan workflow CI tidak diubah.
- Seluruh 36 migration berhasil diterapkan. Semua migration existing identik dengan main; hanya migration reconciliation baru yang ditambahkan. Bukti lokal disimpan di `C:/Users/FAIZ/.codex/tmp/niuva-integration-20261020/pr60-1792444624928/`.
- Checkpoint ini mendahului commit/push dan Quality pada head integrasi baru; merge hanya dilakukan setelah Quality tersebut SUCCESS. T24 tetap `BLOCKED_EXTERNAL` untuk sandbox/merchant, cadence, resource serta binding/role hosted. Tidak ada aktivasi provider/scheduler, produksi, pengiriman email nyata, refund dana, atau klaim v1.0 RELEASED.

### T24 — reconciliation pembayaran, 2026-10-19

- Audit ulang: working tree T21/T22 bersih, main masih `54a97bb`, PR #58/#59
  draft/open. Branch `codex/v1-payment-reconciliation` memakai baseline
  `28f9037` dari PR #59 sebagai dependensi teknis eksplisit. Get Status dapat
  melaporkan refund tanpa bukti dana final; receipt-nya harus menahan kasus
  T21, sehingga guard domain refund disertakan pada slice T24. PR menarget main
  agar Quality existing (pull_request main saja) menjalankan SHA T24. Dependency
  PR #59 dan diff khusus sejak `28f9037` dicatat eksplisit; ini satu rantai
  kasus/approval/reconciliation. Tidak membawa kode T08 atau mengubah main.
- Adapter mengikuti Get Status API resmi, signature dan identity server.
  Response fixture tidak menjadi sandbox/merchant proof. Scheduler/cadence,
  role/resource hosted serta pengembalian dana final tetap gate eksternal.
- Quality PR #59 telah diverifikasi sukses pada head
  `28f9037a1460c70fd8c5cb827dc05088709da7dd`,
  [run 39240507304](https://github.com/batakers/Niuva-2026/actions/runs/39240507304).
  Ini bukti CI T21/T22, bukan CI diff T24. Kedua PR tetap tanpa merge.
- Whitelist job migration T24 mempertahankan nama T08 untuk baseline gabungan.
  Urutan deployment kandidat wajib menyertakan migration T08 sebelum T24;
  kode/scheduler T08 tidak menjadi bagian diff ini. Belum ada deployment.
- Adapter/provider boundary: **14 gateway** dan **4 HTTP** test; job memakai
  Zod/body limit, signature/currency/identity server, no-store/no-redirect dan
  timeout 8 detik. 404/network/invalid tidak mengubah pembayaran menjadi gagal.
  Refund report tanpa bukti dana menghasilkan hold persisten, bukan REFUNDED.
- **14 integration reconciliation** membuktikan stock/settlement tidak ganda
  saat query/webhook beradu, late settlement tidak membuka order batal, amount/
  signature/status code salah dan capture challenge ditolak, receipt per
  run/attempt dedup, overlap/cooldown, rotasi batch dan lease fencing. Kehilangan
  lease di tengah apply me-rollback event, order/payment, stock, receipt dan
  audit. Audit hanya berubah saat outcome/kategori berubah. Link notifikasi ke
  order ditolak sesudah closure; kasus/refund baru ditahan pada hasil tak pasti.
- Role fixture tidak memiliki akses Customer/sesi/kasus refund atau DELETE
  payment/event/check/stock. Request provider semuanya response fixture; tidak
  ada credential production, provider activation, scheduler atau perubahan env.
- Tiga fixture expiry awal ditolak constraint existing; waktu fixture diperbaiki,
  constraint tidak diubah. Pengulangan setelah suite penuh mendeteksi batch
  membaca fixture file lain. Test kini memakai database baru
  `niuva_status_test_<uuid>` dengan migrate deploy resmi; query produksi tidak
  diberi filter test. Resource lama tidak di-reset/dihapus.
- Gate akhir 19 Oktober: lint **0 error/4 warning existing**, typecheck dan schema
  valid; unit/component **127/1.466**, backend **97/724**, integration penuh
  **51/404**, build **93/93 static pages**, browser refund authenticated **2/2**.
  Perbaikan target notifikasi/helper diverifikasi ulang dengan 14 integration
  khusus dan seluruh 51/404 pada resource regresi baru; lint/typecheck akhir juga
  diulang. Perintah resmi melalui corepack: pnpm lint/typecheck/db:validate,
  test --reporter=dot --maxWorkers=2, test:backend --reporter=dot --maxWorkers=2,
  test:integration, build, dan
  test:e2e:admin-auth tests/e2e-admin-auth/admin-refund.spec.ts.
- PostgreSQL loopback 55432, cluster `.local/postgres-test/data`; 35 migration
  diterapkan ke `niuva_payment_reconcile_test_20261019` dan resource regresi baru
  `niuva_payment_reconcile_regression_test_20261019`. File job memiliki database
  fixture sendiri melalui helper terjaga. Build saja memakai tier production /
  mode mock / satu worker; override build tidak masuk unit/backend/integration.
- Diff check dan scan pola credential lulus; migration historis/env/workflow
  tidak diubah. Commit kode `e3941f6fb33ba3f175a88c3928433fa21ed44eb9`, branch
  `codex/v1-payment-reconciliation`, [draft PR #60](https://github.com/batakers/Niuva-2026/pull/60)
  sudah di-push. PR #59 adalah dependensi eksplisit; belum ada merge. CI T24
  masih menunggu pada checkpoint delivery. Kontrak/risiko/rollback pada
  [reconciliation pembayaran](docs/backend/payment-reconciliation.md).

### Pemulihan integrasi PR #59 — 2026-10-20

- Melanjutkan merge `87d47fa` yang sudah aktif/staged pada recovery worktree
  `codex/v1-refund-cases`; tidak membatalkan merge atau memulai merge kedua.
  Resolusi TASKS mempertahankan bukti T08 dan T21–T22 beserta gate eksternalnya.
- Cluster test existing pada loopback 55432 dipulihkan melalui launcher resmi
  checkout utama. Crash recovery melewati timeout launcher, lalu readiness dan
  SQL memverifikasi data directory yang benar serta recovery selesai. Tidak ada
  reset/drop database existing atau perubahan resource production.
- Review independen menemukan dua defect yang diperbaiki: refund aktif menahan
  retensi model melalui order meskipun Customer sudah ditutup; intake staf
  menyimpan waktu penerimaan awal kanal layanan, bukan waktu input. Timestamp
  wajib ber-offset, form berlabel WIB, future ditolak memakai clock database,
  dan retry/refresh mempertahankan waktu asli. Review ulang source tidak
  menemukan defect actionable tambahan.
- Regresi sebelum perbaikan: empat kegagalan yang diharapkan, 31 passed. Sesudah
  perbaikan: 36/36 pada dua file integration, termasuk REQUESTED/APPROVED/
  RECONCILING, closure, refund yang muncul setelah DELETE_PENDING sebelum
  storage I/O, dan kelanjutan retensi hanya setelah kasus COMPLETED.
- Gate kode gabungan lulus: lint 0 error/4 warning existing; strict typecheck;
  Prisma validation; unit/component **127 file/1.466 tes**; backend **97/717**;
  integration **51/408**; default Chromium **112 passed/5 existing skips**;
  authenticated Owner/Admin **27 passed**; build production **93/93 halaman**
  memakai satu worker. Batas heap runner awal 2 GiB menghasilkan OOM; pengulangan
  dengan 4 GiB/worker tunggal lulus tanpa perubahan assertion atau guard.
- Database baru yang terpisah: `niuva_pr59_gate_test_20261020` dan
  `niuva_pr59_browser_test_20261020`, keduanya loopback 55432. Seluruh 35 migration
  diterapkan; 35 file migration historis dari main identik, dan diff terhadap
  main hanya menambah `20261019030000_refund_cases`.
- Perintah: `corepack pnpm lint`, `typecheck`, `db:validate`,
  `test --reporter=dot --maxWorkers=1`, `test:backend --reporter=dot --maxWorkers=1`,
  `exec vitest run --config vitest.integration.config.mts --reporter=dot
  --maxWorkers=1`, `test:e2e --config .local/integration-recovery.playwright.config.mts
  --workers=1`, `test:e2e:admin-auth --workers=1`, `build`, dan `git diff --check`.
  Konfigurasi browser sementara mewarisi seluruh suite canonical dan hanya
  mengganti launcher per-worktree dengan Next langsung setelah identitas cluster
  dan database browser terisolasi diverifikasi; existing server tidak digunakan.
- Checkpoint sebelum merge commit/push: Quality pada SHA hasil integrasi tetap
  wajib sukses sebelum Ready/squash merge. Worktree T23/T25 tidak diubah;
  HEAD, index dan hash 1.449 file tracked/non-ignored cocok dengan checkpoint.
  Tidak ada scheduler/provider, email nyata, refund dana atau deployment yang
  diaktifkan. Penerimaan visual Owner, perangkat/AT, staging/provider dan release
  production tetap terpisah dan belum ditutup oleh bukti lokal ini.

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
### T08 — retensi file Customer, 2026-10-19

- Owner melaporkan squash merge PR #57. GitHub memverifikasi commit merge
  `54a97bbc5448f99ddc2e54a3759a2ca6c12e89ee` pada main, isi file sama dengan
  kandidat `cc1ced6`; [Quality pada main](https://github.com/batakers/Niuva-2026/actions/runs/39185705585)
  sukses. Checkout main disinkronkan fast-forward; T08 dikerjakan pada
  `codex/v1-customer-file-retention` berdasarkan commit tersebut.
- Satu job canonical CUSTOMER_FILE_RETENTION memakai lease/role/binding dan
  monitor existing. HTTP execute maksimal 10, CLI maksimal 100, scan maksimal
  100 record/run dengan cursor persisten; dry-run tidak menulis atau membuat
  adapter storage. Tidak memasang cron/cadence/provider.
- Klaim DELETE_PENDING dicatat sebelum delete; upload/reuse/quote baru diblokir.
  Hold/order/lease diperiksa ulang sebelum storage I/O. Konfirmasi storage dan
  final lease diperlukan sebelum tombstone dan audit selesai. Timeout/error
  setelah panggilan storage tetap unknown; retry idempoten memakai key sama.
- Hold khusus file hanya Owner aktif, diaudit, dan tidak lepas otomatis saat
  review overdue. Hold privacy terkait ikut dihormati. Financial evidence,
  record bisnis, public media dan histori B2B tidak masuk penghapusan binary.
- Migration baru diterapkan bersama 33 migration existing pada database test
  baru `niuva_file_retention_test_20261019_v3`; migration lama tidak diedit.
  Percobaan awal pada database sintetis terpisah menemukan salah nama constraint
  di migration baru; diperbaiki dari nama canonical sebelum bukti fresh 34/34.
- Prisma migrate diff tidak menemukan perbedaan T08; hanya constraint/index
  komposit manual finance existing di luar representasi schema yang terdeteksi
  (`manual_b2b_payment_entries`), tidak dihapus atau diubah oleh pekerjaan ini.
- Gate pada diff lokal di atas `54a97bb`: unit/component **127 file/1.457
  passed**, backend **95/706**, integration **50/382** (serial, URL test v4
  eksplisit), termasuk **14** integration retensi. Lint **0 error/4 warning
  existing**, TypeScript strict, Prisma validation, dan production build
  **93 static pages** lulus. Build memakai `CIRCLE_NODE_TOTAL=2` (satu worker),
  tier production/mode mock dan origin loopback; peringatan origin HTTP memang
  bukan bukti hosted HTTPS. Tidak ada aktivasi provider/deployment.
- Perintah utama: `pnpm test --reporter=dot --maxWorkers=2`, Vitest backend
  dengan config repository/maxWorkers=2, Vitest integration dengan config
  repository dan TEST_DATABASE_URL v4, `pnpm lint`, `tsc --noEmit
  --incremental false`, `pnpm db:generate`, `pnpm db:validate`, migration deploy
  hanya ke database test baru, `pnpm build`, dan `git diff --check`.
  E2E browser tidak diulang pada diff backend ini; CI/E2E main bukan hasil CI
  diff T08 yang belum di-commit/push.
- Scheduler/cadence/role/storage hosted belum tersedia. T08 tetap
  BLOCKED_EXTERNAL; policy publik masih draf. Hold kasus memakai kontrol Owner
  existing; hold file khusus/orphan masih layanan domain, sehingga interface
  dan SOP penanganannya perlu dibuktikan saat T36/T39. Tidak menghubungkan ulang
  histori detached dengan pencocokan email. Migration belum diterapkan ke
  database aplikasi. Rollback harus mempertahankan klaim/tombstone, tidak
  mengklaim memulihkan objek yang sudah dihapus; lihat runbook.
- Verifikasi ulang delivery 2026-10-19 pada branch yang sama: `corepack pnpm
  db:generate`, `lint`, `typecheck`, `db:validate`, `test:integration`,
  `test --reporter=dot --maxWorkers=2`, `test:backend --reporter=dot
  --maxWorkers=2`, `build`, dan `git diff --check` lulus. Unit/component
  **127 file/1.457 tes**, backend **95 file/706 tes**; build **93 halaman**.
  Integration memakai database loopback baru
  `niuva_t08_test_20261019_delivery`, dengan **34 migration** berhasil diterapkan.
  Satu percobaan unit memakai override tier production untuk build dan gagal
  pada 19 pemeriksaan secret rate-limit; pengulangan tanpa override build
  lulus seluruh suite, tanpa perubahan kode/tes. Build saja memakai tier
  production/mode mock/origin loopback dan satu worker. Bukti browser lokal
  tidak ditambah pada delivery backend ini; CI head PR diperiksa terpisah.
- Delivery kode: commit `239247a`, branch `codex/v1-customer-file-retention`,
  [draft PR #58](https://github.com/batakers/Niuva-2026/pull/58) ke main.
  Pada checkpoint pembuatan PR, CI head belum selesai dan tidak diklaim lulus.
  PR tidak di-merge; task independen berikutnya bercabang dari `origin/main`,
  bukan dari commit T08 yang belum di-merge.

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
- T12/T13 — 2026-10-25: pekerjaan diintegrasikan pada worktree baru
  `codex/v1-public-customer-closure` dari `b31b83d`; worktree sumber AO dan
  checkout utama tidak disentuh. Migration tambahan `20261025120000_customer_public_consent`
  diterapkan ke PostgreSQL baru/loopback pada port 55432 (80 model/39 migration
  folders); tidak ada reset database lama atau dependency baru. Proof Google
  dibersihkan lewat canonical privacy cleanup (expired/consumed +7 hari,
  bounded dry-run dan counter job).
  Gate final lokal: check:memory, lint (0 error; 4 warning existing di
  `jobs/handlers.ts`), typecheck, unit 129/1.475, backend 110/850,
  `db:validate`, integration PostgreSQL 56/512, default E2E 112 lulus/5 skip
  conditional, Admin E2E 31/31, public-auth E2E 18/18 dan production build
  lulus. Build final tidak lagi memberi warning tracing seluruh project dari
  loader policy. E2E publik mencakup Google/email, desktop/mobile, JavaScript
  aktif/nonaktif, keyboard/fokus. Satu run ulang E2E publik sempat gagal saat
  Turbopack tak menemukan modul font internal; run lengkap berikutnya pada
  mode CI-style dan harness lokal keduanya lulus 18/18, error tidak terulang.
  [PR #68](https://github.com/batakers/Niuva-2026/pull/68) pada head
  `28358749959b9240e2483cc877da47f84bcbb13c` lulus Quality
  ([run](https://github.com/batakers/Niuva-2026/actions/runs/40391849176),
  18m31s), lalu merge via squash ke `main` pada
  `a3d995a904f6fde7e7e248e8a9c8421de734d521`. Quality CI `main` pada merge
  SHA yang sama lulus ([run](https://github.com/batakers/Niuva-2026/actions/runs/40394664887),
  22 langkah, 0 failure). Gate provider/staging/production belum dijalankan;
  tanggal publikasi/berlaku policy tetap belum ditetapkan.
- T03 — 2026-10-27: kelanjutan pada checkout existing
  `codex/t03-hosted-sandbox` dari `a3d995a` menambah
  `corepack pnpm staging:preflight`, memakai Jiti dan helper canonical existing.
  Command menolak profile production/live, provider/fixture config, origin salah,
  binding salah, role owner/membership/grant marker luas (termasuk credential
  owner yang disamarkan lewat SET ROLE), migration tertinggal,
  koneksi tanpa TLS dan Customer/order nonzero. Probe mismatch tidak mengganti
  marker; output hanya boolean/counter/reason aman, tanpa credential/URL/UUID.
  Tidak ada schema, dependency, API, activation grant atau runtime aplikasi
  yang diubah. [Runbook existing](docs/backend/t03-hosted-sandbox-runbook.md)
  menggantikan helper Base64 sementara untuk persiapan berikutnya dan menandai
  draft/provisioning 22 Oktober sebagai historis.
  Database baru `niuva_t03_preflight_test_20261027_dca3c610`
  dibuat pada cluster loopback test yang identitasnya diverifikasi; 39 migration
  diterapkan tanpa reset/drop database lama. Setelah cleanup fixture, pemeriksaan
  read-only mencatat 39 migration, marker/Customer/order/role fixture masing-masing
  0; cluster yang dimulai untuk run ini dihentikan dan database dipertahankan.
  Focused backend **38/38** dan
  integration preflight/job/binding **22/22** lulus. Regresi SET ROLE terbukti gagal
  sebelum pemeriksaan session_user ditambahkan, lalu lulus; fixture positif
  login langsung sebagai role runtime. Mutation check pada guard privilege
  membuat 11 tes gagal dan source dipulihkan dengan SHA-256 yang sama.
  Full backend **112 file/888 tes**,
  typecheck serta lint **0 error/4 warning existing** lulus lokal. CLI diuji lewat
  subprocess nyata untuk missing/unreachable DB; exit 1, JSON aman, tanpa
  password fixture di stderr/stdout. TLS loopback negatif tetap bukan bukti TLS
  atau wiring aplikasi hosted. Build/E2E aplikasi tidak diulang karena patch
  hanya menambah command operasional dan tes, tanpa perubahan route/runtime UI.
  Full integration default dengan coverage akhirnya lulus **57 file/518 tes**
  pada database baru `niuva_t03_verified_test_20261027_d8e1c4b2` (232,45 detik).
  Run pertama terpotong batas tool 180 detik; runner native dengan log persisten
  kemudian menunjukkan satu kegagalan cleanup existing dan fixture T03 yang
  memerlukan DB kosong. Database induk suite memang menyimpan data sintetis
  lintas file. Primitive DB terisolasi diekstrak dari helper existing, kemudian
  dipakai preflight dan job-handlers; seluruh assertion dipertahankan. Fixture
  preflight setelah full suite memiliki 39 migration dan marker/Customer/order/
  role fixture 0. Semua database test dipertahankan dan cluster run ini dihentikan.
  Neon 38 migration tetap merupakan observasi 22 Oktober; keadaan resource
  terbaru dan penerapan migration ke-39 belum diperiksa/dijalankan hosted.
  Intake menunjuk resource existing agar tidak dibuat ulang. Owner menyetujui
  PR sampai review/CI/merge dan satu staging Netlify Free + Neon existing pada
  27 Oktober, dengan migration tambahan hanya setelah resource/backup/data
  kosong diverifikasi. Dashboard Netlify menunjukkan Free, 300/300 credits dan
  tidak ada kartu. Adapter, deployment, cookie/CSP dan transaksi provider belum
  dibuktikan. T03 tetap **BLOCKED_EXTERNAL**;
  T10/T19 dan gate operasional/provider lain tidak ditutup oleh preflight lokal.
  Pemeriksaan read-only Neon pada 27 Oktober kemudian memastikan sertifikat TLS
  client, database/marker yang dimaksud, dan Customer/order 0. Role runtime
  tidak memiliki SELECT pada `_prisma_migrations`; `pg_stat_ssl` backend juga
  melaporkan false meski socket client tervalidasi. Jumlah migration terbaru
  belum dibaca. Perbaikan preflight memakai credential migration terpisah yang
  diverifikasi terhadap marker sama serta memeriksa TLS dari socket client;
  credential migration hanya untuk proses lokal. Tes backend terarah **45/45**
  dan integration **7/7** lulus, termasuk penolakan marker migration salah dan
  server loopback tanpa TLS. Sebelum perbaikan, uji role tanpa SELECT migration
  menghasilkan error 42501. CLI sebenarnya juga lulus pada database test baru
  dengan TLS tervalidasi, dua role terpisah, 39 migration dan data kosong;
  fixture marker/role dibersihkan, database dipertahankan. Full backend setelah
  koreksi lulus; typecheck, lint (0 error/4 warning existing) dan check:memory
  lulus. Review meminta penanganan error koneksi pada negative probe, guard
  loopback sebelum pembuatan DB test dan rujukan keputusan di MEMORY. Setelah
  koreksi, backend terarah **49/49** dan integration **6 file/88 tes** lulus.
  Database test baru dipakai tanpa reset database lama.

### T03 — proxy tanpa database untuk build Netlify, 2026-10-28

- Diagnosis: `src/proxy.ts` mengimpor engine Better Auth dan repository Admin,
  sehingga graf impornya mencapai `@prisma/adapter-pg`/`pg`. Dokumentasi
  Netlify Next.js menyatakan Middleware/Proxy dijalankan sebagai Edge Function;
  ini konsisten dengan kegagalan build 27 Oktober, tetapi penyebab pada
  Netlify baru terbukti setelah build hosted berikutnya.
- Perubahan lokal (belum commit/PR): proxy hanya memeriksa keberadaan cookie
  sesi Admin (`src/lib/auth/admin-session-cookie.ts`, prefix sama dengan engine);
  sesi, TOTP dan profil aktif tetap diverifikasi `requireAdmin()`. Respons proxy
  tanpa cookie tetap 307/401 `UNAUTHORIZED`; proxy tidak lagi menghasilkan 403
  atau 503 saat database gagal. Pengecekan ini pindah ke halaman/API.
- Tes: `tests/unit/proxy-edge-imports.test.ts` (graf impor proxy bebas
  `pg`/Prisma/Better Auth/nodemailer) dan `tests/unit/admin-route-guards.test.ts`
  (setiap page/API Admin non-publik memanggil `requireAdmin`/`loadAdminPageAccess`).
  Tes proxy lama untuk password-only/profil nonaktif/DB down dipindahkan
  cakupannya ke `tests/backend/admin-auth.test.ts` (requireAdmin), bukan dihapus
  tanpa pengganti.
- `node_modules/@prisma/client` ditemukan kosong (mtime 04:58) sebelum gate;
  atas izin user `node_modules` dihapus lalu `corepack pnpm install
  --frozen-lockfile --offline` (lockfile tidak berubah).
- Gate lokal serial: lint exit 0 (0 error/4 warning existing
  `jobs/handlers.ts`); typecheck exit 0; `pnpm test --maxWorkers=1` 131 file/
  1.480 tes; `pnpm test:backend --maxWorkers=1` 114 file/899 tes; `pnpm build`
  default exit 0. `.next/server/middleware.js.nft.json` 98 file, 0 terkait
  pg/Prisma/Better Auth/nodemailer.
- DB test lama `niuva_test` (port 55432) menolak `migrate deploy` karena P3009
  (`20261007090000_admin_invitations` gagal sejak 7 Oktober); tidak di-reset
  atau di-resolve. Database baru `niuva_d1_proxy_test_20261028` pada cluster
  loopback yang sama menerima 39 migration lewat `migrate deploy`.
- `test:e2e:admin-auth` run pertama 30/31: `admin-auth.spec.ts` memakai
  `/api/admin/orders`, route yang tidak ada; dengan cookie sesi password-only
  responsnya kini 404 dari Next, bukan 401 dari proxy. Asersi dipindah ke
  `/api/admin/account` (GET nyata dengan `requireAdmin()`) plus asersi 200
  setelah TOTP. Run ulang **31/31**. `test:integration` **57 file/519 tes**
  (serial menurut config; argumen `--maxWorkers` ditolak script PowerShell).
- Belum diverifikasi: E2E default/public-auth, build Netlify/OpenNext hosted,
  cookie/CSP hosted. T03 tetap **BLOCKED_EXTERNAL**; deploy ulang memerlukan
  izin Owner baru.

### T03 — mekanisme grant staging dan gate PUB-POLICY, 2026-10-28

- Kontrak hosted melarang satu flag yang melewati guard lain
  (`docs/legal/customer-public-runtime-contract.md`, bagian Hosted). Karena itu
  grant aktivasi tetap berupa perubahan source yang direview, bukan env:
  `ACTIVATION_GRANTS` (`src/lib/env/deployment.ts`) kini berisi entri
  `{ capability, instruction, grantedOn }`. Entri tanpa rujukan instruksi atau
  tanggal valid ditolak. Tier production selalu ditolak meski ada entri.
  Seluruh tier tetap **kosong**; tidak ada grant yang diisi.
- Gate PUB-POLICY pada default reader (`src/modules/capabilities/resolver.ts`)
  tertutup hanya bila `PUBLIC_CUSTOMER_POLICY.publishedAt` dan `effectiveAt`
  tercatat, berurutan, dan sudah berlaku (`isPolicyPublished`). Keduanya masih
  `null`, sehingga payment/refund/Google/password/privacy/analytics staging
  tetap `POLICY_NOT_PUBLISHED`. Mengisi tanggal adalah tindakan publikasi Owner.
- Tes baru `tests/unit/activation-grants.test.ts` mengunci grant kosong per
  tier, validasi entri, penolakan production, pemisahan tier, dan aturan
  publikasi policy.
- Gate lokal serial: lint 0 error (4 warning existing); typecheck exit 0;
  unit 132 file/1.489 tes; backend 114 file/899 tes; integration
  `niuva_d1_proxy_test_20261028` 57 file/519 tes; build default exit 0.
- Belum diverifikasi: perilaku hosted. Grant per capability dan tanggal
  publikasi tetap keputusan Owner (pertanyaan E1/E6 audit 28 Oktober).

### Keputusan Owner untuk staging, 2026-10-28

Jawaban Owner di sesi kerja atas pertanyaan audit 28 Oktober (E1–E13):

- **E3:** boleh satu deploy ulang Netlify `niuva-t03-staging` dari `main` yang
  memuat perbaikan proxy (PR #70), tetap Free tanpa kartu; berhenti bila gagal.
  Deploy belum dijalankan. Pada 28 Oktober, setelah PR #72 di-merge
  (`main` `8c131c0`), site masih "Builds are stopped" sehingga Trigger deploy
  memerlukan Activate builds (deploy otomatis aktif sementara); Owner memilih
  belum mengaktifkannya.
- **E4:** boleh menambah hak role runtime staging setelah daftar dikirim ke
  Owner dan disetujui. Daftar diajukan: `SELECT, INSERT, UPDATE` pada
  `public.customer_google_consents` untuk role runtime web; `DELETE` hanya untuk
  role job pembersihan privasi saat job diaktifkan. **Disetujui Owner** pada
  hari yang sama. **Dijalankan 28 Oktober** di Neon SQL Editor (database
  `niuva_staging`, sesi Owner di browser bawaan): sebelum grant, role runtime
  hanya punya `SELECT, INSERT, UPDATE, DELETE` pada `customer_consents` dan
  tidak punya hak pada `customer_google_consents`. `GRANT SELECT, INSERT,
  UPDATE` berhasil; `information_schema.role_table_grants` kini menampilkan
  ketiga hak itu pada `customer_google_consents`, tanpa `DELETE`. Hak kolom
  `customer_consents.method` tercakup oleh hak tingkat tabel. Perilaku
  aplikasi hosted belum diverifikasi.
- **E13:** label cabang Neon `production` yang dipakai staging diganti menjadi
  `staging`. **Dijalankan 28 Oktober** lewat Rename di Neon Console; ID cabang,
  endpoint dan connection string tidak berubah, binding aplikasi memakai
  marker `deployment_database_bindings`, bukan nama cabang.
- **E1:** akun Customer staging memakai **daftar email penguji** (opsi a), bukan
  pendaftaran publik; policy publik tidak diterbitkan untuk staging. Owner
  memberikan dua email penguji Customer. Karena repository publik, alamat tidak
  ditulis di Git dan hanya dipasang melalui environment staging. Jalur
  allowlist staging belum ada di kode (D3).
- **E2:** satu akun Owner dan satu akun Admin uji coba (Faiz, karena Rheza
  berhalangan) dengan dua email berbeda yang diberikan Owner; alamat tidak
  ditulis di Git. Satu email Owner sama dengan salah satu email penguji
  Customer; sistem Admin dan Customer memakai tabel auth terpisah.
- **E8:** T33/T34 boleh dimulai setelah T03, akun staging, provider sandbox dan
  dataset T31 siap; T14/T19 tetap diuji terpisah. Kolom dependensi tabel
  diperbarui sesuai keputusan ini.
- **E5:** Owner menyatakan akun sandbox Midtrans, Biteship, Resend dan Google
  OAuth tersedia; object storage staging memakai **Cloudflare R2** (bukan AWS)
  melalui variabel `S3_*` sesuai `docs/backend/object-storage-contract.md`.
  Pada 28 Oktober dibuat bucket `niuva-staging-private` dan
  `niuva-staging-public` (akses publik nonaktif; bucket dev tidak disentuh) dan
  CORS bucket privat: hanya origin staging, metode `PUT`, header
  `content-type`, max-age 3600. Form token R2 Object Read & Write yang dibatasi
  pada dua bucket itu disiapkan. Di Netlify `niuva-t03-staging` diisi
  `S3_ENDPOINT`, `S3_REGION=auto`, `S3_PRIVATE_BUCKET`, `S3_PUBLIC_BUCKET` dan
  `CUSTOM_FILE_MAX_BYTES=104857600`. `S3_ACCESS_KEY_ID` dan
  `S3_SECRET_ACCESS_KEY` diisi Owner dari token R2 Object Read & Write yang
  dibatasi pada dua bucket staging, ditandai secret. Pemeriksaan nama
  variabel 28 Oktober: keenam `S3_*` ada dan tidak ada `R2_*`; nilai tidak
  dibuka. Validitas kredensial dan akses bucket belum diverifikasi sampai
  deploy/smoke hosted. Credential tidak dilihat dan tidak ditulis di Git.
- **E6:** capability staging yang diizinkan Owner: `payment`, `shipping`,
  `emailSender`/`emailDelivery`, `objectStorage`, `scheduledJobs`. `refund`
  ditunda; `googleAuth`, `signup` dan `analytics` tidak disebut sehingga tetap
  tertutup. Grant belum ditulis ke `ACTIVATION_GRANTS`. Catatan: matriks
  mewajibkan PUB-POLICY untuk `payment` (dan `passwordAuth`) di staging,
  sedangkan E1 menetapkan policy tidak diterbitkan untuk staging. Owner
  memutuskan (28 Oktober) untuk **menerbitkan Syarat & Privasi v1.0 secara
  resmi untuk publik** sehingga PUB-POLICY dapat tertutup; keputusan E1
  tentang penerbitan policy diganti oleh keputusan ini. Owner menegaskan
  pilihan ini setelah diberi tahu bahwa teks v1.0 masih memuat catatan review
  internal dan klaim provider usang: versi publik bersih akan disusun, diberi
  checksum baru dan disetujui ulang Owner sebelum tanggal ditetapkan. Jawaban
  Owner 28 Oktober untuk draf publik: bukti persetujuan disimpan **30 hari**
  setelah akun ditutup (kode saat ini menghapusnya langsung lewat cascade,
  jadi perlu perubahan kode dan job); hosting production akan berbeda dari
  staging, sehingga policy menyebut provider saat ini dan pergantian menjadi
  versi baru; pemberitahuan insiden 3×24 jam menjadi tanggung jawab Owner;
  Owner menerbitkan **tanpa review konsultan hukum** dan menjadi pengesah.
  Draf: `docs/legal/public-terms-v1.0-review.md` dan
  `docs/legal/public-privacy-v1.0-review.md`; wilayah akun Resend belum
  diverifikasi. Belum ada halaman publik Syarat/Privasi (hanya
  `/auth-test-policy`), dan file policy dibaca dari disk saat runtime
  sehingga bundling Netlify perlu diperiksa. Tanggal
  `publishedAt` dan `effectiveAt` belum diberikan, jadi
  `PUBLIC_CUSTOMER_POLICY` belum diubah. Penerbitan tidak membuka `signup` (tetap butuh grant dan PUB-AGE).
- **E7:** sumber dataset ditunjuk Owner: Shop =
  `docs/source/Dataset Shop Niuva/` (manifest `catalog-seed.json`, 8 produk,
  32 varian, approval publish 2026-09-18: 3 ready-made, 5 draft custom); jasa
  MAKE = `docs/source/Pricelist 3D Print Niuva.xlsx`. Owner memutuskan
  (28 Oktober) bahwa **kedelapan produk dan 32 varian siap jual** (tidak ada
  draft lagi; menggantikan approval 2026-09-18 di
  `catalog-publish-decisions.json`, yang belum diperbarui). Produk custom yang
  sudah ada di Shop tetap dijual sebagai produk Shop; MAKE hanya untuk desain
  yang dikirim Customer. Harga dan berat tidak
  boleh 0 (seed saat ini: harga ≥ Rp20.000, berat 50–200 g, tidak ada nol).
  Dataset hanya mencatat ukuran produk satu dimensi (8/12/15 cm), bukan
  dimensi paket. Owner menginstruksikan (28 Oktober) pengisian **dimensi paket
  perkiraan** yang dapat diubah Owner di Admin (form varian sudah memuat
  panjang/lebar/tinggi): kelas 8 cm → 12 × 10 × 6 cm; kelas 12 cm →
  16 × 12 × 10 cm; kelas 15 cm → 20 × 15 × 12 cm. Nilai ini estimasi, bukan
  hasil ukur; berat volume (P×L×T/6000) semuanya di bawah 1 kg.
  Rule pricing custom boleh diaktifkan di DB staging. Belum siap: dimensi
  perkiraan belum dimasukkan ke manifest, dan `scripts/seed-catalog.ts` hanya
  menerima database loopback sehingga impor ke staging butuh jalur terpisah.
- **E9:** di staging, job dipicu manual; jadwal production diputuskan nanti.
- **Setup sandbox, 28 Oktober (Owner: semua akun sandbox tersedia):** Netlify
  `NIUVA_PROVIDER_MODE=sandbox` (dicek), ditambah `MIDTRANS_IS_PRODUCTION=false`
  dan `BETTER_AUTH_URL` origin staging. Dashboard Midtrans sandbox: Notification
  URL `https://niuva-t03-staging.netlify.app/api/webhooks/midtrans` dan Finish
  Redirect `/account` tersimpan (dicek setelah muat ulang); redirect bukan sumber
  status. `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` sengaja tidak ditandai secret di
  Netlify karena nilainya ikut bundle browser (secret scanning Netlify akan
  menggagalkan build); server key tetap secret. Owner mengisi kedua kunci
  (pemeriksaan nama 28 Oktober: `MIDTRANS_SERVER_KEY` secret,
  `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` tidak secret; nama salah
  `MIDTRANS_CLIENT_KEY` sudah dihapus). Grup Midtrans lengkap. Belum: kunci rahasia `MIDTRANS_SERVER_KEY`,
  `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `BITESHIP_API_KEY`, `RESEND_API_KEY`,
  `BETTER_AUTH_SECRET`, `CRON_SECRET` (diisi Owner). Owner memilih kurir
  staging JNE, SiCepat dan J&T; `BITESHIP_COURIERS=jne,sicepat,jnt` dipasang.
  Owner mengonfirmasi asal pengiriman = alamat Jl. Telekomunikasi No.1, kode
  pos 40257. Biteship Maps API (kunci testing Owner, dibaca tanpa echo di
  terminal Owner) tidak punya area untuk "40257" atau "Sukapura Dayeuhkolot";
  "Dayeuhkolot Bandung" mengembalikan satu area
  `IDNP9IDNC22IDND2044IDZ40353` (kecamatan sama, kode pos perwakilan Biteship
  40353). Nilai itu dipasang sebagai `BITESHIP_ORIGIN_AREA_ID`; grup Biteship
  di Netlify kini lengkap. Kunci API dicek namanya saja.
- **Resend, 28 Oktober:** Owner memilih domain `niuva.id` (dikelola di
  Rumahweb) dan mengizinkan aktivasi Manajemen DNS Rumahweb (nameserver sudah
  Rumahweb; tidak ada hosting Rumahweb; zona sebelumnya kosong). Domain kirim
  `mail.niuva.id` dibuat di Resend, region Tokyo (`ap-northeast-1`), click/open
  tracking mati. Tiga record kirim dipasang di Rumahweb (TXT
  `resend._domainkey.mail`, CNAME `rsend.mail` dan `send.mail`); DMARC dan MX
  terima tidak dipasang. Verifikasi Resend berstatus `pending` menunggu
  propagasi; dicek ulang hari yang sama: domain dan ketiga record `verified`.
  `EMAIL_FROM` = `Niuva <no-reply@mail.niuva.id>` di Netlify. Owner membuat
  API key "Niuva Staging" (Sending access, hanya `mail.niuva.id`) dan
  menyimpannya sebagai `RESEND_API_KEY` secret di Netlify (nama dicek). Grup
  Resend lengkap; pengiriman email Customer hosted tetap tertutup oleh guard
  `NODE_ENV=production` sampai D3.
- **Secret Admin/job, 28 Oktober:** `BETTER_AUTH_SECRET` dan `CRON_SECRET` dibuat
  acak di komputer Owner, disalin ke clipboard tanpa dicetak, lalu disimpan
  Owner di Netlify sebagai secret (nama dicek). Satu nilai percobaan sempat
  tertempel di terminal dan terlihat; nilai itu tidak dipakai. Better Auth adalah
  library di aplikasi, tanpa project/dashboard Better Auth. Grup env parsial menghentikan startup, jadi deploy menunggu grup
  lengkap. Temuan kode: `src/modules/customer-auth/email-mailer.ts` menolak
  `NODE_ENV=production`, sehingga email Customer hosted tertutup sampai jalur
  staging dibuat (bagian D3).
- **E10–E12, 29 Oktober 2026:** Owner menerima rekomendasi agen ("Ya, catat").
  Belum mengubah runtime, policy publik atau resource hosted.
  - **E10 (refund uji coba):** refund otomatis hanya untuk metode yang
    didukung Midtrans. Riset dokumentasi publik Midtrans (29 Okt): halaman
    Refund Transaction menyebut kartu kredit, GoPay, ShopeePay, DANA, OVO,
    QRIS, Kredivo dan Akulaku; halaman Refund API/Direct Refund yang lebih lama
    tidak memuat DANA/OVO (atau Kredivo). VA/transfer bank, Mandiri Bill dan
    gerai tidak ada di daftar mana pun, jadi diperlakukan manual. Batas waktu
    per metode berbeda (mis. Kredivo 14 hari, OVO 7 hari, QRIS off-us 7 hari);
    ShopeePay dan OVO tanpa refund parsial; refund kartu hanya lewat bank
    acquiring tertentu. Snap Niuva tidak mengirim `enabled_payments`, sehingga
    metode yang tampil = yang aktif di dashboard merchant. Metode aktif dan
    aktivasi fitur refund di akun Niuva **belum diverifikasi** (dashboard/CS
    Midtrans). Metode lain memakai refund manual:
    Owner menyetujui dan mencatat di Admin, transfer boleh dikerjakan Rheza dari
    rekening usaha setelah nama pemilik rekening tujuan dicocokkan dengan
    pembeli. Bukti sah: bukti transfer internet/mobile banking atau mutasi
    rekening usaha (tanggal, nominal, rekening tujuan, nomor referensi); untuk
    refund otomatis, status dan ID refund di dashboard Midtrans. Screenshot chat
    bukan bukti. Staging cukup satu refund otomatis dan satu manual.
  - **E11 (pemulihan dan retensi):** RPO 24 jam; RTO 1 hari kerja. Neon
    staging saat dicek berpaket Free, `history_retention_seconds` 21600
    (6 jam), region `aws-ap-southeast-1`; backup harian tambahan dan satu
    latihan restore terisolasi dibutuhkan sebelum peluncuran. Retensi (riset
    sumber sekunder 29 Okt, teks resmi belum dicocokkan): PP 80/2019 Pasal 25
    ayat (1) — data PMSE terkait transaksi keuangan minimal 10 tahun, lainnya
    minimal 5 tahun, tanpa syarat lokasi; penjelasannya merujuk UU KUP Pasal 28
    ayat (11), yang mewajibkan dasar pembukuan (termasuk data elektronik)
    disimpan 10 tahun **di Indonesia** pada tempat kedudukan badan. PP 71/2019
    Pasal 21 membolehkan PSE privat menyimpan data di luar negeri, tetapi tidak
    ditemukan sumber yang menyatakan cloud luar negeri memenuhi syarat "di
    Indonesia" UU KUP. Arah aman: database operasional tetap di Neon Singapura;
    salinan arsip pembukuan (ekspor transaksi, settlement Midtrans, invoice)
    disimpan berkala di Indonesia. Format, frekuensi dan tempat salinan serta
    konfirmasi konsultan pajak **belum diverifikasi** (PUB-RECORDS).
  - **E12 (operasional):** hari kerja mengikuti Syarat v1.0 (Senin–Jumat,
    kecuali libur nasional, WIB), jam 09.00–17.00 WIB. Pengganti Rheza:
    Owner atau Admin lain. Kontak Customer: nomor WhatsApp bisnis di website;
    masalah teknis ke Owner. Peringatan sistem ke Owner lewat email. Quote
    MAKE: tanggapan awal 1 hari kerja, quote final paling lambat 2 hari kerja
    setelah berkas dan kebutuhan lengkap.
- **Deploy staging E3, 28 Oktober 2026 (izin Owner "deploy dulu aja"):**
  builds Netlify diaktifkan sementara, satu deploy tanpa cache dari `main`
  `7063395` berstatus **Published**, lalu build status dikembalikan ke
  **Stopped** (dicek setelah muat ulang; log tetap privat). Situs dilindungi
  Netlify visitor access (anonim mendapat 401 "Login Redirect" dari Netlify,
  bukan aplikasi). Melalui sesi Owner di browser bawaan: `/`, `/shop`,
  `/services`, `/custom-print`, `/login`, `/register`, `/admin/sign-in`
  200; `/terms` dan `/privacy` 200 dengan versi v1.0 dan tanggal 28 Oktober
  2026; `/api/admin/account` dan fetch `/admin` tanpa sesi 401. Header
  aplikasi terpasang (CSP, HSTS preload, `X-Frame-Options: DENY`, nosniff,
  `Referrer-Policy`, `Permissions-Policy`). Shop masih kosong (katalog belum
  diimpor). Belum diverifikasi: cookie/sesi, login Admin/Customer, operasi
  provider, migration `customer_closed_consent_proofs` di Neon (belum
  diterapkan). Build hosted pertama yang lulus setelah perbaikan proxy PR #70.
  Deploy kedua atas izin Owner ("Ya, deploy"): `main` `d6b810b` (PR #74)
  **Published**, build status dikembalikan ke **Stopped** (dicek). Smoke:
  `/`, `/terms`, `/privacy`, `/admin/sign-in` 200; `/api/admin/account` 401.
  Variabel `ADMIN_SMTP_*` kini termuat; pengiriman email Admin belum diuji.

### D4 — bootstrap Owner staging, 2026-10-28

Signup Admin tetap mati (`disableSignUp`) dan `db:provision:admin` hanya untuk
loopback dev. `corepack pnpm staging:bootstrap-owner` (wrapper PowerShell yang
membaca DATABASE_URL, binding ID dan password tanpa echo) menjalankan
`scripts/bootstrap-staging-owner.ts`: tier `staging` eksplisit, `sslmode=verify-full`,
marker binding staging diverifikasi dalam transaksi yang sama, kunci advisory,
dan ditolak bila sudah ada Owner. Akun dibuat `emailVerified=false`; Owner
memverifikasi email saat masuk lalu memasang TOTP. Admin Faiz diundang Owner
lewat `/admin/admins/new` (alur undangan existing). `provisionAdminIdentity`
dipecah agar logika yang sama berjalan di transaksi binding. Email Admin
(verifikasi, undangan, reset) memakai grup `ADMIN_SMTP_*` + `ADMIN_EMAIL_FROM`.
Pada 28 Oktober grup ini diisi di Netlify memakai SMTP Resend: host
`smtp.resend.com`, port 465, user `resend`, pengirim `no-reply@mail.niuva.id`,
dan `ADMIN_SMTP_PASSWORD` (API key Resend terpisah "Niuva Staging Admin SMTP",
Sending access, hanya `mail.niuva.id`) diisi Owner sebagai secret (nama
dicek). Nilai ini baru aktif setelah deploy berikutnya; pengiriman belum
diuji. Script belum dijalankan terhadap Neon staging.

Migration `20261028120000_customer_closed_consent_proofs` diterapkan ke Neon
`niuva_staging` pada 28 Oktober lewat Neon MCP (role `neondb_owner`; tanpa
kredensial melewati agent): satu transaksi berisi DDL migration persis dan
baris `_prisma_migrations` dengan checksum versi Git (`fa1f23d4…`, konvensi LF
yang sama dengan 39 migration sebelumnya). Sebelum: 39 selesai, 0 menggantung,
marker `staging`, 0 Admin/Customer/order. Sesudah: 40 selesai, 0 menggantung,
tabel dan 3 index ada, 0 baris. Atas persetujuan Owner atas daftar yang
diajukan (aturan E4), role runtime diberi `SELECT, INSERT, DELETE` pada tabel
itu (INSERT saat penutupan akun, DELETE untuk cleanup 30 hari); diverifikasi
lewat `information_schema.role_table_grants`.

Bootstrap Owner staging dijalankan Owner pada 28 Oktober di terminalnya
(connection string `neondb_owner` dan password diketik tanpa echo; binding ID
dibaca dari marker staging): keluaran "Owner staging dibuat … role=OWNER".
Pemeriksaan lewat Neon MCP: tepat satu `admin_profiles` OWNER aktif,
`emailVerified=false`. Login pertama di `/admin/sign-in` staging mengirim email
verifikasi yang diterima Owner (bukti pertama pengiriman email Admin hosted
lewat SMTP Resend `mail.niuva.id`). Owner lalu memverifikasi email, memasang
TOTP dan masuk Dashboard. Pemeriksaan Neon MCP: `emailVerified=true`,
`twoFactorEnabled=true`, satu record TOTP, satu sesi aktif `mfaVerified`.
Undangan Admin belum diuji.

Setelah login, semua halaman daftar Admin staging menampilkan "belum dapat
dimuat" (`failure_events`: `INTERNAL_ERROR` untuk `/admin`, orders, products,
customers, custom-print, reports). Penyebab yang terbukti lewat Neon MCP:
"too many connections for role niuva_staging_runtime"; role dibatasi
`CONNECTION LIMIT 5` dan lima koneksi idle dipegang instance fungsi Netlify,
sementara `src/lib/db/prisma.ts` membuka hingga 5 koneksi per instance. Atas
persetujuan Owner, batas dinaikkan ke 20 (`max_connections` Neon 901); keenam
halaman kemudian termuat. Kode: pool per instance diturunkan ke 4 (PR #75,
squash `5c05467`).

Deploy staging 2026-10-29 (atas instruksi Owner): build Netlify dinyalakan
sementara, deploy `6ae23a749093bf849be8e541` dari `main@5c05467` berstatus
`ready` (secret scan 0 temuan), lalu build dikembalikan ke Stopped
(diverifikasi setelah reload). Ke-14 tautan menu Admin staging menjawab 200
tanpa teks error dengan sesi Owner; `/terms`, `/privacy`, `/shop` 200.
Neon MCP: `niuva_staging_runtime` memegang 4 koneksi idle setelah pemeriksaan
itu.

Akses orang kedua ke staging, 2026-10-29: tim Netlify memakai paket Free
(satu anggota). Undangan Reviewer ditolak server dengan HTTP 422 "Reviewer
invitations are disabled on the Free plan temporarily", jadi tidak ada email
terkirim. Keputusan Owner: buka kunci Netlify (staging publik). Prasyaratnya:
`isSearchIndexingAllowed` (`src/lib/env/deployment.ts`) hanya mengizinkan
indeks pada tier `production` eksplisit, dan `next.config.ts` mengirim
`X-Robots-Tag: noindex, nofollow` di semua route untuk tier lain. Admin tetap
dilindungi password + TOTP; provider tetap sandbox. Kunci dibuka hanya setelah
header terbukti ada di staging.

Pelaksanaan 2026-10-29 (atas instruksi Owner): PR #76 di-squash ke
`main@c1b5cc3`; build dinyalakan sementara, deploy
`6ae24c6df4684aa6e06b5d5b` berstatus `ready` (secret scan 0 temuan), lalu
build kembali Stopped (diverifikasi setelah reload). Dengan sesi Owner, `/`,
`/shop`, `/projects`, `/services`, `/terms`, `/privacy`, `/login`,
`/admin/sign-in`, `/robots.txt`, `/sitemap.xml` dan halaman 404 mengirim
`X-Robots-Tag: noindex, nofollow`. Visibilitas Netlify lalu diubah ke
"Previews only" (production publik, Deploy Preview tetap privat). Uji anonim
dengan `curl`: `/`, `/shop`, `/terms`, `/admin/sign-in` 200 dengan header
noindex; `/admin/orders` 401 JSON `UNAUTHORIZED` dari proxy aplikasi, dan
navigasi browser ke halaman itu 307 ke `/admin/sign-in`.

Undangan Admin staging, 2026-10-29: Owner mengirim dua undangan lewat
`/admin/admins/new`. Satu diterima. Pemeriksaan Neon MCP: `admin_profiles`
berisi satu OWNER dan satu ADMIN, keduanya aktif; dua `admin_auth_users`
dengan email terverifikasi dan TOTP aktif; dua record TOTP. Undangan kedua
berstatus `SENT` dan kedaluwarsa (batas 30 menit) sebelum diterima, sehingga
perlu dikirim ulang. Alur undangan Admin hosted (kirim email, terima, pasang
TOTP) terbukti untuk satu akun.

### D3: runtime staging sadar tier dan akun Customer penguji, 2026-10-29

Temuan: guard lama `assertNonProductionProvider` menolak `NODE_ENV=production`,
dan Netlify selalu memakai nilai itu. Akibatnya Midtrans, Biteship, S3/R2,
Resend, mailer auth Customer dan mailer bisnis tertolak di staging hosted
walaupun grant E6 sudah ada. Owner memilih cakupan semua provider.

- Guard kini menerima tier eksplisit. `NODE_ENV=production` lolos hanya untuk
  `staging`; production, tier kosong/tak dikenal, dan provider live tetap
  ditolak. Resolver tetap menuntut grant, mode sandbox/mock, config dan policy.
  Diterapkan di Midtrans, Biteship, S3, Resend, mailer auth Customer dan mailer
  bisnis. Aktivasi pricing rule (E7) tetap khusus lokal, menjadi blocker T34
  terpisah.
- E1: env `NIUVA_STAGING_CUSTOMER_EMAILS` (1–10 alamat, dipisah koma, tidak di
  Git) dibaca hanya pada tier `staging`. Registrasi dan login email/password,
  serta email auth dan bisnis, hanya untuk alamat itu. Tanpa daftar valid,
  jalur Customer staging tertutup. Registrasi staging memakai policy v1.0 yang
  sudah terbit (`/terms`, `/privacy`). Grant staging bertambah `signup` dan
  `passwordAuth` (rujukan bagian ini, E1); `googleAuth`, refund, privacy dan
  analytics tetap tanpa grant. Di tier hosted, register/login memanggil
  resolver; production tetap tertutup.
- Variabel tidak dimasukkan ke skema startup supaya salah ketik tidak
  menjatuhkan seluruh staging; nilai tidak valid sama dengan tertutup.
- Verifikasi lokal: lint 0 error/4 warning lama; typecheck lulus; unit 133
  file/1.493 tes; backend 117/925 (termasuk
  `tests/backend/staging-customer-access.test.ts` baru); integration 58/522 di
  DB terisolasi `niuva_d1_proxy_test_20261028` (`niuva_test` bawaan memuat
  migration lama gagal P3009 dan tidak di-reset); build lulus;
  `check:memory` lulus. Hosted belum diverifikasi: perlu deploy, isi env daftar
  penguji di Netlify, lalu uji daftar/verifikasi/login. Email verifikasi masuk
  outbox dan terkirim setelah job outbox staging dipicu manual (E9).
- Hosted 2026-10-29: PR #77 di-squash ke `main@2a4f5fd`. Owner mengisi
  `NIUVA_STAGING_CUSTOMER_EMAILS` di Netlify (nama dicek, nilai tidak dibaca).
  Deploy `6ae261a88dfd70019071df2a` ready, tetapi `/register` masih "belum
  tersedia": `NIUVA_OUTBOX_ENCRYPTION_KEY_ID`/`NIUVA_OUTBOX_ENCRYPTION_KEY`
  belum ada, sehingga produsen outbox gagal. KEY_ID (`staging-2026-10`, bukan
  secret) ditambahkan; KEY (32 byte acak) dibuat Owner lewat script lokal tanpa
  echo dan disimpan sebagai secret Production. Deploy
  `6ae265df76187b2b2e7d26e8` ready dan `/register` terbuka. Nilai `CRON_SECRET`
  lama tidak tersimpan Owner, jadi Owner merotasinya lewat script lokal yang
  menyimpan salinan terenkripsi DPAPI di komputer Owner; deploy
  `6ae2688cf86177688ff78736` ready. Setiap deploy menyalakan build sementara
  lalu mengembalikannya ke Stopped. Uji daftar/verifikasi/login penguji belum
  dijalankan.
- Uji daftar pertama gagal 403 `ORIGIN_NOT_ALLOWED`. Log Netlify: semua
  `POST /api/auth/email/register` 403; `POST /api/admin/notifications` juga
  403 `ORIGIN_NOT_ALLOWED` sejak 28 Okt. Penyebab: di fungsi Netlify,
  `request.url` tidak sama dengan origin browser, sedangkan
  `isSameOriginRequest` hanya membandingkan keduanya. Perbaikan (branch
  `claude/hosted-canonical-origin`): pada tier eksplisit `staging`/`production`
  dengan `APP_URL` valid, origin kanonik itu juga diterima (tidak pernah dari
  Host/forwarded header), dan redirect auth Customer memakai origin kanonik.
  Lokal: lint 0 error/4 warning lama, typecheck, unit 133/1.493, backend
  117/927, integration 58/522 (DB terisolasi), build lulus (percobaan build
  pertama gagal kehabisan memori karena sempat berjalan bersamaan dengan
  integration; diulang sendirian). Hosted belum diverifikasi.
- PR #78 di-squash ke `main@7bb7f1f`; deploy `6ae27c314fdce519c53f749d` ready
  (secret scan 0), build kembali Stopped. Uji `curl` tanpa data: origin
  kanonik melewati pemeriksaan origin (303 ke `/register?error=validation`),
  origin asing tetap ditolak (303 `error=origin_not_allowed`); redirect memakai
  origin kanonik. Daftar penguji sungguhan belum diuji.
- Daftar penguji pertama berhasil: satu `customer_pending_registrations`
  (policy v1.0) dan dua `AUTH_VERIFY` PENDING di outbox (daftar + kirim ulang).
  Pemicu job manual (E9) memakai script lokal Owner yang membaca salinan DPAPI
  `CRON_SECRET`; body mengikuti contoh `docs/backend/batch-2-operations.md`
  (`jobPolicy` 30000/0/1000, `workerPolicy` 10000/5000/[]), bukan jadwal.
  Percobaan awal: 422 (body salah dari script), lalu 503 karena
  `NIUVA_JOB_DATABASE_ROLE` belum ada; Owner mengizinkan menambah
  `niuva_staging_runtime` (bukan secret) dan deploy
  `6ae285f0ba86cb5819fbff10`. Percobaan berikutnya masih 503 tanpa log
  aplikasi (durasi 4,4 s pada request pertama setelah deploy; penyebab belum
  diverifikasi, dugaan cold start/compute Neon bangun). Pemeriksaan role,
  grant (lock, klaim job state, kunci outbox; diuji dalam blok yang
  dibatalkan) dan keputusan `scheduledJobs` lolos. Percobaan berikutnya
  `completed`: scanned 2, accepted 1, cancelled 1. DB: pesan terbaru
  `ACCEPTED` dengan provider reference, pesan lama `CANCELLED`
  (`PROOF_INVALID`, tautan sudah diganti), `delivery_confirmed=true`.
  Penerimaan email, verifikasi dan login belum dikonfirmasi Owner.
- Owner mengonfirmasi email diterima, verifikasi dan login berhasil. Neon MCP:
  satu `customers` dengan `email_verified_at`, satu
  `customer_password_credentials`, satu sesi aktif, consent
  `NIUVA-TERMS-v1.0`/`NIUVA-PRIVACY-v1.0`, pending registration `completed`.
  Alur akun Customer penguji staging (daftar → email → verifikasi → login)
  terbukti untuk satu akun. Checkout/pembayaran (T33) belum diuji; katalog
  staging masih kosong.

### Impor katalog Shop ke staging, 2026-10-29

Keputusan Owner (28 Okt): kedelapan produk dataset siap jual tanpa draft;
listing custom figure tetap dijual di Shop, sedangkan Custom Print/MAKE hanya
untuk desain dari customer (dikonfirmasi 29 Okt: hapus referensi produk dari
Custom Print). Dimensi paket memakai perkiraan yang dapat diubah Owner di
Admin.

- `catalog-publish-decisions.json`: 8 `PUBLISH_READY_MADE`, `approvedAt`
  2026-10-28. `catalog-package-estimates.json`: 34 SKU, kelas
  gantungan kunci 12×8×4, figur 8 cm 12×10×10, figur 12 cm 16×12×12,
  figur 15 cm 19×14×14 (cm). `catalog:prepare` meregenerasi manifest:
  8 produk published, 34 varian berdimensi, 50 media. `catalog:prepare` dan
  `db:seed:catalog` sempat rusak sejak PR #33 karena alias `@/` di rantai
  `catalog/seed` → `inventory/movement` → `inventory/lock-variant`; diganti
  import relatif.
- `/custom-print` tidak lagi menampilkan bagian "Inspirasi produk custom";
  kedua form pengajuan menyembunyikan pilihan produk dan mengirim
  `CUSTOM_UNSPECIFIED` bila daftar kosong. Link lama `?product=<id>`
  diabaikan. Lima produk baru di Shop memakai nama/deskripsi kanonik; copy
  kurasi untuk kelimanya belum ada (tindak lanjut editorial).
- Jalur impor: `corepack pnpm staging:import-catalog`
  (`src/modules/catalog/staging-import.ts`): konfirmasi literal, tier staging
  eksplisit, `sslmode=verify-full`, binding marker (helper bersama dengan
  bootstrap Owner), advisory lock, upsert idempoten, menolak katalog
  published tanpa dimensi; transaksi binding kini menerima `timeout`.
- Verifikasi lokal (satu per satu): lint 0 error/4 warning lama; typecheck;
  unit 133/1.493; backend 118/930 (termasuk
  `tests/backend/staging-catalog-import.test.ts`); integration 59/524 di DB
  terisolasi (termasuk `tests/integration/staging-catalog-import.test.ts`:
  4 kategori, 8 produk published, 34 varian berdimensi, 50 media, 34 stock
  opening, impor kedua idempoten, binding salah menolak tanpa menulis);
  build lulus; `check:memory` lulus. Browser lokal (`next dev`):
  `/custom-print` tanpa bagian inspirasi dan tanpa tombol "Ajukan untuk
  Review" per produk, desktop dan 375 px tanpa overflow horizontal. Form
  pengajuan (butuh login Customer) tidak dibuka di browser. Tampilan belum
  direview Owner.
- PR #79 di-squash ke `main@60f0249` (CI sempat gagal di dua E2E Custom Print
  yang masih mengharapkan kartu produk; diperbarui dan 7 E2E lokal lulus).
  Impor hosted 2026-10-29: Owner menjalankan script lokal (connection string
  runtime tanpa echo, `sslmode` dinaikkan ke `verify-full`, binding dari
  marker, konfirmasi literal diketik Owner). Neon MCP: 4 kategori, 8 produk
  published, 34 varian aktif berdimensi, 50 media, 34 `OPENING_BALANCE`,
  total stok 172. `/shop` staging menampilkan 8 tautan produk setelah ISR
  memperbarui cache; satu halaman detail dan satu gambar produk 200. Kuotasi
  ongkir Biteship dengan dimensi ini belum diuji (bagian T33). Perubahan
  `/custom-print` baru tayang setelah deploy berikutnya.
- **Deploy staging `main@60f0249`, 2026-10-29 (izin Owner):** builds Netlify
  diaktifkan sementara; deploy `6ae31cbe32f23ff10942d962` (commit
  `60f02491`) berstatus `ready`, published 10:16:55 UTC, secret scan 0
  temuan; build status dikembalikan ke **Stopped** dan log tetap privat
  (dicek setelah muat ulang). Pemeriksaan anonim: `/`, `/shop`,
  `/custom-print`, `/login`, `/terms`, `/privacy`, `/admin/sign-in` 200;
  `/api/admin/account` 401; header CSP, HSTS, `X-Frame-Options`,
  `X-Robots-Tag: noindex, nofollow` ada. `/custom-print` tidak lagi memuat
  heading referensi produk maupun tautan "Ajukan untuk Review"; `/shop`
  memuat 8 tautan produk; `/custom-print/request` tanpa sesi 307 ke
  `/login?returnTo=...`. Form intake dengan sesi Customer penguji belum
  diperiksa di hosted.
- **Policy email bisnis staging, 2026-10-29 (Owner "Ya, 24 jam"):**
  `businessPolicy.maxAgeMs` = 86.400.000 (24 jam, batas teknis
  `docs/backend/business-notifications.md`) untuk pemicu manual
  `OUTBOX_BUSINESS` di staging; dry-run dulu sebelum execute. Bukan nilai
  production atau jadwal. Script lokal Owner `run-business-job.ps1` (di luar
  Git) mewajibkan nilai ini diisi eksplisit. Belum dijalankan; baseline DB
  sebelum T33: 0 order, 0 payment attempt, 0 reservasi, 34 stock movement,
  2 pesan outbox.
- **T33 BUY pertama, 2026-10-29 (akun penguji, staging hosted):** order
  `ORD-20261029-3A6HAD6P` RETAIL, 1 item Rp124.800 + ongkir Biteship
  Rp11.000 = Rp135.800 (kuotasi ongkir hosted pertama). BCA VA dibayar lewat
  simulator Midtrans sandbox (percobaan dari aplikasi bank asli ditolak bank,
  tanpa debit). Neon MCP: dua webhook diproses (`PENDING`, lalu `SETTLED`
  17.46 WIB); payment `PAY-20261029-EF85JRTN` SETTLED dengan ID transaksi;
  order PAID; reservasi CONSUMED; stok SKU `103339597167` 5→4 lewat
  `ORDER_CONSUMPTION` yang tertaut order. Order percobaan
  `ORD-20261029-Q9XZKMBA` (Rp46.200) tidak dibayar dan dibiarkan kedaluwarsa.
  `OUTBOX_BUSINESS` dry-run: scanned 3. Execute (limit 10) **gagal**
  `JOB_FAILED`: isi job 7,3 s, melewati timeout transaksi interaktif Prisma
  5 s (functions Ohio, database Singapura); rollback bersih (0 baris bisnis,
  0 sesi idle in transaction). Perbaikan: `BoundDatabaseService` memberi
  transaksi outbox/job `maxWait` 10 s dan `timeout` 20 s
  (`src/modules/database-binding/service.ts`). Tiga execute ulang dengan
  limit 1 juga `JOB_FAILED` (isi job 7,07 s; request 9,4–11,3 s), konsisten
  dengan transaksi yang diputus di 5 s, bukan jumlah kandidat; satu webhook
  Midtrans juga butuh 3,5 s. Dengan timeout 20 s, execute hosted sebaiknya
  tetap limit 1–2 selama function dan database berbeda region. Email
  bisnis, BUY kedua dan perbaikan di hosted **belum diverifikasi**.
- **Deploy #81 dan email bisnis T33, 2026-10-29:** PR #81 di-merge
  (`3d997ca`); deploy staging `6ae3459371776d9eb3e09ae1` (commit `3d997ca`)
  `ready`, published 13:11:07 UTC, secret scan 0 temuan; build status kembali
  **Stopped**, log privat (dicek setelah muat ulang). `/`, `/shop`, `/login`
  200; `/account` 307; endpoint job tanpa token 401. `OUTBOX_BUSINESS`
  (maxAge 24 jam) dry-run scanned 3, lalu tiga execute limit 1 **completed**
  (11,1/13,2/12,5 s; enqueued 1 per run, `remainingDue` 3→0). Satu run
  `OUTBOX_DELIVERY` limit 10: di DB job sukses 13:17:36–13:18:02 (claimed 3,
  accepted 3, failed 0, lease kosong, tanpa sesi menggantung), tetapi request
  hosted berakhir **502** setelah 30,7 s (log Netlify) karena function
  diputus sekitar 30 s; satu kirim butuh 7–8,5 s. Resend: tiga email
  `delivered` ke akun penguji (order received untuk `ORD-20261029-Q9XZKMBA`
  dan `ORD-20261029-3A6HAD6P`, payment confirmed untuk
  `ORD-20261029-3A6HAD6P`). Run ulang dengan antrean kosong completed dengan
  semua hitungan 0. Script lokal pengirim kini default limit 2 (maksimum 2).
  Status order/stok/payment BUY pertama sudah tercatat di atas; BUY kedua
  dan pembacaan inbox oleh Owner **belum diverifikasi**. Batas waktu function
  dibanding jumlah kiriman per run adalah risiko hosting terbuka selama
  function dan database berbeda region.

### Audit backlog dan papan fokus, 2026-10-29

Atas permintaan Owner, backlog diaudit terhadap bukti staging 28–29 Oktober
(`main@3e4c667`). Hasilnya dimuat pada bagian "Fokus aktif". Perubahan status:

- T03: BLOCKED_EXTERNAL → IN_PROGRESS.
- T31: BLOCKED_INPUT → IN_PROGRESS.
- T14: BLOCKED_EXTERNAL → BLOCKED_INPUT (grant `privacy`).
- T39: BLOCKED_INPUT → TODO.

Tidak ada task yang ditutup.

Dua penghambat teknis baru dicatat:

- **B1:** `assertPricingRuleDevelopmentEnvironment` di
  `src/modules/pricing/admin-service.ts` menolak `NODE_ENV=production` dan
  database selain loopback development (`LOCAL_SETUP_DISABLED`),
  sehingga MAKE (T34) belum dapat dihitung di staging. Perlu jalur impor
  staging berbinding seperti `staging:import-catalog`, memakai nilai Pricing v1
  yang sudah disetujui tanpa nilai baru.
- **B2:** function hosted diputus sekitar 30 s, sedangkan satu kiriman outbox
  di staging butuh 7–8,5 s (function Ohio, database Singapura). Batch
  `OUTBOX_DELIVERY`/`OUTBOX_BUSINESS` perlu time budget per run sebelum
  dijadwalkan (D07).

Lokasi hosting production (Q5) memengaruhi latensi, backup T38 dan
PUB-RECORDS. Belum diputuskan.

### Gelombang 1: bukti hosted cepat, 2026-10-29

Staging `main@3d997ca`. Job dipicu manual (E9) lewat script lokal di luar Git
yang membaca salinan DPAPI `CRON_SECRET` tanpa mencetaknya. Policy
`jobPolicy` 30000/0/1000; execute limit 1. Pemeriksaan DB lewat Neon MCP.

- **T07 `INVENTORY_RESERVATIONS`:**
  - dry-run: scanned 1;
  - execute: released 1, `remainingDue` 0, completed (14:51:08–14:51:16 UTC, request 12,2 s);
  - hasil DB untuk `ORD-20261029-Q9XZKMBA`:
    - order CANCELLED;
    - attempt EXPIRED;
    - reservasi RELEASED;
    - SKU `103343689816` `stock_on_hand` 5, reservasi aktif 0;
  - `ORD-20261029-3A6HAD6P` tetap PAID/CONSUMED;
  - lease kosong;
  - execute ulang: scanned 0 (aman diulang);
  - sisa: cadence dan scheduler production (E9, Q5).
- **T24 `PAYMENT_RECONCILIATION`:**
  - dry-run: scanned 1;
  - execute: state `failed`, `OUTCOME_UNKNOWN`, unknown 1, request 17,7 s;
  - receipt `payment_reconciliation_checks`: outcome `NOT_FOUND` untuk attempt EXPIRED `ORD-20261029-Q9XZKMBA` yang tidak pernah punya transaksi Midtrans (Snap ditinggalkan, `provider_transaction_id` kosong);
  - artinya panggilan Get Status hosted sampai ke Midtrans sandbox, dan lease kosong;
  - sesuai kontrak (`docs/backend/payment-reconciliation.md`), 404 = belum diketahui dan tidak ada batas umur, sehingga attempt seperti ini tetap kandidat;
  - **B5:** setiap checkout yang ditinggalkan membuat job `failed` di setiap run dan menambah backlog serta alarm `PAYMENT_RECONCILIATION_LAG` tanpa akhir;
  - perlu batas waktu dari Owner (Q10) sebelum dijadwalkan;
  - jalur `found` (PENDING/SETTLED) belum diuji hosted; rencananya saat BUY #2 dengan VA.
- **T10 rate limit:**
  - tujuh POST anonim ke `/api/account/claim` (limit 5/menit) dengan Origin staging: 1–5 → 401, 6–7 → 429 `RATE_LIMITED`;
  - bucket di `request_rate_limits` bersama: count 6, kunci HMAC 64 karakter, bukan IP mentah;
  - **B4 (keamanan):** dengan bucket IP asli sudah 429, request yang membawa `X-Forwarded-For` atau `X-Real-IP` palsu kembali 401, artinya lolos limiter;
  - penyebab: `extractIpCandidate` (`src/lib/security/actor-key.ts`) memercayai kedua header itu, padahal klien dapat mengisinya di Netlify;
  - semua rate limit publik (auth, checkout, MAKE) dapat diakali sampai B4 diperbaiki.
- **D02:**
  - tanpa JavaScript (HTML server lewat `curl`), `/services` memuat 9 dan `/` memuat 5 tautan `wa.me` ke nomor yang sama dengan `company-content.ts`;
  - `/project-brief` 307 ke `/services`;
  - `POST /api/project-brief` 410;
  - kebenaran nomor bisnis tetap pengetahuan Owner.
- **T09 (auth):** `CUSTOMER_AUTH_CLEANUP` tidak punya endpoint HTTP, hanya CLI `scripts/cleanup-internal-auth.ts` dengan kredensial DB. Belum dijalankan.

### Gelombang 2: merge #83–#86 dan deploy staging, 2026-10-29

Atas instruksi Owner ("Ya, merge & deploy"), keempat PR di-squash setelah CI
Quality hijau:

- #84 (B4) → `9c5c431`;
- #85 (B2) → `fc3b7ec`;
- #86 (B1) → `56ccfdb`;
- #83 (papan) → `82dd380`.

Sebelum deploy, `main@82dd380` gabungan lulus typecheck dan backend (120 file,
947 tes) di worktree lokal.

Deploy staging `6ae3752445110f8bfc4fbe8c` (commit `82dd380`) berstatus `ready`,
published 16:34:09 UTC, secret scan 2.147 file tanpa temuan. Build dikembalikan
ke **Stopped** dan log tetap privat (dicek setelah muat ulang).

- **B4 / T10:**
  - tujuh POST anonim ke `/api/account/claim` (limit 5/menit): 1–5 → 401, 6–7 → 429;
  - dengan bucket asli sudah 429, `X-Forwarded-For`, `X-Real-IP` dan `x-nf-client-connection-ip` palsu, sendiri-sendiri maupun bersamaan, **tetap 429**: satu baris `request_rate_limits` (count 6, kunci 64 karakter);
  - Netlify menimpa `x-nf-client-connection-ip` kiriman klien;
  - baris bucket uji siang (kunci IP asli dan kunci header palsu) sudah terhapus oleh pembersihan saat konsumsi; yang tersisa hanya bucket uji terbaru;
  - T10 ditutup DONE; identitas instance tidak diamati terpisah.
- **B2:**
  - script lokal kini mengirim `workerPolicy.runBudgetMs` 18000 (limit 10) dan `businessPolicy.runBudgetMs` 15000 (execute limit 10), dengan sisa ruang untuk cold start, lease dan respons di bawah batas function sekitar 30 s;
  - `OUTBOX_BUSINESS` dry-run completed (scanned 0, `deferred` 0);
  - `OUTBOX_DELIVERY` execute completed dengan semua hitungan 0 dan `deferred` 0, request 7,8 s;
  - antrean kosong, jadi penghentian di budget dengan pesan sungguhan **belum diverifikasi**; rencananya saat BUY #2.
- **B1:**
  - `staging:activate-pricing` ada di `main`;
  - staging masih 0 `pricing_rule_versions`;
  - Owner menjalankannya dengan kredensial sendiri dan mengetik quantity semantics;
  - tidak perlu deploy;
  - belum dijalankan.

### Aktivasi pricing MAKE di staging (B1), 2026-10-30

Owner meminta agen yang menjalankan aktivasi ("saya beri perintah eksplisit
dan kebebasan untuk hal itu").

Script `staging:activate-pricing` **tidak dijalankan**. Agen tidak memegang
`DATABASE_URL` staging, tidak membuka secret, dan pemeriksa izin otomatis
menolak menjalankan script di terminal Owner. Sebagai gantinya, transaksi
`activateStagingPricingRule` dijalankan sebagai satu blok `DO` lewat Neon MCP,
dengan role `niuva_staging_runtime` pada `niuva_staging`. Kredensial tetap di
sisi Neon. Blok itu mengikuti script langkah demi langkah:

- membaca marker `deployment_database_bindings` (`FOR SHARE`) dan menolak bila
  tier bukan `staging`. Binding ID tidak dibandingkan dengan env Netlify;
  target dipilih eksplisit lewat project, branch dan database Neon;
- advisory lock `hashtext('niuva-custom-print-rates')`;
- tepat satu Owner aktif, dicatat sebagai approver;
- menolak bila sudah ada `CUSTOM_PRINT_V1` ACTIVE atau v1;
- insert v1 ACTIVE ditambah audit `pricing-rule.activated` dengan metadata
  `operation: activate-staging`, `quantitySemantics: PER_UNIT`, dan
  `executedVia: neon-mcp`.

Definisi JSON berasal dari `customPrintV1Definition("PER_UNIT")` (kode
aplikasi lewat jiti, tanpa DB), bukan diketik tangan.

`PER_UNIT` dipilih agen atas kebebasan dari Owner, dan bukan nilai baru:

- Owner mengaktifkan `PER_UNIT` di development pada 2026-09-19
  (`docs/backend/phase-3-pricing-biteship-contract.md`);
- preview Customer di Tech Design hanya menghitung bila semantiknya
  `PER_UNIT`.

Bukti Neon MCP (read-only):

- 1 baris `pricing_rule_versions`: `CUSTOM_PRINT_V1` v1, ACTIVE, `PER_UNIT`;
- `approved_at` 2026-10-29T19:24:08Z, dengan approver Owner aktif;
- 1 audit cocok: entity, actor, `operation`, dan `after_json.definition` sama
  dengan rule.

Belum diverifikasi:

- preview estimasi hosted, yang butuh sesi Customer; akan teruji di T34;
- script `staging:activate-pricing` di hosted, yang sejauh ini hanya teruji
  di tes lokal/integration. Bila dijalankan nanti dengan `PER_UNIT`, hasilnya
  idempoten ("sudah aktif").

### B5 dan grant staging Q2–Q4, 2026-10-30

Atas keputusan Owner Q2–Q4 dan Q10 ("Ya, kerjakan"), branch
`claude/b5-grants-q-decisions`:

- **B5 / T24:** `PAYMENT_RECONCILIATION` tidak lagi memilih attempt `EXPIRED`
  tanpa `provider_transaction_id` yang dibuat lebih dari 7 hari lalu
  (`ABANDONED_ATTEMPT_RECONCILIATION_WINDOW_MS` di
  `src/modules/payment/reconciliation-repository.ts`). Backlog/monitoring
  memakai filter yang sama. Attempt dengan transaksi, attempt `CANCELLED`, dan
  attempt `EXPIRED` yang lebih muda tetap diperiksa.
- **Grant:** `ACTIVATION_GRANTS.staging` menambah `refund`, `privacyRights`,
  `privacyProof` dan `googleAuth` (tanggal 2026-10-30, rujukan papan fokus).
  `googleAuth` tetap ditolak (`CONFIG_INCOMPLETE`) sampai env Google OAuth
  staging dan redirect URI diisi Owner; `refund` memakai config Midtrans yang
  sudah ada; `privacyProof` butuh Resend yang sudah ada.
- Bukti lokal:
  - typecheck lulus; lint 0 error/4 warning lama;
  - unit 133/1.508 dengan 2 kegagalan di `tests/unit/activation-grants.test.ts`
    (ekspektasi daftar grant lama); ekspektasi diperbarui dan file itu lulus
    8/8;
  - backend 119/947 dengan 1 kegagalan di `tests/backend/staging-preflight.test.ts`
    (`privacyRights` kini terbuka); diperbarui dan file itu lulus 44/44;
  - suite unit/backend penuh belum diulang setelah perbaikan; CI menjadi
    gate-nya;
  - integration `payment-reconciliation` 15/15 (termasuk tes baru 7 hari) dan
    `customer-outbox-flow` 10/10 di database test terisolasi;
  - build lulus.
- Hosted belum diverifikasi sampai merge dan deploy.

### Deploy PR #89, build otomatis Q8 dan cek Helipod, 2026-10-30

- **Q8:** pengaturan Netlify staging diubah dan dicek ulang setelah muat
  ulang: Build status **Active**, log privat, Branch deploys "Deploy only the
  production branch", Deploy Previews "Don't deploy pull requests".
- **PR #89** di-squash ke `main@b7d1de6` (merge dari akun Owner setelah CI
  Quality hijau). Merge itu otomatis memicu deploy `6ae3cbfc5cb2636cd21101f7`
  (context production, branch `main`), `ready` 22:44:38 UTC, secret scan 2.166
  file tanpa temuan. Build otomatis dari merge (Q8) terbukti.
- **B5 hosted:** dry-run `PAYMENT_RECONCILIATION` completed, scanned 1,
  `remainingDue` 1: attempt EXPIRED `ORD-20261029-Q9XZKMBA` masih di bawah
  7 hari sehingga tetap kandidat, sesuai aturan. Pengecualian setelah 7 hari
  baru bisa diamati setelah 5 November 2026; belum diverifikasi.
- **Grant Q2–Q4 hosted:** belum diverifikasi lewat alur pengguna; login Google
  tetap butuh env OAuth dan redirect URI dari Owner.
- **Q5 (hosting production), riset belum diputuskan:**
  - Helipod (PT Samudra Inovasi Terpadu, Jakarta) dicek lewat jawaban support
    (berlabel AI), halaman harga, docs, dan MCP Helipod baca-saja di akun
    Owner (tanpa membuat resource). Database Helipod adalah Neon lewat agen;
    region tidak bisa dikonfirmasi; API database tidak punya endpoint
    restore/PITR; retensi riwayat tidak tertulis; kredit compute prabayar
    habis berarti database di-suspend; paket Starter 50 CU-jam, Growth
    100 CU-jam.
  - Rekomendasi agen: aplikasi di Helipod Apps, database di akun Neon Launch
    milik Niuva (PITR sampai 7 hari, scale-to-zero bisa dimatikan), plus
    backup harian ke S3 Jakarta. Perkiraan Rp235–615 ribu/bulan; belum
    diverifikasi. Menunggu keputusan Owner.
  - MCP Helipod didaftarkan scope lokal proyek ini (bukan Git).

### Keputusan Q5: satu VPS Jakarta, 2026-10-30

Owner memilih PostgreSQL self-managed di VPS Jakarta, lalu menjalankan
aplikasi di VPS yang sama ("Ya, satu VPS").

- **Harga resmi:** dibaca lewat MCP Helipod `list_vps_plans` (baca saja),
  harga bayar bulanan. VPS S Rp79.900, A Rp99.900, **B Rp118.900**,
  D Rp193.900. Diskon 3 bulan 7%, 6 bulan 10%, tahunan 20%. Harga di
  screenshot dashboard adalah harga tahunan.
- **Jaringan:** paket Jakarta bertanda `nat_network`. Docs port forwarding
  Helipod menyatakan server berbagi IPv4, port 80/443 dirutekan per domain,
  dan TLS diteruskan apa adanya (sertifikat dipegang server). SSH dan port TCP
  lain lewat port forward pada `portRange`. Belum diuji di server nyata.
- **Pertimbangan:** 2 GB terlalu sempit untuk aplikasi + database, jadi build
  aplikasi tidak dijalankan di VPS. Rancangan build/deploy belum dibuat; jalur
  CI yang menyentuh `.github/workflows/` butuh instruksi terpisah.
- **Konsekuensi:** perawatan server (update keamanan, pemantauan, backup,
  uji restore, perpanjangan) menjadi tanggung jawab operasional Niuva. Ini
  memengaruhi T38/T39. Database Helipod dan Neon tidak dipakai untuk
  production.
- **Belum:** pembelian VPS, provider S3 Jakarta (IDCloudHost atau Biznet Gio),
  rancangan deploy, dan biaya total terverifikasi.

### Checklist keamanan dan SEO untuk VPS (Q5), 2026-10-30

Owner meminta checklist ini dicatat ("Ya, catat"). Isinya rencana kerja,
belum ada yang dikerjakan.

- **Sudah ada di kode dan ikut pindah ke VPS:**
  - header keamanan (`src/lib/security/headers.ts`, sudah terbukti di
    staging);
  - rate limit di endpoint publik dan sensitif;
  - TOTP untuk Admin;
  - revalidasi server untuk harga, stok, ongkir dan Midtrans;
  - storage file privat dengan signed URL;
  - `robots.txt` dan `sitemap.xml` dengan origin kanonik;
  - metadata judul, deskripsi dan Open Graph `id_ID`.
- **Wajib diubah sebelum pindah:**
  - `src/lib/security/client-ip.ts` hanya mempercayai header Netlify
    `x-nf-client-connection-ip` di tier hosted. Di VPS header itu tidak ada,
    sehingga rate limit dan Better Auth tidak bisa membedakan pengunjung.
  - Jaringan NAT Helipod meneruskan TLS apa adanya. Apakah server menerima
    IP asli klien, misalnya lewat PROXY protocol, **belum diverifikasi** dan
    perlu ditanyakan ke Helipod.
  - Opsi yang diusulkan agen: Cloudflare (paket gratis) di depan domain.
    Kode lalu mempercayai `CF-Connecting-IP` hanya untuk koneksi dari
    rentang IP Cloudflare. Cara ini belum diputuskan Owner. Untuk
    `niuva.id`, opsi ini berarti memindahkan nameserver dari Rumahweb ke
    Cloudflare dan memasang ulang record Resend `mail.niuva.id`. Itu
    perubahan DNS yang butuh instruksi Owner.
- **Server, pengganti peran Netlify:**
  - Caddy sebagai reverse proxy dengan HTTPS Let's Encrypt otomatis;
  - firewall yang hanya membuka 80, 443 dan port SSH; PostgreSQL hanya
    lewat localhost;
  - SSH khusus key, tanpa password, plus fail2ban;
  - unattended-upgrades;
  - env production di server dengan izin file ketat, tidak masuk Git;
  - `pg_dump` harian terenkripsi ke S3 Jakarta, ditambah latihan restore
    (T38);
  - monitor uptime eksternal.
- **Domain:** Owner menegaskan domain Niuva sudah dibeli di Rumahweb
  (30 Oktober). Domain production adalah `niuva.id` (PRD; Manajemen DNS
  Rumahweb sudah aktif dan dipakai untuk `mail.niuva.id` sejak 28 Oktober).
  Tanpa Cloudflare, cukup record A `niuva.id` (dan `www`) ke IP VPS di
  Rumahweb. Tanggal kedaluwarsa dan auto-renew domain belum diverifikasi.
- **SEO yang belum ada:**
  - verifikasi Google Search Console dan Bing Webmaster, lalu kirim
    sitemap;
  - gambar Open Graph (menunggu aset yang disetujui Owner);
  - data terstruktur JSON-LD untuk Organization/LocalBusiness dan Product;
  - Google Business Profile. Ini langkah Owner, memakai data usaha yang
    benar.
- **Biaya:** Cloudflare, Let's Encrypt, Search Console dan monitor uptime
  versi gratis bernilai Rp0. Domain tidak perlu dibeli lagi; biaya
  perpanjangan `niuva.id` di Rumahweb belum diverifikasi. Harga paket gratis
  pihak ketiga belum diverifikasi ulang.

### T42 scheduler: jadwal job production, 2026-10-30

Atas permintaan Owner ("Ya, kerjakan T42") dan persetujuan rencana yang memuat
tabel jadwal Q14.

- **Kode:**
  - `src/modules/jobs/schedule.ts` memuat `JOB_SCHEDULES` per tier. Hanya
    `production` terisi; staging tetap manual (E9). Jadwal divalidasi dengan
    parser runner yang sama, setiap job paling banyak satu kali, dan job
    provider maksimal limit 10 seperti adapter HTTP.
  - Jarak minimum = cadence dikurangi 30 detik, supaya tick per menit tidak
    melewatkan giliran saat run selesai beberapa detik setelah tick.
  - `runJobScheduleTick` menjalankan entri berurutan lewat
    `OperationalJobRuntime.run`. `busy`/`cooldown` berarti belum waktunya;
    job gagal tidak menghentikan job lain; diakhiri `inspect` untuk alarm.
  - Route `POST /api/internal/jobs/schedule` (bearer `CRON_SECRET`, body
    `{}`) menjalankan satu tick jadwal tier ini. Tier tanpa jadwal mendapat
    503 sebelum runtime dibuat. Route ini juga menjadi jalur HTTP pertama
    untuk `CUSTOMER_AUTH_CLEANUP` dan `CUSTOMER_PRIVACY_CLEANUP`.
- **Perbaikan rujukan:** grant Q2–Q4 merujuk anchor papan lama yang hilang
  setelah PR #91. Rujukan kini `TASKS.md#keputusan-owner-paket-q`, judul
  stabil di papan fokus.
- **Production tetap tertutup:** grant production kosong, jadi tick di
  production gagal aman sampai aktivasi T40.
- **Belum diverifikasi:** timer systemd, tick di VPS sungguhan, dan
  pemblokiran `/api/internal/*` dari luar di Caddy (T41). Contoh unit ada di
  `docs/backend/batch-2-operations.md` bagian "Jadwal production di VPS".
- **Merge dan staging:** PR #92 di-squash ke `main` sebagai `2920fc2` setelah
  CI Quality hijau pada head `b862308`. Deploy otomatis
  `6ae48db32a82d195745b4416` berstatus ready, secret scan 2.227 file tanpa
  temuan. Di staging, `POST /api/internal/jobs/schedule` tanpa bearer 401;
  dengan `CRON_SECRET` (dibaca dari salinan DPAPI, tidak dicetak) 503
  `PROVIDER_UNAVAILABLE`, karena staging tidak punya jadwal. Tidak ada job
  yang berjalan.

### Perbandingan S3 Jakarta (Q12/Q13), 2026-10-30

Atas permintaan Owner ("Ya, bandingkan S3"). Harga dari halaman resmi atau
sumber yang disebut; tidak ada akun yang dibuat dan tidak ada tes langsung.

| Penyedia | Lokasi | Harga | Cara bayar | Fitur yang terdokumentasi |
| --- | --- | --- | --- | --- |
| Biznet Gio NEO Object Storage | Indonesia, beberapa endpoint; kantor Jakarta | Rp1.000/GB/bulan single region; Rp2.000 multi 2 region; Rp3.000 multi 3 region | Tagihan bulanan ke metode bayar terdaftar (KB Biznet Gio; default kartu kredit) | "100% S3 compatible"; CORS, presigned URL, versioning, object lock, lifecycle tidak disebut |
| IDCloudHost Object Storage (IS3) | Jakarta | Rp500/GB/bulan (halaman resmi; Rp507 pada catatan pengguna 2021–2023) | Saldo prabayar | S3-compatible; catatan pengguna 2021–2023: tanpa static website/CNAME, satu kunci untuk semua bucket, dokumentasi tipis, gangguan 503 Februari 2022 |
| Cloudflare R2 (dipakai staging) | Asia Pasifik | Gratis 10 GB, 1 juta operasi kelas A, 10 juta kelas B per bulan; lalu US$0,015/GB; egress gratis | Kartu, USD | Presigned URL, CORS, `If-None-Match`, Content-MD5, lifecycle; tanpa versioning dan object lock |

- **Volume Niuva:** dump database terkompresi diperkirakan kecil (puluhan
  sampai ratusan MB) dan disimpan 30 hari, ditambah arsip pembukuan. Perkiraan
  5–30 GB, jadi biaya Biznet Gio sekitar Rp5–30 ribu/bulan dan IDCloudHost
  separuhnya. Angka volume belum diverifikasi.
- **Syarat aplikasi** (`docs/backend/object-storage-contract.md`): signed PUT/GET
  SigV4, CORS untuk origin aplikasi, HEAD, DELETE, Content-MD5 dan
  `If-None-Match` pada publish media. Kedua penyedia Jakarta belum
  mendokumentasikan sebagian besar fitur ini.
- **Syarat backup:** terpisah dari VPS, di Jakarta, tidak hilang karena saldo
  habis, idealnya dengan versioning atau object lock. Belum diverifikasi untuk
  kedua penyedia.
- **Temuan policy:** policy privacy v1.0 mencantumkan Netlify (Ohio), Neon
  (Singapura) dan Cloudflare R2 sebagai penyedia, dan menyatakan perubahan
  material terbit sebagai versi baru. Production di Helipod dan backup di
  penyedia baru memerlukan versi baru (T44).
- **Langkah Owner bila setuju:** buat akun Biznet Gio dan satu bucket uji.
  Agen lalu menguji fitur backup (dan, bila Owner ingin, smoke kontrak object
  storage) tanpa memindahkan data.
- **Sumber:**
  [Biznet Gio NEO Object Storage](https://www.biznetgio.com/en/product/neo-object-storage),
  [IDCloudHost Object Storage](https://idcloudhost.com/en/object-storage/),
  [catatan pengguna IS3](https://farrelf.blog/nyobain-object-storage-dari-idcloudhost/),
  [harga R2](https://developers.cloudflare.com/r2/pricing/),
  [API S3 R2](https://developers.cloudflare.com/r2/api/s3/api/).

### Audit backlog, 2026-10-30

Atas permintaan Owner ("audit dan analisis TASK.md dulu dan jangan membuat
task di luar file TASK.md"). Basis: `main` + PR #90. Tidak ada status yang
naik; tidak ada perubahan kode.

- **Posisi:** 40 task sebelum audit. DONE 22, IN_PROGRESS 3, TODO 2,
  BLOCKED_EXTERNAL 11, BLOCKED_INPUT 2.
- **Pekerjaan tanpa baris task, kini dicatat:**
  - T41: infrastruktur production VPS (Q5);
  - T42: adaptasi runtime VPS. `client-ip.ts` hanya mempercayai header
    Netlify, dan scheduler production belum punya rumah;
  - T43: login Google hosted (D04).
- **Teks basi diperbarui:** T07, T23, T24, T25, T35, T38, T40, header dan
  papan fokus.
- **Search Console/Bing** masuk acceptance T40. JSON-LD, gambar OG dan Google
  Business Profile masuk "Backlog setelah v1".
- **Risiko:** staging (Netlify + Neon) tidak membuktikan runtime VPS (IP
  klien di belakang NAT, Caddy, scheduler, backup). T41 memuat smoke pra-DNS.
- **Keputusan terbuka baru:** Q11 (IP klien), Q12 (penyedia S3 Jakarta),
  Q13 (storage production).
- **Ledger readiness:** REL-02..08 masih menulis "staging belum tersedia";
  diperbarui di T40 (D12).

### Grant aktivasi staging E6, 2026-10-28

Branch `claude/staging-grants`: `ACTIVATION_GRANTS.staging` memuat enam
capability keputusan Owner E6 (`payment`, `shipping`, `emailSender`,
`emailDelivery`, `objectStorage`, `scheduledJobs`) dengan rujukan
`TASKS.md#keputusan-owner-untuk-staging-2026-10-28` dan tanggal 2026-10-28.
`local-test`/`production` tetap kosong; refund, Google login, signup,
password login, analytics dan privacy tetap tanpa grant. Tes adapter
"tanpa grant" kini menginjeksi lookup kosong; tes storage, resolver dan
properti kini membuktikan staging terbuka hanya lewat grant tercatat.
`staging:preflight` (`scripts/lib/staging-preflight.ts`) tidak lagi
menganggap capability bergrant sebagai kegagalan dan melaporkan
`capabilitiesOpen`; pada profil tanpa provider hanya `scheduledJobs` terbuka.
Preflight tetap menolak env provider (`PROVIDERS_PRESENT`), sehingga perlu
disesuaikan terpisah sebelum dipakai pada staging yang kini berprovider.
Bukti lokal: lint 0 error/4 warning lama, typecheck, unit 132/1.490,
backend 115/909, integration 57/520, build lulus. Branch ini juga membawa tiga
commit yang tertinggal setelah PR #72 di-merge (lokasi Resend, tanggal terbit
policy, catatan S3), karena merge terjadi sebelum commit itu masuk. Grant
tidak mengaktifkan provider di hosted sebelum config lengkap dan deploy;
email Customer hosted masih ditutup guard `NODE_ENV=production` (D3).

### Policy publik v1.0 dan bukti persetujuan 30 hari, 2026-10-28

Atas persetujuan Owner atas draf publik ("Setuju, lanjutkan"), branch
`claude/public-policy-v1`:

- Teks publik dipasang di `src/content/customer-policy/{terms,privacy}-v1.0.md`
  (versi dan tanggal dirender dari metadata, bukan bagian teks) dengan
  checksum baru di `PUBLIC_CUSTOMER_POLICY`; metadata approval kini 28
  Oktober. `publishedAt`/`effectiveAt` tetap `null`.
- Route `/terms` dan `/privacy` (komponen `PublicPolicyPage`) mengembalikan 404
  sampai `isPolicyPublished()`; tautan footer dan entri sitemap juga hanya
  muncul setelah terbit. `outputFileTracingIncludes` memasukkan kedua file teks
  ke bundle route.
- Model/migration baru `CustomerClosedConsentProof`
  (`20261028120000_customer_closed_consent_proofs`, tabel baru, non-destruktif):
  penutupan akun menyalin persetujuan ke digest email tanpa profil, kedaluwarsa
  30 hari; cleanup privasi menghapusnya (counter `closedConsentProofs`).
- Bukti lokal: lint 0 error/4 warning lama; typecheck lulus; unit 132/1.489;
  backend 115/908 (termasuk `tests/backend/public-policy-pages.test.ts`);
  integration 57/520 pada database test terisolasi baru
  `niuva_d1_proxy_test_20261028` setelah migration diterapkan; build lulus dan
  nft route memuat kedua file teks. Browser lokal: `/terms` dan `/privacy`
  dirender dengan tanggal sementara yang lalu dikembalikan ke `null`; 375 px
  tanpa overflow halaman, tabel menggulir di wadahnya.
- Resend dicek 28 Oktober di dashboard (belum ada domain terverifikasi) dan
  dokumentasi "Choosing a Region": data akun Resend disimpan di Amerika Serikat
  apa pun region kirimnya; teks privasi diperbarui dan checksum dihitung ulang.
  Tanpa domain terverifikasi, Resend tidak dapat mengirim ke email penguji lain.
- Owner menetapkan (28 Oktober, "Hari ini saja") `publishedAt` dan
  `effectiveAt` = `2026-10-28T00:00:00+07:00`. PUB-POLICY kini tertutup;
  `ACTIVATION_GRANTS` tetap kosong sehingga capability staging tetap ditolak
  sampai grant tercatat. Tes resolver/Midtrans memakai pembaca gate
  "belum terbit" eksplisit untuk menjaga jalur `POLICY_NOT_PUBLISHED`. Setelah
  perubahan: lint 0 error/4 warning lama, typecheck lulus, unit 132/1.490,
  backend 115/909, integration 57/520, build lulus. Halaman tayang hanya di
  deployment yang menjalankan commit ini; hosted belum diverifikasi.
- Belum: domain pengirim Resend; migration dan hak
  role runtime (`INSERT` saat penutupan, `SELECT`/`DELETE` untuk cleanup) di
  Neon staging; jalur akun Customer staging (D3). Tampilan belum direview
  Owner; hosted belum diverifikasi.
