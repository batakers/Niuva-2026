# Phase 1 Core Domain and Persistence Contract

> Historical Phase 1 boundary: the OPEN lifecycle/file rows below were closed
> by `phase-2-closure-decisions.md` on 2026-09-05. The two Pricing v1 rate
> conflicts were later closed by `phase-3-pricing-biteship-contract.md` on the
> same date. Publication and technical-record retention rows remain open unless
> one of those decision records says otherwise.

## Confirmed implementation boundary

- Clerk authenticates only Owner/Admin users. Customer checkout stays guest.
- `AdminProfile` is the product authorization record. New profiles default to
  `is_active = false`; a valid Clerk identity without an active profile is
  denied by `requireAdmin`.
- `src/proxy.ts` is an optimistic Next 16 route filter for `/admin` and
  `/api/admin`. It is not authorization authority: a protected resource must
  call `requireAdmin` before it reads or mutates product data.
- Public catalog and portfolio repository queries filter to published content;
  product variants are additionally filtered to active records and checkout
  candidates require positive on-hand stock.
- Orders retain product/quote line snapshots and money totals. The initial
  migration rejects mutations of committed commercial fields, order items,
  selected shipping-rate snapshots, and the fixed fields of payment attempts.
- A `SENT` custom quote preserves its commercial snapshot. Corrections require
  a new `(request_id, version)` record.
- Money fields use PostgreSQL `DECIMAL`; calculation code accepts only string
  or Decimal input and applies `HALF_UP` once to the final total.
- Stored customer files use a random storage key, private/public scope, a
  technical upload state, soft deletion, and domain ownership links. Deferred
  database checks reject a verified file without exactly one B2B or custom
  request owner.
- Inquiry validation matches the PRD's required brief fields. A submission
  needs either one or more private file IDs or a reference link; company,
  budget range, and preferred service remain optional.
- Payment event and shipping snapshot helpers persist shallow allowlisted
  provider data rather than opaque raw payloads. Audit metadata is similarly
  allowlisted.
- Idempotency records are scoped by `(scope, idempotency_key)` and bind a
  request hash. A matching completed record replays its stored safe response;
  any hash mismatch or unfinished record returns a deterministic conflict.

## Candidate representation requiring review before API/UI use

| Candidate | Current representation | Why it is not final authority |
| --- | --- | --- |
| Shipment state | `PENDING`, `SHIPPED`, `DELIVERED`, `EXCEPTION` | The technical design requires a shipment status but does not define its carrier-level lifecycle. Order lifecycle remains the source of public fulfillment state. |
| Pricing-rule administration | `DRAFT`, `ACTIVE`, `RETIRED` | This is a persistence control for rule versions, not an owner-approved pricing policy or permission matrix. |
| Idempotency failure behavior | `IN_PROGRESS`, `COMPLETED`, `FAILED`; expired records conflict until explicit cleanup | Retention and retry semantics must be set per operation before automated cleanup or retries exist. |
| Quantity semantics | Explicit `PER_UNIT` or `AGGREGATE` calculator input | The calculator never chooses whether tier bands are applied per item or aggregate; an active rule must provide this fact. |

## Open decisions preserved as blockers

| ID | Decision | Effect in Phase 1 |
| --- | --- | --- |
| OPEN-ARC-001 | Reservation TTL, payment expiry, late settlement | No checkout expiry/release worker or late-payment reconciliation is implemented. |
| OPEN-ARC-002 | Quote expiry/acceptance window and SLA | `expires_at` is nullable with no default; no quote-send/accept route is implemented. |
| OPEN-ARC-003 | Cancellation, refund, and post-shipment exceptions | Persistence can record documented statuses only; no reversing service is exposed. |
| OPEN-ARC-004 | Custom-request to custom-order hand-off | Request, quote, and order entities remain linked by immutable quote/order items, but no hand-off flow is activated. |
| OPEN-ARC-005 | Admin provisioning method and permission matrix | The generic active `OWNER`/`ADMIN` guard exists; no role-specific mutation policy is inferred. |
| OPEN-FILE-001 | `CUSTOM_FILE_MAX_BYTES` and retention period | Storage schema exists, but upload capability/cleanup job remain disabled. |
| OPEN-AUD-001 | Audit/idempotency technical-record retention | No deletion, cleanup, or retention schedule is assumed. |
| OPEN-PORT-001 | Client/logo publication permission and factual launch dataset | Public repositories filter safely, but no seed/publication is added. |

## Pricing decisions closed after Phase 1

| Historical ID | Closed policy | Preserved control |
| --- | --- | --- |
| OPEN-PRICE-001 | No 50 g minimum; progressive tier begins at the first billed gram. | The active `PricingRuleVersion` must pass the exact Pricing v1 definition validation. |
| OPEN-PRICE-002 | Communal PLA is Rp500/g and communal ABS is Rp700/g; both are material-only. | `quantitySemantics` remains explicit and no client input can choose a policy. |

See `phase-3-pricing-biteship-contract.md` for the owner decision, source
conflict, and activation boundary.

## Migration handling

`20260904090000_core_domain_persistence` is an initial, offline-generated
PostgreSQL migration with reviewed SQL constraints and triggers. It has not
been applied to any database. Apply it only to a dedicated development/test
database first, inspect the resulting schema, then run integration tests with
`TEST_DATABASE_URL`; never use a production URL for this step.

## Dependency advisory follow-up

The Phase 1 `pnpm audit --prod` run reports six transitive findings (three
high, three moderate) below the pinned Prisma 7.10.0 toolchain: `lodash`
through Prisma Studio, `deepmerge-ts` through Prisma config, and `mysql2`
through Prisma CLI. The application uses PostgreSQL, not MySQL, but this is
not treated as a waiver. The affected versions are exact upstream Prisma
dependencies, so no unreviewed major transitive override was applied. Recheck
against the next stable Prisma release before deployment and either upgrade
after compatibility verification or record an explicit risk acceptance.
