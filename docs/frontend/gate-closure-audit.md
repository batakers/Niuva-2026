# Gate Closure Audit — Checkout, Admin, Providers, Devices, and OptionChip

Status: **PARTIAL — local technical gates verified; external acceptance gates remain blocked or deferred**

Tanggal pemeriksaan: **2026-09-22**

Dokumen ini memisahkan evidence yang dapat dijalankan di checkout lokal dari
acceptance yang membutuhkan Owner, perangkat nyata, akun provider, atau
deployment production. Tidak ada provider yang diaktifkan dan tidak ada secret
yang dicatat.

## Matrix status

| Gate | Status saat ini | Evidence | Batas yang masih berlaku |
| --- | --- | --- | --- |
| Checkout | `VERIFIED_LOCAL_TECHNICAL` | `tests/e2e/checkout.spec.ts`: guest handoff, required-field focus, rate unavailable/stale recovery, payment pending/error preservation, responsive 320/390/768/1024/1280/1440 | Tidak membuktikan pembayaran, shipping, webhook, provider, atau production acceptance |
| Admin fail-closed | `VERIFIED_LOCAL_TECHNICAL` | `tests/e2e/admin-access.spec.ts` dan `tests/e2e/admin-action-queue.spec.ts`: missing Clerk configuration returns 503 without queue or fixture data | Live Clerk identity, active `AdminProfile`, and authenticated Owner smoke remain non-production gates |
| Admin authenticated surface | `ACCEPTED_NON_PRODUCTION` (historical) | Existing acceptance recorded in `docs/frontend/mvp-release-readiness.md` for `/admin`, lists, and populated details at desktop/mobile | Historical evidence is not re-used as current-batch visual acceptance; named Admin surfaces in this batch remain `UNVERIFIED` |
| Provider adapters | `LOCAL_MOCK_VERIFIED` | Backend provider/auth/action-queue suite passes; local integration uses guarded fixtures and no live provider call | Biteship, Midtrans, WhatsApp, and Resend activation require Owner/provider inputs; R2 evidence is non-production only |
| Production | `BLOCKED_EXTERNAL_INPUT` | Readiness ledger and sandbox audit identify missing deployment, production database, provider, identity, callback, and monitoring evidence | No deployment, DNS, production credential, or provider activation is authorized by this audit |
| Touch device | `PARTIAL_EMULATED` | `tests/e2e/touch-device-proof.spec.ts`: Playwright touch emulation, `tap`, 44px target geometry, selected/status update, and no overflow | Physical iOS/Android device, browser matrix, and hardware gesture behavior remain unverified |
| Screen reader | `PARTIAL_BROWSER_SEMANTICS` | Existing role/name, native button, `aria-pressed`, disabled, focus, status, and keyboard checks in `tests/e2e/auis-styleguide.spec.ts` | Physical screen-reader speech/output and browser/AT interoperability require an actual approved pair |
| OptionChip product propagation | `BLOCKED_DECISION` | `/shop/[slug]` currently uses `VariantSelector`; registry keeps `option-chip` out of `officialNiuvaComponents` and `screenPropagationAllowed=false` | No named Niuva use case currently justifies replacing VariantSelector or promoting OptionChip to Official |

## Commands and results

The checkout, Admin fail-closed, AUiS styleguide, and existing OptionChip
browser proof ran together:

```text
corepack pnpm exec playwright test tests/e2e/checkout.spec.ts tests/e2e/admin-access.spec.ts tests/e2e/admin-action-queue.spec.ts tests/e2e/auis-styleguide.spec.ts --workers=1
```

Result: **13 passed**.

The backend authorization and provider-boundary suite also passed:

```text
corepack pnpm test:backend -- tests/backend/phase3-providers.test.ts tests/backend/custom-shipping-provider.test.ts tests/backend/admin-auth.test.ts tests/backend/admin-action-queue.test.ts
```

Result: **142 passed across 28 test files**. These tests use guarded local
fixtures and do not constitute live provider verification.

Touch emulation ran with a mobile viewport and `hasTouch` context:

```text
corepack pnpm exec playwright test tests/e2e/touch-device-proof.spec.ts --workers=1
```

Result: **1 passed**. This is emulated input evidence, not physical-device
acceptance.

## Closure rules

- Foundation/Typography global authorization is independent from route visual
  acceptance, provider activation, and production readiness.
- Provider and production statuses stay blocked/deferred until the required
  Owner data, non-production resources, callback path, operational controls,
  and explicit activation decision exist.
- Touch emulation and browser semantics remain partial until an actual device
  and approved browser/screen-reader pair are tested.
- OptionChip remains styleguide-only. The current product route has a clearer
  radio/variant contract through `VariantSelector`; a future promotion needs a
  named route/use case, product proof, touch and screen-reader evidence, and a
  separate Owner decision.

## Design System audit closure — 2026-09-26

Status: **READY_FOR_OWNER_REVIEW**

Bagian ini menutup temuan Design System yang terkonfirmasi pada audit ini.
Status visual acceptance route, physical-device/AT, provider, production,
checkout, Admin, dan promotion gate tetap berdiri sebagai gate terpisah.

| ID | Status | Evidence terkonfirmasi | Closure dan batas |
| --- | --- | --- | --- |
| DS-01 | `FIXED` | `src/components/ui/button.tsx`, `input.tsx`, dan `select.tsx` menggunakan minimum height 44px; variant icon memiliki area 44×44px; label/value dapat wrapping. | Public props, variant names, keyboard behavior, focus, disabled, dan loading behavior dipertahankan. |
| DS-02 | `FIXED` | `src/components/ui/badge.tsx` memakai minimum height 24px, `h-auto`, wrapping, `max-w-full`, dan tidak clipping; `src/components/niuva/action-queue-item.tsx` tidak lagi memaksa badge `shrink-0`. | Badge dapat menerima label panjang tanpa truncation yang melanggar kontrak. |
| DS-03 | `FIXED` | `src/components/ui/Icon.tsx` menjadi typed icon boundary untuk icon product yang digunakan; direct import `lucide-react` tersisa hanya pada `Icon.tsx` dan primitive internal yang diizinkan. | Tidak ada perubahan public API/type/interface komponen; penambahan nama icon bersifat additive. |
| DS-04 | `FIXED` | Lima checkbox Admin pada pricing, product publish/variant active, dan portfolio featured/published kini menggunakan semantic `accent-primary`; token tersebut memetakan ke `--primary`/brand-700 yang sudah tersedia. | Remediation teknis selesai. Visual acceptance Admin tidak termasuk evidence batch ini; named Admin surfaces tetap `UNVERIFIED` dan marker `AdminShell` tetap `pending-owner-review`. |

### Evidence review

- Owner visual acceptance untuk `/` dan `/project-brief` pada viewport
  `320/390/768/1280` tercatat sebagai `approved-owner` pada
  `docs/frontend/product-route-proof.md` tanggal 2026-09-25.
- DS-DEC-019 tetap mengotorisasi Foundation/Typography secara global tanpa
  mempromosikan P0/P1, Motion, Patterns, Creative, Decorative, atau
  OptionChip.
- Browser evidence tetap terbatas pada Chromium/local build evidence. Bukti
  tersebut tidak menjadi physical-device/AT acceptance, provider readiness,
  atau production readiness.
- Closure ini mencakup remediation semantic token DS-04 pada lima checkbox Admin.
  Tidak ada perubahan public API, type, interface, dependency, database
  migration, atau Server Action. Perubahan runtime, lint configuration, dan
  Clerk boundary pada batch ini dicatat pada remediation sections di bawah.

### Verification recorded — 2026-09-26

- `corepack pnpm typecheck` — **PASS** (`prisma generate`, Next route typegen,
  dan `tsc --noEmit`).
- `corepack pnpm test` — **PASS**, 23 test files dan 106 tests.
- `corepack pnpm test:backend` — **PASS**, 30 test files dan 149 tests.
- `corepack pnpm db:validate` — **PASS**.
- `corepack pnpm lint` — **PASS**, 0 error dan 147 warning legacy; nested managed
  worktrees dikecualikan dari lint root melalui `eslint.config.mjs`.
- `corepack pnpm build` — **PASS**.
- `corepack pnpm test:e2e` — **PASS**, 67 tests.
- `corepack pnpm exec playwright test tests/e2e/auis-styleguide.spec.ts tests/e2e/public-pages.spec.ts --workers=1`
  — **PASS**, 13 tests.
- Static evidence — **PASS**: `components.json` valid JSON; direct import
  `lucide-react` pada area product hanya tersisa pada `Icon.tsx` dan primitive
  internal yang diizinkan (`select.tsx`, `dropdown-menu.tsx`, `dialog.tsx`);
  utility DS-04 tidak lagi terdeteksi pada area admin; seluruh lima occurrence
  menggunakan `accent-primary`.
- `corepack pnpm exec playwright test tests/e2e/admin-access.spec.ts tests/e2e/admin-action-queue.spec.ts --workers=1`
  — **PASS**, 2 tests. Evidence ini hanya membuktikan Admin fail-closed tanpa
  Clerk credentials; bukan authenticated visual acceptance.
- `git diff --check` — **PASS**. Git hanya melaporkan warning line-ending
  LF/CRLF pada working tree, tanpa whitespace error.
- Perubahan pengguna pada `README.md` dan `docs/README.md` tetap dipertahankan;
  keduanya tidak menjadi target closure patch ini.

## Owner visual review — public navigation and primitives — 2026-09-26

Status: **OWNER_VISUAL_ACCEPTED**

Owner menerima review visual scoped untuk public navigation dan primitive UI
berdasarkan Chromium/local loopback evidence. Acceptance ini tidak mengubah
status global external, physical-device/AT, provider, deployment, production,
atau authenticated Admin gate.

| Surface | Viewport | Evidence runtime | Keputusan Owner |
| --- | --- | --- | --- |
| Public navigation — Shop dan Custom Print mobile menu | 390×844 | Active route cue tampil sebagai underline 2px dengan opacity aktif; menu `flex`; `scrollWidth` 375 ≤ viewport 390; Escape menutup menu dan mengembalikan fokus ke tombol `Buka menu`. | `OWNER_VISUAL_ACCEPTED` |
| Public navigation — `/services` dan `/projects/[slug]` | 1280×900 | Exact dan dynamic route cue tampil sebagai underline 2px; tinggi header stabil 77px; `scrollWidth` 1265 ≤ viewport 1280. | `OWNER_VISUAL_ACCEPTED` |
| `/auis/styleguide` — primitive controls | 390×844 dan 1280×900 | Button minimum 44px; Input 44–46px; Select 44px; StatusNotice action 46px; Badge 26px, wrapping normal, overflow aman; tidak ada browser error/warning. | `OWNER_VISUAL_ACCEPTED` |

Reduced-motion behavior tetap dibatasi pada contract dan E2E evidence lokal
yang menggunakan `prefers-reduced-motion: reduce`. Review ini tidak mencatat
physical screen-reader output, device acceptance, provider readiness, atau
production acceptance. `docs/frontend/product-route-proof.md` tetap scoped pada
`/` dan `/project-brief`.

## Owner visual review — authenticated Admin — 2026-09-26

Status: **UNVERIFIED — browser/authentication blocker**

Review read-only dicoba pada browser Chromium-compatible Brave Work profile dan
Codex in-app Chromium dengan viewport `320×900`, `390×844`, `768×900`, dan
`1280×900`. Tidak ada credential yang diminta, dimasukkan, atau disimpan.

| Surface | Viewport | Evidence runtime | Keputusan Owner |
| --- | --- | --- | --- |
| `/admin/pricing` | 320×900, 390×844, 768×900, 1280×900 | Browser connector memblokir loopback dengan `ERR_BLOCKED_BY_CLIENT`; HTTP-only request tanpa sesi menghasilkan `500`, sehingga checkbox, focus, overflow, dan console page tidak dapat diinspeksi. | `UNVERIFIED` — belum ada visual acceptance |
| `/admin/products/[id]` | 320×900, 390×844, 768×900, 1280×900 | Tidak mencapai route karena blocker auth/browser yang sama; record non-production tidak ditebak atau dibuat. | `UNVERIFIED` — belum ada visual acceptance |
| `/admin/portfolio/[id]` | 320×900, 390×844, 768×900, 1280×900 | Tidak mencapai route karena blocker auth/browser yang sama; record non-production tidak ditebak atau dibuat. | `UNVERIFIED` — belum ada visual acceptance |

Build production berhasil dengan `corepack pnpm build`. Perintah literal
`corepack pnpm start -- -p 3000` gagal karena wrapper meneruskan `--` sebagai
project directory; ekuivalen `corepack pnpm exec next start -p 3000` berhasil
menyalakan server. Request lokal ke `/admin` dan `/admin/pricing` kemudian
menghasilkan `500`; log server menunjukkan redirect Clerk malformed ke
`/admin/sign-in` dan infinite redirect loop. Ini dicatat sebagai batas
environment/authentication, bukan temuan visual baru.

Tidak ada screenshot atau console/page evidence yang dapat diterima dari review
ini, tidak ada Server Action yang disubmit, dan tidak ada data bisnis yang
diubah. `AdminShell` tetap `pending-owner-review`; review ulang memerlukan
browser yang dapat membuka loopback dan sesi Clerk non-production yang cocok.

### Source remediation — Clerk Admin sign-in — 2026-09-26

Status: **TECHNICAL REMEDIATION APPLIED — visual acceptance remains `UNVERIFIED`**

- `/admin/sign-in` sekarang memiliki state loading yang terlihat serta fallback
  `role="alert"` untuk Clerk `failed`/`degraded`; kartu putih tidak lagi menjadi
  satu-satunya output ketika Clerk JS gagal dimuat.
- Props `SignIn` dan boundary no-key tetap dipertahankan.
- `src/proxy.ts` sekarang mengirim absolute URL `/admin/sign-in` ke
  `auth.protect`, sehingga redirect unauthenticated tidak lagi bergantung pada
  parsing URL relatif.
- Browser/Clerk provider, authenticated Owner/Admin, active `AdminProfile`, dan
  visual acceptance empat viewport tetap merupakan gate terpisah. Perubahan ini
  tidak mengubah status `AdminShell` dari `pending-owner-review`.
- Recheck browser Brave pada `http://localhost:3000/admin/sign-in` setelah build
  menampilkan `Memuat layanan login…`, lalu fallback alert dan link `Coba lagi`
  setelah Clerk timeout. Console tetap mencatat `failed_to_load_clerk_js`, jadi
  browser/provider blocker masih `OPEN` dan authenticated visual acceptance
  belum dapat dilakukan.
- `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` (22 file,
  102 test), `corepack pnpm build`, dan `git diff --check` lulus. E2E Admin
  dengan command standar menggunakan server lama yang direuse bersama `.env.local`
  dan menerima `500` alih-alih fixture blank-key `503`; verifikasi server
  `next start` terpisah dengan kedua key kosong mengembalikan `503
  AUTH_UNAVAILABLE` untuk `/admin` dan `/admin/sign-in` tanpa migration.
- Tidak ada public API/type/interface, dependency, credential, database, atau
  DS-04 yang diubah.

### Source remediation — Clerk strict CSP — 2026-09-26

Status: **TECHNICAL REMEDIATION APPLIED — authenticated Admin visual acceptance remains `UNVERIFIED`**

- `src/proxy.ts` sekarang mengaktifkan `contentSecurityPolicy: { strict: true }`
  pada `clerkMiddleware`. Absolute unauthenticated redirect, bypass
  `/admin/sign-in`, matcher, fail-closed `503`, dan server-side `requireAdmin`
  boundary tetap dipertahankan.
- `src/app/admin/layout.tsx` sekarang meneruskan `dynamic` pada
  `ClerkProvider`, sehingga nonce CSP yang dibuat Clerk dapat dipakai oleh
  script Clerk pada App Router.
- Root cause terkonfirmasi: CSP baseline sebelumnya hanya mengizinkan
  `script-src 'self'` dan `connect-src 'self'`, sehingga Clerk JS dapat dibuka
  langsung tetapi diblokir ketika dimuat oleh halaman aplikasi.
- Response `HEAD /admin/sign-in` pada build lokal menghasilkan status `200`,
  `strict-dynamic`, nonce, dan FAPI host Clerk. Response `HEAD /` tetap memakai
  CSP baseline self-only tanpa `strict-dynamic` atau nonce; propagation CSP
  Clerk tidak diperluas ke route publik.
- Tab Chrome baru memuat form Clerk setelah loading state. Console tidak
  menghasilkan error; hanya warning standar bahwa instance Clerk Development
  memakai development keys. Tidak ada credential yang dimasukkan atau
  disimpan.
- Runtime form pada instance Clerk Development juga menampilkan link `Sign up`
  meskipun source tetap mengirim `withSignUp={false}`. Ini dicatat sebagai
  `OPEN` follow-up untuk review konfigurasi/display Clerk dan kebijakan no-public-
  admin-registration; tidak diperbaiki diam-diam dalam remediation CSP.
- Server terpisah dengan publishable dan secret key kosong tetap menghasilkan
  `503 AUTH_UNAVAILABLE` untuk `/admin` dan `/admin/sign-in`, tanpa migration.
- E2E literal `corepack pnpm exec playwright test tests/e2e/admin-access.spec.ts
  tests/e2e/admin-action-queue.spec.ts --workers=1` menerima `200` alih-alih
  `503` karena menggunakan server port 3000 dengan credential Development yang
  tersedia dan `reuseExistingServer`; ini adalah batas fixture environment,
  bukan pelonggaran assertion. Verifikasi server blank-key terpisah tetap
  menghasilkan `503`.
- Test unit baru memverifikasi strict CSP pada middleware dan `dynamic` pada
  `ClerkProvider`. Tidak ada perubahan public API/type/interface, dependency,
  credential, database, migration, atau DS-04.
- Verifikasi lokal: `corepack pnpm lint` **PASS** dengan 294 warning legacy
  tanpa error; `corepack pnpm typecheck` **PASS**; `corepack pnpm test`
  **PASS** (23 file, 105 test); `corepack pnpm build` **PASS**; dan
  `git diff --check` **PASS** dengan warning line-ending LF/CRLF saja.
- Form runtime masih perlu Owner visual review authenticated pada named Admin
  surfaces. Status `AdminShell` tetap `pending-owner-review`; provider,
  physical-device/AT, dan production readiness tetap gate terpisah.

### Source remediation — Clerk Admin sign-in visual integration — 2026-09-26

Status: **TECHNICAL REMEDIATION APPLIED — Admin visual acceptance remains `UNVERIFIED`**

- `src/app/admin/sign-in/page.tsx` sekarang meneruskan `appearance` Clerk dengan
  `elevation: "flush"`, sehingga Clerk tidak lagi menampilkan raised card kedua
  di dalam surface Niuva.
- Warna Clerk dipetakan ke token semantic Niuva (`--primary`,
  `--primary-foreground`, `--foreground`, `--border`, dan `--ring`), font
  menggunakan `var(--font-body-token)`, dan tombol primary tidak lagi memakai
  shadow default Clerk.
- Root, card box, dan card Clerk dibuat responsif terhadap lebar parent; tombol
  Google, tombol Continue, dan input mempertahankan minimum height 44px.
  `min-w-0` pada layout mencegah child Clerk memaksa overflow pada viewport
  sempit.
- Props auth, state loading/error, CSP, redirect, no-key fallback, dan
  `withSignUp={false}` tetap dipertahankan. Tidak ada perubahan public
  API/type/interface, dependency, credential, database, atau Server Action.
- Link `Sign up` yang masih dapat muncul dari konfigurasi/instance Clerk tetap
  menjadi `OPEN` follow-up terpisah dan tidak disembunyikan melalui styling.
  Bahasa Clerk tetap English pada fase ini.
- Recheck read-only pada Chromium lokal setelah production build di viewport
  connector `1920×855` menunjukkan satu surface visual Niuva: `.cl-card` Clerk
  transparan tanpa border, radius, padding, atau shadow; tombol primary
  berwarna `rgb(63, 96, 127)` dengan teks putih; tombol Google, Continue, dan
  input masing-masing berukuran tinggi 44px; `scrollWidth` sama dengan
  `clientWidth`; focus keyboard pada Continue menampilkan outline 3px dari
  token ring; aturan reduced-motion tersedia; dan console error kosong.
- Connector browser pada sesi ini tidak menyediakan override viewport persis
  `320×900`, `390×844`, `768×900`, dan `1280×900`. Karena itu bukti tersebut
  bukan visual acceptance empat viewport; recheck responsive/Owner tetap
  `UNVERIFIED` dan harus dilakukan pada browser/viewport yang tersedia bagi
  Owner.
- Review browser empat viewport, authenticated Owner/Admin, dan keputusan
  visual Admin tetap gate terpisah. Sampai Owner menyelesaikan review
  authenticated, `AdminShell` tetap `pending-owner-review` dan status surface
  ini `UNVERIFIED`.

## Admin visual review status — authenticated Admin DS-04 — 2026-09-26

Status: **UNVERIFIED — Owner review belum dilakukan**

Perubahan DS-04 pada checkbox sudah diverifikasi secara teknis, tetapi batch ini
belum memiliki review visual Owner pada Google Chrome/Chromium dengan sesi Clerk
Development non-production. Tidak ada credential, session data, atau record
reference yang diminta, disimpan, atau dipakai untuk menutup gate.

| Surface | Browser | Viewport | Evidence runtime dan keputusan Owner |
| --- | --- | --- | --- |
| `/admin/pricing` | Google Chrome / Chromium lokal | 320×900, 390×844, 768×900, 1280×900 | Technical target: checkbox `accent-primary`, label, keyboard focus, checked/disabled/error state bila tersedia, wrapping, overflow, dan console/page error perlu direview Owner. **`UNVERIFIED`** |
| `/admin/products/[id]` | Google Chrome / Chromium lokal | 320×900, 390×844, 768×900, 1280×900 | Technical target: publish dan variant-active checkbox, label association, semantic state, overflow, dan console/page error perlu direview Owner. **`UNVERIFIED`** |
| `/admin/portfolio/[id]` | Google Chrome / Chromium lokal | 320×900, 390×844, 768×900, 1280×900 | Technical target: featured dan published checkbox, label association, semantic state, overflow, dan console/page error perlu direview Owner. **`UNVERIFIED`** |

Review ini belum menghasilkan acceptance untuk tiga surface dan empat viewport
yang dinamai. `AdminShell` global tetap `pending-owner-review`; entry ini hanya
mencatat target review dan tidak mengubah registry product-screen proof.

Tidak ada Server Action yang disubmit atau data bisnis yang diubah. Physical-
device/AT, provider readiness, production readiness, P0/P1, Motion, Patterns,
Creative, Decorative, dan OptionChip tetap menjadi gate terpisah.

## Admin visual review status — global authenticated Admin — 2026-09-26

Status saat bagian ini dicatat, sebelum keputusan Owner di bawah: **UNVERIFIED —
Owner review belum dilakukan** untuk area Admin yang tercantum pada batch ini.

Foundation/Typography, semantic token, Clerk states, CSP, dan responsive
geometry memiliki evidence teknis lokal. Namun tidak ada review visual Owner
authenticated pada Google Chrome/Chromium untuk viewport `320×900`, `390×844`,
`768×900`, dan `1280×900` yang dapat dicatat sebagai acceptance. Tidak ada
credential, session data, fixture bisnis, Server Action, atau perubahan data
bisnis yang digunakan.

| Surface | Scope yang diterima | Viewport | Keputusan Owner |
| --- | --- | --- | --- |
| `/admin` | Action Queue dan AdminShell | 320×900, 390×844, 768×900, 1280×900 | Responsive layout, no horizontal overflow, keyboard/focus-visible, semantic states, reduced motion, dan console/page error masih perlu review Owner; **`UNVERIFIED`** |
| `/admin/orders` dan `/admin/orders/[id]` | Orders dan detail order dalam AdminShell | 320×900, 390×844, 768×900, 1280×900 | Review authenticated route masih terbuka; **`UNVERIFIED`** |
| `/admin/custom-print` dan `/admin/custom-print/[id]` | Custom Print dan detail custom print dalam AdminShell | 320×900, 390×844, 768×900, 1280×900 | Empty/data state dan responsive review masih terbuka; **`UNVERIFIED`** |
| `/admin/products` dan `/admin/products/[id]` | Products dan detail product dalam AdminShell | 320×900, 390×844, 768×900, 1280×900 | Review authenticated route dan control state masih terbuka; **`UNVERIFIED`** |
| `/admin/portfolio` dan `/admin/portfolio/[id]` | Portfolio dan detail portfolio dalam AdminShell | 320×900, 390×844, 768×900, 1280×900 | Review authenticated route dan control state masih terbuka; **`UNVERIFIED`** |
| `/admin/inquiries` dan `/admin/inquiries/[id]` | B2B Inquiries dan detail inquiry dalam AdminShell | 320×900, 390×844, 768×900, 1280×900 | Review authenticated route dan data/empty state masih terbuka; **`UNVERIFIED`** |
| `/admin/pricing` | Pricing dalam AdminShell; DS-04 `accent-primary` | 320×900, 390×844, 768×900, 1280×900 | Checkbox, label, keyboard focus, semantic state, dan warna semantic primary masih perlu review Owner; **`UNVERIFIED`** |
| `/admin/sign-in` | Auth surface Clerk terpisah; route ini tidak merender AdminShell | 320×900, 390×844, 768×900, 1280×900 | Loading/error/recovery, layout, focus-visible, control target, reduced motion, dan console/page error masih perlu review Owner; **`UNVERIFIED`** |

Status ini tidak mengubah evidence historis pada `docs/frontend/mvp-release-readiness.md`
dan tidak mengubah named public route proof. Runtime marker pada `AdminShell`
tetap `data-product-screen-proof-status="pending-owner-review"`.

Acceptance ini tetap terbatas pada browser/local non-production evidence. Ini
bukan production readiness, provider readiness, deployment approval,
physical-device/AT acceptance, atau promosi P0/P1, Motion, Patterns, Creative,
Decorative, dan OptionChip. Registry product-screen proof pada
`design-system.ts` dan `components.json` tetap scoped pada `/` dan
`/project-brief` serta tidak berubah.

## Browser revalidation — authenticated Admin — 2026-09-26

Status pada batch browser awal: **PARTIAL_BROWSER_REVIEW**; saat itu global
Admin visual acceptance masih `UNVERIFIED` dan runtime marker `AdminShell`
masih `pending-owner-review`.
Owner sudah menyatakan persetujuan global dalam percakapan, tetapi pemeriksaan
browser pada batch ini menemukan overflow baru. Persetujuan tersebut belum
dicatat sebagai hasil lolos untuk seluruh route dan viewport.

`corepack pnpm build` **PASS**. PostgreSQL development yang sudah ada dan Next
production server dijalankan pada loopback (`127.0.0.1:55433` dan `::1:3000`)
tanpa migration, seed, atau reset. Browser authenticated yang benar-benar dipakai
adalah Brave Work (berbasis Chromium) dengan sesi Clerk Development Owner yang
valid; `/admin/sign-in` diperiksa tanpa sesi pada Codex in-app Chromium.
Tautan detail diambil dari daftar record non-production yang sudah ada, tanpa
mencatat ID, credential, session data, atau isi bisnis. Sebanyak 52 kombinasi
route/viewport diperiksa; screenshot hanya ditahan sementara dalam sesi browser
untuk inspeksi, bukan disimpan sebagai berkas atau dalam repository. Tidak ada
form atau Server Action yang disubmit. Pada 48 kombinasi authenticated, heading
utama dirender, navigasi Tab mencapai focus ring yang terlihat, dan tidak ada
console/page error. State error/disabled yang tidak muncul pada data tersedia
tidak dipaksakan lewat perubahan record.

| Surface | Viewport | Observasi browser | Status batch |
| --- | --- | --- | --- |
| `/admin` | 320×900, 390×844, 768×900, 1280×900 | Action Queue dirender; tidak ada horizontal overflow atau console error; focus keyboard terlihat. | `REVIEWED_LOCAL` |
| `/admin/orders` dan `/admin/orders/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar dan detail dari record yang tersedia dirender; tidak ada horizontal overflow atau console error; focus keyboard terlihat. | `REVIEWED_LOCAL` |
| `/admin/custom-print` dan `/admin/custom-print/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar dan detail dari record yang tersedia dirender; tidak ada horizontal overflow atau console error; focus keyboard terlihat. | `REVIEWED_LOCAL` |
| `/admin/products` dan `/admin/products/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar dan detail dirender tanpa horizontal overflow atau console error. Dua checkbox pada detail memiliki label terkait dengan tinggi 44px, focus-visible, dan computed `accent-color: rgb(63, 96, 127)` pada seluruh viewport. | `REVIEWED_LOCAL` |
| `/admin/portfolio` dan `/admin/portfolio/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar dan detail dirender tanpa horizontal overflow atau console error. Dua checkbox pada detail memiliki label terkait dengan tinggi 44px, focus-visible, dan computed `accent-color: rgb(63, 96, 127)` pada seluruh viewport. | `REVIEWED_LOCAL` |
| `/admin/inquiries` dan `/admin/inquiries/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar dan detail dari record yang tersedia dirender; tidak ada horizontal overflow atau console error; focus keyboard terlihat. | `REVIEWED_LOCAL` |
| `/admin/pricing` | 320×900, 390×844, 768×900, 1280×900 | Horizontal overflow pada 320px: `scrollWidth` 466 vs `clientWidth` 305; pada 390px: 466 vs 375. Tidak ada overflow pada 768/1280px; focus terlihat dan console error kosong. `PricingCard` melebar hingga 446px; `<pre>` JSON menjadi 404px. | `OPEN` — visual remediation candidate |
| `/admin/sign-in` | 320×900, 390×844, 768×900, 1280×900 | Form Clerk dirender tanpa horizontal overflow atau console error; tiga control yang benar-benar terlihat masing-masing minimal 44px, tombol primary `rgb(63, 96, 127)`, dan focus keyboard terlihat. Link `Sign up` masih muncul sesuai follow-up `OPEN` sebelumnya. | `REVIEWED_LOCAL` dengan follow-up terpisah |

Overflow Pricing berasal dari area `PricingCard`/`<pre>` pada
`src/app/admin/pricing/page.tsx`; penyesuaian ukuran intrinsik dan scroll
internal menjadi candidate remediation, tidak diterapkan dalam review ini.
Checkbox aktivasi Pricing DS-04 tidak dirender karena rule development sudah
aktif. Source menampilkannya hanya saat belum ada active rule, sehingga visual
state checkbox Pricing tetap `UNVERIFIED` tanpa mengubah database atau membuat
fixture. Checkbox Product dan Portfolio telah diperiksa pada empat viewport.

Browser ini tidak mengemulasikan `prefers-reduced-motion: reduce`; aturan global
tersedia di `src/app/globals.css`, tetapi perilaku runtime reduced motion pada
Admin tetap `UNVERIFIED`. Hasil ini juga bukan physical-device/AT, provider,
deployment, atau production acceptance. Histori blocker di atas dipertahankan;
`design-system.ts`, `components.json`, dan assertion unit `AdminShell` tidak
dipromosikan oleh review parsial ini.

## Remediation Pricing dan browser revalidation — 2026-09-26

Status teknis: **FIXED** untuk overflow `/admin/pricing` dan penentuan form
aktivasi dari daftar terpaginasikan. Pada akhir batch remediation ini, visual
acceptance global Admin masih **UNVERIFIED** dan marker `AdminShell` masih
`pending-owner-review`, menunggu keputusan Owner yang kini dicatat pada bagian
terbaru di bawah. Entry browser sebelumnya tetap menjadi histori sebelum
remediation ini.

`PricingCard` kini dapat menyusut di viewport sempit. Definisi JSON tetap
berformat `<pre>`, memiliki nama aksesibel dan fokus keyboard, serta scroll
horizontal di dalam blok tersebut. Pada 320×900, lebar dokumen/client sama-sama
305px, lebar kartu 263px, dan `pre` memiliki `clientWidth` 206px versus
`scrollWidth` 387px. Pada 390×844, lebar dokumen/client sama-sama 375px,
kartu 333px, dan `pre` 276px versus 387px. Tombol panah menggeser `pre`
secara horizontal (terukur `scrollLeft` 40px) dengan focus ring terlihat.
Pada 768×900 dan 1280×900 juga tidak ada overflow halaman.

Halaman Pricing sekarang membaca rule aktif melalui `getActivePricingRule()`
terpisah dari daftar yang tetap terpaginasikan. Ringkasan Active, notice, dan
form aktivasi memakai status global tersebut; hitungan Draft / retired tetap
berdasarkan item yang tampil. Gagal membaca status rule aktif menghasilkan
fallback data-unavailable, bukan form aktivasi. Halaman daftar kosong di page
lanjutan tidak lagi menyatakan "Belum ada pricing rule" ketika status global
menunjukkan rule aktif. Unit test membuktikan rule aktif di luar halaman daftar,
halaman lanjutan kosong, kondisi tanpa rule aktif, kegagalan pembacaan, dan kelas
pembatas/akses keyboard JSON. Tidak ada Server Action yang dipanggil.

Browser authenticated: **Brave Work (Chromium)** dengan sesi Clerk Development
Owner yang sudah tersedia. Browser sign-in tanpa sesi: **Codex in-app Chromium**.
Database development dan Next production server tetap hanya di loopback
(`127.0.0.1:55433` dan `::1:3000`); tidak ada migration, seed, reset, fixture,
atau perubahan data bisnis. ID record detail yang tersedia digunakan hanya
untuk navigasi lokal dan tidak dicatat di dokumen ini.

| Surface | Viewport yang diperiksa | Hasil runtime |
| --- | --- | --- |
| `/admin` | 320×900, 390×844, 768×900, 1280×900 | Action Queue dirender; tanpa overflow; Tab/focus ring terlihat. |
| `/admin/orders` dan `/admin/orders/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar/detail dirender; tanpa overflow; Tab/focus ring terlihat. |
| `/admin/custom-print` dan `/admin/custom-print/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar/detail dirender; tanpa overflow; Tab/focus ring terlihat. |
| `/admin/products` dan `/admin/products/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar/detail dirender; tanpa overflow; dua checkbox detail berwarna `rgb(63, 96, 127)` dengan label setinggi 44px pada setiap viewport. |
| `/admin/portfolio` dan `/admin/portfolio/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar/detail dirender; tanpa overflow; dua checkbox detail berwarna `rgb(63, 96, 127)` dengan label setinggi 44px pada setiap viewport. |
| `/admin/inquiries` dan `/admin/inquiries/[id]` | 320×900, 390×844, 768×900, 1280×900 | Daftar/detail dirender; tanpa overflow; Tab/focus ring terlihat. |
| `/admin/pricing` | 320×900, 390×844, 768×900, 1280×900 | Tanpa overflow halaman; JSON dapat di-scroll di dalam kartu melalui keyboard; checkbox aktivasi tidak dirender karena rule development aktif. |
| `/admin/sign-in` (sesi tanpa autentikasi) | 320×900, 390×844, 768×900, 1280×900 | Form Clerk dirender; tanpa overflow; tiga control terlihat masing-masing 44px; tombol primary `rgb(63, 96, 127)`; Tab/focus ring terlihat. Link `Sign up` yang sudah diketahui tetap `OPEN` terpisah. |

Total 48 kombinasi authenticated dan empat kombinasi sign-in diperiksa.
Tidak ada heading utama yang hilang, overflow halaman, atau focus ring yang
tidak terlihat. Tidak ada error dengan stack aplikasi yang teramati pada
pemeriksaan ulang; dua error awal berupa listener pesan ekstensi dan delapan
error lain memiliki stack `chrome-extension://` pada daftar Inquiries 320px.
Keduanya dicatat terpisah, sehingga ini bukan klaim bahwa profil browser bebas
error. Screenshot non-sensitif kartu Pricing dan sign-in diambil untuk inspeksi
sementara dalam sesi browser, tetapi konektor tidak menyediakan ekspor berkas;
permintaan menyimpan screenshot di luar repository **belum terpenuhi**.

Setelah patch pesan halaman daftar kosong dan build ulang, `/admin/pricing`
diperiksa kembali pada keempat viewport. Lebar dokumen/client sama di setiap
viewport: 305/305px, 375/375px, 753/753px, dan 1265/1265px. Pada 320px,
`pre` memiliki `scrollWidth` 387px versus `clientWidth` 206px; tombol panah
menggeser konten 40px dan focus ring terlihat. Tidak ada console error pada
tab Pricing dalam pemeriksaan terakhir. `/admin/pricing?page=2` juga dibuka
secara read-only: notice rule aktif dan pesan "Tidak ada versi rule di halaman
ini" tampil, tanpa form aktivasi atau pesan palsu "Belum ada pricing rule".
Pagination ini hanya memeriksa konsistensi status, bukan pengganti state nyata
tanpa rule aktif untuk meninjau checkbox.

Browser tidak menyediakan emulasi `prefers-reduced-motion: reduce`, sehingga
perilaku Admin pada mode tersebut tetap **UNVERIFIED** meski aturan global CSS
tersedia. Checkbox aktivasi Pricing tetap **UNVERIFIED** karena kondisi tanpa
rule aktif tidak tersedia; halaman terpaginasikan tidak dipakai sebagai
pengganti kondisi tersebut. Status `AdminShell`, assertion unit, registry proof
publik, serta gate physical-device/AT, provider, deployment, dan production
tidak dipromosikan. `corepack pnpm lint` lulus dengan 147 warning existing;
`typecheck`, 111 unit test, dan `build` lulus. E2E default tidak dijalankan
karena skrip servernya menjalankan migration.

## Owner visual acceptance Admin global — 2026-09-26

Status terbaru: **OWNER_VISUAL_ACCEPTED**. Owner menyetujui acceptance visual
global Admin dalam percakapan pada 2026-09-26. Runtime marker `AdminShell`
sekarang `approved-owner`; assertion unit memeriksa marker tersebut. Status ini
berlaku untuk browser lokal/non-production dan empat viewport yang direview:
320×900, 390×844, 768×900, serta 1280×900.

Acceptance mencakup `/admin`, daftar dan detail Orders, Custom Print, Products,
Portfolio, dan B2B Inquiries, serta `/admin/pricing`. `/admin/sign-in` diterima
sebagai auth surface terpisah; route tersebut tidak merender `AdminShell`.
Bukti browser pada section sebelumnya mencatat 48 kombinasi authenticated dan
empat kombinasi sign-in, responsive layout, horizontal overflow, keyboard dan
focus-visible, state yang tersedia, warna DS-04 `accent-primary`, serta hasil
console/page error sesuai catatan per browser.

Owner menutup acceptance global dengan catatan bahwa checkbox aktivasi Pricing
pada kondisi tanpa rule aktif belum ditampilkan dalam sesi browser, reduced
motion belum diuji melalui emulasi browser, dan screenshot sementara belum
dapat diekspor sebagai berkas. Ketiga keterbatasan ini tetap tercatat sebagai
bukti yang belum diuji; keputusan Owner mencakup status visual global Admin.
Entry `UNVERIFIED` sebelumnya dipertahankan sebagai histori dan section ini
menjadi status terbaru. Registry product-screen proof tetap scoped pada `/` dan
`/project-brief`.

Acceptance ini hanya untuk bukti browser lokal/non-production. Physical-device
dan AT, provider, deployment, production, serta promosi P0/P1, Motion, Patterns,
Creative, Decorative, dan OptionChip tetap memiliki gate masing-masing.

## Required next evidence

1. Owner supplies the exact non-production provider accounts, callback origins,
   test catalog/address, sender/recipient policy, and activation order before
   any provider smoke.
2. Owner supplies the approved staging/production deployment target, domain/DNS
   ownership, production database, monitoring, backup/rollback, and release
   acceptance plan before production work.
3. Run the touch matrix on at least one physical iOS and one physical Android
   device, then run an approved browser/screen-reader pair and record speech,
   focus, state, and recovery results.
4. Reopen OptionChip propagation only when a named product use case is approved;
   until then, keep `VariantSelector` on `/shop/[slug]` and keep OptionChip out
   of `officialNiuvaComponents`.
