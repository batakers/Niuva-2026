# Frontend review batch — FE-00–20

Started: 2026-09-06. Updated: 2026-09-08. Status: **UI_IMPLEMENTED**, **VISUAL_ACCEPTANCE_PENDING**,
**NOT_INTEGRATED**. User approved FE-00–02 followed by FE-03–07, FE-08–15, the isolated FE-16 admin preview, FE-17 Action Queue, FE-18 Admin Inquiry Detail, FE-19 Admin Orders, and FE-20 Admin Order Fulfillment.

## Scope and review paths

| Task | Result | Local review |
| --- | --- | --- |
| FE-00 | Scoped component contract; historical styleguide acceptance retained separately | `src/app/auis/styleguide/registry/component-contracts.md` |
| FE-01 | Typed synthetic fixtures, server-side development gate, explicit scenarios | `/projects?preview=examples`, `empty`, `loading`, `error` |
| FE-02 | Shared typography, dark-surface logo, header/footer, mobile menu, skip link, Escape/focus | Every public page |
| FE-03 | Existing homepage direction retained; available routes linked, Shop linked after FE-08 | `/` |
| FE-04 | Four PRD service categories, context/inputs/outputs, brief CTA | `/services` |
| FE-05 | Search/service filter, empty/no-results/reset/loading/error recovery | `/projects` |
| FE-06 | Challenge/process/result structure, explicit media placeholder, missing-slug recovery | `/projects/contoh-enclosure?preview=examples` |
| FE-07 | PRD/schema fields, optional company, error summary focus, pending/error/retry/success simulation | `/project-brief` |
| FE-08 | Browser-safe catalog projection, category/search filters, stock states and recovery without purchase actions | `/shop?preview=examples`, `empty`, `loading`, `error` |
| FE-09 | Product detail shell, explicit media slots, variant/price/quantity selection, OOS guard and missing-slug recovery | `/shop/contoh-dock-modular-meja?preview=examples`, `/shop/contoh-stand-display-ringkas?preview=examples` |
| FE-10 | Versioned local cart, add/update/remove, empty/recovery states, unavailable-product handling, and non-authoritative estimate ledger | `/cart?preview=examples`, `empty`, `loading`, `error` |
| FE-11 | Guest contact/address form, synthetic shipping selection, authority ledger, validation and explicit rate/payment recovery states | `/checkout?preview=examples&state=ready`, `rates-loading`, `rates-unavailable`, `rate-stale`, `payment-pending`, `payment-error` |
| FE-12 | Custom-print expectations, operator-reviewed workflow, file checklist, privacy/price/shipping boundaries and honest request handoff | `/custom-print` |
| FE-13 | Metadata-only file preview, progress/retry/expiry states, configuration/contact validation and production fail-closed request form | `/custom-print/request` |
| FE-14 | Immutable quote dossier, scope/assumptions/breakdown, seven-day expiry, local confirmation states and invalid-access recovery | `/quote/preview-quote?preview=examples`, `valid`, `loading`, `expired`, `superseded`, `accepted`, `declined` |
| FE-15 | Safe retail/custom order projection, public timeline, next action, token recovery, service failure and late-payment refund exception | `/orders/preview-order?preview=examples`, `retail-*`, `custom-*`, `cancelled`, `late-payment`, `loading`, `service-error`, `expired-token`, `revoked-token` |
| FE-16 | Development-only admin shell and sign-in/access states, responsive navigation, no Clerk/session bypass | `/auis/proofs/frontend/admin?preview=examples`, `auth-unavailable`, `forbidden`, `ready` |
| FE-17 | Decision-first Action Queue with brief/custom/quote/order/package/stock fixture, segmented filters, populated/loading/empty/stale recovery, and local detail handoff | `/auis/proofs/frontend/admin?preview=examples&state=ready`, `queue=populated`, `loading`, `empty`, `stale` |
| FE-18 | Inquiry detail drawer from the Queue, safe synthetic detail projection, optional company state, local status/history progression, and explicit non-sending follow-up preview | `/auis/proofs/frontend/admin?preview=examples&state=ready`, click `Buka brief preview` |
| FE-19 | Admin Orders list with local reference search, type/status/exception filters, desktop headers, labeled mobile cards, recovery states, and stable selected-reference query | `/auis/proofs/frontend/admin?preview=examples&state=ready&module=orders`, `orders=populated`, `loading`, `empty`, `error` |
| FE-20 | Admin fulfillment drawer with safe projection, timeline/audit preview, valid local operator edges, custom package measurement guard, and Owner-only finance message | `/auis/proofs/frontend/admin?preview=examples&state=ready&module=orders&order=ORD-EX-4072`, `role=OWNER`, `ADMIN` |

Run `corepack pnpm dev`; open `http://localhost:3000`. Use fictional contact
information for review. Preview data is not a factual client portfolio.

## Boundaries

- No inquiry POST, email, database write, file upload or provider call is made by
  these pages. Form values stay in page state/controls, without application storage.
- Required reference link substitutes for the unavailable attachment path. Disabled
  upload control never returns a fake file ID or claims successful storage.
- Brief shares the existing B2B Zod input schema; company, budget and service are
  optional. Client validation is not a substitute for future server validation.
- Client-only menu/filter/submit controls wait for hydration so early interaction
  is not lost; submit is disabled in server-rendered HTML, including without JS.
- Synthetic projects and products are loaded by a server-only development boundary. Production
  ignores preview parameters, shows an honest empty portfolio, and returns 404 for
  fictional project slugs. Production brief only checks completeness; it cannot
  display a simulated success.
- Shop cards receive a browser-safe projection: Decimal values are serialized,
  object storage keys are excluded, and SKUs are not rendered. Development cards
  link to the matching development-only detail route. Repository-level publication
  and active-variant filters remain the source contract for future integration.
- Shop media remains an explicit empty slot because launch photography, products,
  variants and publication permission are not yet approved. No generated product
  image is presented as factual inventory.
- Product detail writes a versioned local cart containing only variant ID and
  integer quantity. Product name, SKU, price, stock, dimensions and totals are not
  persisted. Cart updates and removals remain browser-local; corrupt or enriched
  storage is rejected and cleared rather than trusted.
- Cart display facts come from the same development-only browser-safe catalog
  projection. Prices and stock are labelled as estimates; unavailable records
  remain removable. A valid development cart may open the FE-11 preview.
- Checkout reads only variant ID and quantity from the local cart. Contact and
  address remain in page controls. Synthetic shipping options and payment outcomes
  exercise loading, retry, stale-rate reselect, pending, and failure paths without
  calling `/api/shipping/rates`, `/api/checkout`, Biteship, or Midtrans. No order,
  reservation, provider token, or payment is created. Production fails closed.
- Custom Print is an informational Server Component. Its generated hero art is
  explicitly labelled as a conceptual illustration, not Niuva production evidence.
  It supports STL, 3MF and OBJ as the initial model formats; STEP/STP remains a
  manual-review attachment. No geometry analysis, file persistence or instant
  final price is implied. Its request CTA now opens the FE-13 preview route.
- Custom Request reads only the selected file name, extension and size in the
  browser. It never reads the binary payload, calls upload/request APIs, receives
  a file ID, or claims persistence. Development exposes deterministic accepted,
  failed and expired simulations with progress and retry. Production disables the
  form while R2 remains unavailable. The 100 MiB preview limit comes from the
  approved runtime policy, but browser validation is not server authority.
- Customer Quote loads its synthetic snapshot only when development runtime,
  explicit preview query, and the dedicated preview sentinel all match. The
  sentinel is not authorization and production never loads the fixture. Scope,
  assumptions, expiry and formatted money arrive as immutable display values;
  accept/decline confirmations change local UI only and make no API request.
- Order Status loads its synthetic projection only after the development runtime,
  explicit preview query, and `preview-order` sentinel all match. Browser query
  values select visual scenarios only; they never assert payment, shipping,
  cancellation, or order state. Access and service failures return no order data.
- Admin shell is available only at the dedicated development proof route after the
  explicit preview query. It imports no Clerk, repository, service, or real admin
  projection; production returns 404 for this preview route.
- `/admin` and `/admin/sign-in` remain targets, not preview aliases. The existing
  Proxy and `requireAdmin` server guard are unchanged, and no public registration,
  fake credential form, session, or profile can be created by FE-16.
- FE-17 and FE-18 render only after the same development preview gate and only
  for the synthetic ready scenario. Their references, status ages, exception panel,
  filters, queue detail, safe inquiry projection, status/history and follow-up
  feedback are local presentation data. They import no service, repository, Clerk
  projection, file metadata, customer identity, money, token, or provider payload.
  The inquiry drawer hides contact and private-reference data, treats company as
  optional, and permits only local `NEW` → `CONTACTED` → `QUALIFIED` UI state.
  Buttons never navigate to `/admin` or change a server transition, audit record,
  stock, payment, order, email, or WhatsApp delivery.
- FE-19 uses the same development gate. The Queue hands off only to the isolated
  preview query `module=orders&order=<fixture-reference>`. Search, type, status,
  exception, recovery, and selected-reference behaviors stay in browser state.
  The list never imports a service, repository, Clerk projection, address,
  customer contact, item detail, money, public token, provider payload, or
  internal note. A later server integration remains responsible for authorization
  and every actual mutation.
- FE-20 opens only from the selected fixture reference in the same preview. Its
  transition map is a visual contract snapshot, never an order-service import.
  Payment-confirmed edges remain server-only. Custom shipping requires four
  positive package values before the local preview edge is enabled. No rate,
  shipment, payment, refund, cancellation, audit event, provider payload, or
  customer detail is created. `role=OWNER|ADMIN` is an allowed development
  scenario only; it does not authorise an actual admin route or operation.
- No new dependencies, global tokens, logo assets, migrations or environment changes
  were introduced by this frontend batch.

## Verification

- `corepack pnpm lint`: 0 errors, 147 pre-existing warnings; focused ESLint on the
  changed frontend/test files has no warnings or errors.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: 56 tests passed across 14 files.
- Focused FE-16 Playwright: 5 tests passed, covering unavailable and forbidden
  access states, the non-authoritative verified-shell composition, multi-value
  query fallback, mobile navigation/Escape/focus recovery, and the 320–1440px
  responsive matrix. Focused ESLint has no warning or error.
- Focused FE-17 Playwright: 5 tests passed, covering all six queue types,
  no-mutation presentation boundary, segmented local filters, local detail
  handoff, empty/stale/loading recovery, and the 320–1440px responsive matrix.
- Focused FE-18 unit: 2 tests passed, covering safe fixture detail, optional
  company treatment, local status/history progression, local follow-up feedback,
  and no `fetch` call. Focused FE-18 Playwright: 3 tests passed, covering the
  Queue-to-drawer detail handoff, privacy projection, local-only progression and
  follow-up, close-to-trigger focus return, no mutation request, and the 320–1440px
  responsive matrix. The updated FE-17/18 focused Playwright suite has 8 tests passed.
- Focused FE-19 unit: 2 tests passed, covering local type, exception and reference
  filtering, no-match recovery, and selected fixture reference in the preview URL.
  Focused FE-19 Playwright: 4 tests passed, covering Queue handoff, query-stable
  selection, type/exception filters, loading/empty/error/no-match recovery,
  no application mutation request, and the 320–1440px responsive matrix.
- Focused FE-20 unit: 3 tests passed, covering explicit valid and invalid edges,
  missing-versus-valid package measurement, no `fetch`, and Owner-only paid
  cancellation/refund review. Focused FE-20 Playwright: 4 tests passed, covering
  safe drawer projection, local-only operator action, measurement rejection and
  recovery, Owner/Admin finance visibility, no mutation request, and the
  320–1440px responsive matrix. The combined FE-19/20 focused Playwright suite
  has 8 tests passed.
- `corepack pnpm build` and `git diff --check`: passed. Production smoke confirms
  the explicit preview URL returns `404` with `noindex` and no Orders or
  fulfillment UI, while `/admin/orders` returns `503 AUTH_UNAVAILABLE` without
  Clerk configuration.
- Focused FE-15 Playwright: 7 tests passed, covering retail/custom timelines,
  quote and payment handoffs, shipment projection, loading/access/service
  failures, late-payment refund reconciliation, and the responsive matrix.
- `corepack pnpm exec playwright test --workers=4`: 63 of 64 tests passed. All
  FE-16/17, styleguide, security, and other frontend tests passed. The existing
  project-example navigation assertion failed once only under parallel load; its
  bounded single-worker retry passed. Covers
  mobile menu/Escape/skip link, real-route navigation,
  project and product filter/detail/404/retry, variant/quantity/OOS behavior,
  cart add/update/remove/persistence/corrupt recovery, form recovery and no
  inquiry API mutation. FE-11 adds guest validation, Cart handoff, shipping
  loading/unavailable/stale recovery, payment pending/error, and an assertion
  that the preview makes no shipping or checkout API request. FE-12 adds the
  operator-reviewed workflow, file-format boundary, conceptual-evidence label,
  working request-route navigation, and Project Brief fallback. FE-13 adds local
  metadata progress, invalid/failure/expiry retry, required-field focus, and
  assertions that no upload or custom-request API mutation occurs. FE-14 adds
  immutable scope/breakdown display, accept/decline confirmation, loading and
  terminal quote states, invalid-token 404, and no quote/payment API mutation.
  FE-15 adds safe retail/custom projections, public timelines, shipment and next
  action display, access recovery, and late-payment handling that keeps the
  cancelled order closed. FE-16 adds an isolated admin shell, explicit access
  boundaries, and keyboard-safe mobile navigation. FE-17 adds all queue fixture
  types, local filters, action-selection handoff, and explicit stale/empty/loading
  states with no service request or mutation. FE-18 adds a bounded inquiry drawer
  with privacy-safe fixture fields, local status/history, a non-sending follow-up
  confirmation, and restored focus on close.
  FE-19 adds the Orders preview, table headers at wide width, labeled summary cards
  on mobile, local filtering and selection URL recovery without an order detail or
  server read.
  FE-20 adds the selected order drawer, privacy-safe context, status and audit
  rails, a local operator-edge preview, custom package validation, and explicit
  Owner-only finance messaging without applying any real transition.
- Existing public routes and the dedicated FE-12 through FE-17 routes were checked at 320, 390,
  768, 1024, 1280 and 1440px; one main and H1 each, with no horizontal overflow
  or page errors. The existing public matrix also runs under reduced motion.
- `corepack pnpm build`: production compilation and route generation passed.
- `git diff --check`: passed (normal Windows line-ending notices only).
- Production runtime smoke: synthetic portfolio/Shop and preview controls absent;
  fictional product detail returns 404 with `noindex`; Shop keeps an honest empty
  state; brief exposes completeness check, not simulated success.
- Manual browser inspection includes FE-09 at 1280x900 and 390x844: desktop split,
  mobile collapse, disabled/selected variant states, quantity and success feedback
  were inspected without horizontal overflow. Owner visual acceptance and
  assistive-technology review remain separate from these automated results.
- FE-10 was visually inspected with a populated cart at 1280x720 and 390x844.
  The item editor and estimate ledger form an 8/4 desktop split and a single
  mobile column; controls remain 44px minimum and the 390px capture has no
  horizontal overflow.
- FE-11 was visually inspected with a populated development cart at 1280x900
  and 390x844. The guest form and authority ledger form an 8/4 desktop split
  and a single mobile column; controls remain at least 44px and the responsive
  matrix has no horizontal overflow or page errors.
- FE-12 was visually inspected at 1280x900 and 390x844. The dossier grid and
  operator rail collapse into a readable mobile sequence, the hero remains
  unclipped, and conceptual artwork is labelled separately from production proof.
- FE-13 was visually inspected after hydration at 1280x900 and 390x844. Its
  workshop-intake dossier keeps metadata safety and operator review prominent,
  while the 4/8 desktop split becomes one readable mobile sequence without overflow.
- FE-14 was visually inspected after hydration at 1280x900 and 390x844. Scope
  and verified assumptions precede the price/decision rail, the desktop 7/5
  composition collapses in the same reading order on mobile, and actions remain visible.
- FE-15 was visually inspected at 1280x900 and 390x844. The current status stays
  ahead of the timeline, the 7/5 timeline and safe-summary composition becomes
  one mobile reading order, and the long custom flow remains free of overflow.
- FE-16 was visually inspected at 1280x900 (`ready`) and 390x844 (`forbidden`).
  The operations rail remains secondary to access status, target routes are not
  impersonated, and the mobile access surface has one readable column with no
  horizontal overflow.
- FE-17 was visually inspected at 1280x900 and 390x844 (`ready`). The desktop
  priority rail and exception panel remain subordinate to the action list; the
  mobile sequence keeps urgent count before horizontally scrollable filters and
  turns every queue item into a readable stacked card. Visual acceptance remains
  an owner decision, separate from these captures and automated checks.
- FE-18 automated responsive checks open the development-only drawer at 320,
  390, 768, 1024, 1280 and 1440px. The right-side dossier preserves Queue
  context, keeps private fields unavailable, and maintains one readable action
  sequence on mobile. Owner visual acceptance remains an explicit decision,
  separate from this implementation and automated checks.
- FE-19 was reviewed through the development-only Orders preview after hydration.
  It exposes explicit search/filter labels, safe customer suppression, selected
  reference feedback, and mobile label/value cards. Owner visual acceptance remains
  an explicit decision, separate from the technical checks.
- FE-20 was reviewed through the development-only fulfillment drawer after
  hydration. The visible state gate, measurement precondition, and finance-role
  boundary are technical preview evidence only. Owner visual acceptance remains
  an explicit decision, separate from this implementation and automated checks.
- Production runtime smoke for `/cart?preview=examples`: 200 response, preview
  controls and synthetic product names absent, unknown stored variant is
  recoverable, and checkout remains disabled.
- Production runtime smoke for `/checkout?preview=examples&state=ready`: 200
  response, preview controls/form and synthetic items absent, with an explicit
  unavailable notice and no provider or transaction path.
- Production runtime smoke for `/custom-print/request`: 200 response, headline
  and explicit R2-unavailable notice present, scenario preview absent, controls
  disabled, and no API form action. The landing page now links to this fail-closed route.
- Production runtime smoke for `/quote/preview-quote?preview=examples&state=accepted`:
  404 response with safe recovery and `noindex`; quote number, total, and decision
  controls are absent. Development preview state never authorizes production access.
- Production runtime smoke for `/orders/preview-order?preview=examples&state=retail-paid`:
  404 response with `noindex`; synthetic order references, tracking number, and
  quote/payment actions are absent.
- Production runtime smoke for `/auis/proofs/frontend/admin?preview=examples&state=ready`:
  404 response with `noindex`; queue fixtures and navigation fixture are absent.
  `/admin` and `/admin/sign-in` both return the existing 503
  `AUTH_UNAVAILABLE` response while Clerk credentials are absent.

Local screenshot evidence (not committed):
`C:/Users/FAIZ/.codex/visualizations/2026/09/05/01a07172-b3f5-77f2-b8e3-036ed4befe4c/frontend-{home,services,projects,detail,brief}-{390,1280}.png`.
Shop evidence: `frontend-shop-{390,1280}.png` and `frontend-shop-error-1280.png`
in the same local visualization folder.
Cart evidence: `frontend-cart-390.png` in the same local visualization folder.
Checkout evidence: `frontend-checkout-{390,1280}.png` in the same local
visualization folder.
Custom Print evidence: `frontend-custom-print-{390,1280}.png` in the same local
visualization folder.
Custom Request evidence: `frontend-custom-request-{390,1280}.png` in the same
local visualization folder.
Quote Review evidence: `frontend-quote-review-{390,1280}.png` in the same local
visualization folder.
Order Status evidence: `frontend-order-status-{390,1280}.png` in the same local
visualization folder.
Admin preview evidence: `frontend-admin-preview-{390,1280}.png` in the same local
visualization folder.
Action Queue evidence: `frontend-admin-queue-{390,1280}.png` in the same local
visualization folder. FE-18 awaits owner visual review before screenshot evidence
is recorded.
FE-19 awaits owner visual review before screenshot evidence is recorded.
FE-20 awaits owner visual review before screenshot evidence is recorded.

Shared public-route behavior remains in `tests/e2e/public-pages.spec.ts`.
FE-12 through FE-15 keep workflow and responsive assertions in the dedicated
`tests/e2e/custom-print.spec.ts`, `tests/e2e/custom-request.spec.ts`, and
`tests/e2e/quote-review.spec.ts`, and `tests/e2e/order-status.spec.ts` files
requested by the task map.

## Git and handoff

Branch: `codex/frontend-public-pages`.
Base: `542375db56f0a8313bf0596ac0c127b7368cad0f`.
FE-16 is recorded through commit `394f752`. FE-17 is recorded and pushed through
commit `9456fc0`. FE-18 is recorded and pushed through commit `adc6e9a`. FE-19
is recorded and pushed through commit `0cd2c5a`. FE-20 is an uncommitted review
slice at this checkpoint. No merge or deployment is performed by this frontend
batch.

Pre-existing sandbox changes are preserved: `.env.example`, the two sandbox
documents in `docs/backend/`, and `scripts/local-dev-db.ps1`. The existing task-map
edits were extended, not replaced. Ignored local environment/database files were
not changed. Do not stage this entire dirty working tree indiscriminately.

Review the public screens through FE-15 and the isolated FE-16–20 admin proof.
Integrating actual published content, authentication, or submission requires a
separate task and factual content/permission checks. To roll back this batch,
reverse only its frontend/tests/contract/task-document edits; do not reset the
worktree or remove unrelated sandbox files.
