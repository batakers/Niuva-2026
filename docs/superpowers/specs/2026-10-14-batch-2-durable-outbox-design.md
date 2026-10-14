# Batch 2, Slice 2.2 — Durable outbox

**Status:** Implementasi internal selesai dan terverifikasi lokal pada 14 Oktober 2026 dalam scope instruksi Owner. Baseline `d68cc53`; belum di-commit/push atau diterapkan hosted. Hasil aktual, review dan batas kelanjutan dicatat di [plan](../plans/2026-10-14-batch-2-durable-outbox.md).

## Tujuan dan authority

Simpan pesan auth/privacy secara persisten dan idempoten, lindungi penerima/token, pertahankan deadline proof, dan batalkan pesan yang proof/akun/sesinya tidak lagi sah. Enqueue bukan delivery atau inbox acceptance.

Sumber: [kontrak outbox aktif](../../legal/customer-public-runtime-contract.md#outbox-job-dan-pemantauan), [Tech Design](../../TechDesign-Niuva-MVP.md), [Slice 2.1](2026-10-13-batch-2-database-binding-design.md), dan [ledger rilis](../../frontend/mvp-release-readiness.md#peta-penghambat-rilis). Tidak menentukan policy publik, SLA/cadence, retensi metadata bisnis, vendor, resource atau izin aktivasi baru.

## Pendekatan

| Pilihan | Konsekuensi |
| --- | --- |
| PostgreSQL/Prisma yang sudah dipakai | Dipilih: enqueue dan proof/business write dapat berada pada transaksi binding yang sama; unique constraint mencegah duplikasi. |
| Fixture file email yang ada | Tetap fixture pengujian; tidak menyediakan transaksi, durability lintas instance atau lifecycle binding. |
| Vendor queue tambahan | Belum diperlukan untuk slice penyimpanan; menambah resource, biaya dan integrasi yang belum diputuskan. |

Modul `src/modules/outbox/` terdiri dari core/validation, cipher, repository dan service. SQL/Prisma berada pada repository. Enqueue/revalidation menggunakan `BoundDatabaseService.run("outbox", ...)`, expiry cleanup menggunakan `run("job", ...)`. Capability/binding ditolak sebelum repository/producer dijalankan. Cipher factory lazy hanya dipanggil ketika payload akan ditulis; cleanup tidak bergantung pada email sender atau key dekripsi. Tidak ada ambient Prisma client, credential atau activation grant baru.

## Identitas dan transaksi

- Input enqueue ketat: `{ kind: "AUTH" | "PRIVACY", proofId: UUID, token: opaque-token-43-character }`. Caller tidak menentukan email, purpose, template, deadline, state atau key.
- Repository memuat proof dan pemilik dari database; tujuan, purpose dan deadline diturunkan dari record tersebut. Hash token input harus cocok dengan hash proof.
- Satu logical message per `(proofKind, proofId)`, dengan unique constraint tambahan pada `messageKey`. Key diturunkan dari kind/purpose/template v1/proofId.
- Fingerprint SHA-256 memuat proyeksi immutable proof (termasuk hash token, recipient, tujuan dan deadline), bukan raw token. Retry enqueue dengan proyeksi sama mengembalikan row yang sama tanpa menulis ulang cipher/expiry/state. Konflik menolak perubahan.
- `DurableOutboxService.withTransaction(work)` menyediakan transaction client dan fungsi enqueue terikat transaksi untuk producer mendatang. Producer dapat membuat proof dan pesan secara atomik; throw menggagalkan keduanya. Callback adalah kode server tepercaya, wajib await semua operasi dan tidak melakukan network.
- Lock order: binding `FOR SHARE`, lalu advisory lock lifecycle Customer yang sudah dipakai auth/closure, lalu pembacaan proof/pesan. Semua waktu berasal dari epoch milidetik `clock_timestamp()` database setelah lock; pembacaan epoch menghindari perubahan timestamp mentah oleh zona waktu sesi/adapter. Expiry tidak berdasarkan jam/browser caller.

## Proof dan lifecycle

| Purpose | Syarat minimum |
| --- | --- |
| AUTH_VERIFY | Token verify belum consumed/expired, hanya pending owner yang masih aktif/belum completed; belum ada Customer dengan normalizedEmail yang sama; deklarasi usia tercatat; intent tidak melewati closure fence; returnTo sudah aman. |
| AUTH_RESET | Token reset belum consumed/expired, hanya customer owner yang masih ada/aktif, email verified dan credential password ada; returnTo aman. |
| PRIVACY_EXPORT / PRIVACY_CLOSE | Confirmation belum consumed/expired, customer masih ada/aktif, session hash/owner cocok, session belum revoked/expired. |

Deadline pesan adalah minimum expiry proof, pending/session dan internal account deadline yang relevan. Privacy 15 menit mengikuti record proof yang dibuat flow saat ini; tidak membuat token/deadline baru pada retry. Penerima diambil dari record owner saat enqueue dan fingerprint diperiksa ulang saat revalidation.

`revalidate(id)` membaca kembali proof/pemilik/sesi di bawah lock lifecycle. Expiry menghasilkan EXPIRED; proof hilang/consumed, resend lama, akun closed, sesi revoked atau proyeksi berubah menghasilkan CANCELLED. Verifikasi pending lain dengan email sama yang sudah membuat Customer juga membatalkan pesan sibling; enqueue baru ditolak karena proof tersebut tidak lagi bisa dikonsumsi. Kedua transisi menghapus sealed payload dan lease. Terminal row tidak pernah kembali ke PENDING. Re-registration dengan email sama tidak mengikat proof lama ke akun baru.

`expireBatch(limit)` memilih paling banyak 100 pesan aktif dengan deadline terlewati, menghapus sealed payload dan lease, serta menandai EXPIRED secara idempoten. Izin `scheduledJobs` dan binding tetap wajib; hilangnya izin `emailDelivery` atau key tidak menghalangi cleanup yang memiliki izin job sendiri. Ini API cleanup internal; jadwal dan bukti lag/purge hosted berada pada Slice 2.3/bukti hosted. Tidak mengklaim penghapusan otomatis saat tidak ada worker.

## Perlindungan payload

- Penerima dan raw token hanya ada di payload AES-256-GCM; nonce acak 12 byte dan tag 16 byte. Tidak ada plaintext token/email/link dalam tabel outbox, receipt atau error.
- AAD mengikat ID, messageKey, kind/proofId, purpose/template, fingerprint dan expiry; ciphertext tidak dapat dipindah ke pesan lain atau dipakai setelah metadata diubah.
- Key ring berasal dari input server eksplisit, key 32 byte base64 canonical dan key ID terbatas. Active key dipakai untuk menulis; retained keys memungkinkan pembacaan cipher lama ketika rotasi. Key hilang/salah, payload rusak, AAD berubah atau versi tidak didukung menolak dengan pesan konstan.
- Helper config hanya menerima `NIUVA_OUTBOX_ENCRYPTION_KEY_ID` dan `NIUVA_OUTBOX_ENCRYPTION_KEY` dari source eksplisit. Nilai diperlukan ketika cipher dikonstruksi, optional bagi build/global env parser. Tidak membaca/menulis `.env*` atau key nyata.
- Core cipher dapat diuji terpisah; decrypt bukan izin mengirim. Slice 2.3 wajib memeriksa authority tepat sebelum send/retry dan menangani race di luar transaksi.

## Tabel dan state

Migration baru aditif `20261014010000_durable_outbox`; existing migrations tidak berubah, tanpa seed atau provisioning.

`DurableOutboxMessage`: UUID id; messageKey; proofKind/proofId; purpose/templateVersion; fingerprint; sealedPayload nullable; createdAt/dueAt/expiresAt; state; attempts; leaseId/leaseExpiresAt; terminalAt/failureCategory; providerReference nullable.

State PENDING, LEASED, ACCEPTED, FAILED, CANCELLED, EXPIRED dibatasi SQL. Slice ini hanya membuat PENDING dan menghasilkan CANCELLED/EXPIRED. LEASED/ACCEPTED/FAILED dan provider outcome adalah kontrak struktur untuk worker berikut, bukan implementasi claim/send/reconcile. Active row wajib memiliki sealed payload, terminal row wajib scrubbed dan terminalAt; lease hanya ada pada LEASED dan tidak melewati expiry. Attempts nonnegative, dueAt di dalam `[createdAt, expiresAt)`, expiry lebih besar createdAt. Purpose/kind harus cocok. Indeks mendukung due/expiry dan proof identity.

## Error dan batas hasil

Schema input yang salah menghasilkan VALIDATION_ERROR tanpa raw details. Kegagalan capability/binding/database/proof/cipher/conflict menghasilkan PROVIDER_UNAVAILABLE aman; tidak ada cause/raw SQL/config/token/email yang diteruskan. Receipt minimum hanya id/messageKey/state/expiry/duplicate.

Tidak memigrasikan mailer/producer lama atau membuka registration/provider. Hasil slice adalah API internal persistence, transaksi producer, revalidation dan cleanup yang diuji PostgreSQL. Worker, enqueue wiring alur aplikasi, pengiriman, retry/backoff, scheduler, inbox/bounce, observability serta provisioning/rotasi key hosted perlu Slice 2.3 dan bukti lingkungan. REL-03 tetap belum selesai secara operasional.

## Penerimaan

1. Core/cipher: schema ketat, deadline boundary, fingerprint stabil; ciphertext berbeda untuk plaintext sama, round trip, key rotation, tamper/metadata/key/config ditolak tanpa bocor.
2. PostgreSQL: empat purpose valid; unique enqueue serial/concurrent; immutable retry; restart service membaca row sama; producer+enqueue rollback atomik; ciphertext at rest.
3. Lifecycle: consumed/resend/expired/pending completed/sibling verification/account deleted/new account/session revoked/session expiry/internal deadline dan returnTo/destination berubah menolak atau membatalkan serta scrub payload.
4. Capability/binding salah tidak membuat row atau menjalankan producer. Enqueue tidak menandai deliveryConfirmed/delivered pada proof.
5. Cleanup bounded/idempoten, terminal tidak resurrect, SQL invariants/lease constraints; gate lint/typecheck/unit/backend/integration/Prisma/build dan browser regression proyek.

## Dasar teknis

[Node.js crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html) mendokumentasikan GCM/authentication tag/AAD dan IV acak. [PostgreSQL INSERT](https://www.postgresql.org/docs/18/sql-insert.html) mendokumentasikan unique conflict handling; repository memakai Prisma createMany skipDuplicates, kemudian memeriksa row/fingerprint yang menang dalam transaksi.

[PostgreSQL date/time](https://www.postgresql.org/docs/18/functions-datetime.html) mendefinisikan epoch timestamp with time zone terhadap UTC; repository membaca nilai numerik tersebut agar zona waktu sesi/adapter tidak menggeser deadline.
