# Niuva Admin Core, Customers, and Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` after implementation authorization; delegation only if explicitly chosen. Track the checkboxes. Read the master plan and spec first.

**Goal:** Menyediakan navigasi baru, halaman kerja konsisten, notifikasi per akun, direktori customer, dan Informasi Situs yang dapat dikelola.

**Architecture:** Reuse AdminShell, existing domain actions, list-query/navigation helpers, and AuditLog. Notification feed is an authorized projection with per-profile receipts; Customers is a read model; Site Information has a small versioned persistence model and a server-side public reader.

**Tech Stack:** Existing Next/React/Prisma/Zod/Base UI/Tailwind/Vitest/Playwright; no new dependency in this package.

**Spec:** [Approved scope S01–S11, S19–S20](../specs/2026-10-08-admin-redesign-design.md). **Master:** [global plan](2026-10-08-admin-redesign-implementation.md).

## Global Constraints

- Global constraints in the master apply: strict TypeScript, validated boundaries, Decimal money, MFA/active profile, no secrets or destructive operations.
- Space Grotesk, official logo/tokens, control minimum 44px, control radius 8px/card 12px, reduced motion.
- Owner-only menus are also Owner-only at direct URL/POST. Notification read state never mutates business state.
- Customer history uses stored customerId; accountClosedAt and lifecycle fences remain authoritative.
- Planning baseline contains dirty/untracked Admin changes; preserve them and unrelated ` (1)` files.

## Review Focus

1. Forged returnTo or stale bookmarked Queue/Pricing URL: stay internal and reach an authorized domain (A1).
2. Notification event resolves through PaymentAttempt/quote/file instead of Order ID: valid precise target without raw audit payload/PII (A2).
3. Login/reload, two tabs, many events and identical timestamps: history remains complete; no repeated historical popup (A2–A3).
4. Long record references and disabled storage at narrow viewport: keyboard navigation and back context still work (A4).
5. Closed/recreated customer and concurrent public content edits: no history relink, data leak, or silent lost update (A5–A6).

## A1 — Permissions, navigation, and return context

**Files:** Modify `src/modules/admin/permissions.ts`, `src/modules/admin/navigation.ts`, `src/modules/admin/list-query.ts`, `src/components/niuva/admin-shell.tsx`, `src/components/niuva/admin-sidebar.tsx`, `src/app/admin/queue/page.tsx`, `src/app/admin/pricing/page.tsx`; create `src/modules/admin/navigation-items.ts`, `src/app/admin/settings/page.tsx`; test `tests/unit/admin-navigation.test.ts`, `tests/unit/admin-sidebar.test.tsx`, `tests/backend/admin-operations-permissions.test.ts`, `tests/e2e/admin-action-queue.spec.ts`.

**Interfaces:** Consumes `AdminAccess`, `AdminPermission`, `AdminRootPath`, `AdminListQuery`. Produces `getAdminNavigation(access: AdminAccess): readonly AdminNavGroup[]`, with `AdminNavGroup = {label: string; items: readonly AdminNavItem[]}` and `AdminNavItem = {label: string; href: AdminRootPath; children?: readonly AdminNavItem[]}`. Preserve `normalizeAdminReturnTo(value: unknown, fallback: AdminRootPath): string` and `withAdminReturnTo(destination: string, returnTo: string): string`.

- [ ] Add behavior tests: inactive/direct-POST forbidden; Admin may use Finance/Customers/Konten/Reports but not tariff, B2B terms, bank settings, Admin access, or privacy. A forged `returnTo=https://example.invalid` yields fallback; valid `/admin/finance/invoices?page=2` survives normalization.

  ```ts
  expect(normalizeAdminReturnTo("https://example.invalid", "/admin/orders")).toBe("/admin/orders");
  expect(normalizeAdminReturnTo("/admin/finance/invoices?page=2", "/admin")).toBe("/admin/finance/invoices?page=2");
  ```

- [ ] Run `corepack pnpm test -- tests/unit/admin-navigation.test.ts tests/unit/admin-sidebar.test.tsx` and `corepack pnpm test:backend -- tests/backend/admin-operations-permissions.test.ts`; new cases must fail on baseline for the missing contracts.
- [ ] Add permissions `CUSTOMER_DIRECTORY_READ`, `SITE_CONTENT_WRITE`, `FINANCE_READ`, `FINANCE_WRITE`, `FINANCE_CORRECT`, `REPORT_READ` for both roles; `B2B_BILLING_TERMS_MANAGE` and `BILLING_SETTINGS_MANAGE` for Owner. Keep existing Owner-only refund/paid-order cancellation/pricing/privacy/admin permissions. Gate read and mutation boundaries, not only menus.
- [ ] Implement grouped navigation, nested Konten/Keuangan, active parent, collapsed accessible labels, mobile menu, Owner settings. Only expose a new route when its task is complete. Extend return-context allowlists per domain, including the validated `view=needs-action|issues` introduced in C3, and reject foreign/malformed paths.
- [ ] Convert Queue page to validated compatibility redirect: orders/custom-print/inquiries groups to their domain list; all/invalid to Overview. Convert legacy Pricing URL to Owner-authorized tariff redirect. Keep domain attention logic and tests; replace Queue UI E2E assertions with redirect/direct-domain assertions.
- [ ] Re-run targeted tests and typecheck. Deliverable: safe navigation/role/return contracts ready for subsequent modules.

## A2 — Authorized notification feed and per-account state

**Files:** Modify `prisma/schema.prisma`, `src/modules/admin/activity-timeline.ts`; create a new `admin_notification_receipts` migration, `src/modules/admin/notifications/types.ts`, `repository.ts`, `service.ts`, `target.ts`, `src/app/api/admin/notifications/route.ts`, `src/app/api/admin/notifications/read/route.ts`; tests `tests/unit/admin-notification-target.test.ts`, `tests/integration/admin-notifications.test.ts`.

**Interfaces:** `AdminNotificationItem = {id: string; title: string; group: string; href: string | null; createdAt: string; isRead: boolean; requiresAttention: boolean}`. `NotificationFeed = {items: readonly AdminNotificationItem[]; unreadCount: number; nextCursor: string | null; toastCandidates: readonly AdminNotificationItem[]}`. `AdminNotificationService.bootstrap(access): Promise<NotificationFeed>`, `poll(access, input: unknown): Promise<NotificationFeed>`, `markRead(access, input: unknown): Promise<void>`. `resolveActivityTarget(event: ActivityTargetInput): Promise<string | null>` consumes a minimal `{id, entityType, entityId, action}` plus safe relational lookups.

- [ ] Add integration cases using two active Admin profiles plus Owner: independent unread/read, Admin exclusion of team/privacy/Owner settings events, markRead changes no Order/Inquiry/Request, bootstrap emits no popup, event pagination keeps identical timestamps, >50 events keep full unread/history, no PII/token/raw JSON payload in DTO. Target tests cover Order, PaymentAttempt→Order, B2BQuote→Inquiry, CustomPrintQuote→Request/workspace, Invoice and Expense; deleted/inaccessible source returns null.

  ```ts
  expect(ownerFeed.toastCandidates).toEqual([]); // bootstrap
  expect(adminBFeed.items.find(item => item.id === eventId)?.isRead).toBe(false); // A read it
  expect(orderAfter.status).toBe(orderBefore.status);
  ```

- [ ] Run `corepack pnpm test -- tests/unit/admin-notification-target.test.ts` and `corepack pnpm test:integration` with the new `tests/integration/admin-notifications.test.ts` cases included; verify failures are missing behavior. The integration wrapper runs the complete suite and does not forward file filters.
- [ ] Add `AdminNotificationState` (unique profile, activation baseline) and `AdminNotificationReceipt` (unique profile/audit event, readAt, toastClaimedAt); index global AuditLog `(createdAt,id)`. Use additive FK/index SQL and test migration on isolated DB. Receipts are derived state: their AuditLog FK uses `ON DELETE CASCADE` so legitimate existing customer-privacy audit cleanup is not blocked. Test cleanup with a linked receipt; this does not authorize deleting financial history.
- [ ] Derive history from persisted AuditLog, filtering permissions before counts/pagination. Select entityId and resolve related target server-side; never forward metadataJson or payment tokens. Historical events before first notification activation remain history with no old-popup flood. Record reads per profile; reading an event does not change a business status.
- [ ] Bootstrap suppresses popup replay without marking unread history as completed. Poll latest bounded windows and use opaque validated pagination; do not use timestamp alone as a history cursor. Atomically claim live attention popup receipts per profile/event. Keep panel as durable fallback if a delivery attempt fails; batch large bursts rather than spawning every popup. Late visible events and equal timestamps remain discoverable through latest-window refresh plus history pagination.
- [ ] Add same-origin, no-store JSON handlers using existing HTTP/auth conventions and Zod; active/MFA/permission checked on every request. Replay/foreign-profile receipt mutations denied. Re-run tests and `corepack pnpm db:validate`.

## A3 — Navbar panel, targeted popups, and expanded global search

**Files:** Create `src/components/niuva/admin-notification-center.tsx`, `admin-notification-toast.tsx`; modify `src/components/niuva/admin-shell.tsx`, `admin-global-search.tsx`, `admin-account-menu.tsx`, `src/modules/admin/global-search.ts`, `src/app/admin/activity/page.tsx`, `src/app/admin/search/page.tsx`; tests `tests/unit/admin-search-activity.test.ts`, `tests/e2e-admin-auth/admin-dashboard-ux.spec.ts`, new `tests/e2e-admin-auth/admin-notifications.spec.ts`.

**Interfaces:** Consumes A2 NotificationFeed, A1 navigation. Produces `AdminNotificationCenter()` with bell/panel/toast client behavior and `AdminGlobalSearchService.search(access, raw): Promise<readonly AdminSearchResult[]>`. Extend result kinds to `CUSTOMER | PRODUCT | PORTFOLIO | INVOICE` when their source is ready; preserve existing kinds/query 2–80 characters/take 5 per domain.

- [ ] Add meaningful browser cases: bell keyboard open/close and focus return, notification deep link, per-account read persistence, new attention event popup, routine update only in history, login/reload no replay, offscreen/hidden tab pause, unread badge independent from attention counts. Search returns authorized record links without closed customer data or stale removed menus.
- [ ] Run existing UX spec and the new notification spec with `corepack pnpm test:e2e:admin-auth -- tests/e2e-admin-auth/admin-dashboard-ux.spec.ts tests/e2e-admin-auth/admin-notifications.spec.ts`; record expected new failures.
- [ ] Implement panel using existing Base UI primitives, with All/Unread filtering and link to paginated `/admin/activity`. Poll every 15 seconds while visible, pause hidden, refresh on focus, back off failures to 30/60 seconds, and cancel pending requests on unmount. Maximum 3 visible toasts; burst summary opens panel. No websocket/SaaS dependency.
- [ ] Use polite live announcements, accessible close/action, no focus stealing, keyboard Escape for panel, reduced-motion feedback. Failed polling leaves navigation usable and exposes retry quietly in panel.
- [ ] Add search adapters for ready Customers/Catalog/Portfolio/Invoice sources with server permission/closed-source checks. Invoice search activates after B5. Preserve public-site/account/security/logout actions; do not change credentials or MFA.
- [ ] Re-run search unit and browser cases. Deliverable: working bell/history/attention popups and global search, not a cosmetic bell linked to a generic list.

## A4 — Redesign all existing Admin work pages

**Files:** Modify the shared `src/app/admin/admin-page-header.tsx`, `admin-list-controls.tsx`, `admin-work-list.tsx`, `admin-action-form.tsx`, `admin-loading.tsx`, `error.tsx`, `not-found.tsx`; relevant existing pages below; tests `tests/unit/admin-detail-pages.test.tsx`, `admin-custom-print-workspace.test.tsx`, `admin-b2b-proposal-page.test.tsx`, `admin-page-failure-group-a.test.tsx`, `admin-page-failure-group-b.test.tsx`, `admin-page-failure-group-c.test.tsx`, `tests/e2e-admin-auth/admin-operations.spec.ts`.

| Existing page family to cover | Exact route files under `src/app/admin/` |
|---|---|
| Orders | `orders/page.tsx`, `orders/[id]/page.tsx` |
| Custom Print | `custom-print/page.tsx`, `custom-print/[id]/page.tsx`, `custom-print/[id]/review/page.tsx` |
| B2B | `inquiries/page.tsx`, `inquiries/[id]/page.tsx`, `inquiries/[id]/proposal/page.tsx` |
| Products/Stock | `products/page.tsx`, `products/[id]/page.tsx`, `products/[id]/stock/[variantId]/page.tsx` |
| Portfolio | `portfolio/page.tsx`, `portfolio/[id]/page.tsx` |
| Access/Privacy | `admins/page.tsx`, `admins/new/page.tsx`, `privacy/page.tsx`, `privacy/[id]/page.tsx`, `privacy/policy/page.tsx` |
| Account/Authentication | `account/page.tsx`, `security/page.tsx`, `sign-in/[[...sign-in]]/page.tsx`; shared auth/security forms only for presentation |
| Utilities | `activity/page.tsx`, `search/page.tsx`, `layout.tsx`; tariff handled in C1 |

**Interfaces:** Consumes A1 return/list helpers and existing domain-service/action signatures. Produces a shared list/detail presentation with actual links and contextual action slots; business mutation signatures stay unchanged. Full detail has reference/status, primary information, supporting summary/actions, history.

- [ ] Extend behavioral tests for list→detail→back with q/status/page/type preserved, direct-URL fallback, very long reference, unavailable source/error isolation, keyboard record activation, and existing forbidden mutation/payment-hold behavior. Do not add tests that only repeat CSS classes/layout implementation.
- [ ] Run targeted existing unit tests before changes; use `tests/e2e-admin-auth/admin-operations.spec.ts` for real authenticated journey verification.
- [ ] Apply approved white/neutral composition and hierarchy on actual routes. Record title links are semantic anchors; row pointer affordances do not break keyboard, new-tab, or action buttons. Keep tables inside their overflow containers, statuses readable without color, and full detail/workspace on mobile.
- [ ] Restore valid list position/focus via browser history and optional per-tab normalized-list scroll state; denied storage still permits navigation. Cross-module links carry only validated internal returnTo; direct notification links have an explicit domain fallback.
- [ ] Preserve existing product/variant/stock/media/publication and portfolio operations; replace technical labels with business copy where values/contracts are unchanged. Keep paid-order cancellation/refund/stock/shipping confirmations and expected-version checks. Add Finance links only after B5. No unrelated CRUD/deletion feature expansion.
- [ ] Restyle account/security/sign-in using existing auth flow; no auth secret reset, MFA bypass, password policy change, or edits to Customer signup. Verify synthetic login, password/security behavior using existing actor fixtures, without exposing real credentials/recovery codes.
- [ ] Re-run targeted tests and authenticated browser journeys at desktop/mobile. Deliverable: every existing page family accounted for, including states/errors and Owner-only surfaces.

## A5 — Customers directory and legitimate linked history

**Files:** Create `src/modules/customers/types.ts`, `query.ts`, `repository.ts`, `service.ts`, `src/app/admin/customers/page.tsx`, `src/app/admin/customers/[id]/page.tsx`; modify navigation/search when ready. Tests `tests/integration/admin-customers.test.ts`, `tests/unit/admin-customers-view.test.tsx`, `tests/e2e-admin-auth/admin-customers.spec.ts`.

**Interfaces:** `CustomerDirectoryQuery = {page: number; q?: string}`, `CustomerDirectoryRow = {id: string; displayName: string | null; email: string; orderCount: number; customPrintCount: number; inquiryCount: number}`. `CustomerDirectoryService.list(access, raw): Promise<AdminReadPage<CustomerDirectoryRow>>`, `detail(access, id: string): Promise<CustomerDirectoryDetail | null>`. Detail contains paginated Order/CustomPrint/Inquiry links selected by customerId; B5 adds invoice links derived from those sources.

- [ ] Add fixtures: active A/B, detached legacy work sharing A's email, accountClosedAt records, closed/recreated A, and cross-customer links. Assertions: counts and history include only legitimate linked work; same email never grants linkage; direct closed customer has no readable profile.

  ```ts
  expect(detailA.orders.map(row => row.id)).not.toContain(detachedOrderId);
  expect(detailRecreated.orders).toEqual([]);
  ```

- [ ] Run `corepack pnpm test:integration` with the new `tests/integration/admin-customers.test.ts` cases included and validate expected failing behavior.
- [ ] Implement bounded query/count/select with existing relationships and indexes, 20 records/page, stable sorting. Do not expose password/auth/session/token fields. Reject inactive Admin and filter closed business rows. No email-based claim, customer impersonation, ban, or credential editor.
- [ ] Implement search/name-email table and detail with Orders/Custom Print/B2B tabs, reference/date/status/direct link and return context. Empty states distinguish no history from failure.
- [ ] Add browser customer→record→back flow, run unit/integration/browser targeted commands. Deliverable: useful directory and history without new CRM authority.

## A6 — Informasi Situs with public reader and preview

**Files:** Modify `prisma/schema.prisma`; create new `site_information` migration, `src/modules/site-information/types.ts`, `schema.ts`, `repository.ts`, `service.ts`, `public-reader.ts`, `src/app/admin/content/site-information/page.tsx`, `actions.ts`, `site-information-form.tsx`. Modify profile consumers in `src/components/niuva/public-shell.tsx`, `src/app/page.tsx`, `src/app/services/page.tsx`, `src/app/services/[slug]/page.tsx`, `src/app/projects/[slug]/project-detail-view.tsx`, `src/app/project-brief/page.tsx`, `brief-form.tsx`, `src/app/custom-print/request/request-form.tsx`, `reference-request-form.tsx`, and their server wrapper pages as needed for props. Tests `tests/integration/site-information.test.ts`, `tests/unit/site-information-form.test.tsx`, `tests/e2e-admin-auth/admin-site-information.spec.ts`.

**Interfaces:** `PublicSiteInformation = {shortDescription: string; email: string; phone: string; address: string; socialLinks: readonly {label: string; href: string}[]}`. `SiteInformationService.load(access): Promise<{version: number; values: PublicSiteInformation}>`, `publish(access, input: unknown): Promise<{version: number}>`; `getPublicSiteInformation(): Promise<PublicSiteInformation>` is server-only and falls back to approved `publicCompanyProfile` fields if no published row/read unavailable. Both roles use SITE_CONTENT_WRITE.

- [ ] Test valid profile publish/public read, preview without write, optimistic-version conflict, rejected `javascript:` social URL, failed save retaining form, fallback without invented facts. Existing service/intake enums/publication gate stay unchanged.

  ```ts
  expect((await service.load(access)).version).toBe(beforeVersion);
  expect(stalePublishError.code).toBe("CONFLICT");
  ```

- [ ] Run new unit/integration tests and observe baseline failure.
- [ ] Add SiteInformation singleton logical scope with UUID and version, plus SiteInformationRevision history; atomic expectedVersion update, strict known-field schema, audit actor/time. Reuse actual approved profile values; no arbitrary HTML or layout schema.
- [ ] Implement the form grouped Profil/Kontak/Media sosial, explaining public placement, preview, and publish feedback. Reject invalid URL/email/length and concurrent overwrite. Do not edit `publicServices`, service IDs, intake constraints, brand/logo, or legal policy from this form.
- [ ] Thread validated public-profile DTO from server wrappers into client forms/WhatsApp builders; keep `company-content.ts` service constants safe for client/domain imports. Inspect all current profile consumers, including `createPublicWhatsAppHref`, so they do not silently keep stale contact data. Revalidate affected public paths/layout after publish using installed Next conventions; do not share personalized data in a public cache.
- [ ] Run integration tests, representative public page browser checks, `corepack pnpm typecheck`, and build at package completion. Deliverable: editing/preview/publish affects real public content with safe fallback.
