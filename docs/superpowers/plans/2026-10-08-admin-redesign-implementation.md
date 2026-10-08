# Niuva Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for native execution after explicit implementation authorization. `superpowers:subagent-driven-development` is available only if the user explicitly chooses delegation. Steps use checkbox syntax. This request authorizes planning documents, not application implementation.

**Goal:** Menerapkan seluruh redesign Admin dan modul tambahan sesuai proposal Owner, dengan data dan izin yang benar serta UI yang konsisten.

**Architecture:** Pertahankan Next App Router, AdminShell, domain services, repositories, dan audit existing. Tambahkan modul Customers, Site Information, Finance, notification read state, dan tarif versi baru; route/Server Action hanya menjadi boundary. Pembayaran B2B manual berdiri pada penagihan proyek, sementara pembayaran commerce tetap memakai otoritas PaymentAttempt existing.

**Tech Stack:** Next 16.3.6, React 19.2.8, TypeScript strict, Prisma 7.10.0/PostgreSQL, Zod 4, decimal.js, Tailwind 4, Base UI, lucide-react, Vitest, Playwright. PDFKit merupakan dependency tambahan yang diajukan pada bagian Finance.

**Spec:** [Kesepakatan fitur dan UX](../specs/2026-10-08-admin-redesign-design.md).

## Global Constraints

- Bahasa UI operasional Indonesia; pertahankan istilah layanan/brand yang disetujui. Jangan mengarang angka bisnis atau identitas/rekening.
- `DESIGN.md` aktif; Space Grotesk, logo resmi, semantic tokens, kontrol minimum 44px, control radius 8px, card radius 12px, reduced motion.
- TypeScript strict; tidak memakai `any`; input server tervalidasi Zod; monetary arithmetic Decimal, IDR integer, bukan floating-point JavaScript.
- `requireAdmin()`/izin domain di setiap read/mutation/download; MFA dan active AdminProfile tetap wajib. Owner/Admin boleh koreksi pencatatan keuangan sesuai keputusan terbaru.
- DEVELOP/MAKE/BUY terpisah. Tidak mengubah checkout menjadi guest, menjadikan geometri harga final, mempercepat ongkir Custom Print, atau melemahkan payment/fulfillment hold.
- Migration baru aditif; tidak mengedit migration existing, reset data, atau menghapus perubahan lokal. Commit/push/deploy/provider activation/subagents memerlukan instruksi eksplisit masing-masing.
- Baca dokumentasi Next terpasang yang relevan sebelum kode. Perubahan hasil planning ini hanya lima file Markdown baru yang ditautkan di sini.
- Penerimaan proposal/desain tidak sama dengan visual acceptance aplikasi, physical-device/AT, provider, staging, atau production readiness.

## Baseline dan temuan yang memengaruhi urutan

Inspeksi 8 Oktober 2026: branch `main`, HEAD `4c60f69`; terdapat perubahan lokal implementasi Admin sebelumnya. Rencana mengikuti working tree aktual, bukan hanya HEAD. File duplikat bernama ` (1)` tetap di luar pekerjaan ini.

| Area | Fondasi saat ini | Perubahan yang diperlukan |
|---|---|---|
| Shell/account/access | sudah ada pencarian, menu akun, timeline, undangan/nonaktifkan Admin | navigasi baru, notifikasi persisten per akun, target detail, UI seluruh route |
| Operasional | daftar/detail/workspace, pagination/returnTo, sinyal antrean | pertahankan domain; hilangkan UI antrean; gunakan sinyal untuk kartu/daftar |
| Customers | Customer + customerId di record bisnis | direktori/detail read-only dan riwayat yang sah |
| Konten | Portfolio; profil publik konstanta | formulir Informasi Situs + reader publik dengan fallback approved |
| Keuangan | PaymentAttempt/PaymentEvent terkait Order; B2B hanya proposal | invoice, penagihan B2B, transfer manual, pengeluaran, koreksi, PDF |
| Tarif | parser mengunci nilai/code/version v1 | versi tarif baru dan kompatibilitas snapshot lama |
| Laporan | agregat operasional/trafik range `30d|13m` | halaman tersendiri, agregat finansial, Overview bento final |

Temuan source utama: `src/modules/admin/activity-timeline.ts` hanya memilih tautan domain; `prisma/schema.prisma` belum memiliki model invoice/pengeluaran/notifikasi; `src/modules/pricing/policy.ts` memakai `z.literal` untuk tarif v1; `src/modules/inquiry/b2b-quote.ts` mencatat keputusan proposal tanpa pembayaran. Addenda lama yang mempertahankan Queue atau menunda Finance akan diberi addendum pengganti saat implementasi, mengikuti persetujuan Owner terbaru.

## Paket pekerjaan dan dependensi

| Paket | Plan | Hasil yang dapat diuji |
|---|---|---|
| A | [Core, Customers, Konten](2026-10-08-admin-redesign-core.md) | shell/navigasi, semua route lama, notifikasi, direktori customer, informasi situs |
| B | [Keuangan](2026-10-08-admin-redesign-finance.md) | invoice seluruh layanan, transfer B2B, pengeluaran, koreksi, PDF |
| C | [Tarif, Laporan, Overview, verifikasi](2026-10-08-admin-redesign-rates-reports.md) | tarif berversi, laporan terpusat, bento final, bukti seluruh alur |

Urutan eksekusi: **P0 → A1 → A2 → A3 → A4 → A5 → A6 → B1–B5 → C1–C4**. C1 tarif dapat dimulai setelah A1; C2 laporan/C3 Overview memerlukan kontrak read Finance B5. Pengeditan schema dan migrasi diserialkan, termasuk bila kelak delegasi diizinkan. Setiap paket menghasilkan software yang dapat dites; seluruh cakupan tetap harus diselesaikan.

Tidak mengekspos menu baru yang menuju halaman placeholder. Selama implementasi internal, aktifkan link saat route/read model terkait sudah tersedia; acceptance akhir mengharuskan seluruh menu tujuan aktif.

## Review Focus

1. Admin biasa membuka URL/POST Owner-only secara langsung: akses tetap ditolak (A1, C1).
2. Dibaca/dismissed bukan selesai; login, polling, dua tab, dan timestamp sama tidak memutar ulang/menghilangkan riwayat (A2–A3).
3. Dua operator mengonfirmasi transfer/koreksi atau menerbitkan invoice bersamaan: tidak menggandakan uang, nomor, atau sisa tagihan (B1–B3).
4. Tarif berubah ketika quote lama sedang dibuka/diaccept: snapshot lama tetap benar, revalidation review/expiry tetap berjalan (C1).
5. Customer menutup akun saat invoice/riwayat dibaca atau dibuat: lifecycle fence dan accountClosedAt mencegah kebocoran/relink (A5, B1–B2).

## P0 — Baseline, authority, dan kesiapan eksekusi

**Files:** inspect `AGENTS.md`, `DESIGN.md`, `docs/PRD-Niuva-MVP.md`, `docs/TechDesign-Niuva-MVP.md`, `package.json`, relevant installed Next docs; modify the three owning design/product/technical documents with a dated addendum when code execution is authorized.

**Interfaces:** consumes S01–S20; produces the permission/route/data contracts shared by A/B/C and a recorded dirty-file baseline.

- [ ] Catat `git status --short --branch`, HEAD, file perubahan lokal dan batas kerja. Integrasikan perubahan existing; jangan reset checkout, memindahkan file, membersihkan duplikat, atau membuka worktree baru tanpa kebutuhan yang disetujui.
- [ ] Baca root/applicable AGENTS dan installed Next guides untuk Server Actions, route handlers, server/client boundaries, useSearchParams, redirect/caching. `using-git-worktrees` hanya dipakai jika metode/isolasi eksekusi benar-benar memerlukan worktree; perubahan lokal tidak otomatis ikut worktree baru.
- [ ] Tambahkan PRD/TechDesign/DESIGN addendum yang merujuk spec ini: Queue removal, Finance/Customers/Konten, izin kedua peran termasuk koreksi, notifikasi per akun, tarif berversi, pola detail. Jangan mengubah auth/retention/provider policy lain yang tidak diputuskan.
- [ ] Jalankan baseline `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm db:validate`, dan tes domain yang segera disentuh; catat kegagalan baseline terpisah dari regresi. Jangan menggunakan hitungan tes historis sebagai hasil run baru.
- `corepack pnpm test:integration` memakai wrapper database test dan menjalankan seluruh suite; wrapper saat ini tidak meneruskan argumen filter file. Nama file test dalam paket menunjukkan kasus yang harus tercakup, bukan argumen tambahan untuk wrapper.
- [ ] Tetapkan execution method setelah review plan. Tahapan pekerjaan adalah urutan internal, bukan rangkaian permintaan izin baru. Commit/push tetap menunggu permintaan tersendiri.

## Skema perubahan data

| Migration baru, nama logis | Pemilik | Isi |
|---|---|---|
| `admin_notification_receipts` | A2 | state awal per akun, read/toast receipts, indeks AuditLog timeline |
| `site_information` | A6 | profil situs singleton berversi dan history |
| `admin_finance` | B1 | billing cases, invoice/version/sequence, transfer manual/reversal, pengeluaran/reversal, instruksi transfer, purpose/uploader file finansial dan relasi bukti |
| `custom_print_rate_versions` | C1 | constraint satu ACTIVE per code bila belum terjamin; dukungan versi definisi baru |

File dibuat di `prisma/migrations/<timestamp>_<nama_logis>/migration.sql` dengan timestamp aktual lebih baru dari migration terakhir saat eksekusi. Generate/review SQL sebelum apply development; apply hanya pada database development/test terisolasi yang sudah diverifikasi. Tidak menjalankan `db:deploy` atau backfill data nyata sebagai bagian plan ini. Bukti attachment dipisahkan dari lifecycle CAD; tidak menetapkan retensi legal melalui migration.

## Dependency tambahan yang diajukan

**PDFKit `0.20.2`**, server-only, untuk unduh invoice PDF langsung; type definitions `@types/pdfkit` hanya jika diperlukan dan dipin kompatibel. Tidak menambahkan chart library, table library, CMS, websocket service, atau SaaS baru. Versi/API/security/type compatibility diperiksa kembali saat eksekusi sebelum install; library diisolasi di adapter PDF dan tidak masuk bundle client.

Purpose: satu tombol unduh dokumen invoice yang dapat dipaginasi. Maintenance: satu adapter + smoke test build/download, review perubahan dependensi transitif saat update. Security: template tetap, DTO tervalidasi, batas panjang/jumlah item, asset/font lokal berlisensi, tanpa remote URL/file path dari input pengguna. Biaya: tidak menambah layanan berlangganan; waktu komputasi PDF tetap memakai hosting aplikasi. Referensi primer: [Node stream output](https://pdfkit.org/docs/getting_started.html), [font embedding](https://pdfkit.org/docs/text.html), [release v0.20.2](https://github.com/foliojs/pdfkit/releases/tag/v0.20.2), [MIT license](https://github.com/foliojs/pdfkit/blob/v0.20.2/LICENSE).

## Acceptance akhir

- [ ] Semua route existing dalam A4 dan semua menu baru di spec berfungsi; tidak ada menu Queue/Pricing Rules utama/Discounts, placeholder, atau link buntu.
- [ ] Owner dan Admin memiliki Overview sama, dengan permission server yang benar; undang/nonaktifkan Admin, tarif, privacy, terms B2B tetap Owner-only.
- [ ] Notifikasi per akun, popup attention-only, direct target, unread independen dari pekerjaan, history/login/polling benar.
- [ ] Invoice ready-made, produksi/ongkir Custom Print, dan B2B mengambil sumber sah. B2B satu invoice, dua jadwal, transfer manual; kedua peran dapat koreksi/pembatalan dengan jejak alasan.
- [ ] Customers/privacy tidak menghubungkan riwayat lewat email atau mengembalikan akses record tertutup.
- [ ] Tarif baru atomik; quote terbit lama tidak direprice; seluruh gate MAKE/payment/shipping existing tetap berjalan.
- [ ] Laporan dan Overview konsisten: kalender Jakarta, `30d|13m`, pembayaran terkonfirmasi dan pengeluaran valid, tidak ada laba/unique visitor/revenue fiktif; kegagalan sumber terisolasi.
- [ ] Lint/typecheck/schema/unit/backend/integration/E2E/build lulus; desktop/mobile, keyboard, focus, reduced motion dan seluruh route diverifikasi dengan actor sintetis.
- [ ] Laporan hasil mencantumkan file, commands, coverage acceptance, screenshot aktual tanpa rahasia, keterbatasan, dan status visual acceptance. Tidak menyebut produksi siap hanya karena gate lokal lulus.

## Rollback dan penggunaan nyata

Gunakan schema aditif agar UI/core lama tetap dapat membaca data existing. Rollback kode tidak berarti membuang invoice/transfer/pengeluaran atau migration baru. Penonaktifan sementara fitur baru dilakukan lewat routing/read boundary yang eksplisit; audit/history tetap disimpan. Saat rollback tarif, Owner mengaktifkan versi yang sesuai melalui operasi terlacak, tanpa menulis ulang quote.

Nilai rekening/identitas penerbit asli diisi Owner di UI sebelum penerbitan nyata. Pajak dan retensi finansial/bukti tetap keputusan penggunaan nyata; development menggunakan fixture sintetis. Tidak mengaktifkan pengiriman email invoice, provider/produksi, penjadwalan baru, atau perubahan Customer signup secara otomatis.

## Self-review planning

| Kesepakatan | Tugas pemilik |
|---|---|
| S01–S03: bento, perhatian, ringkasan | C2–C3 |
| S04: penghapusan UI Action Queue | A1, C3 |
| S05–S07: navbar, akun, panel dan pop-up | A1–A3 |
| S08–S09: detail lengkap dan workspace | A4 |
| S10: Customers | A5, B1, B5 |
| S11: Konten | A4, A6 |
| S12–S16: Keuangan, DP, transfer, koreksi kedua peran | B1–B5 |
| S17: Laporan | C2 |
| S18: tarif Owner berversi | C1 |
| S19: Admin & Akses dan Privasi Customer | A1, A4 |
| S20: batas fitur | P0, C4 |

- Cakupan S01–S20 dipetakan ke A1–A6, B1–B5, C1–C4; file existing diperiksa dari working tree.
- Kontrak interface dibagi eksplisit; nama `AdminReadPage`, `FinanceReadService.summary`, `ReportRange`, `loadAdminOverview`, dan `TariffService.apply` dipakai konsisten.
- Lima failure modes pada Review Focus memiliki tes pemilik.
- Koreksi Finance oleh kedua peran dan satu invoice B2B/two-stage sudah dikonfirmasi saat planning.
- Plan ini berakhir pada review dokumen. Implementasi menunggu instruksi pengguna setelah plan tersedia untuk ditinjau.
