# 002 — Scroll smoothly to in-page anchors, and land the Services anchor below the header

- **Status**: IMPLEMENTED (T54) — mechanical and Playwright checks passed; Owner visual review pending.
- **Commit**: 3df76db
- **Severity**: MEDIUM
- **Category**: Missed opportunities (spatial consistency), accessibility
- **Estimated scope**: `globals.css` (one rule), `layout.tsx` (one attribute), two route files (one attribute each, one anchor fix)

## Problem

Links that jump to a section further down the same page teleport there, so the jump reads like a new page load:

```tsx
// src/app/custom-print/page.tsx:104 (header action), :115 and :116 — current
headerAction={{ href: "#start-custom", label: "Pilih titik mulai" }}
<NiuvaLink className="min-h-11" href="#start-custom" variant="onBrand">Pilih titik mulai</NiuvaLink>
<a className="…" href="#workflow">Lihat alurnya</a>
```

```tsx
// src/app/services/[slug]/page.tsx:88 — current
<a className="…" href="#related-projects-title">Lihat proyek terkait</a>
```

No route sets `scroll-behavior`. The only rule is the reduced-motion override at `src/app/globals.css:344` (`scroll-behavior: auto !important` on `*`).

Separate defect found in the same sweep: the Services target is the `<h2 id="related-projects-title">` (`src/app/services/[slug]/page.tsx:133`), but `scroll-mt-24` sits on its parent `<section>` (`:131`). Measured on the dev server: after the jump the heading's top is at y=0 and the sticky header ends at y=72, so the heading is hidden behind the header. The two `/custom-print` targets carry `id` and `scroll-mt-24` on the same `<section>` and land correctly (heading at y=192).

## Target

- Native smooth scrolling only on pages that opt in, so the skip link and form error-summary jumps on other pages stay instant:

```css
/* src/app/globals.css, @layer base */
html:has([data-smooth-anchors]) {
  scroll-behavior: smooth;
}
```

- `<html data-scroll-behavior="smooth">` in the root layout. Next 16 then sets `html.style.scrollBehavior = "auto"` while it scrolls during a route change (`node_modules/next/dist/shared/lib/router/utils/disable-smooth-scroll.js:14`) and keeps smooth scrolling for hash-only changes. Without it, entering `/custom-print` from a scrolled page would glide to the top.
- Duration and curve stay browser-controlled. Native smooth scroll is interruptible by wheel, touch and keys, which a scripted scroll would have to rebuild.
- Reduced motion: the existing `scroll-behavior: auto !important` rule wins over the new rule. No new reduced-motion code.
- The Services link lands its section like `/custom-print`: the `<section>` gets `id="related-projects"` and the link points to `#related-projects`. `aria-labelledby` keeps pointing at the heading id.

## Repo conventions to follow

- Base rules live in `@layer base` in `src/app/globals.css`; the reduced-motion block is at the end of the file and must stay last.
- Exemplar target: `src/app/custom-print/page.tsx:128` — `id` and `scroll-mt-24` on the same `<section>`.

## Steps

1. `src/app/globals.css`: add the `html:has([data-smooth-anchors])` rule above inside `@layer base`, with a one-line comment saying which pages opt in and why it is scoped.
2. `src/app/layout.tsx`: add `data-scroll-behavior="smooth"` to `<html>`.
3. `src/app/custom-print/page.tsx:105`: `<main id="main-content" data-custom-print data-smooth-anchors>`.
4. `src/app/services/[slug]/page.tsx:74`: `<main id="main-content" data-smooth-anchors>`; at `:131` add `id="related-projects"` to the `<section>`; at `:88` change the link to `href="#related-projects"`.

## Boundaries

- Do NOT set `scroll-behavior: smooth` on `html` globally.
- Do NOT script the scroll (`scrollIntoView`, rAF); do NOT touch skip links or error-summary links.
- Do NOT change section spacing or `scroll-mt-*` values.

## Verification

- **Mechanical**: `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test` pass.
- **Feel check** (Chromium, 1440 and 390 wide):
  - `/custom-print`: "Lihat alurnya", "Pilih titik mulai" (hero and header) glide down; a wheel turn mid-glide stops it.
  - `/services/desain-rekayasa`: "Lihat proyek terkait" glides and the heading ends below the header.
  - From a scrolled `/custom-print`, open "Toko" in the header: the new page starts at the top instantly.
  - From a scrolled `/shop`, open "Custom 3D Print": the page starts at the top instantly.
  - `/shop` computes `scroll-behavior: auto`.
  - With reduced motion, `/custom-print` computes `scroll-behavior: auto` and the jump is instant.
- **Done when**: scrollY sampled 60ms after an anchor click sits strictly between start and target on both pages; the Services heading top is greater than the header bottom; both cross-route checks start at scrollY 0 on their first frame.
