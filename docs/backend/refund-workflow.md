# Kasus, submission dan reconciliation refund v1

Implementasi T21–T22, 19 Oktober 2026; kelanjutan T23/T25, 21 Oktober 2026.
Authority produk tetap
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

T24 menambahkan receipt `REFUND_REQUIRES_RECONCILIATION` ketika Get Status
melaporkan refund yang belum mempunyai bukti hasil dana. Receipt ini juga
menahan pengajuan/approval; settlement ulang tidak menghapus ketidakpastian
refund. Lihat [reconciliation pembayaran](payment-reconciliation.md).

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
keputusan berbeda ditolak. Approval sendiri tidak mengirim refund.

## Submission dan hasil dana T23/T25

`RefundExecutionService` memvalidasi input dan Owner aktif; repository memakai
lock lifecycle/payment/case yang sama. JSON API berada di
`/api/admin/orders/[id]/refund/execution`; Server Actions dan form native
menggunakan service yang sama. Admin biasa dan Customer tidak dapat mengirim,
mengotorisasi, mencabut persetujuan manual atau mencatat transfer.

Setiap alokasi mempunyai satu `RefundExecution` dengan `refund_key` tetap.
`RefundExecutionAttempt` disimpan sebelum pemeriksaan provider; request POST,
clock pertama dan nomor percobaan disimpan sebelum akses jaringan. Submission
key yang sama dengan input sama tidak mengirim ulang; input berbeda ditolak.
Amount tetap berasal dari alokasi Decimal server dan alasan provider berupa
teks umum yang aman. `receivedAt` asli tidak diubah.

Sebelum POST, Get Status harus membuktikan transaksi/nominal dan status settled.
`RefundMerchantRule` harus cocok dengan binding merchant, metode/channel,
jalur, masa berlaku, usia pembayaran dan batas percobaan yang dibuktikan.
Tidak ada rule/cakupan universal yang di-seed. Verifikasi saldo dan kesiapan
merchant tetap membutuhkan bukti operasi. Tanpa rule yang sah, POST ditahan.

| State execution | Arti dan tindak lanjut |
| --- | --- |
| READY / CHECKING | Belum ada POST, atau preflight sedang memeriksa. Preflight yang tertahan sebelum POST kembali READY. |
| SUBMITTING | Intent dan clock POST sudah durable; belum ada hasil pasti. |
| ACCEPTED | Provider menerima request; bukan bukti dana diterima bank. |
| RETRYABLE | Penolakan sementara yang pasti; key/body dan clock pertama tetap, cooldown/max-attempt/rule dan batas tujuh hari berlaku. |
| UNKNOWN | Timeout, hasil tak pasti, atau retry preflight yang tertahan setelah POST sebelumnya. Tidak memberi izin POST baru; query/bukti provider dan review Owner diperlukan. |
| EXCEPTION | Partial, transaksi tidak eligible, konflik reference, refund eksternal atau respons accepted terlambat setelah persetujuan manual. Kasus tetap RECONCILING. |
| MANUAL_AUTHORIZED | Owner telah memeriksa tidak ada hasil provider pending/berhasil serta nominal/penerima; belum ada transfer yang dicatat. |
| CONFIRMED | Receipt provider atau bukti transfer manual telah direkonsiliasi; kasus selesai hanya bila setiap alokasi mempunyai receipt dan state ini. |

Receipt provider memerlukan Get Status tepercaya dengan transaksi/amount,
refund key, reference unik dan waktu `bank_confirmed_at` yang cocok setelah
request pertama. Notification refund hanya memicu hold/reconciliation dan
tidak menyelesaikan dana. Receipt immutable tidak ditulis ulang. Pemeriksaan
receipt yang sama boleh memulihkan state setelah observation yang bertentangan,
tetapi tidak menutup exception pada alokasi lain atau menggandakan receipt.

Fallback manual mempunyai dua langkah Owner: persetujuan dengan reference
resolusi provider dan verifikasi penerima, lalu pencatatan transfer dengan
reference unik, bukti dan waktu sesudah persetujuan. UI tidak mentransfer uang.
Satu transfer dapat menutup beberapa alokasi MAKE dengan total tepat. Owner
dapat mencabut persetujuan yang belum dibayar, dengan alasan dan revision;
bukti lama tetap ada, tidak dapat dipakai membayar, dan tidak membatalkan
transfer yang sudah tercatat. Operasi provider yang sebelumnya tak pasti
kembali UNKNOWN saat persetujuan dicabut.

Observation PARTIAL, EXTERNAL_REFUND_REQUIRES_REVIEW atau REFERENCE_CONFLICT
pada alokasi yang belum selesai menahan persetujuan manual nilai penuh.
Observation settled/unavailable berikutnya atau pencabutan persetujuan tidak
menghapus hold tersebut. Penyelesaian sisa kewajiban setelah partial/external
refund memerlukan rekonsiliasi bukti dan irisan resolusi eksplisit; runtime
ini tidak menebak nominal tersisa atau menyediakan fitur refund parsial umum.

Job `REFUND_RECONCILIATION` adalah GET-only melalui runner/lease/binding/role
canonical di `src/modules/jobs/`, batch execute maksimum 10. Lease diverifikasi
kembali setelah apply; kehilangan lease membatalkan receipt, status payment
dan audit dalam transaksi tersebut. Dry-run tidak memanggil provider. Monitoring
memuat remainingDue/lag dan alarm refund; adapter CLI/internal HTTP tidak
mengaktifkan scheduler. T08 file retention, T24 payment reconciliation dan
outbox bisnis tetap berada pada registry canonical yang sama.

Adapter saat ini membatasi endpoint ke sandbox dan menolak konfigurasi live/
production. Fixture lokal memeriksa kontrak adapter tanpa request provider;
ini belum membuktikan sandbox merchant. Sebelum perluasan provider diperlukan
PUB-REFUND-PROVIDER/PUB-REFUND-RECON dan T35: metode/channel/window/saldo/ETA,
reference hasil bank, jalur manual, role/resource/cadence hosted dan petugas.
Rujukan provider: [Refund Transaction](https://docs.midtrans.com/reference/refund-transaction)
dan [Get Transaction Status](https://docs.midtrans.com/reference/get-transaction-status).

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

T23/T25 mengimplementasikan submission key provider/attempt, gate capability
merchant, window, timeout/unknown, fallback manual berizin dan reconciliation
pada batas fixture lokal di atas. Sandbox/merchant dan lingkungan hosted
masih terbuka. Sebelum submission, versi/approval/retur/nominal/overlap wajib
divalidasi ulang.
Approved dan readyAt tidak menyatakan dana sudah kembali. Expense retur di luar
charge memerlukan ledger serta approval terpisah dan tidak ditambahkan ke
nominal provider asal. Refund tidak menambah stock atau membalik lifecycle
produksi/pengiriman. T30 menangani notifikasi operasional persisten; WhatsApp
otomatis tidak ditambahkan.

Rollback sebelum aktivasi: tutup entry point baru bila diperlukan, pertahankan
kasus, alokasi, key/clock, attempt, history, receipt dan audit. Hentikan entry
point submission baru tanpa mengulang intent yang accepted/unknown atau
menghapus bukti; reconciliation dan penanganan kewajiban tetap diperlukan.
Jangan drop/reset tabel untuk mengembalikan UI lama. Verifikasi slice ini
tidak mengeksekusi provider atau uang nyata. Resource staging/production,
physical-device/AT dan penerimaan visual
Owner tetap memerlukan bukti masing-masing.
