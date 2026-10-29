# Runbook job Batch 2

**Status:** implementasi dan verifikasi lokal. Dokumen ini tidak menandai role, database, provider, cron, alarm, atau domain staging/production siap.

Paket Batch 2 menghubungkan producer Customer dengan durable outbox, worker, expiry/cleanup, job runner dan pemeriksaan status. Scope dan urutan aktif ada di [ROADMAP](../../ROADMAP.md) dan [TASKS](../../TASKS.md); [plan](../../tasks/plan.md) serta [todo](../../tasks/todo.md) Batch 2 merupakan histori, release gate di [peta kesiapan](../frontend/mvp-release-readiness.md), dan nama konfigurasi proses di [environment register](../../.kiro/specs/niuva-audit-remediation/env-register.md).

## Prasyarat

- Jalankan hanya pada database lokal/test terisolasi yang sudah bermigrasi dan memiliki binding marker yang cocok. Jangan gunakan `DATABASE_URL` production. Implementasi ini tidak memprovision database, marker, role atau grant.
- Proses launcher membaca konfigurasi dari environment proses. Ia tidak memuat `.env.local`, `.env.test.local`, atau file konfigurasi lain.
- `NIUVA_DATABASE_BINDING_ID` harus cocok dengan marker database; `NIUVA_DEPLOYMENT_TIER` harus menyatakan tier proses; `NIUVA_JOB_DATABASE_ROLE` harus sama dengan role koneksi DB. Role harus terpisah dari pemilik marker. Pada tabel marker, hak yang diperlukan terbatas pada `SELECT` dan `UPDATE(id)`; hak untuk tabel status job dan data yang dikelola tiap handler harus ditinjau berdasarkan job yang dijalankan. Rincian marker ada di [desain binding](../superpowers/specs/2026-10-13-batch-2-database-binding-design.md); cek handler yang dijalankan pada source code dan roadmap aktif sebelum meninjau grants hosted.
- Untuk `OUTBOX_DELIVERY`, runtime juga membutuhkan konfigurasi cipher outbox dan konfigurasi mailer Customer yang lolos guard capability/origin. Itu tidak membuka provider live. Tidak ada contoh atau nilai key pada runbook.
- `OUTBOX_EXPIRY`, cleanup dan `inspect` tidak memerlukan cipher atau sender. Retensi file hanya membangun adapter S3-compatible ketika ada penghapusan execute yang sah; dry-run/inspect tidak memerlukan storage. `dry-run` tidak menulis status job, cursor atau data bisnis dan tidak membuat cipher/sender/storage.

`NIUVA_JOB_DATABASE_ROLE` dikonsumsi launcher CLI dan endpoint HTTP job internal; producer Customer biasa tidak memerlukan variabel role job. Endpoint HTTP tetap menolak koneksi yang tidak memenuhi pembatasan role/marker yang sama. Pengisian variabel atau konfigurasi dari contoh tidak membuktikan role nyata mempunyai grant yang tepat.

## Menjalankan satu job

Gunakan `corepack pnpm exec jiti scripts/run-operational-job.ts`. Perintah `run` menerima JSON request dan policy eksplisit. Limit per job adalah 1–100. Contoh berikut hanya menunjukkan bentuk perintah untuk database lokal yang memang sudah diprovision; angka waktunya nilai demo untuk sintaks, bukan cadence, SLA atau pilihan hosted:

```powershell
corepack pnpm exec jiti scripts/run-operational-job.ts run '{"job":"OUTBOX_EXPIRY","mode":"dry-run","limit":10}' '{"leaseMs":30000,"minIntervalMs":0,"failureCooldownMs":1000}'
```

Untuk `OUTBOX_DELIVERY`, argumen worker ketiga wajib. Gunakan hanya pada fixture lokal sintetis yang disiapkan oleh tes terisolasi; jangan memakai alamat atau provider nyata:

```powershell
corepack pnpm exec jiti scripts/run-operational-job.ts run '{"job":"OUTBOX_DELIVERY","mode":"dry-run","limit":10}' '{"leaseMs":30000,"minIntervalMs":0,"failureCooldownMs":1000}' '{"leaseMs":10000,"sendTimeoutMs":5000,"retryDelaysMs":[],"runBudgetMs":20000}'
```

Pilih dan tinjau `leaseMs`, `minIntervalMs`, `failureCooldownMs`, `sendTimeoutMs`, `retryDelaysMs`, dan `runBudgetMs` bersama kebijakan operasi sebelum pemakaian terjadwal. Tidak ada scheduler atau nilai kebijakan default yang dipasang oleh pekerjaan Batch 2.

Mode `execute` hanya untuk lingkungan yang sudah mendapat otorisasi tersendiri. Satu pemanggilan memproses paling banyak `limit` item per kategori. Jika hasil provider tidak pasti, job berhenti dengan kategori aman dan pesan tidak dikirim ulang otomatis; operator perlu memeriksa hasilnya sebelum tindakan lain. Penerimaan provider tidak membuktikan penerimaan inbox.

## Memeriksa status

Perintah `inspect` membutuhkan ambang lag eksplisit dalam milidetik:

```powershell
corepack pnpm exec jiti scripts/run-operational-job.ts inspect '{"maxLagMs":120000}'
```

`120000` hanya contoh format lokal; tentukan ambang operasi sebenarnya bersama Owner dan petugas sebelum mengaktifkan monitoring atau scheduler. Output berisi status terakhir setiap job yang terdaftar, counter allowlist, backlog outbox, lease kedaluwarsa, privacy overdue/hold, pending deletion file, dan alarm. Ia tidak menampilkan recipient, token, storage key, alasan hold, payload atau raw error, dan tidak mengirim notifikasi.

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
`sendTimeoutMs`, `retryDelaysMs`, `runBudgetMs`; field itu ditolak untuk
inventory. Semantik `runBudgetMs` ada pada bagian anggaran waktu run di bawah.
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

## Anggaran waktu run outbox — 29 Oktober 2026

Function hosted dapat diputus sebelum `limit` tercapai (staging: function di
Ohio, database di Singapura, satu kirim 7–8,5 s, function diputus sekitar
30 s). Karena itu `OUTBOX_DELIVERY` (`workerPolicy.runBudgetMs`) dan
`OUTBOX_BUSINESS` (`businessPolicy.runBudgetMs`) wajib membawa anggaran waktu
eksplisit; tidak ada default. Anggaran dihitung dengan jam monotonic sejak
runner mulai, termasuk klaim lease job. Sebelum setiap item baru, run hanya
lanjut bila sisa anggaran masih menampung interval terlama antara dua
pemeriksaan sebelumnya pada run yang sama; untuk delivery sisa itu juga harus
setidaknya `sendTimeoutMs`, sehingga `runBudgetMs` wajib lebih besar dari
`sendTimeoutMs`. Item pertama delivery hanya dijamin muat waktu kirimnya,
belum overhead klaim/finalisasi, jadi pilih anggaran dengan sisa untuk
overhead itu, finalisasi runner, cold start dan respons HTTP. Anggaran bisnis
maksimal 20.000 ms karena seluruh proyeksi berjalan dalam satu transaksi
bound dengan timeout itu.

Bila anggaran tidak cukup, delivery berhenti sebelum menyentuh baris lagi,
termasuk lease yang ditinggalkan: tidak ada claim, attempt, discard atau
kirim. Pesan tetap `PENDING`/due (lease lama tetap menunggu run berikutnya,
yang menandainya unknown tanpa kirim ulang). Pesan yang sudah diklaim tetap
selesai dengan lease, timeout kirim dan fencing yang sama; anggaran tidak
memotong kiriman. Proyeksi bisnis berhenti sebelum fakta berikutnya dan commit
intent yang sudah dibuat; fakta yang ditinggal belum punya baris outbox
sehingga tetap due.

Counter `deferred` mencatat item due yang ditinggal karena anggaran, dihitung
sampai sisa `limit` run itu (delivery memakai satu hitungan baca-saja tanpa
lock; bisnis memakai kandidat yang sudah diambil). `scanned` hanya menghitung
item yang benar-benar diperiksa. Run yang berhenti karena anggaran tetap
`completed`, bukan kegagalan; backlog berikutnya terlihat dari `deferred`,
`remainingDue`, inspeksi outbox dan alarm lag. Nilai anggaran hosted harus
dipilih dan disetujui untuk lingkungan dan cadence terkait; contoh perintah di
atas hanya sintaks.

## Retensi binary Customer — T08, 19 Oktober 2026

`CUSTOMER_FILE_RETENTION` tersedia melalui CLI canonical dan
`GET/POST /api/internal/jobs/customer-file-retention` dengan bearer, binding,
role, policy dan inspeksi yang sama. Execute HTTP dibatasi 10 file; CLI dapat
meminta 1–100. Satu run memindai paling banyak 100 record dengan cursor ID
persisten di `OperationalJobState`. Run dapat selesai dengan nol penghapusan
ketika halaman berisi file yang dilindungi; cursor tetap maju pada execute
sehingga file berikutnya tidak terhambat. Cursor membungkus setelah akhir
daftar. Dry-run memeriksa satu halaman tanpa memajukan cursor dan bukan laporan
seluruh backlog.

Kelas binary mengikuti keputusan existing: 14 hari setelah aktivitas upload
terakhir untuk file tanpa pemilik; 60 hari untuk request terminal/unpaid dari
timestamp aktivitas terminal/expiry yang tersedia, memakai yang paling akhir;
90 hari dari `completedAt` order selesai, tanpa meresetnya saat metadata
request berubah. Semua order aktif dan attempt PENDING menahan penghapusan;
order cancelled dengan settlement yang belum diselesaikan juga ditahan.
Record historis B2B, media publik dan `FINANCIAL_EVIDENCE` dikecualikan.
Order, quote, payment, audit dan metadata file tidak dihapus oleh job.

`FileRetentionHoldService` membutuhkan Owner aktif dengan permission privasi
dan mencatat audit hold/release. Hold khusus file tetap berlaku sampai release
eksplisit; tanggal review menimbulkan alarm, bukan pelepasan otomatis. Case
privacy dengan hold yang masih tercatat pada Customer terkait juga melindungi
file. ID kasus hold juga disimpan pada metadata file ketika Owner menetapkan
hold dan sebelum closure melepaskan FK Customer. Penutupan akun atau purge
receipt tidak melepaskan hold binary. Release Owner pada kasus menghapus hanya
ID hold kasus itu, sehingga hold lain tetap berlaku tanpa mengaitkan kembali
akun/riwayat. Jika receipt sudah dipurge, Owner meninjau dan melepaskan hold
file secara eksplisit; missing receipt menimbulkan alarm review.
Pengelolaan hold khusus file saat ini berupa layanan domain; T08 tidak
menambahkan form Dashboard. Retensi record/legal di luar binary tetap TBD.

Execute menyimpan `DELETE_PENDING` beserta policy class/deadline terlebih
dahulu. Upload proof dicabut; file tidak dapat dipakai ulang, diunduh melalui
resolver VERIFIED, atau menjadi dasar draft/publikasi/accept quote baru.
Worker memeriksa kembali hold, order dan lease sebelum storage I/O. Lock
lifecycle/request/order/file menjaga serialisasi dengan operasi domain.
Generic file transition tidak boleh menyelesaikan klaim pending.

Delete storage dibatasi dua detik per file, memakai
[AbortSignal pada AWS SDK](https://github.com/aws/aws-sdk-js-v3#abortcontroller-example).
Timeout atau error setelah pemanggilan storage adalah outcome unknown. Klaim
pending tetap ada sehingga retry idempoten menghapus key yang sama, termasuk
ketika objek sudah hilang tetapi respons sebelumnya tidak diterima. Adapter
S3-compatible meneruskan AbortSignal ini ke SDK. Semantik delete, versioning
dan object lock provider target tetap harus dibuktikan pada resource hosted
sesuai [kontrak object storage](object-storage-contract.md).

Hanya konfirmasi delete dan pemeriksaan lease terakhir yang mengizinkan
tombstone `DELETED`, `deletedAt`, dan audit selesai dalam transaksi yang sama.
Kegagalan DB/lease setelah efek storage menyisakan klaim pending yang dapat
dicoba ulang; tidak mengklaim objek berhasil dipulihkan. Monitor menampilkan
pending/failed deletion, umur pending, hold khusus file dan review overdue,
tanpa isi file atau alasan hold. Counter `activeHolds` job juga mencakup hold
privacy yang ditemukan pada halaman scan.

Tinjau grant hosted untuk baca status request/quote/order/payment/hold, update
kolom klaim/tombstone/cursor serta insert audit. Role retensi file tidak membutuhkan
hak mengubah hold Owner atau menghapus record file/bisnis. Cleanup akun
memerlukan append ID hold existing sebelum detach; release hold tidak menjadi
tindakan job cleanup. Tidak ada perubahan
cadence, konfigurasi provider, bucket, secret atau aktivasi scheduler.

Sebelum execute nyata, source dapat dikembalikan ke baseline. Setelah klaim
nyata dibuat, hentikan pemanggilan baru dan pertahankan guard
`DELETE_PENDING`/`DELETED` saat merencanakan rollback. Revert source tidak
mengembalikan objek storage yang telah dihapus; jangan membuka kembali file
pending atau menghapus state/migration untuk membuat rollback tampak bersih.

## Bukti lokal dan batas penggunaan

Regression/E2E lokal menjalankan producer, worker dan sender fixture secara terpisah dengan binding serta key sintetis. Migration `OperationalJobState` diterapkan pada database test loopback terisolasi. Bukti tersebut tidak menguji credential provider sungguhan, inbox/bounce, hak role pada resource hosted, cadence cron, monitoring eksternal, staging atau production.

Sebelum memakai job terjadwal, pemilik operasi perlu menetapkan database/role dan grants, secret management, sender dan bukti inbox, nilai lease/cooldown/lag, cadence, tujuan alarm serta petugas. Provisioning dan aktivasi resource memerlukan instruksi tersendiri. Inventory dan retensi file memiliki implementasi lokal; R2/scheduler hosted, pembayaran/refund dan recovery tetap terbuka.

Rollback source sebelum aktivasi dapat mengembalikan kode ke baseline. Jangan menghapus tabel aditif atau reset data untuk rollback. Jika suatu saat email sudah diterima provider, rollback aplikasi tidak dapat menariknya kembali.
