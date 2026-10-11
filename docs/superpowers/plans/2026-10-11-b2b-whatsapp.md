# B2B WhatsApp Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans in the current session.
> The repository's user instructions authorize this implementation without
> another plan approval gate. Git delivery was subsequently authorized by the
> user on 11 October 2026; delegation remains outside the requested scope.

**Goal:** Replace active website B2B operations with direct WhatsApp contact.

**Architecture:** Use a shared contact link that reads public Site Information.
Retire B2B HTTP and page entry points, then remove active B2B projections while
preserving historical storage and privacy handling.

**Tech Stack:** Next.js 16.3.6, React, TypeScript, existing Niuva components,
Prisma, Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-11-b2b-whatsapp-design.md`

## Global Constraints

- CTA label: **Hubungi Kami**; no supporting text below the button.
- B2B contact requires neither login nor a form.
- Preserve MAKE/BUY behavior, historical data, schema/migrations, and privacy.
- No secrets or unrelated local changes; no provider activation or deployment.

## Review Focus

- Configured phone changes must reach every public contact link.
- Stale B2B POST requests must never create business records or notifications.
- Old links and unknown service queries must resolve to a safe internal page.
- Historical B2B signals must not reappear as actionable Admin work.
- MAKE quote, account ownership, and billing behavior must remain intact.

## Task 1: Public WhatsApp contact

**Files:** `src/components/niuva/b2b-contact-link.tsx`, public shell/navigation,
homepage, service and project views, Custom Print fallback, sitemap.
**Interfaces:** `createB2BWhatsAppHref(phone, service?)`, `B2BContactLink`.

- [x] Add and run failing tests for configured phone and service-aware contact.
- [x] Implement shared outline contact and replace all Project Brief entry links.
- [x] Verify the contact tests and public-route browser behavior.

## Task 2: Retire website B2B operations

**Files:** `src/app/project-brief`, B2B API/account/admin routes,
`src/app/admin/actions.ts`, Customer work and claim surfaces, invoice creation.
**Interfaces:** Legacy POST boundaries return 410; old brief page redirects;
Customer work lists only MAKE requests.

- [x] Add and run failing retirement boundary tests.
- [x] Remove forms, proposal/inquiry/billing pages, and B2B Server Actions.
- [x] Restrict account claims and new invoice source selection to active flows.
- [x] Update tests for retired surfaces while preserving domain/history coverage.

## Task 3: Remove active B2B projections and update authority

**Files:** Admin navigation, queue/dashboard/search/notifications, customer
directory, operational reports/analytics, PRD, Tech Design, PRODUCT, DESIGN,
AGENTS, affected unit/backend/integration/browser tests.
**Interfaces:** Active operational data contains MAKE/BUY only; historical
privacy and invoice records remain available through their existing controls.

- [x] Add and run regression tests for legacy B2B signal exclusion.
- [x] Remove B2B work, links, counts, and reports from active projections.
- [x] Record the approved product/technical/design change in owning authorities.
- [x] Run lint, strict typecheck, unit/backend, relevant integration, build,
  and browser checks; inspect the final diff and record limitations.

## Execution record

- Baseline: `1abf5a8b193874b53b68813cc8778ba249425cac`.
- Workspace: managed `b2b-whatsapp` worktree; original dirty checkout preserved.
- Ruling: user AGENTS instructions override serial skill approval/commit and
  delegation defaults. Proceed with the explicitly requested removal locally.

### Final verification — 11 October 2026

| Check | Command | Result |
| --- | --- | --- |
| Static analysis | `corepack pnpm lint` | Passed, no warnings |
| Strict types | `corepack pnpm typecheck`; final `corepack pnpm exec tsc --noEmit` | Passed |
| Unit/component | `corepack pnpm test --maxWorkers=4 --reporter=verbose` | 121 files, 1,337 tests passed, coverage enabled |
| Backend | `corepack pnpm exec vitest run --config vitest.backend.config.mts --maxWorkers=2` | 84 files, 589 tests passed, coverage enabled |
| Database integration | `corepack pnpm test:integration` with explicit loopback `TEST_DATABASE_URL` | 37 files, 180 tests passed |
| Prisma schema | `corepack pnpm db:validate` | Passed |
| Production build | `corepack pnpm build` | Passed; 90 pages generated |
| Public browser suite | `corepack pnpm test:e2e` on port 3111 | 112 passed, 5 production-tier cases skipped |
| Authenticated Admin browser suite | `corepack pnpm test:e2e:admin-auth --output=.local/b2b-whatsapp/admin-dev-test-results` | 21 passed with real local Better Auth and TOTP |
| Patch whitespace | `git diff --check` | Passed |

The public skipped cases belong to the existing production-tier content suite;
this loopback run does not establish hosted or production acceptance.

The first Admin run passed 20 cases and blocked its tariff case: the existing
pricing guard requires a loopback database with a separate `dev` marker, while
the initial test database was named `niuva_test`. The final run used a new,
isolated `niuva_b2b_dev_test_a1289c` database on the task-owned PostgreSQL
cluster at port 55432. Both the existing test and development guards remain
unchanged. Existing migrations were applied to this empty test database; no
old database was reset. Report and tariff captures use `caret: "initial"` so
Playwright does not inject caret styles during React hydration.

### Acceptance evidence

- The service contact works at 390 and 1280 CSS pixels with reduced motion,
  keyboard focus, a minimum 44-pixel target, and no horizontal overflow.
- The same contact and legacy redirect work with JavaScript disabled.
- The configured public phone and selected service reach the WhatsApp URL.
  No login or Project Brief submission is required.
- Retired POST boundaries return 410 without business writes or notifications.
  Historical inquiry/proposal fixtures remain unchanged.
- Customer work contains MAKE requests and orders; old B2B proposal pages are
  absent and their decision endpoint cannot accept a proposal.
- Authenticated Admin has no inquiry navigation, queue, search result, report
  tab, or new invoice source for B2B. The retired Admin pages return 404.
- MAKE review/estimate/quote, BUY operations, invoice history, Customer privacy,
  and Admin access/MFA remain covered by the passing suites.
- Schema, migrations, dependency manifests, provider configuration, and unrelated
  original-checkout changes were not modified.

Public captures:
`test-results/b2b-whatsapp-B2B-contact-w-084c3-login-on-mobile-and-desktop/services-1280.png`
and `services-390.png`. Authenticated Admin overview/report captures are under
`.local/admin-redesign/captures/` and contain synthetic test records only.
Detailed command logs are in `.local/b2b-whatsapp/`.

### Delivery and remaining acceptance

The user authorized commit, push, and a pull request on 11 October 2026 after
reviewing the local preview. Delivery uses only this feature's explicit file
allowlist. Preview caches and local runtime configuration are excluded.
No deployment or provider activation is authorized. No business records in the
original environment were changed or deleted.
The task-owned database cluster is stopped after verification.

Owner visual acceptance remains unreviewed. Physical devices, assistive
technology, hosted environments, and real provider operations were not
validated by these local suites.

Rollback is a scoped reversal of this worktree's feature diff; no database
migration rollback is required. Preserve the original checkout's unrelated
changes.

### CTA revision after browser review

The user requested only **Hubungi Kami**, without the **Melalui WhatsApp**
helper text. The shared component, callers, assertions, and owning copy rules
were updated. The live `/services` route shows the revised CTA and still links
directly to WhatsApp. The focused component/home tests passed: 2 files, 4 tests.
