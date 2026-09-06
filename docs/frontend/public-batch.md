# Frontend public batch — FE-00–08

Date: 2026-09-06. Status: **UI_IMPLEMENTED**, **VISUAL_ACCEPTANCE_PENDING**,
**NOT_INTEGRATED**. User approved FE-00–02 followed by FE-03–07 and FE-08.

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
  object storage keys are excluded, and SKUs are not rendered. The grid cannot
  buy or navigate to a product detail before FE-09. Repository-level publication
  and active-variant filters remain the source contract for future integration.
- Shop media remains an explicit empty slot because launch photography, products,
  variants and publication permission are not yet approved. No generated product
  image is presented as factual inventory.
- Product detail, cart, custom-print screens, checkout and admin remain FE-09 onward.
  This does not activate existing backend/provider adapters or change auth.
- No new dependencies, global tokens, logo assets, migrations or environment changes
  were introduced by this frontend batch.

## Verification

- `corepack pnpm lint`: 0 errors, 147 pre-existing warnings; focused ESLint on the
  changed frontend/test files has no warnings or errors.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: 27 tests passed across 7 files.
- `corepack pnpm test:e2e`: 18 tests passed, including existing styleguide/security
  regression tests. Covers mobile menu/Escape/skip link, real-route navigation,
  project filter/detail/404/retry, form recovery and no inquiry API mutation.
- Responsive matrix: six public routes at 320, 390, 768, 1024, 1280 and 1440px;
  one main and H1 each, no horizontal overflow or page errors, reduced motion.
- `corepack pnpm build`: production compilation and route generation passed.
- `git diff --check`: passed (normal Windows line-ending notices only).
- Production browser smoke: synthetic portfolio/Shop and preview controls absent;
  fictional detail 404; Shop keeps an honest empty state; brief exposes completeness
  check, not simulated success.
- Manual browser console pass on five routes: no console errors. Desktop/mobile
  screenshots inspected; owner visual acceptance and assistive-technology review
  remain separate from these automated results.

Local screenshot evidence (not committed):
`C:/Users/FAIZ/.codex/visualizations/2026/09/05/01a07172-b3f5-77f2-b8e3-036ed4befe4c/frontend-{home,services,projects,detail,brief}-{390,1280}.png`.
Shop evidence: `frontend-shop-{390,1280}.png` and `frontend-shop-error-1280.png`
in the same local visualization folder.

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

Review the public screens before FE-09. Integrating actual published content and
submission requires a separate task and factual content/permission checks. To
roll back this batch, reverse only its frontend/tests/contract/task-document edits;
do not reset the worktree or remove unrelated sandbox files.
