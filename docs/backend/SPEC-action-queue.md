# Spec: Action Queue

Status: **OWNER_APPROVED** (persetujuan awal 2026-09-10).
Pemeriksaan: **2026-09-30**, `main` pada `9605a96e936236b7e54b526f05e6b344747b24ab`.
Module ID: `action-queue`. Revisi navigasi dikirim melalui branch `codex/admin-navigation-docs-v03`.

Dokumen ini menjelaskan projection runtime dan keputusan pengecualian yang
Owner tegaskan kembali pada sesi 2026-09-30. [PRD](../PRD-Niuva-MVP.md),
[Tech Design](../TechDesign-Niuva-MVP.md) dan [lifecycle](lifecycle-contract.md)
tetap authority domain. [DESIGN](../../DESIGN.md) mengatur shell visual;
[readiness](../frontend/mvp-release-readiness.md) membedakan implementasi,
penerimaan visual, provider dan produksi.

## Route, akses dan batas data

`/admin` adalah Overview; `/admin/queue` adalah Action Queue lengkap. Keduanya
memanggil `requireAdmin()` sebelum membaca data: sesi Clerk valid dan
`AdminProfile.isActive` yang cocok dengan Clerk user ID. Role berasal dari
database. Tidak ada provisioning otomatis atau bypass login.

Queue tetap read-only dan server-owned. Link menuju detail yang sudah tersedia;
mutasi pada detail memeriksa permission dan transition sendiri. Daftar memuat
reference operasional, jenis pekerjaan, judul, next action, attention,
timestamp dan link internal. Tidak ada nama/kontak/alamat Customer, metadata
file privat, internal notes, payment amount, provider ID atau raw provider JSON.
UUID dapat berada dalam identity/link internal, bukan reference utama di layar.

## Tujuh signal yang diimplementasikan

| Kind | Kondisi sumber | Timestamp | Next action / tujuan |
| --- | --- | --- | --- |
| B2B_INQUIRY | B2BInquiry.status = NEW | updatedAt | Tinjau brief proyek baru; `/admin/inquiries/[id]`. |
| CUSTOM_PRINT_REVIEW | CustomPrintRequest.status = SUBMITTED | updatedAt | Mulai review custom print; `/admin/custom-print/[id]`. |
| QUOTE_PREPARATION | Request QUOTE_READY dan tidak memiliki quote DRAFT | updatedAt | Siapkan quote; detail request. |
| QUOTE_SEND | CustomPrintQuote.status = DRAFT | createdAt | Kirim quote; detail request melalui requestId. |
| ORDER_PROCESSING | Order.status = PAID | updatedAt | Proses pesanan berbayar; `/admin/orders/[id]`. |
| PACKAGE_MEASUREMENT | CUSTOM_PRINT order pada FINISHING_QC | updatedAt | Ukur paket final untuk pengiriman; detail order. |
| SHIPPING_EXCEPTION | Shipment.status = EXCEPTION | updatedAt | Tinjau exception pengiriman; detail order melalui orderId. |

Repository memilih field minimum dari record saat ini. Tidak ada tabel
OperationalQueue atau task lokal sebagai pengganti state domain.

## Projection, filter dan urutan

Sumber kode: [types/mapping](../../src/modules/admin/action-queue.ts),
[repository](../../src/modules/admin/action-queue-repository.ts),
[service](../../src/modules/admin/action-queue-service.ts).

- Deduplikasi memakai `kind + entityId`; signal duplikat memakai timestamp
  terbaru. Workflow request yang sudah memiliki draft tidak memunculkan
  prepare-quote kedua; mapper juga menekan QUOTE_PREPARATION ketika ada
  QUOTE_SEND dengan workflowKey yang sama.
- Shipping EXCEPTION tampil pertama, kemudian sourceUpdatedAt tertua;
  timestamp sama memakai identity sebagai tie-break yang deterministik.
- Query group divalidasi di server: `all`, `inquiries`, `custom-print`, `orders`.
  Invalid/missing kembali `all`. Filter dilakukan sebelum limit 50.
- `totalOpen` dihitung setelah deduplikasi sebelum filter/limit.
  `filteredTotal` sebelum limit. `priorityItems` adalah lima item pertama
  seluruh queue tanpa filter group, untuk panel prioritas Overview.
- Result: `{generatedAt, group, totalOpen, filteredTotal, items, priorityItems}`.
  Item: `{id, href, kind, reference, title, nextAction, attention, sourceUpdatedAt}`;
  attention hanya STANDARD atau EXCEPTION. `id` bukan command/mutation token.

Overview juga membaca DashboardService (counts status dan aktivitas createdAt)
dan AnalyticsService (empat metrik periode 30d/13m kalender Asia/Jakarta).
Hitungan order laporan bisnis memakai paidAt; tidak disamakan dengan aktivitas
createdAt. Business/traffic analytics dapat gagal secara independen; bagian
gagal unavailable, bukan nol. Query queue atau dashboard gagal memakai safe
page unavailable. Collection analytics tetap mati secara default.

## Batas payment dan stock

| Topik | Keputusan Owner / runtime sekarang | Gate sebelum fitur lanjutan |
| --- | --- | --- |
| Payment-event exception | **EXCLUDED_UNTIL_LIFECYCLE**. Tidak masuk queue. PaymentEvent masih menyimpan outcome mismatch, conflict, late settlement/refund dan outcome lain sesuai service. | Lifecycle server yang mendefinisikan open, acknowledgment/resolution, siapa yang berwenang, transisi dan audit. Pemilik: Owner dengan kontrak admin/payment. |
| Alert stok | **EXCLUDED_UNTIL_POLICY**. Tidak masuk queue. Inventory/reservations/StockMovement tetap berlaku. | Ambang stok, prioritas dan tindakan operator disepakati Owner, baru pemetaan signal diimplementasikan. |
| Shipping exception | Included karena current Shipment.status = EXCEPTION mempunyai state domain otoritatif. | Mutasi/detail mengikuti service pengiriman yang tersedia. |

Pilihan untuk mengecualikan payment/stock sudah ditutup; lifecycle penyelesaian
dan threshold fitur masa depan masih terbuka. Tidak boleh menafsirkan historic
PaymentEvent sebagai pekerjaan aktif selamanya, atau memakai flag browser,
timeout tebakan, maupun stock threshold baru. Pengecualian queue tidak mengubah
lifecycle pembayaran, refund, stok, atau menyatakan incident telah selesai.

## Navigasi dan state layar

Semua route Admin berizin memakai AdminShell. Revisi lokal 2026-10-01 pada
`lg` ke atas menempatkan toggle sebagai satu-satunya kontrol di footer sidebar.
Area logo dan footer tetap terlihat; daftar navigasi dapat menggulir sendiri
pada viewport pendek. Toggle beralih antara sidebar 13.25rem dan rail 4rem,
menampilkan tombol ikon saja berukuran 44px pada kedua keadaan, dengan nama
aksesibel dan tooltip “Lipat navigasi Admin” atau “Perluas navigasi Admin”. Fokus tetap berada pada tombol setelah toggle.
Default pertama terbuka; browser menyimpan `niuva.admin.sidebar.v1` dengan
nilai expanded/collapsed. Storage ditolak menggunakan fallback memori.
Logo lengkap Horizontal light dan simbol biru resmi Logo System v1.0 sama-sama
berada pada putih, dengan tinggi visual simbol sekitar 24px dan posisi selaras.
Nama link aksesibel, tooltip hover/fokus, `aria-current` untuk route aktif,
serta toggle `aria-expanded`/`aria-controls` tetap tersedia. Header kanan
desktop berurutan Situs publik, role, Keluar; Situs publik menuju `/` pada tab
yang sama. Mobile tetap memakai logo lengkap versi terang dan disclosure
Menu Admin dengan label penuh serta link Situs publik di dalam disclosure.

| State | Perilaku |
| --- | --- |
| Auth unavailable/unauthenticated/inactive/non-admin | Access unavailable; tidak membaca atau menampilkan queue. |
| Authorized, tanpa signal cocok | Empty state nyata dan jumlah nol; tanpa fixture. |
| Authorized, ada signal | Safe projection, next action tekstual, detail link berizin. |
| Repository/service gagal | Safe recovery, tidak membocorkan record/provider/database detail. |
| Status sumber berubah | Navigasi/refresh membaca ulang server; detail mutation wajib revalidasi sendiri. |
| Business atau traffic analytics gagal | Bagian analytics lain yang berhasil tetap terlihat; unavailable tidak diganti nol. |

Filter query server dan tooltip tidak memberikan kewenangan mutasi. Tidak ada
queue-local done state, fake navigation, auto-refresh atau SLA timer baru.

## Verifikasi dan kriteria penerimaan

Backend menguji signal, deduplikasi, redaksi, urutan/filter/count/limit dan akses.
Unit menguji populated/empty/error serta shell/access. Browser memeriksa akses
fail-closed tanpa Clerk dan navigasi actual Admin berizin secara terpisah.
Evidence sidebar 2026-09-30 tetap histori. Untuk revisi posisi/logo 2026-10-01,
periksa footer pada viewport pendek, utilitas header, konsistensi logo,
expanded/rail, keyboard/fokus setelah toggle, tooltip/Escape, route aktif,
persistence navigasi/reload, mobile, reduced motion dan scroll horizontal;
jalankan lint/typecheck/unit/E2E/build dan pemeriksaan diff/dokumen.

Kriteria terpenuhi ketika hanya tujuh signal server yang tampil setelah akses
valid; total/filter/limit sesuai projection; data privat tidak bocor; detail
link nyata; payment/stock tetap excluded; dan preferensi sidebar tidak mengubah
API/schema/domain. Visual shell revisi **ACCEPTED_OWNER_LOCAL** pada 2026-10-01 setelah Owner
meninjau Overview Admin aktual. Evidence fisik/AT/provider/produksi tetap gate tersendiri.

## Histori persetujuan

2026-09-10: Owner menyetujui irisan awal read-only, shipping exception lebih
awal, daftar bounded, menunda payment dan stock serta tanpa mutation hand-off.
2026-09-26: Owner mengizinkan Overview dan Action Queue terpisah, filter dan
link detail server. 2026-09-27: versi lokal saat itu diterima; penerimaan tidak
berpindah ke shell komposisi 2026-09-28. 2026-09-30: Owner memilih sidebar
collapsible dan menegaskan pengecualian payment/stock. 2026-10-01: Owner menerima visual shell terkini setelah revisi posisi kontrol,
logo putih, tombol ikon dan lebar penuh pada Overview Admin lokal. Kandidat awal no-filter,
no-link dan generic PAYMENT_EXCEPTION tidak lagi menjadi kontrak runtime.
2026-10-01: Owner memilih footer sidebar untuk toggle, header kanan desktop
untuk Situs publik, dan latar putih konsisten untuk logo lengkap/simbol.
Pilihan implementasi ini belum merupakan penerimaan visual hasil revisi.
