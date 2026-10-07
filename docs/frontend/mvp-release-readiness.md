# MVP release readiness — non-provider closure

Snapshot ledger awal: **2026-10-01** · checkout `codex/admin-navigation-docs-v03` · baseline
`9605a96e936236b7e54b526f05e6b344747b24ab` sebagai sumber runtime; revisi sidebar/dokumentasi
dikirim melalui branch di atas · scope lokal, non-provider dan non-production.
Snapshot awal 2026-09-20 pada `a171686` dan addenda bertanggal tetap merupakan
histori evidence masing-masing. Evidence implementasi terbaru 7 Oktober 2026 dicatat pada addendum Admin Operations di Bagian 1.

Dokumen ini adalah ledger status terkini untuk handoff. Checklist fase lama di
`tasks/todo.md` dan `tasks/plan.md` tetap dipertahankan sebagai histori rencana;
untuk status saat ini gunakan tabel di bawah dan
[`operational-readiness-report.md`](./operational-readiness-report.md).

## Bagian 1 — Status terkini (evidence aktif)

Bagian ini berisi status yang dipakai untuk handoff: baseline terbaru, tabel
keputusan readiness, input yang masih diperlukan, dan langkah berikutnya.
Addendum bertanggal sebelumnya dipindahkan ke
[Bagian 2](#bagian-2--arsip-evidence-bertanggal-historis); isinya dipertahankan
dan hanya tingkat judul "Bukti implementasi Admin analytics — 2026-09-28" yang
disejajarkan dengan addendum lain. Satu penanda historis ditambahkan pada
catatan replay di addendum Customer Google OAuth 2026-09-25.

**Batas evidence.** Evidence public, catalog, authenticated-admin, dan quote di
dokumen ini bersifat **local/loopback/non-production**: database test loopback,
mock Customer OAuth, Clerk development, serta data katalog/quote lokal atau
sintetis (lihat status `ACCEPTED_LOOPBACK`, `ACCEPTED_LOOPBACK_SYNTHETIC`,
`ACCEPTED_HISTORICAL_NON_PRODUCTION`, dan `READY_NON_PRODUCTION` pada tabel
keputusan). Tidak ada evidence di sini yang berasal dari staging, provider
nyata, atau production. Penerimaan visual Owner, pemeriksaan perangkat fisik/AT,
provider, dan production readiness tetap gate terpisah.

### Admin Operations architecture — 2026-10-07

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

- Daftar customer dan kanal resmi untuk mengirim tautan route-bound v1. Jangan
  menerbitkan atau mengirim tautan tanpa penerima yang terkonfirmasi.
- Biodata perusahaan resmi untuk klaim publik, sender bisnis, invoice, dan
  onboarding provider. Nilai sintetis tidak boleh dipromosikan.
- Akun, sandbox key, callback, dan keputusan katalog/provider bila Owner ingin
  membuka Biteship atau Midtrans.
- Input nomor bisnis/eligibility, template, penerima serta implementasi delivery
  bila Owner kelak mengaktifkan roadmap WhatsApp. Pilihan sesi dan opt-in
  tercatat pada [keputusan Owner](../Niuva%20Document/NIUVA_Use_Case_Specification.md#9-keputusan-owner-dan-input-terbuka).
- Angka retensi legal/accounting per kategori record dari Owner dan akuntan/
  penasihat legal; tetap terbuka di luar lifecycle binary 14/60/90 hari.
- Fakta peran/tahun/deliverable/hasil studi kasus yang masih OPEN_FACT pada
  [dossier kurasi](../content/niuva-content-curation-dossier.md). Nama/logo yang
  sudah CONFIRMED tidak dibuka ulang.

## Handoff berikutnya

1. Owner memberikan daftar penerima dan kanal; operator menjalankan reissue
   manual satu per satu dari detail quote/order dan mencatat bukti delivery
   tanpa menyimpan secret token.
2. Setelah biodata dan provider tersedia, buka Goal terpisah untuk staging,
   provider smoke, callback/payment, dan production acceptance.
3. Jangan menandai `READY` di tabel ini sebagai bukti deployment atau aktivasi
   provider.

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
