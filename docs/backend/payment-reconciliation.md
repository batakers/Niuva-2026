# Reconciliation pembayaran v1

T24, 19 Oktober 2026. Kontrak produk mengikuti PRD/addenda dan
[SOP refund](../legal/customer-service-refund-sop.md); pembayaran dan stock
tetap melalui domain canonical. Ini implementasi lokal/fixture. Merchant,
provider sandbox, scheduler/cadence, binding dan role hosted memerlukan bukti
terpisah pada T03/T35. Tidak memberi izin provider atau deployment.

## Pemeriksaan dan pencatatan

Adapter mengikuti [Get Transaction Status](https://docs.midtrans.com/reference/get-transaction-status)
dan [GET Status API Requests](https://docs.midtrans.com/docs/get-status-api-requests)
resmi. Ia memakai endpoint sandbox tetap, Basic auth server, signature,
order/transaction identity, Zod, body maksimum 16 KiB, tanpa cache/redirect,
dan abort maksimum 8 detik. Transaction ID yang sudah tercatat didahulukan;
fallback order reference tidak menjamin dukungan DANA/BI SNAP tanpa transaction
ID. Tidak mengisi credential, mode production atau method merchant baru.

404, response invalid, identity/signature mismatch, timeout dan network error
adalah hasil belum diketahui. Tidak mengubah pembayaran menjadi gagal atau
kedaluwarsa. Rate limit provider membawa cooldown terbatas dari Retry-After;
tidak mengirim ulang request otomatis dalam run yang sama.

`PAYMENT_RECONCILIATION` adalah handler pada `src/modules/jobs`, dengan role,
binding, lease/cooldown dan monitor yang sama dengan job existing. CLI generic
dan `/api/internal/jobs/payment-reconciliation` memakai runner tersebut.
HTTP memerlukan bearer `CRON_SECRET`, body JSON maksimal 4 KiB, policy eksplisit
dan limit execute maksimal 10. GET memerlukan `maxLagMs` eksplisit dan hanya
mengembalikan status/counters tanpa cache. Tidak menetapkan jadwal hosted.

Kandidat meliputi pending/failed/expired/cancelled yang belum mempunyai receipt
late settlement sah, serta exception verifikasi yang belum ditutup receipt
settlement sah. Refund/partial refund yang sudah diketahui ditahan untuk T25.
Pemilihan berbatas mengurutkan waktu cek terakhir; hasil unknown tetap mendapat
giliran tanpa menahan seluruh kandidat di depan antrean. Tidak menetapkan
batas umur transaksi/window merchant atau menghapus sejarah.

`PaymentReconciliationCheck` mencatat satu hasil per run/attempt: waktu server,
outcome, kategori aman dan fingerprint event. Setiap query baru boleh menghasilkan
receipt verifikasi baru; identitas run/attempt yang sama tidak menulis dua kali.
Payload mentah, signature, server key, alamat, data kartu dan isi pesan provider
tidak masuk tabel receipt, audit atau monitor.

## Uang, stock dan ketidakpastian refund

Response pembayaran masuk ke `PaymentWebhookRepository.processMidtransWebhookIn`
di transaksi lease caller. Jalur HTTP webhook biasa memakai method yang sama
melalui wrapper transaksi. Event memakai insert-on-conflict yang tidak
membatalkan transaksi caller ketika fingerprint duplikat. Canonical state,
amount, transaction ID, order, reservation dan stock movement tetap diperiksa.

Query dan webhook yang beradu tidak menggandakan settlement atau pengurangan
stock. Valid late settlement menyimpan exception/refund obligation dan tidak
menghidupkan order batal. Capture challenge tetap pending; status settlement
dengan kode yang tidak sah tidak membayar order. Pemeriksaan lease setelah apply
membatalkan seluruh perubahan event/order/payment/stock/receipt/audit jika
lease hilang. Request provider dilakukan di luar transaksi database.

Get Status dapat melaporkan refund tanpa bukti dana final. Slice ini menulis
`REFUND_REQUIRES_RECONCILIATION`, mempertahankan payment/order/stock, dan
menampilkan perhatian operasional. Domain kasus refund menolak pengajuan atau
approval baru atas receipt itu, termasuk bila ada receipt settlement berikutnya.
Ia tidak menyatakan provider accepted atau status refund sebagai uang kembali;
T23/T25 tetap memiliki operation key, bukti metode/bank/manual dan penyelesaian.

Audit pemeriksaan serta receipt tetap persisten; notifikasi Admin mengikuti
feed/permission existing. Receipt setiap cek disimpan, sedangkan audit/feed
hanya ditambah bila outcome/kategori berubah agar unknown berulang tidak
membanjiri perhatian Admin. Monitor menambahkan backlog/lag pembayaran dengan
alarm `PAYMENT_RECONCILIATION_LAG`. Last-success berarti run pemeriksaan berhasil,
bukan seluruh payment/refund selesai atau provider hosted telah dibuktikan.

## Dependensi, migration dan rollback

Branch T24 bergantung eksplisit pada PR #59 (T21/T22), karena receipt refund baru
harus dikenali guard kasus yang sama. Integrasi 20 Oktober memakai main setelah
PR #59 terverifikasi merged pada `bcd04d9`, termasuk T08 dan perbaikan retensi
refund/waktu intake. Diff baru tetap T24; kasus/approval, tabel dan migration
dependensi tidak diduplikasi. Kedua job retensi dan reconciliation memakai
runner, batas HTTP dan monitoring canonical yang sama.
Migration baru menjaga whitelist job T08 yang sudah disetujui untuk
baseline gabungan; **urutan migration kandidat harus menyertakan T08 sebelum
T24**. Jangan men-deploy migration job dari sibling branch dalam urutan acak:
migration T08 lama mengganti whitelist job. Review dan uji ulang baseline gabungan
diperlukan sebelum deployment; tidak ada migration historis yang diedit.

Bukti awal T24 memakai 35 migration pada PostgreSQL loopback. File job
reconciliation membuat database `niuva_status_test_<uuid>` tersendiri melalui
helper terjaga dan Prisma CLI; query batch tidak diberi filter khusus test.
Database lama dipertahankan. Tanggal,
commands, hasil dan SHA/PR final dicatat di [TASKS](../../TASKS.md). Tes fixture
mencakup balapan webhook, late settlement, signature/amount/status code,
capture challenge, unknown, refund hold, overlap/cooldown, role terbatas,
lease hilang sebelum maupun saat apply, receipt dedup dan rotasi batch.

Role hosted hanya boleh mendapat akses yang diperlukan untuk pemeriksaan dan
jalur settlement canonical; tidak membutuhkan pembacaan Customer/sesi atau
penulisan kasus refund. Fixture membuktikan operasi tanpa privilege tersebut
dan tanpa DELETE payment/event/receipt/stock. Ini bukan grant hosted.

Rollback menutup launcher baru sambil mempertahankan receipt/audit dan hold
refund yang sah. Jangan menghapus receipt, mengganti key, membuka order batal,
menambah stock atau menghapus marker refund untuk membuat UI kembali hijau.
