# Phase 3 technical closure

Scope: dependency advisory remediation and custom-shipping retry correctness.
No provider configuration or production activation is part of this change.

## Dependency decision

Keep Prisma client, adapter and CLI at 7.10.0. Apply pinned, scoped pnpm
overrides for lodash 4.18.1, Prisma's mysql2 3.24.3, and @prisma/config's
deepmerge-ts 8.0.2. These replace the vulnerable transitive versions; they add
no service or monthly cost. Review/remove overrides when upgrading Prisma.

deepmerge-ts is a major transitive update: recursive Map merging and type
exports changed. The installed Prisma config uses the plain deepmerge export
as its c12 merger; this repository config contains paths and a datasource URL,
not Maps or custom merge functions. Prisma generate, validate, migration and
build checks are required to verify this compatibility.

Upstream context: https://github.com/prisma/orm/issues/30052

## Shipping retry contract

The stored provider reference and expiry are mandatory preparation fields.
Only the request that creates an attempt can initiate provider payment creation.
Concurrent/repeated requests replay a stored provider result, or conflict if
the first result is still missing. An ambiguous provider failure requires
reconciliation, not another automatic create call. Token recovery remains a
separate operational task.

A PENDING attempt at or beyond its persisted expiry conflicts, even before
an expiry webhook/job changes its status. Its deadline never extends on retry.
After confirmed EXPIRED/FAILED/CANCELLED status, a replacement uses a new
reference. Historical commercial fields remain immutable. Payment creation
stays outside the database transaction and receives the persisted deadline.

Integration regression checks use real PostgreSQL to check exact-deadline
denial and simultaneous replacement requests producing only one new attempt.
Unit regression checks reject unresolved retries before a second provider call.

## Rollback

Restore the previous scoped overrides/lockfile and shipping changes together
through reviewed Git changes, then run frozen install and verification. No
schema migration is introduced by this work.

## Verification (2026-09-05)

- Production and full pnpm audit: zero known vulnerabilities.
- Frozen-lockfile install, Prisma generate/validate, typecheck and build pass.
- Backend: 101 tests; integration: 6 cases; UI/unit: 15; browser smoke: 10.
- Real PostgreSQL concurrency also exercises ShippingService with a fake
  payment gateway: two calls produce one provider call and one pending attempt.
- Lint: zero errors, 147 existing warnings. The first concurrent lint run
  failed during file traversal; the subsequent run passed.
- Local test PostgreSQL was stopped after verification; data was retained.
- No production transaction, provider onboarding, migration edit or deployment.
