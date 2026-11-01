# 003 — Bring the quote confirmation panel in with a 220ms rise

- **Status**: IMPLEMENTED (T54) — mechanical and Playwright checks passed; Owner visual review pending.
- **Commit**: 3df76db
- **Severity**: MEDIUM
- **Category**: Missed opportunities (state indication)
- **Estimated scope**: one new shared class module, two client components (one class each)

## Problem

Choosing "Terima quote" or "Tolak quote" mounts an inline `role="alertdialog"` panel between the buttons with no bridge. It is a rare, high-stakes moment where the page changes from choosing to confirming:

```tsx
// src/app/quote/[token]/quote-review.tsx:394 — current
<div
  aria-labelledby="quote-confirmation-title"
  className="rounded-[var(--radius-card)] border border-warning-border bg-warning-background p-5 text-warning focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-6"
  ref={decisionRef}
  …
  role="alertdialog"
  tabIndex={-1}
>
```

```tsx
// src/app/account/make/[id]/quote-decision.tsx:87 — current
<div
  aria-labelledby="account-quote-confirmation-title"
  className="rounded-[var(--radius-card)] border border-warning-border bg-warning-background p-5 text-warning focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
  …
  role="alertdialog"
  tabIndex={-1}
>
```

Both panels receive focus on mount; that must not wait for the motion.

## Target

One shared class for inline content that appears after a click, using CSS `@starting-style` (Tailwind `starting:` variant), so no JS lifecycle is added:

```ts
// src/design/motion.ts
transition-[opacity,translate] duration-[var(--duration-normal-token)] starting:translate-y-2 starting:opacity-0
```

- Enter: opacity 0 → 1 and translate `0 8px` → `0 0` over `--duration-normal-token` (220ms) on the default curve `--ease-standard-token` (`cubic-bezier(0.2, 0, 0, 1)`, set by `--default-transition-timing-function`). 8px matches the approved Admin toast path.
- No exit animation: Kembali/Escape and the submitted result remove or replace the panel at once.
- Focus still moves on the first frame.
- Browsers without `@starting-style` show the panel at once, exactly as today.
- Reduced motion: the global rule at `src/app/globals.css:344` collapses the transition to 0.01ms.

## Repo conventions to follow

- Shared class strings live in `src/design/` (exemplar: `src/design/typography.ts`, an `as const` object of `className` strings imported as `type`).
- Token durations are written `duration-[var(--duration-normal-token)]` (exemplar: `src/app/custom-print/page.tsx:234`).

## Steps

1. Create `src/design/motion.ts` exporting `motionSystemClasses = { enter: "<class above>" } as const` with a one-line doc comment.
2. `quote-review.tsx`: import it and append `motionSystemClasses.enter` to the panel `className` via `cn()` or a template string, matching the file's existing idiom.
3. `quote-decision.tsx`: the same.

## Boundaries

- Do NOT change focus handling, Escape handling, copy, or markup.
- Do NOT animate height, and do NOT add exit retention.

## Verification

- **Mechanical**: lint, typecheck and unit tests pass.
- **Feel check**: `/quote/preview-quote?preview=examples`, choose accept and decline:
  - the panel rises 8px while fading in, about a fifth of a second;
  - focus lands on the panel immediately;
  - at 10% playback in DevTools Animations, only `opacity` and `translate` move.
  - Under reduced motion the panel appears at once.
- **Done when**: on open, `getAnimations()` on the panel returns `CSSTransition`s for `opacity` and `translate` with a 220ms duration, and none under reduced motion.
