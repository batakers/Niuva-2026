# Batch 2, Slice 2.3 — Worker outbox dan mailer Customer

**Status:** Scope diizinkan Owner pada 14 Oktober 2026: worker/job dan sambungan sender email Customer, tanpa key produksi atau aktivasi. Baseline `13dd3cc5860fb8d52a616654a4315b63d12d6be5`, branch `codex/batch-2-durable-outbox`. Rancangan/rencana adalah tahap internal sesuai AGENTS.md; hasil aktual mengikuti [plan](../plans/2026-10-14-batch-2-outbox-worker.md).

## Tujuan dan authority

Worker internal memproses pesan Slice 2.2 melalui mailer Customer yang sudah ada untuk AUTH_VERIFY, AUTH_RESET, PRIVACY_EXPORT dan PRIVACY_CLOSE. Satu run bounded, dapat dry-run, memverifikasi capability/binding/proof, memakai lease dan key pesan tetap, serta mencatat hasil tanpa memperpanjang deadline atau memberi izin pada proof yang tidak sah.

Sumber: [kontrak outbox/job](../../legal/customer-public-runtime-contract.md#outbox-job-dan-pemantauan), [Tech Design](../../TechDesign-Niuva-MVP.md#rekonsiliasi-kontrak-teknis-rilis--13-oktober-2026), [binding Slice 2.1](2026-10-13-batch-2-database-binding-design.md), [outbox Slice 2.2](2026-10-14-batch-2-durable-outbox-design.md) dan [handoff](../../frontend/mvp-release-readiness.md#peta-penghambat-rilis). Login/18+/consent/internal allowlist/closure tetap authority yang sama. Tidak memilih resource, cadence/SLA, retensi metadata atau vendor baru.

Sambungan adalah **worker ke mailer**; flow producer auth/privacy yang saat ini mengirim inline belum dialihkan otomatis ke queue. API atomik Slice 2.2 tetap jalan untuk producer berikutnya. Tidak ada endpoint publik, cron/deployment config, key nyata, request provider nyata, provider activation, pengesahan policy atau grant baru. Mailer production tetap ditolak oleh guard yang ada. Tidak ada dependency atau biaya bulanan baru.

## Pendekatan

| Pilihan | Penilaian |
| --- | --- |
| Lease dan transaksi PostgreSQL singkat, sender di luar transaksi | Dipilih. Memakai binding/lifecycle/struktur queue yang ada; tidak menahan lock selama I/O. Lease fencing dan hasil tidak pasti perlu penanganan eksplisit. |
| Sender dipanggil dalam transaksi lifecycle | Menahan binding/lifecycle selama jaringan; dapat menghambat closure dan memperbesar rollback yang tidak dapat membatalkan email eksternal. |
| Queue/vendor tambahan | Menambah authority, resource dan biaya; tidak diperlukan untuk hasil slice ini. |

## Modul dan batas API

- `outbox/worker-core.ts`: strict request/policy schemas, outcome/result types, summary. `WorkerPolicy` wajib eksplisit: `leaseMs`, `sendTimeoutMs`, `retryDelaysMs`. Durasi integer positif paling besar 2,147,483,647 ms; timeout lebih kecil lease; array retry 0–99 entri. Maksimum attempts adalah panjang array + 1. Tidak ada default operasional.
- Request `run({mode: "dry-run"|"execute", limit: 1..100})` ketat; field tambahan ditolak. Policy/config adalah input server, bukan request Customer. Summary hanya mode/limit, counter scanned/claimed/accepted/retried/failed/unknown/cancelled/expired/lostLease dan cooldownMs, tanpa payload/recipient/token/provider response.
- `outbox/worker-repository.ts`: candidate/lease/finalize/proof-delivery operations memakai transaction client eksplisit; reuse repository proof, epoch clock dan lifecycle lock. Migration aditif `20261014020000_outbox_delivery_envelope` menambahkan nullable `sealedEnvelope`; existing migration tidak diedit. Penerapan saat implementasi hanya pada database tes lokal terisolasi.
- `outbox/worker.ts`: orchestration dry-run/execute, short transactions, timeout/abort dan summary. Memakai BoundDatabaseService; tidak membuka koneksi/Prisma ambient.
- `outbox/customer-sender.ts`: memilih mailer auth atau privasi berdasarkan purpose. `prepare(dispatch)` memvalidasi konfigurasi, capability, origin dan recipient tanpa I/O serta menghasilkan envelope dan send operation. Worker memakai prepared operation; `assertReady(purpose)` hanya availability check. Factory existing menyediakan preparation, receipt dan abort dengan source eksplisit tanpa mengaktifkan environment/grant. Send-only fake mailer tetap kompatibel untuk caller inline, tetapi belum cukup untuk worker.
- `notifications/email-delivery.ts`: error typed RETRYABLE/PERMANENT/UNKNOWN dengan public AppError PROVIDER_UNAVAILABLE dan pesan aman. Gateway Resend tetap menghasilkan `{id}` pada sukses dan kompatibel dengan caller lama.

## Capability dan dry-run

Setiap run memerlukan `scheduledJobs` melalui binding `run("job")`. Dry-run hanya menghitung paling banyak limit kandidat due/lease stale dalam transaksi binding; tidak claim, decrypt, konstruksi sender, mengirim atau mengubah delivery flags. Tidak bergantung pada key/email configuration.

Execute juga memerlukan `emailDelivery` melalui `run("outbox")` sebelum claim; setiap claim/finalize memverifikasi binding dalam transaksi sendiri. Izin job tidak memberi izin email. Default grants tetap kosong. Kesalahan request/policy menghasilkan VALIDATION_ERROR aman; kegagalan capability/binding/DB/cipher menghasilkan PROVIDER_UNAVAILABLE tanpa raw details atau cause.

## Claim dan otorisasi attempt

Worker memproses satu kandidat lalu sender/finalize sebelum kandidat berikutnya, sampai scanned mencapai limit. Kandidat PENDING due atau LEASED yang lease-nya habis dipilih `FOR UPDATE SKIP LOCKED`, urutan dueAt/id, di bawah lifecycle lock. Jam diambil sebagai epoch database setelah lock.

1. Deadline terlewati → EXPIRED dan scrub, tanpa sender.
2. Lease lama habis tetapi pesan belum expired → FAILED / OUTCOME_UNKNOWN dan scrub, tanpa resend. Lease lama tidak membuktikan apakah network sudah berlangsung. New safe proof dapat diminta melalui flow otorisasi yang ada; worker tidak mengganti token sendiri.
3. Proof hilang/consumed/resend/account closed/session revoked/projection berubah → CANCELLED dan scrub.
4. Attempt budget habis → FAILED / RETRY_EXHAUSTED dan scrub.
5. Cipher dibuka, payload to/returnTo dan hash token dibandingkan dengan proyeksi proof. Salah payload tidak dikirim. Kegagalan cipher/config menggagalkan transaksi tanpa claim atau penghancuran ciphertext sehingga key yang benar masih dapat dipulihkan; cleanup expiry tetap tersedia.
6. Preparation mailer sesuai purpose harus lulus seluruh guard lokal. Pada attempt pertama, envelope provider lengkap (`from`, `to`, `subject`, `text`) disegel AES-256-GCM dengan konteks AAD terpisah dari raw payload dan disimpan bersama claim. Retry wajib membuka envelope tersimpan; attempt yang sudah pernah dijalankan tetapi kehilangan envelope ditolak tanpa rebuild/send. Lease UUID baru, expiry min(now+leaseMs, message expiry); attempts increment satu. Perubahan lease, envelope dan validasi sumber commit bersama. Tidak ada network dalam callback transaksi.

Commit validasi/lease adalah batas attempt yang sudah diotorisasi. Closure/revocation yang menang lock sebelum batas ini mencegah send. Tindakan yang datang sesudahnya dapat beradu dengan pengiriman yang sudah berjalan; aplikasi tidak menjanjikan penarikan email yang sudah diterima provider. Hasil akhir tidak boleh menghidupkan proof/account, dan retry selalu membaca proof terbaru. Tidak ada batch claim panjang yang membiarkan payload lama menunggu banyak sender lain.

## Sender, retry dan hasil

Payload plaintext hanya hidup sementara di memori. AUTH_VERIFY/RESET memakai CustomerAuthMailer, PRIVACY_EXPORT/CLOSE memakai PrivacyMailer. Idempotency key adalah messageKey queue yang sama pada setiap attempt; envelope provider tersimpan dipakai ulang, termasuk setelah worker/factory dibuat ulang dengan origin/from/template runtime berbeda. Konfigurasi baru tetap harus lulus guard lokal, tetapi tidak mengganti isi pesan lama. Envelope menyimpan origin dan from yang sah pada attempt pertama sampai terminal; perubahan operasional yang memerlukan pencabutan pesan lama harus membatalkan proof/pesan, bukan mengubah body di bawah key yang sama. Credential tidak menjadi bagian envelope. Caller inline lama tetap dapat mengabaikan receipt. Fixture mailer mengembalikan void; worker boleh mencatat ACCEPTED tanpa providerReference untuk fixture, bukan bukti provider nyata.

Gateway mengenali HTTP 429 `rate_limit_exceeded` dan 409 `concurrent_idempotent_requests` sebagai RETRYABLE. 4xx lain selain 408 adalah PERMANENT. Network exception/abort, HTTP 408/5xx, serta sukses dengan receipt tidak valid adalah UNKNOWN; tidak mencoba menebak hasil provider. Error tidak membawa response body, recipient, token, key, link atau pesan exception upstream.

Retry-After delta desimal yang valid diteruskan sebagai batas minimum; HTTP-date/invalid/overflow tidak ditafsirkan, sehingga delay policy tetap berlaku. Worker memvalidasi outcome runtime walaupun adapter bertipe. Batch berhenti setelah outcome RETRYABLE atau UNKNOWN agar gangguan tidak menghabiskan seluruh antrean; cooldownMs mengembalikan max(delay policy yang tersedia, hint provider) untuk pemanggil. Launcher berikut wajib menghormatinya; belum ada cooldown global lintas run/instance atau scheduler dari slice ini.

Worker mencatat jam monotonic sebelum pembacaan waktu DB terakhir. Sisa validitas lease/deadline dikurangi seluruh waktu query/claim/commit/return sebelum dispatch, lalu diperiksa lagi tepat sebelum sender dipanggil; timeout adalah min(policy timeout, sisa validitas). Budget habis sebelum send tidak memanggil sender dan hanya dapat menulis FAILED / SEND_WINDOW_EXPIRED bila lease masih sah; ownership yang habis menjadi lostLease. Abort diteruskan. Timeout setelah dispatch menghasilkan UNKNOWN walaupun sender mengabaikan signal. Promise sender yang selesai terlambat tidak memicu finalize kedua.

- ACCEPTED: simpan providerReference yang valid bila ada, terminalAt dan scrub raw payload serta envelope. Queue accepted berarti provider/mailer menerima request; bukan inbox/bounce proof.
- RETRYABLE: baca proof lagi; jika sah dan budget masih ada, dueAt = waktu DB + delay eksplisit. Jika dueAt mencapai/melewati expiry, EXPIRED dan scrub; tidak menggeser expiry. Tidak sleep di dalam run untuk menunggu retry.
- PERMANENT: FAILED / PERMANENT dan scrub.
- UNKNOWN: FAILED / OUTCOME_UNKNOWN dan scrub; tidak otomatis resend/reconcile. Kategori terlihat pada row dan counter internal, tanpa klaim workflow operator/rekonsiliasi hosted sudah ada.

Setiap finalize memerlukan row LEASED dengan UUID lease yang sama dan lease belum habis. Jika ownership hilang, hasil dicatat hanya pada counter lostLease; worker lama tidak menulis status, receipt atau delivery flags. Lease expiry tidak membuat worker lain mengirim ulang secara otomatis.

## Delivery flags dan lifecycle

Pada ACCEPTED, validasi proof/proyeksi dilakukan ulang dalam transaksi lifecycle. Hanya proof yang masih sah dapat mengubah pending `deliveryConfirmed` atau privacy `delivered`; reset tidak mempunyai flag baru. Perubahan row accepted dan flag commit atomik. Proof consumed/expired/closed saat network berlangsung tidak diberi flag authorized/delivered baru. Fakta provider accepted tetap boleh dicatat dengan kategori PROOF_INVALID_AFTER_SEND dan payload scrubbed selama lease masih sah; sesudah lease/expiry terlewati hasil lama hanya lostLease.

PERMANENT/UNKNOWN/retry/exhausted/cancelled/expired tidak mengesahkan proof. Row terminal tidak kembali PENDING. Seluruh terminalisasi worker dan pembatalan/cleanup Slice 2.2 membersihkan kedua ciphertext. Pembatalan/cleanup yang memenangkan race memblokir finalize worker lama. Tidak menambahkan hook closure atau retensi metadata melalui slice ini.

## Penerimaan dan bukti

1. Strict policy/request, snapshot config, safe errors, deterministic retry deadlines dan summaries tanpa data sensitif.
2. Empat purpose memanggil mailer yang tepat dengan key tetap; receipt dan abort diteruskan. Factory production/missing config/foreign internal recipient tetap menolak sebelum outbound fetch. HTTP status/name classification, malformed receipt dan network errors diuji dengan fake fetch.
3. PostgreSQL: dua worker/concurrency hanya satu sender per lease; due/expired/stale/invalid proof; limit, retry/budget/deadline boundary; dry-run/key-free; ciphertext persisted sampai terminal; restart worker tidak resend terminal.
4. Closure/consumption/resend/session changes sebelum claim memblokir sender; perubahan saat sender berlangsung tidak memberi proof authority. Lease fencing, timeout, stale success dan DB failure tidak menghasilkan retry tak pasti atau delivery flags palsu.
5. Lint/typecheck/unit/backend/integration/Prisma validation/E2E/build yang relevan, satu review fresh context atas seluruh slice, perbaikan Important/Critical lewat RED→GREEN dan full suites, validasi dokumen/diff. Local/fake-fetch evidence terpisah dari provider/hosted/inbox/production.

## Handoff dan rollback

Hasil slice adalah worker/job API dan koneksi mailer yang dapat diuji, bukan running cron. Producer migration ke enqueue, launcher/service identity, cadence/rate/coverage, monitoring durable/alarm, provider inbox/bounce/reconciliation dan bukti hosted perlu scope/evidence berikut. Signup/privacy policy dan production activation tetap mengikuti gate aktif. Rollback sebelum aktivasi membatasi source slice terhadap baseline dan membiarkan kolom aditif tidak digunakan, tanpa drop/data reset. Bila kelak ada row dengan envelope, hentikan worker dan selesaikan/cancel/expire row melalui versi yang membersihkan kedua ciphertext sebelum rollback runtime; versi Slice 2.2 belum mengenal envelope.

## Dasar teknis

[PostgreSQL SELECT](https://www.postgresql.org/docs/18/sql-select.html) mendukung SKIP LOCKED untuk konsumen queue. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys) mempertahankan key 24 jam; ini bukan janji dedup tanpa batas. [Resend errors](https://resend.com/docs/api-reference/errors) membedakan concurrent key, changed-body conflict, rate-limit dan quota. Slice ini memilih berhenti pada hasil tidak pasti, tanpa mengandalkan window provider untuk memulihkan crash.
