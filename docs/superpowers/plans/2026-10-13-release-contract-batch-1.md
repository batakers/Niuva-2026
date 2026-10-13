# Release contract reconciliation — Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan kontrak rilis yang sudah ada dengan keputusan Owner dan kode terkini, serta mencatat pemilik, bukti, dan syarat penutupan setiap penghambat rilis.

**Architecture:** PRD memiliki keputusan produk, Tech Design memiliki kontrak teknis, paket legal memiliki draf dan kebutuhan operasional, dan `docs/frontend/mvp-release-readiness.md` memiliki status/handoff rilis. Snapshot lama dipertahankan dengan konteks tanggal; perubahan dokumentasi tidak mengaktifkan capability runtime.

**Tech Stack:** Markdown, Git, pemeriksaan link/anchor dan source read-only; tanpa dependency baru.

**Spec:** Batch 1 yang disetujui Owner dalam percakapan 13 Oktober 2026; keputusan tertulis pada [register keputusan](../../../.kiro/specs/niuva-audit-remediation/register-keputusan.md), [spec usia/CAD/sitemap](../../../.kiro/specs/niuva-keputusan-lanjutan/requirements.md), [PRD](../../PRD-Niuva-MVP.md), dan [kontrak B2B](../specs/2026-10-11-b2b-whatsapp-design.md).

## Global Constraints

- Scope hanya dokumentasi dan catatan pelaksanaan; runtime, tests aplikasi, schema/migration, dependency, `.env*`, workflow, dan deployment config tidak berubah.
- Keputusan Owner 5 Oktober: akun 18+ dengan self-declaration; bukan verifikasi usia. Pengesah dokumen adalah Owner; review kepatuhan tetap tercatat tanpa menjadikan perekrutan konsultan sebagai gate coding.
- Keputusan Owner 11 Oktober: DEVELOP/B2B melalui WhatsApp langsung; MAKE dan BUY mempertahankan kontraknya.
- Admin memakai Better Auth/TOTP, terpisah dari akun Customer. Clerk hanya disebut sebagai histori yang diberi tanggal bila diperlukan.
- Identitas/kontak/alamat retur dan penugasan Rheza yang sudah dikonfirmasi dipertahankan persis. Kalender/coverage, retensi, resource, dan fakta yang belum tersedia tetap terbuka.
- Draf tetap belum berlaku; tidak menetapkan tanggal berlaku atau mengubah identifier policy runtime/internal. Status implementasi, pengesahan Owner, provider, visual/device/AT, dan izin rilis dipisahkan.
- Tidak commit, push, merge, publikasi, aktivasi provider, penggunaan credential production, atau penghapusan file/data.

## Review Focus

- Pembaca tidak boleh menganggap semua usia/akun wali sebagai target aktif atau menyamakan checkbox dengan usia terverifikasi.
- Pembaca harus membedakan Better Auth saat ini dari snapshot Clerk, dan kode capability yang ada dari izin hosted/production yang belum diberikan.
- Refund penuh tetap arah produk; penanganan notifikasi refund bukan workflow pengajuan/persetujuan/refund otomatis.
- Snapshot konfigurasi/CI lama tidak menjadi bukti provider, staging, inbox, recovery atau production saat ini.
- Setiap penghambat memiliki pemilik, bukti yang dibutuhkan dan syarat penutupan; keputusan yang sudah ada tidak diminta ulang dan status formal tidak dinaikkan oleh edit dokumentasi.

## Task 1: Selaraskan authority dan draf aktif

**Files:**
- Modify: `docs/PRD-Niuva-MVP.md`, `docs/TechDesign-Niuva-MVP.md`.
- Modify: `docs/legal/customer-terms-draft.md`, `docs/legal/customer-privacy-draft.md`.
- Modify: `docs/legal/customer-service-refund-sop.md`, `docs/legal/customer-privacy-retention-sop.md`.

**Interfaces:** consumes keputusan 5/11 Oktober dan source auth/age; produces kontrak aktif yang dirujuk matriks kesiapan.

- [x] Catat selisih baseline: usia semua umur vs 18+, B2B form vs WhatsApp, Clerk vs Better Auth.
- [x] Tambahkan rekonsiliasi bertanggal pada authority; selaraskan paragraf draf/SOP yang masih memberi instruksi aktif lama.
- [x] Periksa bahwa versi draf/internal, nilai identitas dan kontrak uang/retensi berkas tidak berubah menjadi policy resmi atau default baru.

## Task 2: Selaraskan paket kesiapan dan simulasi

**Files:**
- Modify: `docs/legal/customer-public-launch-readiness.md`, `docs/legal/customer-public-runtime-contract.md`.
- Modify: `docs/legal/customer-public-input-evidence.md`, `docs/legal/customer-public-policy-validation.md`, `docs/legal/customer-policy-implementation.md`.

**Interfaces:** consumes kontrak Task 1; produces status PUB dan skenario penerimaan yang membedakan kode, keputusan dan bukti lingkungan.

- [x] Koreksi usia/wali, auth Admin dan partial implementation hosted; pertahankan unknown provider/operasi dan bukti historis.
- [x] Tandai review/simulasi semua usia 3 Oktober sebagai histori; tulis skenario aktif self-declaration dengan keterbatasannya.
- [x] Cocokkan status dengan source legal resolver, mailer, capability, privacy, schema dan job tanpa membaca env/log privat.

## Task 3: Perbarui handoff rilis dan register

**Files:**
- Modify: `docs/frontend/mvp-release-readiness.md`, `docs/frontend/operational-readiness-report.md`.
- Modify: `.kiro/specs/niuva-audit-remediation/register-keputusan.md`, `.kiro/specs/niuva-audit-remediation/production-readiness-boundary.md`.
- Modify: `docs/backend/provider-staging-intake.md`, `docs/backend/sandbox-readiness.md`.

**Interfaces:** consumes Task 1–2; produces satu peta penghambat/handoff aktif dengan tautan ke authority yang memilikinya.

- [x] Catat baseline `a577b7c326ff42d3a642cf5f0b93ccdf59c26bef` dan batas evidence CI; pisahkan snapshot lama.
- [x] Catat delapan penghambat, pemilik/penugasan yang belum bernama, bukti diperlukan, syarat penutupan dan urutan dependensi.
- [x] Pertahankan status formal terbuka dan keputusan defer; hubungkan intake/boundary lama ke handoff aktif.

## Task 4: Verifikasi dan review akhir

**Files:** plan ini; ledger pelaksanaan git-ignored pada `.superpowers/sdd/2026-10-13-release-contract-batch-1/progress.md`.

**Interfaces:** consumes seluruh perubahan; produces hasil validasi/review dan laporan penyelesaian.

- [x] Periksa link/anchor lokal yang baru/berubah, konsistensi usia/auth/versi, kelengkapan matriks, dan `git diff --check`.
- [x] Pastikan diff hanya allowlist dokumen; tidak mengklaim suite aplikasi/provider dijalankan untuk perubahan ini.
- [x] Jalankan satu fresh-context review sesuai Superpowers; perbaiki temuan penting dalam scope dan ulangi pemeriksaan terkait.
- [x] Tandai hasil aktual, batas bukti dan pekerjaan Batch 2; simpan perubahan lokal untuk review Owner tanpa commit/push.

## Pelaksanaan dan penyesuaian workflow

Persetujuan implementasi Batch 1 sudah diberikan. Sesuai `AGENTS.md`, planning dan execution berlangsung langsung tanpa gate persetujuan berulang. Worktree native terpisah dipakai; implementasi dikerjakan inline dengan satu reviewer akhir. TDD kode tidak berlaku karena tidak ada production code yang diubah; pemeriksaan dokumen dan diff menjadi gate. Instruksi commit/cleanup bawaan skill tidak dijalankan karena tindakan itu belum diminta; ledger dipertahankan bersama perubahan lokal.

## Hasil verifikasi

- Pemeriksaan awal setelah Task 1–3: 17 dokumen existing diubah dan 1 plan ditambahkan; tidak ada file di luar allowlist.
- 164 link/anchor lokal pada seluruh file target valid; baseline error 0 dan error baru 0. Pemeriksaan source bersifat read-only.
- Delapan baris REL-01–08 lengkap dengan pemilik/bukti/syarat penutupan; 33 status formal RK/AG sama dengan baseline. Identifier draf dan identitas yang telah dikonfirmasi dipertahankan.
- `git diff --check` lulus. Suite aplikasi, browser, provider, staging dan production tidak dijalankan pada batch dokumentasi ini.
- Review independen fresh-context: Critical 0, Important 0, actionable Minor 0. Reviewer memeriksa diff/plan/authority/source dan 159 target file lokal (tanpa menghitung anchor), seluruhnya ada. Jumlah itu berbeda dari 164 link/anchor executor karena cakupan hitung berbeda.
- Pass akhir mengoreksi satu frasa tabel privacy yang masih menyebut kebutuhan wali tambahan agar sesuai scope 18+; tidak ada perubahan runtime. Pemeriksaan akhir link/status/scope dijalankan kembali setelah koreksi.
- Pemeriksaan akhir PASS: 164 link/anchor valid, 18 gate PUB terdefinisi dengan sel lengkap, 8 baris REL lengkap, 33 status formal tetap, identifier draf/identitas terjaga dan whitespace bersih. HEAD tetap baseline; index kosong; checkout utama bersih. Batch 1 selesai untuk scope dokumentasi.

## Batas review dan keputusan pelaksanaan

Empat penyesuaian workflow adalah pelaksanaan langsung setelah persetujuan jelas, gate dokumentasi tanpa code TDD/install/suite aplikasi, penyimpanan lokal tanpa commit/push/cleanup, dan review diff uncommitted termasuk plan baru. Konsekuensinya: Owner meninjau hasil lokal sebelum integrasi, worktree harus dipertahankan, dan aplikasi/provider tidak mendapat bukti pengujian baru dari batch ini.

Reviewer tidak menilai ulang keabsahan hukum/API sumber eksternal historis atau kesiapan provider/hosted. Keputusan pelaksanaan: pertahankan konteks tanggal dan status UNVERIFIED; publikasi resmi masih membutuhkan review sumber/kepatuhan serta bukti lingkungan yang relevan. Tidak mengubah keputusan yang sudah diberikan atau menganggap penilaian dokumen sebagai penerimaan production.
