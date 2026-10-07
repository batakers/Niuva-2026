# Admin NIUVA Implementation Plan

> **Execution:** Owner memberi approval implementasi pada 7 Oktober 2026. Pengerjaan memakai superpowers:executing-plans dan Impeccable, secara native di chat ini. Checklist mencatat pekerjaan dan validasi; root AGENTS serta scope approval Owner tetap berlaku. Commit, push, deployment/provider activation dan delegation memerlukan instruksi tersendiri.

**Goal:** Membentuk Admin NIUVA dengan alur Overview → Queue/List → Detail/Workspace → Action → kembali ke konteks asal, menggunakan capability yang telah tersedia.

**Architecture:** Shell dan navigasi dipakai bersama; domain services tetap memiliki business logic. List memakai query server sebelum pagination, detail menyatukan konteks record, dan tiga route tambahan memisahkan pekerjaan kompleks. Implementasi dilakukan sebagai delapan batch yang tetap menghasilkan aplikasi berfungsi pada akhir setiap batch.

**Tech Stack:** Next.js 16.3.6 App Router, React 19.2.8, TypeScript strict, Prisma 7.10.0/PostgreSQL, Zod, Decimal.js, Better Auth/MFA, komponen UI dan semantic tokens existing. Tidak ada kebutuhan dependency baru.

**Spec:** Architecture disetujui Owner di chat pada 7 Oktober 2026; baseline yang mengikat disalin pada [Approved architecture baseline](#approved-architecture-baseline). Authority domain: [PRD](../../PRD-Niuva-MVP.md), [Tech Design](../../TechDesign-Niuva-MVP.md), [lifecycle](../../backend/lifecycle-contract.md). Authority visual: [DESIGN.md](../../../DESIGN.md) dan master reference Overview yang ditetapkan Owner.

**Baseline:** `main`, `5b8aaad05882389df83776a3800367b768b94850` (PR #46). Source dan manifest diperiksa; test/build/browser belum dijalankan dalam fase planning. **Status plan: delapan batch selesai diimplementasikan dan divalidasi lokal pada `codex/admin-operations-architecture`, 7 Oktober 2026. Visual baru belum diterima Owner.**

## Approved architecture baseline

| Fungsi | Tanggung jawab |
| --- | --- |
| Overview | Orientation/command center: kondisi, prioritas, dan pintu masuk pekerjaan. |
| Action Queue | Operational inbox/dispatcher: projection delapan signal existing, lalu link ke domain. |
| Domain List | Search, filter, monitoring, dan pagination atas query server. |
| Detail | Memahami satu record dan melakukan tindakan singkat yang sah. |
| Workspace | Pekerjaan kompleks dengan input/tahapan yang membutuhkan fokus. |

- Sidebar **Operasional**: Overview, Action Queue, Orders, Custom Print, B2B Inquiries.
- Sidebar **Kelola**: Products & Stock, Portfolio, Pricing Rules.
- Sidebar **Owner**: Privasi Customer dan Tambah Admin; hanya tampil bagi Owner.
- Topbar: konteks halaman, Situs publik, akun/role, Keamanan akun, Keluar. Detail/workspace mempertahankan menu domain induk aktif.
- Route existing tetap dipakai. Tiga route baru: `/admin/inquiries/[id]/proposal`, `/admin/custom-print/[id]/review`, `/admin/privacy/[id]`.
- Core Operations adalah batch 1–6. Management adalah batch 7. Detail Privacy termasuk architecture, di batch 8 dan di luar Core Operations.
- Master reference: Overview existing dan gambar `C:/Users/FAIZ/Downloads/NIUVA SaaS Admin Dashboard Overview.png` yang diberikan Owner. Komposisi visual mengikuti reference; isi/status/angka mengikuti source runtime.
- B2B tetap inquiry/proposal untuk tindak lanjut manual. Penerimaan proposal tidak membuat order, invoice, kontrak, atau pembayaran; WON/LOST tetap keputusan Admin.
- MAKE tetap request → review/estimasi → quote immutable → penerimaan Customer yang valid → order. Fulfillment setelah order terbentuk berada di Orders.

## Global constraints

- Implementasi disetujui Owner setelah review architecture dan plan. Kerjakan delapan batch dalam scope yang disepakati; approval ini tidak memperluas fitur deferred.
- Reuse route/component/service existing; jangan rename route untuk konsistensi penamaan atau menghapus file existing. Ekstraksi hanya pada slice yang diubah.
- Tidak ada perubahan state machine, pricing values/quantity policy, payment authority, refund policy, private-file lifecycle, auth policy, atau privacy retention.
- Return context wajib. Custom scroll/focus restoration dan generic unsaved-changes guard ditunda. Pertahankan focus/error feedback dan accessibility yang sudah tersedia.
- Feature deferred tetap deferred: global search, notification center, bulk action, task assignment, Admin & Access, editor pricing lengkap, UI create/import produk/portfolio, autosave/draft proposal B2B, reports pendapatan/AOV/pertumbuhan/unique visitors, event feed, pipeline aggregate baru, dan perluasan signal Queue.
- Query baru memakai Zod; business logic tetap pada domain service dan query database baru pada repository. Jangan merombak seluruh `AdminOperationsService` untuk memperbaiki pola lama di luar scope.
- Tidak ada migration/schema baru yang direncanakan. Jangan mengubah migration existing atau menambah index tanpa kebutuhan yang dibuktikan terpisah.
- Auth/MFA, active AdminProfile, permission per operasi, origin boundary, private storage, Decimal money, immutable snapshot, dan payment hold tetap berlaku pada direct request.
- Jangan menyimpan form privat/token di URL, log, browser persistence, atau screenshot test. Browser evidence memakai fixture sintetis pada database test terisolasi.
- Root `AGENTS.md` berlaku; saat implementasi recheck child instructions pada target. Commit, push, deployment/provider activation dan subagents memerlukan instruksi eksplisit sendiri.
- Sebelum menulis kode, baca ulang guide Next yang relevan di `node_modules/next/dist/docs/`: `03-layouts-and-pages.md`, `server-actions.md`, `link.md`, dan `connection.md`. Gunakan `params`/`searchParams` Promise serta revalidation sesuai versi terpasang.

## Review focus

Lima kondisi ini wajib memiliki regression test pada batch pemiliknya:

1. `returnTo` eksternal, protocol-relative, encoded, array, atau nested context: fallback internal; tidak membuka redirect eksternal (batch 1).
2. Filter dengan lebih dari 50 record, gabungan type/status tanpa hasil, dan query malformed: filtering sebelum pagination, count benar, empty aman (batch 2).
3. Workspace direct URL tanpa akses/MFA, inquiry terminal atau belum dimiliki Customer: gate sebelum query dan penolakan mutation tetap di server (batch 3).
4. Review berubah setelah estimasi, pricing unavailable, model belum verified, atau quote lama sudah diterbitkan: stale workflow tidak bisa diteruskan; snapshot tetap immutable (batch 4).
5. Privacy form JS/native POST dari detail dan response path palsu: hasil/error tetap ke tujuan internal yang benar, Owner/retention gate utuh (batch 8).

## Dependency, risiko, dan urutan

| Batch | Deliverable | Dependency | Risiko | Alasan urutan |
| --- | --- | --- | --- | --- |
| 1 | Shell, header, pagination, return context | Baseline | Rendah–sedang; shared UI | Menetapkan kontrak yang dipakai semua slice sebelum pemisahan halaman. |
| 2 | Query dan list B2B/MAKE/Orders | 1 | Sedang; query/count/permission | Operator perlu menemukan record dan menjaga filter sebelum workspace ditambahkan. |
| 3 | B2B detail + workspace proposal | 1–2 | Sedang; snapshot/Customer ownership | Slice workspace paling sederhana; menguji pola tanpa mengubah transaksi payment. |
| 4 | MAKE detail + Review & Quote + hubungan order | 1–3 | Tinggi; pricing/file/quote | Pola navigasi sudah stabil sebelum memisahkan workflow dengan banyak prasyarat. |
| 5 | Orders detail/fulfillment | 1–2, hubungan record dari 4 | Tinggi; payment/shipping holds | Menggunakan hubungan MAKE yang sudah ada dan menjaga canonical fulfillment. |
| 6 | Overview/Queue terintegrasi + gate Core | 1–5 | Sedang; projection/link lintas domain | Ringkasan dan dispatcher menunjuk list/workspace yang telah berfungsi; tidak membuat CTA yang belum tersedia. |
| 7 | Products/Stock, Portfolio, Pricing dan supporting Admin | Core gate 6 | Sedang; shared query + public catalog regression | Management dikerjakan setelah alur operasional utama terbukti. |
| 8 | List/detail Privacy | Core gate 6; reuse komponen batch 7 | Tinggi; data privacy + shared form/handler | Tidak menahan milestone Core; read query dan response boundary sensitif diperiksa sebagai slice terpisah. |

Batch dikerjakan berurutan setelah approval Owner. Gate antarbatch adalah validation internal. Batch 6 menjadi milestone Core sebelum management/privacy; evidence akhir dicatat setelah batch 7–8.

## Kontrak lintas batch

### Navigasi (batch 1)

File baru `src/modules/admin/navigation.ts` berisi fungsi murni yang aman dipakai server/client:

- `normalizeAdminReturnTo(value: unknown, fallback: AdminRootPath): string`.
- `withAdminReturnTo(destination: string, returnTo: string): string`.
- `buildAdminPageHref(basePath: AdminRootPath, query: Readonly<Record<string, string>>, page: number): string`.
- `AdminRootPath` adalah union route root existing: `/admin`, `/admin/queue`, `/admin/orders`, `/admin/custom-print`, `/admin/inquiries`, `/admin/products`, `/admin/portfolio`, `/admin/pricing`, `/admin/privacy`.

`returnTo` menyimpan satu URL root asal; tidak menumpuk return URL bertingkat. Izinkan hanya root di atas dan query navigasi yang sesuai (`group`, `range`, `page`, `q`, `status`, `type`, `publication`). Buang query lain, nested `returnTo`, fragment, dan URL tidak aman. Direct URL tanpa konteks memakai list domain. Workspace kembali ke detail dengan link record eksplisit sambil mempertahankan root asal. Link request/order terkait membawa root yang sama; tidak memakai `history.back()` sebagai satu-satunya mekanisme.

Contoh assertion yang mengikat Task 1.1 (fixture data dibangun dalam test, bukan runtime):

```typescript
expect(normalizeAdminReturnTo("/admin/inquiries?status=NEW&page=3", "/admin/inquiries"))
  .toBe("/admin/inquiries?status=NEW&page=3");
expect(normalizeAdminReturnTo("//example.test/admin", "/admin/orders"))
  .toBe("/admin/orders");
expect(buildAdminPageHref("/admin/orders", { status: "PAID", type: "RETAIL" }, 2))
  .toBe("/admin/orders?status=PAID&type=RETAIL&page=2");
```

Urutan serialization mengikuti insertion order query yang telah dikanonisasi; navigation tests juga memeriksa isi `URLSearchParams`, sehingga ekuivalensi filter tidak bergantung pada urutan input query browser.

`AdminPagination` tetap di `src/components/niuva/admin-shell.tsx`, menambah prop opsional `query?: Readonly<Record<string, string>>`; caller existing tanpa prop tetap bekerja. `AdminWorkList` menambah `returnTo?: string`; Overview dan Queue mengirim URL root masing-masing.

### List/query (batch 2, diperluas batch 7)

- File baru `src/modules/admin/list-query.ts`: `parseAdminListQuery(area: AdminSearchArea, raw: Readonly<Record<string, unknown>>): AdminListQuery`.
- `AdminSearchArea`: `inquiries | custom-print | orders`, lalu `products | portfolio` pada batch 7.
- `AdminListQuery`: `{ page: number; q?: string; status?: string; type?: "RETAIL" | "CUSTOM_PRINT"; publication?: "published" | "draft" }`, dengan enum/status yang diperiksa per area menggunakan Zod. Unknown field/enum/array diabaikan; `page` memakai aturan `parseAdminPage` existing; `q` di-trim, maksimum 100 karakter, input yang tidak valid dibuang.
- B2B/MAKE/Orders mencari `referenceNumber`/`orderNumber`, case-insensitive. Products/Portfolio mencari name/title dan slug. Tidak menambah pencarian kontak Customer.
- Urutan default tetap `updatedAt DESC, id DESC`; ukuran halaman tetap 50. Submit search/filter memulai halaman 1; pagination mempertahankan query.
- `AdminFilteredResult<T> = AdminOperationsResult<T> & { filteredTotal: number }`. Ubah return type hanya metode list yang dimigrasi; metode lain tetap menggunakan result existing.
- `listInquiries`, `listCustomPrintRequests`, `listOrders`, kemudian `listProducts`/`listPortfolio`, tetap pada `AdminOperationsService`, dengan input query opsional; pemanggilan tanpa filter tetap kompatibel.
- File baru `src/modules/admin/operations-read-repository.ts`: interface `AdminOperationsReadRepository` dan class `PrismaAdminOperationsReadRepository`. Metode list mengembalikan `{ items, hasNext, filteredTotal }`; service memeriksa permission sebelum query dan menambahkan `generatedAt`, `page`, `role`.
- Repository menerapkan `where` yang sama pada query rows dan count, sebelum `skip/take`; ambil 51 rows untuk `hasNext`. Filter kombinasi yang valid tetapi tanpa hasil menampilkan empty state nyata.
- Summary list memakai `filteredTotal` atau label eksplisit "di halaman ini". Jangan menyebut `items.length` sebagai total seluruh domain.

### Hubungan record (batch 4–5)

- `AdminLinkedOrder = { id: string; orderNumber: string; status: string }` dan `AdminLinkedRequest = { id: string; referenceNumber: string; status: string }`.
- Tambahkan metode service `getCustomPrintLinkedOrders(requestId: string): Promise<readonly AdminLinkedOrder[]>` dan `getOrderSourceRequests(orderId: string): Promise<readonly AdminLinkedRequest[]>` dengan permission `CUSTOM_PRINT_REVIEW` dan `ORDER_FULFILL` masing-masing; query pada repository baru.
- Gunakan relasi existing `OrderItem.customQuote → CustomPrintQuote.request`. Deduplikasi referensi dan tampilkan hanya relasi yang benar-benar ada. Jangan menebak relasi dari email, nomor urut, atau kecocokan nama.
- Panggil query terkait setelah record canonical ditemukan dan akses granted; null/invalid UUID tetap not-found. Array dipakai agar tidak mengasumsikan hanya satu relasi historis.

## Batch 1 — Shell dan navigasi kontekstual (Core)

**Reuse/modify:** `src/components/niuva/admin-shell.tsx` (shell dan pagination), `admin-sidebar.tsx`, `admin-session-actions.tsx`; `src/app/admin/admin-work-list.tsx`, `overview-view.tsx`, `action-queue-view.tsx`; tiga core list dan tiga detail existing. Reuse `loadAdminPageAccess`, `loadAdminRecordLogged`, UI primitives dan typography tokens. Update hanya kontrak Admin di `DESIGN.md` untuk kelompok Owner dan navigation context.

**Create:** `src/modules/admin/navigation.ts`, `src/app/admin/admin-page-header.tsx` (judul, breadcrumb, link kembali, slot tindakan), `tests/unit/admin-navigation.test.ts`, `tests/unit/admin-pagination.test.tsx`, serta `tests/unit/admin-page-header.test.tsx` untuk label root asal. Tidak membuat route baru.

**Task 1.1 — URL dan pagination**

- [x] Tulis test `rejects_unsafe_return_targets`, `preserves_query_when_paginating`, `keeps_one_root_return_context`, `uses_domain_fallback_for_direct_url`. Assert target `/admin/inquiries?status=NEW&page=3` bertahan; `https://...`, `//...`, backslash/control characters, encoded hostile path dan array kembali ke fallback.
- [x] Jalankan test baru untuk membuktikan kasus gagal sebelum implementasi.
- [x] Implementasikan fungsi pada kontrak Navigasi dan prop pagination yang kompatibel.
- [x] Jalankan kembali test; default pagination existing tetap menghasilkan page sebelumnya/berikutnya yang benar.

**Task 1.2 — Integrasi shell/header/link**

- [x] Tambahkan assertion pada `admin-sidebar.test.tsx`, `admin-overview-view.test.tsx`, `admin-action-queue-view.test.tsx`, `admin-detail-pages.test.tsx`: menu Owner tersembunyi untuk Admin, domain tetap aktif, Queue/List link membawa context, direct detail kembali ke domain.
- [x] Terapkan header dan link kontekstual pada core routes tanpa memindahkan form. Pertahankan control 44px, keyboard/focus existing, collapse preference, mobile disclosure, role dan keamanan akun.
- [x] Pastikan shared shell memakai master reference dan token existing; tidak memasang search/bell dekoratif yang belum mempunyai capability.
- [x] Jalankan checks V1 dan smoke navigation pada route aktual.

**Acceptance:** Queue/List → Detail → kembali memulihkan URL asal; reload/new tab punya fallback deterministik; tidak ada perubahan query DB atau mutation; semua existing routes tetap dapat diakses sesuai gate.

**Validation:** V1, `admin-sidebar`, `admin-pagination`, `admin-navigation`, `admin-session-actions`, `admin-overview-view`, `admin-action-queue-view`, `admin-detail-pages`, serta property `p10-admin-detail-gate-order`. Browser: expanded/collapsed, mobile menu, direct detail, Queue return. Risiko rollback terbatas pada helper/header/link; form bisnis tetap existing.

## Batch 2 — Search/filter Core Domain Lists (Core)

**Reuse/modify:** `src/modules/admin/operations.ts` (hanya tiga list), `src/app/admin/inquiries/page.tsx`, `custom-print/page.tsx`, `orders/page.tsx`, pagination existing dan failure/access views.

**Create:** `src/modules/admin/list-query.ts`, `src/modules/admin/operations-read-repository.ts`, `src/app/admin/admin-list-controls.tsx` (GET search/filter/reset yang sederhana), `tests/unit/admin-list-query.test.ts`, `tests/unit/admin-list-controls.test.tsx`, `tests/integration/admin-list-queries.test.ts`.

**Task 2.1 — Query server**

- [x] Test parser untuk enum invalid, page invalid, array, trimmed query, field yang tidak berlaku pada domain dan query kosong.
- [x] Test integration `filters_before_pagination_over_50_rows`, `counts_filtered_dataset`, `combines_order_type_and_status`, `returns_empty_for_valid_nonmatching_filters`. Gunakan fixture dengan reference unik; count/rows sama-sama menggunakan predicate yang diminta.
- [x] Implementasikan contract list/repository secara aditif. Pertahankan gate service sebelum repository; tambahkan regression permission untuk filtered reads pada `admin-operations-permissions.test.ts`.
- [x] Jalankan V2; tidak menambah migration atau mengganti seluruh service.

**Task 2.2 — List UI dan context**

- [x] Integrasikan kontrol `q/status` pada B2B dan MAKE; `q/status/type` pada Orders. GET form menghilangkan `page` saat filter berubah; pagination mempertahankan query.
- [x] Pakai count filtered; pertahankan tampilan reference, status, timestamp, mode mobile dan data yang sudah tersedia. Reset menghapus filter saja dan kembali halaman 1.
- [x] Tambahkan test browser dalam `tests/e2e-admin-auth/admin-operations.spec.ts`: cari/filter, buka detail dari halaman 2, kembali dengan query utuh, kemudian refresh.
- [x] Jalankan V1+V2 dan browser case yang ditambahkan.

**Acceptance:** pencarian menemukan record di luar 50 rows pertama; count bukan count halaman; tidak ada filter client-only; empty/unavailable berbeda; authorized list dan field data tidak berubah menjadi authority transaksi.

**Urutan:** menghasilkan pintu masuk stabil bagi dua workspace berikutnya. Rollback dapat mengembalikan tiga caller ke input page-only; operasi write belum diubah.

## Batch 3 — B2B Detail dan workspace Proposal (Core)

**Reuse/modify:** `src/app/admin/inquiries/[id]/page.tsx`, `b2b-quote-panel.tsx`, `src/app/admin/actions.ts`; reuse `InquiryService` pada `src/modules/inquiry/service.ts`, `INQUIRY_TRANSITIONS` pada `transitions.ts`, `B2BQuoteService.send/listForAdmin` pada `src/modules/inquiry/b2b-quote.ts`, `AdminActionForm`, private-file download dan loader/error views.

**Create route:** `src/app/admin/inquiries/[id]/proposal/page.tsx`. Page server berisi form proposal existing yang dipindah, header/context, dan hasil tindakan. Existing `b2b-quote-panel.tsx` menjadi riwayat snapshot + CTA workspace, tanpa duplikasi editor pada detail.

**Create test:** `tests/unit/admin-b2b-proposal-page.test.tsx`. Extend existing `admin-detail-pages.test.tsx`, gate-order properties, `tests/integration/customer-work-slice.test.ts` (B2B version/ownership), `admin-operations.spec.ts`, dan public/account regression `account-work.spec.ts`. Jalankan `files-inquiry-quote.test.ts` untuk regression attachment/private-file boundary existing.

**Task 3.1 — Pemisahan UI**

- [x] Test `proposal_workspace_gates_before_record_read`, `detail_links_to_workspace_with_context`, `workspace_returns_to_detail_with_origin`, `terminal_or_unowned_inquiry_cannot_publish`.
- [x] Pindahkan form scope/asumsi/pos IDR/masa berlaku ke route baru; detail mendahulukan brief, lifecycle, lampiran dan proposal history. Kondisi terminal/ownership menggunakan fakta domain existing.
- [x] Reuse `sendB2BQuoteAction`; tambahkan revalidation workspace selain detail/account existing. `returnTo` tidak masuk input domain.

**Task 3.2 — Workflow regression**

- [x] Browser melakukan review/kualifikasi → workspace → kirim proposal → lihat versi di detail → kembali ke filtered list/Queue.
- [x] Assert kirim proposal tetap membuat versi SENT immutable; inquiry tidak otomatis berubah ke QUOTED/WON; acceptance Customer tidak membuat order. Direct mutation tetap memeriksa Owner/Admin permission dan Customer ownership.
- [x] Jalankan V1, domain backend regression dan browser B2B/account yang relevan.

**Acceptance:** hanya satu editor proposal; server-generated version masih berlaku; success/error terlihat tanpa auto-redirect; scope tidak bertambah ke draft/autosave, CRM atau payment. Route existing inquiry tetap utuh.

**Urutan:** membuktikan workspace/context pada satu operasi penerbitan sebelum kompleksitas MAKE. Rollback hanya memindahkan form kembali ke detail; snapshot yang sudah tersimpan tetap valid.

## Batch 4 — Custom Print Detail, Review & Quote, hubungan order (Core)

**Reuse/modify:** `src/app/admin/custom-print/[id]/page.tsx`, `src/app/admin/actions.ts`, `src/modules/admin/operations.ts`, repository batch 2. Reuse `CustomPrintService.recordReview` pada `src/modules/custom-print/service.ts`; `CustomPrintEstimateService.latestForAdmin/publish` dan `isEstimateCurrent` pada `estimate.ts`; `QuoteService.createDraft/send/reissuePublicToken` pada `src/modules/quote/service.ts`; `RoughCustomShippingService.saveEstimatedPackage` pada `src/modules/shipping/rough-custom.ts`; preview snapshot parser, private-file action dan pricing reads existing.

**Create:** `src/app/admin/custom-print/[id]/review/page.tsx` (route/gate/load), `review/review-workspace.tsx` (form tahapan), `src/app/admin/custom-print/[id]/custom-print-page-data.ts` (loader bersama untuk record, pricing dan estimasi; tidak berisi rule bisnis), `tests/unit/admin-custom-print-workspace.test.tsx`. Related-work integration memperluas fixture acceptance valid di `tests/integration/customer-work-slice.test.ts`, sehingga tidak menggandakan setup dalam file baru.

**Interface loader:** `loadCustomPrintPageData(id: string, access: AdminAccess)` mengembalikan discriminated result dengan label loader existing `found | not-found | unavailable`. Result `found` menggunakan tipe return service existing untuk request, active rule, rule list dan latest estimate; pricing failure tetap dibedakan dari request not-found. Detail/workspace memakai result yang sama, bukan salinan prasyarat baru. Regression failure paths memakai `tests/unit/admin-page-failure-group-a.test.tsx` dan `admin-record-loader` tests existing.

**Task 4.1 — Related-record reads**

- [x] Test `links_only_actual_quote_order_relations`, `deduplicates_linked_records`, `returns_no_link_before_valid_acceptance`, `denies_related_reads_before_db`. Buat fixture order melalui alur quote acceptance valid existing; jangan melonggarkan immutable trigger demi fixture.
- [x] Tambahkan kedua metode hubungan record dari kontrak batch 4–5 pada repository/service. Tidak mengubah schema atau membuat order dari Admin.
- [x] Tampilkan linked orders pada detail request; link membawa root origin. Order-side integration dikerjakan batch 5.

**Task 4.2 — Workspace**

- [x] Tambahkan unit tests untuk `step=review|estimate|quote`, direct URL, model belum verified, pricing unavailable, estimasi stale, draft existing, dan quote SENT immutable. Unknown step kembali `review`; bagian yang belum siap memperlihatkan prasyarat dan menahan action.
- [x] Pindahkan review/estimate/paket perkiraan/quote form ke workspace; detail tetap berisi ringkasan request, preview, files, hasil review, estimasi, quote history dan linked orders.
- [x] Reuse action/domain calls. Tambahkan revalidation `/admin/custom-print/[id]/review` pada review, publish estimate, paket perkiraan, draft, send/reissue quote; pertahankan revalidation detail/account/list/Overview/Queue existing.
- [x] Pertahankan serialisasi Decimal, versi snapshot, model/pricing gate, manual quote-sharing semantics, dan file private signed access.
- [x] Jalankan V1+V2, `custom-print-review`, `phase2-quote-order`, `files-inquiry-quote`, `pricing`, integration `customer-work-slice.test.ts` (stale estimate, valid acceptance, rough shipping), serta browser MAKE dan `quote-review`/`account-work` yang terdampak.

**Acceptance:** satu workspace dengan tiga bagian dan satu sumber rule domain; revisi review menahan quote sampai estimasi baru valid; order terkait muncul hanya dari acceptance server; direct URL tidak melewati auth/file/quote gate. Tidak ada final-price estimator baru atau auto-send provider.

**Urutan:** dependency navigasi/list/workspace telah terbukti; slice berisiko tinggi dipisah dari Orders fulfillment. Bila UI perlu rollback, request/estimate/quote data existing tetap dapat dibuka pada canonical detail; tidak melakukan rollback destructive pada snapshot.

## Batch 5 — Orders Detail dan fulfillment (Core)

**Reuse/modify:** `src/app/admin/orders/[id]/page.tsx`, core list/navigation dari batch 1–2, `src/app/admin/actions.ts` bila diperlukan untuk invalidasi tampilan terkait. Reuse `OrderStatusService` pada `src/modules/order/status-service.ts`, maps/helper pada `src/modules/order/transitions.ts`, `PAYMENT_ISSUE_LABELS` pada `src/modules/payment/operational-state.ts`, `ShippingService` pada `src/modules/shipping/service.ts`, dan semua tindakan order existing. Gunakan `getOrderSourceRequests` dari batch 4.

**Create:** tidak ada route produksi baru. Tambahkan component lokal hanya jika kelompok form/detail tidak lagi terbaca dalam page; tidak membuat framework fulfillment atau halaman Payments/Shipping baru.

**Task 5.1 — Komposisi detail berdasarkan state**

- [x] Extend `tests/unit/admin-detail-pages.test.tsx`: `unpaid_order_has_no_manual_paid_action`, `payment_hold_blocks_fulfillment`, `custom_qc_exposes_final_package_action`, `retail_has_no_custom_shipping_forms`, `related_request_link_keeps_return_context`.
- [x] Susun detail menjadi ringkasan/status, exception, tindakan tersedia, item, pembayaran, shipping, customer/alamat. Payment hold terlihat sebelum tombol proses; form alamat/paket/resi tetap kondisional dengan rule existing.
- [x] Tampilkan request/quote asal dari relasi server pada custom order. Jika tidak ada relasi historis, tampilkan keadaan yang benar tanpa link tebakan.
- [x] Pertahankan form/action labels yang operasional dan tidak mengesankan bahwa operator dapat mengesahkan pembayaran sendiri. Record payment/provider detail tetap terbatas pada detail yang berizin.

**Task 5.2 — Fulfillment regression**

- [x] Extend browser `admin-operations.spec.ts`: BUY PAID → PROCESSING → READY_TO_SHIP, metadata resi dan return context; custom order dapat membuka request terkait; payment exception menahan action seperti baseline.
- [x] Jalankan V1, `order-status-service.test.ts`, `shipment-metadata.test.ts`, `phase2-quote-order.test.ts`, `tests/e2e/order-status.spec.ts`, dan browser BUY yang diperbarui.
- [x] Periksa Server Actions tetap memakai domain service; pengelompokan UI tidak menciptakan transition baru atau bypass hold.

**Acceptance:** retail/custom memakai detail canonical yang sama dengan action sesuai lifecycle; state payment berasal dari server; hubungan request/order dapat ditelusuri; filtered list/Queue context tetap bertahan.

**Urutan:** hubungan record dari MAKE sudah siap dan dapat dipakai tanpa model/projection duplikat. Rollback komposisi mempertahankan service fulfillment dan data transaksi existing.

## Batch 6 — Overview, Queue, dan integrasi Core Operations

**Reuse/modify:** `src/app/admin/page.tsx`, `overview-view.tsx`, `queue/page.tsx`, `action-queue-view.tsx`, `admin-work-list.tsx`; `src/modules/admin/action-queue.ts`, `action-queue-service.ts`, dashboard dan analytics service existing. Dokumentasi kontrak `docs/backend/SPEC-action-queue.md` dan evidence `docs/frontend/mvp-release-readiness.md` disesuaikan hanya dengan hasil nyata.

**Backend delta:** tambahkan `summary` pada `ActionQueueResult` dengan `{ groups: Readonly<Record<"inquiries" | "custom-print" | "orders", number>>; exceptions: number }`. Hitung dari signal yang telah dideduplikasi sebelum filter dan limit 50. Tidak ada signal, query domain, atau mutation Queue baru.

Contoh assertion Task 6.1 untuk fixture 60 inquiry NEW unik:

```typescript
expect(result.items).toHaveLength(50);
expect(result.summary.groups.inquiries).toBe(60);
expect(result.totalOpen).toBe(60);
expect(result.summary.exceptions).toBe(0);
```

**Task 6.1 — Projection, tujuan link, dan ringkasan**

- [x] Extend `tests/backend/admin-action-queue.test.ts`: group summary tetap penuh saat lebih dari 50 items atau filter berubah; dedup draft/preparation tidak menghitung dua pekerjaan yang sama; exception count tetap sesuai existing attention; sort exception lalu tertua tidak berubah.
- [x] Arahkan CUSTOM_PRINT_REVIEW ke workspace `step=review`, QUOTE_PREPARATION/QUOTE_SEND ke `step=quote`; B2B dan Orders tetap ke detail. Workspace quote yang belum memenuhi syarat menunjukkan alasan/tautan tahap sebelumnya, bukan menerbitkan otomatis.
- [x] Tambahkan summary pada projection saja; repository Queue dan delapan kondisi sumber existing dipertahankan. Reference/link redaction test tetap berjalan.

**Task 6.2 — Command center dan dispatcher**

- [x] Letakkan ringkasan tindakan dan pekerjaan sebelum analytics, mengikuti master Overview. Card berbasis group dapat menuju Queue group sesuai nilainya. Card exception, bila ditampilkan, menjelaskan tujuan link sebagai Queue dengan prioritas exception, tanpa mengklaim filter exception baru.
- [x] Reuse analytics business counts, page views, breakdown dan activity harian. Report range mengubah laporan periode; count pekerjaan terbuka tetap kondisi sekarang, tidak tersembunyi oleh filter tanggal.
- [x] Bedakan collection disabled, data kosong dan service unavailable. Jangan mengganti unavailable dengan nol atau membuat angka contoh, revenue/AOV, growth, unique visitor, event feed, atau pipeline aggregate baru.
- [x] Queue tetap dispatcher: navigation CTA ke record/workspace, tanpa checkbox bulk action, queue-local done, auto-refresh, atau business action dalam baris.
- [x] Extend `admin-overview-view.test.tsx` dan `admin-action-queue-view.test.tsx`; jalankan regression existing `admin-dashboard.test.ts` serta `admin-page-route.test.ts` untuk summary, partial analytics failure dan deep links yang sah.
- [x] Lengkapi browser chain Overview → Queue/List → detail/workspace → action → kembali, untuk B2B, MAKE dan BUY dengan fixture sintetis.
- [x] Jalankan seluruh gate Core yang tercantum di V3; inspeksi visual/keyboard/reduced motion pada actual routes. Catat evidence sebagai lokal; Owner visual acceptance hanya jika ditinjau dan dinyatakan menerima.

**Acceptance:** Overview menyediakan orientasi dengan CTA yang bekerja; Queue menunjukkan signal existing tanpa business logic duplikat; semua flow Core dapat diselesaikan dari entry point dan kembali dengan query utuh; tidak ada mockup-only capability.

**Urutan:** entry points dikonsolidasikan setelah tujuan nyata tersedia. Hasil batch ini adalah milestone Core yang reviewable; batch 7–8 tidak menjadi syarat menyatakan milestone Core selesai.

## Batch 7 — Management dan supporting Admin (di luar Core)

**Reuse/modify:** `src/app/admin/products/page.tsx`, `products/[id]/page.tsx`, `products/[id]/stock-adjustment-panel.tsx`, `products/[id]/stock/[variantId]/page.tsx`; `portfolio/page.tsx`, `portfolio/[id]/page.tsx`; `pricing/page.tsx`; `src/modules/admin/operations.ts`, query/repository/controls batch 2. Reuse `CatalogService`, `PortfolioService`, stock ledger, pricing reads, form actions dan existing `admins/new`/security/auth screens.

**Create:** tidak ada route produksi baru. Extend integration `admin-list-queries.test.ts` dan component/navigation tests; buat `tests/unit/admin-management-navigation.test.tsx` bila coverage contextual return management belum tercakup.

**Task 7.1 — Management list dan record context**

- [x] Extend parser/repository untuk Products dan Portfolio dengan q name/title/slug serta `publication=published|draft`; terapkan sebelum pagination dan count. Pertahankan field existing, media count, status dan harga/stok server.
- [x] Test filter lebih dari satu halaman; published/draft count berasal dari hasil query, bukan jumlah item halaman. Tidak menambah threshold low stock atau stock signal ke Queue.
- [x] Bawa context list → editor → stock history → editor → list. Stock history memakai canonical route existing, ledger/permission existing, dan root context yang sama.
- [x] Samakan penggunaan shared header/shell pada management. Edit produk/media/varian/portfolio tetap memakai action existing; tidak membuat wizard CRUD baru.

**Task 7.2 — Supporting screen parity**

- [x] Pastikan Pricing tetap daftar/pemeriksaan/aktivasi development yang berizin Owner, sesuai current runtime. Tambah Admin tetap undangan; Keamanan/login tidak memperoleh operasi account management baru.
- [x] Jalankan V1+V2 untuk query management; `admin-pricing-page.test.tsx`, `pricing-admin.test.ts`, `catalog-publish-decisions.test.ts`, `tests/integration/stock-ledger.test.ts`, public portfolio/catalog regressions yang terdampak, serta browser admin invitation/auth.
- [x] Smoke record edit dan stock-history navigation pada fixture. Bila tidak ada perubahan write service, tidak menambah test yang sekadar menyalin markup.

**Acceptance:** pencarian/filter dan context management berfungsi; stock ledger, public publication dan permission tetap; master shell konsisten; tidak ada create/import, pricing editor, atau Admin & Access.

**Urutan:** pekerjaan management memakai kontrak yang sudah terbukti pada Core. Bila perlu rollback, projection list baru dapat dilepas per domain tanpa mengubah data katalog/stock.

## Batch 8 — Privacy list/detail Owner (di luar Core)

**Reuse/modify:** `src/app/admin/privacy/page.tsx`, `src/modules/customer-privacy/service.ts`, `repository.ts`, `handler.ts`, `validation.ts`, `src/components/niuva/privacy-form.tsx`. Route `/api/admin/privacy` tetap memakai `privacyPostHandler("owner")`; route API tidak di-rename. Reuse privacy fields/schema, feature availability, Owner permission, deadline/retention/lifecycle locking, API handle, error messages dan policy preview.

**Create route:** `src/app/admin/privacy/[id]/page.tsx`.

**Create tests:** `tests/unit/admin-privacy-detail.test.tsx`, `tests/unit/admin-privacy-navigation.test.ts`. Extend `customer-privacy-pages.test.ts`, `customer-privacy-routes.test.ts`, `customer-privacy-form.test.tsx`, integration `customer-privacy.test.ts`, dan browser privacy Customer serta operator.

**Backend interfaces:** `CustomerPrivacyService.getOwnerDetail(access: AdminAccess, id: string)` memeriksa availability/`PRIVACY_REQUEST_MANAGE` sebelum `CustomerPrivacyRepository.getOwnerDetail(id)`, mengembalikan projection detail atau null. Tambahkan `CustomerPrivacyService.listOwner(access, input)` dan repository `listOwnerFiltered(input)` untuk status/page; result `{ items, hasNext, filteredTotal, page }`, ukuran halaman tetap 20. Preserve `listOwner(page)` existing untuk compatibility caller lain sampai caller Admin dimigrasi. Status filter berasal dari enum/privacy labels existing.

**Task 8.1 — Read/detail separation**

- [x] Test Owner-only, inactive profile, feature unavailable, UUID malformed, not-found, closed account, purged content dan overdue request. Tidak ada DB read sebelum permission/availability gate.
- [x] List menampilkan reference/kind/status/deadline dengan filter status dan pagination. Pindahkan data/fields penanganan lengkap ke detail berizin Owner. Reuse URL policy preview existing.
- [x] Case dengan contentPurgedAt menampilkan bukti minimum yang memang tersisa; tidak mencoba memulihkan data atau melonggarkan hold/retention rules.

**Task 8.2 — POST/error destination**

- [x] Extend handler hanya untuk branch `action === "owner"`: hidden `responseView=detail` dan UUID request menghasilkan response `/admin/privacy/[id]` dengan normalized root `returnTo`; caller tanpa field tetap memakai response list existing. Target dibangun server dari enum view + validated id, tidak memakai arbitrary redirect path.
- [x] Preserve JSON response/no-store dan native POST/303. Success kembali ke detail dengan hasil penanganan; client-side validation/server error tetap ditampilkan pada form. Existing origin-invalid request tetap ditolak langsung tanpa redirect.
- [x] Perluas validator client `PrivacyForm` yang saat ini menerima hanya `/account/privacy?` atau `/admin/privacy?` agar menerima exact detail path UUID internal yang baru; jangan memperluas menjadi arbitrary `/admin/*`. Tempatkan helper murni `isPrivacyResponseUrl(value: unknown): boolean` di `customer-privacy/validation.ts` yang sudah dipakai client.
- [x] Test `owner_detail_json_response`, `owner_detail_native_303`, `rejects_external_or_wrong_response_path`, `keeps_customer_privacy_response_contract`, `preserves_form_values_on_enhanced_error`. Native validation error memakai initial error contract existing; tidak menyimpan raw input privat dalam URL.
- [x] Jalankan V1+V2 privacy, browser Owner detail dan Customer privacy dengan JS serta tanpa JS. Pertahankan pageshow/pending/error focus existing; tidak membuat generic navigation guard.
- [x] Jalankan final gate V3 setelah batch 7–8 karena shared queries dan shared Customer privacy boundary berubah; update evidence berdasarkan hasil terbaru.

**Acceptance:** Privacy berada pada kelompok Owner dan tetap di luar Core; list → detail → action → kembali membawa status/page asal; response JS/native tidak kembali ke list tanpa konteks; deadline, resolved markers, holds dan retention existing tetap utuh.

**Urutan:** risiko privacy/shared Customer form diperiksa terpisah setelah milestone Core. Rollback UI ke inline list harus mempertahankan handler compatibility dan seluruh state privacy yang sudah tercatat; tidak rollback data lifecycle.

## Validation commands dan regression matrix

Perintah berikut menjadi baseline validasi implementasi; ketika plan pertama disusun belum ada test execution. Hasil execution dan penyesuaian runtime dicatat pada [laporan implementasi](../../frontend/admin-operations-implementation-2026-10-07.md). Gunakan PowerShell pada root repo; hindari perebutan database/server/port.

### V1 — Static + unit/component yang relevan per batch

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test tests/unit/admin-navigation.test.ts tests/unit/admin-pagination.test.tsx
```

Argumen test diganti dengan file existing/new yang disebut pada batch yang sedang dikerjakan; tidak menjalankan file planned yang belum dibuat. Meaningful query/security/workflow test ditulis dan dibuktikan fail → pass sebelum implementasinya; perubahan styling kecil memakai existing coverage serta browser inspection, bukan snapshot baru yang meniru source.

### V2 — Backend/integration/browser terarah

```powershell
corepack pnpm test:backend tests/backend/admin-operations-permissions.test.ts
corepack pnpm db:test:status
corepack pnpm db:test:migrate
corepack pnpm exec vitest run --config vitest.integration.config.mts tests/integration/admin-list-queries.test.ts
corepack pnpm test:e2e:admin-auth admin-operations.spec.ts
```

- Gunakan file backend/integration dan `--grep` browser sesuai case batch; contoh di atas bukan alasan mengulang seluruh coverage setiap batch.
- Direct integration selection memerlukan `TEST_DATABASE_URL` yang sudah disediakan pada proses dan test database yang telah dimigrasi. `tests/integration/setup.ts` memakai safety guard existing. Jika URL proses belum tersedia, gunakan wrapper `corepack pnpm test:integration` yang membaca fallback test setup existing; jangan membuat shell yang membaca/menampilkan `.env*` sendiri.
- `db:test:migrate` hanya saat isolated test schema belum siap/berubah; plan ini tidak menambah migration. Wrapper menggunakan migration deploy pada DB test, bukan reset. Jangan menjalankan migration pada development/hosted/production untuk membuat gate lulus.
- Pakai fixture unik dan helpers `tests/e2e/helpers/actor.ts` serta `tests/helpers/admin-totp.ts`; operator suite sudah memakai database test loopback, MFA sungguhan dan actor header terisolasi. Test tidak mengirim email production atau memakai provider key production.
- Direct integration command dengan file `.test.tsx` tidak direncanakan: integration config existing hanya memuat `.test.ts`; UI assertions diletakkan pada unit/component atau browser.

### V3 — Gate milestone Core dan final delivery lokal

```powershell
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm db:validate
corepack pnpm test
corepack pnpm test:backend
corepack pnpm test:integration
corepack pnpm test:e2e
corepack pnpm test:e2e:admin-auth
corepack pnpm build
```

Full gate dilakukan pada akhir batch 6 dan setelah perubahan batch 7–8. Setelah suatu gate lulus, jangan mengulang tanpa perubahan baru/failure/concern yang jelas. Existing CI tetap memakai workflow yang ada; membuat PR/menjalankan CI remote/merge bukan bagian approval implementasi ini.

| Regression boundary | Bukti yang harus dipertahankan |
| --- | --- |
| Access | Sign-in/MFA/inactive/non-admin, Owner-only menu dan service permission; direct route/action tidak membaca/mengubah data tanpa gate. |
| Navigation | Existing URL tetap, query filter/page/range/group bertahan, direct URL fallback, deep link workspace dan related record valid; tanpa global scroll/focus restoration. |
| Query | Validasi malformed/array/enum, >50 filtered records, deterministic sort, full filtered count, empty vs unavailable. |
| B2B | Proposal snapshot/version/Customer ownership; acceptance tidak membuat order; inquiry status tetap action Admin. |
| MAKE | Private-file access, model readiness, estimate staleness, active pricing, Decimal, quote immutability/expiry/revalidation, order hanya melalui acceptance. |
| Orders | Verified settlement, payment hold, lifecycle retail/custom, package final, shipping-payment gate, shipment metadata; refund tidak otomatis restock. |
| Catalog/stock | Harga/publication existing, varian, stock physical/reserved/available distinction, stock ledger reason/actor/link. |
| Privacy | Owner availability gate, JS/native POST response, Customer flow, deadline asli, lifecycle lock, resolved/closed/purged markers dan retention. |
| Analytics | Current work vs report period, disabled/empty/unavailable, partial business/traffic failure, tidak menciptakan metrics tanpa source. |

### Browser dan visual validation

- Inspeksi actual routes dengan fixture berizin: Overview, Queue, tiga Core lists/detail, dan dua Core workspaces; pada batch 7–8 tambahkan editor/stock-history/Privacy detail yang berubah.
- Gunakan 320/390px dan 1280/1440px untuk tiap composition yang berubah; cek 768/1024px khusus transisi sidebar/list/workspace. Tidak harus mengambil capture semua kombinasi jika memakai composition shared yang telah diperiksa.
- Periksa overflow, urutan baca, active navigation, controls minimal 44px, keyboard/focus dasar, reduced motion, dan pending/error/empty/unavailable/success. Existing focus pada field error/sidebar toggle tetap berjalan.
- Capture review hanya fixture sintetis pada local actual route; test auth suite mempertahankan trace/screenshot/video off. Owner review lokal, physical-device/AT, provider readiness dan production tetap evidence berbeda.

## Menjaga batch tetap kecil dan reviewable

- Pertahankan `AdminOperationsService` sebagai facade existing. Pindahkan hanya query list/relasi yang disentuh ke repository aditif; hindari split seluruh file domain atau rewrite API.
- Setiap batch selesai pada gate yang disebut, kemudian lanjut dependency berikutnya. Route baru dihubungkan hanya saat page + gate + action + regression slice-nya lengkap.
- Existing page/detail tetap canonical; sebelum batch workspace, form existing tetap berfungsi. Pemisahan dilakukan dalam batch yang sama, sehingga tidak ada intermediate delivery dengan action hilang.
- Tidak memakai feature flags baru untuk menjalankan UI belum lengkap. Pisahkan perubahan berdasarkan file/task yang reviewable dan tampilkan hasil setiap milestone lokal.
- Git workflow berikutnya hanya setelah instruksi eksplisit: gunakan branch prefix `codex/`, explicit file allowlist, dan jangan menyertakan dirty changes milik pekerjaan lain. Jangan membuat commit/push otomatis dari checklist plan ini.

## Ringkasan execution — 7 Oktober 2026

Delapan batch selesai. Checklist menunjuk implementasi dan coverage lokal; gate akhir: lint, strict typecheck, Prisma validation dan build PASS; **1.331 unit/component**, **582 backend**, **149 integration**, **11 browser Admin**, **111 browser publik + 5 expected skip**. Evidence aktual, file/route, capture, risiko dan rollback ada pada [laporan implementasi](../../frontend/admin-operations-implementation-2026-10-07.md).

Penyesuaian execution dalam scope:

- Hubungan order/request diuji melalui acceptance valid `QuoteService` pada integration existing `customer-work-slice.test.ts`. Browser memakai fixture accepted order untuk navigasi dua arah; tidak mengklaim test browser acceptance Customer atau provider.
- B2B browser memakai 51 record filter untuk menguji detail/workspace → asal halaman 2 → refresh. Label kembali memakai nama root aktual, termasuk Overview/Action Queue.
- Komponen skeleton `loading.tsx` dipindahkan utuh ke `admin-loading.tsx` setelah browser tanpa JavaScript menemukan konten final tersembunyi oleh automatic streaming boundary. Hash normalized content tetap sama. URL tidak berubah; initial navigation Admin menunggu HTML lengkap.
- Runtime browser Privacy memakai capability Customer mock existing yang terbatas pada test/loopback; Better Auth/MFA Admin tetap real. Tidak ada perubahan auth policy production.
- Cluster test lama mengalami PostgreSQL `58P01` sebelum tes aplikasi. Validation menggunakan cluster terisolasi baru port 55439; 20 migration existing berhasil diterapkan. Cluster lama tidak direset atau diperbaiki manual, dan source migration tidak berubah.
- Backend parallel awal memiliki satu timeout optimizer gambar existing. Replay penuh dengan satu worker lulus; timeout/assertion tidak dilonggarkan.
- File baru di luar nama test yang direncanakan terbatas pada header/Privacy permission coverage. Tidak ada dependency, schema, tambahan route keempat, atau fitur deferred baru.

## Coverage terhadap permintaan Owner dan catatan approval

| Permintaan | Lokasi plan |
| --- | --- |
| Batch dependency/risiko dan alasan urutan | Tabel urutan + alasan tiap batch |
| Core lebih dahulu | Batch 1–6 + milestone Core V3 |
| Reuse file/component/service | Bagian reuse/modify setiap batch |
| File/route baru yang diperlukan | Create tiap batch; hanya tiga route baru |
| Backend/query delta | Kontrak list/relasi, batch 2/4/6/7/8 |
| Acceptance per batch | Acceptance tiap batch |
| Regression/test/validation | Review Focus, test tasks, V1–V3, regression matrix |
| Hindari big-bang | Facade kompatibel, repository aditif, canonical routes dan complete slices |
| Route existing tidak rename | Global constraints + inventory baseline |
| Scroll/focus restoration dan unsaved guard bukan prioritas | Deferred; hanya accessibility existing dipertahankan |
| Detail Privacy bukan Core | Batch 8 setelah milestone Core |
| Scope deferred tidak diperluas | Global constraints + acceptance batch |

**Plan self-review saat planning:** requirement coverage dipetakan di atas; source paths, script names, runtime API, interface dependencies, revalidation workspace serta response Privacy JS/native dicocokkan dengan checkout. Architecture dicatat sebagai spec. Pernyataan belum ada coding/test berlaku pada fase planning; hasil execution kini tersedia pada laporan terpisah.

**Execution handoff:** delapan batch diimplementasikan secara native pada `codex/admin-operations-architecture`. Laporan mencatat file, acceptance, hasil gate, bukti visual, batas runtime, dan rollback. Evidence validasi bersifat lokal/non-production; walkthrough serta penerimaan visual baru oleh Owner belum tercatat. Instruksi commit, push dan PR diberikan Owner setelah laporan implementasi selesai.
