# Spec: Action Queue

Status: **OWNER_APPROVED** on 2026-09-10. Module ID: `action-queue`.

This document specifies the next module in the approved admin rebuild sequence:
`admin-access` → `action-queue` → `admin-operations`. It is a specification
only. It does not authorize source changes, database changes, Clerk provisioning,
provider changes, a commit, or a push.

## Objective

Turn the authenticated `/admin` entry point into a real, read-only operational
home for an Owner or Admin with an active Niuva `AdminProfile`.

The page must derive its items from current server-owned domain records, state
the next operational step in plain Indonesian, and never revive the retired
development fixture preview. It is an Action Queue, not a raw database table,
metrics dashboard, or an admin-mutation surface.

## Product and technical basis

- The PRD names the Action Queue as the Admin home and gives these examples:
  custom print waiting review, quote not sent, paid order waiting processing,
  custom order waiting package measurement, and payment/shipping exception.
- The Tech Design says Admin home starts with Action Queue, not a raw database
  table.
- The approved capability map defines this module as a read-only,
  server-owned projection of operational work that needs attention, dependent
  on the real `admin-access` boundary and domain repositories.
- The implemented `admin-access` boundary already fails closed when Clerk or
  the database capability is unavailable, and only admits an active Owner or
  Admin profile.

## Assumptions captured for review

These assumptions guide this draft; they are not silently promoted to product
decisions.

1. The first real slice is read-only. It explains the next action but exposes
   no mutation, no local state progression, and no link to a detail route that
   does not yet have a server-backed implementation.
2. Both active Owner and active Admin profiles may read the queue. No new role
   or permission policy is introduced by this read-only module.
3. The initial UI shows safe operational references and timestamps only. It
   does not show customer name, email, phone, address, uploaded-file metadata,
   internal notes, payment amount, provider transaction identifiers, or raw
   provider JSON.
4. The projection is queried and sorted on the server. The browser never
   supplies a role, status, priority, reference, price, or queue item as an
   authority.
5. Existing domain models are sufficient for the initial read projection.
   This slice introduces no schema migration, provider integration, dependency,
   Clerk configuration, or profile provisioning.

## Confirmed functional scope

After the existing `requireAdmin()` check succeeds, `/admin` will request a
safe server projection and render one row per live operational signal.

| Queue signal | Server source | Customer-facing data excluded | Intended operator wording |
| --- | --- | --- | --- |
| New project brief | `B2BInquiry.status = NEW` | name, email, phone, company, files, private brief content | “Tinjau brief proyek baru” |
| Custom print needs review | `CustomPrintRequest.status = SUBMITTED` | customer identity, file metadata, private file access | “Mulai review custom print” |
| Quote needs preparation | `CustomPrintRequest.status = QUOTE_READY` with no current draft quote | customer identity, slicer detail, pricing inputs | “Siapkan quote” |
| Quote needs sending | `CustomPrintQuote.status = DRAFT` | quote price/breakdown, customer identity, token | “Kirim quote” |
| Paid order needs processing | `Order.status = PAID` | customer/address data, payment amount/provider data | “Proses pesanan berbayar” |
| Custom package needs measurement | `Order.orderType = CUSTOM_PRINT` and `Order.status = FINISHING_QC` | customer/address data, package dimensions, provider rate | “Ukur paket final untuk pengiriman” |
| Shipping exception | `Shipment.status = EXCEPTION` | address, tracking/provider detail unless a later detail module authorizes it | “Tinjau exception pengiriman” |

The queue may show a safe server-generated reference appropriate to the
record, such as an inquiry reference, request reference, quote number, or order
number. It must not expose internal UUIDs as the primary operator reference.

The `QUOTE_READY` and `DRAFT` rows intentionally describe different work.
A request ready for quotation has no current draft yet; a draft quote is ready
to be sent. The implementation must prevent those two conditions from yielding
duplicate work for the same quote workflow.

## Payment exception: blocked decision

**BLOCKED_DECISION — payment-exception closure policy**

The product requires payment exception visibility. The current payment event
store records outcomes such as amount mismatch, unknown payment,
provider-transaction conflict, invalid settlement status, late settlement
requiring refund, and partial-refund exception. However, it does not yet carry
a general, server-authoritative marker that says a human has resolved or
acknowledged an exception.

Showing every historic exception indefinitely would make a resolved incident
look active. Hiding one based on a guessed status would be equally unsafe.

Therefore the first implementation must either:

1. receive an approved, server-owned rule for identifying an open payment
   exception and its resolution; or
2. leave payment exceptions out of the live projection until the later
   `admin-operations` module establishes that lifecycle.

No browser-local “done” flag, fixture, inferred timeout, or silent policy is
allowed. Shipping exceptions are different because `Shipment.status` already
has a current `EXCEPTION` state.

## Candidate projection contract

The following is a candidate code contract for the implementation plan. The
field names may change if the approved plan improves them, but the privacy and
server-authority boundary may not weaken.

```ts
export type ActionQueueItem = Readonly<{
  id: string; // opaque, server-generated queue identity; not a displayed UUID
  reference: string;
  kind:
    | "B2B_INQUIRY"
    | "CUSTOM_PRINT_REVIEW"
    | "QUOTE_PREPARATION"
    | "QUOTE_SEND"
    | "ORDER_PROCESSING"
    | "PACKAGE_MEASUREMENT"
    | "SHIPPING_EXCEPTION"
    | "PAYMENT_EXCEPTION";
  title: string;
  nextAction: string;
  attention: "STANDARD" | "EXCEPTION";
  sourceUpdatedAt: Date;
}>;

export type ActionQueueResult = Readonly<{
  generatedAt: Date;
  items: readonly ActionQueueItem[];
}>;
```

The first projection must use one stable de-duplication key per source signal:
`kind + entity id`. It may keep distinct signals for the same order only when
they represent genuinely distinct next actions. It must query the minimum
fields needed to create the safe projection and never select provider JSON,
address, customer contact, file, or payment details for list rendering.

## Candidate ordering and presentation

The initial candidate order is:

1. current shipping exceptions;
2. remaining operational items from oldest source update to newest;
3. a bounded initial page of at most 50 items.

This is a proposed default, not an approved SLA or severity policy. The UI
must show the queue’s server generation time and a plain-language empty state
when there is no work. It must not invent a “stale” state without an actual
cache or data-age contract.

Each row needs a textual next-action label and a textual exception state where
applicable; color alone must not communicate meaning. The first slice has no
buttons, optimistic updates, local filters, or fake navigation. Those become
separate work after the relevant server-backed detail and mutation module is
specified.

## Proposed architecture

```text
/admin Server Component
  -> requireAdmin()                         existing real Clerk + AdminProfile boundary
  -> ActionQueueService.list()
  -> ActionQueueRepository.listSignals()   minimal Prisma selects, read-only
  -> safe ActionQueueItem mapping
  -> ActionQueueView                       accessible server-rendered UI
```

Candidate file placement:

```text
src/modules/admin/action-queue.ts             queue types and pure mapping
src/modules/admin/action-queue-repository.ts  read-only, minimal Prisma queries
src/modules/admin/action-queue-service.ts     orchestration and de-duplication
src/app/admin/page.tsx                        keeps requireAdmin() before queue access
src/app/admin/action-queue-view.tsx           safe presentation states
tests/backend/admin-action-queue.test.ts      source/mapping/access-boundary cases
tests/unit/admin-action-queue-view.test.tsx   semantic presentation states
tests/e2e/admin-action-queue.spec.ts          route fail-closed and no-fixture smoke
```

No client component may call Prisma, query private records directly, set queue
priority, or turn a row into an action. No new API route is needed for this
read-only first slice.

## Required states and edge cases

| Situation | Required result |
| --- | --- |
| Clerk/database capability unavailable, unauthenticated user, or inactive/non-admin profile | Preserve the existing safe access-unavailable result; render no queue data. |
| Authorized profile with no matching signals | Render a genuine empty queue; never substitute example rows. |
| Authorized profile with signals | Render only the safe projection, with textual next-action context. |
| Unexpected repository/service failure | Render a safe recovery state without leaking record, provider, or database details. |
| A source status changes while the operator views the page | The next refresh derives a new server state. A future mutation must revalidate its own preconditions; this read-only queue makes no transition. |
| Quote-ready request already has a draft quote | Avoid a second “prepare quote” item; retain the more specific “send quote” item. |
| Historic payment exception lacks a closure signal | Do not guess that it is open or resolved; follow the blocked decision above. |

## Boundaries

Always:

- Call the existing server-side `requireAdmin()` before retrieving the
  projection.
- Keep business selection/mapping in the admin domain service and database
  access in a repository.
- Use current, server-owned statuses and safe references only.
- Preserve accessible text, keyboard focus, responsive reading order, and
  reduced-motion behavior when the view is later implemented.

Ask first:

- Adding or changing a database schema, migration, index, dependency, Clerk
  configuration, AdminProfile provisioning policy, provider behavior, or
  payment-resolution lifecycle.
- Adding a row action, detail route, link, filter, pagination control, or
  cached/live-refresh policy.
- Applying an unapproved visual-system propagation or making a visual
  acceptance claim.

Never:

- Reintroduce development preview fixtures, fake logins, query-string roles,
  client-owned queue state, or local-only “resolved” transitions.
- Render raw database rows, customer contact/address data, private upload
  information, payment amounts, payment payloads, or provider identifiers.
- Treat a Clerk session by itself as authorization, or create an AdminProfile
  as a fallback.

## Verification plan

The implementation plan must cover:

- focused backend tests for every selected source signal, de-duplication,
  field redaction, empty result, and fail-closed access behavior;
- a unit test for populated, empty, and safe-error presentation states,
  including textual labels for exceptions and no fixture copy;
- a browser smoke test proving that an environment without Clerk does not
  reveal queue data or legacy preview text;
- a manual non-production smoke after an Owner provisions a real active
  AdminProfile under separately approved access to that tenant;
- the repository gates:

```text
corepack pnpm test:backend -- tests/backend/admin-action-queue.test.ts
corepack pnpm exec vitest run tests/unit/admin-action-queue-view.test.tsx
corepack pnpm exec playwright test tests/e2e/admin-action-queue.spec.ts --workers=1
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
git diff --check
```

Current environment note: the standard `corepack pnpm build` gate is already
blocked before application compilation because `prisma.config.ts` imports
`dotenv/config` while the root dependency is absent. That unrelated blocker
must be diagnosed and approved separately; this Action Queue specification does
not authorize a workaround.

## Acceptance criteria

1. An active, authenticated Owner or Admin can see only live,
   server-derived Action Queue items after the existing access gate succeeds.
2. The queue is recognizably an operational work list, not a raw table or a
   decorative metrics dashboard.
3. Every included row maps to an explicitly approved current source condition,
   has one textual next action, and carries no disallowed private/provider data.
4. Empty, unavailable, and unexpected-error states are genuine and safe; no
   fixture or client fallback is used.
5. Quote preparation and quote sending do not create duplicate work for the
   same current quote workflow.
6. Payment exception rows are implemented only after the blocked
   payment-exception closure decision is resolved.
7. This module adds no mutation, provisioning, schema migration, provider
   activation, dependency, commit, or push without separate approval.

## Owner decisions needed before an implementation plan

| Decision | Candidate recommendation | Status |
| --- | --- | --- |
| Payment exception lifecycle | Do not render payment-event exceptions until a server-authoritative open/resolved rule exists. | BLOCKED_DECISION |
| Default ordering | Shipping exception first, then oldest outstanding work. | CANDIDATE |
| Initial list size | At most 50 items, with no filter or pagination UI in the first slice. | CANDIDATE |
| Row hand-off | Show context only; add real detail/action links later with their own server-backed modules. | CANDIDATE |
| Stock exception | Keep out of this first slice until its stock threshold/policy is explicitly specified. | OPEN |
| Visual acceptance | Treat technical rendering and owner visual approval as separate gates. | OPEN |

## Review outcome

Owner approved this specification on 2026-09-10. The implementation plan may
carry forward the recommended defaults: defer payment-event rows until an
open/resolved lifecycle exists, keep stock exceptions out of the first slice,
use server ordering with a bounded list, and keep the first slice read-only
without detail or mutation hand-off. Visual acceptance remains a separate gate.
