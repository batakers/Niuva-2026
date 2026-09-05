# Backend Foundation Contract

## Scope

Phase 0 created contracts and safe runtime boundaries. Phase 1 adds an
unapplied, reviewed core-domain migration and server-only Clerk boundary; it
does not activate any provider, configure keys, deploy a migration, or make a
product route depend on an unapproved business rule.

## Worktree isolation record

The implementation worktree is `C:\Portfolio\NIUVA 2026-backend-foundation` on
branch `codex/backend-foundation`, based at SHA
`b276c1bfd4d86462edff65c28c505b57a9415ebb` (captured 2026-09-04). The source
`main` worktree at `C:\Portfolio\NIUVA 2026` remains separate; its existing UI
and documentation changes were not reset, staged, or overwritten.

## Dependency register

| Package | Purpose | Maintenance and security boundary | Direct service cost |
| --- | --- | --- | --- |
| `prisma` `7.10.0` | Local CLI for schema validation, client generation, and reviewed migrations. | Pin to the same stable version as the client; only its engine build script is approved. | None; Neon is a separate selected provider. |
| `@prisma/client` `7.10.0` | Generated, typed database client boundary. | Generated output is ignored and recreated with `pnpm db:generate`; runtime URL is validated before a client is created. | None. |
| `@prisma/adapter-pg` `7.10.0` and `pg` | Required PostgreSQL driver adapter for Prisma 7 and Neon-compatible TCP connections. | Pin the adapter with Prisma; use a single process client and bounded driver-pool settings. | None. |
| `dotenv` | Loads a local `.env` only for Prisma CLI configuration. | Never exposes values to browser code; `.env*` stays ignored. | None. |
| `zod` | Runtime validation at server and request boundaries. | Reject malformed configuration/input without returning secret values. | None. |
| `decimal.js` | Deterministic decimal arithmetic for future authoritative money rules. | Monetary services must accept string/Decimal input, not JavaScript floating-point values. | None. |
| `@clerk/nextjs` `7.8.0` | Server-only Clerk session boundary and Next 16 `proxy.ts` filter for Owner/Admin access. | Exact pin selected because it supports the installed Next/React peer ranges and had cleared the local release-age policy; resource-level `requireAdmin` remains the authorization authority. | No SDK fee added here; Clerk plan/onboarding remains an owner/provider decision. |
| `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` `3.1100.0` | Cloudflare R2's S3-compatible private-upload adapter and signed PUT URL creation. | Exact mature pins; credentials remain server-only and are never included in URLs returned to logs/audit. This is the smallest maintained SDK surface for R2 presigning. | No SDK fee; R2 storage/request charges remain a separate provider decision. |

R2 now uses the two AWS SDK packages above in a non-production-only adapter.
Midtrans and Resend use the platform `fetch` boundary, not an additional SDK.
Biteship and Sentry remain uninstalled and inactive.

## Package-script policy

`pnpm-workspace.yaml` permits build scripts only for `@prisma/engines` and
`prisma`, which are needed to provide Prisma's reviewed local schema engine.
All other pending package build scripts are explicitly denied. Re-evaluate a
new approval during the dependency review that introduces the package.

## Runtime environment behavior

`src/instrumentation.ts` validates supplied configuration once per server
instance. Empty optional provider groups keep their capability disabled; a
malformed supplied value or a partially supplied capability group fails before
the server accepts requests. A feature must call its capability-specific getter
(for example `getDatabaseEnvironment`) before using a provider, so it cannot
fall back to a default or browser-provided value.

`src/lib/env/public.ts` has a separate, explicit allow-list for `NEXT_PUBLIC_*`
values. Server secrets are not imported or returned by that module.

## Database and test safety

`prisma/schema.prisma` and
`prisma/migrations/20260904090000_core_domain_persistence/migration.sql`
define the reviewed Phase 1 foundation. The migration is intentionally
unapplied. `pnpm typecheck`, `pnpm build`, and `pnpm test:backend` generate the
ignored client before their own work. Do not run `pnpm db:migrate` or
`pnpm db:deploy` until a reviewed non-production database URL is available.

The backend test harness requires `TEST_DATABASE_URL` and rejects it when it
uses the same logical database as `DATABASE_URL` or lacks an explicit `test`
database-name marker. A real migration smoke test remains blocked until a
dedicated test database is supplied.

## Open operational decisions

| ID | Decision owner needs to make | Effect until resolved |
| --- | --- | --- |
| CLOSED-ENV-001 | `CUSTOM_FILE_MAX_BYTES` | Approved at 100 MiB (104,857,600 bytes) per private customer file; R2 remains disabled until its complete provider group is configured. |
| OPEN-DB-001 | Neon runtime pooled URL versus direct migration URL strategy | Do not add a second connection variable or run migration against an unknown endpoint. |
| OPEN-SEC-001 | CSP provider origins and strict nonce/SRI rollout | Baseline is self-only and fail-closed for future provider scripts/frames. |
| CLOSED-TEST-001 | Dedicated non-production test database | A guarded local PostgreSQL 18 `niuva_test` database is available on loopback port 55432; Neon production/shared URLs remain forbidden. |
