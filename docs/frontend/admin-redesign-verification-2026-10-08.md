# Niuva Admin redesign — verification, 8 October 2026

## Scope and execution

Implemented the approved [S01–S20 spec](../superpowers/specs/2026-10-08-admin-redesign-design.md) and [A/B/C implementation plan](../superpowers/plans/2026-10-08-admin-redesign-implementation.md), in order P0 → A1–A6 → B1–B5 → C1–C3 → C4. Execution used native Windows tooling, sequential domain tasks, TDD for business boundaries, native self-review and measured verification. No delegation, commit, push, merge, deployment, production provider activation, destructive reset, existing-migration edit or real email send was performed.

Branch: `codex/admin-redesign`; base/HEAD remains `4c60f69`. Existing tracked and untracked Admin work was preserved in this checkout. [Workspace file inventory](admin-redesign-file-inventory-2026-10-08.md) records application/domain/schema/test/document paths, including earlier Admin work. The local execution ledger and test logs are under `.superpowers/sdd/2026-10-08-admin-redesign-implementation/`; they are scratch evidence, not a staging allowlist.

## Delivered surfaces and acceptance

| Area | Implemented behavior / actual route | Verified boundaries |
|---|---|---|
| Shell, navbar and account | Shared white sidebar, global search, public-site link, bell and identity/role account menu. Account/security/logout and Owner team access. | Both roles, shortcut, keyboard, real mandatory TOTP enrollment/login/logout, deactivation and forbidden Owner pages. |
| Notifications / activity | Authorized history, personal read receipts, all/unread/paging, exact record destinations. New attention-only toasts, three visible maximum, bounded polling and no replay of old history. | Equal timestamps, concurrent claims/bootstrap, per-account read state, routine activity, deactivation, same-origin/body/schema/cache boundaries. Reading is independent of open work. |
| Overview | Fixed bento at `/admin`: four current attention cards, receipts/expenses/paid orders and trend, five activities, compact traffic. Shared composition for Owner/Admin. | Attention is independent of `30d/13m` and notification read. Finance/traffic/activity failures are isolated. No fabricated financial growth/profit/unique visitors. |
| Operational records | Orders, Custom Print, B2B, products/stock, portfolio and privacy actual list/detail/workspace routes. | Direct `view=needs-action` / Orders `view=issues` uses the same business signals as counters. Filters/page, scroll and selected-record focus return. User input cancels bounded focus restoration. Native links remain usable without storage/JS enhancement. |
| Customers | `/admin/customers` and full detail with Orders, Custom Print, B2B and Invoice history. | Only legitimate `customerId` relations. Closure redacts/detaches; a new account with the same email cannot recover old history or invoice identity. |
| Content | Portfolio plus `/admin/content/site-information`, controlled business/contact/social form, preview and versioned publish to the real public site. | Both roles, expected version, safe public DTO, no scripts/raw HTML, tagged public cache invalidation, last approved factual fallback. |
| Invoice | `/admin/finance/invoices`, source-selected draft, full review, issue, PDF, void and replacement revisions. | Both roles; source totals only, active-case uniqueness, month numbering, idempotency, immutable financial document, separate payment state, correction reason and current-source fingerprint. Closed buyer document download denied. |
| Payments and B2B | Read-only provider facts at `/admin/finance/payments`; `/admin/inquiries/[id]/billing` Owner terms, one total-project invoice, FULL or nominal DP + balance, multiple confirmed direct transfers. | Both roles record/correct/reverse manual transfers. Owner alone changes terms. Amount/date/reference/concurrency/source-version/closure guards. No automatic WON, production, refund or second provider receipt. Commerce invoices retain provider payment instructions; direct transfer instructions are B2B only. |
| Expenses / proof | `/admin/finance/expenses`, new/detail, valid current entries, correction/reversal and original/history links. Private optional proof implementation with separate purpose. | Both roles; reason/idempotency/version, positive actual IDR/date, original retained. Synthetic storage verifies content, size, intent/actor/expense ownership and authorized private download. Real proof storage remains disabled pending approved financial retention. |
| Settings | Owner `/admin/settings`, issuer/bank `/admin/finance/settings`, team, privacy, and `/admin/settings/custom-print-rates`. | Ordinary Admin cannot write issuer/bank, terms, team or rates. Rates use Ubah → Tinjau → Terapkan, fresh active Owner, CAS/fingerprint and one ACTIVE family. Application remains limited to permitted local development. |
| Reports | `/admin/reports?tab=summary|orders|custom-print|b2b|finance|traffic&range=30d|13m`. | Independent operational/finance/traffic sections; Jakarta dates and zero fill. Created records vs paidAt and actual receipt/expense dates remain distinct. SVG plus accessible table, keyboard and increased-text layout. |
| Compatibility | `/admin/queue` redirects to the authorized domain list/Overview. `/admin/pricing` redirects Owner to tariffs and denies ordinary Admin. | Obsolete Queue/main Pricing navigation removed; no dead link or hidden new queue. |

### Financial metric definition

Finance `needsReviewCount` counts currently open operational provider-payment issues, independently of the selected cash-report period. Manual B2B case review/overpayment/source changes are shown in the project/invoice detail; this number is not a count of all B2B cases or individual received transfers. The UI labels it as current provider-payment issues.

### Pricing compatibility

Frozen v1 golden calculations and legacy AGGREGATE snapshots stay readable. Versions ≥2 use canonical positive IDR strings, PER_UNIT, existing progressive bands and final HALF_UP rounding. Fresh preview/estimate/draft/send uses ACTIVE; issued quote acceptance/payment reads its saved policy and reviewed estimate while keeping file, review, expiry, ownership and payment gates. An integration journey retires its issued v1 rule, activates a changed v2 rule, then accepts and prepares payment at the original `77500` amount. Current workspace identifies review/tariff changes and requests a new estimate before a new draft.

## Verification commands and measured results

Tests were serialized when sharing Vitest coverage or database state. Browser and database suites used synthetic actors in a distinct loopback database; no development/old test reset. The older `niuva_test` failed historical migration was left intact. The isolated `niuva_admin_redesign_dev_test` also satisfies the development marker for the real tariff apply browser path.

| Command / gate | Result |
|---|---|
| `corepack pnpm lint` | Passed. Final lint log has no error or warning. |
| `corepack pnpm typecheck` | Passed. Installed Next route types and strict TypeScript. |
| `corepack pnpm db:validate` | Passed. Prisma schema valid. |
| `corepack pnpm test` | **118 files / 1391 tests passed.** Includes all new action exports in the authorization manifest with valid inputs; unauthenticated/inactive/denied calls stop before DB work. |
| `corepack pnpm test:backend` | **82 files / 587 tests passed.** Frozen pricing, version-current checks, permission, payment hold, CAD/evidence purpose and retention boundaries included. |
| `corepack pnpm test:integration` | **38 files / 183 tests passed.** Additional changed-tariff/retired-quote journey: customer-work suite **11 passed**. |
| `corepack pnpm test:e2e` | **111 passed, 5 skipped.** The five are the existing `/projects`, project detail and homepage DB-content cases conditional on a production-configured content-path server; the default local-test suite skips them. They are not claimed as passed. |
| `corepack pnpm test:e2e:admin-auth` | **22 scenarios verified**: initial whole run 20 passed; the two failed form-readiness cases were repaired and rerun, both passed. Follow-ups verified both-role 200% text/reflow and the final MAKE/list-focus journey. No acceptance/security assertion was removed. |
| `corepack pnpm build` | Passed production build, including private PDF assets/tracing and all new routes. A separate output directory was used for the last build while the local Admin server stayed available. Temporary generated-directory TypeScript includes are removed at handoff. |
| `git diff --check` | Passed; Git only reports the repository's existing LF/CRLF conversion notices. |

Per-task RED/GREEN, static and browser log names are recorded in the local execution ledger. First unit baseline had a coverage collision; it was not claimed as a passing baseline. Later complete unit runs pass. Initial stale route assertions, incomplete action inventory, duplicate ACTIVE synthetic fixture and early form interaction were corrected to actual approved behavior while retaining security checks. Development Next transport abort/ECONNRESET messages may appear when a poll/navigation is cancelled; the handler returns cancellation without an error payload and verified flows continue. No process-global exception suppression was added.

## Visual, keyboard and document evidence

All images/PDFs contain synthetic test data. Screens cover 1440 desktop, 1024/768 intermediate sizes, 390 mobile and 320 CSS-pixel reflow where applicable, with no horizontal page overflow. Both-role Reports checks set root text size to 200% at 768×1024 and use keyboard Enter on a report tab. This is increased-text/reflow evidence, not a physical-device, native browser-zoom or assistive-technology certification.

- `.local/admin-redesign/captures/overview-{owner,admin}-{1440,768,390,320}.png`
- `.local/admin-redesign/captures/reports-{owner,admin}-1440.png`, `-320.png`, `-text-200.png`
- `.local/admin-redesign/captures/tariffs-review-390.png`
- `.local/admin-operations-architecture/captures/` — actual operational lists/details/workspaces and privacy, relevant desktop/mobile sizes.
- `.local/admin-finance/captures/invoice-1440.png`, `invoice-390.png`, `issued-invoice.pdf`, `long-invoice.pdf`.

Keyboard/interaction coverage includes global-search shortcut, bell open/Escape/focus, account actions, record detail/back, retained form values on failure, visible focus and reduced motion. Native inspection of the synthetic long PDF with pypdf confirmed seven pages, final row and exact IDR total, id-ID and a structure tree. There is no PDF/UA claim. PDFKit is pinned; local font/OFL license is retained. Dependency audit at addition found no new PDFKit dependency advisory and retained six existing advisory findings outside this delivery's dependency changes.

Visual status: **UNREVIEWED_BY_OWNER**. Proposal approval is preserved; final application visuals still await the Owner's own review. Physical devices/AT, hosted provider behavior, staging and production remain separate evidence scopes.

## Local runtime and remaining gates

Five new reviewed additive migrations were applied to the isolated test database and the verified loopback `niuva_dev` development database: notification receipts, Site Information, Finance, financial-file ownership, and ACTIVE tariff uniqueness. The preflight found no duplicate ACTIVE family in the development database. Existing migrations and auth/MFA data were not reset or edited.

Local Admin is served at **http://127.0.0.1:3000/admin/sign-in**. A plain `pnpm dev` boot returned the intended auth-unavailable 503 because it did not load the saved local Admin configuration. The existing ignored `.local/start-admin-dev.ps1` launcher was used with its existing saved key; a fresh unauthenticated sign-in request returns **200**. No secret value was printed or replaced. Synthetic Owner/Admin login was automated; the real Owner completes their own password/TOTP login.

Remaining approved limitations:

1. Actual private financial-proof upload/download remains disabled until its separate retention policy is approved. Expense recording without proof works. CAD retention is not borrowed for financial evidence.
2. Tariff apply keeps its current non-production/loopback development gate. Production enablement and provider activation require separate approval.
3. Owner enters real issuer/bank details through settings; no real bank data, taxes, DP percentage or business figures were invented. Invoice does not confirm payment or start production.
4. Owner visual acceptance, device/AT, production-configured public-content cases, hosted providers, legal/accounting retention and production readiness are not inferred from these local gates.

## Rollback / delivery state

Work remains uncommitted in the current checkout. Preserve earlier dirty/untracked work and use an explicit reviewed file allowlist for any later Git delivery. Do not use broad `git add .` or include local runtime/test logs, credentials or generated captures. No PR was created.

For a code rollback, keep additive data/migrations and use the captured baseline plus reviewed file-level changes; do not reset the database or delete invoice/payment/expense history. Old quote snapshots and original finance entries remain preserved. Any data/schema rollback or production action needs its own explicit instruction.
