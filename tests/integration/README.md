# Backend integration-test boundary

Run integration tests only after setting `TEST_DATABASE_URL` to a dedicated,
non-production PostgreSQL database with `test` in its name. The guard in
`src/lib/db/test-safety.ts` rejects a missing URL, a non-test database name,
and any URL that resolves to the same logical database as `DATABASE_URL`.

The worktree provides a local PostgreSQL 18 cluster on loopback port `55432`.
Run `corepack pnpm test:integration`; the helper starts the isolated cluster,
applies reviewed migrations through `migrate deploy`, runs migration and
concurrency smoke tests, verifies the Project Brief route through persistence
and the server-owned Action Queue, and cleans domain tables deterministically.
The same suite now also exercises the retail rate and checkout routes against
real PostgreSQL with non-production provider adapters, including order
snapshots, stock reservations, payment attempts, and idempotent replay. Those
adapters are test doubles; this result is not a Biteship or Midtrans sandbox
transaction.
The same suite checks database-owned `AdminProfile` resolution for an exact
Clerk test identity; it does not call a live Clerk tenant. Do not substitute a
production or shared database.
The private-upload route test also runs the real intent → confirmation → custom
request path against PostgreSQL with a deterministic in-memory object-storage
double, proving `PENDING → UPLOADED → VERIFIED` without claiming a real R2
provider smoke. A second scenario binds the verified file to a Project Brief and
checks the inquiry link plus final `VERIFIED` ownership state. A mismatch
scenario verifies route-level rejection, `REJECTED` tombstoning, and object
cleanup.
