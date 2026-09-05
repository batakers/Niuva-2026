# Canonical Lifecycle Ownership

## Authority and scope

This contract records the current product and technical authority without
inventing unresolved commercial policy. It is the design prerequisite for
database schema, state-machine tests, payment webhooks, and operator tooling.

## State owners

| Aggregate | Sole authority | What may change it | Invariants |
| --- | --- | --- | --- |
| Project brief / inquiry | `Inquiry` domain service | Validated public submission, then authorised operator action | A submitted brief receives a human reference; attachments are references, never public file URLs. |
| Customer file | `StoredFile` domain service | Upload-intent/confirmation flow and authorised operator review | Technical file lifecycle is independent of commercial quote/order lifecycle; private storage access is short-lived. |
| Custom-print request | `CustomPrintRequest` domain service | Validated intake and operator review | Geometry/slicer output is review evidence, not an automatic final price. |
| Custom-print quote | `CustomPrintQuote` domain service | Authorised operator sends, replaces, expires, or records acceptance | A quote becomes immutable at `SENT`; correction creates a new version. |
| Order | `Order` domain service | Authoritative checkout/accepted-and-revalidated quote, verified payment, authorised fulfillment action | Order lines, totals, shipping choice, and quote references are snapshots after commitment. |
| Payment attempt and event | `Payment` domain service | Server creates attempt; verified idempotent provider notification records event and applies transition | Browser callback never changes `PAID`; every provider delivery is an immutable event record. |
| Stock reservation | `Inventory` domain service | Transactional checkout, verified payment, expiry/authorised cancellation | Availability is computed from on-hand stock minus active reservation; expired reservation is inactive even before cleanup. |
| Shipment | `Shipment` domain service | Authorised fulfillment integration/operator action | Selected rate and final package measurement are snapshots; custom shipment is not priced before measurement. |

## Confirmed retail order transitions

```text
PENDING_PAYMENT --verified payment--> PAID --> PROCESSING --> READY_TO_SHIP
PENDING_PAYMENT --expiry / authorised cancellation--> CANCELLED
READY_TO_SHIP --> SHIPPED --> COMPLETED
```

No browser callback, duplicate webhook, stale job, or customer request may
skip, reverse, or rewrite a committed transition. A future transition service
must reject every edge that is not explicitly listed and emit an audit event.

## Confirmed custom-print ownership model

The request owns intake and operator review, the quote owns the immutable offer,
and the order owns fulfilment after quote acceptance:

```text
CustomPrintRequest: SUBMITTED -> UNDER_REVIEW -> QUOTE_READY -> QUOTE_SENT
CustomPrintQuote:   DRAFT -> SENT -> ACCEPTED | DECLINED | EXPIRED
Custom order:       WAITING_PAYMENT -> PAID -> IN_PRODUCTION -> FINISHING_QC
                    -> WAITING_SHIPPING_PAYMENT -> READY_TO_SHIP -> SHIPPED
                    -> COMPLETED
```

Only an accepted quote that is revalidated by the server may atomically approve
the request and create a payable order. The approved TTL, cancellation, refund,
retention, and role rules are recorded in `phase-2-closure-decisions.md`.

## Transition table for implementation reviews

| From | To | Authority | Preconditions | Must reject |
| --- | --- | --- | --- | --- |
| `PENDING_PAYMENT` | `PAID` | Verified payment webhook handler via Payment service | Signature, amount, provider reference, idempotency, and current order state verify in one transaction | Browser success callback, duplicate event, amount mismatch, invalid signature |
| `PENDING_PAYMENT` | `CANCELLED` | Order/Inventory expiry or authorised cancellation service | Expiry/cancellation policy and reservation outcome are known | Late provider callback without reconciliation policy |
| `PAID` | `PROCESSING` | Authorised operator fulfillment service | Paid snapshot is intact | Unpaid/manual public request |
| `PROCESSING` | `READY_TO_SHIP` | Authorised operator fulfillment service | Required production/QC checkpoint complete | Skipping required QC checkpoint |
| `READY_TO_SHIP` | `SHIPPED` | Shipment service | Shipping label/tracking snapshot available | Browser-provided shipping update |
| `SHIPPED` | `COMPLETED` | Authorised fulfillment service | Delivery completion evidence/policy | Automatic reversal without an approved exception flow |
| `DRAFT` quote | `SENT` | Authorised operator quote service | Deterministic price snapshot, expiry, and recipient token generated | Mutable quote content after send |
| `SENT` quote | `ACCEPTED` | Quote service | Within approved expiry and server revalidation passes | Expired, superseded, or stale-price acceptance |

## Closure status

| ID | OPEN decision | Blocks |
| --- | --- | --- |
| CLOSED-ARC-001 | Retail reservation/payment 30 minutes; custom payments 24 hours; late settlement requires full refund without reopening the order | Provider adapters and expiry worker must use persisted deadlines. |
| CLOSED-ARC-002 | Quote validity is 7 days from `SENT` | `sent_at` and `expires_at` are frozen together. |
| CLOSED-ARC-003 | Unpaid cancellation is allowed; paid cancellation/refund is Owner-only and full; no partial refund or post-processing reversal in MVP | Paid cancellation remains unavailable until the dedicated refund workflow verifies completion. |
| CLOSED-ARC-004 | Quote acceptance atomically approves the request and creates the custom order | Request, quote, and order each retain one state authority. |
| CLOSED-ARC-005 | Explicit OWNER/ADMIN least-privilege matrix | Every service-side admin mutation checks a named permission. |

The closure values are versioned and must not be changed retroactively.
