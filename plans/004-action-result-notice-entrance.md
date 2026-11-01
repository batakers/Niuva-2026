# 004 — Let action-result notices enter instead of appearing at once

- **Status**: IMPLEMENTED (T54) — mechanical and Playwright checks passed; Owner visual review pending.
- **Commit**: 3df76db
- **Severity**: LOW
- **Category**: Missed opportunities (feedback, preventing a jarring change)
- **Estimated scope**: `StatusNotice` (one optional prop), two client components

## Problem

Results of a click render a `StatusNotice` under the button with no bridge:

```tsx
// src/app/shop/[slug]/product-selection.tsx:130 — current
{cartResult === "added" || cartResult === "recovered" ? (
  <div className="mt-5">
    <StatusNotice tone="success" title="Masuk ke keranjang." … />
```

```tsx
// src/app/custom-print/request/request-form.tsx:684–724 — current
{result === "ready" && isPreview ? (<StatusNotice … title="Preview request siap ditinjau." tone="success" />) : null}
{result === "ready" && isLive && referenceNumber ? (<div className="space-y-3"><StatusNotice … title="Request tersimpan untuk review operator." tone="success" />…
{result === "unavailable" ? (<StatusNotice … tone="info" />) : null}
{result === "error" ? (<StatusNotice … tone="error" />) : null}
```

"Request tersimpan" is a rare, high-emotion moment. `StatusNotice` is also rendered server-side with the page (for example the Customer-login warning on `/custom-print`). Those must keep appearing from the first frame (DESIGN.md Motion: no section entrance animation).

## Target

- `StatusNotice` gains `enter?: boolean` (default `false`). When true it appends `motionSystemClasses.enter` from plan 003: opacity 0 → 1 and translate `0 8px` → `0 0`, 220ms, standard curve, entry only.
- Only client-state results pass `enter`: the add-to-cart success and error notices, and the four request result notices above. No server-rendered notice passes it.
- Reduced motion: collapsed by the global rule at `src/app/globals.css:344`.

## Repo conventions to follow

- `StatusNotice` merges classes with `cn()` (`src/components/niuva/status-notice.tsx:86`); add the class there.
- Depends on plan 003 for `src/design/motion.ts`.

## Steps

1. `status-notice.tsx`: add `enter?: boolean` to `StatusNoticeProps` with a doc comment ("result of a client action; never for notices rendered with the page"), destructure it, and append `enter && motionSystemClasses.enter` inside `cn()` before `className`.
2. `product-selection.tsx`: pass `enter` to the two result notices.
3. `request-form.tsx`: pass `enter` to the four result notices.
4. Add a unit test in `tests/unit/niuva-components.test.tsx`: without `enter` the notice has no `starting:` class; with `enter` it has `starting:opacity-0`.

## Boundaries

- Do NOT change roles, live-region behaviour, focus (`statusRef`), copy, or the error-summary block.
- Do NOT pass `enter` to notices outside the two files above.

## Verification

- **Mechanical**: lint, typecheck, unit tests (including the new test) pass.
- **Feel check**: on a preview product (`/shop/<slug>?preview=examples`), choose a variant and add to cart; the notice rises 8px while fading in. On `/custom-print` the login warning, if shown, does not fade on load.
- **Done when**: the added notice reports `CSSTransition`s for `opacity` and `translate` (220ms) right after the click, and a server-rendered notice reports none after load.
