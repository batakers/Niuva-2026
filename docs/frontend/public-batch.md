# Frontend review batch — FE-00–27

Started: 2026-09-06. Updated: 2026-09-18. Status: **UI_IMPLEMENTED**, **ADMIN_INTEGRATED_PENDING_OWNER_GATES**, **VISUAL_ACCEPTANCE_DESKTOP_MOBILE_ACCEPTED**,
**PARTIALLY_INTEGRATED (FE-07, NG-02, NG-05 local path)**. User approved FE-00–02 followed by FE-03–07, FE-08–15, and the server-backed admin integration slice shipped on 2026-09-16. The fixture-only FE-16–26 rows below remain archival evidence, not the current admin implementation.

> Integration update — on 2026-09-13, FE-07 was promoted to the link-based
> server-backed Project Brief slice. The no-mutation statements below remain
> archival for the other preview surfaces; see `tasks/plan.md` and
> `tasks/todo.md` for the current boundary.

> Historical note — on 2026-09-10, the fixture-only FE-16–26 source, route, and
> tests were retired during repository complexity cleanup. The references and
> verification below remain an archival record; they do not describe live routes.

> Integration update — on 2026-09-14, the custom-request upload orchestration
> (R2 capability-gated) and Shop → Product → Cart → Checkout server-backed path
> were added locally. At that handoff, provider smokes, launch pricing/publish
> decisions, and Owner visual acceptance remained separate gates; the preview
> rows below continue to describe only explicit `?preview=examples` behavior.

> Integration update — on 2026-09-16, the real admin surface replaced the
> retired fixture-only FE-18–26 screens for the allowed operational slice.
> `/admin/orders/[id]`, `/admin/custom-print/[id]`, `/admin/products/[id]`,
> `/admin/portfolio/[id]`, `/admin/inquiries`, `/admin/inquiries/[id]`, and
> `/admin/pricing` now read server-owned projections. Authorized Server Actions
> cover order/inquiry transitions, slicer review, quote draft/send, stock and
> catalog media updates, portfolio editing/media mapping, and route-bound token
> reissue. Authenticated mobile visual acceptance is now accepted and the R2
> non-production smoke passed on 2026-09-18; the supplied Clerk identity is backed
> by an active loopback Owner profile. Biteship/Midtrans activation and smoke
> are explicitly deferred until company data is available.

> Handoff update — on 2026-09-16, the Owner-supplied company/portfolio PDFs and
> pricelist were audited. The approved public portfolio was seeded into the
> loopback development database (4 services, 17 projects, 6 mapped media) via
> `db:seed:public-content:local`. The same files do not contain the SKU, retail
> price, stock, or product-photo mapping required for a Shop catalog; package
> dimensions are conditional on automatic provider-calculated shipping. Those
> remaining fields stay an explicit Owner dataset gate. The exact
> Clerk identity is already represented by an active local Owner profile. At
> that handoff, R2 smoke and manual customer-link delivery remained open; the
> R2 gate is closed by the 2026-09-18 update below. Biteship/Midtrans stay
> deferred by request.

> R2 handoff update — on 2026-09-18, the Owner-configured development bucket
> passed a real 4-byte synthetic smoke: intent `201`, exact-origin CORS
> preflight `204`, direct PUT `200`, confirm `200`, and custom request `201`.
> The stored-file lifecycle reached `VERIFIED`; the private object and synthetic
> rows were cleaned up, and no public URL was enabled. Manual customer-link
> delivery and Biteship/Midtrans remain separate open gates.

> Handoff update — on 2026-09-17, the Owner supplied
> `docs/source/Dataset Shop Niuva/`. The guarded catalog preparation/seed path
> mapped 8 products, 34 variants, 4 categories, and 50 real JPG media files
> into loopback as unpublished drafts at that handoff. Six Tokopedia placeholder
> variants were excluded because they have no verified price/stock. Merchant SKU
> format, publish approval, and variant-bound media were then explicit
> Owner/schema gates.
> Package dimensions are not required for the current catalog/manual-shipping
> slice and become a gate only for provider-calculated shipping; Biteship/Midtrans
> remain deferred.

> Catalog publication update — on 2026-09-18, the Owner approved source IDs as
> internal SKU v1, three ready-made products for publication, five custom-flow
> products to remain draft, and product galleries as the MVP media fallback.
> Regeneration now requires an exact per-product approval file; it no longer has
> a global publish switch. Server-backed public acceptance passed at 1280×900
> and 390×844 for all three published list/detail routes, real media, overflow,
> clean browser console, and five draft-route 404s. The local checkout fixture
> is excluded outside explicit loopback demo mode. Fresh post-seed authenticated
> admin visual confirmation remains separate; database state is verified 3/5.

> Acceptance update — on 2026-09-17, the supplied Owner identity was verified
> against the active loopback profile and the live admin list/detail/editor routes
> were inspected in the authenticated browser at 1280px and 390x844. All twelve
> route surfaces rendered without page-level horizontal overflow and no write
> action was submitted. Orders and B2B Inquiries expose labeled mobile cards;
> Products keeps variant tables in an internal scroller after its card receives
> `min-w-0`. Keyboard focus on the admin nav, visible field labels, empty/error
> states, and clean browser console were checked. The 11 published projects
> without mapped media are Owner-approved `Selected Works` card-only records;
> this is an intentional content mode, not a missing visual acceptance gate.

> Portfolio decision update — on 2026-09-18, the Owner approved keeping the 11
> Selected Works records published as card-only summaries. No speculative media
> mapping or unpublish operation is authorized. Media remains optional and must
> be mapped per project only after the asset, provenance, alt text, caption, and
> permission are approved.

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
| FE-07 | PRD/schema fields, optional company, error summary focus, and the historical local simulation; the current route posts the validated brief to `/api/project-brief` and shows reference/WhatsApp confirmation | `/project-brief` |
| FE-08 | Browser-safe catalog projection, category/search filters, stock states and recovery without purchase actions | `/shop?preview=examples`, `empty`, `loading`, `error` |
| FE-09 | Product detail shell, explicit media slots, variant/price/quantity selection, OOS guard and missing-slug recovery | `/shop/contoh-dock-modular-meja?preview=examples`, `/shop/contoh-stand-display-ringkas?preview=examples` |
| FE-10 | Versioned local cart, add/update/remove, empty/recovery states, unavailable-product handling, and non-authoritative estimate ledger | `/cart?preview=examples`, `empty`, `loading`, `error` |
| FE-11 | Guest contact/address form, synthetic shipping selection, authority ledger, validation and explicit rate/payment recovery states | `/checkout?preview=examples&state=ready`, `rates-loading`, `rates-unavailable`, `rate-stale`, `payment-pending`, `payment-error` |
| FE-12 | Custom-print expectations, operator-reviewed workflow, file checklist, privacy/price/shipping boundaries and honest request handoff | `/custom-print` |
| FE-13 | Metadata-only file preview, progress/retry/expiry states, configuration/contact validation and production fail-closed request form | `/custom-print/request` |
| FE-14 | Immutable quote dossier, scope/assumptions/breakdown, seven-day expiry, local confirmation states and invalid-access recovery | `/quote/preview-quote?preview=examples`, `valid`, `loading`, `expired`, `superseded`, `accepted`, `declined` |
| FE-15 | Safe retail/custom order projection, public timeline, next action, token recovery, service failure and late-payment refund exception | `/orders/preview-order?preview=examples`, `retail-*`, `custom-*`, `cancelled`, `late-payment`, `loading`, `service-error`, `expired-token`, `revoked-token` |
| FE-16 | **ARCHIVE —** Development-only admin shell and sign-in/access states, responsive navigation, no Clerk/session bypass | `/auis/proofs/frontend/admin?preview=examples`, `auth-unavailable`, `forbidden`, `ready` |
| FE-17 | **ARCHIVE —** Decision-first Action Queue with brief/custom/quote/order/package/stock fixture, segmented filters, populated/loading/empty/stale recovery, and local detail handoff | `/auis/proofs/frontend/admin?preview=examples&state=ready`, `queue=populated`, `loading`, `empty`, `stale` |
| FE-18 | **ARCHIVE —** Inquiry detail drawer from the Queue, safe synthetic detail projection, optional company state, local status/history progression, and explicit non-sending follow-up preview | `/auis/proofs/frontend/admin?preview=examples&state=ready`, click `Buka brief preview` |
| FE-19 | **ARCHIVE —** Admin Orders list with local reference search, type/status/exception filters, desktop headers, labeled mobile cards, recovery states, and stable selected-reference query | `/auis/proofs/frontend/admin?preview=examples&state=ready&module=orders`, `orders=populated`, `loading`, `empty`, `error` |
| FE-20 | **ARCHIVE —** Admin fulfillment drawer with safe projection, timeline/audit preview, valid local operator edges, custom package measurement guard, and Owner-only finance message | `/auis/proofs/frontend/admin?preview=examples&state=ready&module=orders&order=ORD-EX-4072`, `role=OWNER`, `ADMIN` |
| FE-21 | **ARCHIVE —** Admin custom-request list and slicer review drawer with explicit private-file unavailability, required material/weight/duration, optional configuration/notes, local-only review handoff, and recovery states | `/auis/proofs/frontend/admin?preview=examples&state=ready&module=custom-print&request=CPR-EX-2093`, `custom=loading`, `empty`, `error` |
| FE-22 | **ARCHIVE —** Admin quote draft/preview with read-only review inputs, Decimal-contract fixture breakdown, active-rule block, seven-day sent snapshot, and local-only immutable send state | `/auis/proofs/frontend/admin?preview=examples&state=ready&module=quotes&quote=QTE-EX-3028`, `quoteState=rule-missing`, `loading`, `empty`, `error` |
| ADM-LIVE | **CURRENT —** Server-backed admin shell, lists, detail/editors, live inquiry/pricing reads, and authorized write actions with Clerk + `AdminProfile` | `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/custom-print`, `/admin/custom-print/[id]`, `/admin/products`, `/admin/products/[id]`, `/admin/portfolio`, `/admin/portfolio/[id]`, `/admin/inquiries`, `/admin/inquiries/[id]`, `/admin/pricing` |

Run `corepack pnpm dev`; open `http://localhost:3000`. Use fictional contact
information for review. Preview data is not a factual client portfolio.

## Boundaries

### Current integration boundary (2026-09-16)

- The live admin pages use Clerk + active `AdminProfile`, server repositories,
  domain services, Zod validation, and audit logging. The browser never writes
  directly to Prisma or receives private file URLs.
- Product and portfolio publication is guarded by server-side completeness checks
  (active variant/media for products; narrative/media for Featured portfolio
  projects). Owner-approved Selected Works card-only records require their
  summary metadata but may remain published without media. Client permission and
  factual launch content remain Owner decisions.
- B2B inquiry and Pricing Rules are live read subviews. Pricing activation is
  intentionally not exposed by this batch; Biteship and Midtrans remain disabled.
- Existing SENT quote/order links can be reissued from their admin detail pages.
  Reissue replaces the stored hash, invalidates the old link, and emits a new
  `v1.<entity-id>.<secret>` route-bound token without logging the secret. The
  manual customer handoff is documented in
  [`docs/backend/token-reissue-handoff.md`](../backend/token-reissue-handoff.md)
  and still requires an Owner-approved recipient/channel list.
- `scripts/prepare-shop-catalog.ts` reads the Owner dataset at
  `docs/source/Dataset Shop Niuva/`, writes the validated `catalog-seed.json`,
  and maps only local JPG assets into `public/media/products/`.
  `scripts/seed-catalog.ts` accepts that manifest only on a loopback
  non-production database and preflights every mapped asset. No synthetic
  catalog, photo, stock, or production media mapping is claimed as launch
  evidence; all seeded products remain drafts.
- `scripts/seed-local-public-content.ts` is a separate, confirmation-gated
  loopback seed for the already curated public services/portfolio records. Its
  six portfolio covers are not retail product media. Source findings and the
  remaining Shop fields are tracked in
  [`docs/backend/catalog-source-audit.md`](../backend/catalog-source-audit.md);
  the source/manifest contract is specified in
  [`shop-catalog-owner-intake.md`](../backend/shop-catalog-owner-intake.md).
- Authenticated visual acceptance and R2 upload smoke were run as separate
  evidence after Owner-provided environment/identity setup; passing typecheck,
  lint, build, or browser smoke does not imply those gates. Desktop/mobile admin
  acceptance and the cleaned-up R2 smoke are recorded above.

The FE-16–26 bullets below are retained as historical preview evidence. Where
they describe fixture-only routes or “no mutation”, the current integration
slice above is the authoritative status for the live `/admin` routes. The next
handoff should link to that slice rather than treating the archival preview
rows as open implementation work.

For a requirement-by-requirement status, current loopback probe, and Owner
input checklist, see [`operational-readiness-report.md`](./operational-readiness-report.md).

### Historical preview evidence (archived)

The FE-16–26 bullets below describe the retired fixture-only proof routes. They
remain useful for visual regression history, but do not describe the live
`/admin` implementation or its server-backed permissions and writes.

- Except for the current FE-07 server-backed route, no inquiry POST, email,
  database write, file upload or provider call is made by these preview pages.
  Preview form values stay in page state/controls, without application storage.
- Required reference link substitutes for the unavailable attachment path. Disabled
  upload control never returns a fake file ID or claims successful storage.
- Brief shares the existing B2B Zod input schema; company, budget and service are
  optional. The current route performs client validation followed by the same
  server validation; preview-only forms are not a substitute for that boundary.
- Client-only menu/filter/submit controls wait for hydration so early interaction
  is not lost; submit is disabled in server-rendered HTML, including without JS.
- Synthetic projects and products are loaded by a server-only development boundary. Production
  ignores preview parameters, shows an honest empty portfolio, and returns 404 for
  fictional project slugs. The production brief uses the server-backed submission
  path; only an explicit `previewEnabled` render can display a simulated success.
- Shop cards receive a browser-safe projection: Decimal values are serialized,
  object storage keys are excluded, and SKUs are not rendered. Development cards
  link to the matching development-only detail route. Repository-level publication
  and active-variant filters remain the source contract for future integration.
- The historical preview Shop cards keep their explicit media-empty behavior;
  the current loopback catalog now has 50 mapped JPG assets from the Owner
  dataset, all unpublished until the publish gate is approved. No generated
  product image is presented as factual inventory.
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
- FE-21 uses the same development gate and a fixture-only custom-print projection.
  The Action Queue custom-review row hands off only to the isolated
  `module=custom-print&request=<fixture-reference>` query. Its request list and
  review drawer import no service, repository, Clerk
  projection, customer identity, filename, storage key, signed URL, token,
  money, provider payload, or server audit. The browser displays the private-file
  boundary instead of a fake file link. Material, Decimal-shaped weight, integer
  seconds, and locked request quantity are validated locally before the visual
  `SUBMITTED` to `UNDER_REVIEW` to `QUOTE_READY` handoff. Configuration and notes
  remain optional. No review, quote, audit, file access, or status mutation is
  created, and a later server integration remains responsible for permission,
  ownership, current-status checks, Decimal parsing, audit, and pricing rules.
- FE-22 remains under the same development-only gate. Its `QTE-EX-3028` fixture
  is not a database row, a quote token, a pricing-rule activation, or an
  operator authorization. The displayed fixture breakdown calls the shared
  Decimal calculation contract only when the fixture declares an already
  validated rule. `rule-missing` deliberately produces no calculation and no
  send action. The local `SENT` state freezes a UI snapshot with a seven-day
  expiry example; it never creates a quote, public token, audit event, email,
  payable order, or provider call. The server still owns active-rule lookup,
  validation, calculation snapshot, send transition, expiry, token issuance,
  and audit.
- No new dependencies, global tokens, logo assets, migrations or environment changes
  were introduced by this frontend batch.

## Verification

### Latest integration verification — 2026-09-16

- `corepack pnpm typecheck`: passed.
- `corepack pnpm lint`: passed with the repository's existing warning set; the
  changed files have no ESLint warnings or errors.
- `corepack pnpm test`: 73 tests passed across 15 files.
- `corepack pnpm test:backend`: 119 tests passed across 22 files.
- `corepack pnpm build`: production build passed and emitted the new admin
  detail/subview routes.
- `corepack pnpm test:e2e` with the default four local workers: 54 passed, 3
  failed while the Next development server compiled cold routes under parallel
  contention (one order-status navigation timeout and two Smart Drop Box
  navigation assertions). The same three cases passed serially.
- CI-mode browser gate (`CI=1 corepack pnpm test:e2e`, one worker with retry):
  57/57 passed. This is the reproducible PR smoke result; the parallel local
  runner remains a resource-sensitive diagnostic only.
- The supplied non-production Clerk identity is now matched to an active
  database-owned Owner `AdminProfile` on loopback. The retained authenticated
  smoke evidence covers the Action Queue and reload boundary; any new visual
  acceptance still remains a separate Owner decision.
- Loopback public-content seed verification: 4 services, 17 published
  portfolio projects, and 6 mapped portfolio media. This does not count as a
  retail Shop catalog seed; the source/data gap is recorded in
  [`docs/backend/catalog-source-audit.md`](../backend/catalog-source-audit.md).
- `impeccable detect --json src/app/admin src/components/niuva/admin-shell.tsx`:
  no findings.
- `git diff --check`: passed.

- `corepack pnpm lint`: 0 errors, 147 pre-existing warnings; focused ESLint on the
  changed frontend/test files has no warnings or errors.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: 59 tests passed across 15 files.
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
- Focused FE-21 unit: 3 tests passed, covering explicit review edges, missing
  slicer input recovery, local-only handoff, and private-file link omission.
  Focused FE-21 Playwright: 5 tests passed, covering local selection, private
  file unavailability, Queue handoff, missing/valid review inputs, error recovery,
  no mutation request, and the 320–1440px responsive matrix.
- Focused FE-22 unit: 3 tests passed, covering Decimal-contract output, the
  missing-active-rule block, immutable local sent snapshot, and no fetch call.
  Focused FE-22 plus Action Queue Playwright: 10 tests passed, covering Queue
  handoff, rule-missing block, local send/lock, loading/empty/error/invalid
  fixture recovery, no mutation request, and the 320-1440px responsive matrix.
- Focused FE-23 plus Action Queue Playwright: 9 tests passed, covering the
  Queue-to-SKU handoff, local SKU search, publication and active-stock filters,
  explicit inactive/OOS/unpublished labels, loading/empty/error recovery, no
  mutation request, and the 320-1440px responsive matrix.
- Focused FE-24 unit: 3 tests passed, covering catalog-compatible local
  validation, required stock-reason intent, local-only draft save, and conflict
  recovery. Focused FE-24 Playwright: 4 tests passed, covering variant handoff,
  invalid-stock focus recovery, unsaved/reason/save feedback, loading/empty/
  error/conflict/missing-fixture recovery, no mutation request, and the
  320-1440px responsive matrix.
- Focused FE-25 Playwright: 3 tests passed, covering publication/readiness
  separation, draft and published-preview filters, local create/edit selection,
  loading/empty/error/filter-empty recovery, no mutation request, and the
  320-1440px responsive matrix. Published-preview is a fixture label only;
  no portfolio project, media, client, logo, or public page is read or changed.
- Focused FE-26 unit: 1 test passed, covering the three-part permission gate
  and a local-only publication intent. Focused FE-26 Playwright: 3 tests passed,
  covering FE-25 editor handoff, narrative/media validation, loading/empty/error
  recovery, permission blocking, no mutation request, and the 320-1440px matrix.
- Full unit suite: 17 files and 65 tests passed. `corepack pnpm typecheck`,
  `corepack pnpm build`, and `git diff --check` passed. `corepack pnpm lint`
  exits successfully with the existing 147 warnings limited to bundled
  `.agents/skills/impeccable` scripts and `src/modules/shipping/retail-rate-service.ts`.
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
  inquiry API mutation (superseded for FE-07 by the 2026-09-13 server-backed
  slice). FE-11 adds guest validation, Cart handoff, shipping
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
- FE-21 was inspected through the development-only custom review drawer after
  hydration. The private-file boundary, request context, required slicer inputs,
  optional configuration/notes, and local quote-ready handoff are technical
  preview evidence only. Owner visual acceptance remains an explicit decision,
  separate from this implementation and automated checks.
- FE-22 was inspected through the development-only quote workspace after
  hydration. The review context, active-rule label, Decimal breakdown, and
  separate snapshot ledger are technical preview evidence only. Owner visual
  acceptance remains an explicit decision, separate from automated checks.
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
- Production runtime smoke for the explicit FE-21 preview URL returns 404 with
  `noindex`; `/admin/custom-print` returns 503 without Clerk configuration and
  does not expose the custom-review fixture reference.
- Production runtime smoke for the explicit FE-22 preview URL returns 404 with
  `noindex`; its synthetic request reference and quote-editor copy are absent.
  `/admin` still returns 503 without Clerk configuration and does not expose
  the quote fixture.
- Production runtime smoke for the explicit FE-23 preview URL returns 404 with
  `noindex`; a second synthetic SKU, product-list copy, and target admin route
  are absent. `/admin` remains a 503 `AUTH_UNAVAILABLE` boundary without Clerk
  configuration and does not expose the stock fixture.
- Production runtime smoke for the explicit FE-24 preview URL returns 404 with
  `noindex`; editor copy, its example product name, and media-placeholder copy
  are absent. `/admin` remains a 503 `AUTH_UNAVAILABLE` boundary without Clerk
  configuration and does not expose the editor fixture.

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
FE-24 local review evidence: `admin-product-editor-{390,1280}.png` under
`C:/Users/FAIZ/.codex/visualizations/2026/09/08/fe24/`; it is not committed and
does not constitute owner visual acceptance. FE-25 local review evidence will
be recorded at `admin-portfolio-{mobile,desktop}.png` under
`C:/Users/FAIZ/.codex/visualizations/2026/09/09/fe25/`; it is not committed and
does not constitute owner visual acceptance.
FE-19 awaits owner visual review before screenshot evidence is recorded.
FE-20, FE-21, FE-22, FE-23, and FE-24 await owner visual review before screenshot evidence is recorded.
FE-25 was inspected at 1280x900 and 390x844. The desktop workspace separates
the selection rail from publication/readiness decisions, while the mobile cards
keep draft, published-preview, missing-media, and missing-permission labels in
the reading order. The captures are technical preview evidence only; owner
visual acceptance remains separate.

Shared public-route behavior remains in `tests/e2e/public-pages.spec.ts`.
FE-12 through FE-15 keep workflow and responsive assertions in the dedicated
`tests/e2e/custom-print.spec.ts`, `tests/e2e/custom-request.spec.ts`, and
`tests/e2e/quote-review.spec.ts`, and `tests/e2e/order-status.spec.ts` files
requested by the task map.

## Git and handoff

Current branch: `main`.
Implementation PR [#3](https://github.com/batakers/Niuva-2026/pull/3) merged as
`2c845d8`; the acceptance-handoff documentation follow-up is PR
[#5](https://github.com/batakers/Niuva-2026/pull/5), merged as `0f350ec`. No
deployment or provider activation was performed because the Owner/provider
gates in the readiness report remain open.

The FE-16–26 commit lineage below is retained as historical frontend-batch
evidence only; it is not the current server-backed admin handoff.

Historical FE-16 is recorded through commit `394f752`; FE-17 through `9456fc0`;
FE-18 through `adc6e9a`; FE-19 through `0cd2c5a`; FE-20 through `9f0a5d8`;
FE-21 through `c5dbb5a`; FE-22 through `cfd19a7`; FE-23 through `01346c9`;
FE-24 through `a1d695f`; and FE-25 through `f274ca8`.

Pre-existing sandbox changes are preserved: `.env.example`, the two sandbox
documents in `docs/backend/`, and `scripts/local-dev-db.ps1`. The existing task-map
edits were extended, not replaced. Ignored local environment/database files were
not changed. Do not stage this entire dirty working tree indiscriminately.

Review the public screens through FE-15 and the isolated FE-16–26 admin proof.
Integrating actual published content, authentication, or submission requires a
separate task and factual content/permission checks. To roll back this batch,
reverse only its frontend/tests/contract/task-document edits; do not reset the
worktree or remove unrelated sandbox files.
