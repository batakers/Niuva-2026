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
Retail orders are rejected by this path.

## Closure decisions

| ID | Decision | Current effect |
| --- | --- | --- |
| CLOSED-ARC-001 | Reservation/payment expiry and late settlement | Retail is 30 minutes; custom payment is 24 hours; late settlement never reopens a cancelled order and requires full refund handling. |
| CLOSED-ARC-002 | Quote expiry/acceptance window | Seven days from `SENT`; draft time does not reduce the window. |
| CLOSED-ARC-003 | Cancellation/refund | Unpaid cancellation is allowed; paid cancellation/refund is Owner-only, full, and unavailable through generic status mutation. Partial refund is outside MVP. |
| CLOSED-ARC-004 | Custom request/order ownership | Revalidated acceptance atomically approves the request and creates the payable custom order. |
| CLOSED-ARC-005 | Admin permission matrix | Routine operations are OWNER/ADMIN; finance, role, pricing activation, and policy mutations are OWNER-only. |
| OPEN-PRICE-001 | 1–49 g pricing | Calculation fails closed unless the caller supplies an approved rule policy. |
| OPEN-PRICE-002 | Communal ABS pricing | Calculation fails closed; no communal pricing is invented. |
| CLOSED-FILE-001 | Maximum custom-file size and retention | 100 MiB per file; 14/60/90-day lifecycle schedule with legal-hold exception. |

## Verification and database safety

The transition, token, and service tests run without a database. A guarded local
PostgreSQL 18 database named `niuva_test` now supplies `TEST_DATABASE_URL` for
migration smoke, deterministic cleanup, and concurrent reservation integration
tests. It is isolated from `DATABASE_URL` and production/provider activation.
