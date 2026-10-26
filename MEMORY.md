# Memory

Update this after major decisions, completed phases, or bugs that future agents need to know about. Keep it short.

## Current State

- Local shipping patch: 24–25 Oktober 2026, clean AO baseline/live main `13bdeb954de819b3959ee41e6cb36a1860687aeb`. Verification is local/mock; provider/staging/production acceptance: belum diverifikasi.
- Current work: v1.0 closure. Scope: `PRODUCT.md`; dependencies: `ROADMAP.md`; sole active backlog: `TASKS.md`; completion: `docs/v1-definition-of-done.md`. `.kiro/specs/` is historical evidence.
- Current task statuses and dated execution evidence belong to `TASKS.md`; this memory does not duplicate its backlog table.
- Data model: 80 Prisma models (`grep -c '^model ' prisma/schema.prisma`) and 39 migration folders (`ls -d prisma/migrations/*/ | wc -l`). Counts describe files, not an applied database state.
- Auth, two separate systems:
  - Owner/Admin: Better Auth + TOTP (`src/lib/auth/admin-engine.ts`); `src/lib/auth/admin.ts` requires `mfaVerified`, `twoFactorEnabled`, and an active AdminProfile. Clerk SDK is absent; `src/lib/auth/clerk.ts` only re-exports `./admin` (deprecated).
  - Customer: opaque DB session, `src/lib/auth/customer.ts` and `src/modules/customer-auth/` (Google consent or verified email/password). T12/T13 signup flows are available only in local-test/mock; checkout calls `requireCustomer`.
- Funnels (source evidence only):
  - B2B: WhatsApp via `src/app/services/` and `src/components/niuva/b2b-contact-link.tsx`. `POST /api/project-brief` returns 410 `B2B_RETIRED`; `/project-brief` redirects to `/services` or a recognized `/services/[slug]`. Historical inquiries remain retired.
  - Retail: `src/app/api/checkout/route.ts` → `src/modules/checkout/service.ts`; notifications: `src/app/api/webhooks/midtrans/route.ts`; status: `src/app/orders/[token]/page.tsx`.
  - MAKE: `src/app/api/custom-print/requests/route.ts`; operator `sendQuoteAction` in `src/app/admin/actions.ts`; accept: `src/app/api/quote/[token]/accept/route.ts`; payable order: `acceptAndCreatePayableOrder` in `src/modules/custom-print/repository.ts`.
- Providers: `src/modules/providers/` contains `s3.ts`, `runtime.ts`, `non-production.ts`, `local-demo.ts`; domain adapters use these helpers. `S3_*` is primary, `R2_*` legacy; mixed namespaces are rejected (`src/lib/env/object-storage.ts`). Private files/public media share the S3 client.
- Shipping diagnostics: `src/modules/shipping/biteship.ts` bounds non-2xx diagnostics to 4 KiB and eight-digit numeric codes; only status/code enter safe logs. Error-body reads observe the request AbortSignal and cancel without awaiting cancellation; public failure remains generic 503. Rates payload/normalization, capability/non-production guards and checkout are unchanged.
- Shipping verification: targeted/backend/unit, lint, strict typecheck, Prisma validate and default Turbopack build pass locally; additional Webpack build fails TS2344 on unchanged sign-in/analytics route types. Commands, counts and limits: `TASKS.md`. Browser/integration DB/hosted acceptance: belum diverifikasi.
- Next work follows dependencies and acceptance criteria in `TASKS.md`; missing Owner/provider inputs remain blocked.

## Decisions

- 2026-08-21 — Product authority: `docs/PRD-Niuva-MVP.md` and addenda; technical authority: `docs/TechDesign-Niuva-MVP.md` and addenda; visual authority: `DESIGN.md`.
- 2026-08-21 — User guidance level is C (somewhere in between), overriding the older Level A metadata for explanation style only.
- 2026-08-21 — Use a Next.js/TypeScript modular monolith with managed services; no product AI, microservices, or automatic slicer. (The "no customer account" part was superseded: current PRD addenda require Customer login before checkout; see `AGENTS.md`.)
- 2026-08-21 — Recorded template: vibe-coding-prompt-template `254bae5682d11fb27012f407d619bf55828ae639`; object unavailable locally, provenance belum diverifikasi.
- 2026-08-23 — Next.js/TypeScript App Router scaffold: `src/`, Tailwind, ESLint, `@/*`. Commit `c701fc9`: Next.js 16.3.2; current `package.json`: 16.3.6, pnpm 11.22.0. Historical Node 24.14.0: belum diverifikasi. Next.js agent-rules remain in `AGENTS.md`.
- 2026-08-23 — Verification harness: Vitest, jsdom, React Testing Library, Playwright; scripts remain in `package.json` for lint, typecheck, tests, browser checks, and build.
- 2026-08-24 — Approved logo-system assets were added. Logo colors are canonical.
- 2026-10-03 — Owner readiness pack for public Customer launch is under `docs/legal/` (`customer-public-launch-readiness.md` and related files). It records open gates; it does not authorize public registration.
- 2026-10-03 — Audit-remediation spec/registers remain historical evidence in `.kiro/specs/niuva-audit-remediation/`; their execution order is superseded by `ROADMAP.md` / `TASKS.md` (18 October). Unresolved Owner inputs must not become code defaults.
- 2026-10-04 — Tahap 0 results in `.kiro/specs/niuva-audit-remediation/baseline-gate.md` are historical, not current gate results. `.agents/**` remains ignored by `eslint.config.mjs`.

## AI / Tooling Decisions

- 2026-08-21 — Codex is primary. `AGENTS.md` owns workflow/safety; `agent_docs/` is orientation. No model is pinned in `.codex/config.toml`.
- 2026-08-21 — Optional skill/subagent generation was declined (historical record; belum diverifikasi). Skills snapshot superseded: `.agents/skills/` contains `impeccable`, `niuva-design`, `niuva-editorial`. Delegation requires explicit authorization (`AGENTS.md`).
- 2026-08-21 — AI is development assistance only; generated code still requires tests, browser checks, and human review.

## Known Issues

Carried findings retain their IDs; source fixes do not close hosted or release gates.

- A1 — Resolver is consumed by adapters (`src/modules/capabilities/resolver.ts`); provider guards remain. Production/live are denied and grants empty (`src/modules/capabilities/matrix.ts`, `src/lib/env/deployment.ts`). T03: BLOCKED_EXTERNAL; hosted/provider operation belum diverifikasi.
- A2/F1 — Owner-approved policy v1.0 content is checksum-addressed, but `publishedAt`/`effectiveAt` remain null. `src/modules/customer-auth/legal.ts` supplies it only in the local-test public-auth fixture; hosted email delivery/provider capability and publication gates follow `TASKS.md`. Public activation remains separate.
- PUB-AGE / PUB-GUARDIAN — 18+ declaration is implemented, not actual-age verification (`src/modules/customer-auth/age-declaration.ts`). Child/guardian accounts are out of scope; formal/hosted review remains separate (`docs/legal/customer-public-launch-readiness.md`).
- B2 (carried; original defect resolved in source) — Customer ID or HMAC IP candidate + endpoint keys (`src/lib/http/public-mutation.ts`, `src/lib/security/actor-key.ts`); memory only for local-test, Prisma/PostgreSQL otherwise (`src/lib/security/shared-rate-limit.ts`). T10 IN_PROGRESS; hosted topology/proxy handling belum diverifikasi.
- B5 (carried; original defect resolved in source) — Tracked observability is wired into `apiError()` with correlation IDs (`src/lib/http/response.ts`) and Admin actions through `toAppErrorLogged` (`src/lib/observability/report.ts`, `src/app/admin/actions.ts`). Plain `toAppError` stays pure; deployed collection/alerting belum diverifikasi.
- Open inputs — Policy/version/date, working calendar/coverage, accounting retention, merchant refund capability, launch dataset, recovery targets: `TASKS.md` / `ROADMAP.md`. Full-refund direction remains; hosted submission/reconciliation is blocked (T23–T25). Activation/deployment need explicit instructions.
- Evidence scope — `docs/frontend/mvp-release-readiness.md` retains its recorded scope. Browser, visual/device/AT, provider, staging, production acceptance: belum diverifikasi in this refresh.

## Completed

- [x] Step 4 agent-documentation scaffold
- [x] Application scaffold baseline
- [x] Verification harness
- [x] Core schema: 80 models, 39 migration folders; T12/T13 migration applied only to a new isolated local test database
- [x] Auth: Better Auth/TOTP for Owner/Admin; Customer DB sessions; T12/T13 public signup tested locally, hosted gates remain
- [x] Active B2B WhatsApp path and retired Project Brief boundaries present
- [x] Retail/MAKE checkout/quote/order source paths present; runtime belum diverifikasi
- [ ] UI Foundation: DS-DEC-019 authorization remains; visual/device/AT acceptance belum diverifikasi
- [ ] v1.0 closure/launch: open gates remain in `TASKS.md`
