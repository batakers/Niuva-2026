# Niuva Design System Component Contracts

Status: **P0/P1 visual implementation approved for styleguide-only scope**
Foundation status: **Foundation visual proof approved for styleguide-only on
2026-09-03; global product-screen propagation remains separately blocked.**
Implementation status: **P0/P1 components are visually approved for the
styleguide; global product-screen propagation remains separately blocked.**

This document turns the UI Foundation into a controlled component boundary. The
owner approved the four P0 and four P1 contracts on 2026-08-28. The visual
implementation review was reopened on 2026-08-29 after feedback that repeated
uppercase and monospace treatment made the system feel generic. The owner then
approved Typography System v1.0 on 2026-08-29 without authorizing global-token,
shared-component, or product-screen propagation. The renewed P0/P1 visual gate
was approved for the styleguide on 2026-09-02. The revised Foundation visual
proof was approved for styleguide-only use on 2026-09-03. Motion System v1 and
the four Pattern proofs were also approved for styleguide-only usage on
2026-09-03.

## Architecture v1

### Public frontend batch FE-00–15 — 2026-09-06

Owner approved implementation of FE-00–15: `/`, `/services`, `/projects`,
`/projects/[slug]`, `/project-brief`, `/shop`, `/shop/[slug]`, `/cart`, and
`/checkout`, `/custom-print`, `/custom-print/request`, `/quote/[token]`, and `/orders/[token]`,
including a shared public shell.
This is scoped authorization to compose existing Foundation/Typography v1.0,
AuLogo, AuLink/Button, FormField/Input, FileUploadField and StatusNotice.
PublicNavigation/PublicShell are route-family compositions, not new tokens.
Use native select/textarea for brief controls; pass required to the control
explicitly because FormField's required flag currently labels only.
Project and Shop fixtures are development-only review surfaces. Brief submission
is frontend simulation only. No new auth/payment/provider authority is granted.
Screen visual acceptance remains pending owner review; styleguide approval
and existing checkout/admin/Creative/Decorative restrictions are unchanged.
This scoped authorization supersedes the older `/` + `/project-brief`-only
implementation restriction below, not its historical visual-review record.

| Screen | Composition | Primary review states |
| --- | --- | --- |
| Public shell/home | Existing fonts/tokens, AuLogo on dark surface, navigation | Mobile expanded/collapsed, active route, unavailable commerce |
| Services | Editorial sections, numbered service outcomes, AuLink | Four factual service categories and brief CTA |
| Projects/detail | Filterable list, media placeholder, narrative sections | Examples, empty, no results, loading, retry, missing slug |
| Project brief | FormField/Input/select/textarea, disabled upload, StatusNotice | Validation, pending, local success/error, provider unavailable |
| Shop | Category/search filters, two-column product grid, StatusNotice | Examples, available/out of stock, empty, no results, loading, retry |
| Product detail | Asymmetric gallery placeholder, VariantSelector, price/quantity controls, StatusNotice | Unselected, available, out of stock, loading, retry, missing slug, local-only cart intent |
| Cart | Editable line items, quantity controls, StatusNotice, validation ledger | Loading, empty, ready, corrupt recovery, unavailable product, write failure, remove |
| Checkout | Page-owned guest form, FormField/Input, native shipping radios, StatusNotice, authority ledger | Validation, rates loading/unavailable/stale, payment pending/error, ready review, production unavailable |
| Custom Print landing | Route-owned dossier grid, operator verification rail, format checklist, StatusNotice | Informational, private-file expectation, manual review, request unavailable with real fallback |
| Custom Print request | FormField/Input/select/textarea, FileUploadField preview mode, StatusNotice | Hydration guard, metadata progress, invalid/failed/expired/retry, validation summary, production unavailable |
| Customer quote | Route-owned immutable dossier, MoneySummary, StatusNotice, confirmation panel | Valid, loading, expired, superseded, accepted, declined, invalid access, local accept/decline confirmation |

Product detail composes the existing P1 VariantSelector under the owner-approved
FE-09 route scope. FE-10 persists only variant ID and quantity in a strict,
versioned browser record. Product facts and totals are display estimates from a
browser-safe projection; the browser does not calculate authoritative price,
reserve stock, or create an order. FE-11 adds a development-only guest checkout
preview. It validates contact/address input and simulates rate/payment recovery
without calling provider or order boundaries.
FE-12 adds a static custom-print explanation and composes the existing link,
button and StatusNotice contracts. Its illustration is explicitly conceptual;
the route does not upload a file, calculate price, create a request or introduce
a reusable workflow component.
FE-14 composes MoneySummary and StatusNotice into a development-only quote
review dossier. The server route admits only an explicit preview sentinel and
never treats fixture data, query state, or the browser as token, pricing, expiry,
or transition authority. Accept and decline confirmations remain local UI states.

FE-15 composes the approved OrderStatusTimeline and StatusNotice contracts into
a development-only retail/custom status dossier. It exposes only synthetic safe
projection fields, keeps invalid, expired, and revoked access free of order data,
and represents late payment as a refund exception without reopening fulfilment.
Query scenarios never become payment, shipment, cancellation, or state authority.

The architecture registry is recorded in
`src/app/auis/styleguide/registry/design-system.ts` and summarized in
`components.json`. It defines eight layers:

| Layer | Responsibility | Source/boundary | Status |
| --- | --- | --- | --- |
| `01 Foundation` | Visual tokens, typography, iconography, density, and semantic states. | AUiS foundation and Typography System v1.0; accepted within the named styleguide proof. | Approved for styleguide-only |
| `02 Primitives` | Native semantics, accessibility, focus, keyboard, and state behavior. | Native HTML first; Base UI primary; Radix exception-only. | Implemented |
| `03 Core Components` | Source-owned controls and Niuva composites. | shadcn source distribution + Base UI + custom Niuva. | Approved for styleguide-only |
| `04 Motion System` | Duration, easing, spring-like fallback, enter/exit, hover, press, scroll, and layout recipes. | CSS-first Motion System v1 is implemented in the styleguide; a runtime Motion engine remains candidate and is not installed. | Approved proof for styleguide-only |
| `05 Creative Components` | Selective interactions that clarify real Niuva evidence. | React Bits, Animate UI, Cult UI, Aceternity, and custom code are reference sources. | Candidate |
| `06 Decorative Effects` | Optional atmosphere with static fallback. | SVG/CSS/noise/grid references require visual and performance review. | Restricted |
| `07 Patterns` | Repeatable journey compositions. | Compose official components; no new tokens, primitives, or domain rules. | Approved proofs for styleguide-only |
| `08 Governance` | Provenance, promotion, accessibility, visual proof, performance, changelog, and deprecation. | Typed registry, JSON summary, and contract documentation. | Implemented |

The promotion path is `reference → candidate → proof → approved → official`.
`Official` is a separate product-screen authorization state; Architecture v1
does not grant it.

### Scoped Foundation + Primitive/Core audit

The 2026-09-03 styleguide-only audit retained the existing palette and contrast
values: the recorded semantic pairs already pass the contrast proof. It closed
implementation gaps in the proof surface by aligning Dialog, DropdownMenu,
Select, and Tooltip popups to `shadow-floating`, requiring explicit human-facing
Select labels for internal values, restoring the DropdownMenu group context,
and normalizing the core/P0 proof layout. The owner accepted the revised
Foundation proof for styleguide-only use on 2026-09-03. This hardening does not
promote any component to product-screen usage; Creative and Decorative review
remain separate gates.

### Scoped product-screen proof

The owner authorized a propagation proof on 2026-09-03 for `/` and
`/project-brief` only. It uses the approved Foundation and existing component
contracts, excludes checkout/admin and Creative/Decorative layers, and remains
pending visual acceptance. The global product-screen propagation guard stays
blocked until that acceptance is recorded; the project brief remains a
proof-only surface until its functional submission flow is implemented
separately.

### Motion System v1 boundary

The CSS-first Motion System v1 proof lives at
`/auis/styleguide#motion-system` and is recorded in
`foundation/motion.ts`. It defines the existing `150ms` fast and `220ms`
standard durations, a styleguide-only `320ms` deliberate duration, standard and
emphasis easing, and a CSS-only spring-like fallback. The proof covers enter,
exit, hover, press, scroll, and layout recipes.

Motion is purpose-driven: transform and opacity are preferred, reduced motion
keeps a static result and restores automatic scroll, and no state, price,
recovery action, or workflow meaning depends on animation. No runtime motion
dependency was added. Owner visual acceptance was recorded on 2026-09-03, so
the proof is approved for styleguide-only use; the separate product and
runtime-engine gates remain closed.

### Pattern proof boundary

The styleguide proof at `/auis/styleguide#patterns` contains four route-owned
compositions: Hero / case-study opener, Product discovery, Checkout Summary, and
Admin Action Queue. They compose official Niuva components and fixture context
only; domain authority stays in the server/domain layers. Owner visual
acceptance was recorded on 2026-09-03, so these Patterns are approved for
styleguide-only use. They are not official product-screen building blocks until
a separate page/route task authorizes their use.

## 1. Contract principles

- `src/app/globals.css` remains the canonical source for the currently
  propagated baseline. `foundation/typography-proof.ts` is the approved
  Typography System v1.0 contract and is loaded only by the styleguide until a
  separate propagation task is authorized. `foundation/tokens.ts` exposes its
  styleguide compatibility view.
- Existing Base UI/shadcn primitives in `src/components/ui` are the bridge.
  They should be extended only when a Niuva requirement cannot be expressed by
  their existing API.
- Reusable Niuva components belong in `src/components/niuva`. Page-only
  composition stays in its route folder.
- Components render state and emit intent; they do not calculate authoritative
  price, reserve stock, verify payment, authorize uploads, or transition order
  state.
- Product components use semantic tokens. Raw hex values are restricted to the
  token source, asset treatment, or a documented proof fixture.
- Customer-facing copy is Bahasa Indonesia, sentence case, and follows the
  recovery pattern: explain what happened, then give the next safe action.

## 2. Approved foundation contract

| Area | Contract |
| --- | --- |
| Identity | Niuva Blue `#6390BB` is the locked identity accent. The logo uses the official logo-system assets. |
| Surfaces | Public: dark stage plus light content; checkout: light-first and calm; admin: neutral, dense, and operational. |
| Typography | Typography System v1.0 uses Space Grotesk for display, heading, subheading, body, UI, and data. Fraunces is a restrained 5–10% editorial accent at weight `500`, Roman style, optical sizing `auto`, with only the `opsz` axis loaded; `SOFT`, `WONK`, and core italic are excluded. The scale uses a `16px` anchor, `1.25` ratio, compact `0–639px`, standard `640–1279px`, and wide `>=1280px` steps. Core weights are `400/500/600`; `700` is exceptional and `300` is excluded. There is no mono family in v1.0. A technical micro-label exception uses Space Grotesk `12/18`, weight `500`, `0.05em`, and uppercase only for 1–3 words. |
| Shape | Control `8px`; card `12px`; media `16px`; pill only for compact status/chip affordances. |
| Elevation | Quiet card separation `0 1px 2px rgb(15 23 42 / 0.06)`; floating UI uses the approved layered shadow token. |
| Motion | Fast `150ms` for micro feedback; standard `220ms` for short movement; standard and emphasis easing from the foundation tokens; all motion honors `prefers-reduced-motion`. |
| State | Success, warning, info, and error require a label or text, a visible symbol where useful, and the next action. Color cannot be the only signal. |
| Focus | Keyboard focus is visible through the semantic ring. Disabled controls remain legible and cannot be activated. |

## 3. Ownership and naming

| Layer | Location | Owns | Does not own |
| --- | --- | --- | --- |
| Primitive bridge | `src/components/ui/*` | Generic control anatomy, keyboard behavior, and token-level variants | Niuva business meaning or domain rules |
| Niuva component | `src/components/niuva/*` | Reusable Niuva meaning, composition, state language, and surface density | Pricing, stock, payment, upload authorization, or route transitions |
| Page composition | `src/app/**` route folders | Information architecture and page-specific composition | A new global component for a one-route arrangement |
| Domain boundary | `src/modules/**`, Route Handler, Server Action | Validation, authorization, calculations, persistence, and state transition | Styling decisions and raw provider errors in the UI |

## 4. Existing primitive bridge contracts

These are the current generic primitives. They are inventory entries, not an
instruction to duplicate them in a Niuva namespace.

| Component | Purpose and anatomy | Variants / sizes | States and accessibility | Props, tokens, and showcase |
| --- | --- | --- | --- | --- |
| `Button` | Executes a user intent; content with optional leading/trailing icon. | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; existing `xs` through `lg` and icon sizes. | Default, hover, active, focus-visible, disabled, and loading via `aria-busy`; must remain a real button for actions. | Native button props plus variant/size; primary uses `--primary` and `--primary-foreground`; show on all three surface proofs. |
| `Input` | Single-line value entry; field control with optional file affordance. | Default control size; field-specific width comes from layout, not a new visual size. | Empty, filled, focus-visible, disabled, invalid, and upload/error feedback through a surrounding field contract; label must be associated. | Native input props; `--input`, `--ring`, and semantic destructive tokens; show in checkout and project-brief examples. |
| `Label` | Names a form control and its required context. | Default and required/optional content treatment. | Default, disabled context, and invalid context; uses `htmlFor`/`id`. | Native label props; body/label typography; show with `FormField`. |
| `Alert` | Communicates a non-inline state or recovery message; icon, title, description, and optional action. | Neutral plus semantic tone contract: success, warning, info, error. | `role="status"` for non-urgent updates and `role="alert"` for blocking/error states; action remains keyboard reachable. | Title, description, action, tone; semantic background/border/icon/text tokens; show in semantic proof. |
| `Badge` | Compact non-interactive status or category label. | `default`, `secondary`, `outline`, `destructive`; pill shape only. | Read-only, optional icon, no hover-only meaning; status text must be present. | Children plus variant; use semantic tokens, sentence case, and technical type only for machine-readable values; show in admin queue and proof. |
| `Card` | Groups related content on a surface; header, title, description, content, action, footer. | Default and compact density; surface treatment is contextual. | Static, linked/focusable composition only when the whole card has a clear target; no nested interactive ambiguity. | Children and size; `--radius-card`, border, and card shadow; show public evidence, checkout summary, and admin item. |
| `Dialog` | Focus-contained modal task or confirmation. | Default and destructive/confirmation content treatment. | Closed/open, focus trap, escape, outside interaction policy, pending, and error; restores focus to trigger. | Title, description, body, actions, open state; `shadow-floating` and semantic surface tokens; show only for a bounded task. |
| `DropdownMenu` | Short action menu attached to a trigger. | Default and destructive item treatment. | Closed/open, keyboard roving focus, disabled item, and selection feedback; never hides the only path to a critical action. | Trigger, items, labels, separators; `shadow-floating`, semantic focus, and surface tokens; grouped labels require the menu group context. |
| `Select` | Selects one value from a bounded list. | Default control size; option groups where needed. | Empty, selected, open, disabled, invalid, and loading options; keyboard and screen-reader selection must work. | Value, options, placeholder, disabled, invalid; selected internal values must resolve to explicit human-facing labels; popup uses `shadow-floating`; show checkout and admin filters. |
| `RadioGroup` | Chooses one mutually exclusive option when comparison matters. | Default and compact option density. | Unselected, selected, disabled, invalid, and keyboard navigation; group has an accessible label. | Value, options, orientation, disabled; semantic accent/focus tokens; show variant/material selection. |
| `Separator` | Makes a meaningful grouping boundary visible. | Horizontal or vertical. | Decorative only when explicitly marked; semantic when it separates labelled regions. | Orientation and decorative state; border token; show in summaries and dense admin groups. |
| `Switch` | Toggles a persistent boolean preference. | Default control size. | On, off, focus-visible, disabled, and pending; label describes the setting, not only “on/off”. | Checked, change handler, disabled, label relation; semantic accent and ring; show only for real preferences. |
| `Tabs` | Switches between related views without changing the route meaning. | Default and compact density. | Active, inactive, focus-visible, disabled, and keyboard arrow navigation; panels have correct relationships. | Value, tab list, panels, orientation; border/accent/focus tokens; show in admin detail or product detail when justified. |
| `Tooltip` | Adds non-critical context to an unfamiliar control or technical label. | Default placement and delay from shared behavior. | Hover/focus, dismissed, and touch-safe fallback; never contains required instructions or the only status meaning. | Trigger and description; `shadow-floating`, surface tokens, and a keyboard-reachable trigger; show for technical metadata only. |
| `AuLink` | Provides navigational intent using the shared link/button visual contract. | Inherits `Button` variants and sizes; must remain a real link. | Focus-visible and disabled-looking states must not remove link semantics; the destination remains explicit. | `href`, native anchor props, and `Button` variant/size; source: `src/components/ui/AuLink.tsx`; showcase on the core primitive proof. |
| `Icon` | Provides the single named interface-icon boundary for Lucide icons. | 24px base grid; XS `12–16px`, S `20px`, M `24px`, L `32px`, XL `48px+`; stroke follows Lucide defaults. | Every icon is either `aria-hidden` or labelled; critical actions pair the icon with text; icon-only controls own a `44px` minimum touch target. | `name` is a typed semantic name; source: `src/components/ui/Icon.tsx`; existing names remain stable, while new names follow `icon-[category]-[name]-[variant]`. |

The exact runtime IDs in `components.json` are the canonical coverage entries.
The `Niuva Button`, `Niuva Input`, `Niuva Select`, `Niuva Card`, `Niuva
Dialog`, `Niuva Tabs`, and `Niuva Navigation` labels are contract-only
aliases for a future source-owned layer. They are marked `planned` until a
real module, export, showcase, and review record exist; do not import these
names or create duplicate wrappers merely to satisfy the registry.

## 5. Initial Niuva composite candidates

These are the first components derived from the product journeys. All eight
contracts below are implemented and visually approved for the styleguide-only
proof; new visual defaults still require a separate review.
P0 means the component supports a core journey and P1 means it is a later
reusable boundary.

### `EvidenceCard` — P0 / approved for styleguide-only

- **Purpose:** Make a real Niuva project, product, process, or material proof
  understandable on public surfaces.
- **Anatomy:** Optional human-facing eyebrow in sans sentence case, title, short outcome description,
  evidence media or process marker, optional metadata, and one directional CTA.
- **Variants and sizes:** `project`, `process`, `capability`; `default` and
  `compact`. No decorative variant without evidence.
- **States:** Default, hover, focus-visible, unavailable-media, and loading
  media. Hover may add the approved short motion but must not reveal essential
  information only on hover.
- **Props/data:** `eyebrow`, `title`, `description`, `media`, `mediaAlt`,
  `href`, `actionLabel`, and factual `meta`. Client names, metrics, and claims
  require an explicit source/permission outside the component.
- **Accessibility:** The title is a heading; a linked card has one clear target;
  media requires useful alt text or is marked decorative; keyboard focus is
  visible.
- **Tokens/showcase:** Public surface tokens, display/body roles, card/media
  radius, quiet card shadow; showcase with real Niuva evidence only.

### `FormField` — P0 / approved for styleguide-only

- **Purpose:** Standardize label, control, helper text, required context, and
  recovery copy across B2B, checkout, and custom-print forms.
- **Anatomy:** Label row, control slot, helper/constraint text, error text, and
  optional action.
- **Variants and sizes:** `default`, `compact`, `readOnly`; density follows
  public, checkout, or admin surface rather than arbitrary page classes.
- **States:** Empty, filled, focus, disabled, pending, valid, invalid, and
  recovery-required.
- **Props/data:** `id`, `label`, `description`, `error`, `required`,
  `disabled`, `control`, and `action`. It receives validation output; it does
  not validate or submit data.
- **Accessibility:** Generates stable label/description/error relationships;
  invalid fields expose `aria-invalid` and the error ID; error announcements
  are proportional to urgency.
- **Tokens/showcase:** Label/body typography, input/ring/destructive tokens,
  spacing roles; showcase project brief and checkout address.

### `StatusNotice` — P0 / approved for styleguide-only

- **Purpose:** Explain a user-visible state and the next action for customer or
  operator workflows.
- **Anatomy:** Symbol, semantic label, title, explanation, optional reason,
  primary recovery action, and optional secondary action.
- **Variants and sizes:** `success`, `warning`, `info`, `error`; `default` and
  `compact` density. Tone changes meaning, not just color.
- **States:** Visible, action pending, action disabled, and dismissible only when
  dismissal is safe. Error copy must never expose raw provider or stack details.
- **Props/data:** `tone`, `title`, `description`, `actionLabel`, optional
  `secondaryActionLabel`, `onAction`, and `ariaLive` policy. The domain maps its
  error code to copy before rendering.
- **Accessibility:** Uses `status` or `alert` according to urgency; includes
  text and a non-color signal; action is keyboard reachable and labelled.
- **Tokens/showcase:** Semantic background/border/icon/text roles and motion
  only for action feedback; showcase semantic proof and checkout recovery.

### `ActionQueueItem` — P0 / approved for styleguide-only

- **Purpose:** Present the next operator decision in the admin Action Queue,
  rather than exposing a raw database row.
- **Anatomy:** Reference number, work type, status label, concise context,
  age/updated metadata, primary next action, and optional overflow actions.
- **Variants and sizes:** `inquiry`, `custom-review`, `quote`, `order`,
  `package`, `stock`; one dense operational size with an optional expanded
  detail composition. FE-17 expands the fixture vocabulary for all queue types,
  not the authority or mutation surface behind them.
- **States:** New, waiting-for-operator, in-progress, blocked, completed, and
  action-pending. Status transitions remain domain-owned.
- **Props/data:** `reference`, `kind`, `status`, `summary`, `updatedAt`,
  `primaryAction`, and `secondaryActions`. It receives an already-authorized
  action and does not decide whether that action is valid.
- **Accessibility:** Uses a list/item structure with a heading; status is text;
  action names include the object/reference where ambiguity is possible; focus
  order follows the work decision.
- **Tokens/showcase:** Admin density, technical reference metadata, neutral surface, semantic
  states, minimal motion; showcase the proof queue with fictional references
  only, never fake production records.

### `MoneySummary` — P1 / approved for styleguide-only

- **Purpose:** Show an authoritative price or quote breakdown without taking
  ownership of the calculation.
- **Anatomy:** Line items, subtotal, shipping/fee rows when present, total,
  verification/source note, and optional next action.
- **Variants and sizes:** `checkout`, `quote`, `compact`; light-first by default.
- **States:** Loading, ready, changed/revalidation-required, unavailable, and
  error with recovery action.
- **Props/data:** Server-provided line labels, integer/Decimal-safe display
  values, currency, total, and `sourceStatus`. No arithmetic or floating-point
  authority lives here.
- **Accessibility:** Uses labelled rows or a description list; total is exposed
  as text; currency is not conveyed by symbol alone.
- **Tokens/showcase:** Body/label/tabular numeric roles, border/card/elevation tokens; show
  ready-made checkout and accepted custom quote.

### `FileUploadField` — P1 / approved for styleguide-only

- **Purpose:** Explain and represent the private custom-print file upload
  lifecycle.
- **Anatomy:** Drop/select target, accepted-extension guidance, size policy,
  selected-file row, progress, validation message, retry/remove action.
- **Variants and sizes:** `single-private-file`; default and compact admin review
  presentation. The allowed size comes from server policy, not a hardcoded UI
  guess.
- **States:** Idle, selecting, uploading, validating, accepted, invalid,
  failed, expired, and retrying.
- **Props/data:** Accepted extensions, server-provided max size, file metadata,
  upload state, optional bounded progress, `live` or explicitly non-persistent
  `preview` copy mode, `onSelect`, `onRetry`, and `onRemove`. It never displays a
  signed URL as public content or authorizes access.
- **Accessibility:** Keyboard and screen-reader equivalent to file selection;
  progress/status is announced appropriately; invalid files include reason and
  recovery action.
- **Tokens/showcase:** Input/focus/destructive/success tokens, no decorative
  upload animation; showcase custom-print request with safe fixture metadata.

### `OrderStatusTimeline` — P1 / approved for styleguide-only

- **Purpose:** Give customers a human-readable view of an order or quote state
  without exposing internal notes or provider internals.
- **Anatomy:** Ordered steps, current state, completed timestamps when allowed,
  next expectation, and support/recovery action.
- **Variants and sizes:** `retail-order`, `custom-quote`; default and compact.
  The state list is supplied by the domain flow.
- **States:** Pending, current, completed, delayed, failed, cancelled, and
  access-expired.
- **Props/data:** Steps, current state, public labels, timestamps, and safe
  action links. It does not compute transitions or trust browser state as
  authority.
- **Accessibility:** Ordered list with current step exposed; connectors are
  decorative; text remains understandable without color or motion.
- **Tokens/showcase:** Semantic status, border, technical timestamps, reduced-motion
  behavior; showcase retail and custom-print status fixtures.

### `VariantSelector` — P1 / approved for styleguide-only

- **Purpose:** Help a retail customer choose a product variant while making
  stock and unavailable options understandable.
- **Anatomy:** Group label, option controls, option metadata, selected state,
  stock/availability message, and optional helper text.
- **Variants and sizes:** `swatch`, `list`, `radio`; default and compact. Use
  the smallest pattern that supports comparison.
- **States:** Unselected, selected, disabled/out-of-stock, loading, and
  revalidated/changed stock.
- **Props/data:** Option ID/label, selected ID, availability from the server,
  `onChange`, and validation message. Browser state never becomes stock
  authority.
- **Accessibility:** Uses the radio-group contract for mutually exclusive
  options; selected and unavailable states have text; group label and error are
  associated.
- **Tokens/showcase:** Brand accent, focus, muted, destructive, and control
  radius tokens; showcase product detail and out-of-stock recovery.

## 6. Page-only compositions

These arrangements should remain route-owned until repeated evidence proves a
reusable boundary:

- `PublicNarrative`: hero, service story, case-study evidence, and CTA sequence.
- `CheckoutFlow`: cart summary, contact/address fields, shipping choice, payment
  handoff, and recovery states.
- `CustomPrintReviewWorkspace`: file context, operator verification, quote
  inputs, and review actions.
- `AdminActionQueueLayout`: queue grouping, filters, navigation, and detail
  handoff around `ActionQueueItem`.

`AdminShell` in `src/components/niuva/admin-shell.tsx` is a provisional
development-only composition created by FE-16 for reviewing the target
`/admin` and `/admin/sign-in` shell. It exposes responsive structural navigation
only, carries no Clerk/session/profile data, and does not authorize a route or
operation. Its visual acceptance and real auth wiring remain separate gates.

They compose the contracts above but do not become components merely because
they contain several children.

## 7. Visual gate record

The prior Task 4 contract approval remains historical. The renewed P0/P1 visual
gate was closed for the styleguide on 2026-09-02 after review of:

- the primitive bridge boundary;
- the P0/P1 names and priorities;
- each P0/P1 candidate's anatomy, states, props/data boundary, accessibility, and
  showcase requirement; and
- the rule that product-screen propagation remains a separate authorization.

The accepted proof covered desktop and mobile layout, default and semantic
states, visible focus and keyboard paths, recovery copy/actions, CTA contrast,
and equal bottom alignment for the compact `MoneySummary` states. This approval
is limited to the current eight-component P0/P1 set and the retained foundation
baseline; new components or visual defaults require a new proof.

Historical approval records: **`setujui component contracts P0`**, **`setujui
component contracts P1`**, and **`setujui Design System implementation`** on
2026-08-28. The first two authorized implementation of all eight contracts; the
last accepted the previous visual/technical implementation. Owner feedback on
2026-08-29 reopened the visual review; the revised proof closed it on 2026-09-02
for styleguide-only usage and keeps scoped product-page work paused.
Typography approval record: **`Setujui Candidate v2 sebagai Typography System
v1.0, tetap tanpa propagasi product screens.`** on 2026-08-29. This remains a
separate foundation approval and does not authorize product-screen propagation.

## 8. Implementation boundary

- Official component source is `src/components/niuva/*`.
- P0 showcase is `/auis/styleguide#p0-components`; P1 showcase is
  `/auis/styleguide#p1-components`.
- Fixture values are clearly preview-only. No pricing calculation, stock
  authority, upload authorization, payment handoff, or order transition lives
  in these components.
- Other product screens may proceed only through a separate scoped page/route
  task after the applicable visual review and explicit authorization; no global
  or bulk propagation, shared-component restyling, or domain integration is
  authorized by this revision.
