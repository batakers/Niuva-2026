# Niuva Foundation

Status: Baseline UI Foundation tokens were accepted on 2026-08-28. Typography
System v1.0 was approved by the owner on 2026-08-29. The revised Foundation
visual proof was approved for styleguide-only use on 2026-09-03. DS-DEC-019
authorized Foundation/Typography propagation globally on 2026-09-25. The P0/P1
implementation gate was approved for styleguide-only use on 2026-09-02, and
Motion System v1 plus the Pattern proofs were approved for styleguide-only use
on 2026-09-03. Creative/Decorative review, component promotion, visual
acceptance, AT/device, provider, and production readiness remain separate gates.

The scoped 2026-09-03 Foundation + Primitive/Core audit found no contrast-token
change to justify: the existing semantic pairs remain valid in the contrast
proof. The proof implementation now keeps floating surfaces on
`shadow-floating`, resolves Select keys to human-facing labels, preserves
menu-group semantics, and keeps the core/P0 examples visually aligned. These
are styleguide proof hardening changes, not product-screen propagation. The
owner approval closes the Foundation visual gate for this route only.

`src/app/globals.css` remains the canonical source for the globally propagated
Foundation baseline. The approved typography contract lives in
`typography-proof.ts`; the root layout owns its font loading and the nested
`/auis/styleguide` layout renders the proof. DS-DEC-019 authorizes Foundation/
Typography only; it does not promote P0/P1, Motion, Patterns, Creative, or
Decorative usage.

## Visual Proof coverage

- `#surface-proof` shows the same identity across public, checkout, and admin
  contexts with different surface and density rules.
- `#semantic-proof` shows success, warning, error, and info with a visible
  label, symbol, and next action; dark mappings are explicit.
- `#motion-proof` shows fast, standard, and reduced-motion behavior without
  introducing decorative loops.
- `#contrast-proof` records the approved contrast pairs used by the foundation
  palette.
- `#typography` and `#typography-responsive` record Typography System v1.0,
  including role ownership, scale, responsive steps, weight, tracking,
  line-height, and the restrained Fraunces axis policy.
- `#motion-system` records the CSS-first Motion System v1 token vocabulary,
  recipes, reduced-motion contract, and static fallback boundary.
- `#patterns` records four approved compositions grounded in Niuva's project,
  retail, checkout, and admin flows.

Spacing, radius, elevation, motion, and semantic state rules remain the accepted
baseline. Typography is no longer a candidate: Space Grotesk owns UI, body,
product, and data roles; Fraunces is a restrained 5–10% editorial accent. There
is no third mono family in v1.0. The P0/P1 visual gate is now closed for the
styleguide. Motion and Patterns are approved for styleguide-only use;
product-screen promotion remains separate.

## Evidence versus inference

- Locked evidence: Niuva Blue `#6390BB`, light-mode wordmark `#111827`,
  light-first logo usage, horizontal lockup for website navigation, and the
  Precision Industrial + Creative Accent direction.
- Approved typography: Space Grotesk + Fraunces; 16px anchor with 1.25 modular
  ratio and optical rounding; compact `0–639px`, standard `640–1279px`, and wide
  `>=1280px`; core weights `400/500/600`; Fraunces `opsz` only with optical
  sizing enabled.
- Retained foundation baseline: the surrounding brand/neutral scales, semantic
  surface mapping, spacing rhythm, radius roles, shadows, motion durations, and
  reduced-motion behavior.
- Remaining open product decisions: production content, client/logo
  permissions, inventory, pricing rules, upload policy, and provider readiness;
  these do not change the retained token baseline.

## Mapping

| Role | CSS token | Tailwind/shadcn bridge |
| --- | --- | --- |
| Page surface | `--background` | `bg-background` |
| Main text | `--foreground` | `text-foreground` |
| Brand action | `--primary` | `bg-primary` |
| Quiet surface | `--muted` | `bg-muted` |
| Dividers | `--border` | `border-border` |
| Focus | `--ring` | `ring-ring` |
| Card elevation | `--shadow-card-token` | `shadow-card` |

Use these values through the revised component contracts and DS-DEC-019 global
Foundation/Typography authorization. Do not bypass component contracts or
introduce page-specific token values; other layer promotion still requires its
own scoped authorization.

## Design System handoff

- Design System Architecture v1 and its source/promotion registry:
  ../registry/design-system-architecture.md and
  ../registry/design-system.ts (Foundation/Typography global authorization by
  DS-DEC-019; component proof remains styleguide-scoped).
- P0 official components: `EvidenceCard`, `FormField`, `StatusNotice`, and
  `ActionQueueItem`; showcase: `/auis/styleguide#p0-components`.
- P1 official components: `MoneySummary`, `FileUploadField`,
  `OrderStatusTimeline`, and `VariantSelector`; showcase:
  `/auis/styleguide#p1-components`.
- Motion System v1 CSS-first proof: `/auis/styleguide#motion-system`; approved
  for styleguide-only use with no runtime motion dependency added.
- Approved Pattern proofs: `/auis/styleguide#patterns` for Hero / case-study
  opener, Product discovery, Checkout Summary, and Admin Action Queue.
- Full contract inventory: `../registry/component-contracts.md`.
- Design System implementation was accepted on 2026-08-28, then returned to
  visual review on 2026-08-29 after the typography feedback.
- Typography System v1.0 was approved on 2026-08-29; DS-DEC-019 authorizes its
  Foundation/Typography use globally while P0/P1 visual approval remains scoped
  to the styleguide.
- Motion and Pattern proofs are approved styleguide surfaces. The owner has
  authorized, but not yet visually accepted outside the named record, the
  Foundation/Typography baseline for all product screens through DS-DEC-019.
  The `/` and `/project-brief` proof remains the named visual acceptance record.
- P0/P1, Motion, Patterns, Creative, Decorative, OptionChip, checkout/admin
  visual acceptance, AT/device, provider, and production gates remain separate;
  no component-layer or decorative bulk propagation is implied.
