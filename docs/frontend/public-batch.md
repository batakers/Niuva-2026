# Frontend public batch — FE-00–14

Started: 2026-09-06. Updated: 2026-09-07. Status: **UI_IMPLEMENTED**, **VISUAL_ACCEPTANCE_PENDING**,
**NOT_INTEGRATED**. User approved FE-00–02 followed by FE-03–07 and FE-08–14.

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
- No new dependencies, global tokens, logo assets, migrations or environment changes
  were introduced by this frontend batch.

## Verification

- `corepack pnpm lint`: 0 errors, 147 pre-existing warnings; focused ESLint on the
  changed frontend/test files has no warnings or errors.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: 49 tests passed across 11 files.
- `corepack pnpm exec playwright test --workers=4`: 47 tests passed, including existing styleguide/security
  regression tests. Covers mobile menu/Escape/skip link, real-route navigation,
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
- Existing public routes and the dedicated FE-12, FE-13 and FE-14 routes were checked at 320, 390,
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

Shared public-route behavior remains in `tests/e2e/public-pages.spec.ts`.
FE-12 through FE-14 keep workflow and responsive assertions in the dedicated
`tests/e2e/custom-print.spec.ts`, `tests/e2e/custom-request.spec.ts`, and
`tests/e2e/quote-review.spec.ts` files requested by the task map.

## Git and handoff

Branch: `codex/frontend-public-pages`.
Base: `542375db56f0a8313bf0596ac0c127b7368cad0f`.
FE-13 and the preceding frontend slices are recorded through commit `499f161` and
are pushed to the branch. FE-14 remains an uncommitted review slice at this
checkpoint. No merge or deployment is performed by this frontend batch.

Pre-existing sandbox changes are preserved: `.env.example`, the two sandbox
documents in `docs/backend/`, and `scripts/local-dev-db.ps1`. The existing task-map
edits were extended, not replaced. Ignored local environment/database files were
not changed. Do not stage this entire dirty working tree indiscriminately.

Review the public screens through FE-14. Integrating actual published content and
submission requires a separate task and factual content/permission checks. To
roll back this batch, reverse only its frontend/tests/contract/task-document edits;
do not reset the worktree or remove unrelated sandbox files.
