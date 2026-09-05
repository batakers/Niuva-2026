# Niuva Design System Architecture v1

Status: **Architecture v1 approved for the `/auis/styleguide` registry on
2026-09-02.** This is an architecture and governance decision, not a blanket
approval for product-screen propagation.

## Boundary

Architecture v1 records ownership, source provenance, promotion states, and
implementation boundaries. It does not add a runtime dependency, change the
global token baseline, restyle shared product components, or expand product
screens.

The machine-readable registry is
`src/app/auis/styleguide/registry/design-system.ts`. The component registry
summary remains `components.json`; the contract details remain in
`component-contracts.md`.

## Layer map

| Layer | Owns | Source policy | Status |
| --- | --- | --- | --- |
| `01 Foundation` | Typography, color, spacing, sizing, radius, border, shadow, opacity, z-index, breakpoints, motion tokens, iconography, density, and semantic states. | AUiS foundation tokens and the approved Typography System v1.0. | Approved for styleguide-only on 2026-09-03; product propagation remains paused. |
| `02 Primitives` | Semantic anatomy, accessibility, focus management, keyboard interaction, and state behavior. | Native HTML first; Base UI is the primary interaction primitive; Radix is an exception path only. | Implemented bridge. |
| `03 Core Components` | Source-owned controls, Niuva composites, and reusable interaction surfaces. | shadcn source distribution + Base UI + custom Niuva components. | Initial P0/P1 set visually approved for styleguide-only; new additions require a separate proof. |
| `04 Motion System` | Duration, easing, spring-like fallback, enter/exit, hover, press, scroll, and layout-transition recipes. | CSS-first Motion System v1 in the styleguide; a physics/gesture engine remains a separate candidate and is not installed. | Approved CSS-first proof for styleguide-only; runtime engine remains candidate. |
| `05 Creative Components` | Selective signature interactions that clarify a real Niuva story. | React Bits, Animate UI, Cult UI, Aceternity, or custom code are reference sources; approved code is copied and owned. | Candidate. |
| `06 Decorative Effects` | Optional atmosphere such as SVG, CSS, noise, texture, grid, and carefully justified effects. | Reference catalog only; every effect needs a static fallback and performance review. | Restricted. |
| `07 Patterns` | Hero, case-study opener, product discovery, checkout, navigation, CTA, and admin compositions. | Compose official components and factual journey evidence; do not create new primitive or token layers. | Approved proofs for styleguide-only; product use separately authorized. |
| `08 Governance` | Registry, provenance, promotion, accessibility matrix, visual proof, performance budget, changelog, and deprecation. | `design-system.ts`, `components.json`, contracts, and scoped acceptance records. | Implemented for v1 architecture. |

## Source policy

- **Native HTML** is the default when it already provides the required
  semantics and interaction.
- **Base UI** is the primary primitive layer for focus management, keyboard
  behavior, popup behavior, and state attributes.
- **shadcn/ui** is a source distribution and compositional convention. The
  project owns the copied component source; it is not treated as a black-box
  runtime UI dependency.
- **Lucide** is the single approved icon vocabulary for interface icons.
- **Custom Niuva** owns product meaning and evidence-oriented composites. It
  receives authoritative data through props and never calculates price, stock,
  payment, upload authorization, or order transitions.
- **Motion System v1** is CSS-first: the styleguide owns a small token and
  recipe vocabulary with static and reduced-motion fallbacks. A runtime Motion
  engine remains a future candidate for physics, gestures, or layout behavior;
  no dependency is added until a separate decision establishes the need and
  accessibility/performance budget.
- **React Bits, Animate UI, Cult UI, Aceternity, and Magic UI** are reference
  catalogs. A reference is not an implementation instruction, dependency, or
  visual direction by itself.

## P0/P1 visual gate

The initial P0/P1 component set passed its renewed visual review on **2026-09-02**
for the styleguide only. The proof covered the four P0 composites, four P1
workflow components, their documented states, visible focus and recovery paths,
desktop/mobile layout, CTA contrast, and aligned compact summary cards.

This approval is bounded: it does not add a runtime dependency or permit
product-screen propagation. New components and new visual defaults must enter
the same proof path again; Creative and Decorative layers remain separate
review gates.

## Foundation visual gate

The revised Foundation Visual Proof passed owner review on **2026-09-03** for
styleguide-only scope. It covers the accepted palette and contrast pairs,
semantic states, Typography System v1.0, rhythm and shape roles, primitive/core
behavior, CTA contrast, desktop/mobile layout, keyboard focus, reduced motion,
and recovery states. The Foundation contract is approved within the named
styleguide route; product-screen propagation outside the named proof remains
separately authorized.

## Scoped product-screen proof

On 2026-09-03 the owner authorized a propagation proof for the public homepage
(`/`) and the B2B project brief (`/project-brief`) only. The proof uses the
approved Foundation, P0/P1 Core Components, and existing CSS-first Motion
contracts. It excludes checkout, admin, Creative Components, and Decorative
Effects. Visual acceptance remains pending owner review.

This authorization does not change the registry's
`productScreenPropagationAllowed` guard or promote either route to `Official`;
the proof-only project brief is not a functional submission flow. A later owner
acceptance is required before this scoped proof can be promoted.

## Promotion states

Every creative component, effect, or new pattern follows this path:

1. **Reference** — source or idea used as evidence for a proposal.
2. **Candidate** — adapted proposal with provenance, owner, a11y, performance,
   and fallback notes.
3. **Proof** — rendered in the named styleguide surface across relevant states
   and breakpoints.
4. **Approved** — owner accepts the visual behavior, contract, and boundary.
5. **Official** — a separate scoped task permits use in product screens.

Technical green checks do not replace visual acceptance. Global product
propagation remains disabled for this Architecture v1 record outside the named
approved proof routes.

## Motion System v1 proof

Motion v1 is implemented at `/auis/styleguide#motion-system` and is scoped to
the styleguide. It adds no dependency and does not change the global token
baseline or product screens.

| Token | Value | Intended use |
| --- | --- | --- |
| `--duration-fast-token` | `150ms` | Button state, toggle, and micro feedback. |
| `--duration-normal-token` | `220ms` | Short movement and surface transitions. |
| `--motion-duration-deliberate` | `320ms` | Layered entrance or layout emphasis only. |
| `--ease-standard-token` | `cubic-bezier(0.2, 0, 0, 1)` | Elements settling into place. |
| `--ease-emphasis-token` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Purposeful state changes with extra presence. |
| `--motion-ease-spring-like` | `cubic-bezier(0.22, 1, 0.36, 1)` | CSS-only spring-like fallback; no physics engine in v1. |

The recipes are `enter`, `exit`, `hover`, `press`, `scroll`, and `layout
transition`. Transform and opacity are preferred for performance; motion never
becomes the only explanation of an action, state, or recovery path. Under
`prefers-reduced-motion: reduce`, transitions are shortened, intentional in-page
scroll returns to automatic behavior, and the final static hierarchy remains
available.

Owner visual acceptance for Motion v1 was recorded on **2026-09-03**. The proof
is approved for styleguide-only usage; product-screen propagation and any runtime
Motion engine remain separate gates.

## Pattern proof

The styleguide now renders four approved styleguide-only compositions at
`/auis/styleguide#patterns`:

- **Hero / case-study opener** — project evidence, process context, and a
  directional CTA.
- **Product discovery** — factual retail evidence, comparison, and finishing
  selection.
- **Checkout Summary** — server-shaped totals, delivery context, and recovery
  action.
- **Admin Action Queue** — operator priority, status, filters, and next safe
  action.

These are proof surfaces, not product routes. They compose the approved Niuva
components and fixture copy without pricing, stock, upload, payment, or state
transition authority. Their visual acceptance was recorded on **2026-09-03**;
they are approved for styleguide-only use, while a separate scoped product-page
task is still required for official product-screen usage.

## Component and pattern boundary

Core components own reusable anatomy and interaction behavior. Niuva composites
own recognizable product meaning without owning domain authority. Patterns own
route-level composition until repeated evidence proves a stable reusable
boundary. A pattern may not introduce page-specific permanent tokens or hidden
business logic.

## Accessibility and motion minimum

Every official component must document semantic structure, accessible name,
keyboard path, visible focus, disabled/loading/error/recovery behavior where
relevant, contrast, and reduced-motion behavior. Creative and decorative
components must also provide a static fallback and cannot be required to
understand or complete checkout or admin work.

## Niuva anti-generic guardrail

The system earns character from real project, workshop, material, engineering,
and operator evidence. It does not earn character by accumulating gradients,
glows, blobs, oversized pills, repeated animated cards, or copied showcase
effects. One meaningful signature interaction is preferable to a page full of
unrelated effects.
