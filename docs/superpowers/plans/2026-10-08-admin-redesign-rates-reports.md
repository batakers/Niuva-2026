# Niuva Admin Tariffs, Reports, and Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` after implementation authorization; delegation only when explicitly chosen. Read master/spec. C1 requires A1; C2–C3 require B5 read contracts.

**Goal:** Menyediakan Tarif Custom Print yang dapat diedit Owner, Laporan terpusat, Overview bento final, dan bukti seluruh alur Admin.

**Architecture:** Add a versioned pricing definition beside the frozen v1 contract; use assigned policy snapshots for sent quotes and active policy for new work. Compose reports/Overview from existing attention/analytics plus FinanceReadService, isolating each source failure. Use existing UI/SVG primitives rather than a new analytics platform.

**Tech Stack:** Existing PricingRuleVersion/MoneyDecimal, Zod, Prisma transactions, AnalyticsService range `30d|13m`, React/Tailwind/SVG, Vitest/Playwright.

**Spec:** [S01–S04, S17–S20 and all final acceptance](../specs/2026-10-08-admin-redesign-design.md). **Master:** [global plan](2026-10-08-admin-redesign-implementation.md).

## Global Constraints

- Tarif: Owner-only, Ubah → Tinjau → Terapkan, immediate atomic version application, no saved-draft phase.
- Frozen v1 remains readable with its exact original values; no silently changed quantity semantics, tier boundaries, minimum, rounding, quote total, or provider readiness.
- New calculations use active policy; issued quotes honor bound snapshots subject to existing expiry/review/model/ownership gates.
- Overview same composition for Owner/Admin; attention is current outstanding work, while business/traffic follow Jakarta `30d|13m` period.
- Charts/metrics use real available data; no profit, unique visitors, attribution, growth percentage, AI/widget customization, or Discount feature introduced.
- All master constraints on permissions, safety, tokens, secret handling, execution scope, and acceptance apply.

## Review Focus

1. Applying rates concurrently or failing halfway: exactly one active version, no lost old policy or fake success (C1).
2. Historical sent quote after policy changes versus changed review/file/expiry: preserve quoted total, retain real accept/send safeguards (C1).
3. Receipt counted from draft invoice or repeated webhook; corrections/refund exceptions; Jakarta midnight/month boundary (C2).
4. Finance/traffic/notification query fails independently: operational navigation and other Overview sections remain usable (C3).
5. Every named Admin route, keyboard focus, narrow viewport, reduced motion and active/deactivated actor: actual-route evidence rather than a separate prototype (C4).

## C1 — Versioned editable tariffs and Owner UI

**Files:** Modify `src/modules/pricing/policy.ts`, `calculator.ts`, `admin-service.ts`, `src/modules/custom-print/customer-preview.ts`, `estimate.ts`, `src/modules/custom-print/repository.ts` (`CustomPrintQuoteRepository`), `src/modules/quote/service.ts`, `prisma/schema.prisma`, `src/app/admin/pricing/page.tsx`; inspect/preserve `src/modules/quote/immutability.ts` and `transitions.ts`; create a new `custom_print_rate_versions` migration if needed for active-rule constraints, `src/modules/pricing/tariff-service.ts`, `tariff-repository.ts`, `src/app/admin/settings/custom-print-rates/page.tsx`, `actions.ts`, `tariff-form.tsx`; tests `tests/backend/pricing.test.ts`, `pricing-admin.test.ts`, new `tests/integration/custom-print-tariff-versions.test.ts`, `tests/e2e-admin-auth/admin-tariffs.spec.ts`.

**Interfaces:** Preserve exported frozen-v1 constants and existing `calculatePrintQuote(input: StandardPrintInput): PrintCalculation`. Define `EditableRates` in `policy.ts` with existing field names: standardNiuvaStockRateRpPerGram (PLA/ABS, three IDR strings each), standardPrintTimeRateRpPerHour, customerOwnedFilamentRateRpPerGram, communalFilamentRateRpPerGram. `TariffService.load(access)`, `preview(access, input: unknown): Promise<TariffPreview>`, `apply(access, input: unknown): Promise<{id: string; version: number}>`. Preview includes before/after/rate differences, expectedActiveId/version, normalized review fingerprint, and server-calculated example. Apply requires those values plus explicit confirmation.

- [ ] Keep all current v1 golden cases, including tier weights 199/200/201/499/500/501g and HALF_UP. Add valid definition version>=2 with canonical positive integer IDR strings and fixed calculation semantics; modified v1 literals remain rejected. Add both-role direct-action tests: Admin preview/apply forbidden; Owner allowed in permitted development environment.
- [ ] Add synthetic test fixture only: PLA first tier 1100/g, machine 5000/hour; new 100g/1hour quantity1 → 115000. Old issued v1 quote 105000 stays 105000 after application. Model/review change or expired old quote still rejects acceptance. No TEST rate is seeded into real active policy.

  ```ts
  expect(oldIssuedQuoteAfterApply.finalTotalRp).toBe("105000");
  expect(newCalculation.finalTotalRp.toString()).toBe("115000");
  expect(activeVersions).toHaveLength(1);
  ```

- [ ] Run `corepack pnpm test:backend -- tests/backend/pricing.test.ts tests/backend/pricing-admin.test.ts`, then integration wrapper for new race/quote cases; observe expected missing behavior.
- [ ] Keep strict frozen-v1 reader; add strict >=2 reader/normalizer for the same policy family, with editable rates and preserved PER_UNIT semantics for new versions, NO_MINIMUM_PROGRESSIVE_TIER, HALF_UP_FINAL_TOTAL_ONLY. Keep progressive 0–200g / next 300g / above 500g algorithm and NIUVA_STOCK versus own/communal machine-charge rules. Legacy explicit AGGREGATE snapshots remain readable; UI introduces no quantity toggle.
- [ ] Implement load/preview and transactional apply: lock policy family, verify expected active version and review fingerprint, revalidate rates/Owner/confirmation, insert new ACTIVE version and retire previous in the same transaction, audit before/after. Add partial unique ACTIVE-per-code constraint only after reporting duplicates safely; do not repair unexpected data automatically. On conflict/failure old active survives and client input remains. Keep existing non-production/loopback activation protection; provider activation remains separate.
- [ ] Update all policy consumers identified above. New preview/estimate/draft/send use current active version and stale-draft checks. Already SENT quotes accept/revalidate using their assigned immutable policy/estimate/review snapshots; do not substitute newest ACTIVE into old quote pricing. Continue current file verification, changed-review, ownership, expiry, bounds, idempotency, payment preparation and inventory/shipping constraints.
- [ ] Build business-readable tariff groups PLA/ABS and progressive weight bands; Niuva filament/machine rate versus own/communal rates. UI exposes Ubah→Tinjau (differences and same-input old/new example)→Terapkan; no draft save. History shows actor/time/version and rates. Legacy `/admin/pricing` safely redirects Owner. No hardcoded new price defaults, discount, margin, rounding, or minimum added.
- [ ] Run golden/backend/integration/browser tests, typecheck/schema validate. Deliverable: actual editable versioned tariffs with backwards-compatible quote behavior.

## C2 — Central operational, financial, and traffic reports

**Files:** Create `src/modules/admin/reports/types.ts`, `service.ts`, `src/app/admin/reports/page.tsx`, `report-view.tsx`, `src/components/niuva/admin-trend-chart.tsx`; reuse `src/modules/analytics/contract.ts`, `service.ts`, `repository.ts`, B5 FinanceSummary. Tests `tests/unit/admin-reports.test.ts`, `tests/integration/admin-reports.test.ts`, `tests/e2e-admin-auth/admin-reports.spec.ts`.

**Interfaces:** `AdminReportTab = "summary" | "orders" | "custom-print" | "b2b" | "finance" | "traffic"`. `AdminReportsService.load(access, raw): Promise<AdminReportsData>` validates tab/range and returns independently resolved sections. Reuse ReportRange/ReportWindow and `FinanceReadService.summary(access, range)`. `AdminTrendChart` consumes ISO period keys + canonical display values and an accessible tabular alternative; it does not calculate authoritative totals.

- [ ] Test range/tab parsing, dates either side of Jakarta midnight/month, zero-fill periods, separate createdAt versus paidAt metrics, repeated provider event, manual correction, expense reversal, and source-specific errors. Draft invoice does not increase receipts; partial-refund unknown amounts remain flagged, not guessed.

  ```ts
  expect(report.range).toBe("30d"); // invalid range fallback
  expect(report.finance.status).toBe("unavailable");
  expect(report.operations.status).toBe("ok"); // finance failure isolated
  ```

- [ ] Run new unit/integration cases, then compose existing operational/traffic reads and FinanceSummary. Label receipts gross confirmed incoming and expenses valid current records by actual transaction date; show refund/payment-review caveats where present. Do not present their difference as accounting profit or bank balance.
- [ ] Implement one Laporan page with URL-addressable sections/range, clear units/timezone and metric definitions. Traffic uses only existing aggregate views/source/device/country/route groups, collection-off versus zero-data states. No unique visitors or order attribution inferred. Expanded details stay here rather than a long Overview table.
- [ ] Implement lightweight SVG chart from existing project patterns with tooltip plus keyboard/data alternative, overflow-safe layout and reduced motion. Use no chart/table dependency or export feature not approved.
- [ ] Run targeted unit, integration, report E2E; verify both roles and source failure states. Deliverable: a working central Laporan module.

## C3 — Final shared bento Overview and direct attention paths

**Files:** Modify `src/app/admin/page.tsx`, `overview-view.tsx`, `src/modules/admin/list-query.ts`, `navigation.ts`, `operations-read-repository.ts`; create `src/modules/admin/overview-service.ts`, `overview-types.ts`. Reuse existing `action-queue-repository.ts`/`action-queue-service.ts` signal logic as internal attention projection without exposing Queue UI. Tests `tests/unit/admin-overview-view.test.tsx`, `tests/integration/admin-page-route.test.ts`, `tests/backend/admin-action-queue.test.ts`, `tests/e2e-admin-auth/admin-dashboard-ux.spec.ts`.

**Interfaces:** `DataSection<T> = {status: "ok"; data: T} | {status: "unavailable"; message: string}`. `loadAdminOverview(access: AdminAccess, range: ReportRange): Promise<AdminOverviewData>` composes attention, FinanceSummary, paid-order count, latest 5 authorized activities, traffic summary. Extend `AdminListQuery` with validated `view?: "needs-action" | "issues"` and preserve it in return context. Attention filters use the same business predicates as counters.

- [ ] Add tests for same Owner/Admin composition, period-independent attention, zero/disabled/unavailable states, isolated finance/traffic/activity failure, card→filtered list→detail→back, notification read leaving attention counts unchanged. Maintain current auth-before-read/fail-closed tests.

  ```ts
  expect(afterMarkRead.attention).toEqual(beforeMarkRead.attention);
  expect(changedPeriod.attention).toEqual(originalPeriod.attention);
  expect(changedPeriod.finance.range).toBe("13m");
  ```

- [ ] Run targeted existing/new unit/integration cases before changes, then implement isolated composition (settled independent reads) and honest source errors. Existing attention algorithms/candidate hold logic remain server-side; do not rebuild counts from notification receipts.
- [ ] Apply the approved composition: header/range/update time; top four current attention cards; wider middle receipts/expenses/paid-orders summary + trend; latest 4–5 activity items alongside; compact traffic section below. Reuse tokens/Space Grotesk/card radius, white/neutral surfaces and blue active states. Mobile follows the same reading order in one column.
- [ ] B2B/CustomPrint/Orders cards open their `view=needs-action` lists. Isu opens contextual issue details with exact record links and an Orders issues filter for the full set, not a new hidden Queue. Display zero/empty/loading/error explicitly. No long work table, extra pipeline widget, invented delta/growth, or customization feature.
- [ ] Complete new navigation destinations, remove Queue/main Pricing labels from menu/search/breadcrumbs, verify legacy redirects. Revalidate Overview/reports/domain routes after relevant new mutations using installed Next conventions; preserve no-store/auth boundaries. Do not add a cache that serves one account's state to another.
- [ ] Run dashboard/attention/auth tests and actual desktop/mobile browser flow. Deliverable: final shared bento Overview backed by complete modules, with all approved menus working.

## C4 — Complete verification, authority reconciliation, and handoff

**Files:** Update `docs/PRD-Niuva-MVP.md`, `docs/TechDesign-Niuva-MVP.md`, `DESIGN.md` only for durable product/technical/design changes; create `docs/frontend/admin-redesign-verification-2026-10-08.md` during execution for actual evidence. Update affected existing tests to the new contracts without removing safety assertions. Root AGENTS changes only if an actual durable workflow/ownership rule changed; routine UI changes do not need them.

**Interfaces:** Consumes A1–A6/B1–B5/C1–C3, spec S01–S20 and master acceptance checklist. Produces the measured gate/route/role evidence and remaining-use limitations.

- [ ] Run all static/schema suites and the full required test/build gates, recording commands, exit/result and actual counts:

  ```text
  corepack pnpm lint
  corepack pnpm typecheck
  corepack pnpm db:validate
  corepack pnpm test
  corepack pnpm test:backend
  corepack pnpm test:integration
  corepack pnpm test:e2e
  corepack pnpm test:e2e:admin-auth
  corepack pnpm build
  ```

- [ ] Use isolated loopback test DB and synthetic actors via `tests/e2e/helpers/actor.ts`; auth-email throttle buckets are separated per fixture. Do not reset old DB or read/print private env/auth secret/MFA recovery codes. Tests that need providers use existing test adapters/gates. No new production credentials.
- [ ] Verify actual routes from A4 plus Customers, Site Info, all Finance pages/settings/PDF, Reports, tariff/settings and legacy redirects. Test desktop 1440×900, tablet 768×1024, mobile 390×844; keyboard Tab/Enter/Escape, focus after dialogs/navigation, 200% zoom/reflow, reduced motion, long content and source failure states. Synthetic PDFs are inspected for long-text pagination/amounts and download authorization.
- [ ] Walk BUY→provider-confirmed order/invoice/fulfillment hold; MAKE→review/estimate/quote→accept→production invoice→final-package shipping invoice; DEVELOP→accepted proposal→Owner DP terms→single invoice→Admin DP recording→pelunasan→both-role correction with audit. Verify reads do not turn review/quote into automatic price/payment/production authority.
- [ ] Verify Owner invitation/nonactivation/deactivation immediately revokes target access; ordinary Admin cannot access Owner endpoints; Customer closure/recreation does not restore work, invoice identity or private evidence. Verify both roles can correct the manual Finance records as explicitly approved.
- [ ] Reconcile canonical addenda with implemented behavior and honest local readiness. Record visual acceptance as unreviewed until Owner reviews the real result; proposal approval is not application acceptance. Store screenshots only with synthetic/redacted content, no tokens, personal credentials, or real private files.
- [ ] Report changed files, all commands/results, acceptance coverage, relevant rollback, remaining production/legal-retention/provider limitations. Commit/push/PR/deploy only if separately requested. Any separate reviewer dispatch requires the user's selected execution/delegation method.

Completion means all agreed functions and actual routes are implemented and verified. It does not mean merely showing the new sidebar or an Overview mockup.
