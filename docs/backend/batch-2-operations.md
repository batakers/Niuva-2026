# Runbook job Batch 2

**Status:** implementasi dan verifikasi lokal. Dokumen ini tidak menandai role, database, provider, cron, alarm, atau domain staging/production siap.

Paket Batch 2 menghubungkan producer Customer dengan durable outbox, worker, expiry/cleanup, job runner dan pemeriksaan status. Scope dan urutan aktif ada di [ROADMAP](../../ROADMAP.md) dan [TASKS](../../TASKS.md); [plan](../../tasks/plan.md) serta [todo](../../tasks/todo.md) Batch 2 merupakan histori, release gate di [peta kesiapan](../frontend/mvp-release-readiness.md), dan nama konfigurasi proses di [environment register](../../.kiro/specs/niuva-audit-remediation/env-register.md).

## Prasyarat

- Jalankan hanya pada database lokal/test terisolasi yang sudah bermigrasi dan memiliki binding marker yang cocok. Jangan gunakan `DATABASE_URL` production. Implementasi ini tidak memprovision database, marker, role atau grant.
- Proses launcher membaca konfigurasi dari environment proses. Ia tidak memuat `.env.local`, `.env.test.local`, atau file konfigurasi lain.
- `NIUVA_DATABASE_BINDING_ID` harus cocok dengan marker database; `NIUVA_DEPLOYMENT_TIER` harus menyatakan tier proses; `NIUVA_JOB_DATABASE_ROLE` harus sama dengan role koneksi DB. Role harus terpisah dari pemilik marker. Pada tabel marker, hak yang diperlukan terbatas pada `SELECT` dan `UPDATE(id)`; hak untuk tabel status job dan data yang dikelola tiap handler harus ditinjau berdasarkan job yang dijalankan. Rincian marker ada di [desain binding](../superpowers/specs/2026-10-13-batch-2-database-binding-design.md); cek handler yang dijalankan pada source code dan roadmap aktif sebelum meninjau grants hosted.
- Untuk `OUTBOX_DELIVERY`, runtime juga membutuhkan konfigurasi cipher outbox dan konfigurasi mailer Customer yang lolos guard capability/origin. Itu tidak membuka provider live. Tidak ada contoh atau nilai key pada runbook.
- `OUTBOX_EXPIRY`, kedua cleanup dan `inspect` tidak memerlukan cipher atau sender. `dry-run` tidak menulis status job atau data bisnis dan tidak membuat cipher/sender.

`NIUVA_JOB_DATABASE_ROLE` dikonsumsi launcher CLI dan endpoint HTTP job internal; producer Customer biasa tidak memerlukan variabel role job. Endpoint HTTP tetap menolak koneksi yang tidak memenuhi pembatasan role/marker yang sama. Pengisian variabel atau konfigurasi dari contoh tidak membuktikan role nyata mempunyai grant yang tepat.

## Menjalankan satu job

Gunakan `corepack pnpm exec jiti scripts/run-operational-job.ts`. Perintah `run` menerima JSON request dan policy eksplisit. Limit per job adalah 1–100. Contoh berikut hanya menunjukkan bentuk perintah untuk database lokal yang memang sudah diprovision; angka waktunya nilai demo untuk sintaks, bukan cadence, SLA atau pilihan hosted:

```powershell
corepack pnpm exec jiti scripts/run-operational-job.ts run '{"job":"OUTBOX_EXPIRY","mode":"dry-run","limit":10}' '{"leaseMs":30000,"minIntervalMs":0,"failureCooldownMs":1000}'
```

Untuk `OUTBOX_DELIVERY`, argumen worker ketiga wajib. Gunakan hanya pada fixture lokal sintetis yang disiapkan oleh tes terisolasi; jangan memakai alamat atau provider nyata:

```powershell
corepack pnpm exec jiti scripts/run-operational-job.ts run '{"job":"OUTBOX_DELIVERY","mode":"dry-run","limit":10}' '{"leaseMs":30000,"minIntervalMs":0,"failureCooldownMs":1000}' '{"leaseMs":10000,"sendTimeoutMs":5000,"retryDelaysMs":[]}'
```

Pilih dan tinjau `leaseMs`, `minIntervalMs`, `failureCooldownMs`, `sendTimeoutMs`, dan `retryDelaysMs` bersama kebijakan operasi sebelum pemakaian terjadwal. Tidak ada scheduler atau nilai kebijakan default yang dipasang oleh pekerjaan Batch 2.

Mode `execute` hanya untuk lingkungan yang sudah mendapat otorisasi tersendiri. Satu pemanggilan memproses paling banyak `limit` item per kategori. Jika hasil provider tidak pasti, job berhenti dengan kategori aman dan pesan tidak dikirim ulang otomatis; operator perlu memeriksa hasilnya sebelum tindakan lain. Penerimaan provider tidak membuktikan penerimaan inbox.

## Memeriksa status

Perintah `inspect` membutuhkan ambang lag eksplisit dalam milidetik:

```powershell
corepack pnpm exec jiti scripts/run-operational-job.ts inspect '{"maxLagMs":120000}'
```

`120000` hanya contoh format lokal; tentukan ambang operasi sebenarnya bersama Owner dan petugas sebelum mengaktifkan monitoring atau scheduler. Output berisi status job yang terdaftar pada runner, counter allowlist, backlog outbox, lease kedaluwarsa, privacy overdue/hold dan alarm. Ia tidak menampilkan recipient, token, payload atau raw error, dan tidak mengirim notifikasi.

Exit code `0` berarti run tidak gagal atau pemeriksaan tidak menemukan alarm; run dapat berstatus `busy` atau `cooldown`. Exit code `1` menunjukkan input/runtime gagal atau lease hilang/gagal. Exit code `2` berarti `inspect` menemukan alarm. Ringkasan CLI sengaja hanya berisi kode kategori aman.

## Adapter HTTP dan expiry reservasi — 19 Oktober 2026

Tambahan T26–T30: OUTBOX_BUSINESS dan endpoint
`/api/internal/jobs/business-notifications` mengikuti
[kontrak email bisnis](business-notifications.md), dengan businessPolicy
eksplisit dan execute HTTP maksimal 10. Sender tetap OUTBOX_DELIVERY.
Kegagalan terminal/job email masuk riwayat Admin yang sama; monitoring tidak
menjadwalkan retry unknown atau mengaktifkan provider. Rincian T24 berada pada
[reconciliation pembayaran](payment-reconciliation.md).

Endpoint internal `/api/internal/jobs/outbox` dan
`/api/internal/jobs/inventory-reservations` memakai bearer `CRON_SECRET`.
POST JSON menerima `mode`, `limit`, dan `jobPolicy` dengan field
`leaseMs`, `minIntervalMs`, `failureCooldownMs` eksplisit.
Outbox juga wajib menerima `workerPolicy` dengan `leaseMs`,
`sendTimeoutMs`, `retryDelaysMs`; field itu ditolak untuk inventory.
Batas execute outbox HTTP adalah 10; batas lainnya 100.
GET membutuhkan query `maxLagMs` positif dan mengembalikan inspeksi yang sama
dengan CLI. Input divalidasi sebelum runtime dibangun.

Keduanya memakai `JobRunner`, `PrismaJobRepository`,
`OperationalJobState`, role guard dan monitor yang sama dengan CLI.
Tidak ada lease kedua pada adapter HTTP. Modul lama `scheduled-jobs` hanya
alias kompatibilitas; model/tabel `ScheduledJobState` tetap ada supaya
migration yang sudah di-push tidak diubah dan tidak digunakan runtime.

Inventory mengikuti tenggat retail existing: attempt PENDING yang masih
berlaku menahan pembatalan; saat due, attempt expired, order unpaid cancelled,
dan reservation released dalam satu transaksi. Payment settled/refunded
tetap terlindungi. Lock attempt → variant → order dipertahankan. Audit
reservation berada pada transaksi yang sama; pemeriksaan lease terakhir
menggagalkan seluruh transaksi jika lease tak lagi sah. Monitor menampilkan
remaining due dan lag reservation. Role inventory memerlukan akses yang
sesuai ke order/payment/reservation, lock varian, dan audit; inspeksi juga
memerlukan pembacaan backlog inventory. Tinjau grant tiap resource sebelum
pemakaian hosted. Migration baru hanya memperluas allowlist
nama operational job; tidak menghapus data atau mengubah migration lama.

Adapter ini tidak memasang scheduler, cadence, ambang alarm atau sender
hosted. Nilai policy/lag harus disetujui dan resource harus dibuktikan sebelum
pemakaian hosted.

## Bukti lokal dan batas penggunaan

Regression/E2E lokal menjalankan producer, worker dan sender fixture secara terpisah dengan binding serta key sintetis. Migration `OperationalJobState` diterapkan pada database test loopback terisolasi. Bukti tersebut tidak menguji credential provider sungguhan, inbox/bounce, hak role pada resource hosted, cadence cron, monitoring eksternal, staging atau production.

Sebelum memakai job terjadwal, pemilik operasi perlu menetapkan database/role dan grants, secret management, sender dan bukti inbox, nilai lease/cooldown/lag, cadence, tujuan alarm serta petugas. Provisioning dan aktivasi resource memerlukan instruksi tersendiri. Job `INVENTORY_RESERVATIONS` ditambahkan pada rekonsiliasi 19 Oktober 2026; retensi file R2, pembayaran/refund dan recovery tetap terbuka.

Rollback source sebelum aktivasi dapat mengembalikan kode ke baseline. Jangan menghapus tabel aditif atau reset data untuk rollback. Jika suatu saat email sudah diterima provider, rollback aplikasi tidak dapat menariknya kembali.
