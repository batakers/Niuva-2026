---
name: Niuva
description: "Dari Ide Menjadi Produk Nyata"
colors:
  niuva-blue: "#6390BB"
  brand-action: "#3F607F"
  blue-paper: "#E8F1F8"
  blue-mist: "#B4CFE0"
  blue-ink: "#1F2E3B"
  cool-paper: "#F8FAFC"
  paper-white: "#FFFFFF"
  quiet-surface: "#F1F5F9"
  line-slate: "#E2E8F0"
  muted-slate: "#475569"
  working-slate: "#1E293B"
  dark-line: "#334155"
  graphite: "#0F172A"
  success: "#166534"
  success-surface: "#F0FDF4"
  success-border: "#16A34A"
  warning: "#92400E"
  warning-surface: "#FFFBEB"
  warning-border: "#B45309"
  info: "#1D4ED8"
  info-surface: "#EFF6FF"
  info-border: "#2563EB"
  destructive: "#B91C1C"
  destructive-surface: "#FEF2F2"
  destructive-border: "#DC2626"
typography:
  status: "approved v1.0; foundation/styleguide only; product propagation paused"
  primary:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    usage: "UI, body, product, and data"
  editorialAccent:
    fontFamily: "Fraunces, Georgia, serif"
    usage: "5–10%; standalone editorial statement or quote only"
    fontSize: "28px / 32px / 36px"
    fontWeight: 500
    lineHeight: "35px / 39px / 43px"
    letterSpacing: "-0.01em"
    fontStyle: "normal Roman"
    opticalSizing: "auto"
    loadedAxes: ["opsz"]
    excludedAxes: ["SOFT", "WONK"]
    italic: "off in core v1"
  scalePolicy:
    anchor: "16px"
    ratio: 1.25
    rounding: "optical rounding to 2px/4px steps"
  responsiveSteps:
    compact: "0–639px"
    standard: "640–1279px"
    wide: ">=1280px"
  display:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "40px / 48px / 60px"
    fontWeight: 600
    lineHeight: "43px / 51px / 63px"
    letterSpacing: "-0.03em / -0.035em / -0.04em"
  heading:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "30px / 36px / 40px"
    fontWeight: 600
    lineHeight: "36px / 42px / 46px"
    letterSpacing: "-0.02em / -0.025em / -0.03em"
  subheading:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "22px / 24px / 24px"
    fontWeight: 600
    lineHeight: "29px / 31px / 31px"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
    measure: "55–70ch"
  uiData:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "0"
    numerals: "tabular"
  technicalException:
    fontFamily: "Space Grotesk, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0.05em"
    casing: "uppercase only for 1–3 word micro-labels"
  weightPolicy:
    core: [400, 500, 600]
    exceptional: 700
    excluded: [300]
rounded:
  control: "0.5rem"
  card: "0.75rem"
  media: "1rem"
  pill: "9999px"
spacing:
  card: "1rem"
  content: "1.5rem"
  section: "4rem"
  public-container: "72rem"
  reading-container: "48rem"
  admin-container: "90rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-action}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "0 0.625rem"
    height: "2rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "0 0.625rem"
    height: "2rem"
  card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.card}"
    padding: "1rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "0 0.625rem"
    height: "2rem"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    rounded: "{rounded.pill}"
    padding: "0 0.5rem"
    height: "1.25rem"
  evidence-card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.card}"
    padding: "1rem"
---

# Design System: Niuva

## Overview

**Creative North Star: "The Precision Workshop"**

The incumbent system treats the interface like a working design-engineering bench: calm enough to inspect, structured enough to act, and specific enough to show how an idea becomes a product. A light-first foundation provides the open work surface; explicit dark zones create a focused working surface for positioning and process. Niuva Blue is a measured signal for action, identity, and emphasis rather than a decorative wash.

The visual voice is quiet, precise, human, and evidence-led. Its character comes from clear hierarchy, process markers, technical metadata, and real artefacts—not from generic technology decoration. The system must stay recognizably Niuva while resisting generic SaaS composition, AI-slop patterns, gradients, glassmorphism, neon or glow effects, decorative blobs, oversized pills, and unmotivated 3D.

**Key Characteristics:**

- Light-first surfaces with deliberate dark working zones.
- Measured blue signal against cool paper and slate graphite.
- Structured asymmetric grids that preserve reading and action paths.
- Space Grotesk-led human-facing type with a restrained Fraunces editorial accent.
- Evidence, process, and outcome before technology spectacle.

**The Evidence Before Ornament Rule.** Every visual motif should help a visitor understand a real capability, process, decision, or state.

## Design System Architecture v1

The Niuva Design System is organized as eight governed layers: Foundation,
Primitives, Core Components, Motion System, Creative Components, Decorative
Effects, Patterns, and Governance. The source and promotion registry lives in
`src/app/auis/styleguide/registry/design-system.ts`; the rendered review surface
is `/auis/styleguide#architecture`.

Base UI is the primary interaction primitive, native HTML remains the default
when it provides the needed semantics, shadcn is used as a source distribution
for source-owned core components, and Lucide is the approved icon vocabulary.
React Bits, Animate UI, Cult UI, Aceternity, and Magic UI are reference sources,
not automatic dependencies or visual direction. Motion System v1 is now an
approved styleguide-only CSS-first proof with no new dependency; a runtime Motion
engine remains a candidate for future physics, gesture, or layout needs.

The promotion path is `reference → candidate → proof → approved → official`.
Creative components and decorative effects require provenance, accessibility,
performance, static fallback, and visual acceptance. Patterns compose official
components and do not introduce tokens, primitives, or domain rules. Product
screen propagation remains a separate authorization gate. The owner has
authorized, but not yet accepted, a bounded proof for `/` and `/project-brief`;
checkout, admin, Creative, Decorative, and bulk propagation remain outside the
scope.

The current styleguide proof includes four approved Patterns grounded in Niuva
flows: Hero / case-study opener, Product discovery, Checkout Summary, and Admin
Action Queue. Their approval is limited to the styleguide; any product-route use
remains a separate gate.

The revised Foundation Visual Proof passed owner review on 2026-09-03 for
styleguide-only scope. It covers the accepted palette, contrast pairs,
semantic states, Typography System v1.0, rhythm and shape roles, primitive/core
behavior, CTA contrast, desktop/mobile layout, keyboard focus, reduced motion,
and recovery states. Product-screen propagation remains a separate gate.

The approved Foundation is applied as a bounded product-screen proof on the
public homepage and B2B project brief only. The owner has not yet accepted this
visual proof. It does not make the proof-only project brief a functional
submission flow or open blanket product-screen propagation.

The initial P0/P1 component set passed its renewed visual review on 2026-09-02
for styleguide-only scope. The proof covered the current eight composites,
responsive layout, semantic states, visible focus/recovery paths, CTA contrast,
and aligned compact summary cards. New component defaults and product-screen
usage require their own review gate; Creative and Decorative layers remain
separate review gates.

## Colors

The palette is a cool industrial scale: Niuva Blue carries identity and action, while paper, slate, and graphite create inspectable surfaces with enough contrast for public, checkout, and admin contexts.

### Primary

- **Niuva Blue:** The locked identity accent and primary action signal. Use it deliberately on calls to action, labels, focus, and selected emphasis.
- **Blue Paper:** A quiet brand-tinted surface for entry paths and grouped action areas.
- **Blue Mist:** A lighter structural cue for borders, dividers, and subdued emphasis.
- **Blue Ink:** A deep brand surface for high-contrast text and grounded emphasis.

### Neutral

- **Cool Paper:** The light-first page canvas.
- **Paper White:** The clean card and content surface.
- **Quiet Surface:** Muted grouping and low-emphasis control backgrounds.
- **Line Slate:** Light dividers and control borders.
- **Muted Slate:** Secondary copy and supporting metadata.
- **Dark Line:** Dividers and borders on working surfaces.
- **Working Slate:** Dark panels and focused process surfaces.
- **Graphite:** Primary text and dark-on-accent control text.

### Semantic States

- **Success:** Completion and accepted-file feedback; pair the state text with its pale surface and border.
- **Warning:** Work that needs attention or confirmation.
- **Info:** Neutral progress and informative status.
- **Destructive:** Errors, invalid input, and blocked recovery paths.

**The Measured Accent Rule.** Niuva Blue earns attention through scarcity and placement; it should identify the next useful action, not tint every surface.

## Typography

**Primary Font:** Space Grotesk (with Arial, Helvetica, sans-serif fallback) for display, headings, body, UI, product, and data.  
**Editorial Accent:** Fraunces (with Georgia, serif fallback), limited to approximately 5–10% of typography for standalone statements or quotes.  
**Mono Policy:** Typography System v1.0 has no third mono family. Technical micro-labels remain Space Grotesk and use the tightly bounded exception below.

**Character:** Space Grotesk keeps operational UI direct and engineered; Fraunces introduces a selective editorial pause without turning product controls or data into decoration.

### Hierarchy

- **Display** (600): `40/43`, `48/51`, `60/63`; tracking `-0.03em`, `-0.035em`, `-0.04em` across compact, standard, and wide.
- **Heading** (600): `30/36`, `36/42`, `40/46`; tracking `-0.02em`, `-0.025em`, `-0.03em`.
- **Subheading** (600): `22/29`, `24/31`, `24/31`; tracking `-0.015em`.
- **Body** (400): `16/24`, tracking `0`, with a `55–70ch` reading measure.
- **UI / data** (500): `14/20`, tracking `0`, with tabular numerals.
- **Editorial accent** (Fraunces 500): `28/35`, `32/39`, `36/43`; tracking `-0.01em`; normal Roman with optical sizing enabled and only `opsz` loaded.
- **Technical micro-label exception** (Space Grotesk 500): `12/18`, tracking `0.05em`; uppercase only for 1–3 words.

The scale uses a `16px` anchor, a `1.25` ratio, optical rounding to `2px/4px` steps, and the viewport bands compact `0–639px`, standard `640–1279px`, and wide `>=1280px`. Core weights are `400/500/600`; `700` is exceptional and `300` is excluded. Fraunces `SOFT`, `WONK`, and core italic are not loaded.

**The Human-First Type Rule.** Do not use uppercase, tracking, axis variation, or the editorial family as decoration. Every treatment must clarify hierarchy, meaning, or reading pace.

**Approval boundary:** Typography System v1.0 was approved by the owner on 2026-08-29 for foundation/styleguide scope. Its use on `/` and `/project-brief` remains pending within the named scoped proof; root/global tokens, shared component definitions, and other product screens remain unchanged until separately authorized.

## Layout

Public content uses a generous 72rem container, with a 48rem reading measure and a 90rem admin measure available for denser operational work. The default horizontal padding is 1.25rem on small screens and 2rem from the small breakpoint upward. Large sections begin with a 4rem rhythm and expand to 5rem on wider screens; related content uses 1.5rem gaps and tight cards use 1rem gaps.

The layout language is structured rather than symmetrical by default: narrative and proof can sit in a two-column relationship, while entry paths use a 12-column composition at large widths. Small screens collapse into readable stacks; navigation can wrap into a full-width row and preserve horizontal access. Dark surfaces are explicit context changes, not an automatic theme switch.

## Elevation & Depth

Depth is conveyed first through tonal layering and restrained rings or borders. Cards stay close to their surface with a quiet card shadow; floating depth is reserved for temporary overlays and focused elevated UI. The system is neither shadowless nor glossy: elevation should explain hierarchy and interaction state.

### Shadow Vocabulary

- **Card quiet:** `box-shadow: 0 1px 2px rgb(15 23 42 / 0.06)` for reusable evidence and operational cards.
- **Floating:** `box-shadow: 0 16px 32px rgb(15 23 42 / 0.12), 0 2px 8px rgb(15 23 42 / 0.08)` for temporary overlays and elevated process previews.

**The Flat-By-Default Rule.** A surface earns elevation only when it is a card, overlay, or interaction state; do not add a shadow to make an otherwise empty composition feel finished.

## Shapes

Controls use gently rounded 8px corners. Cards and panels use 12px corners; media frames use 16px corners. Full pills are reserved for compact badges, tags, and status metadata, not general buttons or page containers. Borders are thin and purposeful, and file-upload affordances use a dashed border to communicate an input boundary.

## Components

### Buttons

- **Shape:** Compact rounded controls (8px) with a 32px default height; small and large sizes step down or up without changing the silhouette.
- **Primary:** Niuva Blue fill with graphite text; use for the next meaningful action and keep the label direct.
- **Hover / Focus:** Shift the fill or surface modestly on hover; use the shared 3px focus ring and visible border treatment for keyboard focus; active feedback is a restrained downward translation.
- **Secondary / Ghost:** Outline uses a paper or transparent surface with a border; ghost stays visually quiet until hover or focus.

### Chips

- **Style:** Compact 20px badges with full rounding; outline is the default for evidence metadata and status labels, while filled tones communicate semantic state.
- **State:** Use chips to label or summarize, not as a substitute for primary navigation or a large action.

### Cards / Containers

- **Corner Style:** 12px card corners, with 16px media corners when an image or visual frame is present.
- **Background:** Paper White on light surfaces; the semantic card surface follows the explicit dark context on working surfaces.
- **Shadow Strategy:** Use the quiet card shadow for evidence and operational grouping; use floating depth only when the card leaves the document flow.
- **Border:** A quiet ring or thin border provides separation without turning every card into a framed tile.
- **Internal Padding:** 1rem by default and 0.75rem for compact operational cards.

### Inputs / Fields

- **Style:** Full-width, 32px-high inputs with 8px corners, a visible neutral border, transparent or context-appropriate background, and compact horizontal padding.
- **Focus:** The shared Niuva Blue ring and border shift make the active field obvious without a glow.
- **Error / Disabled:** Destructive and disabled states change border, surface, copy, and affordance together; errors explain the problem and expose the next recovery action.

### Navigation

- **Style:** A focused dark header uses a bottom divider, horizontal links, muted default text, and foreground hover; on small screens the links become a full-width scrollable or wrapped row before returning inline on wider screens.
- **Action:** The primary navigation action uses the same button contract as the rest of the system.

### Evidence Cards and Action Queue

Evidence cards organize capability, process, and project proof with an eyebrow, title, description, optional metadata, and optional action. Action Queue items reuse the card structure but add a compact kind label, technical reference, timestamp, semantic status badge, and action footer. These are the system's signature patterns because they connect visual hierarchy to Niuva's real operating context.

## Do's and Don'ts

### Do:

- **Do** lead with the product outcome, project evidence, or next decision before exposing technology detail.
- **Do** use the existing Niuva token roles and component contracts so public, checkout, and admin surfaces share an identity while retaining their appropriate density.
- **Do** use real project, workshop, process, material, and product evidence when imagery or case-study content is available.
- **Do** preserve visible keyboard focus, descriptive states, reduced-motion behavior, and readable contrast.
- **Do** let asymmetry, labels, and process structure create character where a generic card grid would flatten the story.

### Don't:

- **Don't** default to generic SaaS hero layouts, indiscriminate card grids, decorative blobs, gradients, glassmorphism, neon, glow, or unmotivated 3D.
- **Don't** use technical motifs that do not explain a real Niuva process, material, decision, or state.
- **Don't** fabricate client outcomes, testimonials, metrics, inventory, pricing decisions, or visual evidence.
- **Don't** turn every action into a pill or every surface into a floating card.
- **Don't** use typography, color, or motion as decoration when it reduces scanability or obscures the next action.
