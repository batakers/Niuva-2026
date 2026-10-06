# Spec: Action Queue

Status: **OWNER_APPROVED** (persetujuan awal 2026-09-10).
Baseline audit: **2026-10-06**, `main` pada `4b1bb7a92f3581a5ee6c8fb1fa0f3dd0a6a03c36`.
Revisi payment exception disetujui Owner pada sesi 2026-10-06; validasi lokal
tetap terpisah dari aktivasi provider dan produksi.
Module ID: `action-queue`. Revisi navigasi dikirim melalui branch `codex/admin-navigation-docs-v03`.

Dokumen ini menjelaskan projection runtime dan keputusan pengecualian yang
Owner tegaskan kembali pada sesi 2026-09-30, dengan perluasan payment exception
yang disetujui pada 2026-10-06. [PRD](../PRD-Niuva-MVP.md),
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

## Delapan signal yang diimplementasikan

| Kind | Kondisi sumber | Timestamp | Next action / tujuan |
| --- | --- | --- | --- |
| B2B_INQUIRY | B2BInquiry.status = NEW | updatedAt | Tinjau brief proyek baru; `/admin/inquiries/[id]`. |
| CUSTOM_PRINT_REVIEW | CustomPrintRequest.status = SUBMITTED | updatedAt | Mulai review custom print; `/admin/custom-print/[id]`. |
| QUOTE_PREPARATION | Request QUOTE_READY dan tidak memiliki quote DRAFT | updatedAt | Siapkan quote; detail request. |
| QUOTE_SEND | CustomPrintQuote.status = DRAFT | createdAt | Kirim quote; detail request melalui requestId. |
| ORDER_PROCESSING | Order.status = PAID tanpa payment hold | updatedAt | Proses pesanan berbayar; `/admin/orders/[id]`. |
| PACKAGE_MEASUREMENT | CUSTOM_PRINT order pada FINISHING_QC tanpa payment hold | updatedAt | Ukur paket final untuk pengiriman; detail order. |
| SHIPPING_EXCEPTION | Shipment.status = EXCEPTION | updatedAt | Tinjau exception pengiriman; detail order melalui orderId. |
| PAYMENT_EXCEPTION | Payment hold yang masih aktif menurut state attempt dan outcome terverifikasi | Timestamp issue aktif tertua per order | Periksa pembayaran bersama Owner; detail order. |

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
- Payment/shipping EXCEPTION tampil pertama, kemudian sourceUpdatedAt tertua;
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
| Payment-event exception | Included untuk issue aktif yang berasal dari outcome provider terverifikasi. Tidak ada acknowledge/dismiss manual yang membuka fulfillment. | Resolusi mengikuti bukti provider dan lifecycle domain di bawah; refund/pembatalan berbayar tetap kewenangan Owner. |
| Alert stok | **EXCLUDED_UNTIL_POLICY**. Tidak masuk queue. Inventory/reservations/StockMovement tetap berlaku. | Ambang stok, prioritas dan tindakan operator disepakati Owner, baru pemetaan signal diimplementasikan. |
| Shipping exception | Included karena current Shipment.status = EXCEPTION mempunyai state domain otoritatif. | Mutasi/detail mengikuti service pengiriman yang tersedia. |

Pengecualian alert stok tetap berlaku. Revisi payment tidak menafsirkan seluruh
history PaymentEvent sebagai pekerjaan aktif selamanya, memakai flag browser,
timeout tebakan, atau mengubah lifecycle stok.

### Lifecycle payment hold — revisi 2026-10-06

Projection bersama berada di `src/modules/payment/operational-state.ts`;
selection/locking database berada di `operational-repository.ts`. Queue dan
detail order memakai aturan yang sama dengan pengaman fulfillment server.

- Refund penuh pada order aktif menghasilkan `FULL_REFUND`: proses produksi,
  pemenuhan dan pengiriman ditahan. Ini belum membatalkan order. Generic paid
  cancellation tetap fail-closed; workflow refund/cancellation khusus tetap
  diperlukan sesuai kebijakan yang sudah disetujui.
- `PARTIAL_REFUND_REQUIRES_EXCEPTION` menghasilkan `PARTIAL_REFUND`; callback
  berulang tidak menambah pekerjaan kedua. Refund parsial tetap tidak didukung
  sebagai kebijakan bisnis MVP. Owner memeriksa dan menangani melalui Midtrans.
- `LATE_SETTLEMENT_REFUND_REQUIRED` tetap aktif pada order yang dibatalkan
  sampai ada konfirmasi refund penuh. `REFUNDED_AFTER_LATE_SETTLEMENT` hanya
  dicatat dari webhook terverifikasi untuk attempt dengan late settlement yang
  tercatat. Attempt expired/cancelled tetap immutable; order tidak dibuka lagi.
- Refund penuh terkonfirmasi menyelesaikan issue finansial pada order
  `CANCELLED`/`COMPLETED`. Pada order aktif, issue berubah menjadi `FULL_REFUND`
  dan hold tetap berlaku sampai lifecycle operasional ditutup secara sah.
- Amount mismatch, konflik transaction ID, atau settlement status-code invalid
  menghasilkan `PAYMENT_VERIFICATION`. Hanya konfirmasi settlement valid yang
  lebih baru (`SETTLED`/`STALE_SETTLED`) menyelesaikan issue verifikasi tersebut.
- Replay settlement sah tidak menghasilkan late-payment baru. History lama
  yang salah mengklasifikasikan replay pada attempt SETTLED dengan receipt
  SETTLED tidak diproyeksikan sebagai late-payment yang belum direfund.
- Unknown/unlinked payment event belum menjadi item queue order; tidak ada
  pemetaan customer/order melalui tebakan provider reference.

Order dengan hold tidak sekaligus ditampilkan sebagai siap proses/pengukuran.
Penolakan transition order dicatat ke audit. Mutasi status, pencatatan resi,
dan pembuatan tagihan shipping custom memeriksa ulang payment hold di dalam
transaksi dengan lock attempt sebelum order, mengikuti urutan webhook.
Settlement shipping juga tidak boleh membuka READY_TO_SHIP jika pembayaran
order lain masih memiliki hold. Refund tidak melakukan restock fisik otomatis.

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
