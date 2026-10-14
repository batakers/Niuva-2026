# Batch 2, Slice 2.2 — Durable Outbox Implementation Plan

> **For agentic workers:** gunakan superpowers:executing-plans. Owner meminta implementasi pada 14 Oktober 2026; stages rancangan/rencana adalah pekerjaan internal sesuai AGENTS.md. Checklist mencatat hasil aktual; commit/push/deploy tidak diotorisasi oleh instruksi coding ini.

**Goal:** Menyimpan pesan auth/privacy yang terenkripsi, idempoten dan terikat proof/deadline dalam transaksi database yang diverifikasi.

**Architecture:** Reuse BoundDatabaseService dan lock lifecycle Customer. Tambah core/cipher/repository/service outbox, tabel aditif, serta revalidation/expiry cleanup; consumer/send worker mengikuti slice berikut.

**Tech Stack:** TypeScript strict, Zod, Node.js crypto, Prisma/PrismaPg, PostgreSQL 18 dan Vitest/Playwright existing; tanpa dependency baru.

**Spec:** [Rancangan Slice 2.2](../specs/2026-10-14-batch-2-durable-outbox-design.md).

## Global Constraints

- Baseline `d68cc53`; hanya path modul/test/migration baru, schema, env-register dan handoff rilis terkait.
- Tidak mengubah existing migration, `.env*`, provider guards, grants, signup/refund/business policy, workflow atau deployment.
- Input ketat kind/proofId/token; purpose/to/deadline berasal dari database. Proof tetap hash, payload AES-256-GCM, nonce 12 byte/tag 16 byte/key 32 byte.
- Capability/binding → lifecycle lock → proof/pesan; waktu database setelah lock. Unique `(proofKind, proofId)` dan messageKey; terminal scrubbed, tidak resurrect.
- API cleanup paling banyak 100 row per call; tidak ada scheduler/send/activation atau klaim hosted readiness.

## Review Focus

- Konflik fingerprint saat key sama, concurrency dan rollback producer tidak boleh mengganti deadline/cipher atau meninggalkan sebagian write.
- Proof/akun/session yang berubah setelah enqueue harus membatalkan pesan, termasuk akun baru dengan email lama; token tidak menjadi authority hanya karena tersimpan.
- GCM AAD/key ring/config yang rusak harus menolak tanpa membocorkan recipient/token/key atau mengizinkan swap antar row.
- Jam/deadline expiry tepat batas dan cleanup batch tidak boleh menunda expiry, resurrect terminal atau meninggalkan payload pada terminal.
- Gate capability/binding dan callback transaction scope harus berlaku juga untuk producer/cleanup; enqueue tidak berarti delivery dan tidak mengubah proof delivery flags.

## Task 1 — Core dan cipher

**Files:** Create `src/modules/outbox/core.ts`, `src/modules/outbox/cipher.ts`; test `tests/unit/outbox.test.ts`.

**Interfaces:** `parseOutboxInput(raw: unknown): OutboxInput`; `ProofProjection`; `outboxIdentity(proof)` menghasilkan messageKey/fingerprint; `OutboxPayloadCipher({activeKeyId, keys})` dengan `seal(payload, metadata)`/`open(sealed, metadata)`; `readOutboxCipherConfig(source)`.

- [x] Tulis tes schema input/identitas/payload, opaque token 43 karakter, UUID, field tambahan ditolak, fingerprint immutable.
- [x] Jalankan focused unit sampai assertion RED untuk API yang belum bekerja.
- [x] Implement core/cipher sesuai spec, lalu buktikan round trip/random nonce/key rotation, tamper/AAD/key/config invalid dan safe error GREEN.

## Task 2 — Persistence dan lifecycle proof

**Files:** Create `src/modules/outbox/repository.ts`, migration `prisma/migrations/20261014010000_durable_outbox/migration.sql`; modify `prisma/schema.prisma`; test `tests/integration/outbox.test.ts`.

**Interfaces:** `PrismaOutboxRepository` menerima transaction client per method: `lock`, `now`, `proof`, `insert`, `find`, `finish`, `expired`. `proof` menghasilkan ProofProjection atau null; validasi consumed/expiry/owner/session/age/fence/returnTo di repository memakai source nyata. No ambient Prisma.

- [x] Tulis tes PostgreSQL untuk proof/proyeksi/unique insert/state constraints; fixture hanya memiliki marker dan data UUID buatan suite ini.
- [x] Jalankan tes dan baca RED sebelum implementasi repository.
- [x] Tambah model/migration aditif dan repository; generate/validate; buktikan kasus persistence/proof/SQL GREEN.

## Task 3 — Bound service dan transaksi producer

**Files:** Create `src/modules/outbox/service.ts`; test `tests/backend/outbox-service.test.ts`, extend integration outbox.

**Interfaces:** `DurableOutboxService({bound, repository, cipherFactory})`: `enqueue(raw)`, `withTransaction(work)` dengan `{tx, now, enqueue}`, `revalidate(id)`, `expireBatch(limit=100)`. Receipt id/messageKey/state/expiresAt/duplicate; tidak ada plaintext. Parameter `bound` adalah Pick<BoundDatabaseService,"run">. Cipher factory lazy; expiry cleanup memakai operation job agar tidak bergantung pada email/key.

- [x] Tulis tes guard-before-producer, real BoundDatabaseService denied, safe input/error; integration enqueue empat purpose, dedup concurrency, immutable retry dan proof+outbox rollback.
- [x] Jalankan assertion RED untuk service belum bekerja.
- [x] Implement service orchestration; buktikan GREEN, cipher at rest, revalidation lifecycle/expiry, terminal no resurrection, bounded cleanup dan delivery flags unchanged.

## Task 4 — Verifikasi dan handoff

**Files:** Modify `.kiro/specs/niuva-audit-remediation/env-register.md`, `docs/frontend/mvp-release-readiness.md`; update spec/plan evidence.

- [x] Jalankan lint/typecheck/Prisma generate+validate, unit/backend/integration, E2E dan build; catat command/count/skip/failure aktual.
- [x] Minta satu reviewer independen fresh context atas seluruh allowlist; rule findings dan perbaiki Critical/Important dengan RED→GREEN dan suite terkait.
- [x] Validasi link/anchor dokumentasi dan diff/check path, catat handoff Slice 2.3 serta batas hosted/consumer dan rollback.

## Rollback

Revert terbatas modul/service yang ditambahkan; tabel aditif dapat dibiarkan tidak digunakan. Jangan drop tabel/data atau mengubah migration lama sebagai rollback otomatis. Tidak ada runtime consumer yang dialihkan oleh slice ini.

## Hasil aktual

**Selesai dan terverifikasi lokal — 14 Oktober 2026.** Branch `codex/batch-2-durable-outbox`, baseline `d68cc531d36e3b961f500d2c5ce38ea7a632a909`. Ada 13 path dalam allowlist dan 108 tes baru: 40 unit, 17 backend, 51 integration. Tidak ada dependency baru. Semua kriteria penerimaan spec tercakup oleh tes dan gate di bawah dalam batas modul internal.

| Command | Hasil lokal |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | PASS; manifest/lockfile tetap. |
| `corepack pnpm db:generate` / `corepack pnpm db:validate` | PASS; schema valid, client regenerated. |
| `corepack pnpm lint` / `corepack pnpm typecheck` | PASS sesudah perbaikan review. |
| `corepack pnpm test` | PASS sesudah perbaikan review: 123 files, 1.399 tests, coverage aktif. |
| `corepack pnpm test:backend` | PASS sesudah perbaikan review: 86 files, 626 tests, coverage aktif. |
| `corepack pnpm test:integration` | PASS sesudah perbaikan review: 39 files, 241 tests, coverage aktif. |
| `corepack pnpm test:e2e` | PASS 112, expected skip 5. Berjalan sebelum fix repository terisolasi; tidak ada perubahan route/wiring setelahnya. |
| `corepack pnpm build` | PASS sesudah perbaikan review; 90 static pages. |

Lima skip browser adalah suite `public-content-production-path` untuk public content berbasis database production. Ini pengecualian konfigurasi yang sudah ada, bukan kegagalan yang disembunyikan atau bukti production dari slice ini. Test memakai database PostgreSQL worktree-owned pada loopback; tidak memakai/reset database lama. Migration baru diaplikasikan di database test tersebut, bukan hosted.

Validasi akhir empat dokumen mencakup 43 link/anchor lokal, nol error. `git diff --check` PASS; allowlist tepat 13 path, index kosong, existing migrations/env/workflow tidak berubah dan checkout main tetap bersih pada baseline. Database test milik worktree dihentikan sesudah gate selesai; data test lokal dipertahankan.

TDD core/repository/service dijalankan RED lalu GREEN. Tambahan regresi jam database mereproduksi pergeseran raw timestamp pada Asia/Jakarta dan America/New_York; pembacaan epoch memperbaiki keduanya. Tes clock tetap mencakup UTC. Focused RED/GREEN mematikan coverage untuk assertion feedback, sedangkan full suites memakai konfigurasi coverage proyek.

Satu reviewer independen fresh context memeriksa seluruh 13-path diff uncommitted secara read-only: **Critical 0, Important 1, Minor 0; verdict With fixes**. Finding Important diterima setelah pengecekan source: dua pending registration dapat memakai email sama, tetapi verifikasi pemenang membuat proof sibling tidak bisa dikonsumsi lagi. Dua regresi PostgreSQL memakai `CustomerEmailRepository.consumeVerification` nyata; sebelum fix keduanya gagal pada assertion, sesudah pemeriksaan Customer pada projection keduanya PASS. Pesan sibling yang sudah antre dibatalkan dan payload dihapus; enqueue pertama setelah akun terbentuk ditolak. Tidak ada finding yang diturunkan atau diabaikan. Sesuai workflow, fix diverifikasi lewat RED→GREEN dan suite penuh, tanpa reviewer kedua.

### Rulings I made

Urutan berikut sama dengan ledger eksekusi, termasuk setiap behavior yang reviewer tidak nilai. Biaya menyatakan konsekuensi jika asumsi keputusan salah.

1. Tahap rancangan/rencana dikerjakan internal sesuai permintaan implementasi dan AGENTS.md; tanpa persetujuan serial. Biaya: perubahan arah dapat memerlukan revisi terbatas; keputusan bisnis yang belum ada tetap terbuka.
2. Ledger/capture Windows memakai write native dan dipertahankan; tanpa commit/push/penghapusan scratch otomatis. Biaya: pencatatan manual dan review memakai allowlist uncommitted, bukan commit range.
3. Coverage dimatikan hanya saat focused RED/GREEN. Biaya: hasil focused tidak cukup untuk completion; full suites ber-coverage tetap wajib.
4. Cipher factory lazy dan expiry cleanup memakai authority job/scheduledJobs terpisah dari email. Biaya: caller berikut harus menyediakan factory dan grant job sendiri; tidak memperoleh grant ambient.
5. Review independen berjalan bersamaan dengan closing gates pada kode stabil. Biaya: fix sesudah review harus RED→GREEN dan green suite; hasil fix tidak mendapat review independen kedua.
6. Worker claim/send/retry/provider idempotency/delivery flags/bounce/lease recovery tetap Slice 2.3; belum ada consumer. Biaya: sender masa depan dapat menggandakan atau mengirim pesan invalid jika protokolnya tidak diuji.
7. Cleanup hanya API bounded; tidak menjanjikan cadence, SLA purge, atau monitoring hosted. Biaya: payload bisa menetap sampai revalidation/cleanup dipanggil.
8. Provisioning/rotasi key hosted, grants dan deployment tetap tertutup. Biaya: tes lokal tidak membuktikan ketersediaan key atau keamanan rotasi operasional.
9. Signup/policy publik tetap mengikuti guard dan gate aplikasi yang ada. Biaya: menganggap slice ini izin launch dapat membuka flow publik yang belum disahkan.
10. Account closure membatalkan sumber bukti; scrub ciphertext terjadi melalui revalidate/expiry, tanpa hook penghapusan langsung baru. Biaya: ciphertext menetap selama jeda sebelum pemeriksaan/pembersihan.
11. Revalidation memeriksa proof, bukan izin send atau bukti decrypt. Biaya: sender yang tidak menggabungkan dekripsi terautentikasi dan penanganan race dapat mengirim konten stale/rusak.
12. API sekarang memakai lock lifecycle bersama; worker masa depan yang melewatinya belum dinilai. Biaya: consumer baru bisa berlomba dengan closure/consumption.
13. Callback transaksi adalah kode server tepercaya yang wajib await dan meneruskan error. Biaya: producer yang menelan error atau menyalahgunakan raw transaction client dapat commit tanpa pesan yang dimaksud.
14. Duplicate enqueue tetap mengonstruksi cipher sebelum dedup; tidak ada janji enqueue tanpa key. Biaya: retry memerlukan konfigurasi cipher meskipun row sudah ada; cleanup tetap independen dari key.
15. Perubahan allowlist/consent-policy setelah enqueue perlu gate policy/capability pada sender berikut. Biaya: sender yang mengabaikannya bisa mengirim berdasarkan policy yang sudah berganti.
16. Lock lifecycle bersama dipakai tanpa klaim throughput/latency hosted. Biaya: workload hosted mungkin membutuhkan pengukuran contention dan penyesuaian sebelum aktivasi.
17. Retensi metadata tidak ditentukan sepihak; rollback membiarkan tabel aditif tidak dipakai. Biaya: metadata bertambah sampai operasi retensi yang disetujui tersedia.

### Deferred minors

Tidak ada; reviewer melaporkan nol Minor dan tidak ada finding yang diturunkan oleh implementer.

### Handoff

Langkah berikut adalah Slice 2.3: rancangan/implementasi worker dan kerangka job memakai kontrak ini, termasuk protokol claim/send/retry/reconcile, producer wiring, lifecycle race dan observability. Cadence/lag/coverage serta resource/sender/hosted activation tetap keputusan dan bukti tersendiri. REL-03 hanya partial internal; queue bukan bukti delivery/inbox. Tidak ada production grant atau consumer lama yang dialihkan.

Dokumen ini dan [spec](../specs/2026-10-14-batch-2-durable-outbox-design.md) disimpan bersama source sehingga handoff tidak bergantung pada chat atau scratch. Saat ini perubahan belum di-commit/push; worktree dan branch dipertahankan sampai ada instruksi Git berikutnya. Rollback tetap terbatas pada perubahan slice terhadap baseline; jangan drop tabel/data sebagai langkah otomatis.
