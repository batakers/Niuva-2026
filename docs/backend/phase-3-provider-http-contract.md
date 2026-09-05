# Phase 3 Provider and HTTP Contract

Status: **implemented for local/test and provider sandbox only**. No provider
credential, production endpoint, webhook URL, callback domain, or live send
was configured or activated by this work.

## HTTP boundaries

| Route | Boundary | Behaviour |
| --- | --- | --- |
| `POST /api/project-brief` | public mutation | Same-origin JSON, 32 KiB maximum, five requests/minute per app origin, Zod service validation, correlation ID. Returns only the public reference and access token. |
| `POST /api/custom-print/requests` | public mutation | Same-origin JSON, 32 KiB maximum, five requests/minute per app origin, Zod service validation, correlation ID. Returns only the public reference and access token. |
| `POST /api/uploads/intents` | private-upload intent | Same-origin JSON, 4 KiB maximum, ten requests/minute per app origin. Fails with `503` before a database write if the reviewed R2 capability is absent. |
| `POST /api/uploads/confirm` | private-upload confirmation | Same-origin JSON, 4 KiB maximum, twenty requests/minute per app origin. Requires the short-lived upload capability token. |
| `POST /api/shipping/rates` | retail shipping rate | Same-origin JSON, 8 KiB maximum, ten requests/minute per app origin. Reloads server-owned package facts, returns only normalized public options, and rejects an unavailable sandbox Biteship capability before a database write. |
| `POST /api/checkout` | retail checkout composition | Same-origin JSON, 16 KiB maximum, five requests/minute per app origin. Re-fetches the selected Biteship option server-side, then delegates the authoritative transaction to `CheckoutService`; browser shipping totals are ignored. |
| `POST /api/webhooks/midtrans` | provider notification | Bounded 64 KiB JSON, no browser-origin check, then schema/signature verification before any persistence. Duplicate notifications return a successful acknowledgement. |

The in-memory rate limiter deliberately does not trust forwarded IP headers.
It is a single-instance baseline, not a distributed anti-abuse service.

## Private R2 upload lifecycle

1. The server accepts only a reviewed 100 MiB maximum and an explicit
   extension/MIME pair (`.stl`, `.3mf`, `.obj`, `.step`/`.stp`).
2. It persists a `PENDING` row with random object key and a SHA-256 hash of a
   256-bit, entity-bound `FILE_UPLOAD` capability. The raw token and signed URL
   are returned once to the browser but are not persisted, audited, or logged.
3. The R2 adapter creates a content-type-bound signed PUT URL valid for ten
   minutes. It is available only when the complete R2 group and the approved
   upload-limit value are present in a non-production runtime.
4. Confirmation verifies capability expiry/hash and R2 HEAD metadata (exact
   size and MIME). A missing or mismatched object becomes `REJECTED` and is
   best-effort deleted.
5. A technically valid object becomes `UPLOADED`, not `VERIFIED`. The B2B or
   custom-print create transaction first creates its sole domain ownership link,
   then changes it to `VERIFIED`. This removes the earlier impossible state
   where verification required an owner but a service required verification
   before it could attach one.

`20260905093000_upload_capability_tokens` adds the nullable capability fields
and expiry index. `20260905103000_fix_stored_file_ownership_trigger` repairs a
deferred trigger in the original migration without rewriting that historical
migration: `stored_files` uses `id`, while ownership link tables use `file_id`.

## Midtrans sandbox boundary

- `MidtransSnapGateway` accepts only integer rupiah amounts and a constrained
  provider order reference. It sends only to the sandbox Snap endpoint while
  `MIDTRANS_IS_PRODUCTION=false` and `NODE_ENV` is not production.
- The server uses the persisted payment deadline. The Snap expiry duration is
  rounded down to minutes, so it cannot extend the 30-minute retail policy.
- Custom-shipping payment retries reuse a still-pending attempt's provider
  reference and stored token/redirect when available. Expired or failed
  attempts are immutable; a new retry receives a new provider reference.
- Webhooks validate schema and the classic SHA-512 signature, fingerprint the
  provider state, store only minimized scalar payload data, and serialise the
  payment attempt/order rows before applying a transition.
- A valid settlement changes an active, in-deadline retail order exactly once:
  attempt `PENDING → SETTLED`, order `PENDING_PAYMENT → PAID`, and active
  reservations `ACTIVE → CONSUMED` with stock decrement in one transaction.
- An expired settlement expires/cancels the payable order, releases any retail
  reservations, records `LATE_SETTLEMENT_REFUND_REQUIRED`, and never reopens
  the order or consumes released stock. Amount/signature failures never mutate
  payment/order state.

## Resend boundary

Inquiry and custom-print notifications are scheduled only after their database
transaction has committed. The adapter sends a minimal admin notice with a
scoped idempotency key; it includes no private object URL. A send failure is
audited as best effort and never turns the committed request into a failed
submission. Resend is also non-production-only in this slice.

## Verification and remaining provider gates

The local test database applies all three migrations and verifies upload
ownership, settled-webhook idempotency, stock consumption, and late-settlement
cancellation. Backend unit tests cover token hashing/expiry, metadata spoofing,
route boundaries, sandbox refusal, signature validation, email idempotency,
provider error mapping, Biteship normalization/timeout boundaries, catalog
fingerprinting, and shipping response redaction.

The production dependency audit still reports six pre-existing transitive
Prisma CLI advisories (three high, three moderate). The reviewed AWS SDK
addition has no reported advisory. No lockfile override or Prisma 8 release
candidate upgrade was applied while those remediation paths remain unreviewed.

Still deliberately outside this slice:

- Biteship live onboarding, Maps/Area-ID resolution, shipment-order/label and
  tracking integration;
- live Midtrans/R2/Resend onboarding, domain/callback registration, CSP origin
  additions, and production activation;
- binary magic/structural inspection, including 3MF ZIP safety, before an
  uploaded model is made available to an operator;
- authenticated short-lived private-file download and scheduled retention
  cleanup; and
- a distributed rate limiter if traffic exceeds the single-instance baseline.

Those are not silently enabled by an environment value or browser callback.
