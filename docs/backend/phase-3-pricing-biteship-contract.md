# Phase 3 Pricing Decision and Biteship Boundary

Status: **implemented for the local/test boundary on 2026-09-05**. This
addendum records the two historical Pricing v1 decisions explicitly approved
by the Owner in this implementation session. It does not alter historical PRD
or Tech Design text; it supersedes only the two corresponding OPEN rows below.

## Closed Pricing v1 decisions

| Historical blocker | Owner-approved MVP decision | Implementation consequence |
| --- | --- | --- |
| `OPEN-PRICE-001` — 1–49 g | There is **no 50 g minimum**. The first progressive material tier applies from the first billed gram. | A 1 g standard PLA calculation starts at Rp1,000; the calculator never coerces a slicer weight to 50 g. |
| `OPEN-PRICE-002` — communal ABS | Communal material uses **PLA Rp500/g** and **ABS Rp700/g**, with no Rp5,000/hour machine charge. | `COMMUNAL` calculates a material-only subtotal; a 50 g communal ABS quote is Rp35,000 before the final single `HALF_UP` rounding. |

The decision resolves an identified source conflict: Pricing v1 says no 50 g
minimum and Rp700/g for ABS, while the accompanying spreadsheet begins its
standard tiers at 50 g and contains a generic Rp500/g communal figure. Pricing
v1 is the applicable rule for operator-reviewed custom quotations.

Standard Niuva-stock material remains progressive (PLA Rp1,000/Rp900/Rp800;
ABS Rp1,200/Rp1,100/Rp1,000) plus Rp5,000 per print hour. Customer-owned
filament remains material-only at PLA Rp500/g and ABS Rp700/g. Money stays in
`Decimal`; only the final total is rounded `HALF_UP`.

### Deliberately not inferred

`quantitySemantics` remains a required field of every active pricing-rule
definition. It must explicitly be `PER_UNIT` or `AGGREGATE`; these two pricing
decisions do not choose one. The exported `CUSTOM_PRINT_V1_PER_UNIT_POLICY`
is a reference/test definition, not a runtime fallback or automatic database
activation.

At quote draft creation, the server reads the selected `ACTIVE`
`PricingRuleVersion`, verifies the exact `CUSTOM_PRINT_V1` v1 definition, and
freezes it into the immutable calculation snapshot. Browser input cannot
supply a policy. An Owner must still provision and activate the reviewed rule
record through the guarded operational path; no seed, production write, or
automatic activation was performed here.

## Biteship retail-rate boundary

`POST /api/shipping/rates` is a Node-only public-mutation boundary. It accepts
only destination area/postal data and variant IDs plus quantities. The service
reloads published, active catalog variants and derives name, SKU, price,
weight, and dimensions on the server. Missing or non-positive physical package
data fails closed rather than quoting an under-specified package.

The adapter sends a bounded request to `POST /v1/rates/couriers` using a
configured courier allow-list and origin area ID. Only a `biteship_test.` key
is accepted and production or `biteship_live.` configuration is rejected
before any outbound request. It applies a five-second timeout, accepts at most
64 KiB of provider JSON, keeps only courier/service/price/ETA fields, and
never returns an API key or raw provider payload to the browser.

The public rate response is advisory for five minutes. At
`POST /api/checkout`, the server re-queries Biteship using the selected opaque
option ID, then the checkout transaction re-locks the catalog and compares a
SHA-256 fingerprint of price, weight, dimensions, variant IDs, and quantities.
A catalog change requires rate selection again. No Biteship request occurs
inside the database transaction; only the minimized selected-rate snapshot is
persisted.

| Boundary | Maximum JSON body | In-memory public-mutation limit |
| --- | ---: | ---: |
| `POST /api/shipping/rates` | 8 KiB | 10 requests/minute per app origin |
| `POST /api/checkout` | 16 KiB | 5 requests/minute per app origin |

Postal-code lookup is intentionally supported as the thin initial boundary.
It has lower precision than Biteship Area ID lookup; an address/Maps resolution
surface is still needed before enabling instant-courier UX.

## Evidence and verification

- The Pricing v1 research source records no 50 g minimum, progressive standard
  pricing, and the PLA/ABS material-only rates.
- Biteship documents the Rates endpoint, its server-side authentication token
  prefixes, and the higher accuracy of Area ID compared with postal-code
  lookup.
- Backend tests exercise 1 g pricing, communal ABS, malformed active rules,
  Biteship request normalization, live-key refusal before fetch, missing
  package data, selected-rate revalidation, cross-origin refusal, and public
  response redaction.

## Remaining activation gates

- Provision an active Owner-approved `CUSTOM_PRINT_V1` rule with an explicit
  quantity semantic; add the Owner-only rule-administration route/UI before
  operational use.
- Configure only sandbox `BITESHIP_API_KEY`, `BITESHIP_COURIERS`, and
  `BITESHIP_ORIGIN_AREA_ID` in a non-production environment, then perform
  test transactions. No key is present in this worktree.
- Add Maps/Area ID resolution, Biteship order/label/tracking integration,
  verified carrier events, and a distributed rate limiter before scale/live
  operation.
- Checkout idempotency replay intentionally returns its stored safe order
  metadata. A token/redirect recovery flow is still required for a customer
  who loses the initial payment redirect.
