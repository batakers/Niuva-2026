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
Status: FE-00–18 UI_IMPLEMENTED; FE-19–27 proposed. Checkbox implementasi bukan
visual acceptance atau tanda integrated MVP selesai. Checkpoint visual tetap terbuka.
Handoff dan verifikasi: [public-batch.md](../docs/frontend/public-batch.md).

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
- [ ] FE-19 — Admin order list `/admin/orders`
- [ ] FE-20 — Admin order detail dan fulfillment
- [ ] Checkpoint G — focused tests, static/build gates, dan review visual sesuai plan.
- [ ] FE-21 — Admin custom review `/admin/custom-print`
- [ ] FE-22 — Admin quote draft/preview
- [ ] FE-23 — Admin product list `/admin/products`
- [ ] Checkpoint H — focused tests, static/build gates, dan review visual sesuai plan.
- [ ] FE-24 — Admin product/variant/stock editor
- [ ] FE-25 — Admin portfolio `/admin/portfolio`
- [ ] FE-26 — Admin portfolio editor
- [ ] Checkpoint I — focused tests, static/build gates, dan review visual sesuai plan.
- [ ] FE-27 — Frontend acceptance dan handoff integrasi
- [ ] Checkpoint J — focused tests, static/build gates, dan review visual sesuai plan.

Provider onboarding tetap ditunda. Customer account bukan scope MVP.
