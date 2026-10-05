# Requirements Document

## Introduction

Dokumen ini menetapkan requirements untuk **program remediasi bertahap** atas hasil audit menyeluruh repository NIUVA. Keluaran program adalah rencana implementasi bertahap beserta pelaksanaannya, diprioritaskan berdasarkan **dependency antar temuan → severity → risiko regression → production readiness**.

Dokumen ini **tidak** mengubah code. Pada fase requirements ini tidak ada implementasi, tidak ada perubahan konfigurasi, dan tidak ada tindakan deployment. Requirements di bawah dirancang supaya setiap tahap dapat dikunci sebagai acceptance criteria yang dapat diverifikasi, lalu diturunkan menjadi task kecil yang aman dikerjakan satu per satu.

**Authority.** Paket kesiapan Owner 3 Oktober 2026 adalah authority produk/teknis terkini dan **mengoverride rekomendasi audit bila berbeda**: `docs/PRD-Niuva-MVP.md` (addendum persiapan Customer publik), `docs/TechDesign-Niuva-MVP.md` (addendum kontrak kesiapan Customer publik), `docs/legal/customer-public-launch-readiness.md`, `docs/legal/customer-public-runtime-contract.md`, `docs/legal/customer-service-refund-sop.md`, `docs/legal/customer-privacy-retention-sop.md`, `docs/legal/customer-public-policy-validation.md`, `docs/legal/customer-public-input-evidence.md`. `AGENTS.md` mengatur batas workflow, keamanan, dan approval.

**Baseline terverifikasi pada sesi audit.** `lint` PASS (0 error, 148 warning; 146 di antaranya dari `.agents/skills/impeccable/`), `typecheck` PASS, `test` PASS (55 file / 612 test), `test:backend` PASS (38 file / 190 test), `build` PASS (49 route, hanya `/services` statis). `test:integration` **belum dijalankan** (PostgreSQL test lokal mati), `test:e2e` **belum dijalankan** (butuh dev server). Shim `node_modules/.bin` tidak lengkap; ini kondisi lingkungan, bukan temuan repo.

**Ruang lingkup jujur.** Program ini multi-tahap. Tahap akhir — publikasi policy resmi, pembuktian staging, dan aktivasi production — berada **di luar kendali code** dan menunggu keputusan Owner serta instruksi terpisah. `PUB-RELEASE` tetap `NOT_AUTHORIZED`.

## Glossary

- **Program_Remediasi**: proses bertahap yang direncanakan dan dilaksanakan oleh dokumen spec ini, termasuk penyusunan tahap, dependency, dan gate.
- **Rencana_Tahap**: artefak rencana per tahap yang memuat masalah, file/module terdampak, urutan implementasi, dependency, risiko, gate verifikasi, dan acceptance criteria.
- **Register_Dependency**: representasi tertulis hubungan "temuan X mendahului temuan Y" beserta alasannya.
- **Register_Keputusan**: daftar open question yang membutuhkan keputusan Owner/legal, dengan pemilik dan syarat penutupan.
- **Approval_Gate**: titik di mana pekerjaan berhenti sampai user memberi persetujuan eksplisit (mis. penambahan dependency, penghapusan file, perubahan `.env.example`).
- **Gate_Verifikasi**: himpunan command yang harus lulus untuk sebuah tahap, dipilih dari `lint`, `typecheck`, `test`, `test:backend`, `test:integration`, `test:e2e`, `build`, `db:validate`.
- **Baseline_Gate**: hasil Gate_Verifikasi yang tercatat **sebelum** perubahan berisiko, termasuk `test:integration` dan `test:e2e` yang belum pernah dijalankan.
- **Temuan audit**: masalah berkode dari audit (`A1`, `A2`, `B1`…`B9`, `C1`…`C6`, `D1`…`D6`, `E1`…`E3`, `F1`…`F5`, `G2`…`G4`, `H1`…`H5`, `I1`…`I6`, `J1`, `J2`, `J7`, `J9`, `K1`…`K4`, `L1`, `L2`). ID bersifat stabil dan dirujuk apa adanya.
- **Deployment tier**: klasifikasi lingkungan eksplisit `local/test | staging | production`, terpisah dari `NODE_ENV`.
- **Provider mode**: mode integrasi eksternal `mock | sandbox | live`, terpisah dari deployment tier dan dari `NODE_ENV`.
- **Capability_Matrix**: pemetaan kemampuan (signup, Google/password, email delivery, privacy/proof, R2, payment/refund/shipping, analytics, job) terhadap deployment tier dan provider mode, dengan default gagal tertutup.
- **Capability_Resolver**: komponen server yang memutuskan apakah sebuah capability aktif berdasarkan Capability_Matrix, resource binding, dan izin aktivasi.
- **Fail-closed**: perilaku default menolak kemampuan ketika konfigurasi, resource binding, policy, atau izin belum lengkap.
- **Email_Outbox**: penyimpanan pesan durable dengan state, attempts/lease, due/expiry, provider reference, dan kategori failure. Queue bukan delivery accepted; accepted bukan inbox received.
- **refund_key**: kunci idempotensi provider yang **sama** untuk operasi/parameter refund yang sama pada semua retry.
- **Idempotency scope**: cakupan unik di mana sebuah submission key menjamin satu efek (mis. satu kasus refund per order+payment+revision).
- **Lifecycle serialization**: serialisasi operasi siklus hidup akun Customer pada auth/signup/reset/callback/claim, write bisnis, dan closure.
- **Closed-business marker**: penanda bisnis tertutup yang mencegah akun baru mengambil riwayat akun lama.
- **PUB-\* gate**: gate kesiapan Customer publik dari `docs/legal/customer-public-launch-readiness.md` (`PUB-BIZ`, `PUB-AGE`, `PUB-GUARDIAN`, `PUB-POLICY`, `PUB-DATA`, `PUB-PROVIDER`, `PUB-RECORDS`, `PUB-BACKUP`, `PUB-SERVICE`, `PUB-REFUND`, `PUB-REFUND-PROVIDER`, `PUB-REFUND-RECON`, `PUB-HOSTED`, `PUB-EMAIL`, `PUB-JOBS`, `PUB-INCIDENT`, `PUB-STAGING`, `PUB-RELEASE`).
- **Invariant_No_Regression**: area yang sudah kuat dan wajib tetap lulus setelah setiap tahap.
- **Progressive enhancement**: funnel publik yang berfungsi tanpa JavaScript melalui Server Action/native POST, lalu diperkaya saat hydrated.
- **Aplikasi_Niuva**: aplikasi Next.js pada repository ini.
- **Hari kerja**: Senin–Jumat non-libur menurut kalender WIB yang disahkan Owner.

---

## Requirements

**Tahap 0 — Fondasi rencana, baseline, dan gate**

### Requirement 1: Rencana remediasi bertahap per tahap

**User Story:** Sebagai Owner, saya ingin satu rencana remediasi bertahap yang lengkap per tahap, sehingga saya dapat menyetujui dan mengawasi pekerjaan tanpa membaca seluruh audit.

*Temuan tercakup:* seluruh ID audit. *Dependency:* mendahului semua tahap lain.

#### Acceptance Criteria

1. THE Rencana_Tahap SHALL memuat untuk setiap tahap: daftar ID temuan yang ditangani, file/module terdampak, urutan implementasi, dependency antar temuan, risiko, Gate_Verifikasi, dan acceptance criteria.
2. THE Rencana_Tahap SHALL memetakan setiap ID temuan audit ke tepat satu tahap pelaksana.
3. THE Rencana_Tahap SHALL mengurutkan tahap menurut prioritas dependency, severity, risiko regression, dan production readiness, dengan alasan urutan tercatat per tahap.
4. THE Rencana_Tahap SHALL memecah setiap tahap menjadi task yang masing-masing menyentuh satu kepedulian dan dapat diselesaikan serta diverifikasi secara mandiri.
5. WHERE sebuah temuan audit bertentangan dengan authority 3 Oktober 2026, THE Rencana_Tahap SHALL mencatat keputusan authority sebagai arah yang berlaku beserta rujukan dokumennya.
6. IF sebuah ID temuan tidak dapat ditempatkan pada tahap mana pun, THEN THE Rencana_Tahap SHALL mencatat ID tersebut sebagai `DITUNDA` beserta alasan dan syarat pengaktifannya.

### Requirement 2: Register dependency antar temuan audit

**User Story:** Sebagai engineer, saya ingin dependency antar temuan tercatat eksplisit, sehingga saya tidak mengerjakan perbaikan yang tidak dapat diverifikasi.

*Temuan tercakup:* B5→B2/B3, I1→C1, F1→A2, `PUB-AGE`/`PUB-GUARDIAN`→signup publik, A1→provider/email/refund, D2/D3/D4 satu jalur job, H3→H2-revised. *Dependency:* mendahului Tahap 1 dan seterusnya.

#### Acceptance Criteria

1. THE Register_Dependency SHALL mencatat setiap hubungan prasyarat sebagai pasangan terarah dengan alasan verifikasi atau alasan risiko.
2. THE Register_Dependency SHALL mencatat B5 sebagai prasyarat B2 dan B3, dengan alasan perubahan rate limit tidak dapat diverifikasi tanpa observability.
3. THE Register_Dependency SHALL mencatat I1 sebagai prasyarat C1, dengan alasan celah test harus terukur sebelum jalur data produksi diubah.
4. THE Register_Dependency SHALL mencatat F1 sebagai prasyarat A2, dengan alasan registrasi publik membutuhkan dokumen legal yang dapat diakses publik.
5. THE Register_Dependency SHALL mencatat `PUB-AGE` dan `PUB-GUARDIAN` sebagai prasyarat pembukaan pendaftaran publik.
6. THE Register_Dependency SHALL mencatat A1 sebagai prasyarat aktivasi provider, email delivery, dan refund.
7. THE Register_Dependency SHALL mencatat D2, D3, dan D4 sebagai pengguna satu jalur job terjadwal bersama.
8. THE Register_Dependency SHALL mencatat H3 sebagai prasyarat yang meringankan H2-revised, dengan alasan Server Action menghapus kebutuhan Zod pada client.
9. WHEN sebuah task dijadwalkan, THE Program_Remediasi SHALL memverifikasi bahwa seluruh prasyarat task tersebut telah ditutup.
10. IF sebuah prasyarat belum ditutup, THEN THE Program_Remediasi SHALL menahan task dependen dan mencatat alasan penahanan.

### Requirement 3: Baseline verifikasi penuh sebelum perubahan berisiko

**User Story:** Sebagai engineer, saya ingin baseline verifikasi penuh tercatat sebelum perubahan berisiko, sehingga setiap kegagalan setelahnya dapat diatribusikan.

*Temuan tercakup:* gap baseline `test:integration` dan `test:e2e`; terkait I5. *Dependency:* mendahului Tahap 1 dan seterusnya.

#### Acceptance Criteria

1. THE Baseline_Gate SHALL mencatat hasil `lint`, `typecheck`, `test`, `test:backend`, `build`, dan `db:validate` beserta jumlah file/test dan jumlah warning.
2. WHEN PostgreSQL test lokal berjalan, THE Baseline_Gate SHALL mencatat hasil `test:integration` lengkap dengan daftar test yang gagal.
3. WHEN dev server tersedia, THE Baseline_Gate SHALL mencatat hasil `test:e2e` lengkap dengan daftar spec yang gagal.
4. IF `test:integration` atau `test:e2e` tidak dapat dijalankan, THEN THE Baseline_Gate SHALL mencatat status `TIDAK_DIJALANKAN` beserta penyebab lingkungan dan syarat untuk menjalankannya.
5. WHILE `test:integration` dan `test:e2e` berstatus `TIDAK_DIJALANKAN`, THE Program_Remediasi SHALL membatasi pekerjaan pada task yang terverifikasi oleh gate yang sudah berjalan.
6. THE Baseline_Gate SHALL mencatat 146 warning `.agents/skills/impeccable/` sebagai noise tooling, terpisah dari 2 warning product code di `src/modules/shipping/retail-rate-service.ts:145` dan `tests/unit/properties/p06-token-not-found.test.tsx:87`.
7. THE Baseline_Gate SHALL mencatat ketidaklengkapan shim `node_modules/.bin` sebagai kondisi lingkungan, bukan temuan repository.

### Requirement 4: Approval gate untuk tindakan berisiko

**User Story:** Sebagai Owner, saya ingin tindakan yang membutuhkan izin saya berhenti di gate, sehingga tidak ada perubahan berisiko yang diasumsikan disetujui.

*Temuan tercakup:* I1, K4, I4, F4, J1, J2, D1, K1/`.env.example`, C6. *Dependency:* berlaku lintas tahap.

#### Acceptance Criteria

1. WHEN sebuah task membutuhkan penambahan dependency, THE Approval_Gate SHALL meminta persetujuan user dengan menyebut nama paket, tujuan, dampak maintenance, dampak keamanan, dan biaya bulanan bila relevan.
2. THE Approval_Gate SHALL menandai `@vitest/coverage-v8` (I1), formatter (K4), dan `@axe-core/playwright` (I4) sebagai penambahan dependency yang membutuhkan persetujuan user.
3. WHEN sebuah task membutuhkan penghapusan file atau direktori, THE Approval_Gate SHALL meminta persetujuan user tertulis untuk path tersebut.
4. THE Approval_Gate SHALL menandai penghapusan direktori AUiS kosong `src/app/auis/`, `src/app/api/auis/`, `src/lib/auis/` (F4) dan dead code `src/components/niuva/option-chip.tsx` (J1) serta `src/components/niuva/action-queue-item.tsx` (J2) sebagai penghapusan yang membutuhkan persetujuan user.
5. WHEN sebuah task membutuhkan perubahan `.env.example`, THE Approval_Gate SHALL meminta persetujuan user sebelum perubahan dilakukan.
6. THE Approval_Gate SHALL menandai keputusan menghapus versus membangun model `Service` (D1) sebagai keputusan yang membutuhkan persetujuan user sebelum task terkait dijalankan.
7. THE Program_Remediasi SHALL memperlakukan migrasi yang sudah ada di `prisma/migrations/` sebagai tidak dapat diubah, termasuk penamaan `20260927_customer_preview_snapshot` dan `20260927_stock_movement_ledger` (C6).
8. THE Program_Remediasi SHALL mengecualikan commit, push, deployment, aktivasi provider, dan penggunaan credential production dari seluruh tahap, sampai ada instruksi terpisah untuk masing-masing tindakan.
9. WHERE sebuah task membutuhkan perubahan schema database, THE Program_Remediasi SHALL membatasi perubahan pada migrasi baru yang non-destruktif.

### Requirement 5: Perlindungan invariant tanpa regression

**User Story:** Sebagai Owner, saya ingin area yang sudah kuat dilindungi sebagai invariant, sehingga remediasi tidak menukar satu masalah dengan masalah baru.

*Temuan tercakup:* perlindungan regression lintas tahap. *Dependency:* berlaku pada setiap tahap.

#### Acceptance Criteria

1. THE Invariant_No_Regression SHALL mencakup system pages dan error states: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/admin/error.tsx`, `src/app/admin/not-found.tsx`, empat `not-found.tsx` ber-scope, `AdminAccessView`, `AdminDataUnavailableView`, loader tri-state `loadAdminRecord`, HTML 503 proxy, dan copy terpusat `system-state-copy.ts`.
2. THE Invariant_No_Regression SHALL mencakup property test anti-leak di `tests/unit/properties/`.
3. THE Invariant_No_Regression SHALL mencakup revalidasi server checkout: harga dibaca dari `src/modules/checkout/repository.ts`, `optionId` ongkir dicocokkan ulang di server, dan trigger immutability snapshot komersial tetap berlaku.
4. THE Invariant_No_Regression SHALL mencakup webhook Midtrans: verifikasi signature `timingSafeEqual`, dedup `eventFingerprint`, dan pemeriksaan selisih nominal.
5. THE Invariant_No_Regression SHALL mencakup token akses route-bound ter-hash, allowlist tertutup `safeCustomerReturnTo`, PKCE dengan state ber-timestamp, dan `CustomerClosureFence`.
6. THE Invariant_No_Regression SHALL mencakup matriks permission OWNER/ADMIN eksplisit di `src/modules/admin/permissions.ts` beserta pemeriksaan `isActive`.
7. THE Invariant_No_Regression SHALL mencakup lifecycle serialization, closed-business marker, pemisahan Customer dari Clerk, allowlist internal testing dengan dokumen pengujian 30 hari, retensi internal, dan safe export.
8. WHEN sebuah task selesai, THE Gate_Verifikasi SHALL menjalankan test yang meliputi seluruh Invariant_No_Regression yang relevan dengan file yang diubah.
9. IF sebuah perubahan menurunkan salah satu Invariant_No_Regression, THEN THE Program_Remediasi SHALL mengembalikan perubahan tersebut dan mencatat penyebabnya sebelum melanjutkan.
10. THE Program_Remediasi SHALL memperlakukan keberhasilan `build` sebagai bukti kompilasi dan bukan sebagai penerimaan visual atau kesiapan production.

### Requirement 6: Pengukuran coverage sebelum perubahan jalur data

**User Story:** Sebagai engineer, saya ingin pengukuran coverage tersedia lebih dulu, sehingga celah test terukur sebelum jalur data produksi disentuh.

*Temuan tercakup:* I1 (prasyarat C1 dan I2). *Dependency:* membutuhkan Requirement 4; mendahului Requirement 13.

#### Acceptance Criteria

1. WHERE persetujuan penambahan dependency coverage telah diberikan, THE Gate_Verifikasi SHALL melaporkan coverage untuk `vitest.config.mts`, `vitest.backend.config.mts`, dan `vitest.integration.config.mts`.
2. THE Gate_Verifikasi SHALL mencatat angka coverage awal sebagai baseline sebelum threshold apa pun diberlakukan.
3. WHEN baseline coverage tercatat, THE Program_Remediasi SHALL mengusulkan threshold yang sama dengan atau di bawah baseline untuk mencegah penurunan.
4. IF persetujuan dependency coverage belum diberikan, THEN THE Program_Remediasi SHALL mencatat celah test C1 dan I2 secara manual per file dan menahan threshold otomatis.
5. THE Gate_Verifikasi SHALL mengecualikan `src/generated/**` dari pengukuran coverage.

### Requirement 7: Visibilitas warning lint product code

**User Story:** Sebagai engineer, saya ingin warning lint product code terlihat, sehingga sinyal kualitas tidak tertimbun noise tooling.

*Temuan tercakup:* K3-revised, K4, C4, dan 2 warning product code. *Dependency:* mendahului tahap yang mengandalkan `lint` sebagai gate bermakna.

#### Acceptance Criteria

1. WHEN `lint` dijalankan setelah konfigurasi ignore diperbarui, THE Gate_Verifikasi SHALL melaporkan warning hanya dari product code dan test repository.
2. THE Aplikasi_Niuva SHALL menyelesaikan warning `_providerPayload` di `src/modules/shipping/retail-rate-service.ts:145` dan `liveMocks` di `tests/unit/properties/p06-token-not-found.test.tsx:87`.
3. THE Program_Remediasi SHALL mempertahankan `src/generated/**` sebagai path yang tidak menghasilkan warning, tanpa menambahkan ignore baru untuk path tersebut.
4. WHERE persetujuan penambahan formatter telah diberikan, THE Program_Remediasi SHALL memformat ulang file terkompresi yang disebut C4 pada commit terpisah dari perubahan perilaku.
5. IF persetujuan formatter belum diberikan, THEN THE Program_Remediasi SHALL membatasi perbaikan keterbacaan pada file yang memang diubah oleh task lain.

---

**Tahap 1 — Observability dan kebenaran konfigurasi**

### Requirement 8: Observability kegagalan server dengan correlation id

**User Story:** Sebagai petugas layanan, saya ingin kegagalan server terekam dengan korelasi, sehingga keluhan pengguna dapat ditelusuri.

*Temuan tercakup:* B5, J9, G3. *Dependency:* prasyarat Requirement 10 dan 11.

#### Acceptance Criteria

1. WHEN sebuah error tidak dikenal mencapai `toAppError` di `src/modules/shared/errors.ts`, THE Observability_Layer SHALL mencatat jenis error, lokasi boundary, dan correlation id pada log server.
2. THE Observability_Layer SHALL mempersistensi correlation id yang dikirim ke client sehingga petugas dapat menemukan kembali kejadian terkait.
3. THE Observability_Layer SHALL mengeluarkan nilai rahasia, token, dan data pribadi dari isi log.
4. WHEN sebuah page admin menangkap kegagalan pemuatan data, THE Observability_Layer SHALL mencatat penyebab kegagalan sebelum view "belum dapat dimuat" dirender.
5. THE Aplikasi_Niuva SHALL membedakan kegagalan database, bug kode, dan timeout provider pada catatan log page admin yang saat ini memakai pola `try { ... } catch { return null }`.
6. IF SDK pemantauan error belum terpasang, THEN THE Program_Remediasi SHALL mencatat env Sentry `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` sebagai konfigurasi tanpa konsumen dan menahan janji pemantauan eksternal.
7. WHERE pemasangan SDK pemantauan membutuhkan dependency baru, THE Approval_Gate SHALL meminta persetujuan user sebelum pemasangan.

### Requirement 9: Validasi env runtime terpusat

**User Story:** Sebagai engineer, saya ingin seluruh env runtime tervalidasi di satu tempat, sehingga tidak ada kemampuan yang berubah secara senyap.

*Temuan tercakup:* K1, K2, A4. *Dependency:* prasyarat Requirement 12.

#### Acceptance Criteria

1. THE Aplikasi_Niuva SHALL memvalidasi `NIUVA_ANALYTICS_ENABLED`, `CRON_SECRET`, `NIUVA_CUSTOMER_AUTH_MOCK`, `NIUVA_NEXT_DIST_DIR`, dan `DEMO_DATABASE_URL` melalui schema env server.
2. THE Aplikasi_Niuva SHALL menyatukan atau merujuk secara eksplisit schema `NIUVA_INTERNAL_AUTH_ENABLED`, `NIUVA_INTERNAL_GOOGLE_EMAIL`, dan `NIUVA_INTERNAL_PASSWORD_EMAIL` dari `src/modules/customer-auth/internal-testing.ts` ke dalam satu sumber kebenaran env.
3. IF konfigurasi R2 tidak lengkap, THEN THE Aplikasi_Niuva SHALL menolak start atau melaporkan capability R2 tidak aktif, alih-alih menurunkan `connect-src` pada Content Security Policy secara senyap.
4. WHEN `getContentSecurityPolicy` menghitung `connect-src`, THE Aplikasi_Niuva SHALL mengambil keputusan dari Capability_Resolver dan bukan dari pemeriksaan env yang tersebar.
5. THE Aplikasi_Niuva SHALL menyediakan endpoint Midtrans sebagai konfigurasi yang dioper ke `createMidtransSnapGatewayFromEnvironment()`, menggantikan endpoint sandbox hardcoded di `src/modules/payment/midtrans.ts:11`.
6. THE Aplikasi_Niuva SHALL mengambil `allowedDevOrigins` di `next.config.ts` dari konfigurasi lingkungan, menggantikan IP LAN hardcoded `192.168.1.11`.
7. WHERE perubahan env membutuhkan pembaruan `.env.example`, THE Approval_Gate SHALL meminta persetujuan user sebelum file tersebut diubah.

### Requirement 10: Akurasi dokumen status repository

**User Story:** Sebagai agent dan engineer baru, saya ingin dokumen status repository akurat, sehingga saya tidak bekerja dari peta yang salah.

*Temuan tercakup:* L1, L2, I6. *Dependency:* dapat berjalan paralel dengan Requirement 8.

#### Acceptance Criteria

1. THE Program_Remediasi SHALL memperbarui `MEMORY.md` agar status "Core data model", "Auth", dan "Core MVP flow" mencerminkan implementasi aktual berupa 25+ model Prisma, 16 migrasi, dua sistem auth, dan funnel end-to-end.
2. THE Program_Remediasi SHALL mengganti bagian "Known Issues" `MEMORY.md` yang menyebut smoke test homepage baseline dengan temuan yang masih berlaku.
3. THE Program_Remediasi SHALL memisahkan evidence aktif dari evidence historis di `docs/frontend/mvp-release-readiness.md`.
4. WHEN catatan kegagalan replay integration di `docs/frontend/mvp-release-readiness.md:197-201` ditinjau, THE Program_Remediasi SHALL memverifikasi ulang terhadap `prisma/migrations/20260925120000_allow_public_token_rotation/migration.sql` dan mencatat hasil verifikasinya.
5. IF catatan tersebut terbukti usang, THEN THE Program_Remediasi SHALL menandainya sebagai historis beserta tanggal dan dasar verifikasi.
6. THE Program_Remediasi SHALL mencatat bahwa evidence public, catalog, authenticated-admin, dan quote bersifat local/loopback/non-production.

---

**Tahap 2 — Pengerasan boundary request**

### Requirement 11: Rate limit per pelaku pada endpoint publik

**User Story:** Sebagai pengunjung, saya ingin batas permintaan diterapkan per pelaku, sehingga satu pengguna lain tidak dapat memblokir akses saya.

*Temuan tercakup:* B2, B3, B7. *Dependency:* membutuhkan Requirement 8.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL menerima kunci per pelaku yang menggabungkan identitas atau alamat pemanggil dengan identitas endpoint, mengikuti pola `src/app/api/account/make/[id]/rough-shipping/route.ts`.
2. THE Aplikasi_Niuva SHALL menerapkan kunci per pelaku pada keempat belas endpoint publik yang saat ini memakai satu bucket origin melalui `src/lib/http/public-mutation.ts`.
3. WHEN kuota pelaku terlampaui, THE Aplikasi_Niuva SHALL menolak permintaan pelaku tersebut dan tetap melayani pelaku lain.
4. IF jumlah kunci yang dilacak mencapai batas kapasitas, THEN THE Rate_Limiter SHALL mengeluarkan kunci kedaluwarsa atau kunci terlama alih-alih menolak seluruh kunci baru.
5. THE Rate_Limiter SHALL mencatat keterbatasan state per-proses sebagai risiko tersurat untuk lingkungan multi-instance, beserta syarat penggantian store bersama.
6. WHERE penggantian store rate limit membutuhkan dependency atau resource hosted, THE Approval_Gate SHALL meminta persetujuan user sebelum pekerjaan dimulai.
7. WHEN batas kerja paralel hashing password di `src/modules/customer-auth/password.ts` tercapai, THE Aplikasi_Niuva SHALL mengembalikan kode kesibukan sumber daya yang berbeda dari penolakan percobaan berlebih.
8. THE Gate_Verifikasi SHALL menjalankan `test`, `test:backend`, dan `test:integration` untuk setiap perubahan rate limit.

### Requirement 12: Otorisasi ditegakkan di lapisan service

**User Story:** Sebagai Owner, saya ingin otorisasi ditegakkan di lapisan service, sehingga tidak ada permukaan yang terbuka karena page lupa memeriksa izin.

*Temuan tercakup:* B4, B6, C2, E3. *Dependency:* membutuhkan Requirement 9.

#### Acceptance Criteria

1. THE Aplikasi_Niuva SHALL mewajibkan Customer terautentikasi sebelum menerbitkan presigned upload pada `src/app/api/uploads/intents/route.ts`.
2. IF sebuah upload intent diminta tanpa Customer terautentikasi, THEN THE Aplikasi_Niuva SHALL menolak permintaan tersebut.
3. THE Aplikasi_Niuva SHALL memeriksa izin admin di dalam `ActionQueueService` dan `AdminOperationsService`, selaras dengan `OrderStatusService`, `QuoteService`, `CustomPrintService`, dan `ShippingService`.
4. THE Aplikasi_Niuva SHALL memeriksa otorisasi operasional pada `/demo/action-queue` melalui lapisan service, bukan hanya melalui `isLocalDemoMode()`.
5. THE Gate_Verifikasi SHALL menyertakan test yang membuktikan setiap Server Action menolak pemanggilan tanpa izin, termasuk ketika Server Action di-POST ke URL route di luar matcher `src/proxy.ts`.
6. THE Aplikasi_Niuva SHALL mempertahankan objek upload yatim sebagai tidak dapat dibuat, sehingga retention cleanup memiliki pemilik untuk setiap `StoredFile`.
7. THE Aplikasi_Niuva SHALL mengisi `StoredFile.sha256` saat verifikasi upload sehingga integritas berkas yang nanti diunduh operator dapat diperiksa.
8. THE Rencana_Tahap SHALL mencatat kebutuhan pemeriksaan konten berkas unduhan operator sebagai item terpisah dengan syarat persetujuan bila membutuhkan layanan eksternal.

---

**Tahap 3 — Deployment tier dan capability matrix**

### Requirement 13: Deployment tier dan capability matrix eksplisit

**User Story:** Sebagai Owner, saya ingin kemampuan sistem ditentukan oleh tier dan capability yang eksplisit, sehingga `NODE_ENV` tidak lagi menjadi izin maupun penghalang.

*Temuan tercakup:* A1, A4, B1, C1 (bagian pemilihan jalur data), `PUB-HOSTED`. *Dependency:* membutuhkan Requirement 9; prasyarat Requirement 15, 17, 18, 19, 20.

#### Acceptance Criteria

1. THE Aplikasi_Niuva SHALL menyediakan deployment tier eksplisit `local/test`, `staging`, dan `production` yang terpisah dari `NODE_ENV`.
2. THE Aplikasi_Niuva SHALL menyediakan provider mode `mock`, `sandbox`, dan `live` yang terpisah dari deployment tier dan dari `NODE_ENV`.
3. THE Capability_Matrix SHALL mencakup signup, Google, password, email sender, email delivery, privacy dan proof, R2, payment, refund, shipping, analytics, dan job untuk setiap deployment tier.
4. THE Capability_Resolver SHALL menolak sebuah capability ketika resource binding, konfigurasi, policy, atau izin aktivasi belum lengkap.
5. THE Capability_Resolver SHALL menolak provider mode `live` sampai ada izin aktivasi yang tercatat untuk tier tersebut.
6. WHEN deployment tier adalah `production` dan izin aktivasi belum ada, THE Capability_Resolver SHALL menolak capability terkait dengan alasan yang dapat dibaca operator.
7. THE Aplikasi_Niuva SHALL menggantikan pemeriksaan `assertNonProductionProvider` di `src/modules/payment/midtrans.ts`, `src/modules/payment/webhook-service.ts`, `src/modules/shipping/biteship.ts`, `src/modules/files/r2.ts`, `src/modules/notifications/resend.ts`, dan `src/modules/customer-auth/email-mailer.ts` dengan keputusan Capability_Resolver.
8. THE Aplikasi_Niuva SHALL memperlakukan keberhasilan `build` sebagai bukan izin capability.
9. THE Aplikasi_Niuva SHALL menolak nilai `Origin` kosong, nilai `Origin` hilang, dan forwarded host sebagai jalan pintas pemeriksaan origin.
10. THE Aplikasi_Niuva SHALL menyelaraskan `APP_URL`, trusted origin, atribut cookie, OAuth redirect, proof link, dan Content Security Policy terhadap deployment tier yang aktif.
11. THE Aplikasi_Niuva SHALL menghapus `'unsafe-inline'` dari `script-src` pada tier `production` atau mencatat mekanisme nonce/hash penggantinya beserta route yang terdampak.
12. THE Aplikasi_Niuva SHALL menerapkan proteksi Content Security Policy yang setara untuk `/checkout` dan `/account`, bukan hanya untuk matcher `/admin/*` dan `/api/admin/*`.
13. THE Gate_Verifikasi SHALL menjalankan `test`, `test:backend`, `test:integration`, dan `build` untuk setiap perubahan tier atau capability.
14. THE Program_Remediasi SHALL menetapkan nama env dan schema final untuk tier dan capability pada batch implementasi, bukan pada dokumen requirements ini.

### Requirement 14: Pendaftaran env per tier dan capability

**User Story:** Sebagai engineer, saya ingin konfigurasi dan dokumentasi menyebut nama env yang benar, sehingga operator tidak menebak.

*Temuan tercakup:* A1, K1, `PUB-HOSTED`. *Dependency:* membutuhkan Requirement 13.

#### Acceptance Criteria

1. THE Rencana_Tahap SHALL mendaftar setiap env yang dibutuhkan tier dan capability beserta tier tempat env tersebut wajib ada.
2. WHERE pendaftaran env membutuhkan perubahan `.env.example`, THE Approval_Gate SHALL meminta persetujuan user sebelum perubahan dilakukan.
3. THE Program_Remediasi SHALL menuliskan nilai contoh non-rahasia saja pada dokumentasi env.
4. THE Program_Remediasi SHALL mencatat bahwa isolasi resource staging dari production merupakan bukti lingkungan yang berada di luar jangkauan `build` dan CI.

---

**Tahap 4 — Jalur data publik yang benar-benar diuji**

### Requirement 15: Jalur data konten publik tunggal yang diuji

**User Story:** Sebagai pengunjung, saya ingin konten publik berasal dari satu jalur data yang diuji, sehingga halaman production menampilkan data yang sama dengan yang diverifikasi.

*Temuan tercakup:* C1, I2, D1. *Dependency:* membutuhkan Requirement 6 dan 13.

#### Acceptance Criteria

1. THE Public_Content_Serializer SHALL memilih sumber data konten publik berdasarkan capability yang eksplisit, bukan berdasarkan `NODE_ENV` seperti di `src/features/frontend-preview/server.ts:55-70`.
2. THE Gate_Verifikasi SHALL menyertakan test yang menjalankan `listPublishedPortfolioProjects` dan `findPublishedPortfolioProjectBySlug` dari `src/modules/portfolio/public-service.ts`.
3. THE Gate_Verifikasi SHALL menyertakan test yang menjalankan jalur produksi `/`, `/projects`, dan `/projects/[slug]` terhadap sumber data database.
4. WHERE referensi konten lokal tetap dibutuhkan untuk pemeriksaan visual tanpa database, THE Public_Content_Serializer SHALL menyediakannya melalui capability terpisah yang tidak mengubah jalur produksi.
5. THE Program_Remediasi SHALL mengganti nama atau mendokumentasikan ulang modul `frontend-preview` sehingga perannya sebagai serializer produksi terbaca dari namanya.
6. WHEN keputusan user atas model `Service` telah diberikan, THE Program_Remediasi SHALL melaksanakan tepat satu dari membangun jalur baca `Service` atau menghentikan model tersebut.
7. IF keputusan model `Service` belum diberikan, THEN THE Program_Remediasi SHALL mempertahankan `publicServices` di `src/features/public/company-content.ts` dan assertion `tests/integration/portfolio-public-content.test.ts:35` tanpa perubahan.
8. THE Gate_Verifikasi SHALL menjalankan `test:integration` dan `test:e2e` untuk setiap perubahan jalur data konten publik.

### Requirement 16: Strategi render dan discoverability halaman publik

**User Story:** Sebagai pengunjung, saya ingin halaman publik cepat dan dapat ditemukan, sehingga konten bernilai tidak tersembunyi.

*Temuan tercakup:* H1, F2, F3. *Dependency:* membutuhkan Requirement 15.

#### Acceptance Criteria

1. THE Aplikasi_Niuva SHALL menetapkan strategi render per page publik, memilih antara statis, revalidasi berjangka, atau dinamis, dengan alasan tercatat per route.
2. WHERE sebuah page publik memakai revalidasi berjangka, THE Aplikasi_Niuva SHALL memastikan `revalidatePath("/shop")` dan `revalidatePath("/")` di `src/app/admin/actions.ts` berpengaruh pada cache page tersebut.
3. THE Aplikasi_Niuva SHALL menyediakan `src/app/sitemap.ts` dan `src/app/robots.ts`.
4. THE Aplikasi_Niuva SHALL menetapkan `metadataBase` pada `src/app/layout.tsx` dan metadata `openGraph` serta `twitter` untuk page publik utama.
5. THE Aplikasi_Niuva SHALL menyertakan `/project-brief` pada navigasi publik utama di `src/components/niuva/public-navigation.tsx`.
6. THE Aplikasi_Niuva SHALL menampilkan indikator jumlah item cart pada navigasi publik.
7. THE Aplikasi_Niuva SHALL mengecualikan route khusus test dan internal dari sitemap dan tetap menandainya `noindex`.
8. THE Gate_Verifikasi SHALL menjalankan `build` dan membandingkan klasifikasi statis/dinamis per route terhadap strategi yang direncanakan.

---

**Tahap 5 — Policy publik, consent, dan gate usia**

### Requirement 17: Policy publik dan pencatatan consent

**User Story:** Sebagai calon Customer, saya ingin membaca Syarat Layanan dan Kebijakan Privasi yang berlaku sebelum mendaftar, sehingga persetujuan saya bermakna.

*Temuan tercakup:* F1, A2, `PUB-POLICY`. *Dependency:* membutuhkan Requirement 13; prasyarat Requirement 18.

#### Acceptance Criteria

1. THE Aplikasi_Niuva SHALL menyediakan route publik untuk Syarat Layanan dan Kebijakan Privasi yang dapat diakses tanpa autentikasi.
2. THE Aplikasi_Niuva SHALL menautkan route legal publik dari footer `src/components/niuva/public-shell.tsx`.
3. THE Consent_Service SHALL menyimpan untuk setiap dokumen resmi sebuah identifier, versi immutable, checksum atau content reference, bahasa, tanggal berlaku, dan status publikasi.
4. THE Consent_Service SHALL memisahkan namespace dokumen draf dan dokumen pengujian internal dari namespace dokumen publik.
5. WHEN sebuah dokumen resmi direvisi, THE Consent_Service SHALL mempertahankan salinan versi yang telah diterima agar tetap dapat ditemukan.
6. THE Consent_Service SHALL merekam penerimaan dengan operasi pendaftaran, binding identitas yang aman, versi setiap dokumen, waktu server, dan outcome.
7. THE Consent_Service SHALL memisahkan penerimaan Syarat dan Privasi dari persetujuan pemrosesan data anak.
8. IF dokumen resmi beserta tanggal berlaku dan persetujuan Owner/legal belum ada, THEN THE Consent_Service SHALL menolak membuka consent publik.
9. THE Consent_Service SHALL menolak draf v3 di `docs/legal/` sebagai sumber consent publik.
10. THE Aplikasi_Niuva SHALL mempertahankan dokumen pengujian internal dan allowlist `niuva_dev` tanpa perubahan ketika consent publik ditambahkan.

### Requirement 18: Gate usia dan wali sebelum pendaftaran publik

**User Story:** Sebagai Owner, saya ingin pendaftaran publik hanya terbuka setelah kelayakan usia dan wali tertutup, sehingga perlindungan anak tidak dilewati oleh code.

*Temuan tercakup:* A2, `PUB-AGE`, `PUB-GUARDIAN`. *Dependency:* membutuhkan Requirement 17.

#### Acceptance Criteria

1. THE Capability_Resolver SHALL menolak capability pendaftaran publik selama `PUB-AGE` atau `PUB-GUARDIAN` belum ditutup.
2. THE Aplikasi_Niuva SHALL memutuskan akses fitur yang dibatasi di server pada setiap fitur dan setiap komitmen, bukan dari checkbox atau state UI.
3. WHEN pendaftaran email dan password dilakukan, THE Consent_Service SHALL menyimpan penerimaan sebagai pending dan membuat account beserta consent secara atomik setelah verifikasi dan seluruh gate terpenuhi.
4. THE Aplikasi_Niuva SHALL menahan pembuatan sesi otomatis dari langkah verifikasi email.
5. WHEN pendaftaran melalui Google dilakukan, THE Consent_Service SHALL memverifikasi bukti consent yang terikat identitas, tujuan, dan sesi pada callback, lalu mengonsumsinya secara atomik.
6. IF bukti consent hilang, kedaluwarsa, diputar ulang, atau versinya berubah secara material, THEN THE Consent_Service SHALL menolak pendaftaran tersebut.
7. THE Program_Remediasi SHALL menahan pemilihan metode verifikasi usia dan assurance wali sampai keputusan Owner dan legal tercatat.
8. THE Aplikasi_Niuva SHALL memperlakukan login Google atau email terverifikasi sebagai bukti kontrol identitas saja, bukan bukti usia, kapasitas transaksi, atau hubungan wali.
9. THE Gate_Verifikasi SHALL menyertakan test yang membuktikan verifikasi tanpa consent atau tanpa kelayakan tidak menghasilkan akses.
10. THE Gate_Verifikasi SHALL menyertakan test yang membuktikan data wali tidak terbaca lintas akun.

---

**Tahap 6 — Email outbox durable**

### Requirement 19: Email outbox durable dan aman

**User Story:** Sebagai Customer, saya ingin email penting terkirim dengan andal dan aman, sehingga verifikasi dan proof privasi dapat saya gunakan.

*Temuan tercakup:* A2 bagian delivery, `PUB-EMAIL`. *Dependency:* membutuhkan Requirement 13 dan 17.

#### Acceptance Criteria

1. THE Email_Outbox SHALL menyimpan untuk setiap pesan sebuah id, logical message key, tujuan dan versi template, purpose binding, waktu enqueue, due, dan expiry, state, attempts, lease, provider reference, kategori failure, dan audit minimum.
2. THE Email_Outbox SHALL membedakan state queued, delivery accepted, dan hasil akhir sebagai tiga status terpisah.
3. WHEN pengiriman gagal, THE Email_Outbox SHALL menerapkan retry dan backoff yang terbatas beserta cooldown.
4. IF sebuah kegagalan bersifat permanen atau bounce, THEN THE Email_Outbox SHALL menghentikan retry dan menandai pesan untuk tindak lanjut petugas.
5. THE Email_Outbox SHALL menyimpan token auth dan token privasi sebagai hash pada database proof dan mengeluarkan nilai plaintext dari log dan tabel umum.
6. WHEN sebuah pesan akan dikirim atau diulang, THE Email_Outbox SHALL memverifikasi bahwa proof, account, sesi, dan tujuan masih sah.
7. IF proof telah dicabut, kedaluwarsa, atau akun telah ditutup, THEN THE Email_Outbox SHALL membatalkan pengiriman pesan tersebut.
8. THE Email_Outbox SHALL mempertahankan masa berlaku proof 15 menit tanpa perpanjangan karena retry.
9. WHEN otorisasi baru dibutuhkan, THE Aplikasi_Niuva SHALL meminta alur otorisasi baru alih-alih mengganti token pada pesan lama.
10. THE Email_Outbox SHALL menandai kegagalan pengiriman sebagai bukan otorisasi.
11. THE Email_Outbox SHALL memakai waktu server yang konsisten untuk enqueue, due, dan expiry.
12. WHERE pesan bisnis dikirim setelah closure, THE Email_Outbox SHALL memakai tujuan dan kontak yang sah tanpa tautan sesi akun yang telah dicabut.

---

**Tahap 7 — Privacy, retensi, dan job terjadwal**

### Requirement 20: Hak privasi tersedia di lingkungan nyata

**User Story:** Sebagai Customer, saya ingin hak privasi saya tersedia di lingkungan nyata, sehingga permintaan saya tidak bergantung pada runtime pengujian internal.

*Temuan tercakup:* A3, `PUB-JOBS`, `PUB-INCIDENT`. *Dependency:* membutuhkan Requirement 13 dan 19.

#### Acceptance Criteria

1. THE Privacy_Service SHALL menentukan ketersediaan hak privasi dari Capability_Resolver, bukan dari deteksi database internal testing di `src/modules/customer-privacy/core.ts:10`.
2. THE Scheduled_Job_Runner SHALL menjalankan cleanup privasi dan cleanup auth internal melalui job berjadwal yang tidak bergantung pada `isInternalAuthDatabase()`.
3. THE Privacy_Service SHALL mempertahankan tenggat 72 jam kalender tanpa reset karena retry, perubahan status, restore, atau kedaluwarsa hold.
4. THE Privacy_Service SHALL mempertahankan proof 15 menit, deadline tetap, lifecycle lock, dan closed-business marker.
5. THE Scheduled_Job_Runner SHALL menjalankan cleanup dan penanganan hak ketika capability signup tertutup.
6. THE Rencana_Tahap SHALL mencatat kanal hak akses, koreksi, penarikan, dan pembatasan yang belum otomatis sebagai item dengan pemilik dan tenggat.

### Requirement 21: Jalur job terjadwal bersama yang terukur

**User Story:** Sebagai Owner, saya ingin pekerjaan periodik berjalan terukur, sehingga kebijakan retensi dan status order tidak bergantung pada satu notifikasi.

*Temuan tercakup:* D2, D3, D4, `PUB-JOBS`. *Dependency:* membutuhkan Requirement 8, 13, 20; ketiga temuan berbagi satu jalur job.

#### Acceptance Criteria

1. THE Scheduled_Job_Runner SHALL menyediakan satu jalur job bersama dengan service identity, pemeriksaan tier dan resource, idempotensi, locking, dan checkpoint.
2. THE Scheduled_Job_Runner SHALL menyediakan mode dry-run dan mode execute untuk setiap job.
3. THE Scheduled_Job_Runner SHALL mengekspos metrik jumlah, lag, dan last-success untuk setiap job.
4. IF sebuah job gagal, THEN THE Scheduled_Job_Runner SHALL mengulang hanya scope yang belum berhasil dengan batas retry.
5. THE Scheduled_Job_Runner SHALL mempertahankan deadline asli ketika job diulang.
6. THE Aplikasi_Niuva SHALL menghapus `StoredFile` kedaluwarsa beserta objeknya sesuai `NIUVA_MVP_FILE_RETENTION` dan `fileDeletionEligibleAt` di `src/modules/policy/privacy.ts` dengan lifecycle 14, 60, dan 90 hari.
7. THE Aplikasi_Niuva SHALL memanggil `InventoryService.releaseExpired()` secara periodik sehingga baris `StockReservation` tidak menumpuk pada state `ACTIVE`.
8. THE Aplikasi_Niuva SHALL mempertahankan filter `expiresAt: { gt: now }` pada `findAvailableQuantity` dan `reserveWithinTransaction` agar stok tidak terkunci oleh reservasi kedaluwarsa.
9. THE Aplikasi_Niuva SHALL menyediakan rekonsiliasi order dan pembayaran yang mendeteksi order yang tertahan pada `PENDING_PAYMENT` atau `WAITING_PAYMENT` melampaui batas yang ditetapkan.
10. THE Scheduled_Job_Runner SHALL menolak pemanggilan job berbahaya tanpa autentikasi dan izin yang sesuai.
11. WHERE penjadwalan hosted dibutuhkan di luar `vercel.json` yang saat ini hanya menjadwalkan `/api/analytics/retention`, THE Approval_Gate SHALL meminta persetujuan user sebelum konfigurasi infrastruktur diubah.
12. THE Gate_Verifikasi SHALL menjalankan `test:backend` dan `test:integration` untuk setiap perubahan job.

---

**Tahap 8 — Refund, kewenangan admin, dan jejak audit**

### Requirement 22: Pengajuan refund penuh dan kewenangan persetujuan

**User Story:** Sebagai Customer, saya ingin dapat mengajukan refund penuh dan mendapat kepastian, sehingga pembayaran yang bermasalah terselesaikan.

*Temuan tercakup:* E1, `PUB-REFUND`. *Dependency:* membutuhkan Requirement 8, 13, 21.

#### Acceptance Criteria

1. THE Refund_Service SHALL menyimpan kasus refund dengan id, order, alokasi payment server, alasan dan kategori, pemohon dan pihak berwenang, kontak minimum, pilihan penyelesaian, waktu penerimaan dan tenggat, syarat dan bukti retur, status, serta expense di luar charge.
2. THE Refund_Service SHALL menyimpan persetujuan Owner dengan identitas pemberi izin, waktu, alasan, revision, dan snapshot immutable atas amount, currency, serta alokasi.
3. WHEN sebuah persetujuan disubmit, THE Refund_Service SHALL memvalidasi ulang eligibility dan saldo yang relevan di server.
4. IF scope atau nominal berubah, THEN THE Refund_Service SHALL mewajibkan persetujuan baru dan menolak pengiriman versi lama.
5. THE Refund_Service SHALL menghitung nominal dari pembayaran berhasil di server memakai aritmetika Decimal.
6. THE Refund_Service SHALL menghitung full refund sebagai seluruh charge sah terkait dikurangi refund yang telah benar-benar diterima.
7. THE Refund_Service SHALL mencegah kasus atau alokasi refund yang tumpang tindih melampaui charge melalui constraint dan lock.
8. THE Refund_Service SHALL menahan perubahan status order dan stock yang tidak eligible menurut kontrak lifecycle yang berlaku.
9. THE Aplikasi_Niuva SHALL menegakkan permission `PAYMENT_REFUND_FULL`, `PAYMENT_CANCEL_PENDING`, `ADMIN_PROFILE_MANAGE`, dan `SYSTEM_POLICY_MANAGE` pada operasi yang sesuai.
10. WHEN workflow refund tersedia, THE Aplikasi_Niuva SHALL menyediakan jalur pembatalan order berbayar menggantikan `CONFLICT` yang selalu dilempar di `src/modules/order/status-service.ts:196`.
11. THE Refund_Service SHALL memperlakukan persetujuan Owner sebagai bukan penyelesaian kasus.

### Requirement 23: Pengiriman refund idempoten dan terekonsiliasi

**User Story:** Sebagai operasi pembayaran, saya ingin pengiriman refund idempoten dan terekonsiliasi, sehingga tidak ada pembayaran ganda.

*Temuan tercakup:* `PUB-REFUND-RECON`, `PUB-REFUND-PROVIDER`, A4. *Dependency:* membutuhkan Requirement 22.

#### Acceptance Criteria

1. THE Refund_Service SHALL mengirim `refund_key` yang sama untuk operasi dan parameter yang sama pada semua retry.
2. THE Refund_Service SHALL menyimpan `refund_key` dan waktu request pertama sebelum panggilan eksternal mungkin terjadi.
3. IF timeout atau crash terjadi setelah provider menerima request, THEN THE Refund_Service SHALL melanjutkan operasi yang sama alih-alih membuat operasi baru.
4. THE Refund_Service SHALL memakai lease atau lock sehingga worker yang tumpang tindih tidak menggandakan request.
5. THE Refund_Service SHALL menetapkan deadline aman sebagai batas paling awal antara retry-key window tujuh hari, payment refund window, dan cutoff merchant.
6. WHEN deadline aman terlampaui, THE Refund_Service SHALL menghentikan retry dan memindahkan kasus ke rekonsiliasi.
7. THE Refund_Service SHALL memperlakukan respons API accepted sebagai bukan hasil akhir keuangan.
8. WHEN sebuah notifikasi refund diterima, THE Aplikasi_Niuva SHALL memverifikasi signature serta kesesuaian merchant, order, payment, dan amount.
9. THE Aplikasi_Niuva SHALL menangani payload hilang, payload tidak cocok, duplikat, replay, dan urutan tidak berurut tanpa menurunkan status confirmed menjadi pending.
10. IF hasil sebuah operasi tidak pasti, THEN THE Refund_Service SHALL menahan pengiriman baru dan mengeskalasi untuk rekonsiliasi.
11. WHERE pengiriman manual telah dilakukan, THE Refund_Service SHALL memblokir submit API yang tumpang tindih dan memperlakukan notifikasi yang datang kemudian sebagai exception untuk ditinjau.
12. THE Refund_Service SHALL mengeluarkan data pribadi dari alasan publik yang dikirim ke provider.
13. THE Gate_Verifikasi SHALL menyertakan test untuk race approval, race worker, same-key retry, timeout, cutoff tujuh hari, metode tidak didukung, saldo tidak cukup, multi-payment, expense, dan konfirmasi bank.

### Requirement 24: Pengelolaan akses admin dan jejak audit

**User Story:** Sebagai Owner, saya ingin akses admin dapat dikelola dan jejaknya terbaca, sehingga offboarding dan investigasi tidak butuh akses database.

*Temuan tercakup:* E2, D5. *Dependency:* membutuhkan Requirement 12 dan 22.

#### Acceptance Criteria

1. THE Admin_Access_Service SHALL menyediakan operasi aplikasi untuk mengaktifkan dan menonaktifkan `AdminProfile.isActive` bagi pemegang `ADMIN_PROFILE_MANAGE`.
2. WHEN akses admin berubah, THE Admin_Access_Service SHALL menulis entri `AuditLog` yang memuat aktor, target, dan perubahan.
3. THE Aplikasi_Niuva SHALL menyediakan jalur baca `AuditLog` bagi pemegang `AUDIT_READ` dengan filter waktu, aktor, dan entitas.
4. THE Aplikasi_Niuva SHALL menetapkan retensi `AuditLog` sesuai dasar yang disahkan.
5. THE Aplikasi_Niuva SHALL mempertahankan `src/modules/shared/audit.ts` sebagai satu-satunya jalur tulis audit.
6. IF dasar retensi audit belum disahkan, THEN THE Program_Remediasi SHALL mencatat kebutuhan tersebut pada Register_Keputusan dan menahan penghapusan otomatis.

---

**Tahap 9 — Progressive enhancement, resiliensi UI, dan bundel**

### Requirement 25: Progressive enhancement funnel publik

**User Story:** Sebagai pengunjung tanpa JavaScript aktif, saya ingin tetap dapat menavigasi dan mengirim form, sehingga funnel publik tidak mati.

*Temuan tercakup:* H3, H2-revised. *Dependency:* membutuhkan Requirement 13; prasyarat Requirement 26.

#### Acceptance Criteria

1. THE Public_Form_Layer SHALL memproses pengiriman checkout, project brief, custom print request, dan keputusan quote melalui Server Action atau native POST.
2. WHILE JavaScript belum ter-hydrate, THE Aplikasi_Niuva SHALL tetap menyediakan navigasi mobile yang dapat dioperasikan.
3. THE Aplikasi_Niuva SHALL menyediakan hasil yang setara untuk filter katalog dan filter project tanpa JavaScript.
4. THE Public_Form_Layer SHALL memvalidasi setiap pengiriman di server dengan Zod atau padanan yang disetujui.
5. WHEN validasi server menolak sebuah pengiriman, THE Public_Form_Layer SHALL menampilkan pesan kesalahan pada halaman hasil tanpa kehilangan masukan pengguna.
6. THE Aplikasi_Niuva SHALL menghapus ketergantungan Zod pada client component di `src/app/checkout/checkout-form.tsx`, `src/app/project-brief/brief-form.tsx`, `src/app/quote/[token]/quote-review.tsx`, `src/app/custom-print/request/request-form.tsx`, `src/app/custom-print/request/reference-request-form.tsx`, dan `src/app/account/make/[id]/rough-shipping-form.tsx`.
7. THE Aplikasi_Niuva SHALL mempertahankan revalidasi server atas harga, stok, dan ongkir ketika jalur form berubah.
8. THE Gate_Verifikasi SHALL menyertakan test browser yang menjalankan funnel publik dengan JavaScript dinonaktifkan.

### Requirement 26: Pengurangan payload JavaScript per route

**User Story:** Sebagai pengunjung di jaringan lambat, saya ingin halaman mengirim lebih sedikit JavaScript, sehingga halaman tanpa form tidak membawa beban form.

*Temuan tercakup:* H2-revised, H5, B8. *Dependency:* membutuhkan Requirement 25.

#### Acceptance Criteria

1. THE Program_Remediasi SHALL mengukur ulang `first-load JS` per route dari `.next/diagnostics/route-bundle-stats.json` setelah setiap perubahan bundel.
2. THE Aplikasi_Niuva SHALL mengurangi baseline chunk bersama yang saat ini mencapai 1001 KB dari 1030 sampai 1082 KB first-load JS untuk 49 route.
3. THE Aplikasi_Niuva SHALL mengeluarkan chunk yang memuat Zod dari route yang tidak memiliki form, termasuk `/` dan `/services`.
4. THE Aplikasi_Niuva SHALL memuat ikon dari `src/components/ui/Icon.tsx` tanpa mengimpor seluruh 32 ikon secara eager pada setiap route.
5. THE Aplikasi_Niuva SHALL menempatkan `TooltipProvider` dari `@base-ui/react` sehingga root layout `src/app/layout.tsx` tidak menjadi client boundary bagi seluruh route.
6. THE Aplikasi_Niuva SHALL mengonfigurasi `images.remotePatterns` untuk `*.googleusercontent.com` sehingga `src/app/account/page.tsx:121` dapat memakai komponen image tanpa pengecualian lint.
7. WHERE bundle analyzer atau pengukuran Core Web Vitals membutuhkan dependency baru, THE Approval_Gate SHALL meminta persetujuan user sebelum pemasangan.
8. THE Gate_Verifikasi SHALL menjalankan `build` dan membandingkan angka bundel sebelum dan sesudah untuk setiap task bundel.

### Requirement 27: Keadaan memuat dan error boundary ber-scope

**User Story:** Sebagai pengunjung, saya ingin keadaan memuat dan keadaan error terasa terkendali, sehingga kegagalan tidak membuang konteks halaman.

*Temuan tercakup:* G2, G3, G4. *Dependency:* membutuhkan Requirement 8.

#### Acceptance Criteria

1. THE Program_Remediasi SHALL meninjau manifest `tests/unit/system-pages-coverage.test.ts` dan menetapkan keputusan `loading.tsx` per page non-admin yang memakai `await connection()` beserta alasannya.
2. WHERE sebuah page publik memiliki waktu tunggu data yang terlihat, THE Aplikasi_Niuva SHALL menyediakan keadaan memuat ber-scope untuk page tersebut.
3. THE Aplikasi_Niuva SHALL menyediakan error boundary ber-scope untuk area checkout dan account sehingga konteks `PublicShell` tetap terjaga.
4. WHEN sebuah page admin gagal memuat data, THE Aplikasi_Niuva SHALL membedakan pesan untuk kegagalan database, bug kode, dan timeout provider.
5. THE Aplikasi_Niuva SHALL mempertahankan copy terpusat `system-state-copy.ts` sebagai sumber teks keadaan sistem.

---

**Tahap 10 — Struktur, kebersihan, dan kekuatan verifikasi**

### Requirement 28: Pemecahan modul besar dan penghapusan duplikasi

**User Story:** Sebagai engineer, saya ingin modul besar terpecah dan duplikasi hilang, sehingga perubahan berikutnya aman direview.

*Temuan tercakup:* C3, C4, C5, D6, J1, J2, J7, F4, F5, H4, B9. *Dependency:* membutuhkan Requirement 7; dijalankan setelah tahap berisiko agar diff tetap terbaca.

#### Acceptance Criteria

1. THE Program_Remediasi SHALL memecah `src/modules/quote/service.ts`, `src/modules/admin/operations.ts`, `src/app/custom-print/request/request-form.tsx`, dan `src/app/admin/actions.ts` menjadi unit yang masing-masing memiliki satu kepedulian, satu file per task.
2. THE Program_Remediasi SHALL menyederhanakan `src/components/niuva/customer-auth-page.tsx` sehingga tidak bergantung pada ternary bersarang lima tingkat dalam satu ekspresi JSX.
3. THE Aplikasi_Niuva SHALL menyediakan satu parser untuk format `Nama | nominal` yang dipakai `publishCustomPrintEstimateAction` dan `sendB2BQuoteAction`.
4. THE Aplikasi_Niuva SHALL menyediakan pretty printer yang memformat kembali nilai `Nama | nominal` ke bentuk teks yang valid.
5. FOR ALL nilai `Nama | nominal` yang valid, THE Aplikasi_Niuva SHALL menghasilkan nilai setara ketika teks diparse, dicetak, lalu diparse kembali.
6. IF teks `Nama | nominal` tidak valid, THEN THE Aplikasi_Niuva SHALL mengembalikan kesalahan yang menyebut bagian yang tidak dapat diproses.
7. THE Program_Remediasi SHALL menyatukan tiga implementasi markup baris antrean di `src/app/admin/admin-work-list.tsx`, `src/app/admin/action-queue-view.tsx`, dan `src/app/demo/action-queue/action-queue-demo-view.tsx` menjadi satu komponen bersama.
8. WHERE penghapusan `src/components/niuva/option-chip.tsx`, `src/components/niuva/action-queue-item.tsx`, atau direktori AUiS kosong dibutuhkan, THE Approval_Gate SHALL meminta persetujuan user sebelum penghapusan.
9. THE Program_Remediasi SHALL mengusulkan pengaktifan `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, dan `noUnusedLocals` pada `tsconfig.json` secara bertahap, satu flag per task.
10. WHEN sebuah flag TypeScript diaktifkan, THE Program_Remediasi SHALL menghapus pelonggaran tipe yang terpapar, termasuk `stored.orderId!` di `src/modules/checkout/service.ts:313` dan `candidate[field] as string` pada `parseStoredCheckoutResponse`.
11. THE Program_Remediasi SHALL merapikan urutan field pada model `Customer`, `Order`, `B2BInquiry`, `CustomPrintRequest`, dan `CustomerPendingRegistration` di `prisma/schema.prisma` tanpa mengubah migrasi yang sudah ada.
12. THE Aplikasi_Niuva SHALL mempertahankan revalidasi ongkir di server pada `src/modules/checkout/service.ts:186` meskipun client telah memanggil `/api/shipping/rates`.
13. THE Program_Remediasi SHALL mempertahankan route khusus test `/auth-test-policy`, `/internal-testing/policy`, `/internal-testing/google-consent`, `/demo/action-queue`, dan `/api/frontend-preview/media/[id]` sebagai fail-closed dan `noindex`.
14. THE Gate_Verifikasi SHALL menjalankan `db:validate`, `lint`, `typecheck`, `test`, `test:backend`, dan `build` untuk setiap task tahap ini.

### Requirement 29: Verifikasi browser setara production lintas platform

**User Story:** Sebagai engineer, saya ingin verifikasi browser mewakili production dan dapat dijalankan lintas platform, sehingga gate benar-benar menangkap masalah.

*Temuan tercakup:* I3, I4, I5, I2. *Dependency:* membutuhkan Requirement 13 dan 25.

#### Acceptance Criteria

1. THE Gate_Verifikasi SHALL menjalankan sekurangnya satu suite `test:e2e` terhadap production build, bukan terhadap `next dev`.
2. WHEN suite E2E berjalan terhadap production build, THE Gate_Verifikasi SHALL memverifikasi security header production alih-alih header development.
3. THE Gate_Verifikasi SHALL menjalankan suite E2E pada Chromium, Firefox, dan WebKit yang sudah terpasang, serta pada sekurangnya satu viewport mobile.
4. WHERE pemeriksaan aksesibilitas runtime membutuhkan dependency baru, THE Approval_Gate SHALL meminta persetujuan user sebelum pemasangan.
5. THE Program_Remediasi SHALL mengganti script `db:test:*`, `db:demo:*`, dan `test:integration` di `package.json` dengan perintah yang dapat dijalankan di luar `powershell.exe`.
6. THE Gate_Verifikasi SHALL menyertakan skenario E2E untuk jalur produksi beranda dan portfolio.
7. IF sebuah suite E2E tidak dapat dijalankan pada lingkungan saat ini, THEN THE Program_Remediasi SHALL mencatat status `TIDAK_DIJALANKAN` beserta penyebab dan syarat menjalankannya.

---

**Tahap 11 — Gate di luar kendali code**

### Requirement 30: Register keputusan open question non-teknis

**User Story:** Sebagai Owner, saya ingin keputusan yang bukan keputusan teknis tercatat sebagai open question, sehingga code tidak menyelesaikannya secara diam-diam.

*Temuan tercakup:* `PUB-BIZ`, `PUB-AGE`, `PUB-GUARDIAN`, `PUB-POLICY`, `PUB-DATA`, `PUB-RECORDS`, `PUB-SERVICE`, `PUB-REFUND-PROVIDER`, D1. *Dependency:* berlaku lintas tahap.

#### Acceptance Criteria

1. THE Register_Keputusan SHALL mencatat dokumen legal resmi beserta tanggal berlaku sebagai keputusan Owner dan legal yang belum tertutup.
2. THE Register_Keputusan SHALL mencatat metode verifikasi usia dan assurance wali sebagai keputusan `PUB-AGE` dan `PUB-GUARDIAN` yang belum tertutup.
3. THE Register_Keputusan SHALL mencatat ruang lingkup refund final sebagai keputusan Owner yang belum tertutup.
4. THE Register_Keputusan SHALL mencatat retensi legal dan akuntansi per kategori record sebagai keputusan yang belum tertutup.
5. THE Register_Keputusan SHALL mencatat kalender kerja WIB, hari libur, petugas pengganti, dan coverage sebagai keputusan yang belum tertutup.
6. THE Register_Keputusan SHALL mencatat cakupan metode pembayaran untuk refund sebagai keputusan `PUB-REFUND-PROVIDER` yang belum tertutup.
7. THE Register_Keputusan SHALL mencatat keputusan menghapus versus membangun model `Service` sebagai keputusan user yang belum tertutup.
8. THE Register_Keputusan SHALL mencantumkan untuk setiap entri sebuah pemilik, bukti yang dibutuhkan, dan syarat penutupan.
9. THE Program_Remediasi SHALL menahan capability yang bergantung pada entri Register_Keputusan yang belum tertutup pada keadaan fail-closed.
10. THE Program_Remediasi SHALL menolak penyelesaian entri Register_Keputusan melalui pemilihan nilai default di code.

### Requirement 31: Perhitungan dan pemantauan SLA layanan

**User Story:** Sebagai Owner, saya ingin SLA layanan tercermin dalam sistem, sehingga janji operasional dapat dipantau.

*Temuan tercakup:* `PUB-SERVICE`, `PUB-JOBS`. *Dependency:* membutuhkan Requirement 21, 22, 30 entri kalender kerja.

#### Acceptance Criteria

1. WHERE kalender kerja WIB telah disahkan, THE Aplikasi_Niuva SHALL menghitung tenggat tanggapan awal 1 hari kerja, pemeriksaan 2 hari kerja, dan mulai refund 1 hari kerja setelah persetujuan beserta syarat retur.
2. THE Aplikasi_Niuva SHALL menghitung tenggat privasi 72 jam dalam waktu kalender.
3. THE Aplikasi_Niuva SHALL memantau kasus yang mendekati tenggat, kasus terlambat, hold yang menunggu review, job gagal, pesan outbox tidak terkirim, dan refund berstatus tidak pasti.
4. IF kalender kerja belum disahkan, THEN THE Aplikasi_Niuva SHALL menahan perhitungan SLA hari kerja dan menampilkan tenggat sebagai belum ditetapkan.

### Requirement 32: Batas pekerjaan code terhadap kesiapan production

**User Story:** Sebagai Owner, saya ingin batas antara pekerjaan code dan kesiapan production tetap jelas, sehingga tidak ada klaim kesiapan yang tidak berdasar.

*Temuan tercakup:* `PUB-PROVIDER`, `PUB-BACKUP`, `PUB-STAGING`, `PUB-RELEASE`. *Dependency:* tahap akhir.

#### Acceptance Criteria

1. THE Program_Remediasi SHALL memperlakukan bukti provider, inbox email, storage, backup, dan pemulihan sebagai bukti lingkungan yang tidak dapat digantikan oleh hasil CI.
2. THE Program_Remediasi SHALL melaporkan penerimaan visual sebagai belum ditinjau sampai user menyatakan menerimanya secara eksplisit.
3. THE Program_Remediasi SHALL melaporkan penerimaan physical-device dan assistive technology sebagai terpisah dari hasil `test:e2e`.
4. THE Program_Remediasi SHALL memperlakukan `PUB-RELEASE` sebagai `NOT_AUTHORIZED` dan menahan publikasi policy, deployment, aktivasi provider, serta penggunaan credential production sampai ada instruksi terpisah untuk masing-masing tindakan.
5. WHEN sebuah tahap selesai, THE Program_Remediasi SHALL melaporkan file yang berubah, command yang dijalankan, hasil test/build/browser, acceptance criteria yang tercakup, risiko tersisa, dan catatan rollback bila relevan.
