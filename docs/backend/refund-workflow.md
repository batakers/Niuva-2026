# Kasus dan persetujuan refund v1

Implementasi T21–T22, 19 Oktober 2026. Authority produk tetap
[PRD/addenda](../PRD-Niuva-MVP.md), [kontrak publik](../legal/customer-public-runtime-contract.md)
dan [SOP refund](../legal/customer-service-refund-sop.md). Status pelaksanaan
dan bukti berada di [TASKS](../../TASKS.md). Ini tidak mengesahkan policy publik,
memberi izin provider, atau menyatakan pengembalian dana sudah selesai.

## Boundary dan persistensi

Customer membuka `/account/orders/[id]/refund`; Owner/Admin membuka
`/admin/orders/[id]/refund` dari detail order. Server Actions memakai guard
Next yang sama dengan aplikasi; JSON API berada di path `/api/account/orders/`
dan `/api/admin/orders/` yang bersesuaian. API POST memeriksa origin,
Content-Type JSON, body 4 KiB, actor throttle dan Zod strict. ID order berasal
dari path/parameter action. Customer berasal dari sesi, nominal dari server.
Response API pribadi memakai `private, no-store`, termasuk error.

`RefundService` memvalidasi input/authority; aturan nominal dan state berada di
`refund/core.ts`; repository mengunci dan mempersistensikan transaksi atomik.
Urutan lock mengikuti lifecycle Customer, profile Admin bila relevan,
`lockPaymentOrder` canonical (payment attempts lalu order), kemudian kasus.
Profile aktif/role/authUserId dan expiry internal diperiksa ulang di database.

| Record | Kontrak |
| --- | --- |
| RefundCase | Satu per order; submission key/hash, sumber pemohon, kategori/alasan, waktu penerimaan asli, total IDR, version dan approval aktif. FK Customer dapat SET NULL saat closure. |
| RefundAllocation | Unik per payment attempt; snapshot purpose/provider/reference/nominal dan sumber SETTLED atau late settlement terverifikasi. |
| RefundApproval | Append-only melalui service; Owner, reason, revision, alokasi/nominal immutable, syarat retur dan waktu approval. Satu approval per case version; key ulang identik tidak menulis lagi. |
| RefundReturnReceipt | Satu per approval bersyarat; Owner, referensi bukti internal, alasan dan waktu penerimaan. Tidak menulis ulang approval asli. |
| RefundCaseRevision | Refresh eksplisit Owner menyimpan before/after snapshot dan alasan; waktu penerimaan kasus tidak berubah. |

Constraint database menolak nominal nonpositif, alokasi pembayaran ganda,
status/revision tidak konsisten serta approval/receipt tanpa bentuk bukti yang
diwajibkan. Migration baru bersifat additive. Migration historis tidak diedit.

## Nominal dan persetujuan

Refund penuh memakai seluruh charge masuk yang terverifikasi pada order,
termasuk ongkir awal dan pembayaran ongkir final MAKE yang reference-nya
terpisah. Pending retry tidak dijumlahkan. Decimal dengan precision 40
mempertahankan IDR integer; browser tidak mengirim nominal. Late settlement
membutuhkan receipt server `LATE_SETTLEMENT_REFUND_REQUIRED`; kasusnya tidak
menghidupkan ulang order batal atau mengubah payment attempt menjadi settled.

Status refund legacy, refund parsial dan exception verifikasi yang belum
diselesaikan ditolak untuk pengajuan/approval baru sampai hasilnya
direkonsiliasi. Ini mencegah refund kedua berdasarkan asumsi. Bukti dana final
dan penyelesaian exception adalah T23/T25, bukan keputusan default T21.

Hanya Owner aktif dengan `PAYMENT_REFUND_FULL` dapat approve, refresh atau
memenuhi syarat retur. Approval memeriksa kembali versi dan fingerprint semua
alokasi server. Pembayaran yang berubah memerlukan refresh dan review ulang.
Refresh mencabut approval aktif dan menyimpan riwayat; ia bukan resend dana.

| Syarat retur | Kesiapan |
| --- | --- |
| PENDING | Approval bersyarat; readyAt NULL. Tidak memberi izin submission. |
| RECEIVED | Referensi bukti wajib; waktu pemenuhan dicatat. |
| NOT_REQUIRED / WAIVED | Alasan Owner wajib; keputusan tercatat, bukan default form. |

Retur setelah approval PENDING membutuhkan receipt Owner eksplisit.
`readyAt` mengambil pemicu terakhir antara approval dan pemenuhan retur.
Approval dan receipt berulang dengan key sama tidak menulis audit/record
ganda. Key yang dipakai untuk parameter berbeda, stale version dan overlap
keputusan berbeda ditolak. Tidak ada provider submission di tahap ini.

## Privacy, operasi dan batas bukti

Customer lain tidak dapat membaca/mengajukan kasus. Closure berbagi lifecycle
lock, menghapus FK akun dan meninggalkan marker order; pendaftaran ulang dengan
email sama tidak memperoleh kasus lama. Owner tetap dapat menangani kasus
melalui order yang detached. Intake staf dari kanal layanan memerlukan
referensi verifikasi pihak yang berwenang dan tidak memulihkan akun.
Intake staf wajib menyertakan waktu penerimaan pertama dari kanal layanan;
form memakai WIB, API menerima ISO dengan offset, dan repository menolak waktu
di masa depan terhadap clock database. Waktu tersebut ikut audit dan tetap
dipertahankan saat retry atau refresh. Customer memakai waktu penerimaan server.
Kasus refund yang belum COMPLETED menahan retensi model MAKE melalui relasi
order, termasuk setelah closure dan pada pemeriksaan ulang sebelum efek storage.

Ekspor privacy menyertakan kasus/nominal/alokasi milik Customer melalui
proyeksi eksplisit. Owner decision internal, operation key/hash, provider
transaction reference dan referensi bukti internal tidak diekspor otomatis.
Retensi arsip/keuangan dan kalender SLA tetap memerlukan input Owner.
Tidak ada penghapusan bukti finansial atau penetapan tenggat bisnis baru.

T23/T25 masih memiliki submission key provider/attempt, capability merchant,
window, timeout/unknown, fallback manual berizin, hasil bank dan reconciliation.
Sebelum submission, versi/approval/retur/nominal/overlap wajib divalidasi ulang.
Approved dan readyAt tidak menyatakan dana sudah kembali. Expense retur di luar
charge memerlukan ledger serta approval terpisah dan tidak ditambahkan ke
nominal provider asal. Refund tidak menambah stock atau membalik lifecycle
produksi/pengiriman. T30 menangani notifikasi operasional persisten; WhatsApp
otomatis tidak ditambahkan.

Rollback sebelum aktivasi: tutup entry point baru bila diperlukan, pertahankan
kasus, alokasi, history, receipt dan audit. Jangan drop/reset tabel untuk
mengembalikan UI lama. Tidak ada provider atau uang yang dieksekusi oleh slice
ini. Resource staging/production, physical-device/AT dan penerimaan visual
Owner tetap memerlukan bukti masing-masing.
