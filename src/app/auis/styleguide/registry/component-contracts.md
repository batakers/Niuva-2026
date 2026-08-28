# Niuva Design System Component Contracts

Status: **P0/P1 APPROVED — implementation ready for Design System review**  
Foundation status: **APPROVED** after Visual Proof acceptance on 2026-08-28.  
Implementation status: **P0/P1 components are implemented in the styleguide;
product-screen propagation is not.**

This document turns the accepted UI Foundation into a controlled component
boundary. The owner approved the four P0 and four P1 contracts on 2026-08-28.
The implementation is available for visual and technical Design System review;
product-screen propagation stays gated by that checkpoint.

## 1. Contract principles

- `src/app/globals.css` is the canonical token source. `foundation/tokens.ts`
  exposes the same decisions for the styleguide proof.
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
| Typography | Geist Sans for display/body; Geist Mono for technical labels, metadata, and statuses. Display uses the approved responsive `4xl → 5xl` scale; body uses readable `base/7`; labels use `sm/medium`. |
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
| `Badge` | Compact non-interactive status or category label. | `default`, `secondary`, `outline`, `destructive`; pill shape only. | Read-only, optional icon, no hover-only meaning; status text must be present. | Children plus variant; use semantic tokens and mono only for technical statuses; show in admin queue and proof. |
| `Card` | Groups related content on a surface; header, title, description, content, action, footer. | Default and compact density; surface treatment is contextual. | Static, linked/focusable composition only when the whole card has a clear target; no nested interactive ambiguity. | Children and size; `--radius-card`, border, and card shadow; show public evidence, checkout summary, and admin item. |
| `Dialog` | Focus-contained modal task or confirmation. | Default and destructive/confirmation content treatment. | Closed/open, focus trap, escape, outside interaction policy, pending, and error; restores focus to trigger. | Title, description, body, actions, open state; floating shadow and semantic surface tokens; show only for a bounded task. |
| `DropdownMenu` | Short action menu attached to a trigger. | Default and destructive item treatment. | Closed/open, keyboard roving focus, disabled item, and selection feedback; never hides the only path to a critical action. | Trigger, items, labels, separators; semantic focus and surface tokens; show in admin action context. |
| `Select` | Selects one value from a bounded list. | Default control size; option groups where needed. | Empty, selected, open, disabled, invalid, and loading options; keyboard and screen-reader selection must work. | Value, options, placeholder, disabled, invalid; `--input`, `--ring`, and surface tokens; show checkout and admin filters. |
| `RadioGroup` | Chooses one mutually exclusive option when comparison matters. | Default and compact option density. | Unselected, selected, disabled, invalid, and keyboard navigation; group has an accessible label. | Value, options, orientation, disabled; semantic accent/focus tokens; show variant/material selection. |
| `Separator` | Makes a meaningful grouping boundary visible. | Horizontal or vertical. | Decorative only when explicitly marked; semantic when it separates labelled regions. | Orientation and decorative state; border token; show in summaries and dense admin groups. |
| `Switch` | Toggles a persistent boolean preference. | Default control size. | On, off, focus-visible, disabled, and pending; label describes the setting, not only “on/off”. | Checked, change handler, disabled, label relation; semantic accent and ring; show only for real preferences. |
| `Tabs` | Switches between related views without changing the route meaning. | Default and compact density. | Active, inactive, focus-visible, disabled, and keyboard arrow navigation; panels have correct relationships. | Value, tab list, panels, orientation; border/accent/focus tokens; show in admin detail or product detail when justified. |
| `Tooltip` | Adds non-critical context to an unfamiliar control or technical label. | Default placement and delay from shared behavior. | Hover/focus, dismissed, and touch-safe fallback; never contains required instructions or the only status meaning. | Trigger and description; surface/floating tokens; show for technical metadata only. |

## 5. Initial Niuva composite candidates

These are the first components derived from the product journeys. All eight
contracts below are approved for implementation. P0 means the component
supports a core journey and P1 means it is a later reusable boundary.

### `EvidenceCard` — P0 / approved

- **Purpose:** Make a real Niuva project, product, process, or material proof
  understandable on public surfaces.
- **Anatomy:** Eyebrow/technical label, title, short outcome description,
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

### `FormField` — P0 / approved

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

### `StatusNotice` — P0 / approved

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

### `ActionQueueItem` — P0 / approved

- **Purpose:** Present the next operator decision in the admin Action Queue,
  rather than exposing a raw database row.
- **Anatomy:** Reference number, work type, status label, concise context,
  age/updated metadata, primary next action, and optional overflow actions.
- **Variants and sizes:** `inquiry`, `custom-review`, `order`, `package`; one
  dense operational size with an optional expanded detail composition.
- **States:** New, waiting-for-operator, in-progress, blocked, completed, and
  action-pending. Status transitions remain domain-owned.
- **Props/data:** `reference`, `kind`, `status`, `summary`, `updatedAt`,
  `primaryAction`, and `secondaryActions`. It receives an already-authorized
  action and does not decide whether that action is valid.
- **Accessibility:** Uses a list/item structure with a heading; status is text;
  action names include the object/reference where ambiguity is possible; focus
  order follows the work decision.
- **Tokens/showcase:** Admin density, mono metadata, neutral surface, semantic
  states, minimal motion; showcase the proof queue with fictional references
  only, never fake production records.

### `MoneySummary` — P1 / approved

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
- **Tokens/showcase:** Body/label/mono roles, border/card/elevation tokens; show
  ready-made checkout and accepted custom quote.

### `FileUploadField` — P1 / approved

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
  upload state, `onSelect`, `onRetry`, and `onRemove`. It never displays a
  signed URL as public content or authorizes access.
- **Accessibility:** Keyboard and screen-reader equivalent to file selection;
  progress/status is announced appropriately; invalid files include reason and
  recovery action.
- **Tokens/showcase:** Input/focus/destructive/success tokens, no decorative
  upload animation; showcase custom-print request with safe fixture metadata.

### `OrderStatusTimeline` — P1 / approved

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
- **Tokens/showcase:** Semantic status, border, mono metadata, reduced-motion
  behavior; showcase retail and custom-print status fixtures.

### `VariantSelector` — P1 / approved

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

They compose the contracts above but do not become components merely because
they contain several children.

## 7. Review gate for Task 4

Task 4 is complete after the owner reviewed and approved:

- the primitive bridge boundary;
- the P0/P1 names and priorities;
- each P0/P1 candidate's anatomy, states, props/data boundary, accessibility, and
  showcase requirement; and
- the rule that no official component implementation or product-screen
  propagation starts before this contract review.

Approval records: **`setujui component contracts P0`** and
**`setujui component contracts P1`** on 2026-08-28. These authorize
implementation of all eight contracts. Visual acceptance of the implementation
and product-screen propagation remain separately controlled by the Design
System checkpoint.

## 8. Implementation boundary

- Official component source is `src/components/niuva/*`.
- P0 showcase is `/auis/styleguide#p0-components`; P1 showcase is
  `/auis/styleguide#p1-components`.
- Fixture values are clearly preview-only. No pricing calculation, stock
  authority, upload authorization, payment handoff, or order transition lives
  in these components.
- Product screens remain out of scope until the owner accepts the Design System
  implementation review.
