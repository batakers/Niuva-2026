# Completion Report: system-pages-and-error-states

Status: implementation complete, all automated gates green (local, non-production).
Visual acceptance: **UNREVIEWED**. Passing tests or build is not visual approval.

## 1. Files changed

Derived from `git status` / `git diff --stat` (43 tracked files modified or deleted, 849 insertions, 421 deletions, plus untracked files). No commits, pushes or staging were made.

### Proxy and auth plumbing
- `src/proxy.ts` (modified): no-credentials branch now classifies the request. Browser navigation gets the HTML 503, API requests keep the JSON 503. `adminProxy` uses `isAdminSignInPath`.
- `src/lib/auth/admin-proxy-response.ts` (new): `classifyAdminProxyRequest`, `isAdminSignInPath`, `createAdminAuthUnavailableHtmlResponse`.

### Shared system components (all new, `src/components/niuva/`)
- `system-state-copy.ts`, `system-state-view.tsx`, `system-frame.tsx`, `skip-link.tsx`, `system-focus-target.tsx`, `public-loading-state.tsx`, `admin-access-actions.tsx`.

### Public and system pages
- New: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/cart/loading.tsx`.
- New: `src/app/orders/[token]/next-action.ts`.
- Modified: `src/app/orders/[token]/order-status.tsx`, `src/features/frontend-preview/order-status.ts` (optional `quoteHref` field, no producer).
- Modified (login copy, R11): `src/app/checkout/page.tsx`, `src/app/project-brief/page.tsx`, `src/app/custom-print/request/page.tsx`, `src/app/custom-print/page.tsx`.

### Admin
- New: `src/app/admin/error.tsx`, `src/app/admin/not-found.tsx`, `src/app/admin/admin-record-loader.ts`.
- Modified: `src/app/admin/admin-access-view.tsx` (now `AdminAccessView({ state })`), `src/app/admin/admin-page-access.ts`, `src/app/admin/layout.tsx` (noindex metadata).
- Modified list pages: `src/app/admin/{page,queue/page,custom-print/page,inquiries/page,orders/page,portfolio/page,pricing/page,products/page,privacy/page,privacy/policy/page}.tsx`.
- Modified detail pages: `src/app/admin/{orders/[id],inquiries/[id],custom-print/[id],portfolio/[id],products/[id],products/[id]/stock/[variantId]}/page.tsx`.

### Clerk sign-in
- Moved: `src/app/admin/sign-in/page.tsx` (deleted) to `src/app/admin/sign-in/[[...sign-in]]/page.tsx` (new). `footerAction` is hidden. `withSignUp={false}`, `forceRedirectUrl="/admin"` and robots noindex are kept.

### Tests
- Modified: `tests/unit/{admin-access-view,admin-layout,admin-proxy,admin-sign-in}.test.tsx|ts`, `tests/integration/admin-page-route.test.ts`, `tests/e2e/{admin-access,admin-action-queue}.spec.ts`.
- New unit: `tests/unit/{admin-detail-pages,admin-not-found,customer-login-copy,order-next-action,public-loading-state,system-error-boundaries,system-global-error,system-pages-coverage,system-root-not-found}.test.ts(x)`, `tests/unit/helpers/corpus.ts`.
- New property-style tests (table-driven and seeded, no `fast-check`): `tests/unit/properties/p01` to `p10`, `p12`, `p13`. P11 lives in `system-pages-coverage.test.ts`.
- New E2E: `tests/e2e/system-pages.spec.ts`.

### Spec artifacts (untracked)
- `.kiro/specs/system-pages-and-error-states/{clerk-probe-results.md, completion-report.md, tasks.meta.json}` (plus the already-untracked `.config.kiro`, `requirements.md`, `design.md`, `tasks.md`).

### Deleted (R13, approved)
- 11 empty AUiS directories (see section 4, R13). Git does not track empty directories, so they do not appear in `git status`.

### Changes in the working tree NOT attributable to this spec
`git status` also shows a separate batch of customer policy/privacy work that this spec did not author:
- `docs/PRD-Niuva-MVP.md`, `docs/README.md`, `docs/TechDesign-Niuva-MVP.md`, `docs/backend/provider-staging-intake.md`, `docs/legal/customer-{policy-implementation,privacy-draft,terms-draft}.md`.
- Untracked `docs/legal/customer-{privacy-retention-sop,public-input-evidence,public-launch-readiness,public-policy-validation,public-runtime-contract,service-refund-sop}.md`.
- `tests/backend/customer-privacy-pages.test.ts` and `tests/e2e/customer-privacy.spec.ts` (draft marker v2 to v3 assertions).

I did not touch or verify these for this report. Review them separately before any commit.

### Untracked leftover
- `.next-probe-13-3/` (Clerk probe leftover, not gitignored). See risk 5.

## 2. Commands run and results

`corepack pnpm lint|typecheck|test` could not be run as-is because the `.bin` shims for eslint, tsc and vitest are missing in this checkout. The direct `node node_modules/...` equivalents were used.

| Gate | Result |
|---|---|
| ESLint (excluding untracked `.next-probe-13-3/`) | 0 errors, 148 warnings. Plain `eslint .` reports 164 errors, all from `.next-probe-13-3/` only. |
| TypeScript (`tsc`) | exit 0 |
| Unit (Vitest) | 55 files, 612 tests pass |
| Build (`next build`) | exit 0 |
| Integration | 15 files, 83 tests pass |
| Playwright E2E (Chromium) | 103/103 pass |
| Prisma validate | OK |

Environment notes:
- The user approved deleting the stale gitignored generated dirs `.next/dev/types` and `.next-demo-e2e/types`. They were needed for typecheck and build.
- Playwright ran after removing ReadOnly empty dirs in `.next-e2e/dev/node_modules` earlier.
- The integration test `admin-page-route.test.ts` needed a `@clerk/nextjs` mock. This was fixed.
- The p03 test got a 30 s timeout.

## 3. Scope guard (task 18.1)

Verified with read-only git commands. No changes to: `package.json`, the lockfile, `.env*`, `.github/workflows/`, `prisma/migrations/`, `next.config.ts`, `src/app/admin/loading.tsx`, the four scoped not-found files, `tsconfig.json`, `playwright.config.ts`. No new dependencies (R14.10).

`.config.kiro`, `requirements.md` and `design.md` are untracked, so git cannot prove they are unmodified. Timestamps show no edits after the spec phase.

## 4. Acceptance criteria covered per requirement

| Req | Coverage | Evidence |
|---|---|---|
| R1 Root 404 | Covered | `src/app/not-found.tsx`. `system-root-not-found.test.tsx`, p05, p12. E2E: random URL and `/services/tidak-ada` return 404, no path echo, Tab lands on "Kembali ke beranda". |
| R2 Non-revealing token 404 | Covered | Token pages audited (3.3). Scoped files unchanged. p06 (100+ seeded tokens). E2E: identical `main` content for different invalid tokens, no token in DOM. The valid-shaped-but-absent token case depends on a test DB (see risks). |
| R3 Public error boundary | Covered | `src/app/error.tsx`. `system-error-boundaries.test.tsx`, p05, p12. Behavior verified in jsdom, not in a browser. |
| R4 Global error | Covered | `src/app/global-error.tsx`. `system-global-error.test.tsx` via `renderToStaticMarkup`. **Not verified in a real browser.** |
| R5 Admin error boundary | Covered | `src/app/admin/error.tsx`, layout noindex. Unit tests, p05, p12. |
| R6 Loading state | Partially by design | `/cart` only. 20 other `connection()` segments are excluded (404/redirect contracts, Owner decision B). P11 manifest test. `admin/loading.tsx` hash-pinned and unchanged. |
| R7 Admin access states | Covered | `AdminAccessView`, `admin-page-access.ts`, actions. p08, p09, access-view tests. HTTP status stays 200 + noindex (R7.8 fallback, Keputusan C). |
| R8 Record vs unavailable | Covered | Tri-state `loadAdminRecord` on 7 detail pages (orders, inquiries, custom-print, portfolio, products, stock history). `admin/not-found.tsx`. p07, p10, `admin-detail-pages.test.tsx`. The audit (8.9) is recorded as done. |
| R9 Proxy HTML 503 | Covered | `admin-proxy-response.ts`, `proxy.ts`. `admin-proxy.test.ts`, p03. E2E checks headers and body. JSON 503 unchanged. Matcher unchanged. |
| R10 Clerk sign-in | Partially verified | See Clerk outcome below. |
| R11 Login copy | Covered | 4 pages. `customer-login-copy.test.ts`. The checkout body "Google session" line is deliberately unchanged (Owner decision). |
| R12 NextAction | Covered | `next-action.ts`, `order-status.tsx`. `order-next-action.test.tsx`, p01, p02. See risk 4 about the missing producer. |
| R13 AUiS cleanup | Executed with approval | See R13 outcome below. |
| R14 A11y, tokens, copy | Covered in automated form | p12, p13, per-surface tests. No AT, screen reader or device testing. |
| R15 Verification | Covered | This report. Section 2 lists each command. E2E was run. |

### R10 Clerk outcome (details in `clerk-probe-results.md`)
- Proxy fix via `isAdminSignInPath`.
- Before the catch-all move, the probed sub-steps returned 404.
- After moving the page to `[[...sign-in]]`, they return 200 and the Clerk sign-in renders, but on `/admin/sign-in`. This is Clerk's client redirect to the start step. The source of the redirect was not isolated.
- A real in-progress second-factor step is **unverified** (R10.10), so no conclusion is drawn for it.
- The sign-up "Sign up" anchor exists in the DOM but is hidden via `footerAction: display none`. No sign-up route was added.
- Owner follow-up: disable or limit sign-up in the Clerk Dashboard (not changed by this spec).

### R13 outcome
- Approved in writing by the user in chat.
- All 11 empty dirs were verified empty (0 files) and removed: `src/app/auis/proofs/frontend/admin`, `src/app/auis/proofs/frontend`, `src/app/auis/proofs`, `src/app/auis/styleguide/components`, `src/app/auis/styleguide/foundation`, `src/app/auis/styleguide/registry`, `src/app/auis/styleguide`, `src/app/auis/welcome`, `src/app/auis/wireframes`, `src/app/auis/_data`, `src/app/api/auis/brand`.
- `src/app/auis` and `src/app/api/auis` remain as empty parents (R13.6).
- Typecheck and build passed after deletion (exit 0).

## 5. Owner decisions and follow-ups

1. Checkout page body copy still says "Google session". Left unchanged.
2. Loading-state coverage: only `/cart` got `loading.tsx`. 20 other `connection()` segments are excluded because of 404/redirect contracts. Options B1/B2 are in the design (Keputusan B).
3. HTTP status for admin access states stays 200 + noindex (Keputusan C).
4. The live quote URL source for order status does not exist. The `quoteHref` field has no producer, so the live `quote` kind shows a notice without a link.
5. The untracked `.next-probe-13-3/` leftover is not gitignored and breaks plain `eslint .`. I recommend deleting it. It needs your OK and I did not delete it.
6. Clerk Dashboard sign-up control (see R10).
7. Whether to approve `fast-check` (not installed, so property tests are table-driven with seeded corpora).
8. `global-error` is not verified in a real browser.

## 6. Remaining risks

- Visual acceptance is unreviewed. Physical-device, assistive-technology, provider and production readiness are separate and not covered.
- All evidence is local, loopback and non-production.
- Clerk in-progress second-factor step is unverified. The redirect-to-start-step behavior was not root-caused.
- `global-error.tsx` and the proxy HTML page are verified in jsdom, static markup and E2E on a dev server only, not against a production deployment.
- The 404 case for a valid-shaped but absent token depends on a database. Integration tests passed, but check that the E2E variant actually ran in your environment.
- Unexpected errors in admin list pages now propagate to the Admin error boundary (intentional, Keputusan F), where they previously were caught locally.
- Working tree contains an unrelated customer policy batch (section 1). Keep it out of this spec's commit.
- `corepack pnpm lint|typecheck|test` were not run through the package scripts (missing `.bin` shims). Equivalent direct invocations passed, but CI should confirm with the scripts.
- `.config.kiro`, `requirements.md` and `design.md` immutability rests on timestamps, not git.

## 7. Rollback notes

- Tracked files: revert per file with `git checkout -- <path>`. New files: delete them. Nothing was committed.
- **Key rollback point: the no-credentials branch in `src/proxy.ts`.** Restoring it to always return `createAdminAuthUnavailableResponse()` returns browsers to the JSON 503. It is independent of the other changes. Remove `src/lib/auth/admin-proxy-response.ts` afterwards and restore the two sign-in string comparisons in `adminProxy` if you also want to revert the sub-step allowlist.
- Sign-in move: restore `src/app/admin/sign-in/page.tsx` from git and delete `src/app/admin/sign-in/[[...sign-in]]/page.tsx`. Never keep both, since they would collide on one URL. Update the import in `tests/unit/admin-sign-in.test.tsx`.
- Admin access view rename: `AdminAccessUnavailableView` became `AdminAccessView`. Reverting it requires reverting the admin pages, `admin-page-access.ts` and the related tests together (one compile unit).
- AUiS directories: Git does not track them. If needed, recreate the 11 empty dirs: `src/app/auis/proofs/frontend/admin`, `src/app/auis/proofs/frontend`, `src/app/auis/proofs`, `src/app/auis/styleguide/components`, `src/app/auis/styleguide/foundation`, `src/app/auis/styleguide/registry`, `src/app/auis/styleguide`, `src/app/auis/welcome`, `src/app/auis/wireframes`, `src/app/auis/_data`, `src/app/api/auis/brand`.
- Deleted generated dirs (`.next/dev/types`, `.next-demo-e2e/types`) regenerate on the next dev or build run.
- No database, migration, dependency or env changes, so no data rollback is needed.
