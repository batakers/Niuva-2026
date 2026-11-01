# Memory

Update this after major decisions, completed phases, or bugs that future agents need to know about. Keep it short.

## Current State

- Working baseline: `main` `6c63707` after PR #97 (30 Oct 2026). Staging `niuva-t03-staging` (Netlify functions us-east-2, Neon ap-southeast-1) runs sandbox providers; dated hosted evidence lives in `TASKS.md`, not here.
- Current work: v1.0 closure. Scope: `PRODUCT.md`; dependencies: `ROADMAP.md`; sole active backlog: `TASKS.md` (start with its "Fokus aktif" board); completion: `docs/v1-definition-of-done.md`. `.kiro/specs/` is historical evidence.
- Current task statuses and dated execution evidence belong to `TASKS.md`; this memory does not duplicate its backlog table.
- Data model: 81 Prisma models (`grep -c '^model ' prisma/schema.prisma`) and 41 migration folders (`ls -d prisma/migrations/*/ | wc -l`). Counts describe files, not an applied database state.
- Hosted preflight: `corepack pnpm staging:preflight` uses process environment and the canonical origin, capability and database-binding helpers. Runtime privileges and migration history use separate, binding-checked credentials; both client connections require verified TLS. It does not provision, migrate or call transaction providers; safe output omits credentials and resource identifiers. See `docs/backend/t03-hosted-sandbox-runbook.md` for evidence boundaries.
- Auth, two separate systems:
  - Owner/Admin: Better Auth + TOTP (`src/lib/auth/admin-engine.ts`); `src/lib/auth/admin.ts` requires `mfaVerified`, `twoFactorEnabled`, and an active AdminProfile. `src/proxy.ts` checks only Admin session-cookie presence and must not import the engine or database (edge bundle; enforced by `tests/unit/proxy-edge-imports.test.ts`). Staging has no signup: `corepack pnpm staging:bootstrap-owner` (`src/modules/admin/staging-owner-bootstrap.ts`) creates the first Owner once on a verified staging binding; Admins come from the Owner invitation flow. Clerk SDK is absent; `src/lib/auth/clerk.ts` only re-exports `./admin` (deprecated).
  - Customer: opaque DB session, `src/lib/auth/customer.ts` and `src/modules/customer-auth/` (Google consent or verified email/password). T12/T13 signup flows run in local-test/mock; on staging, email/password signup and login are limited to the env list `NIUVA_STAGING_CUSTOMER_EMAILS` (`src/modules/customer-auth/staging-testers.ts`, Owner E1; addresses never in Git) and need the `signup`/`passwordAuth` grants; checkout calls `requireCustomer`.
- Funnels (source evidence only):
  - B2B: WhatsApp via `src/app/services/` and `src/components/niuva/b2b-contact-link.tsx`. `POST /api/project-brief` returns 410 `B2B_RETIRED`; `/project-brief` redirects to `/services` or a recognized `/services/[slug]`. Historical inquiries remain retired.
  - Retail: `src/app/api/checkout/route.ts` → `src/modules/checkout/service.ts`; notifications: `src/app/api/webhooks/midtrans/route.ts`; status: `src/app/orders/[token]/page.tsx`.
  - MAKE: `src/app/api/custom-print/requests/route.ts`; operator `sendQuoteAction` in `src/app/admin/actions.ts`; accept: `src/app/api/quote/[token]/accept/route.ts`; payable order: `acceptAndCreatePayableOrder` in `src/modules/custom-print/repository.ts`.
- Catalog: Owner decision 2026-10-28 publishes all 8 Shop products (Custom Print/MAKE takes customer designs only, so `CUSTOM_FLOW_PRODUCT_OPTIONS` is empty); package dimensions are Owner-approved estimates in `docs/source/Dataset Shop Niuva/catalog-package-estimates.json`. `corepack pnpm staging:import-catalog` (`src/modules/catalog/staging-import.ts`) upserts the manifest into a verified staging binding; loopback seeding stays `db:seed:catalog`.
- Pricing: the Admin form and tariff editor activate rules on the loopback development DB only (`assertPricingRuleDevelopmentEnvironment`). `corepack pnpm staging:activate-pricing` (`src/modules/pricing/staging-activation.ts`) activates the approved `CUSTOM_PRINT_V1` v1 on a verified staging binding with Owner-typed quantity semantics (never defaulted), attributed to the single active Owner; both share `activateCustomPrintRuleInTransaction`. Staging has v1 `PER_UNIT` ACTIVE since 2026-10-29 19:24 UTC, applied through Neon MCP SQL mirroring that transaction (TASKS log "Aktivasi pricing MAKE"); the script itself has not run on hosted.
- Providers: `src/modules/providers/` contains `s3.ts`, `runtime.ts`, `non-production.ts`, `local-demo.ts`; domain adapters use these helpers. `S3_*` is primary, `R2_*` legacy; mixed namespaces are rejected (`src/lib/env/object-storage.ts`). Private files/public media share the S3 client.
- Shipping diagnostics: `src/modules/shipping/biteship.ts` bounds non-2xx diagnostics to 4 KiB and eight-digit numeric codes; only status/code enter safe logs. Error-body reads observe the request AbortSignal and cancel without awaiting cancellation; public failure remains generic 503. Rates payload/normalization, capability/non-production guards and checkout are unchanged.
- Shipping verification: targeted/backend/unit, lint, strict typecheck, Prisma validate and default Turbopack build pass locally; additional Webpack build fails TS2344 on unchanged sign-in/analytics route types. Commands, counts and limits: `TASKS.md`. Browser/integration DB/hosted acceptance: belum diverifikasi.
- Next work follows dependencies and acceptance criteria in `TASKS.md`; missing Owner/provider inputs remain blocked.

## Decisions

- 2026-10-31 — Owner ordered a global frontend redesign (design system, sitemap, user flows, Company/Commerce/Customer/Admin pages) with BUY, MAKE and B2B WhatsApp behaviour unchanged, verified locally first; this lifts the ROADMAP "no global redesign" boundary as milestone M5a (T45–T50) ahead of T36/T37. URLs, API, data, auth, pricing and payments stay. Q19–Q22: three visual directions shown before one is chosen; Indonesian nav labels ("Custom 3D Print" and "ready-made" confirmed); MAKE login stays at entry; homepage leads with DEVELOP. Audit/IA: `docs/design/redesign-2026-10-31-audit-ia.md`. Q23–Q25 lock the world: light ground, Manrope, one Niuva-blue panel with the Owner mascot (Blender renders in `public/assets/mascot/`, not realtime 3D), no project photos on the homepage; foundation v2 tokens in `src/app/globals.css` replace DS-DEC-019 values (T46).
- 2026-10-31 — Owner answered Q15–Q18 (`TASKS.md` decisions): database backups kept 30 days; privacy policy v1.1 draft text approved (Resend listed as US and Japan/Tokyo), not yet published; staging deploys wait for Netlify Free credits to reset on 26 Nov (no upgrade); Helipod VPS bought after the T41 deploy design, Biznet Gio account created with it. Docs-only changes go out as one batched PR.
- 2026-10-30 — Owner answered Q1–Q10 (focus board in `TASKS.md`): staging grants `refund`/`privacy`/`googleAuth`; QRIS + GoPay for v1; production on one Helipod VPS B Jakarta running the app and self-managed PostgreSQL (Owner, 30 Oct; not purchased); daily backup plus bookkeeping copy in one Jakarta-region store, Biznet Gio NEO Object Storage (Q12; account not created, features belum diverifikasi); production Customer files and public media stay on Cloudflare R2 (Q13); production job cadence in `JOB_SCHEDULES` (Q14); staging builds may stay Active for `main`; abandoned attempts stop reconciling after 7 days (`ABANDONED_ATTEMPT_RECONCILIATION_WINDOW_MS`); Q2–Q4 grants live in `ACTIVATION_GRANTS` (`src/lib/env/deployment.ts`).
- 2026-10-27 — T03 staging decisions, authorization and evidence boundaries: see `docs/backend/t03-hosted-sandbox-runbook.md` and `TASKS.md`; current hosted acceptance belum diverifikasi.
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

- A1 — Resolver is consumed by adapters (`src/modules/capabilities/resolver.ts`); provider guards remain and refuse NODE_ENV=production unless the caller env states the `staging` tier explicitly (`assertNonProductionProvider`); live providers are refused everywhere. Production/live are denied (`src/modules/capabilities/matrix.ts`); `src/lib/env/deployment.ts` grants staging only the six Owner E6 capabilities (payment, shipping, emailSender, emailDelivery, objectStorage, scheduledJobs) plus E1 `signup`/`passwordAuth`, and ignores production entries. A grant is a reviewed source entry with an Owner instruction reference and date, never an env flag; production entries are ignored. PUB-POLICY closes only when `PUBLIC_CUSTOMER_POLICY.publishedAt`/`effectiveAt` are recorded and reached (`isPolicyPublished`). Untuk T03, lihat status di `TASKS.md` dan observasi hosted bertanggal di `docs/backend/t03-hosted-sandbox-runbook.md`; bukti lokal belum memverifikasi operasi provider hosted saat ini.
- A2/F1 — Owner approved the public policy v1.0 text on 2026-10-28 (checksum-addressed in `src/modules/customer-auth/public-policy.ts`); Owner set `publishedAt`/`effectiveAt` to 2026-10-28T00:00+07:00, so `/terms` and `/privacy` render and PUB-POLICY is closed. Closure copies consents to `CustomerClosedConsentProof` (email digest, 30 days). `src/modules/customer-auth/legal.ts` supplies it in the local-test public-auth fixture and, with a valid tester list, to staging registration; hosted email delivery/provider capability and publication gates follow `TASKS.md`. Public activation remains separate.
- PUB-AGE / PUB-GUARDIAN — 18+ declaration is implemented, not actual-age verification (`src/modules/customer-auth/age-declaration.ts`). Child/guardian accounts are out of scope; formal/hosted review remains separate (`docs/legal/customer-public-launch-readiness.md`).
- B2 (carried; original defect resolved in source) — Customer ID or HMAC IP candidate + endpoint keys (`src/lib/http/public-mutation.ts`, `src/lib/security/actor-key.ts`); memory only for local-test, Prisma/PostgreSQL otherwise (`src/lib/security/shared-rate-limit.ts`). Hosted tiers key anonymous actors on the Netlify `x-nf-client-connection-ip` only (`src/lib/security/client-ip.ts`, also used by auth/logout/analytics limiters and Better Auth `ipAddressHeaders`); spoofed forwarded headers stayed 429 on staging 29 Oct (T10 DONE in `TASKS.md`). Revisit the header if production leaves Netlify.
- B5 (carried; original defect resolved in source) — Tracked observability is wired into `apiError()` with correlation IDs (`src/lib/http/response.ts`) and Admin actions through `toAppErrorLogged` (`src/lib/observability/report.ts`, `src/app/admin/actions.ts`). Plain `toAppError` stays pure; deployed collection/alerting belum diverifikasi.
- Open inputs — Owner answered E10–E12 on 2026-10-29 (working hours/coverage, RPO 24 h, RTO 1 working day, manual-refund owner/evidence): `TASKS.md`. Q1–Q10 answered 2026-10-30 (see Decisions); Midtrans sandbox dashboard features and the PUB-RECORDS store provider remain belum diverifikasi. Full-refund direction remains; hosted submission/reconciliation is blocked (T23–T25). Activation/deployment need explicit instructions.
- Evidence scope — `docs/frontend/mvp-release-readiness.md` retains its recorded scope. Browser, visual/device/AT, provider, staging, production acceptance: belum diverifikasi in this refresh.

## Completed

- [x] Step 4 agent-documentation scaffold
- [x] Application scaffold baseline
- [x] Verification harness
- [x] Core schema: 81 models, 41 migration folders; T12/T13 migration applied only to a new isolated local test database
- [x] Auth: Better Auth/TOTP for Owner/Admin; Customer DB sessions; T12/T13 public signup tested locally, hosted gates remain
- [x] Active B2B WhatsApp path and retired Project Brief boundaries present
- [x] Company routes on Foundation v2 (T47), verified locally; Owner visual review per route is tracked in `TASKS.md`
- [x] Commerce and MAKE routes on Foundation v2 (T48), verified locally; Owner visual review and Customer/Admin routes are tracked in `TASKS.md`
- [x] Customer account, refund, privacy and auth routes on Foundation v2 (T49), verified locally; Owner visual review and Admin routes are tracked in `TASKS.md`
- [x] Retail/MAKE checkout/quote/order source paths present; runtime belum diverifikasi
- [ ] UI Foundation: DS-DEC-019 authorization remains; visual/device/AT acceptance belum diverifikasi
- [ ] v1.0 closure/launch: open gates remain in `TASKS.md`
