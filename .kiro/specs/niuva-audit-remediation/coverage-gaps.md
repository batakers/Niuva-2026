# Celah Test C1 dan I2 (pencatatan manual)

## Pembaruan terukur Tahap 12 (5 Oktober 2026)

Approval 1.10 sudah diberikan. Baseline resmi ada di `baseline-gate.md` bagian 10: tiga config memakai V8 4.1.11, masing-masing mengukur 360 file sumber, dengan `src/generated/**` dikecualikan. Bagian G1 sampai G7 di bawah adalah **snapshot historis task 1.11**, bukan status celah terkini setelah seluruh remediasi.

| Area dari snapshot | Bukti coverage suite penuh sesudah remediasi | Batas kesimpulan |
| --- | --- | --- |
| G1–G3: `portfolio/public-service.ts` | Backend: lines/functions 100%, branches 90.90%; integration: lines 95.83%, functions 100%, branches 72.72% | Fungsi publik kini benar-benar dieksekusi; tidak semua cabang teruji. Mock unit sendiri tetap 0%. |
| G4–G6: `frontend-preview/server.ts` | Integration: lines 20.93%, functions 15.78%, branches 17.85%; unit/backend 0% | Sebagian jalur tetap tidak tercakup oleh Vitest. Coverage rendah dicatat; tidak ada scope yang dikecilkan atau klaim celah tertutup seluruhnya. E2E tidak masuk denominator V8 ini. |
| G7: `/services/[slug]` | Unit: lines 93.33%, functions 88.88%, branches 80% melalui `services-render-strategy.test.tsx` | ISR 300, fallback database, filter/limit proyek, slug tidak dikenal, dan invalidasi kedua aksi portfolio diuji. Ini bukan penerimaan visual atau bukti provider. |

Transform unit untuk modul server yang sepenuhnya di-mock kini memakai alias entry server kosong resmi Next untuk `server-only`. Lima modul yang semula gagal diparse kembali ada di laporan, termasuk G1–G3 dan G4–G6; tidak ditambahkan pengecualian baru bagi modul tersebut. Usulan threshold di bawah baseline dicatat, tanpa memberlakukan threshold otomatis sebelum pengukuran.

## Snapshot manual task 1.11 (sebelum approval coverage)

Task 1.11, requirement 6.4. Dokumen ini dibuat manual karena task 1.10 (`@vitest/coverage-v8`) adalah `[APPROVAL_GATE]` yang belum disetujui dan tidak dieksekusi. Tidak ada angka coverage di sini. Tidak ada threshold otomatis yang dipasang, dan tidak ada config test yang diubah.

## Cara verifikasi

Setiap klaim di bawah diperiksa dengan `grep_search`/`Select-String` terhadap `src/` dan `tests/` pada working tree saat task ini dijalankan. Tidak ada klaim yang disalin dari ingatan atau dari `tasks.md`.

Batasan verifikasi:

- Tidak ada test, gate, atau server yang dijalankan di task ini. Catatan "tidak teruji" berarti tidak ada test yang mereferensikan fungsi itu, bukan hasil pengukuran eksekusi.
- Referensi tidak langsung lewat `vi.mock(...)` dihitung sebagai bukan pengujian fungsi yang di-mock.
- Rujukan baris adalah posisi saat verifikasi dan bisa bergeser.

Cakupan config test, dari `vitest.config.mts`, `vitest.backend.config.mts`, `vitest.integration.config.mts`, dan `playwright.config.ts`:

| Config | Include |
| --- | --- |
| unit (`test`) | `tests/unit/**/*.{test,spec}.{ts,tsx}` |
| backend (`test:backend`) | `tests/backend/**/*.{test,spec}.ts` |
| integration (`test:integration`) | `tests/integration/**/*.{test,spec}.ts` |
| e2e (`test:e2e`) | `tests/e2e` (Playwright) |

## Ringkasan celah

| ID | File | Celah | Alasan ringkas |
| --- | --- | --- | --- |
| G1 | `src/modules/portfolio/public-service.ts` | `listPublishedPortfolioProjects` tanpa test langsung | Tidak ada test yang mengimpor modul ini. |
| G2 | `src/modules/portfolio/public-service.ts` | `findPublishedPortfolioProjectBySlug` tanpa test | Sama dengan G1. Tidak ada pemanggil produksi pada runtime test/e2e. |
| G3 | `src/modules/portfolio/public-service.ts` | Helper privat `toPublicProject`, `resolvePublicMediaUrl`, `resolveDetailReadiness`, `compareEditorialOrder`, `asOptionalCopy` | Hanya terjangkau lewat G1/G2. |
| G4 | `src/features/frontend-preview/server.ts` | Cabang database `getProjectPreview` dan `getProjectPreviewBySlug` | Cabang `NODE_ENV` mengalihkan `development` dan `test` ke referensi lokal, sehingga cabang database tidak tercapai. |
| G5 | `src/app/page.tsx`, `src/app/projects/page.tsx`, `src/app/projects/[slug]/page.tsx` | Jalur `/`, `/projects`, `/projects/[slug]` terhadap sumber database | Lihat G4 dan bagian jalur. |
| G6 | `src/features/frontend-preview/server.ts` | `getLiveShopProducts`, `getLiveShopProduct`, `serializeShopProducts`, `resolvePublicProductMediaUrl` | Tidak ada test yang memanggilnya. Dicatat karena satu file dan satu pola dengan G4. |
| G7 | `src/app/services/[slug]/page.tsx` | Pemakaian `listPublishedPortfolioProjects` untuk project terkait | Tidak ada test unit/backend. Satu-satunya pemeriksaan adalah e2e. |

## G1 dan G2: fungsi di `src/modules/portfolio/public-service.ts`

Fungsi: `listPublishedPortfolioProjects` dan `findPublishedPortfolioProjectBySlug`, keduanya dibungkus `cache` dari React.

Bukti:

- Grep `listPublishedPortfolioProjects|findPublishedPortfolioProjectBySlug|portfolio/public-service` di `tests/`: 0 hasil.
- `tests/backend/portfolio-public-service.test.ts` tidak ada (`Test-Path` mengembalikan `False`). File itu baru direncanakan di task 9.1.
- Pemakai di `src/` hanya `src/features/frontend-preview/server.ts` (baris 15-17, 69, 86) dan `src/app/services/[slug]/page.tsx` (baris 10, 37, 39).

Perilaku yang belum punya penegasan test:

- Hanya record terpublikasi yang keluar. Filter `isPublished: true` ada di `PortfolioRepository`, bukan di modul ini.
- Slug tidak ada memberi `null`.
- `storageKey` privat tidak bocor. `resolvePublicMediaUrl` hanya menerima pola `media/portfolio/<slug>.(png|jpe?g|webp)` dan selain itu memberi `url: undefined`.
- `resolveDetailReadiness`: project di luar daftar approved dan `isFeatured` bernilai `false` memberi `card-only`. Project featured yang punya `challenge` atau `process` memberi `full-conservative-draft`, selain itu `summary-only`.
- `compareEditorialOrder` menaruh slug yang tidak dikenal di belakang (`Number.MAX_SAFE_INTEGER`).
- `asOptionalCopy` mengubah string kosong atau spasi menjadi `undefined`.

Alasan belum teruji: modul dibuat untuk jalur produksi. Jalur yang dipakai test adalah referensi lokal (lihat G4). Modul juga mengimpor `server-only`. Alias `server-only` belum di-stub di config unit maupun backend. Pola stub yang sudah ada di repo adalah `vi.mock("server-only", () => ({}))` di `tests/integration/admin-page-route.test.ts:8` dan `tests/integration/stock-ledger.test.ts:3`.

Cakupan terdekat yang ada, bukan pengganti:

- `tests/integration/portfolio-public-content.test.ts` menguji `PortfolioRepository.listPublishedProjects()` dan `findPublishedProjectBySlug("smart-drop-box-pg")` terhadap PostgreSQL (17 record terpublikasi). Itu lapisan repository, bukan lapisan serializer di `public-service.ts`.
- `tests/unit/public-portfolio-content.test.ts` menguji `getApprovedPortfolioProjects()` (17 project, 6 featured) dan seed, bukan `public-service.ts`.

Status: `[BUTUH_INTEGRASI]` tidak berlaku untuk penutupan celah ini. Task 9.1 memakai repository yang di-mock di config backend.

## G3: helper privat

`toPublicProject`, `resolvePublicMediaUrl`, `resolveDetailReadiness`, `compareEditorialOrder`, `asOptionalCopy` tidak diekspor. Tidak ada test, dan tidak bisa diuji langsung tanpa mengekspornya. Penutupan lewat G1/G2 dengan repository yang di-mock. Tidak perlu mengubah code produksi.

## G4 dan G5: jalur `/`, `/projects`, `/projects/[slug]` terhadap sumber database

Sumber data dipilih oleh `process.env.NODE_ENV` di `src/features/frontend-preview/server.ts`.

`getProjectPreview(requested)` (baris 54-70):

1. `resolvePreviewScenario(NODE_ENV, requested)` di `scenarios.ts`: hanya `"development"` yang bisa memberi skenario (`examples`, `empty`, `loading`, `error`). Selain itu `null`.
2. Jika skenario `null` dan `NODE_ENV` adalah `"development"` atau `"test"`: `getApprovedProjectReference()` (konten statis dari `public-content`). Database tidak disentuh.
3. Selain itu (praktis `production`, atau nilai lain): `listPublishedPortfolioProjects()` (database).

`getProjectPreviewBySlug(slug, requested)` (baris 72-90) memakai pola yang sama dan memanggil `findPublishedPortfolioProjectBySlug(slug)` di cabang database.

Akibat: cabang database hanya tercapai jika `NODE_ENV` bukan `development` dan bukan `test`. Vitest menetapkan `NODE_ENV=test` secara default, dan `playwright.config.ts` serta `scripts/local-e2e-web.ps1` menetapkan `NODE_ENV: "test"` untuk server e2e. Dengan begitu `test`, `test:backend`, `test:integration`, dan `test:e2e` sama-sama tidak mencapai cabang database untuk tiga route ini. Catatan: mode produksi (`next build` + `next start`) belum punya test otomatis untuk route ini. Saya tidak menjalankan `next dev` untuk memastikan apakah `NODE_ENV=test` dipertahankan atau ditimpa. Keduanya tetap masuk cabang referensi, jadi kesimpulan tidak berubah.

### Per route

| Route | Pemanggil | Teruji saat ini | Celah |
| --- | --- | --- | --- |
| `/` (`src/app/page.tsx`) | `getProjectPreview(undefined).catch(() => ({ projects: [] }))` di baris 65 | `tests/unit/home.test.tsx` me-mock `@/features/frontend-preview/server` dengan `projects: []`. E2E `tests/e2e/public-pages.spec.ts` mengunjungi `/` pada `NODE_ENV=test` (cabang referensi). | Cabang database tidak teruji. Fallback `.catch` saat database gagal juga tidak diuji dengan kegagalan nyata, karena mock selalu sukses. |
| `/projects` (`src/app/projects/page.tsx`) | `getProjectPreview(preview)` di baris 26 | E2E `public-pages.spec.ts:76-80` menegaskan "17 project" dan 17 `article`. 17 adalah jumlah project di referensi lokal. Tidak ada test unit/backend untuk page ini. | Cabang database tidak teruji. Tidak ada pembeda dalam test antara data referensi dan data database. |
| `/projects/[slug]` (`src/app/projects/[slug]/page.tsx`) | `getProjectPreviewBySlug` di `generateMetadata` (baris 20) dan page (baris 44) | E2E `public-pages.spec.ts:87-90` dan `tests/e2e/page-readiness.spec.ts:37` membuka `/projects/smart-drop-box-pg`, dan `/projects/slug-tidak-ada` memberi state tidak ditemukan. Semua pada cabang referensi. | Cabang database tidak teruji, termasuk `notFound()` untuk slug tidak dikenal dan project `card-only` yang berasal dari database. |

Catatan tentang `tests/e2e/global-setup.ts`: setup memang menyemai database test lewat `seedApprovedPublicContent`. Tetapi karena route ini membaca referensi lokal pada `NODE_ENV=test`, seed itu tidak mempengaruhi tiga route di atas. Seed itu dipakai oleh `/services/[slug]` (G7).

Perilaku `resolvePreviewScenario` sudah teruji: `tests/unit/frontend-preview.test.tsx` menegaskan skenario ditolak di `production`, `test`, `undefined`, dan string kosong. Yang belum teruji adalah pilihan sumber (referensi vs database), bukan pemilihan skenario.

Dampak: tidak ada test yang membuktikan bahwa mode produksi membaca database dan menampilkan hanya record terpublikasi di `/`, `/projects`, `/projects/[slug]`. Ini tetap bisa berbeda dari perilaku yang diamati di e2e.

Penutupan yang sudah direncanakan di `tasks.md`, dicatat sebagai referensi dan bukan dieksekusi di sini: 9.1 (test `public-service.ts` dengan repository di-mock), 9.7 (`resolvePublicContentSource` menggantikan pilihan `NODE_ENV`), dan task test berikutnya di Tahap 4.

## G6: fungsi katalog di `frontend-preview/server.ts`

Fungsi: `getLiveShopProducts`, `getLiveShopProduct`, `serializeShopProducts` (privat), `resolvePublicProductMediaUrl` (privat).

Bukti:

- Grep `getLiveShopProduct|serializeShopProducts|getShopPreview|getShopProductPreview|getProjectPreviewBySlug` di `tests/`: satu-satunya hasil adalah `tests/unit/customer-login-copy.test.ts:30-31`, yang hanya me-mock modul itu.
- `CatalogRepository` dipakai di `tests/integration/stock-ledger.test.ts`, bukan lewat fungsi-fungsi ini.
- `getShopPreview` dan `getShopProductPreview` juga tidak punya test langsung.

Alasan: fungsi ini terutama dipanggil oleh page `shop`, `cart`, `checkout`, yang di test unit di-mock. Dicatat sebagai celah terkait, di luar inti C1 untuk portfolio.

## G7: `src/app/services/[slug]/page.tsx`

Page ini memanggil `listPublishedPortfolioProjects()` langsung (baris 39) di dalam `try`, lalu menyaring `serviceLabel` dan `detailReadiness !== "card-only"`. Pemanggilan ini tidak lewat cabang `NODE_ENV`.

Bukti:

- `tests/unit/system-pages-coverage.test.ts:38` hanya mengecualikan route ini dengan alasan `X1-404-contract`. Itu bukan test perilaku.
- Satu-satunya pemeriksaan adalah e2e `tests/e2e/public-pages.spec.ts` (sekitar baris 202-205): `/services/design-prototyping` harus punya tepat satu tautan ke `/projects/smart-drop-box-pg` dan nol ke `/projects/elips-tandem-bike`. Ini bergantung pada database test yang disemai di `global-setup.ts`, dan `test:e2e` berstatus `[BUTUH_E2E]` (lihat 1.3).
- Blok `catch` yang menelan kegagalan database dan menampilkan daftar project kosong tidak punya test.

Ini satu-satunya jalur yang menjalankan `listPublishedPortfolioProjects` terhadap database nyata, dan hanya secara tidak langsung.

## Yang sengaja tidak dilakukan

- Tidak memasang `@vitest/coverage-v8` dan tidak mengubah `package.json`, lockfile, atau tiga file config Vitest (task 1.10 masih `[APPROVAL_GATE]`).
- Tidak memasang threshold coverage otomatis. Threshold baru boleh dibahas setelah angka baseline ada.
- Tidak menulis test dan tidak mengubah code produksi.
- Tidak menjalankan gate apa pun.

## Jika 1.10 kemudian disetujui

Task 1.11 menyebut: jika 1.10 selesai, catatan ini hanya perlu diverifikasi terhadap angka coverage. Pada saat itu:

- Cocokkan G1 sampai G3 dengan laporan coverage per fungsi untuk `src/modules/portfolio/public-service.ts`.
- Cocokkan G4 sampai G6 dengan baris/cabang `src/features/frontend-preview/server.ts` yang tidak tercakup.
- Perbarui tabel ringkasan jika ada celah yang berbeda dari catatan manual ini.
