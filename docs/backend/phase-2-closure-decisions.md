# Phase 2 Closure Decisions

Status: **APPROVED for the Niuva MVP baseline on 2026-09-05**.

These values close the Phase 2 operational blockers. They are versioned product
policy, not provider defaults. A future change must create a new reviewed
policy version and must not reinterpret existing orders, payments, quotes, or
files retroactively.

## Commercial lifecycle

| Decision | Approved MVP policy | Operational consequence |
| --- | --- | --- |
| Retail stock reservation | 30 minutes from authoritative checkout creation | The Midtrans transaction expiry must be configured to the same 30-minute window. Expired reservations are ignored immediately and released idempotently by cleanup. |
| Retail payment | 30 minutes | A browser return never extends the deadline. Only a verified provider event received for a still-payable order may settle it. |
| Custom-order and custom-shipping payment | 24 hours | These payments do not hold retail stock. A new attempt requires a new provider reference; an expired attempt is immutable. |
| Quote validity | 7 calendar days from `SENT` | Draft age does not consume the acceptance window. Sending atomically issues the public token and freezes `sent_at` plus `expires_at`; an expired or superseded quote cannot be accepted. |
| Late settlement | Keep the cancelled order cancelled and require a full-refund exception | The event is retained and audited. It must not consume released stock, reopen the order, or begin fulfilment automatically. |

Midtrans supports explicit Snap/payment expiry, but payment-channel timing may
still differ. The server-owned deadline and verified webhook remain the Niuva
authority. Provider adapters must compare the provider expiry returned by
Midtrans with the persisted `payment_attempts.expires_at`.

## Cancellation and refund

| Case | Who may initiate | Result |
| --- | --- | --- |
| Retail `PENDING_PAYMENT` | Customer with valid order token, active Admin/Owner, or system expiry job | Cancel order and release active reservations; no refund. |
| Custom `WAITING_PAYMENT` | Customer with valid order token, active Admin/Owner, or system expiry job | Cancel payable order; no refund. |
| Paid order before processing/production | Owner only | Full refund must be confirmed by the payment workflow before order cancellation. Generic status mutation remains fail-closed. |
| Processing, production, shipped, or completed order | No standard MVP cancellation | Create an audited operational exception; do not force a reverse state transition. |
| Partial refund | Nobody in MVP | Not supported. Resolve through a later finance-policy version if the business adopts it. |

Provider cancellation is for a still-pending payment. A settled payment uses a
full refund when the method supports it; otherwise Owner records an audited
manual refund. No customer-facing route may claim success before the provider
or manual refund is confirmed.

## Private customer files

- Maximum size: **100 MiB (104,857,600 bytes) per file**.
- Abandoned `PENDING`, `REJECTED`, or unattached upload: delete after **14 days**.
- Cancelled, declined, or unpaid custom request/quote file: delete after **60 days**.
- File attached to a completed custom order: delete after **90 days** from
  completion.
- A legal hold, active dispute, or active order pauses deletion. Financial,
  order, audit, and provider records are outside this binary-file retention
  schedule and follow a separately approved accounting/legal policy.
- Deletion means object removal from private storage followed by a tombstoned
  `DELETED` database state; cleanup must be idempotent and auditable.

## Admin permission matrix

All roles require a valid Clerk session and an active `AdminProfile`. The app
database, not Clerk client claims, owns the role.

| Capability | `OWNER` | `ADMIN` |
| --- | :---: | :---: |
| Inquiry handling, custom-print review, quote operations | Yes | Yes |
| Catalog/product changes and stock adjustment | Yes | Yes |
| Normal order fulfilment and shipping operations | Yes | Yes |
| Audit and payment/shipping exception visibility | Yes | Yes |
| Cancel pending payments | Yes | Yes |
| Cancel a paid order / approve full refund | Yes | No |
| Activate pricing rules | Yes | No |
| Provision/deactivate admin profiles | Yes | No |
| Change system/commercial policy | Yes | No |

Bootstrap policy: the first Owner is provisioned once using an exact Clerk user
ID through a guarded operational procedure. Subsequent profiles are managed by
an active Owner. Self-provisioning, role values from the browser, and automatic
promotion from a valid Clerk account are forbidden.

## Dedicated integration database

The local closure database is PostgreSQL 18 at loopback port `55432`, database
`niuva_test`, with its data directory under ignored `.local/postgres-test`.
`.env.test.local` contains only its non-production connection URL and is
Git-ignored. The helper refuses non-loopback hosts, requires a separate `test`
marker, verifies the cluster data directory before use, and never resets or
drops a database.

Commands:

```text
corepack pnpm db:test:start
corepack pnpm db:test:migrate
corepack pnpm test:integration
corepack pnpm db:test:stop
```

The reviewed initial migration is applied only to this isolated database.
Production or shared Neon URLs are not substitutes.

## Deliberately unaffected decisions

The 1–49 g and communal ABS Pricing v1 decisions were closed separately by
`phase-3-pricing-biteship-contract.md`; quantity semantics remains an explicit
active-rule field. Client/logo publication, provider onboarding, and
legal/accounting record retention remain separate owner decisions. This closure
does not activate Midtrans, R2, Biteship, Resend, Clerk production, or
deployment credentials.
