# Niuva Keputusan Lanjutan — Implementation Plan

> **For agentic workers:** gunakan `superpowers:executing-plans` ketika Owner menginstruksikan implementasi spec ini. Task memakai checkbox. Eksekusi oleh agent utama; subagents, commit dan push tidak diotorisasi melalui plan ini.

**Goal:** menerapkan kontrol pernyataan usia 18+, pemeriksaan ringan CAD dan sitemap katalog tanpa membuka capability publik, serta menuntaskan investigasi E2E sejauh bukti yang tersedia.

**Architecture:** pertahankan schema/service/repository/route existing. Helper murni memvalidasi deklarasi usia dan prefix CAD; R2 menghitung inspeksi pada satu stream; sitemap memakai adapter katalog publik existing. Investigasi E2E mendahului pilihan perbaikannya.

**Tech Stack:** Next 16.3.2, TypeScript strict, Prisma 7.10.0, PostgreSQL, Zod existing, Node crypto, AWS SDK existing, Vitest/RTL, Playwright. Tanpa dependency tambahan.

**Spec:** [requirements.md](requirements.md) dan [design.md](design.md). Bukti awal: [evidence.md](evidence.md).

## Global constraints

- Implementasi diinstruksikan Owner pada 6 Oktober 2026 dan diselesaikan pada branch lokal. Hasil aktual: [implementation-report.md](implementation-report.md); pembukuan: [implementation-log.md](implementation-log.md).
- `PUB-RELEASE = NOT_AUTHORIZED`; tutup kontrol usia tidak mengaktifkan public signup.
- Usia minimum **18**, input form **`"on"`**, versi **`AGE-18-SELF-DECLARATION-2026-10-05-v1`**; tanpa DOB/KYC/biometrik.
- CAD: **100 MiB** batas objek, **64 KiB** prefix, hanya `stl/obj/3mf/step/stp`; R2 privat dan retensi **14/60/90 hari** tetap.
- Sitemap: canonical origin tervalidasi, literal **`revalidate = 300`**, tanpa request-time API atau data publikasi rekaan.
- Tidak mengubah dependency, `.env*`, workflow, `vercel.json`, migrasi lama atau dokumen Owner. Migrasi usia hanya baru, aditif dan nullable.
- Tidak mengurangi assertion, menambah skip/retry, melonggarkan ekspektasi, atau menaikkan timeout untuk membuat gate hijau.

## Review focus

1. Direct POST/service call tanpa deklarasi usia: tidak ada pending registration, proof, email atau sesi baru — Task 1.
2. Pending/proof lama, expired, replay, atau account closure di tengah OAuth: tidak membuat akun atau mengklaim closed history — Task 1.
3. Ekstensi CAD benar tetapi byte salah, inspector hilang, ukuran berbeda atau stream putus: tidak menjadi `UPLOADED` — Task 2.
4. Sumber katalog/project gagal secara independen dan origin invalid: URL dari sumber sehat tetap ada; tanpa origin tidak ada read — Task 3.
5. Decode terjadi setelah sebagian besar deadline test dipakai: diagnosis memisahkan fase dan request sebelum memilih perubahan — Task 4.

## Task 1 — RK-02: kontrol usia pada pembuatan akun

**Files:**

- Create: `src/modules/customer-auth/age-declaration.ts`, `prisma/migrations/20261005230000_customer_age_declaration/migration.sql`, `tests/unit/customer-age-declaration.test.ts`.
- Modify: `prisma/schema.prisma`; `src/modules/customer-auth/{password-validation,email-service,email-repository,internal-consent,repository}.ts`; `src/modules/capabilities/resolver.ts`.
- Modify: `src/components/niuva/{customer-email-form,internal-google-consent-form}.tsx`, `src/app/api/auth/internal/google-consent/route.ts`.
- Test: `tests/unit/{customer-email-auth,customer-email-form,internal-google-consent-form,capability-resolver}.test.*`; `tests/backend/{customer-email-routes,customer-internal-consent-route}.test.ts`; `tests/integration/{customer-email-auth,customer-internal-auth,customer-privacy}.test.ts`; `tests/e2e/customer-email-auth.spec.ts`.

**Interfaces:** konsumsi field `ageDeclaration` melalui Zod; produksi helper/version dan field `ageDeclarationVersion`, `ageDeclaredAt` pada tiga record di `design.md`; `InternalGoogleConsentService.accept(raw: unknown, now?: Date): Promise<string>`.

- [x] Tulis test `rejectsMissingOrNonOnAgeDeclaration` yang menguji hilang/off/false/boolean, serta `acceptsExplicitOnAgeDeclaration` yang menguji field tepat `"on"`. Mock memastikan repository/email tidak dipanggil pada penolakan. Jalankan `corepack pnpm exec vitest run tests/unit/customer-age-declaration.test.ts tests/unit/customer-email-auth.test.ts`; test baru harus gagal karena kontrol belum ada.
- [x] Tambahkan helper/schema dan migrasi enam kolom nullable tanpa default/backfill; generator menentukan mapping seperti design. Jalankan `corepack pnpm db:generate` dan `corepack pnpm db:validate`; jangan menerapkan migrasi ke database non-test dalam task ini.
- [x] Bawa bukti versi/waktu server melalui email pending sampai consent; tolak pending lama tanpa bukti di `consumeVerification()` dalam lifecycle lock existing. Tambahkan assertion integration untuk versi/waktu persisted, penolakan legacy pending, verifikasi tidak otomatis login, dan credential/consent atomik.
- [x] Tambahkan validasi usia pada service consent Google internal, simpan dalam proof existing dan konsumsi bersama account creation. Test missing/expired/replayed/wrong-identity proof tidak menciptakan akun atau sesi; direct callback tidak bypass. Branch ordinary tanpa proof server tetap gagal, sedangkan login akun Google existing tetap berhasil.
- [x] Pasang checkbox terpisah pada kedua form existing beserta label/error/fokus. Perbarui hanya fixture happy path yang memang mendaftar agar membawa deklarasi eksplisit; pertahankan negative tests dan assertions lama. Test consent policy saja tidak cukup dan login/reset tidak menampilkan checkbox pendaftaran.
- [x] Integrasikan `getAgeGateStatus()` untuk `PUB-AGE` setelah kontrol di atas teruji. Test gate policy tetap false, matrix/grant tetap sama, dan semua tier tetap menolak signup pada default runtime. Test injected closed age + open policy tidak memberi izin; injected closed policy + closed age + missing grant tetap menolak sesuai matrix/precedence.
- [x] Jalankan unit targeted di atas, `corepack pnpm exec vitest run --config vitest.backend.config.mts tests/backend/customer-email-routes.test.ts tests/backend/customer-internal-consent-route.test.ts`, lalu `corepack pnpm test:integration` pada DB test guard existing. Periksa regression lifecycle/closure dan ordinary-Customer boundary.
- [x] Jalankan E2E `customer-email-auth.spec.ts` bersama product proof, kemudian suite penuh. Periksa `/register` aktual pada desktop/mobile, keyboard/error/loading dan reduced motion; verifikasi form Google internal melalui component tests dan batas POST/service/PostgreSQL. Browser halaman Google internal aktif belum diverifikasi karena guard Development tidak menerima DB E2E; guard tetap, batas bukti dicatat di laporan. Visual belum ditinjau, perangkat fisik/AT belum terverifikasi.

**Deliverable:** kontrol usia yang tidak dapat dilewati pada branch akun baru yang tersedia, bukti minimum persisted, dan signup publik tetap tertutup. Catatan implementasi RK-02/RK-03 diperbarui; status keputusan Owner tetap `BELUM_TERTUTUP`.

## Task 2 — RK-12: inspeksi CAD pada konfirmasi upload

**Files:**

- Create: `src/modules/files/content-inspection.ts`, `tests/backend/cad-content-inspection.test.ts`, `tests/backend/r2-content-inspection.test.ts`.
- Modify: `src/modules/files/{r2,repository,upload-service}.ts`.
- Test: `tests/backend/{upload-sha256,private-file-access,custom-print-upload-intent-route,files-inquiry-quote}.test.ts`, `tests/integration/private-upload-route.test.ts`, serta test double lain yang mengimplementasikan `PrivateObjectStorage`.

**Interfaces:** `ObjectContentInspection`, required `inspectObject(key: string, maxBytes: number)`, `CadFileExtension`, `isCadFileExtension()`, `assertCadContent()` persis pada `design.md`. Repository confirmation ikut mengembalikan `extension`.

- [x] Mulai RED melalui perilaku konfirmasi service existing: isi CAD salah, ukuran aktual berbeda, dan inspector belum dipanggil (3 kasus gagal). Tambahkan fixture sintetis/helper untuk STL binary/ASCII, OBJ, STEP/STP dan ZIP header 3MF serta kasus teks/HTML/binary tidak sesuai, header terpotong, STL count salah, OBJ tanpa vertex dan kosong. Jalankan test helper setelah implementasi; tidak memakai kegagalan import helper yang belum ada sebagai bukti RED. Regresi foto PNG/JPEG tetap diuji.
- [x] Implementasikan helper pure sesuai tabel design dan batas prefix. Test binary STL dengan header diawali `solid`, BOM/whitespace teks, dan koordinat notasi ilmiah. Dokumentasikan bahwa ZIP header saja tidak membuktikan 3MF payload; jangan membuat test yang mengklaim arbitrary ZIP aman.
- [x] Tambahkan inspector streaming R2 memakai SDK/crypto existing. Tests membuktikan SHA-256 dan ukuran hasil byte sebenarnya, prefix tidak lebih dari 65.536 byte, chunk terpisah tetap dikenali, stream putus/over-limit ditolak dan ditutup, dan tidak ada buffer seluruh objek/GET kedua untuk CAD.
- [x] Pilih extension dalam repository dan integrasikan pemeriksaan sebelum `markUploadedIfPending()`. Test `rejectsCadUploadWhenInspectorMissing`, `rejectsDeclaredExtensionWithWrongBytes`, `rejectsActualSizeMismatch`, dan `marksUploadedOnlyAfterInspection`; assert mark tidak dipanggil pada semua kegagalan.
- [x] Perbarui test double dengan byte valid yang mencerminkan format, tanpa melemahkan checksum/token/ownership assertion. Uji kedua caller: Customer dan append link terverifikasi. Pertahankan regresi PNG/JPEG, privat/signed access dan retensi existing.
- [x] Jalankan `corepack pnpm exec vitest run --config vitest.backend.config.mts tests/backend/cad-content-inspection.test.ts tests/backend/r2-content-inspection.test.ts tests/backend/upload-sha256.test.ts tests/backend/private-file-access.test.ts tests/backend/custom-print-upload-intent-route.test.ts tests/backend/files-inquiry-quote.test.ts`, lalu `corepack pnpm test:integration`. Semua expected pass; angka aktual dicatat setelah run.

**Deliverable:** konfirmasi CAD fail-closed berdasarkan byte server; tidak ada dependency/provider baru atau perubahan kebijakan binary.

## Task 3 — RK-18: sitemap produk terbit

**Files:** modify `src/app/sitemap.ts`, `tests/unit/sitemap.test.ts`. Publication/runtime visibility diperiksa melalui `CatalogRepository.findPublishedProducts()` dan `getLiveShopProducts()`; tambah `tests/integration/sitemap-catalog.test.ts` untuk jalur baca nyata.

**Interfaces:** gunakan `getLiveShopProducts(): Promise<readonly PublicShopProduct[]>` existing; output `sitemap(): Promise<MetadataRoute.Sitemap>` tetap.

- [x] Tambahkan mock `getLiveShopProducts` dan test `includesPublishedProductDetailsOnCanonicalOrigin`. Assert URL encoded, tidak ada duplikat, static/service/project entries serta seluruh exclusion existing tetap dipenuhi. Jalankan `corepack pnpm exec vitest run tests/unit/sitemap.test.ts`; harapkan FAIL karena produk belum masuk.
- [x] Tambahkan read katalog dengan catch independen dan URL detail produk, pertahankan literal 300 dan validasi origin. Jangan mengimpor preview/scenario path atau memakai request-time API; koreksi komentar lama.
- [x] Tambahkan test `preservesProjectsWhenCatalogFails`, `preservesCatalogWhenProjectsFail`, dan `doesNotReadAnySourceWhenOriginInvalid`; assert hasil sumber sehat dan mock call count. Semua assertion existing tetap ada.
- [x] Tambahkan integration fixture published/unpublished, fixture demo pada production runtime, dan published out-of-stock. Assert jalur nyata hanya mengembalikan produk visible sesuai katalog; tidak membentuk filter stok baru. Gunakan DB test guard, bukan production credentials atau daftar produk rekaan.
- [x] Jalankan unit targeted, `corepack pnpm test:integration`, lalu build tanpa DB dengan harness/config existing yang menghilangkan binding database tanpa membaca/menulis `.env*`. Expected: build exit 0, sitemap masih ISR 300, static routes tersedia. Catat cara binding dieliminasi dan hasil nyata; jangan mengasumsikan sekadar mock membuktikan build tanpa DB.

**Deliverable:** detail produk dari katalog publik masuk sitemap dan kegagalan salah satu sumber tidak menggagalkan build/sumber lain.

## Task 4 — investigasi E2E media beranda

**Files:** catat hasil pada `e2e-investigation.md` dan laporan implementasi; `evidence.md` tetap bukti persiapan bertanggal. Bila diagnosis membutuhkan instrumentasi, modify hanya `tests/e2e/helpers/readiness.ts` dan `tests/e2e/product-route-proof.spec.ts` dalam scope diagnosis. Tidak mengubah workflow/provider/cache beranda sebelum bukti mendukung.

**Interfaces:** `expectDecodedImage(image: Locator): Promise<void>` tetap mengharuskan decode sukses dan dimensi positif. Data diagnosis dibatasi pada media publik/pathname dan fase/waktu relatif.

- [x] Baca ulang metadata/log attempt 1 run `37286002533` dan `37291522614`; periksa artifact API. Simpan temuan terpilih tanpa full private log. Jika trace tetap tidak tersedia, catat keterbatasannya; jangan menyatakan sudah menginspeksi trace.
- [x] Jalankan command trace lokal pada `design.md` dengan harness existing, lalu inspect trace/screenshot yang benar-benar dihasilkan. Identifikasi viewport/media/pathname dan fase yang memakai deadline; tulis hasil run terarah meskipun PASS.
- [x] Bila hasil belum menjelaskan fase, tambahkan attachment diagnosis yang dibatasi seperti design. Pastikan seluruh count/dimensi/alt/semantic/keyboard assertions tetap berjalan. Jangan menambah timeout atau retry.
- [x] Bandingkan targeted run dan suite penuh dengan source/config sama; uji satu hipotesis per percobaan dan catat bukti yang mendukung/menolak. Pengaruh ISR membutuhkan eksperimen server produksi lokal terpisah, karena CI baseline memakai dev server.
- [x] Tulis kesimpulan diagnosis, media/fase yang terbukti, kondisi reproduksi dan batasnya. Kalau akar penyebab belum terbukti, status tetap terbuka dan rekomendasi menyebut data yang diperlukan. Jangan mengklaim flaky test selesai hanya karena beberapa run lulus.

**Deliverable:** diagnosis dapat ditinjau dan rekomendasi terikat bukti; koreksi implementasi ditentukan berdasarkan temuan, bukan timeout baru.

## Task 5 — gate dan laporan implementasi

**Files:** update bukti pada spec ini; bila diperlukan update `.kiro/specs/niuva-audit-remediation/{register-keputusan,production-readiness-boundary,completion-report}.md` untuk hasil implementasi/keputusan yang sudah ada. `docs/` milik Owner tetap tidak diedit.

- [x] Baca instruksi root/child applicable dan Next docs yang relevan, pastikan diff hanya allowlist task yang dijalankan. Jangan mengedit `AGENTS.md` untuk ordinary implementation.
- [x] Jalankan `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm test:backend`, `corepack pnpm test:integration`, `corepack pnpm db:validate`, `corepack pnpm test:e2e`, `corepack pnpm build`. Hanya laporkan angka/exit aktual; angka handoff bukan run baru.
- [x] Untuk full DB/E2E lokal, gunakan wrapper background tersembunyi dengan output ke `$env:TEMP`, pertahankan wrapper DB sampai gate selesai, dan polling ringkas. Gunakan harness `scripts/local-test-db.ps1` / `scripts/local-e2e-web.ps1`; guard test tetap. Jangan membuat `.next-*-tmp` di root atau mengimpor private env ke log.
- [x] Bila perlu validasi jalur production lokal, set nama env `NIUVA_DEPLOYMENT_TIER='production'`, `NIUVA_E2E_PORT='3101'` hanya dalam proses test dan jalankan `tests/e2e/public-content-production-path.spec.ts` dengan setup yang tepat; bukan provider/production acceptance.
- [x] Hentikan resource lokal yang dibuat task, jalankan `corepack pnpm db:test:stop`, periksa proses/listener. Periksa temporary include `tsconfig.json` sebelum memulihkan hanya entri yang memang ditambahkan proses task.
- [x] Laporkan file berubah, command, hasil gate/diagnosis, acceptance criteria, risiko dan rollback. Rekam kontrol RK-02/RK-12/RK-18 yang benar-benar selesai; jangan menutup keputusan lewat checkbox plan. Visual belum ditinjau; fisik/AT/provider/staging/production belum terverifikasi; `PUB-RELEASE` tetap `NOT_AUTHORIZED`.

Commit/push/PR tidak termasuk task ini. Jika Owner kemudian menginstruksikannya, stage explicit allowlist, gunakan branch `codex/niuva-keputusan-lanjutan` atau branch yang dipilih Owner, dan tunggu instruksi merge.
