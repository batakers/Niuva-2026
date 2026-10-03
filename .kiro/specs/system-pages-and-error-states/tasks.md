# Implementation Plan: system-pages-and-error-states

## Overview

The design language is TypeScript (Next.js 16.3.2 App Router, React, Vitest + React Testing Library, Playwright). No implementation-language question is needed.

Implementation order follows the design: proxy path fix and proxy HTML 503 first, shared system components, root not-found, error boundaries, global-error, admin access state plumbing, the tri-state `AdminRecordResult` loader across the 6 admin detail pages, admin not-found, the `NextAction` resolver, copy fixes, cart loading, Clerk sign-in verification, then E2E and cross-surface test updates. Each step builds on the previous one, and nothing is left orphaned.

Visible UI copy is Indonesian. It comes from `src/components/niuva/system-state-copy.ts` (design "Copy dan tampilan sistem") and from the R11 copy table in the design. Task text is English.

Guardrails for every task (from `AGENTS.md`, R14.10, and the design):

- No commits, pushes, deployment, provider activation, or existing-migration edits.
- No new dependencies. `package.json` and the lockfile stay untouched. `fast-check` is NOT installed, so property tests are exhaustive table-driven tests plus seeded corpora of at least 100 cases.
- Do not edit `.env*`, `.github/workflows/`, `next.config.ts`, `src/app/admin/loading.tsx`, the four existing scoped `not-found.tsx` files, or `createAdminAuthUnavailableResponse()`.
- Do not change Clerk Dashboard settings. The sign-up control there is an Owner follow-up, listed in the final report.
- Before writing any `not-found`, `error`, `global-error`, `loading`, or `proxy` code, re-read the matching guide in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`. This Next.js version has breaking changes.
- Use semantic tokens, `src/design/typography.ts`, `NiuvaLink`, `Button`, and `StatusNotice`. No literal colors or arbitrary pixel values, except the documented inline palette in the proxy HTML (design, "Catatan palet").
- Never print secrets. Reference `.env.local` keys by name only.

## Tasks

- [x] 1. Proxy: HTML 503 for browser navigation and Clerk sign-in sub-step allowlist
  - [x] 1.1 Create the seeded corpus helper `tests/unit/helpers/corpus.ts`
    - Add a deterministic seeded generator (about 15 lines, not a PBT library) and fixed adversarial corpora: tokens shaped like `v1.<base64>.<secret>`, emails, file paths, `<script>` fragments, non-UUID ids, odd `Accept` headers, odd pathnames.
    - The generator must yield at least 100 cases per corpus and print the seed on failure.
    - _Requirements: 15.5, 14.10_

  - [x] 1.2 Create `src/lib/auth/admin-proxy-response.ts` (pure, no Clerk import)
    - Implement `classifyAdminProxyRequest({ pathname, accept })`. Lowercased `/api` or `/api/...` is always `"api"`. Otherwise `"browser-navigation"` only when `Accept` has a `text/html` range with `q` absent or above 0. Everything else is `"api"`.
    - Implement `isAdminSignInPath(pathname)`: exactly `/admin/sign-in` or prefix `/admin/sign-in/`. Add a comment noting the residual risk recorded in the design.
    - Implement `createAdminAuthUnavailableHtmlResponse()`: status 503, `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, `Content-Language: id`. The body is a static constant string with `lang="id"`, a `meta robots noindex`, one `h1`, a status paragraph, a skip link, one `main#main-content` and one home link to `/`. It has no interpolation, no external resources, no env var names, no provider names and no stack text. Use the inline palette from `DESIGN.md` front matter (44px targets, 3px focus ring).
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.11, 10.3, 10.5, 10.6, 14.9_

  - [x] 1.3 Wire `src/proxy.ts`
    - In the no-credentials branch, call `classifyAdminProxyRequest` and return the HTML 503 for `"browser-navigation"` or the unchanged `createAdminAuthUnavailableResponse()` for `"api"`.
    - In `adminProxy`, replace the two sign-in string comparisons with `isAdminSignInPath(pathname)`. Keep `auth.protect` for every other path (including `/admin/sign-in-other`).
    - Leave `config.matcher`, `contentSecurityPolicy: { strict: true }` and `createAdminAuthUnavailableResponse()` unchanged. When credentials exist, behavior must stay identical to before.
    - _Requirements: 9.1, 9.2, 9.3, 9.7, 9.8, 9.9, 9.10, 9.11, 10.3, 10.5, 10.6_

  - [x] 1.4 Extend `tests/unit/admin-proxy.test.ts`
    - Without credentials: HTML 503 for `Accept: text/html`, with the expected headers, Indonesian `h1`, one home link, one `main#main-content`, and no `AUTH_UNAVAILABLE`, env var names or provider names. JSON 503 (exact body) for API requests. Clerk middleware never runs.
    - With credentials: delegation and `auth.protect` behave as before. `config.matcher` is unchanged. `createAdminAuthUnavailableResponse()` output is identical. The existing cases pass unmodified.
    - Cover sign-in sub-step paths unprotected and `/admin/sign-in-other` protected.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 10.3, 10.5, 10.6, 15.2_

  - [x] 1.5 Write property test for proxy classification
    - File: `tests/unit/properties/p03-proxy-classification.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 3`.
    - **Property 3: Classification is total and the no-credentials responses are consistent**
    - Cover `pathname × Accept` corpora: case variants, `/api`, `/api/admin/...`, `q=0`, malformed `q`, `TEXT/HTML`, `*/*`, `text/x-component`, null. Assert the no-credentials proxy returns 503 with the right body kind and never calls `clerkMiddleware`.
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.11**

  - [x] 1.6 Write property test for the sign-in allowlist
    - File: `tests/unit/properties/p04-signin-allowlist.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 4`.
    - **Property 4: Exact sign-in allowlist**
    - Include `/admin/sign-in-other`, `/admin/sign-inx`, `/admin/sign-in%2Fx`, trailing slash and sub-steps, plus at least 100 seeded pathnames. Assert `auth.protect` is skipped exactly for allowlisted paths.
    - **Validates: Requirements 10.3, 10.5, 10.6, 9.10**

- [x] 2. Shared system components (copy, skip link, focus target, views, frame, loading)
  - [x] 2.1 Create `src/components/niuva/system-state-copy.ts`
    - Export `SYSTEM_HEADING_ID`, the `SystemStateCopy` type and `systemCopy` exactly as in the design: `notFound`, `publicError`, `globalError`, `adminError`, `adminNotFound`, `adminAccess.{UNAUTHENTICATED,FORBIDDEN,AUTH_UNAVAILABLE}`, `signOutFailed`, `loading.cart`, `actions`.
    - Each sentence must be 20 words or fewer, in Indonesian, and must not contain "exception", "stack" or "digest".
    - _Requirements: 1.4, 3.2, 4.3, 5.2, 7.1, 8.5, 14.1, 14.9_

  - [x] 2.2 Create `src/components/niuva/skip-link.tsx` and `src/components/niuva/system-focus-target.tsx`
    - `SkipLink` renders `<a href="#main-content">Lewati ke konten utama</a>` with the same classes as `PublicShell`.
    - `SystemFocusTarget` is a Client Component. On mount it focuses `#system-state-title` with `preventScroll`, so one Tab lands on the first recovery action.
    - _Requirements: 14.3, 14.7_

  - [x] 2.3 Create `src/components/niuva/system-state-view.tsx` and `src/components/niuva/system-frame.tsx`
    - `SystemStateView` has no `"use client"` directive. Props are `variant: "public" | "admin"`, `title`, `description`, optional `eyebrow`, `stateId` (rendered as `data-system-state`) and `children` for actions. It renders `main#main-content`, one `h1` (`id={SYSTEM_HEADING_ID}`, `tabIndex={-1}`, typography class from `src/design/typography.ts`), a description `p` and an actions container. The `admin` variant also renders `SkipLink`.
    - `SystemFrame` is the standalone public frame for `error.tsx` (R3.11): `data-foundation-scope="system"`, `data-product-screen-proof-status="pending-owner-review"`, `SkipLink` first, a dark header with `NiuvaLogo` linking to `/`, then children. It does not import `PublicShell`.
    - Use semantic tokens only, with `min-h-11` on actions.
    - _Requirements: 1.2, 1.4, 1.8, 3.2, 3.4, 3.10, 3.11, 5.8, 14.1, 14.3, 14.4, 14.5_

  - [x] 2.4 Create `src/components/niuva/public-loading-state.tsx`
    - A Server Component with props `scope` and `label`. It renders `PublicShell` wrapping `main#main-content[aria-busy="true"]`, one `p[role="status"][aria-label=label]`, and a decorative `aria-hidden` skeleton using `motion-safe:animate-pulse` and semantic tokens.
    - No `h1`, no user data, and the skeleton keeps the same dimensions in reduced motion.
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 14.2, 14.6_

  - [x] 2.5 Write unit tests `tests/unit/public-loading-state.test.tsx`
    - Assert exactly one labelled `role="status"`, zero `h1`, exactly one `main`, a decorative skeleton hidden from assistive tech, no `animate-pulse` without the `motion-safe:` prefix, Indonesian-only label, and no user data in the output.
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 14.2, 14.6, 15.1_

- [x] 3. Root not-found and token not-found alignment
  - [x] 3.1 Create `src/app/not-found.tsx` (Root_Not_Found)
    - Server Component inside `<PublicShell scope="system-not-found">`, with `SystemFocusTarget` and `SystemStateView variant="public" stateId="not-found" {...systemCopy.notFound}`.
    - Actions: `NiuvaLink` to `/` ("Kembali ke beranda") and `NiuvaLink` to `/shop` ("Lihat Shop"), both with `min-h-11`.
    - Export `metadata` with a static title and `robots: { index: false, follow: false }`. It must not use `params`, path, slug, token or query.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 2.5, 2.6, 2.7, 14.1, 14.3, 14.4, 14.7_

  - [x] 3.2 Write unit tests `tests/unit/system-root-not-found.test.tsx`
    - Assert one `h1` and one `main#main-content`, the Indonesian paragraph, two links with non-empty text and `min-h-11`, metadata robots `index:false, follow:false`, and `SystemFocusTarget` present with the DOM order `h1 → p → actions`.
    - Inject token, slug and query strings as test values and assert none appear in text, attributes or metadata.
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.8, 1.9, 14.1, 14.7, 15.1, 15.5_

  - [x] 3.3 Audit and align the three token pages
    - Review `src/app/quote/[token]/page.tsx`, `src/app/orders/[token]/page.tsx` and `src/app/custom-print/requests/[token]/page.tsx`. Confirm every failure branch ends in `notFound()` with no other branch: bad format, null entity id, `NOT_FOUND`, `UNAUTHORIZED`, and for quote also `CONFLICT` and `QUOTE_NOT_READY`.
    - Confirm the scoped not-found files for `quote/[token]` and `orders/[token]` are unchanged, take no props and emit `robots` noindex. Confirm `/custom-print/requests/[token]` resolves to Root_Not_Found and emits no token in title or metadata.
    - Make the smallest edit only where a branch deviates. Do not edit the scoped not-found files' content.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 1.10_

  - [x] 3.4 Write property test for token failures ending in notFound
    - File: `tests/unit/properties/p06-token-not-found.test.tsx`. Tag: `// Feature: system-pages-and-error-states, Property 6`.
    - **Property 6: Every token failure ends at notFound with no distinguishing output**
    - Mock services for each failure cause and run at least 100 seeded tokens through all three pages. Assert `notFound()` is called, no other branch renders, and the not-found component receives no token and renders identical markup.
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 4. Error boundaries (public and admin)
  - [x] 4.1 Create `src/app/error.tsx` (Public_Error_Boundary)
    - Client Component. Render `SystemFrame` with `<meta name="robots" content="noindex, nofollow" />`, `SystemFocusTarget`, and `SystemStateView variant="public" stateId="error" {...systemCopy.publicError}`.
    - Actions: `Button type="button" className="min-h-11"` labelled "Coba lagi" calling `retry()` exactly once per click, and `NiuvaLink` to `/`. Do not call `reset`.
    - Never read or render `error`, `error.message`, `error.stack` or `digest`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 14.1, 14.3, 14.4, 14.7, 14.8_

  - [x] 4.2 Create `src/app/admin/error.tsx` (Admin_Error_Boundary)
    - Client Component with the same structure as the public boundary but `variant="admin"`, link `NiuvaLink href="/admin"` ("Kembali ke Overview"), no `SystemFrame`, and `systemCopy.adminError` (identical text for every error, no claim about data mutation).
    - It renders no user name, email or role, does not call `requireAdmin()`, and emits noindex via `<meta name="robots">`. The layout metadata in 4.3 is the second layer.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 14.1, 14.3, 14.4, 14.7, 14.8_

  - [x] 4.3 Add noindex metadata to `src/app/admin/layout.tsx`
    - Add `export const metadata` with `robots: { index: false, follow: false }`. Keep the `ClerkProvider` behavior unchanged. This is defense in depth for admin pages (design Keputusan C).
    - _Requirements: 7.9, 5.7_

  - [x] 4.4 Write unit tests `tests/unit/system-error-boundaries.test.tsx`
    - Public and admin boundaries: main message and both recovery actions render; `retry` is called exactly once per click (keyboard and pointer) and `reset` is never called; a second render after a throwing `retry` still shows the same actions; `min-h-11` classes; DOM order and focus target; standalone frame contains `main#main-content`.
    - Inject `error.message`, `stack`, `digest` and a token as test values and assert none appear in text or attributes. The admin boundary's markup must be identical across all error kinds.
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7, 3.11, 3.12, 5.2, 5.3, 5.4, 5.5, 5.8, 5.9, 14.7, 14.8, 15.1, 15.5_

- [x] 5. Global error boundary
  - [x] 5.1 Create `src/app/global-error.tsx`
    - Client Component with `import "./globals.css"`. Export `GlobalErrorView({ onRetry })` with `SkipLink`, `main#main-content`, one `h1`, a description, `Button` "Coba lagi" and a plain `<a href="/">`. The default export renders `<html lang="id">`, `<head>` with `<title>` and `<meta name="robots" content="noindex, nofollow">`, and `<body>`.
    - `onRetry` calls `retry()` once per activation. Use no provider or component from the root layout. Use the Arial/Helvetica fallback font path documented in the design. Never read `error`.
    - Confirm whether `SkipLink` and `Button` import anything from the root layout. If they do, add a self-contained markup variant.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 14.1, 14.3_

  - [x] 5.2 Write unit tests `tests/unit/system-global-error.test.tsx`
    - Use `renderToStaticMarkup` for the full document: `lang="id"`, `<title>`, robots meta, `html`/`body` present, skip link first, exactly one `h1` and one `main#main-content`, the retry button and `<a href="/">`.
    - Clicking retry calls `retry` exactly once per activation. Inject `error.message`, `stack` and `digest` as test values and assert none appear.
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 14.1, 14.3, 15.1, 15.5_

- [x] 6. Checkpoint - Foundation and boundaries
  - Run `corepack pnpm lint`, `corepack pnpm typecheck` and `corepack pnpm test`. Fix any failure in files touched by tasks 1 to 5. Ensure all tests pass, ask the user if questions arise.

- [x] 7. Admin access state plumbing
  - Note: 7.1 changes the return type of `loadAdminPageAccess`. Tasks 7.1 to 7.6 form one compile unit. Typecheck only after 7.6.
  - [x] 7.1 Update `src/app/admin/admin-page-access.ts`
    - Export `ADMIN_ACCESS_STATES`, `AdminAccessState`, `AdminPageAccessResult` (`granted` with `access`, or `denied` with `state`) and `toAdminAccessState(error)`: `UNAUTHORIZED→UNAUTHENTICATED`, `FORBIDDEN→FORBIDDEN`, `AUTH_UNAVAILABLE→AUTH_UNAVAILABLE`, any other `AppError` or non-`AppError` → `null`.
    - `loadAdminPageAccess(options?: { permission?: AdminPermission })` returns `denied` with the exact mapped state and rethrows unmapped errors. It must not alter, downgrade or upgrade the evaluated state.
    - _Requirements: 7.6, 7.7_

  - [x] 7.2 Create `src/components/niuva/admin-access-actions.tsx`
    - Client Component. `AdminSignOutButton` calls `useClerk().signOut({ redirectUrl: "/" })`. On failure it shows a `StatusNotice tone="error"` with `role="alert"` and `systemCopy.signOutFailed` immediately (well under 5 seconds), without raw error detail, and keeps the button enabled. Confirm the `signOut` signature in the installed `@clerk/shared` types.
    - `AdminReloadButton` calls `useRouter().refresh()` inside `useTransition`, showing "Memuat ulang…" while pending, and stays active if the server re-renders `AUTH_UNAVAILABLE`.
    - Do not change `AdminSessionActions`.
    - _Requirements: 7.3, 7.4, 7.12, 7.13, 7.14, 14.4, 14.8_

  - [x] 7.3 Rewrite `src/app/admin/admin-access-view.tsx` as `AdminAccessView({ state })`
    - Use `SystemStateView variant="admin"` with per-state copy. `UNAUTHENTICATED`: one `NiuvaLink` "Masuk" to `/admin/sign-in`. `FORBIDDEN`: `AdminSignOutButton`. `AUTH_UNAVAILABLE`: `AdminReloadButton`. Every state has exactly one link to `/`.
    - Export `robots: { index: false, follow: false }` behavior consistently, and render no email, user id, role name or raw error.
    - Replace all references to the old `AdminAccessUnavailableView` name across `src` (search first).
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.9, 7.10, 7.11, 14.1_

  - [x] 7.4 Update `src/app/admin/page.tsx` and `src/app/admin/queue/page.tsx`
    - Consume `AdminPageAccessResult`. Render `<AdminAccessView state={gate.state} />` when denied, and return no admin data in any denied state.
    - _Requirements: 7.6, 7.7_

  - [x] 7.5 Update the six admin list pages
    - Files: `src/app/admin/{custom-print,inquiries,orders,portfolio,pricing,products}/page.tsx`. Remove each private `loadAdminAccess` and use the shared `loadAdminPageAccess`. Render `AdminAccessView` on denial and include no admin data in denied responses.
    - Unexpected errors now propagate to `Admin_Error_Boundary` (intentional, per design Keputusan F).
    - _Requirements: 7.6, 7.7_

  - [x] 7.6 Update the two privacy pages
    - Files: `src/app/admin/privacy/page.tsx` and `src/app/admin/privacy/policy/page.tsx`. Use `loadAdminPageAccess({ permission: "PRIVACY_REQUEST_MANAGE" })` and render `AdminAccessView` on denial.
    - _Requirements: 7.6, 7.7_

  - [x] 7.7 Update existing tests for the new access view
    - `tests/unit/admin-access-view.test.tsx`: one separate case per state (title, description, actions, one home link, no cross-state controls). Sign-out success calls `signOut({ redirectUrl: "/" })`; failure shows the alert and the button stays enabled. Reload calls `router.refresh` and the state persists. Inject email, user id, role and raw error values and assert none render.
    - `tests/integration/admin-page-route.test.ts`: replace "Akses admin belum tersedia" with the `FORBIDDEN` title; the success case is unchanged. Add one case where a valid id without a record yields `notFound()` rather than unavailable. If no test database is available, update the file and report that it was not run.
    - Grep `tests/` for other assertions on the old title and update them without reducing test or assertion counts.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.11, 7.12, 7.13, 7.14, 15.1, 15.5_

  - [x] 7.8 Write property test for state mapping
    - File: `tests/unit/properties/p08-admin-access-mapping.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 8`.
    - **Property 8: Error-to-state mapping is total over ERROR_CODES**
    - Exhaustively cover `ERROR_CODES`, plus non-`AppError` values. Assert `loadAdminPageAccess` returns the exact mapped state and rethrows unmapped errors.
    - **Validates: Requirements 7.6**

  - [x] 7.9 Write property test for `AdminAccessView` content
    - File: `tests/unit/properties/p09-admin-access-view.test.tsx`. Tag: `// Feature: system-pages-and-error-states, Property 9`.
    - **Property 9: Per-state content and controls**
    - Over the three states, assert distinct non-empty Indonesian title and description, exactly one link to `/`, `UNAUTHENTICATED` has exactly one `/admin/sign-in` link, `FORBIDDEN` exactly one sign-out control, `AUTH_UNAVAILABLE` exactly one reload control, and no control from another state.
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 8. Tri-state admin record loader, detail pages and admin not-found
  - [x] 8.1 Create `src/app/admin/admin-record-loader.ts`
    - Export `AdminRecordResult<T>` (`found` with `record`, `not-found`, `unavailable`) and `loadAdminRecord(read)`. A non-null result (including falsy values such as `0`, `""`, `{}`) returns `found`. `null` or `AppError NOT_FOUND` returns `not-found`. Every other throw returns `unavailable`.
    - Call `unstable_rethrow(error)` first so Next.js control-flow errors are not swallowed.
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.2 Create `src/app/admin/not-found.tsx`
    - Server Component, with `metadata` carrying `robots: { index: false, follow: false }`. Render `SystemStateView variant="admin" stateId="admin-not-found" {...systemCopy.adminNotFound}` and `NiuvaLink href="/admin"` ("Kembali ke Overview") with `min-h-11`.
    - It does not call `requireAdmin()`, and shows no id, role or raw text.
    - _Requirements: 8.5, 8.6, 8.8, 14.1, 14.3, 14.4_

  - [x] 8.3 Update `src/app/admin/orders/[id]/page.tsx`
    - Order: `await connection()` → `loadAdminPageAccess()` (render `AdminAccessView` on denial) → UUID check (`notFound()` without reading data) → `loadAdminRecord(() => service.getOrder(id))`. Then `not-found` → `notFound()`, `unavailable` → `AdminDataUnavailableView`, `found` → render.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_

  - [x] 8.4 Update `src/app/admin/inquiries/[id]/page.tsx`
    - Same flow using `getInquiry`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_

  - [x] 8.5 Update `src/app/admin/custom-print/[id]/page.tsx`
    - Same flow using `getCustomPrintRequest` inside the existing `Promise.all`. Secondary reads (`B2BQuoteService.listForAdmin`, `CustomPrintEstimateService.latestForAdmin`) stay as they are.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_

  - [x] 8.6 Update `src/app/admin/portfolio/[id]/page.tsx`
    - Same flow using `getPortfolio`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_

  - [x] 8.7 Update `src/app/admin/products/[id]/page.tsx`
    - Same flow using `getProduct`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_

  - [x] 8.8 Update `src/app/admin/products/[id]/stock/[variantId]/page.tsx`
    - Same flow using `getStockHistory`. Remove the `undefined`/`null` sentinel. Validate both `id` and `variantId` as UUIDs before reading data.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 8.9_

  - [x] 8.9 Audit remaining admin detail pages
    - Search `src/app/admin/**` for other pages using the `try/catch → null` loader pattern on a detail record. Apply the same flow where found. If none remain, record that in the completion report.
    - _Requirements: 8.4_

  - [x] 8.10 Write unit tests `tests/unit/admin-not-found.test.tsx`
    - Assert one `h1`, one `main#main-content`, a `/admin` link with `min-h-11`, metadata robots noindex/nofollow, and the main message plus recovery action. Inject an id and raw error text and assert neither renders.
    - _Requirements: 8.5, 8.6, 8.8, 14.1, 15.1, 15.5_

  - [x] 8.11 Write unit tests `tests/unit/admin-detail-pages.test.tsx`
    - For each of the six detail pages: service returns `null` → `notFound()` (not the unavailable view); service throws → `AdminDataUnavailableView` without `notFound()` and without record data; non-UUID id → `notFound()` with no read; denied access → `AdminAccessView` with no read, no `notFound()`, no unavailable view.
    - _Requirements: 8.1, 8.2, 8.4, 8.7, 8.8, 8.9, 15.4_

  - [x] 8.12 Write property test for the record loader
    - File: `tests/unit/properties/p07-admin-record-loader.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 7`.
    - **Property 7: Loader results are exclusive and exhaustive**
    - Enumerate `read()` outcomes: non-null (including falsy values), `null`, `AppError` for every code in `ERROR_CODES`, plain `Error`, non-Error throws. Assert it never throws and the status mapping is exact.
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 8.13 Write property test for the gate order on detail pages
    - File: `tests/unit/properties/p10-admin-detail-gate-order.test.tsx`. Tag: `// Feature: system-pages-and-error-states, Property 10`.
    - **Property 10: Access, then UUID, then data**
    - For all six pages and all three denied states, the loader and `notFound` are not called and the output is `AdminAccessView` with the same state. For at least 100 seeded non-UUID ids with access granted, `notFound()` is called and the loader is not. A valid UUID calls the loader exactly once.
    - **Validates: Requirements 7.7, 8.7, 8.9**

- [x] 9. Checkpoint - Admin access and record flow
  - Run `corepack pnpm lint`, `corepack pnpm typecheck` and `corepack pnpm test`. Fix failures caused by tasks 7 and 8, including every reference to the old access view name. Ensure all tests pass, ask the user if questions arise.

- [x] 10. Order status `NextAction` resolver
  - [x] 10.1 Extend the projection type in `src/features/frontend-preview/order-status.ts`
    - Add optional `quoteHref?: string` to `OrderStatusPreview["nextAction"]`. Add no producer in this slice; the design records the candidate source as out of scope.
    - _Requirements: 12.3_

  - [x] 10.2 Create `src/app/orders/[token]/next-action.ts` (pure)
    - Export `PREVIEW_QUOTE_HREF`, `NextActionControl`, `isSafeLiveQuoteHref` and `resolveNextActionControl({ action, payment, isPreview })`. Use `import type` only.
    - `isSafeLiveQuoteHref`: non-empty string, starts with `/` but not `//`, no `\`, no whitespace or control characters, length 2048 or less, same-origin when resolved against `http://niuva.invalid`, and no `preview` substring (case-insensitive).
    - Resolution: `payment.redirectUrl` → `payment-link` (same href and labels as today, including `CUSTOM_SHIPPING`). `quote` → `quote-link` to the preview href only when `isPreview === true`; on live, a safe `quoteHref` → `quote-link` unchanged, otherwise `quote-unavailable`. `payment-unavailable` and `shipping-payment-unavailable` → `disabled`. `none` and `support` → `none`.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.9_

  - [x] 10.3 Wire `src/app/orders/[token]/order-status.tsx`
    - `NextAction` maps each `NextActionControl` to its element: `payment-link` → the same `<a target="_blank" rel="noreferrer">`, `quote-link` → link, `disabled` → disabled `Button`, `quote-unavailable` → `StatusNotice tone="warning"` titled "Tautan quote belum tersedia" with no `<a>` or `<button>`, `none` → nothing.
    - Pass `isPreview` from `OrderStatus`. Never read query parameters. Treat anything other than `=== true` as live.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9_

  - [x] 10.4 Write unit tests `tests/unit/order-next-action.test.ts` and extend the order status component tests
    - Resolver (exhaustive over `kind × payment × isPreview × quoteHref`) and DOM tests: at least one preview case and one live case; live DOM has no `/quote/preview-quote` or `preview=examples` in any link attribute; payment link unchanged; `quote-unavailable` renders no focusable control; `isPreview` omitted is live.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 15.3_

  - [x] 10.5 Write property test for live-mode isolation
    - File: `tests/unit/properties/p01-next-action-live-isolation.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 1`.
    - **Property 1: NextAction isolation on live projections**
    - Cover `isPreview ∈ {false, undefined}` × all kinds × payment variants × the `quoteHref` corpus (missing, empty, preview variants in mixed case, absolute URL, `//host`, `javascript:`, spaces or backslash, valid relative). Assert no control href contains `preview` (case-insensitive), and that `quote-link` carries the exact `quoteHref` if and only if `isSafeLiveQuoteHref` is true. Add the `isPreview === true` quote case.
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.9**

  - [x] 10.6 Write property test for payment-link priority
    - File: `tests/unit/properties/p02-next-action-payment-priority.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 2`.
    - **Property 2: Payment link priority is unchanged**
    - For any `isPreview`, kind and `quoteHref`, when `payment.redirectUrl` exists the control is `payment-link` with the exact `redirectUrl` and the same label as before ("Buka pembayaran", or "Buka pembayaran pengiriman" for `CUSTOM_SHIPPING`).
    - **Validates: Requirements 12.8**

- [x] 11. Customer login copy
  - [x] 11.1 Update copy in `checkout/page.tsx`, `project-brief/page.tsx` and `custom-print/request/page.tsx`
    - Use the exact Indonesian strings from the design's R11 table. The "Login Customer belum tersedia." titles stay byte-identical where they exist today, and are not added to pages that lack them.
    - Do not change gating, the `customerGoogle` flag or `/login` redirects. Leave the `checkout/page.tsx` body line that mentions "Google session" unchanged and list it as an Owner decision in the report.
    - Search `tests/` for assertions on the old copy and update them so test and assertion counts do not decrease (the design found none).
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7_

  - [x] 11.2 Update copy in `src/app/custom-print/page.tsx`
    - Change the three locations: (a) notice title, (b) submission call-to-action text, (c) delivery status title. Each must contain "login Customer" and never "Google". Use the design's strings and leave gating untouched.
    - _Requirements: 11.4, 11.5, 11.7_

  - [x] 11.3 Write unit tests `tests/unit/customer-login-copy.test.ts`
    - For each of the four pages, assert the copy contains "login Customer" and not "google" (case-insensitive) at every affected location, that "Login Customer belum tersedia" titles are unchanged, and that gating and redirect behavior are unchanged.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 12. Cart loading state and loading coverage manifest
  - [x] 12.1 Create `src/app/cart/loading.tsx`
    - `export default function CartLoading() { return <PublicLoadingState scope="cart" label={systemCopy.loading.cart} />; }`. This is the only new `loading.tsx`. Do not touch `src/app/admin/loading.tsx`.
    - _Requirements: 6.1, 6.2, 6.3, 6.9_

  - [x] 12.2 Create `tests/unit/system-pages-coverage.test.ts`
    - Scan `src/app/**/page.tsx` outside `src/app/admin` for `connection()` and compare against the manifest from the design table (21 files: `covered` with its loading file, or `excluded` with reason `X1-404-contract`, `X2-redirect-guard`, `X3-root-wraps-admin` or `X4-non-product`).
    - Every scanned file must be in the manifest. Every `covered` entry must have a `loading.tsx`. Every non-admin `loading.tsx` must be a `covered` entry. Assert `src/app/admin/loading.tsx` matches a reference hash of its current content.
    - Tag with `// Feature: system-pages-and-error-states, Property 11`. This task delivers Property 11 and is required.
    - **Property 11: The loading coverage manifest is complete**
    - **Validates: Requirements 6.1, 6.9**
    - _Requirements: 6.1, 6.9_

- [x] 13. Clerk sign-in verification and conditional catch-all
  - [x] 13.1 Hide the Clerk footer sign-up link on `src/app/admin/sign-in/page.tsx`
    - Add `elements.footerAction: { display: "none" }` to `appearance`. Keep `routing="path"`, `path="/admin/sign-in"`, `forceRedirectUrl="/admin"`, `withSignUp={false}` and `metadata.robots`. Add no sign-up route.
    - Update `tests/unit/admin-sign-in.test.tsx`: assert `footerAction` is hidden and the other props are preserved.
    - _Requirements: 10.7, 10.8, 10.9_

  - [x] 13.2 Re-probe Clerk sub-steps after the proxy fix (verification task)
    - Start `next dev` on a free port with a separate dist dir (background process), using the dev Clerk keys from `.env.local` without printing them. Drive Chromium with a temporary Playwright script, unauthenticated, against `/admin/sign-in`, `/admin/sign-in/factor-one`, `/admin/sign-in/sso-callback` and one more sub-step.
    - Record the requested path, final URL and classification (`sign-in-rendered`, `not-found-404`, `redirected-to-sign-in`, `unverified`) for each path. Also record whether a sign-up link appears on each page.
    - Write results to `.kiro/specs/system-pages-and-error-states/clerk-probe-results.md`. Do not edit `design.md`.
    - If keys are missing or Clerk is unreachable, mark the paths `unverified` with the reason. Do not conclude that no code change is needed for those paths.
    - Afterwards stop the server, delete the temporary script and dist dir, and restore any tracked file the probe changed (for example `tsconfig.json` or `next-env.d.ts`).
    - _Requirements: 10.1, 10.4, 10.9, 10.10_

  - [x] 13.3 Conditional catch-all move (depends on the 13.2 result)
    - If any probed sub-step returns 404 or does not render the Clerk sign-in on the requested URL: move `src/app/admin/sign-in/page.tsx` to `src/app/admin/sign-in/[[...sign-in]]/page.tsx` with `smart_relocate`. Keep all props, `metadata.robots` and the hidden footer. Update the import in `tests/unit/admin-sign-in.test.tsx` and re-probe the failing paths. Do not leave two routes on the same URL.
    - If every probed sub-step renders on its requested URL: make no route change and record "no change needed" in the probe results file with evidence.
    - If results are `unverified`, make no move and record that the catch-all decision remains open.
    - Confirm there is no sign-up route and no sign-up link on any verified path.
    - _Requirements: 10.2, 10.4, 10.7, 10.8, 10.9, 10.10_

- [x] 14. Checkpoint - Order status, copy, loading, Clerk
  - Run `corepack pnpm lint`, `corepack pnpm typecheck` and `corepack pnpm test`. Ensure all tests pass, ask the user if questions arise.

- [x] 15. E2E specs and existing-test updates
  - [x] 15.1 Update `tests/e2e/admin-access.spec.ts`
    - Browser navigation with `Accept: text/html` now receives the HTML 503. Replace assertions on `AUTH_UNAVAILABLE` text with the new copy: the `h1` "Layanan autentikasi admin belum tersedia", one home link, and no `AUTH_UNAVAILABLE`, env var names or "Clerk" text.
    - Keep the existing negative assertions. Add an API case: `/api/admin/privacy` with `Accept: text/html` returns 503 JSON `AUTH_UNAVAILABLE`.
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.11, 15.2_

  - [x] 15.2 Update `tests/e2e/admin-action-queue.spec.ts`
    - Same change for the queue routes (`/admin/queue?group=orders` and related). Keep the existing negative assertions. Add a `/admin` request with `Accept: application/json` expecting the 503 JSON.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 15.2_

  - [x] 15.3 Create `tests/e2e/system-pages.spec.ts`
    - A random URL returns 404 and shows Root_Not_Found (`h1` "Halaman ini tidak tersedia.", robots `noindex`, no path echoed, one Tab from load lands on "Kembali ke beranda"). `/services/tidak-ada` returns 404 with Root_Not_Found.
    - Two different invalid tokens on `/quote/<token>` and `/orders/<token>` each return 404 with identical `main` content and no requested token in the DOM. `/custom-print/requests/<invalid token>` returns 404 with Root_Not_Found. Skip the valid-shaped-but-absent token case only with a recorded reason when no test database is available.
    - Proxy HTML: `/admin`, `/admin/queue?group=orders` and the stock detail path with `Accept: text/html` return 503 HTML with the correct `content-type`, `cache-control` and `x-robots-tag`. Record whether `next.config.ts` CSP headers also appear on the proxy response, as information only.
    - Existing 404 contract specs (`product-detail`, `quote-review`, `order-status`, `public-pages`, `reference-intake`) must stay green and unmodified.
    - _Requirements: 1.3, 1.5, 1.6, 1.7, 2.1, 2.2, 2.4, 2.5, 2.7, 9.1, 9.3, 9.4, 14.7, 15.6_

  - [x] 15.4 Sweep existing tests for stale assertions
    - Search `tests/` for stale strings and names: the old access view name, "Akses admin belum tersedia", `AUTH_UNAVAILABLE` text on browser navigation, and the old sign-in page import path. Fix only what the changes above invalidated, without reducing test or assertion counts and without weakening tests.
    - _Requirements: 7.1, 9.9, 11.7, 15.2_

- [x] 16. Cross-surface property tests
  - [x] 16.1 Write property test for leak-free system surfaces
    - File: `tests/unit/properties/p05-no-leak.test.tsx`. Tag: `// Feature: system-pages-and-error-states, Property 5`.
    - **Property 5: System renderers never leak injected strings**
    - For `Root_Not_Found`, `Public_Error_Boundary`, `GlobalErrorView`, `Admin_Error_Boundary`, admin not-found and `AdminAccessView` (three states), inject at least 100 seeded error messages, stacks, digests, names, tokens, ids and slugs. Assert none appear in text or attributes (`title`, `aria-*`, `data-*`). Assert the admin error boundary's markup is identical to its baseline for every error.
    - **Validates: Requirements 1.9, 2.5, 2.7, 3.5, 4.4, 5.3, 5.9, 7.11, 8.8**

  - [x] 16.2 Write property test for system-surface structure
    - File: `tests/unit/properties/p12-surface-structure.test.tsx`. Tag: `// Feature: system-pages-and-error-states, Property 12`.
    - **Property 12: Structural invariants of system surfaces**
    - Over all surfaces (Root_Not_Found inside `PublicShell`, both error boundaries, `GlobalErrorView`, admin not-found, `AdminAccessView` × 3): exactly one non-empty Indonesian `h1`, one `main#main-content`, a skip link to `#main-content` before every other focusable element, every other `a`/`button` has `min-h-11` and no non-essential animation class. For `PublicLoadingState`: one labelled `role="status"`, zero `h1`, one `main`.
    - **Validates: Requirements 14.1, 14.2, 14.3, 7.10, 3.8, 6.3, 6.7**

  - [x] 16.3 Write property test for system copy constraints
    - File: `tests/unit/properties/p13-system-copy.test.ts`. Tag: `// Feature: system-pages-and-error-states, Property 13`.
    - **Property 13: Copy constraints**
    - For every string in `systemCopy` and the text of the proxy HTML response: non-empty, each sentence 20 words or fewer, and no "exception", "stack" or "digest" (case-insensitive). Also scan the new source files for hex, `rgb()`, `hsl()` and arbitrary `[Npx]` values. The only allowed exception is the documented inline palette inside the proxy HTML module.
    - **Validates: Requirements 14.9, 1.8, 4.6, 6.5, 14.5**

- [x] 17. APPROVAL-GATED - Remove empty AUiS directories (R13)
  - **DO NOT EXECUTE unless the user explicitly approves deletion in writing and the approval names the AUiS empty directories.** A coding request, this task list, or the design is NOT approval. Without written approval, leave 17.1 to 17.4 unchecked and report "deletion deferred pending Owner approval" in the completion report. No file or directory may be deleted. Targets: `src/app/auis/{proofs,styleguide,welcome,wireframes,_data}` and `src/app/api/auis/brand`.
  - [x] 17.1 Confirm written Owner approval
    - Look for a written user instruction that names the deletion of the AUiS empty directories. If absent, stop here, skip 17.2 to 17.4 and record the deferral.
    - _Requirements: 13.1, 13.2_

  - [x] 17.2 Verify emptiness and references (only after 17.1 passes)
    - For each target, count files recursively (`Get-ChildItem -Recurse -File`). Skip and report the path and count for any directory with 1 or more files.
    - Search source, config and active docs for imports and string references to each path and report the results. Skip and report the locations of any directory that is referenced.
    - _Requirements: 13.1, 13.3, 13.4, 13.5_

  - [x] 17.3 Delete only the verified-empty, unreferenced directories (only after 17.2)
    - Delete the deepest directories first. Do not touch `src/app/auis`, `src/app/api/auis` or anything outside the targets. Git does not track empty directories, so rollback means recreating the empty directories.
    - _Requirements: 13.1, 13.6_

  - [x] 17.4 Run `corepack pnpm typecheck` and `corepack pnpm build` after deletion
    - Report each command's exit code and pass or fail status. If either fails, report the failed command and a sanitized error summary, and do not claim the cleanup succeeded.
    - _Requirements: 13.7, 13.8_

- [x] 18. Scope guard verification
  - [x] 18.1 Verify that protected areas and dependencies are untouched
    - With read-only `git status` and `git diff --stat` (no staging, no commit), confirm there are no changes to `package.json`, the lockfile, `.env*`, `.github/workflows/`, `prisma/migrations/`, `next.config.ts`, `src/app/admin/loading.tsx` or the four scoped not-found files. Confirm `.config.kiro`, `requirements.md` and `design.md` are unmodified. Report any deviation instead of hiding it.
    - _Requirements: 14.10, 9.8, 6.9, 2.3_

- [x] 19. Final checkpoint - Quality gates
  - Run `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` and `corepack pnpm build`, and report pass or fail for each.
  - Run `corepack pnpm test:e2e` where the environment supports Playwright (it starts its own dev server). Run `corepack pnpm test:integration` only if a test database is available.
  - If a command fails or cannot run, report the command, the cause summary and the related work as unverified, and mark the E2E criteria as not verified in a browser.
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 15.7, 15.8, 15.12, 15.13_

- [x] 20. Completion report
  - [x] 20.1 Produce the completion report (final task)
    - Write it to `.kiro/specs/system-pages-and-error-states/completion-report.md` and also give it as the final message. Contents: files changed; commands run; test, build and E2E results (or why E2E was not run); acceptance criteria covered per requirement; remaining risks; rollback notes (revert per file, with the proxy no-credentials branch as the key rollback point, and recreate empty directories if R13 ran).
    - State that visual acceptance is unreviewed until the user explicitly accepts it, and that passing tests or build is not visual approval.
    - State that all evidence is local and non-production, and that physical-device, assistive-technology, provider and production acceptance remain separate.
    - State the R13 outcome (executed with evidence, or deferred pending written approval), and the Clerk sub-step outcome (paths, final URLs, classifications, any `unverified`).
    - List Owner follow-ups: the Clerk Dashboard sign-up control (not a task in this plan); the "Google session" body text in `checkout/page.tsx`; the missing live `quoteHref` producer; the limited `loading.tsx` coverage and the design's options B1/B2; whether to approve `fast-check`; and `global-error` not verified in a real browser.
    - _Requirements: 15.9, 15.10, 15.11, 15.12, 15.13_

## Notes

- Tasks marked with `*` are optional, following the workflow convention: new property tests and the shared corpus helper. Property tests are table-driven with seeded corpora of at least 100 cases, because `fast-check` is not installed and R14.10 forbids new dependencies.
- Tests that R15 requires, and updates to existing tests that the changes would break, are not marked optional: 1.4, 2.5, 3.2, 4.4, 5.2, 7.7, 8.10, 8.11, 10.4, 12.2, 13.1 (test part), 15.1 to 15.4.
- Task 17 is approval-gated. Nothing in it may run without the user's written approval.
- Tasks 7.1 to 7.6 are one compile unit. Typecheck is expected to pass again after 7.6.
- Each task references the specific acceptance criteria it covers. Checkpoints ensure incremental validation.
- Visual acceptance stays unreviewed and all evidence is local and non-production.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.2", "4.3", "7.1", "8.1", "10.1", "11.1", "11.2", "13.1"] },
    { "id": 1, "tasks": ["1.3", "1.5", "1.6", "2.3", "2.4", "5.1", "7.2", "7.8", "8.12", "10.2", "11.3"] },
    { "id": 2, "tasks": ["1.4", "2.5", "3.1", "4.1", "4.2", "5.2", "7.3", "8.2", "10.3", "10.5", "10.6", "12.1", "13.2"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.4", "7.4", "7.5", "7.6", "7.9", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8", "8.10", "10.4", "12.2", "13.3"] },
    { "id": 4, "tasks": ["3.4", "7.7", "8.9", "8.11", "8.13"] },
    { "id": 5, "tasks": ["15.1", "15.2", "15.3", "16.1", "16.2", "16.3"] },
    { "id": 6, "tasks": ["15.4"] },
    { "id": 7, "tasks": ["17.1"] },
    { "id": 8, "tasks": ["17.2"] },
    { "id": 9, "tasks": ["17.3"] },
    { "id": 10, "tasks": ["17.4"] },
    { "id": 11, "tasks": ["18.1"] },
    { "id": 12, "tasks": ["20.1"] }
  ]
}
```
