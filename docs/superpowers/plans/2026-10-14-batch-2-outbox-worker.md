# Batch 2, Slice 2.3 — Outbox Worker Implementation Plan

> **For agentic workers:** gunakan superpowers:executing-plans, native/inline seperti Slice 2.2. Owner memilih worker/job dan sambungan sender Customer, tanpa key produksi/aktivasi. AGENTS.md menjadikan rancangan/rencana tahap internal; Git untuk Slice 2.2 sudah selesai, commit/push Slice 2.3 menunggu instruksi tersendiri.

**Goal:** Worker bounded dengan dry-run, lease/fencing, revalidation, timeout dan retry aman, terhubung ke mailer Customer existing.

**Architecture:** Short BoundDatabaseService transactions untuk claim/finalize; shared lifecycle lock dan database epoch; network di luar transaksi. Sender adapter memakai mailer auth/privacy existing dan Resend safe outcome, tanpa aktivasi atau producer migration.

**Tech Stack:** TypeScript strict, Zod, Node AbortController/timers dan monotonic clock, Prisma/PostgreSQL 18, Vitest/Playwright existing; tanpa dependency baru. Review memerlukan satu migration aditif untuk encrypted delivery envelope, diterapkan hanya pada database tes lokal; existing migrations utuh.

**Spec:** [Worker dan mailer Customer](../specs/2026-10-14-batch-2-outbox-worker-design.md).

## Global Constraints

- Baseline `13dd3cc`; gunakan managed worktree/branch existing yang sudah terisolasi dari main.
- Tidak membaca/mengubah .env/secrets/private logs, existing migrations, signup/policy, grants, workflow/deployment atau resource activation.
- Request strict `{mode:"dry-run"|"execute",limit:1..100}`; policy server wajib `leaseMs`, `sendTimeoutMs`, `retryDelaysMs` 0–99; positive integers <=2,147,483,647, timeout < lease. Tidak ada default cadence/retry.
- Setiap run butuh scheduledJobs/binding; execute juga emailDelivery/binding sebelum claim/factory. Dry-run tidak decrypt/send/mutate.
- Clock database epoch; proof/lease/finalize di bawah lifecycle lock. Network di luar transaksi. Identity/fingerprint/expiry immutable.
- RETRYABLE hanya status/nama Resend yang terdokumentasi; UNKNOWN/lease abandoned tidak auto resend. Terminal payload scrubbed, flags hanya pada accepted proof yang masih valid.
- Source/domain tetap pemilik business rule, repository pemilik SQL. Receipt/summary/error tidak memuat PII/payload.

## Review Focus

- Closure/resend/consumption/session change tepat sebelum claim dan saat sender berjalan: tidak ada authority proof palsu atau akun/history hidup lagi; hasil in-flight harus dijelaskan.
- Old worker menyelesaikan sender setelah lease timeout atau setelah row terminal: tidak boleh menulis outcome/reference/flags atau memicu send kedua.
- Rate-limit/concurrent-key vs quota/changed-body/HTTP5xx/network/invalid receipt: hanya known rejection yang retry, key/content/deadline tetap.
- Missing/wrong cipher atau mailer/config/capability: denied sebelum side effect, ciphertext dapat dipulihkan, dry-run/cleanup independen.
- Parameter caller dimutasi setelah constructor, dry-run menjalankan factory, atau claimed messages menunggu lama sebelum send: snapshot/scope/bounded loop tidak boleh gagal diam-diam.

## Task 1 — Policy, safe delivery dan adapter Customer

**Files:** Create `src/modules/outbox/worker-core.ts`, `src/modules/outbox/customer-sender.ts`, `src/modules/notifications/email-delivery.ts`; modify `src/modules/notifications/resend.ts`, `src/modules/customer-auth/email-mailer.ts`, `src/modules/customer-privacy/mailer.ts`; tests `tests/unit/outbox-worker.test.ts`, `tests/backend/outbox-worker.test.ts`.

**Interfaces:** `parseWorkerRequest(raw:unknown):WorkerRequest`; `parseWorkerPolicy(raw:unknown):WorkerPolicy` frozen policy; `parseDeliveryOutcome(raw:unknown):DeliveryOutcome` unknown fallback. Outcome accepted `{providerReference:string|null}` / retryable `{retryAfterMs?:number}` / permanent / unknown. `OutboxDispatch={metadata:OutboxMetadata,payload:OutboxPayload}`. `OutboxSender` exposes `prepare(dispatch):PreparedOutboxDelivery` (envelope plus send operation), availability `assertReady(purpose)` and direct `send(message,signal)`. Worker uses prepare before claim, then the saved envelope. `CustomerOutboxSender({auth:CustomerAuthMailer|null,privacy:PrivacyMailer|null})`. `EmailDeliveryError(kind:"RETRYABLE"|"PERMANENT"|"UNKNOWN",retryAfterMs=0) extends AppError`, constant safe message. Existing mailer optional prepare preserves send-only inline fixtures; available factories expose prepare and production mode remains closed. Send accepts optional signal and returns `{id:string}|void`.

- [x] Tulis tes policy/request strict/default denied/positive integers/timeout/array length/config snapshot; sender mapping empat purpose, immutable key, signal, provider receipt/void and safe outcomes.
- [x] Tulis fake-fetch gateway tes 429 rate_limit_exceeded, 409 concurrent_idempotent_requests, quota/conflict/4xx, 408/5xx/network/malformed success; actual factory production/foreign-recipient denial dan configured fake-fetch receipt.
- [x] Buat signature-only scaffolds bila import belum tersedia; jalankan `corepack pnpm exec vitest run --project unit tests/unit/outbox-worker.test.ts --coverage.enabled=false` dan equivalent backend config sampai assertion RED, bukan import/setup error.
- [x] Implement minimal APIs, gateway classification, receipt/signal propagation dan explicit-source factory snapshot. Jalankan focused unit/backend sampai GREEN.

## Task 2 — Lease/fencing repository

**Files:** Create `src/modules/outbox/worker-repository.ts`; tests `tests/integration/outbox-worker.test.ts`.

**Interfaces:** `PrismaOutboxWorkerRepository extends PrismaOutboxRepository`: `candidates(tx,now,limit,lock:boolean):Promise<DurableOutboxMessage[]>`, `claim(tx,row,leaseId,now,leaseExpiresAt,sealedEnvelope=row.sealedEnvelope):Promise<DurableOutboxMessage>`, `discard(tx,row,now,state:"FAILED"|"CANCELLED"|"EXPIRED",failureCategory):Promise<boolean>`, `finishOwned(tx,row,now,action:AttemptAction):Promise<boolean>`, `markDelivered(tx,proof,now):Promise<void>`. `AttemptAction` PENDING retry with dueAt/failureCategory or terminal ACCEPTED/FAILED/CANCELLED/EXPIRED with optional providerReference/failureCategory. Every method explicit tx. Worker owns proof/crypto decision; repository owns conditional SQL/write and flags.

- [x] Tulis isolated PostgreSQL tests due ordering/skip locked/limit, atomic lease+attempt, stale ownership/expiry rejection, terminal scrub/no overwrite, retry deadline and valid proof delivery writes. Fixtures/marker hanya milik suite, tanpa reset DB lama.
- [x] Jalankan `corepack pnpm exec vitest run --config vitest.integration.config.mts tests/integration/outbox-worker.test.ts --coverage.enabled=false` dengan explicit TEST_DATABASE_URL sampai assertion RED.
- [x] Implement candidate SELECT FOR UPDATE SKIP LOCKED dan conditional owned finalize; buktikan GREEN dan constraint Slice 2.2 tetap berlaku.

## Task 3 — Worker/job execution

**Files:** Create `src/modules/outbox/worker.ts`; extend unit/backend/integration worker tests.

**Interfaces:** `DurableOutboxWorker({bound:Pick<BoundDatabaseService,"run">,repository:PrismaOutboxWorkerRepository,cipherFactory:()=>OutboxPayloadCipher,senderFactory:()=>OutboxSender,policy:unknown})`; `run(raw:unknown):Promise<WorkerSummary>`. Policy snapshots on construction. Job-bound preflight for each run; dry-run returns count only. Execute runs short outbox-bound claim/finalize transactions; one message then send then next. Factories pure/lazy after gates, sender never called in tx.

Claim returns skip state or `{row,prepared,envelope,measuredAt,validForMs}`. Within lock: handle expiry/stale/invalid/budget; open cipher and compare token hash/to/returnTo; prepare actual mailer and validate local config/recipient/origin; seal first rendered envelope or reopen existing one; fresh DB time again before lease write. Time-sensitive work rechecks deadline after crypto. Create lease and increment attempts, cap deadline. Monotonic elapsed time from before that clock query includes claim/commit/return; subtract it and recheck before actual send. No remaining validity means no external call. Missing/corrupt retry envelope is recoverable configuration/storage failure, never rebuilt under the same key.

Finalize reads current row/proof/time under lock, checks owned valid lease; accepted result marks queue and only currently valid proof flags atomically. Retry revalidates and uses delay at index attempts-1; no delay available -> RETRY_EXHAUSTED. dueAt >= expiry -> EXPIRED. Unknown/permanent scrub and fail. No second finalize from late Promise resolution.

Run berhenti setelah sender outcome retryable/unknown dan mengembalikan cooldownMs minimum; pemanggil launcher berikut harus menghormati delay itu. Metadata yang berubah saat in-flight diperlakukan lostLease; fresh clock diperiksa sesudah crypto dan sebelum final write.

- [x] Tulis RED guards before factories, dry-run without email/key, limits, policy snapshot, external send outside tx, bounded loop and timeout without raw leak.
- [x] Tulis real PostgreSQL RED worker→Customer adapter→fake mailers untuk empat purpose, no double concurrent sends, retry same key/content, budget/deadline, closed/consumed/resend/revoked before claim, closure/destination change during sender, timeout/stale late success, missing key retained and accepted flag rollback.
- [x] Implement orchestration dan timer/abort cleanup, run focused suites GREEN. Jalankan full unit/backend/integration sebelum completion task; tidak menambah provider request nyata.

## Task 4 — Review, gate dan handoff

**Files:** Update spec/plan evidence dan `docs/frontend/mvp-release-readiness.md`. Important review fixes additionally modify `prisma/schema.prisma`, add `prisma/migrations/20261014020000_outbox_delivery_envelope/migration.sql`, extend `outbox/cipher.ts` and base `outbox/repository.ts` scrub, and add nullable envelope to the existing typed backend fixture. Final allowlist: 19 files.

- [x] Lint/typecheck/Prisma validate, full unit/backend/integration, E2E dan build; catat hasil aktual dan expected skips, tanpa melemahkan config.
- [x] Satu fresh reviewer whole-slice memakai requesting-code-review, exact working-diff allowlist sejak baseline (HEAD mungkin belum berubah). Re-grade findings, satu fix pass Important/Critical dengan RED→GREEN/full suites; ledger every Declined to judge item + cost, minors deferred.
- [x] Validasi local links/anchors, `git diff --check`, allowlist, main clean, no env/existing-migration/deployment/grant changes; one additive test-only migration reviewed. Stop owned test DB, preserve worktree/scratch. Catat producer/launcher/hosted/inbox gates yang masih terbuka.

## Rollback

Revert source perubahan Slice 2.3 terhadap baseline; tabel dan kolom aditif tetap. Tidak drop/reset/data migration otomatis. Producer lama belum dialihkan; worker API/factory dapat tidak dipanggil. Bila worker kelak diaktifkan, drain/cancel/expire row berenvelope melalui versi baru sebelum rollback agar ciphertext tambahan tidak tertinggal oleh cleanup Slice 2.2. Commit/push/deploy/aktivasi memerlukan instruksi terpisah.

## Hasil aktual

Implementasi runtime, satu fix pass review dan seluruh closing gates **selesai lokal**. Baseline `13dd3cc5860fb8d52a616654a4315b63d12d6be5`, branch `codex/batch-2-durable-outbox`; perubahan Slice 2.3 belum di-commit/push. Main terpisah tetap bersih. Scope source final 19 file; tidak ada dependency, env file, existing migration, grants, workflow atau aktivasi yang berubah. Database tes milik pekerjaan ini sudah dihentikan melalui helper repo; data cluster, worktree dan scratch dipertahankan.

TDD awal: Task 1 unit 5 failed/19 passed → 24 passed; backend 26 failed/4 passed → 30 passed. Task 2 integration 10 failed/4 passed → 14 passed. Task 3 unit 1 failed/30 passed → 31 passed; backend 3 failed/31 passed → 34 passed; integration 36 failed/14 passed → 50 passed. Refinement rate-limit batch stop dan decimal Retry-After juga assertion RED→GREEN, menghasilkan 126 tes terfokus sebelum review.

Satu reviewer fresh context, read-only, memakai Superpowers requesting-code-review memberi **With fixes: 3 Important, 0 Critical, 0 Minor**. Ketiganya dipertahankan sebagai Important berdasarkan dampak, diperbaiki sekaligus dengan **9 assertion integration RED (57 existing passed) → GREEN**: origin/capability/recipient yang ditolak factory actual mempertahankan row; claim terlambat tidak memanggil sender setelah lease/proof deadline; empat purpose mempertahankan request body/key persis pada worker/factory reconstruction dengan origin/from berbeda. Tidak ada reviewer kedua. Tes tambahan membuktikan AAD/context/key rotation, cleanup envelope, missing/corrupt retry envelope dan commit/return delay. Full integration final mencakup **71 tes worker**, unit worker **35**, backend worker **38**, total **144**.

| Command | Hasil source final |
| --- | --- |
| `corepack pnpm db:generate` | Lulus; generated client diabaikan Git sesuai kontrak repo. |
| `corepack pnpm db:test:migrate` | Lulus pada niuva_test loopback terisolasi; satu migration aditif envelope, tanpa reset. |
| `corepack pnpm lint` | Lulus. |
| `corepack pnpm typecheck` | Lulus. |
| `corepack pnpm db:validate` | Lulus. |
| `corepack pnpm test` | 124 files / **1.434 tests passed**, coverage aktif. |
| `corepack pnpm test:backend` | 87 files / **664 tests passed**, coverage aktif. |
| `corepack pnpm test:integration` | 40 files / **312 tests passed**, coverage aktif. |
| `corepack pnpm test:e2e` | **112 passed / 5 skipped**; lima public-content-production-path tests mensyaratkan `NIUVA_DEPLOYMENT_TIER=production`, sedangkan run memakai tier test. |
| `corepack pnpm build` | Lulus; compile dan **90 static pages**. |
| `corepack pnpm db:test:stop` | Lulus; owned server shut down, start session selesai exit 0. |
| `corepack pnpm db:test:status` setelah stop | Exit 1 dengan pesan `PostgreSQL test tidak berjalan.`; hasil yang diharapkan menurut helper, mengonfirmasi server berhenti. |

44 local links/anchors di tiga dokumen resolve, 0 error; `git diff --check` lulus. Test-fixture typed lama diberi `sealedEnvelope:null` setelah schema generate; kontrak Promise rejection mailer inline dipertahankan. Pemeriksaan source memastikan semua terminal cleanup worker maupun Slice 2.2 membersihkan kedua ciphertext. Gate awal sebelum fix juga seluruhnya lulus, tetapi bukti penerimaan menggunakan rerun source final di atas.

Final allowlist:

```text
docs/frontend/mvp-release-readiness.md
docs/superpowers/plans/2026-10-14-batch-2-outbox-worker.md
docs/superpowers/specs/2026-10-14-batch-2-outbox-worker-design.md
prisma/schema.prisma
prisma/migrations/20261014020000_outbox_delivery_envelope/migration.sql
src/modules/customer-auth/email-mailer.ts
src/modules/customer-privacy/mailer.ts
src/modules/notifications/email-delivery.ts
src/modules/notifications/resend.ts
src/modules/outbox/cipher.ts
src/modules/outbox/repository.ts
src/modules/outbox/customer-sender.ts
src/modules/outbox/worker-core.ts
src/modules/outbox/worker-repository.ts
src/modules/outbox/worker.ts
tests/backend/outbox-service.test.ts
tests/backend/outbox-worker.test.ts
tests/integration/outbox-worker.test.ts
tests/unit/outbox-worker.test.ts
```

## Rulings I made

Urutan berikut mengikuti semua 27 keputusan ledger, termasuk setiap item Declined to judge reviewer. Semua keputusan menyatakan biaya bila keliru; tidak ada minor yang ditunda.

| No. | Keputusan dan dasar | Biaya bila keliru / batas yang tersisa |
| --- | --- | --- |
| 1 | Spec/plan tahap internal mengikuti instruksi implementasi dan AGENTS. | Rancangan dapat perlu revisi sempit; keputusan bisnis tetap terbuka. |
| 2 | Gunakan file tools Windows; simpan scratch dan tunggu instruksi Git Slice 2.3. | Record masih lokal/belum di-commit. |
| 3 | Sambungan scope ini worker ke empat mailer, producer tetap terpisah. | Bila Owner mengharapkan producer juga, diperlukan perluasan sempit dan semantik queued yang jujur. |
| 4 | Unknown/lease abandoned tidak auto resend; retry hanya known rejection. | Crash sebelum network dapat memerlukan proof/resend baru. |
| 5 | Policy lease/timeout/retry eksplisit dari server caller. | Belum ada cadence/SLA atau nilai operasi produksi. |
| 6 | Cipher/config failure rollback claim dan menjaga ciphertext. | Row rusak dapat menahan antrean sampai repair/expiry. |
| 7 | Tambahkan conditional discard untuk row unclaimed/stale. | Interface tambahan harus menjaga snapshot dan transaction client. |
| 8 | Validasi outcome runtime dan decimal Retry-After minimum. | Outcome malformed menjadi unknown; HTTP-date belum ditafsirkan. |
| 9 | Stop batch saat retryable/unknown, kembalikan cooldown minimum. | Throughput lebih rendah; caller harus menghormati delay. |
| 10 | Satu review berjalan bersama full gates pada source stabil. | Perbaikan memerlukan rerun penuh dan tidak mendapat reviewer kedua. |
| 11 | Producer migration ditunda karena scope sender. | Flow interaktif masih mengirim inline. |
| 12 | Scheduler/endpoint/launcher/identity terpisah dari callable worker. | Belum ada job background yang berjalan. |
| 13 | Koordinasi cooldown global ditunda. | Launcher paralel berikut dapat melebihi throughput provider tanpa koordinasi. |
| 14 | Cadence/SLA/throughput/on-call memerlukan keputusan operasi. | Belum ada komitmen operasi produksi. |
| 15 | Hosted monitoring/alarm/rekonsiliasi operator ditunda. | Counter internal belum menjadi workflow operasi. |
| 16 | Live provider/inbox/bounce/credentials belum dapat dinilai dari tes palsu. | Delivery nyata belum terbukti. |
| 17 | Public registration/policy/staging/production mengikuti gate terpisah. | Slice ini tidak mengizinkan customer/production launch. |
| 18 | Recovery otomatis unknown/lease abandoned tetap dikecualikan. | Dapat perlu resend yang diotorisasi baru. |
| 19 | Pertahankan row dengan cipher/key rusak agar bisa dipulihkan. | Repair/cleanup expiry diperlukan untuk membuka antrean. |
| 20 | HTTP-date Retry-After ditunda; policy menjadi fallback. | Hint tanggal provider tidak dihormati langsung. |
| 21 | Quota/permanent rejection tidak diubah menjadi retry otomatis. | Repair dan otorisasi baru dapat diperlukan. |
| 22 | Template migration tooling masa depan terpisah; replay saat ini diperbaiki. | Rilis template nanti membutuhkan rencana kompatibilitas. |
| 23 | Hosted load global-lock, device/AT dan visual belum dinilai tanpa pengukuran/UI change. | Gate penerimaan tersebut tetap terbuka. |
| 24 | Repository/factory/mailer adalah trusted server dependencies. | Dependency yang sengaja hostile dapat melanggar kontrak. |
| 25 | Envelope immutable terenkripsi disimpan atomik pada claim pertama, satu kolom/migration aditif. | Perlu review deployment schema; origin/from lama bertahan sampai proof terminal. |
| 26 | Prepare optional untuk kompatibilitas inline, wajib bagi adapter worker. | Mailer worker send-only harus menambah preparation. |
| 27 | Budget DB dibawa melewati claim/commit dengan elapsed monotonic konservatif. | Pesan dekat expiry dapat dilewati; hasil uncertain tetap tidak diulang. |

## Deferred minors

Tidak ada. Satu reviewer tidak mengangkat finding Minor, dan tidak ada pekerjaan polish yang dimasukkan ke fix pass.
