# Phase 2 Core Service Contract

## Implemented boundary

Phase 2 adds explicit domain transition maps and application services on top
of the Phase 1 persistence contract. Route handlers are still expected to
validate the request boundary and call these services; no provider SDK or
production workflow is activated by this change.

### State transitions

The following maps are exhaustive over their persisted enums:

- `inquiry/transitions.ts` — B2B inquiry lifecycle;
- `custom-print/transitions.ts` — custom request review and quote hand-off;
- `order/transitions.ts` — separate retail and custom-order lifecycles;
- `inventory/transitions.ts` — active, consumed, and released reservations;
- `quote/transitions.ts` — draft, sent, accepted, declined, and expired quotes;
- `payment/transitions.ts` — pending, settlement, failure, expiry,
  cancellation, and refund edges;
- `shipping/transitions.ts` — pending, shipped, delivered, and exception edges.

`transitionStatus` emits an allowlisted transition audit event, including a
`REJECTED` outcome, before returning `INVALID_STATE_TRANSITION`. Cancellation,
expiry, and refund edges additionally require an explicit approved decision;
the service never chooses an unresolved commercial policy itself.

### Public references and tokens

`createUniqueHumanReference` creates a collision-retried, date-scoped human
reference. `issueAccessToken` creates at least 256 bits of entropy and returns
the raw token only to the caller that must deliver it. Persistence receives
only a SHA-256 hash bound to `(scope, entityId, token)`. Verification rejects
scope/entity mismatches, malformed hashes, expiry, and revocation.

### Catalog and inventory

Public catalog reads select published products and active variants. Checkout
revalidates publication, activity, price, and stock server-side. Admin stock
changes use a `SELECT ... FOR UPDATE` variant lock and cannot reduce physical
stock below active reservations. Reservation creation, consumption, release,
and expiry cleanup use the same variant serialization so two concurrent
checkouts cannot oversell a variant; consume/release of an already matching
terminal state is idempotent.

### Inquiry and custom-print review

B2B inquiry and custom-print submission recheck file ownership in the
repository transaction. Only `PRIVATE_CUSTOMER` files in `VERIFIED` status may
be linked. Human reference and access-token hashes are created before the
transaction; an optional admin notification scheduler is called only after a
successful commit.

Operator review persists verified weight, duration, material, quantity,
configuration, notes, reviewer, and timestamp in `CustomPrintReview`. A quote
cannot be calculated unless the request is in `QUOTE_READY` and has a review.

### Retail checkout

`CheckoutService` accepts variant IDs, quantities, address, shipping option,
customer contact, and an idempotency key. Client totals are not part of the
authoritative input. A server shipping rate is obtained first; the database
transaction then locks/reloads variants, calculates Decimal totals, creates
immutable order/address/shipping snapshots, creates reservations, and creates
the pending payment attempt. Payment-provider creation happens after the
transaction. A matching completed idempotency key replays the stored safe
response; a different or unfinished request conflicts deterministically.

Retail reservations and their payment attempts expire after 30 minutes under
the approved closure policy. The 24-hour idempotency record TTL remains a
technical replay window and does not extend payment or stock availability.

The internal `GET/POST /api/internal/jobs/inventory-reservations` surface
reports status and accepts bounded dry-run/execute batches (maximum 100) behind
`CRON_SECRET`, database binding and the canonical operational-job role guard.
HTTP and CLI share `JobRunner`/`OperationalJobState`; POST requires an
explicit `jobPolicy` and GET requires a positive `maxLagMs`. Expiry locks payment
attempts, variants, then orders in the same order used by settlement. A still
payable attempt holds the unpaid order and reservation; when its deadline is
due, the job marks it `EXPIRED`, cancels the retail order, and releases active
reservations and their audit atomically within the job lease transaction.
A final lease check rolls the transaction back if authority expired.
Settled or refunded attempts are excluded, and repeat
runs do not apply a transition twice. This source and local PostgreSQL
integration proof do not register a hosted schedule; Owner cadence and staging
remain required before hosted operation.

### Quotes and custom shipping

Quote drafts calculate from the persisted review with Decimal arithmetic and
freeze a calculation snapshot, rule version, version number, expiry, and token
hash. A sent quote is immutable. A new draft version may supersede an older
sent version; acceptance checks that it is the latest version, within its
stored expiry, and still matches a fresh server calculation. Acceptance is
atomic with request approval and creation of a `WAITING_PAYMENT` custom order
and immutable custom-quote order item. Replaying an already accepted quote
returns the existing order without creating another one.

Final custom shipping requires an authenticated operator, a custom order in
`FINISHING_QC` (or an existing prepared `WAITING_SHIPPING_PAYMENT` payment),
and final package measurements. The provider rate, shipment snapshot, second
payment attempt, and order transition are persisted transactionally; provider
payment creation remains outside the database transaction. A still-pending
custom-shipping attempt is replayed with its original provider reference (and
stored provider result when available); an expired or failed attempt remains
immutable and a retry creates a new attempt with a new provider reference.
Pending attempts with missing provider results or elapsed deadlines conflict
until reconciliation; automatic duplicate provider creation is prohibited.
Retail orders are rejected by this path.

### Customer binary retention — 19 October 2026

The approved 14/60/90-day binary policy is implemented by
`files/retention-core.ts` and the canonical `CUSTOMER_FILE_RETENTION` job.
Unattached uploads use their latest upload/verification activity; terminal or
expired-unpaid requests use the latest known terminal/expiry activity for the
60-day clock. Completed orders use `completedAt` for the 90-day clock; later
request metadata edits do not restart it. Active orders, unresolved PENDING
payments, unsettled cancellation cases and holds prevent deletion. Financial
evidence, public media and historical B2B links are excluded.

Execute commits an irreversible `DELETE_PENDING` claim before external I/O.
Upload confirmation, reuse, private download and new quote/order creation must
not reactivate the claimed file. Hold/order state and the operational lease are
rechecked under lifecycle/request/order/file locks before removal. A confirmed
storage delete is followed by a final lease check, a `DELETED` tombstone and
completion audit in one DB transaction. Unknown storage results or a rollback
after an external effect retain the pending claim; retry uses the same key.
Record retention is unchanged. File-specific holds require Owner, remain until
explicit release, and signal overdue review without expiring automatically.

Privacy case hold IDs are snapshotted on the file before permanent account
erasure removes the Customer foreign keys. Owner case actions propagate/release
only the matching hold ID; receipt cleanup cannot silently release a binary
hold. Multiple holds, detached accounts and missing receipts remain protected
without reconnecting Customer history. An orphaned hold requires explicit Owner
review/release and is visible in monitoring. Existing detached history is not
reconstructed by email matching; any imported legacy data requires review before
hosted execution.

See the [operational runbook](batch-2-operations.md#retensi-binary-customer--t08-19-oktober-2026)
for HTTP/CLI batch limits, scan cursor, safe monitoring, resource grants and
rollback boundaries. Local database/storage-fixture proof does not activate R2
or a hosted scheduler.

## Closure decisions

`OPEN-PRICE-001` and `OPEN-PRICE-002` below are historical Phase 2 IDs, not
current open pricing decisions. Their policies were closed for local
implementation by [the Phase 3 Pricing v1 addendum](phase-3-pricing-biteship-contract.md);
an approved active rule is still required before calculation or activation.

| ID | Decision | Current effect |
| --- | --- | --- |
| CLOSED-ARC-001 | Reservation/payment expiry and late settlement | Retail is 30 minutes; custom payment is 24 hours; late settlement never reopens a cancelled order and requires full refund handling. |
| CLOSED-ARC-002 | Quote expiry/acceptance window | Seven days from `SENT`; draft time does not reduce the window. |
| CLOSED-ARC-003 | Cancellation/refund | Unpaid cancellation is allowed; paid cancellation/refund is Owner-only, full, and unavailable through generic status mutation. Partial refund is outside MVP. |
| CLOSED-ARC-004 | Custom request/order ownership | Revalidated acceptance atomically approves the request and creates the payable custom order. |
| CLOSED-ARC-005 | Admin permission matrix | Routine operations are OWNER/ADMIN; finance, role, pricing activation, and policy mutations are OWNER-only. |
| OPEN-PRICE-001 (historical; CLOSED by Phase 3) | 1–49 g pricing | No 50 g minimum; calculation still fails closed without an approved active rule. |
| OPEN-PRICE-002 (historical; CLOSED by Phase 3) | Communal ABS pricing | PLA Rp500/g and ABS Rp700/g are material-only; calculation still fails closed without an approved active rule. |
| CLOSED-FILE-001 | Maximum custom-file size and retention | 100 MiB per file; 14/60/90-day lifecycle schedule with legal-hold exception. |

## Verification and database safety

The transition, token, and service tests run without a database. A guarded local
PostgreSQL 18 database named `niuva_test` now supplies `TEST_DATABASE_URL` for
migration smoke, deterministic cleanup, and concurrent reservation integration
tests. It is isolated from `DATABASE_URL` and production/provider activation.
