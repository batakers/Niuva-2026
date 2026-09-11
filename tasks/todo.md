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

- [ ] Task 6 — Public content and B2B project brief.
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
Status: FE-00–21 UI_IMPLEMENTED; FE-22–27 proposed. Checkbox implementasi bukan
visual acceptance atau tanda integrated MVP selesai. Checkpoint visual tetap terbuka.
Handoff dan verifikasi: [public-batch.md](../docs/frontend/public-batch.md).
Preview implementation FE-16–26 dipensiunkan pada 2026-09-10; checkbox terkait
tetap menjadi catatan historis, bukan source atau route yang masih dipertahankan.

- [x] FE-00 — Kontrak screen dan status visual
- [x] FE-01 — Data contoh dan skenario preview
- [x] FE-02 — Public shell dan navigasi
- [ ] Checkpoint A — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-03 — Penyelesaian homepage `/` (Shop belum tersedia; custom sementara diarahkan ke brief)
- [x] FE-04 — Services `/services`
- [x] FE-05 — Projects `/projects`
- [ ] Checkpoint B — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-06 — Project detail `/projects/[slug]`
- [x] FE-07 — Project brief `/project-brief` (validasi dan simulasi, tanpa submission nyata)
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
- [x] FE-16 — Admin shell dan sign-in (development-only preview, auth unavailable/forbidden/verified-shell states, tanpa bypass Proxy/requireAdmin)
- [x] FE-17 — Admin Action Queue `/admin` (fixture development-only, filter dan detail handoff lokal; tanpa data atau aksi admin nyata)
- [ ] Checkpoint F — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-18 — Admin inquiry detail dari Queue (drawer fixture aman, company opsional, status/history dan follow-up lokal; tanpa data klien atau mutasi)
- [x] FE-19 — Admin order list `/admin/orders` (preview development-only, search/filter/exception, desktop table dan kartu mobile, selection URL lokal; tanpa data atau mutasi order nyata)
- [x] FE-20 — Admin order detail dan fulfillment (drawer fixture aman, timeline/audit lokal, edge fulfillment valid, measurement paket custom dan finance Owner-only; tanpa mutasi order, rate, shipment, payment, atau refund nyata)
- [ ] Checkpoint G — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-21 — Admin custom review `/admin/custom-print` (development-only request list/review drawer, file privat unavailable, validasi slicer lokal, tanpa file access atau mutasi)
- [x] FE-22 — Admin quote draft/preview (development-only Decimal-contract breakdown, missing-active-rule block, and immutable local sent snapshot; no real quote/rule/token/audit/provider mutation)
- [x] FE-23 — Admin product list `/admin/products` (development-only SKU search, publication/active-stock filters, explicit inactive/OOS/unpublished states, desktop table dan kartu mobile; tanpa query atau mutasi katalog nyata)
- [ ] Checkpoint H — focused tests, static/build gates, dan review visual sesuai plan.
- [x] FE-24 — Admin product/variant/stock editor (development-only identity/media state, selected variant Decimal-shaped fields, stock reason, unsaved/invalid/conflict recovery, and local-only save/publish; tanpa query atau mutasi katalog nyata)
- [x] FE-25 — Admin portfolio `/admin/portfolio` (development-only draft/published fixture list, content-readiness filter, create/edit selection lokal, dan status media/izin eksplisit; tanpa project, media, client, atau publikasi nyata)
- [x] FE-26 — Admin portfolio editor (development-only narasi, urutan media, alt text, dan gate tiga izin; intent publikasi fixture diblokir tanpa izin lengkap dan tidak pernah mempublikasikan project/client/logo/media nyata)
- [ ] Checkpoint I — focused tests, static/build gates, dan review visual sesuai plan.
- [ ] FE-27 — Frontend acceptance dan handoff integrasi
- [ ] Checkpoint J — focused tests, static/build gates, dan review visual sesuai plan.

Provider onboarding tetap ditunda. Customer account bukan scope MVP.

## Admin rebuild — `admin-access` task list (2026-09-10)

Status: `IMPLEMENTED_WITH_BUILD_BLOCKER` on 2026-09-10. Implements the approved
[`admin-access` plan](plan.md#admin-rebuild--admin-access-plan-2026-09-10),
not the later Action Queue or any admin mutation.

### Task AA-01: Harden the server availability boundary

**Description:** Make `requireAdmin()` fail closed when the database capability
needed for `AdminProfile` authorization is absent, before it can construct a
Prisma repository.

**Acceptance criteria:**

- [x] Clerk-only configuration without a database cannot reach an admin profile
  read and returns the existing unavailable-admin error contract.
- [x] Anonymous, unprovisioned, inactive, active `ADMIN`, and active `OWNER`
  behavior remains covered by backend authorization tests.
- [x] No dependency, migration, provider configuration, or role policy is added.

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
- [ ] Full `corepack pnpm build` remains blocked before source compilation:
  `prisma.config.ts` imports `dotenv/config`, while `dotenv` is not a direct
  installed dependency. Direct `next build` passes and marks `/admin` dynamic;
  no config or dependency change was made in this scope.
- [x] `git diff --check` passes.
- [x] No Clerk credential, database migration, provisioning policy, fixture
  fallback, admin mutation, commit, or push is added without separate approval.
- [x] Action Queue remains a separate module; its owner-approved specification
  and implementation-plan draft are tracked below.

## Admin rebuild — action-queue task list (2026-09-10)

Status: COMPLETE_WITH_ENVIRONMENT_BLOCKER (2026-09-11). The action-queue
specification and plan were owner-approved on 2026-09-10. The source slice is
implemented and verified; official Prisma-wrapped gates remain blocked by the
existing missing `dotenv/config` dependency.

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
- [x] Confirm no schema migration, dependency, provider, or Clerk configuration
  diff.
- [ ] Official `corepack pnpm test:backend` and `corepack pnpm typecheck` are
  blocked before test/compile by the existing missing `dotenv/config` module.

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
- [ ] Official `corepack pnpm typecheck` remains blocked by the existing
  missing `dotenv/config` module.

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
- [x] Lint, direct TypeScript, and diff checks pass. Official typecheck/build
  wrappers were attempted and remain blocked by missing `dotenv/config`; direct
  `next build` passes and marks `/admin` dynamic.
- [x] Full unit/backend regression passes (66 unit, 103 backend); full E2E's two parallel public-pages
  flakes pass on isolated rerun (6/6).
- [x] Technical result, visual acceptance, and live integration readiness are
  reported separately.
- [ ] Owner runs the later non-production smoke only after provisioning an
  active AdminProfile in the Clerk tenant through a separate approved action.

**Implementation boundary:** The plan is approved and this slice is implemented.
Clerk provisioning, provider activation, schema migration, dependency changes,
commit, and push remain separate approvals and were not performed.
