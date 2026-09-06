# Frontend public batch — FE-00–11

Started: 2026-09-06. Updated: 2026-09-07. Status: **UI_IMPLEMENTED**, **VISUAL_ACCEPTANCE_PENDING**,
**NOT_INTEGRATED**. User approved FE-00–02 followed by FE-03–07, FE-08, FE-09, FE-10, and FE-11.

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
- No new dependencies, global tokens, logo assets, migrations or environment changes
  were introduced by this frontend batch.

## Verification

- `corepack pnpm lint`: 0 errors, 147 pre-existing warnings; focused ESLint on the
  changed frontend/test files has no warnings or errors.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: 44 tests passed across 10 files.
- `corepack pnpm exec playwright test --workers=4`: 34 tests passed, including existing styleguide/security
  regression tests. Covers mobile menu/Escape/skip link, real-route navigation,
  project and product filter/detail/404/retry, variant/quantity/OOS behavior,
  cart add/update/remove/persistence/corrupt recovery, form recovery and no
  inquiry API mutation. FE-11 adds guest validation, Cart handoff, shipping
  loading/unavailable/stale recovery, payment pending/error, and an assertion
  that the preview makes no shipping or checkout API request.
- Responsive matrix: seven public routes at 320, 390, 768, 1024, 1280 and 1440px;
  one main and H1 each, no horizontal overflow or page errors, reduced motion.
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
- Production runtime smoke for `/cart?preview=examples`: 200 response, preview
  controls and synthetic product names absent, unknown stored variant is
  recoverable, and checkout remains disabled.
- Production runtime smoke for `/checkout?preview=examples&state=ready`: 200
  response, preview controls/form and synthetic items absent, with an explicit
  unavailable notice and no provider or transaction path.

Local screenshot evidence (not committed):
`C:/Users/FAIZ/.codex/visualizations/2026/09/05/01a07172-b3f5-77f2-b8e3-036ed4befe4c/frontend-{home,services,projects,detail,brief}-{390,1280}.png`.
Shop evidence: `frontend-shop-{390,1280}.png` and `frontend-shop-error-1280.png`
in the same local visualization folder.
Cart evidence: `frontend-cart-390.png` in the same local visualization folder.
Checkout evidence: `frontend-checkout-{390,1280}.png` in the same local
visualization folder.

Tests for the related public routes are grouped in
`tests/e2e/public-pages.spec.ts`, rather than one test file per route.

## Git and handoff

Branch: `codex/frontend-public-pages`.
Base: `542375db56f0a8313bf0596ac0c127b7368cad0f`.
Commit and push are recorded in Git history after this review checkpoint. No
merge or deployment is performed by this frontend batch.

Pre-existing sandbox changes are preserved: `.env.example`, the two sandbox
documents in `docs/backend/`, and `scripts/local-dev-db.ps1`. The existing task-map
edits were extended, not replaced. Ignored local environment/database files were
not changed. Do not stage this entire dirty working tree indiscriminately.

Review the public screens before FE-11. Integrating actual published content and
submission requires a separate task and factual content/permission checks. To
roll back this batch, reverse only its frontend/tests/contract/task-document edits;
do not reset the worktree or remove unrelated sandbox files.
