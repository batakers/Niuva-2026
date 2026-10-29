# Email bisnis minimum — T26–T30

Tanggal kontrak implementasi: 19 Oktober 2026. Scope mengikuti PRODUCT/TASKS;
bukti fixture, browser lokal, CI, provider, inbox dan hosted tetap berbeda.
Dokumen ini tidak mengaktifkan email atau scheduler dan tidak menetapkan SLA.

| Bukti persisten | Purpose | Key satu pesan | Isi minimum |
| --- | --- | --- | --- |
| Order tercatat | ORDER_RECEIVED | Order.id | Referensi dan halaman order milik Customer |
| PaymentAttempt SETTLED dengan receipt SETTLED | PAYMENT_CONFIRMED | PaymentAttempt.id | Rupiah persis dan jenis pembayaran, termasuk ongkir final MAKE |
| Quote SENT/current | QUOTE_AVAILABLE | Quote.id | Referensi, versi dan halaman MAKE milik Customer |
| Order SHIPPED/COMPLETED dan data pengiriman | ORDER_SHIPPED | Order.id, kind SHIPMENT | Fakta pernah dikirim dan halaman order untuk resi/status terbaru |

`OUTBOX_BUSINESS` memproyeksikan fakta yang sudah commit ke durable outbox.
Transaksi checkout, quote, payment dan fulfillment tidak memanggil provider
email. Konfigurasi cipher/sender, timeout atau kegagalan email tidak dapat
membatalkan order/request. Job memakai runner, role guard, binding marker,
global lifecycle lock dan lease yang sama dengan job operasional lainnya.

Setiap kind/proof memiliki satu key stabil `kind:purpose:v1:proofId` dan satu
intent sepanjang umur record. Enqueue ulang tidak memperpanjang expiry atau
mengganti key. Worker memakai enkripsi payload/envelope, expiry, pembatasan
retry dan status unknown dari outbox existing. Hanya kegagalan eksplisit yang
aman diulang dapat dijadwalkan ulang; hasil tidak diketahui menjadi terminal,
bukan alasan membuat intent baru. Provider accepted bukan bukti inbox diterima.

Job memerlukan `businessPolicy: { maxAgeMs, runBudgetMs }` eksplisit, selain
jobPolicy. `runBudgetMs` positif dan maksimal 20.000 ms (timeout transaksi
bound tempat seluruh proyeksi berjalan); semantik anggaran dan counter
`deferred` ada di [runbook job](batch-2-operations.md#anggaran-waktu-run-outbox--29-oktober-2026).
`maxAgeMs` positif dan maksimal 86.400.000 ms. Batas teknis 24 jam mengikuti
[window idempotency Resend](https://resend.com/docs/dashboard/emails/idempotency-keys);
umur sejak fakta asli memastikan seluruh retry berhenti sebelum window key
pengiriman pertama berakhir. Ini bukan nilai umur operasional default atau SLA.
Proof repository juga menolak deadline yang melewati batas ini pada enqueue
langsung; pemanggil tidak dapat melewatinya dengan menghindari launcher.
Deadline dihitung dari waktu fakta asli, bukan waktu retry. `createdAt` intent
bisnis mengikuti waktu fakta, `dueAt` mengikuti saat enqueue. Quote dan akun
internal dapat memperpendek deadline, tidak memperpanjangnya. Kandidat lama
atau invalid dicatat terminal tanpa payload penerima agar tidak menghalangi
kandidat berikutnya. Aktivasi pertama harus meninjau backlog dan kebijakan
umur ini melalui dry-run sebelum otorisasi hosted terpisah.

Recipient berasal dari Customer terverifikasi yang masih terhubung dengan
record, bukan snapshot email order atau pencocokan alamat saat signup ulang.
Closure marker, lifecycle lock, expiry akun internal, recipient dan fingerprint
diperiksa sebelum claim dan saat finalisasi. Queue invalid dibatalkan; file,
auth token, public quote capability dan signed/private storage URL tidak masuk
template. Account route tetap memerlukan autentikasi/ownership normal.

Settlement yang tidak terverifikasi, late/cancelled order, refund/chargeback
atau unresolved payment issue tidak menjadi email payment confirmed. Quote
harus SENT, belum kedaluwarsa, versi terbaru termasuk draft pengganti, terkait
estimate/review/range terbaru dan model privat terverifikasi yang belum
dihapus. Pricing rule yang sudah retired tidak membatalkan snapshot SENT
immutable dengan sendirinya. Quote yang diterima/ditolak/superseded tidak
dikirim sebagai offer aktif.

`Order.shippedAt` baru diisi sekali oleh transisi canonical SHIPPED; tidak ada
backfill tanggal historis. Receipt SHIPMENT juga memerlukan status sah dan
metadata kurir/resi terbaru tanpa exception/failed/returned/cancelled.
Perubahan resi tidak membuat email kedua atau mengirim resi lama yang sudah
dikoreksi; template mengarahkan ke rincian terkini di akun.

Kegagalan terminal bisnis dicatat sebagai audit `outbox.business.failed` dengan
ID/purpose/state/kategori aman dan target order/request yang masih terbuka.
Status gagal job cipher/configuration/lease memakai `outbox.job.failed`,
didup berdasarkan perubahan kategori dan diikuti `outbox.job.recovered` saat
berhasil lagi. Feed Admin existing menyimpan unread/read per akun; pesan
berjudul "Email Customer perlu diperiksa" atau "Pengiriman email perlu
diperiksa". Feed tidak menampilkan recipient, payload atau raw provider error.
Tidak ada WhatsApp otomatis. Kegagalan global tanpa target bisnis tetap tampak
di riwayat, tanpa tautan operasional yang diada-adakan.

CLI memakai `scripts/run-operational-job.ts run <request JSON> <jobPolicy JSON>
<businessPolicy JSON>`. HTTP `/api/internal/jobs/business-notifications`
memakai bearer CRON_SECRET, JSON maksimal 4 KiB, policy eksplisit, no-store,
limit execute maksimal 10 dan dry-run maksimal 100. Nilai policy harus
disetujui untuk lingkungan/petugas sebelum penjadwalan. Default Resend
factory mempertahankan guard non-production dan allowlist peserta internal;
fixture menginjeksi gateway dan tidak mengirim email sungguhan.

Migration baru `20261019050000_business_notifications` menambah nullable
shipped_at dan memperluas constraint purpose/job, tanpa mengubah migration
historis atau data lama. Rantai branch bergantung pada T24 (#60) dan T21–T22
(#59). T08 (#58) tetap terpisah; kandidat gabungan perlu menerapkan/review urutan
migration T08 sebelum T24 dan migration ini agar whitelist job tidak menyusut.
Tidak ada deployment pada pekerjaan ini. Rollback aplikasi menghentikan
launcher bisnis; pertahankan record intent/terminal dan key untuk mencegah
replay. Jangan menghapus receipt, mereset job atau mengirim ulang unknown untuk
membuat indikator terlihat bersih.
