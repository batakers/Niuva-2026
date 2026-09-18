# Niuva MVP Task List

## Phase 1: UI Foundation discovery, proof, and finalization

- [x] Task 1 — Bootstrap Next.js at the current project root.
- [x] Task 2 — Establish Vitest, React Testing Library, Playwright, and quality scripts.
- [x] Task 3a — Diskusikan dan catat UI Foundation tanpa implementasi.
- [x] Task 3b — Implementasikan foundation yang disetujui dan render Visual Proof public, checkout, serta admin.
- [x] Task 3c — Review ulang typography dan visual language UI Foundation setelah feedback owner; revised Foundation Visual Proof disetujui untuk styleguide-only pada 2026-09-03 (reopened 2026-08-29).
  - [x] Candidate v2 disetujui sebagai Typography System v1.0 pada 2026-08-29; foundation/styleguide only, tanpa propagasi product screens.
  - [x] Revised Foundation Visual Proof disetujui owner pada 2026-09-03 untuk styleguide-only; product-screen propagation tetap paused.

## Checkpoint: Foundation

- [x] Baseline lint, typecheck, test, E2E, and build pass.
- [x] UI Foundation decisions recorded as CONFIRMED/CANDIDATE/OPEN.
- [x] Desktop/mobile/keyboard/focus/reduced-motion checks recorded.
- [x] Revised Visual Proof approved and UI Foundation finalized for styleguide-only on 2026-09-03; product-screen propagation outside the named proof remains separately paused.

## Phase 2: Design System derivation

- [x] Task 4 — Define Design System contract from the finalized UI Foundation (P0/P1 contract approval recorded 2026-08-28; renewed visual gate approved for styleguide-only on 2026-09-02).
  - [x] Design System Architecture & Registry v1 documented in `/auis/styleguide` on 2026-09-02; source and promotion boundaries recorded without new dependencies or product propagation.
- [x] Task 5 — Rework and re-review the initial Design System components (visual gate approved for styleguide-only on 2026-09-02).
- [x] Motion System v1 — CSS-first token/recipe proof added to the styleguide on 2026-09-02; no new dependency or product propagation.
- [x] Pattern proof — Hero / case-study opener, Product discovery, Checkout Summary, and Admin Action Queue rendered from Niuva flow evidence on 2026-09-02.
- [x] Wireframe architecture MVP — 20-surface inventory and MVP/deferred boundary approved by owner on 2026-09-03; final visual proof and product-screen propagation remain separate gates.
- [ ] Scoped product-screen propagation proof — public homepage and `/project-brief` authorized on 2026-09-03; visual acceptance pending; checkout/admin and Creative/Decorative excluded.

## Checkpoint: Design System

- [x] Component inventory and P0/P1 contracts approved.
- [x] Architecture & Registry v1 documented with Foundation, Primitives, Core Components, Motion, Creative, Decorative, Patterns, and Governance layers.
- [x] Revised components use the reviewed foundation rules and are documented in `/auis/styleguide`; product-screen propagation remains separately paused.
- [x] No product pages were expanded before this checkpoint; new screen work remains paused until visual reapproval.
- [x] Motion System v1 and Pattern proofs received owner visual acceptance on
  2026-09-03 for styleguide-only use; product-screen promotion remains a
  separate scoped authorization.
- [x] MVP wireframe architecture received owner approval on 2026-09-03;
  customer account remains deferred and product-screen visual acceptance
  remains pending.

## Phase 3: Core vertical slices

- [ ] Task 6 — Public content and B2B project brief (link-based submission
  slice implemented; company profile copy is deferred pending official biodata;
  full private attachment/admin live acceptance remains).
- [ ] Task 7 — Ready-made catalog, stock, cart, and guest checkout.
- [ ] Task 8 — Biteship shipping and authoritative Midtrans payment.
- [ ] Task 9 — Private custom print upload, operator review, quote, and Pricing v1.
- [ ] Task 10 — Order state, secure status, thin admin, email, and observability.

## Checkpoint: Core MVP

- [ ] Retail, B2B, and custom-print flows pass their required E2E checks.
- [ ] Security, privacy, idempotency, state-transition, and failure tests pass.

## Phase 4: Reliability and launch

- [ ] Task 11 — Failure, accessibility, and Owner usability pass.
- [ ] Task 12 — Staging, backup/restore rehearsal, cost guardrails, and soft-launch gate.

## Checkpoint: Launch

- [ ] PRD Definition of Done and Tech Design success criteria are evidenced.
- [ ] Remaining risks and open business decisions are approved.

## Frontend-first execution backlog — 2026-09-06

Rincian AC, paths, dependencies dan verification: [plan.md](plan.md#frontend-first-task-map--2026-09-06).
Status: FE-00–27 UI_IMPLEMENTED; admin integration slice 2026-09-16 tersedia,
tetapi Owner/provider gates tetap terbuka. Checkbox implementasi bukan
visual acceptance atau tanda integrated MVP selesai. Checkpoint visual tetap terbuka.
Handoff dan verifikasi: [public-batch.md](../docs/frontend/public-batch.md).
Readiness report: [operational-readiness-report.md](../docs/frontend/operational-readiness-report.md).
Preview implementation FE-16–26 dipensiunkan pada 2026-09-10; checkbox terkait
tetap menjadi catatan historis, bukan source atau route yang masih dipertahankan.

## Current admin integration slice — 2026-09-17

> Handoff clarification — bagian NG-01, local-demo, dan retained-test-profile
> di bawah mempertahankan evidence dari sesi lokal sebelumnya. Bagian tersebut
> bukan klaim authenticated-admin acceptance yang baru untuk checkout ini.
> Exact Clerk identity Owner kini sudah dipasangkan ke profile loopback aktif;
> seed konten portfolio juga sudah dilakukan terpisah. Katalog Shop kini sudah
> di-seed ke loopback sebagai draft; R2 object smoke dan authenticated visual
> review tetap dicatat sebagai gate terpisah.

- [x] Detail/editor server-backed: orders, custom print, products, portfolio.
- [x] Live subview: B2B Inquiries dan Pricing Rules.
- [x] Authorized writes: order/inquiry transition, slicer review, quote draft/send,
  stock/media mapping, portfolio edit/publish guard, dan token reissue.
- [x] Guarded catalog preparation/importer: dataset Shop Owner menghasilkan 8
  produk draft, 34 varian, 4 kategori, dan 50 mapping JPG di loopback. Enam
  placeholder tanpa harga/stok dikecualikan; SKU merchandising dan keputusan
  publish masih dicatat sebagai gate di
  `docs/backend/catalog-source-audit.md`.
- [x] Exact `user_...` Owner identity sudah terhubung ke `AdminProfile` aktif
  loopback; retained authenticated Action Queue smoke lulus.
- [x] Fresh authenticated desktop visual acceptance untuk list/detail/editor
  admin setelah perubahan terakhir: Owner session aktif, route live ter-render
  pada 1280px tanpa horizontal overflow, dan tidak ada write action yang
  dijalankan.
- [x] Authenticated mobile visual acceptance untuk route admin pada viewport
  390x844: seluruh list/detail/editor route live dirender tanpa horizontal
  overflow; tabel desktop berubah menjadi kartu berlabel pada mobile; keyboard
  focus nav dan label kontrol detail diperiksa tanpa menjalankan write action.
- [x] Keputusan Owner portfolio: 11 Selected Works tetap published sebagai
  `card-only` tanpa media. Media mapping tidak boleh ditebak dan hanya opsional
  setelah aset, provenance, alt text, caption, serta izin per project disetujui.
- [ ] R2 non-production upload smoke nyata.
- [ ] Dokumentasi/tautan customer lama dikirim ulang setelah token route-bound v1
  diterbitkan pada detail order/quote; admin reissue sudah tersedia, pengiriman
  aktual menunggu daftar customer dan kanal yang disetujui Owner. Runbook:
  `docs/backend/token-reissue-handoff.md`.
- [ ] Biteship/Midtrans activation/smoke — sengaja ditunda sampai data perusahaan
  tersedia.

### Review verification — 2026-09-17

- [x] `corepack pnpm typecheck`, lint (0 error), unit 73/73, backend 119/119,
  production build, dan `git diff --check` lulus.
- [x] CI-mode Playwright (`CI=1 corepack pnpm test:e2e`, satu worker dengan
  retry) lulus 57/57. Runner lokal empat worker tetap dicatat sebagai
  diagnostik yang sensitif terhadap cold compile; tiga navigasi yang gagal di
  mode paralel lulus saat serial.
- [x] Authenticated mobile admin visual acceptance lulus pada 390x844 setelah
  perbaikan min-width kartu Products dan kartu mobile B2B Inquiries. Rute
  list/detail/editor live, empty/error state, overflow, fokus keyboard, dan
  console browser diperiksa tanpa write action.
- [ ] R2 smoke tetap terbuka. Dataset Shop sudah di-seed secara reproducible;
  SKU merchandising dan keputusan publish tetap membutuhkan Owner. Dimensi
  paket hanya diperlukan saat automatic provider-calculated shipping diaktifkan.
  Portfolio sudah memiliki keputusan Owner untuk 11 Selected Works `card-only`;
  Biteship/Midtrans tetap sengaja ditunda.

> Catatan arsip — entri FE-16–26 di bawah mempertahankan kontrak preview lama
> untuk jejak visual/regresi. Status implementasi admin saat ini adalah matriks
> **Current admin integration slice** di atas; entri arsip tidak boleh dibaca
> sebagai bukti bahwa route live masih fixture-only.

- [x] FE-00 — Kontrak screen dan status visual
- [x] FE-01 — Data contoh dan skenario preview
- [x] FE-02 — Public shell dan navigasi
- [ ] Checkpoint A — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-03 — Penyelesaian homepage `/` (Shop belum tersedia; custom sementara diarahkan ke brief)
- [x] FE-04 — Services `/services`
- [x] FE-05 — Projects `/projects`
- [ ] Checkpoint B — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-06 — Project detail `/projects/[slug]`
- [x] FE-07 — Project brief `/project-brief` (validasi client/server, POST
  persistence, reference confirmation, dan WhatsApp handoff; preview hanya
  eksplisit lewat `previewEnabled`)
- [x] FE-08 — Shop `/shop` (preview katalog, filter dan stock state; tanpa detail atau pembelian)
- [ ] Checkpoint C — technical gates lulus 2026-09-06; review visual owner masih pending.
- [x] FE-09 — Product detail `/shop/[slug]` (development-only product fixtures, variant/qty/OOS states, terhubung ke cart lokal FE-10)
- [x] FE-10 — Cart `/cart` (ID varian + qty saja, add/update/remove, empty/corrupt/unavailable states, checkout tetap nonaktif)
- [x] FE-11 — Checkout `/checkout` (guest contact/address, rate selection dan recovery preview; tanpa order/provider call)
- [ ] Checkpoint D — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-12 — Custom print landing `/custom-print` (operator-reviewed flow, format/readiness dossier, private-file and no-instant-price expectations; request remains disabled until FE-13)
- [x] FE-13 — Custom request `/custom-print/request` (metadata-only file preview, 100 MiB policy, progress/invalid/failed/expired/retry, configuration/contact validation, no API mutation, production fail-closed)
- [x] FE-14 — Quote customer `/quote/[token]` (development-only immutable dossier, accept/decline confirmation, expired/superseded/read-only states, invalid token 404, no API mutation)
- [ ] Checkpoint E — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-15 — Order status `/orders/[token]` (development-only retail/custom timeline, safe projection, loading/access/service failure, late-payment refund exception, no provider or status mutation)
- [x] **ARCHIVE — FE-16** — Admin shell dan sign-in (kontrak development-only preview; route live sekarang memakai Clerk + `requireAdmin`)
- [x] **ARCHIVE — FE-17** — Admin Action Queue `/admin` (kontrak fixture/filter; implementasi live membaca projection server dan handoff ke detail)
- [ ] Checkpoint F — focused tests, static/build gates, dan review visual sesuai plan.
- [x] **ARCHIVE — FE-18** — Admin inquiry detail dari Queue (kontrak drawer fixture; implementasi live ada di `/admin/inquiries/[id]` dengan transition terotorisasi)
- [x] **ARCHIVE — FE-19** — Admin order list `/admin/orders` (kontrak preview; implementasi live memakai repository/filter server-backed)
- [x] **ARCHIVE — FE-20** — Admin order detail dan fulfillment (kontrak drawer fixture; implementasi live menjaga measurement/permission dan menahan provider-coupled fulfillment)
- [ ] Checkpoint G — focused tests, static/build gates, dan review visual sesuai plan.
- [x] **ARCHIVE — FE-21** — Admin custom review `/admin/custom-print` (kontrak review fixture; implementasi live memakai projection, review slicer, dan audit server)
- [x] **ARCHIVE — FE-22** — Admin quote draft/preview (kontrak quote fixture; implementasi live menyediakan draft/send dengan active-rule dan token guards)
- [x] **ARCHIVE — FE-23** — Admin product list `/admin/products` (kontrak list fixture; implementasi live memakai repository dan publication/stock projection)
- [ ] Checkpoint H — focused tests, static/build gates, dan review visual sesuai plan.
- [x] **ARCHIVE — FE-24** — Admin product/variant/stock editor (kontrak editor fixture; implementasi live memakai Server Actions terotorisasi untuk stock/media dan publication guard)
- [x] **ARCHIVE — FE-25** — Admin portfolio `/admin/portfolio` (kontrak list fixture; implementasi live membaca project/media dari database)
- [x] **ARCHIVE — FE-26** — Admin portfolio editor (kontrak editor fixture; implementasi live memiliki content/media edit dan publish guard server)
- [ ] Checkpoint I — focused tests, static/build gates, dan review visual sesuai plan.
- [ ] FE-27 — Frontend acceptance dan handoff integrasi
- [ ] Checkpoint J — focused tests, static/build gates, dan review visual sesuai plan.

Provider onboarding tetap ditunda. Customer account bukan scope MVP.

## Current vertical slice — Project Brief → persistence → Action Queue → WhatsApp

Status: `TECHNICAL_GATES_PASSED_LIVE_SMOKE_PENDING` (2026-09-14).

- [x] Form publik memvalidasi field PRD dan mengirim JSON ke
  `/api/project-brief`.
- [x] `InquiryService` memvalidasi ulang, membuat reference/access token,
  menyimpan inquiry, dan mencatat audit setelah commit.
- [x] Inquiry `NEW` diproyeksikan sebagai `B2B_INQUIRY` pada server-owned Action
  Queue; halaman `/admin` tetap dilindungi Clerk + active `AdminProfile`.
- [x] Confirmation menampilkan reference number dan link WhatsApp yang dibangun
  dari kontak publik yang sudah disetujui; token akses tidak dirender.
- [x] Integration smoke mengeksekusi route nyata ke PostgreSQL test terisolasi,
  memverifikasi `B2BInquiry` berstatus `NEW`, audit submission, dan item
  `B2B_INQUIRY` pada Action Queue.
- [x] Database-owned `AdminProfile` untuk exact Clerk test identity tervalidasi
  di integration harness; live Clerk tenant login tetap manual.
- [x] Focused unit, API-boundary, backend Action Queue, dan Playwright checks
  lulus. E2E admin memakai `webServer.env` kosong untuk kedua Clerk key.
- [ ] Private binary attachment UI/provider flow, active Clerk tenant login
  smoke, dan visual acceptance product screen tetap gate terpisah.

Decision sync:

- Pricing 1–49 g dan communal ABS mengikuti
  `docs/backend/phase-3-pricing-biteship-contract.md`; active-rule seed,
  quantity semantics, dan provider activation belum dianggap selesai.
- Binary upload 100 MiB serta lifecycle 14/60/90 hari mengikuti
  `docs/backend/phase-2-closure-decisions.md`; legal/accounting retention tetap
  terbuka.

## Admin rebuild — `admin-access` task list (2026-09-10)

Status: `TECHNICAL_GATES_PASSED_LIVE_SMOKE_PENDING` on 2026-09-13. Implements the approved
[`admin-access` plan](plan.md#admin-rebuild--admin-access-plan-2026-09-10),
not the later Action Queue or any admin mutation. The direct
`dotenv@17.4.2` development dependency fix is now recorded; live Clerk tenant
smoke remains an Owner prerequisite.

### Task AA-01: Harden the server availability boundary

**Description:** Make `requireAdmin()` fail closed when the database capability
needed for `AdminProfile` authorization is absent, before it can construct a
Prisma repository.

**Acceptance criteria:**

- [x] Clerk-only configuration without a database cannot reach an admin profile
  read and returns the existing unavailable-admin error contract.
- [x] Anonymous, unprovisioned, inactive, active `ADMIN`, and active `OWNER`
  behavior remains covered by backend authorization tests.
- [x] No schema migration, provider configuration, or role policy is added;
  the separately approved direct `dotenv@17.4.2` development dependency only
  unblocks Prisma config loading.

**Verification:**

- [x] Focused backend authorization test and the full backend suite pass.
- [x] Typecheck passes.

**Dependencies:** None.

**Files likely touched:**

- `src/lib/auth/clerk.ts`
- `tests/backend/admin-auth.test.ts`

**Estimated scope:** S (2 files).

### Task AA-02: Add the minimal protected admin entry route

**Description:** Add a Server Component `/admin` route that independently calls
the hardened authorization boundary and renders a minimal, server-derived entry
state for an active profile. Unprovisioned or unavailable access produces no
protected content and no fixture fallback.

**Acceptance criteria:**

- [x] `/admin` independently awaits `requireAdmin()` before rendering any
  admin-facing content.
- [x] The successful view contains only safe, server-derived role context and
  states clearly that Action Queue is a later module.
- [x] Authorization failures do not render operational data, a fake login, or
  mutation controls.

**Verification:**

- [x] Focused route/view unit test and the full unit suite pass.
- [x] Typecheck passes.

**Dependencies:** AA-01.

**Files likely touched:**

- `src/app/admin/page.tsx`
- `src/app/admin/admin-access-view.tsx`
- `tests/unit/admin-access-view.test.tsx`

**Estimated scope:** M (3 files).

### Task AA-03: Prove the route fails closed in the browser

**Description:** Add a browser test for the existing no-Clerk-credential
environment, proving `/admin` returns the unavailable response and does not
expose retired preview or operational content.

**Acceptance criteria:**

- [x] `/admin` has a fail-closed unavailable response when Clerk credentials
  are not configured.
- [x] The browser test asserts no retired fixture marker or protected admin text
  appears in that response.
- [x] The test neither supplies a credential nor depends on a live Clerk tenant.

**Verification:**

- [x] Focused Playwright browser test passes with one worker.
- [x] Full lint error gate passes.

**Dependencies:** AA-01, AA-02.

**Files likely touched:**

- `tests/e2e/admin-access.spec.ts`

**Estimated scope:** S (1 file).

### Checkpoint: `admin-access`

- [x] AA-01 through AA-03 meet their acceptance criteria.
- [x] Full `corepack pnpm build` passes after the approved direct
  `dotenv@17.4.2` development dependency fix. `/admin` remains dynamic.
- [x] `git diff --check` passes.
- [x] No Clerk credential, database migration, provisioning policy, fixture
  fallback, admin mutation, commit, or push is added without separate approval.
- [x] Action Queue remains a separate module; its owner-approved specification
  and implementation-plan draft are tracked below.

## Admin rebuild — action-queue task list (2026-09-10)

Status: TECHNICAL_GATES_PASSED_LIVE_SMOKE_PENDING (2026-09-11). The
action-queue specification and plan were owner-approved on 2026-09-10. The
approved direct `dotenv@17.4.2` development dependency fix unblocks the
official Prisma-wrapped gates; the live Clerk smoke remains Owner work.

### Task AQ-01: Build the server-owned Action Queue projection

**Description:** Add the safe queue contract, minimal Prisma reads, source
status mapping, quote de-duplication, candidate ordering, and bounded result.
Payment-event rows and stock exceptions remain deferred under the approved
specification decisions.

**Acceptance criteria:**

- [x] Safe items exist for new inquiry, submitted custom request, quote
  preparation without a draft, draft quote, paid order, custom package
  measurement, and shipment exception.
- [x] The repository selects only allowlisted references, statuses, and
  timestamps; no PII, private-file data, payment payload/amount, or provider
  identifier reaches the list projection.
- [x] A request with a current draft quote produces only the specific
  send-quote item, with stable de-duplication identity.
- [x] Candidate ordering and the maximum of 50 items are deterministic and
  covered by tests.

**Verification:**

- [x] Direct focused backend Vitest passes (3 tests).
- [x] Direct TypeScript check passes.
- [x] Confirm no schema migration, provider, or Clerk configuration diff.
  The approved direct `dotenv@17.4.2` development dependency is the only
  dependency change.
- [x] Official `corepack pnpm test:backend` and `corepack pnpm typecheck` pass.

**Dependencies:** Approved action-queue spec and completed admin-access.

**Files likely touched:**

- src/modules/admin/action-queue.ts
- src/modules/admin/action-queue-repository.ts
- src/modules/admin/action-queue-service.ts
- tests/backend/admin-action-queue.test.ts

**Estimated scope:** M (4 files).

### Task AQ-02: Wire the projection into the protected admin page

**Description:** Replace the minimal post-access placeholder with the real
server projection and an accessible Action Queue view. Preserve the current
authorization fallback and add a safe query-error state.

**Acceptance criteria:**

- [x] /admin calls requireAdmin() before the queue service and renders no
  operational content for unavailable, unauthenticated, inactive, or forbidden
  access.
- [x] Authorized populated and empty results render server-derived references,
  next-action labels, exception text, and generation time without fixture copy
  or browser-owned status.
- [x] Query failure is recoverable and non-sensitive; the view remains
  keyboard-readable, responsive, and not color-dependent.

**Verification:**

- [x] Focused admin unit Vitest passes (7 tests across route/view coverage).
- [x] Direct TypeScript check passes.
- [x] Manual review confirms no buttons, local transitions, detail hand-off, or
  private/provider fields were added.
- [x] Official `corepack pnpm typecheck` passes.

**Dependencies:** AQ-01.

**Files likely touched:**

- src/app/admin/page.tsx
- src/app/admin/action-queue-view.tsx
- tests/unit/admin-action-queue-view.test.tsx

**Estimated scope:** M (3 files).

### Task AQ-03: Prove the route boundary in the browser

**Description:** Add a focused Playwright smoke for the real route without
Clerk credentials, proving that no legacy fixture or protected queue content is
exposed.

**Acceptance criteria:**

- [x] Missing Clerk configuration still fails closed with the existing safe
  response and no queue data.
- [x] The browser test asserts that retired preview markers and operational
  references do not appear in the unavailable response.
- [x] The test supplies no credentials, mutates no data, and does not depend on
  a development query-string role.

**Verification:**

- [x] Focused Playwright smoke passes (1 test).
- [x] `corepack pnpm lint` passes with existing warnings only.
- [x] `git diff --check` passes.

**Dependencies:** AQ-01, AQ-02.

**Files likely touched:**

- tests/e2e/admin-action-queue.spec.ts

**Estimated scope:** S (1 file).

### Checkpoint: action-queue

- [x] AQ-01 through AQ-03 meet their acceptance criteria.
- [x] Focused backend, unit, and browser checks pass.
- [x] Lint, official TypeScript, official build, and diff checks pass after the
  approved direct `dotenv@17.4.2` development dependency fix.
- [x] Current serial unit/backend regression passes (73 unit, 106 backend).
  The CI-mode one-worker E2E run completes 57 tests; one public-page navigation
  flake passed on retry. The parallel runner is resource-sensitive on this
  Windows checkout; serial execution is the reproducible browser gate.
- [x] Technical result, visual acceptance, and live integration readiness are
  reported separately.
- [ ] Owner runs the later non-production smoke only after provisioning an
  active AdminProfile in the Clerk tenant through a separate approved action.

**Implementation boundary:** The plan is approved and this slice is implemented.
The approved `dotenv@17.4.2` development dependency fix is complete. Clerk
provisioning, provider activation, schema migration, and live tenant changes
remain separate approvals.

## Next Goal — Live Clerk, private files, messaging, visual acceptance, and retail checkout (2026-09-14)

Status: `LOCAL_IMPLEMENTATION_GATES_PASSED_EXTERNAL_SMOKES_PENDING`. Previous
Project Brief integration gates are committed and pushed in `1d5b870`.

### Company biodata dependency — deferred

- [ ] **DEFERRED/OPEN:** Biodata resmi perusahaan belum tersedia. Jangan
  mengisi company profile, legal claims, identitas sender WhatsApp, atau
  metadata provider/invoice dengan data sintetis.
- [x] Pekerjaan teknis independen tetap dilanjutkan memakai fixture
  non-production: boundary Clerk lokal, R2/checkout integration harness, dan
  audit teknis visual.
- [ ] Acceptance publik/Owner, onboarding provider, dan smoke live yang
  membutuhkan identitas bisnis ditinjau ulang setelah biodata resmi tersedia.

### NG-01 — Live non-production Clerk smoke

- [x] Anonymous `/admin` locally redirects to the paired development tenant
  sign-in without exposing protected data.
- [x] Add guarded Owner provisioning command requiring explicit Clerk user ID,
  role, display name, confirmation, and a loopback development database.
- [x] Owner records the exact development Clerk user ID and provisions an active
  database-owned `AdminProfile` with the approved role.
- [x] One-worker authenticated browser smoke signs in at `/admin`, reads the
  Action Queue for the active profile, and survives reload.
- [ ] Confirm unknown/inactive profiles remain forbidden with a second Clerk
  identity or an approved temporary profile-state test.
- [x] Record only non-secret tenant/profile references; no Clerk keys are stored
  or printed.

### NG-02 — Private R2 binary vertical slice

- [x] Connect custom request upload to intent → direct signed private PUT →
  confirm; tokens stay out of rendered state.
- [x] Submit the custom request only with a verified file ID; retain preview
  fallback when R2 is unavailable.
- [x] Handle failure, expiry, metadata mismatch, retry/remove, and no-public-URL
  states at client/service boundaries; real object smoke remains open.
- [x] Document the non-production R2 setup contract: private bucket, minimum
  object permissions, exact-origin CORS, and secret-safe smoke/cleanup steps.
- [ ] Run a non-production R2 smoke proving `PENDING → UPLOADED` and private
  object access.

### Checkpoint A — private-file slice

- [x] Unit/backend/integration/browser gates pass (73 unit, 106 backend, 16
  integration, 18 focused browser tests). Integration also covers the
  protected `/admin` page from a Clerk test identity through an active
  database-owned `AdminProfile` into the real Action Queue; the full Playwright
  suite passes 57/57 with the local four-worker cap.
- [x] Test DB is stopped after smoke; no signed URL or private object key is
  retained in logs or browser-visible state.
- [ ] Owner confirms whether legal/accounting retention remains TBD.

### NG-03 — Visual acceptance

- [x] Run bounded Impeccable/browser review for `/project-brief`,
  `/custom-print/request`, and `/checkout` at compact and wide viewports.
- [x] Confirm primary action, recovery states, keyboard focus, contrast,
  responsive behavior, evidence boundaries, and no horizontal overflow.
- [x] Screen metadata now separates `server-backed`, explicit
  `frontend-preview`, and `capability-gated` states.
- [x] Fresh production-build screenshot pass at 390×900 and 1280×900 has no
  development overlay; each surface has one `h1` and no horizontal overflow.
- [ ] Owner records acceptance or explicit defects for each product surface;
  styleguide-only tokens are not silently propagated.

### NG-04 — Automatic WhatsApp

- [ ] **BLOCKED_DECISION:** Owner selects provider/API, sender identity,
  template/consent, retry/idempotency policy, and non-production recipient.
- [x] Record non-binding candidates for review: direct Meta Cloud API or
  managed Twilio WhatsApp; no provider or credential is selected silently.
- [ ] Implement server-owned post-commit notification only after that decision.
- [ ] Add sandbox success/failure/retry smoke without changing committed domain
  state.

### NG-05 — Retail checkout vertical slice

- [x] Wire server-backed catalog into Shop → Product → Cart → Checkout with a
  live-capability guard, server-rate loading, and idempotent checkout response
  handling; preview remains explicit.
- [x] PostgreSQL integration smoke covers both the real checkout route and
  service path: published catalog → server shipping rate → authoritative
  order/reservation/snapshots → payment attempt and idempotent replay with
  non-production provider adapters.
- [ ] Owner-approved product/SKU/media/stock dataset and active pricing seed are
  available in the development database. The Shop dataset is now seeded as 8
  unpublished products, 34 variants, and 50 JPG media; merchandising SKU,
  publish approval, and active pricing remain open. Package dimensions are
  conditional on provider-calculated shipping and do not block manual/flat-rate
  catalog operation.
- [ ] Connect real server rates → idempotent guest checkout → Midtrans sandbox
  handoff → verified order state; browser totals/callbacks remain advisory.
- [ ] Add integration and one-worker browser coverage for success, duplicate,
  and failure-recovery transactions (minimum three synthetic flows).

### Goal blockers / explicit boundaries

- [ ] Clerk live smoke still requires interactive Owner sign-in evidence; the
  supplied `user_...` identity is mapped to an active loopback Owner profile.
- [ ] R2 live smoke requires a complete non-production capability group and CORS
  policy; no R2 values or approved upload-limit value are present locally.
- [ ] Biteship/Midtrans live checkout requires provider accounts, sandbox keys,
  callback reachability, and an Owner-approved published catalog/pricing seed;
  provider capability is intentionally deferred by Owner.
- [ ] Automatic WhatsApp remains `BLOCKED_DECISION` until provider approval.
- [ ] Official company biodata remains `DEFERRED/OPEN` for public claims,
  business sender identity, and provider/invoice identity; no synthetic value
  may be promoted to production.
- [ ] Production provider activation and any write edge outside the current
  admin integration slice remain deferred; the allowed order/inquiry, slicer,
  quote, stock/media, portfolio, and token actions are tracked as implemented
  in the current slice above.

## Goal — Build Local Demo Mode (2026-09-15)

Status: `LOCAL_DEMO_IMPLEMENTED_SANDBOX_LIVE_GATES_PRESERVED`.

- [x] Add an explicit, loopback-only `NIUVA_RUNTIME_MODE=demo` guard for
  development/test databases.
- [x] Add idempotent local catalog seed and scripts:
  `db:demo:start`, `db:demo:migrate`, and `db:demo:seed`.
- [x] Add deterministic provider-neutral shipping/payment adapters; no external
  network call is made and persisted snapshots are labelled `DEMO`.
- [x] Add visible `Demo lokal` status, demo-specific checkout/brief copy, and a
  read-only `/demo/action-queue` projection. Production `/admin` and Clerk
  authorization remain unchanged.
- [x] Add browser E2E for Project Brief → persistence → Action Queue → catalog/
  cart → server rates → idempotent checkout (`corepack pnpm test:e2e:demo`).
- [x] Verify unit `73/73`, backend `109/109`, integration `17/17`, demo browser
  `1/1`, standard browser `57/57` (one worker), lint (0 errors), and typecheck
  on 2026-09-15.
- [ ] Keep NG-01 Clerk live smoke, NG-02 real R2 object smoke, NG-03 Owner
  visual acceptance, NG-04 WhatsApp decision/delivery, and NG-05
  Biteship/Midtrans sandbox + approved catalog/pricing evidence open.

### Local demo runbook

```text
corepack pnpm db:demo:start
corepack pnpm db:demo:migrate
corepack pnpm db:demo:seed
corepack pnpm test:e2e:demo
```

The demo ends at `PENDING_PAYMENT`; it is a deterministic local demonstration,
not a verified payment, provider smoke, Clerk session, R2 upload, WhatsApp send,
or production-readiness claim.

## Goal — Owner Visual Acceptance & Demo Handoff (2026-09-15)

Status: `TECHNICAL_REVIEW_COMPLETE_OWNER_BASELINE_ACCEPTED`.

- [x] Review `/project-brief`, `/demo/action-queue`, `/shop`, and `/checkout`
  in local demo mode at `1280x900` and `390x844`.
- [x] Confirm one `h1`, no horizontal overflow, readable primary/recovery
  actions, explicit demo/provider boundaries, and a visible keyboard focus ring.
- [x] Trigger checkout validation, fill synthetic local-only data, load the
  deterministic shipping rates, and verify the server-ledger summary; no order
  was submitted and no external provider was called.
- [x] Impeccable detector returned `[]` for the named route and shared UI
  components; browser console error collection remained empty.
- [x] Owner accepts the current baseline for each named route on 2026-09-15;
  future UI/UX changes require a new bounded review and do not inherit this
  acceptance automatically.
- [ ] Keep styleguide-only propagation and all live Clerk/R2/WhatsApp/
  Biteship/Midtrans/catalog/pricing/legal/accounting gates open.

### Handoff runbook

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-demo-web.ps1
```

Open these routes from the local server and review both viewports:

```text
/project-brief
/demo/action-queue
/shop
/checkout
```

The development-only Next.js button is tooling, not product UI. The demo badge
and deterministic providers must not be presented as Clerk, R2, WhatsApp,
Biteship, Midtrans, or production acceptance evidence.

## Goal — Clerk Non-production Smoke & AdminProfile Handoff (2026-09-15)

Status: `OWNER_RETAINED_TEST_PROFILE_HANDOFF_COMPLETE`.

- [x] Verify paired Clerk development key presence without reading or printing
  secret values.
- [x] Blank-credential browser smoke returns `503 AUTH_UNAVAILABLE` (`1/1`).
- [x] Configured anonymous `/admin` redirects (`307`) to the development
  tenant sign-in host `flying-kodiak-8886.accounts.dev` without exposing admin
  data.
- [x] Focused backend authorization tests pass (`7/7`); provisioning guard
  stops before database access when identity/role/confirmation are missing.
- [x] Pre-login Clerk sign-in surface renders `Sign in to NIUVA` and
  `Development mode`; no credential value is recorded.
- [x] Owner provides the exact non-production Clerk user ID (`user_...`),
  approved role, display name, and `I_UNDERSTAND_NON_PRODUCTION` confirmation.
- [x] Run guarded provisioning against loopback `niuva_dev` and record only
  profile `a6258b47-9d35-4a76-95c4-f8266c62069a` and non-secret references.
- [x] Authenticated `/admin` smoke survives reload, identifies the session as
  `Owner`, and renders 5 server-backed Action Queue jobs.
- [x] Verify unknown and inactive `AdminProfile` cases with an approved
  temporary local profile-state test; both states are restored afterward.
- [x] Owner explicitly approved retaining the active temporary test profile
  for subsequent development-only admin smoke on 2026-09-16.

This Goal is complete. Biodata is not a blocker; temporary state changes were
restored and the authorized local profile remains active solely for subsequent
development-only admin smoke.

## Goal — R2 Private Upload CSP & Non-production Smoke (2026-09-16)

Status: `IMPLEMENTED_CODE_VERIFIED_OWNER_R2_SMOKE_OPEN`. Existing private upload
code is not being rebuilt; this Goal closes its browser-CSP readiness and
records the automated lifecycle evidence. A real development-object smoke is
still an explicit Owner action outside source control.

- [x] R2-01 — Add a narrowly canonicalized R2 HTTPS origin to CSP `connect-src`
  only when configured; keep missing/invalid values fail-closed and add focused
  security coverage.
  - Verify: backend security coverage (116 tests), focused security-header
    browser smoke, `corepack pnpm typecheck`, `corepack pnpm lint`, and
    `corepack pnpm build` all pass.
  - Files: `src/lib/security/headers.ts`, `tests/backend/security.test.ts`.
- [ ] R2-02 — With Owner-provided non-production bucket, token, and exact-origin
  CORS configured locally, smoke one small synthetic file through intent → PUT
  → confirm → custom request, verify private lifecycle, and delete it.
  - Verify: existing unit (7 tests), integration (17 tests), and custom-request
    browser coverage pass; a real provider smoke is intentionally not run.
    Record no secret, signed URL, public URL, customer data, or object key.
  - Dependency: R2-01 and Owner setup outside source control.
- [x] Checkpoint R2 — R2-01 gates and the no-provider code slice are recorded.
  R2-02 remains open until actual non-production provider evidence exists; it
  must never be labeled production-ready from these automated tests alone.
