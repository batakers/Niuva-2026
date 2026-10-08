# Admin NIUVA — implementation and local validation

Tanggal: 7 Oktober 2026. Approval implementasi diberikan Owner di chat setelah architecture dan plan disepakati. Pengerjaan memakai Superpowers executing-plans dan Impeccable, secara native di chat ini.

**Status:** delapan batch selesai diimplementasikan; seluruh gate akhir lokal lulus. Visual baru belum diterima Owner.

Branch kerja: `codex/admin-operations-architecture`. Baseline: `5b8aaad05882389df83776a3800367b768b94850` (PR #46). **Snapshot validasi sebelum delivery Git:** hasil saat pencatatan berada pada working tree lokal. Setelah validasi, Owner memberi instruksi commit, push, dan PR di chat. Evidence tetap lokal/non-production; deployment tidak termasuk instruksi tersebut.

## Hasil yang tersedia

Alur utama: **Overview → Action Queue / Domain List → Detail / Workspace → Action → kembali ke konteks asal**.

| Batch | Hasil dan acceptance yang dicakup |
| --- | --- |
| 1 — Shell/navigation | Kelompok Operasional, Kelola, Owner; shared header/breadcrumb; permission menu; URL asal internal yang aman; pagination membawa query. Label kembali menyebut tujuan aktual seperti Overview atau Action Queue. |
| 2 — Core lists | B2B, Custom Print, Orders memiliki pencarian referensi, status filter, pagination dan filtered count. Browser B2B menguji detail → asal halaman 2 → refresh. Orders juga memiliki filter jenis. Filtering dilakukan server sebelum `skip/take`; kombinasi tanpa hasil tetap empty state. |
| 3 — B2B | Detail berisi brief, lampiran, tindakan status singkat dan history proposal. Form proposal dipisahkan ke workspace. Customer ownership dan inquiry terminal tetap membatasi pengiriman; penerimaan proposal tidak membuat order atau payment. |
| 4 — Custom Print | Detail berisi konteks request/file, hasil review/estimasi, history quote dan order terkait. Workspace memiliki tahap Review, Estimasi, Quote; prasyarat model, review, estimate dan pricing tetap berlaku. Quote SENT tetap immutable. Integration memverifikasi acceptance valid; browser memakai fixture accepted order untuk link request/order dua arah. |
| 5 — Orders | Detail Orders tetap tempat fulfillment. Link request asal memakai relasi quote/order item yang nyata. Verified payment, payment exception, paket final, shipping payment dan shipment metadata memakai capability existing. |
| 6 — Overview/Queue | Pekerjaan aktif ditempatkan sebelum laporan periode. Count menggunakan delapan signal Queue existing. Queue mengarah ke detail/workspace yang sesuai; periode laporan tidak menyaring pekerjaan aktif. Analytics disabled, empty dan unavailable dibedakan. |
| 7 — Management | Products & Stock dan Portfolio memiliki search/publication filter; editor dan stock history membawa asal list. Pricing, Tambah Admin dan Keamanan tetap menggunakan scope existing. |
| 8 — Privacy | List minimal dengan status/page filter; detail Owner memuat konteks dan penanganan. JSON/enhanced dan native POST/303 kembali ke detail yang benar; deadline, hold, resolved/closed/purged markers serta lifecycle tetap existing. |

### Tiga route produk baru

| Route | Fungsi | Source |
| --- | --- | --- |
| `/admin/inquiries/[id]/proposal` | Workspace proposal B2B | [page.tsx](<C:/Portfolio/NIUVA 2026/src/app/admin/inquiries/[id]/proposal/page.tsx>) |
| `/admin/custom-print/[id]/review` | Workspace Review, Estimasi, Quote; `step` dinormalisasi | [page.tsx](<C:/Portfolio/NIUVA 2026/src/app/admin/custom-print/[id]/review/page.tsx>) |
| `/admin/privacy/[id]` | Detail/penanganan Privacy Owner | [page.tsx](<C:/Portfolio/NIUVA 2026/src/app/admin/privacy/[id]/page.tsx>) |

Seluruh URL produk existing dipertahankan. Tidak ada route tambahan untuk setiap tahap quote atau fulfillment.

### Flow operasional

- **DEVELOP:** Overview/Queue atau list B2B berfilter → Inquiry Detail → qualification/contact action → workspace Proposal → kirim snapshot versi baru → detail/history → list atau Queue asal. WON/LOST tetap keputusan Admin; proposal tidak membuat order/invoice/payment.
- **MAKE:** Overview/Queue atau list Custom Print → Detail/Review & Quote → review slicer terverifikasi → estimasi → draft/penerbitan quote immutable → keputusan Customer melalui capability existing → order yang benar-benar terkait → fulfillment di Orders. Detail request dan Order saling menautkan record melalui relasi yang tersimpan.
- **BUY:** Overview/Queue atau list Orders berfilter → Order Detail → payment hold atau tindakan fulfillment yang sah → kurir/resi → kembali ke Queue/list asal. Browser price dan redirect payment tidak menjadi authority.
- **Management:** list produk/portfolio berfilter → editor existing → save → stock history bila diperlukan → editor/list asal.
- **Privacy:** list status/page → Detail Owner → tanggapan/hasil/hold → tetap di Detail dengan feedback → kembali ke filter/page asal. Customer privacy API dan penutupan akun memakai aturan existing.

## State dan backend

`returnTo` membawa satu root internal asal. Filter `q`, `status`, `type`, `publication`, `page`, serta `group`/`range` yang relevan dipertahankan. URL eksternal, protocol-relative, path encoded/berbahaya, array, nested context dan field yang tidak berlaku dibuang. Direct URL memakai list domain sebagai fallback.

Workspace memiliki link detail eksplisit sambil membawa root yang sama. Query navigasi tidak menjadi input mutation bisnis. Form privat/token tidak disimpan pada URL, browser persistence, atau capture.

Read query yang baru berada di [operations-read-repository.ts](<C:/Portfolio/NIUVA 2026/src/modules/admin/operations-read-repository.ts>). Facade `AdminOperationsService` tetap dipakai; ekstraksi terbatas pada lima list dan hubungan request/order. Query rows/count menggunakan predicate sama, urutan `updatedAt DESC, id DESC`, halaman 50. Hubungan memakai `OrderItem.customQuote → CustomPrintQuote.request`, tanpa pencocokan email/nama.

Privacy menggunakan projection list minimal, halaman 20, dan projection detail Owner. Service memeriksa availability/permission sebelum repository read. Handler Owner membangun destination dari UUID dan enum view; response path bebas tidak dipercaya. Caller lama tanpa metadata detail tetap didukung.

Tidak ada schema, migration, pricing policy, state machine, auth/MFA policy, payment authority, atau provider activation baru.

### Perbaikan render native yang ditemukan saat validasi

Tes dengan JavaScript dimatikan menemukan bahwa automatic `src/app/admin/loading.tsx` menahan konten final dalam container streaming tersembunyi. Skeleton dipindahkan secara utuh ke [admin-loading.tsx](<C:/Portfolio/NIUVA 2026/src/app/admin/admin-loading.tsx>) sehingga halaman Admin menunggu HTML lengkap. SHA-256 normalized content skeleton tetap sama dan diperiksa oleh regression test.

URL tidak berubah. Konsekuensi UX: skeleton otomatis tidak lagi muncul sebelum data halaman Admin tersedia pada navigasi awal. Pending/error/success form dan komponen skeleton tetap tersedia. Browser memverifikasi list/detail Privacy, native POST/303 dan return context tanpa JavaScript. Capture juga memeriksa disclosure menu mobile tersedia; interaksi keyboard/menu diuji pada suite auth/invitation.

Runtime browser Admin mengaktifkan capability Customer mock yang sudah dibatasi `NODE_ENV=test`, database test, dan loopback. Better Auth, credential sign-in serta mandatory MFA Admin tetap sungguhan. Tidak ada email/provider production yang dipakai.

## File/component/service yang dipakai kembali

| Area | Existing yang direuse / diubah |
| --- | --- |
| Shell | `src/components/niuva/admin-shell.tsx`; `admin-sidebar.tsx` dan `admin-session-actions.tsx` dipakai tanpa refactor luas; semantic tokens dan typography existing. |
| Access/failure | `loadAdminPageAccess`, `AdminAccessView`, `loadAdminRecordLogged`, `AdminDataUnavailableView`, `notFound`, `StatusNotice`. |
| Actions/forms | `src/app/admin/actions.ts`, `AdminActionForm`; action bisnis tetap existing, dengan revalidation tambahan untuk workspace. |
| Core routes | Existing list/detail `inquiries`, `custom-print`, `orders`; `admin-work-list.tsx`, `overview-view.tsx`, `action-queue-view.tsx`. |
| Domain services | `B2BQuoteService`, `CustomPrintService`, `CustomPrintEstimateService`, `QuoteService`, pricing services, order/shipping/payment services, private-file services. Tidak dipindahkan ke Queue atau UI. |
| Management | Existing list/editor Products dan Portfolio; `StockAdjustmentPanel`, stock history, catalog/stock ledger services; Pricing route dan activation gate. |
| Privacy | Existing `CustomerPrivacyService`, repository, handler, Zod fields/schemas, `PrivacyForm`, lifecycle locks, policy preview, retention/deadline/hold handling. |
| Tests | Existing auth/MFA/invitation/BUY/MAKE/DEVELOP browser suites; backend permissions/state machines; Customer privacy/public regressions; actual quote acceptance fixture dalam `customer-work-slice.test.ts`. |

File pendukung baru: `src/modules/admin/navigation.ts`, `list-query.ts`, `operations-read-repository.ts`; `src/app/admin/admin-page-header.tsx`, `admin-list-controls.tsx`; shared loader `custom-print-page-data.ts` dan `review-workspace.tsx`. File plan dan report ini mendokumentasikan execution serta evidence.

Test baru: navigation, header, pagination, list query/controls, proposal, Custom Print workspace, management navigation, Privacy navigation/detail/permissions, dan integration list queries. Tests existing diperluas untuk gate order, failure states, related records, filtered count, Owner menu, handler destination, enhanced error preservation dan native form.

## Validasi akhir

| Pemeriksaan | Hasil terakhir |
| --- | --- |
| Strict typecheck | PASS |
| Prisma validation | PASS |
| Unit/component | 1.331 PASS, 105 file |
| Backend | 582 PASS, 78 file, satu worker |
| Integration | 149 PASS, 23 file, database test baru |
| Browser Admin | 11 PASS, final replay termasuk halaman kedua, related custom order dan Privacy native |
| Browser publik | 111 PASS; 5 expected skip (116 total), final replay |
| Lint | PASS, 0 error / 0 warning |
| Production build | PASS; ketiga route baru terdaftar sebagai dynamic/server-rendered |
| Diff/whitespace | PASS, termasuk pemeriksaan file baru |

Commands utama yang dijalankan:

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm db:validate
corepack pnpm test
corepack pnpm test:backend
corepack pnpm exec vitest run --config vitest.backend.config.mts --maxWorkers=1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .local/admin-operations-architecture/test-runtime.ps1 integration
$env:NIUVA_ADMIN_EVIDENCE = '1'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .local/admin-operations-architecture/test-runtime.ps1 admin-browser
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .local/admin-operations-architecture/test-runtime.ps1 public-browser
corepack pnpm build
git diff --check
```

Focused tests mengikuti dependency batch. Unit dan backend memiliki coverage instrumentasi existing; angka tes lulus tidak menyatakan seluruh codebase telah memiliki coverage penuh.

### Batas dan penanganan runtime test

Wrapper integration awal berhenti sebelum tes aplikasi pada cluster test lama: PostgreSQL `58P01`, relation file hilang, saat menjalankan migration existing `20261007090000_admin_invitations`. Cluster lama tidak direset atau diperbaiki manual. Recovery runtime lama memerlukan pekerjaan tersendiri.

Validasi menggunakan cluster terpisah pada `.local/admin-operations-architecture/postgres-data`, loopback port **55439**, database **niuva_test_admin_architecture**. Seluruh **20 migration existing** berhasil diterapkan pada database baru; migration source tidak diubah. Helper lokal ignored `test-runtime.ps1` menyediakan start/migrate/integration/admin-browser/public-browser tanpa membaca atau mengubah secret file secara manual. Browser publik memakai port **3108**; browser Admin **3107**.

Run backend parallel awal memiliki satu timeout pada tes optimizer gambar existing. Replay seluruh backend dengan satu worker lulus tanpa mengubah timeout/assertion. Run browser awal menemukan selector yang perlu diperbaiki, navigasi test yang perlu menunggu action selesai, capability harness Privacy yang belum aktif, serta automatic streaming boundary. Perbaikan diterapkan dan seluruh replay akhir lulus sesuai tabel di atas.

## Bukti visual lokal

**78 capture actual-route** hanya berisi fixture sintetis. Lokasi: `.local/admin-operations-architecture/captures/`. Viewport 320, 390, 1440 px untuk permukaan yang berubah; 768/1024 px untuk transisi shared shell/list/workspace. Tidak ada document horizontal overflow pada assertion capture yang lulus.

- [Overview desktop](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/overview-1440.png>)
- [Action Queue desktop](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/queue-1440.png>)
- [Proposal B2B desktop](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/b2b-proposal-1440.png>)
- [Review Custom Print desktop](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/custom-print-review-1440.png>)
- [Order Detail mobile](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/order-detail-390.png>)
- [Product editor mobile](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/product-editor-390.png>)
- [Portfolio editor desktop](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/portfolio-editor-1440.png>)
- [Stock history desktop](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/stock-history-1440.png>)
- [Privacy Detail tanpa JavaScript, mobile](<C:/Portfolio/NIUVA 2026/.local/admin-operations-architecture/captures/privacy-detail-native-320.png>)

Agent memeriksa representative captures Overview, Orders (retail/custom), B2B list halaman kedua, proposal/review, management/stock dan Privacy. Keyboard/focus serta reduced motion diperiksa pada suite auth/invitation; unit tests menjaga feedback/error form. Tidak mengklaim audit accessibility menyeluruh. Screenshot/keyboard/browser emulation merupakan bukti lokal; **visual acceptance Owner untuk komposisi baru belum tercatat**. Perangkat fisik/AT, provider/staging dan production belum dibuktikan oleh tes ini.

## Scope yang tetap ditunda

Permintaan Owner berikutnya membuka kembali global search, linimasa aktivitas
berbasis AuditLog, menu akun, dan halaman Admin & Akses beserta penonaktifan
Admin. Keempat scope tersebut sekarang diimplementasikan langsung di kode.

Bulk/assignment, UI create/import, pricing editor, B2B autosave/draft, generic
unsaved-changes guard, custom scroll/focus restoration, revenue/AOV/growth/unique
visitors, aggregate pipeline baru dan signal Queue tambahan tetap deferred.
Mockup tidak menjadi sumber fitur atau angka backend.

### Lanjutan implementasi akun dan navigasi

- Shell seluruh route Admin kini memakai pencarian di header, tautan linimasa
  aktivitas melalui ikon lonceng, dan menu akun dengan Akun saya, Keamanan akun,
  serta Keluar. Sidebar Owner menampilkan Admin & Akses.
- Overview memusatkan empat sinyal pekerjaan, daftar tindak lanjut, metrik
  periode, dan aktivitas terbaru. Grafik trafik hanya muncul bila ada data nyata.
- Pencarian mencakup menu yang diizinkan, order, brief B2B, dan Custom Print;
  record Customer yang sudah ditutup tidak ikut muncul. Linimasa membaca
  AuditLog dan membatasi peristiwa khusus Owner untuk Admin biasa. Belum ada
  status baca atau angka notifikasi yang disimpan.
- Owner dapat melihat akun/undangan dan menonaktifkan Admin. Transaksi
  memeriksa ulang peran serta status Owner dan target, mencabut seluruh sesi
  Admin target, lalu mencatat audit. Owner tidak dapat dinonaktifkan dari UI ini.
- Validasi lokal lanjutan: lint, typecheck, Prisma validate, build, 1.342 unit,
  582 backend, 156 integrasi, dan 12 skenario browser Admin lulus. Browser
  memeriksa desktop/mobile, fokus dan pintasan pencarian, reduced motion,
  pembatasan Owner, serta pencabutan sesi. Visual Owner masih belum direview;
  pengujian perangkat fisik/AT dan hosted/provider tetap terpisah.

## Risiko, rollback, dan langkah berikutnya

1. Owner perlu walkthrough BUY, MAKE, DEVELOP serta meninjau komposisi baru dengan konteks pekerjaan sebenarnya. Penerimaan visual lama tidak diperluas otomatis.
2. Cluster test lama memerlukan recovery terpisah; gate pada database baru tidak mengklaim cluster lama sehat.
3. Admin menunggu HTML lengkap sebelum tampil agar form native dapat diakses; skeleton streaming awal tidak lagi aktif. Pending form tetap bekerja; review latency Owner menjadi bukti UX berikutnya. Build lokal mencatat APP_URL memakai HTTP dan mempertahankan Server Actions same-origin; konfigurasi hosted/production masih mengikuti proses deployment yang berlaku.
4. Tidak ada data/schema migration yang perlu di-rollback untuk perubahan ini. Rollback dilakukan per slice route/helper/query sambil mempertahankan seluruh domain records, snapshots, privacy lifecycle dan compatibility handler. Native Privacy perlu tetap diuji bila automatic loading boundary dikembalikan.
5. Commit/push/PR/deployment/provider activation memerlukan instruksi Owner tersendiri. Sebelum hosted deployment, jalankan proses review/deploy migration yang berlaku; bukti lokal dan build tidak membuktikan provider atau production readiness.


## Inventory perubahan working tree

74 path Git, termasuk kedua sisi move komponen loading. Satu script berubah hanya untuk capability runtime browser test. Tidak ada perubahan file environment, schema/migration, workflow/deployment, atau source auth/payment/provider.

<details>
<summary>Daftar file yang berubah atau ditambahkan</summary>

```text
DESIGN.md
docs/backend/SPEC-action-queue.md
docs/frontend/admin-operations-implementation-2026-10-07.md
docs/frontend/mvp-release-readiness.md
docs/superpowers/plans/2026-10-07-admin-operations-architecture.md
scripts/local-admin-auth-e2e-web.ts
src/app/admin/action-queue-view.tsx
src/app/admin/actions.ts
src/app/admin/admin-list-controls.tsx
src/app/admin/admin-loading.tsx
src/app/admin/admin-page-header.tsx
src/app/admin/admin-work-list.tsx
src/app/admin/custom-print/[id]/custom-print-page-data.ts
src/app/admin/custom-print/[id]/page.tsx
src/app/admin/custom-print/[id]/review/page.tsx
src/app/admin/custom-print/[id]/review/review-workspace.tsx
src/app/admin/custom-print/page.tsx
src/app/admin/inquiries/[id]/b2b-quote-panel.tsx
src/app/admin/inquiries/[id]/page.tsx
src/app/admin/inquiries/[id]/proposal/page.tsx
src/app/admin/inquiries/page.tsx
src/app/admin/loading.tsx
src/app/admin/orders/[id]/page.tsx
src/app/admin/orders/page.tsx
src/app/admin/overview-view.tsx
src/app/admin/portfolio/[id]/page.tsx
src/app/admin/portfolio/page.tsx
src/app/admin/pricing/page.tsx
src/app/admin/privacy/[id]/page.tsx
src/app/admin/privacy/page.tsx
src/app/admin/products/[id]/page.tsx
src/app/admin/products/[id]/stock-adjustment-panel.tsx
src/app/admin/products/[id]/stock/[variantId]/page.tsx
src/app/admin/products/page.tsx
src/components/niuva/admin-shell.tsx
src/components/niuva/privacy-form.tsx
src/modules/admin/action-queue.ts
src/modules/admin/list-query.ts
src/modules/admin/navigation.ts
src/modules/admin/operations-read-repository.ts
src/modules/admin/operations.ts
src/modules/customer-privacy/handler.ts
src/modules/customer-privacy/repository.ts
src/modules/customer-privacy/service.ts
src/modules/customer-privacy/validation.ts
tests/backend/admin-action-queue.test.ts
tests/backend/admin-operations-permissions.test.ts
tests/backend/admin-privacy-read-permissions.test.ts
tests/backend/customer-privacy-pages.test.ts
tests/backend/customer-privacy-routes.test.ts
tests/e2e-admin-auth/admin-invitations.spec.ts
tests/e2e-admin-auth/admin-operations.spec.ts
tests/integration/admin-list-queries.test.ts
tests/integration/customer-privacy.test.ts
tests/integration/customer-work-slice.test.ts
tests/unit/admin-access-view.test.tsx
tests/unit/admin-action-queue-view.test.tsx
tests/unit/admin-b2b-proposal-page.test.tsx
tests/unit/admin-custom-print-workspace.test.tsx
tests/unit/admin-detail-pages.test.tsx
tests/unit/admin-list-controls.test.tsx
tests/unit/admin-list-query.test.ts
tests/unit/admin-management-navigation.test.tsx
tests/unit/admin-navigation.test.ts
tests/unit/admin-overview-view.test.tsx
tests/unit/admin-page-failure-group-a.test.tsx
tests/unit/admin-page-header.test.tsx
tests/unit/admin-pagination.test.tsx
tests/unit/admin-privacy-detail.test.tsx
tests/unit/admin-privacy-navigation.test.ts
tests/unit/admin-sidebar.test.tsx
tests/unit/customer-privacy-form.test.tsx
tests/unit/properties/p10-admin-detail-gate-order.test.tsx
tests/unit/system-pages-coverage.test.ts
```

</details>
