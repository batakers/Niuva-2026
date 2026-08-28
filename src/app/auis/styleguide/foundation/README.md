# Niuva Foundation

Status: UI Foundation approved after explicit Visual Proof acceptance on
2026-08-28; P0/P1 Design System contracts are approved and their implementation
is ready for the Design System review gate.

The canonical token source is `src/app/globals.css`. The `/auis/styleguide`
route is the review surface for the approved foundation mapping and proof states.

## Visual Proof coverage

- `#surface-proof` shows the same identity across public, checkout, and admin
  contexts with different surface and density rules.
- `#semantic-proof` shows success, warning, error, and info with a visible
  label, symbol, and next action; dark mappings are explicit.
- `#motion-proof` shows fast, standard, and reduced-motion behavior without
  introducing decorative loops.
- `#contrast-proof` records the approved contrast pairs used by the foundation
  palette.

Typography, spacing, radius, elevation, motion, and semantic state rules shown
in the proof are accepted foundation decisions. Their reusable component
contracts remain a separate Design System review item.

## Evidence versus inference

- Locked evidence: Niuva Blue `#6390BB`, light-mode wordmark `#111827`,
  light-first logo usage, horizontal lockup for website navigation, and the
  Precision Industrial + Creative Accent direction.
- Approved foundation: the surrounding brand/neutral scales, semantic surface
  mapping, spacing rhythm, radius roles, shadows, motion durations, and Geist
  typography role mapping.
- Remaining open product decisions: production content, client/logo
  permissions, inventory, pricing rules, upload policy, and provider readiness;
  these do not change the accepted visual foundation.

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

Use these values through an approved component contract. Do not bypass the
Design System checkpoint by styling product screens directly.

## Design System handoff

- P0 official components: `EvidenceCard`, `FormField`, `StatusNotice`, and
  `ActionQueueItem`; showcase: `/auis/styleguide#p0-components`.
- P1 official components: `MoneySummary`, `FileUploadField`,
  `OrderStatusTimeline`, and `VariantSelector`; showcase:
  `/auis/styleguide#p1-components`.
- Full contract inventory: `../registry/component-contracts.md`.
- Implementation is ready for visual/technical Design System review. Product
  screen propagation remains blocked until that checkpoint is accepted.
