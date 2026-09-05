# Backend integration-test boundary

Run integration tests only after setting `TEST_DATABASE_URL` to a dedicated,
non-production PostgreSQL database with `test` in its name. The guard in
`src/lib/db/test-safety.ts` rejects a missing URL, a non-test database name,
and any URL that resolves to the same logical database as `DATABASE_URL`.

The worktree provides a local PostgreSQL 18 cluster on loopback port `55432`.
Run `corepack pnpm test:integration`; the helper starts the isolated cluster,
applies reviewed migrations through `migrate deploy`, runs migration and
concurrency smoke tests, and cleans domain tables deterministically. Do not
substitute a production or shared database.
