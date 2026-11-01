# 005 — Drop the public menu down from the header below 1280px

- **Status**: IMPLEMENTED (T54) — mechanical and Playwright checks passed; Owner visual review pending.
- **Commit**: 3df76db
- **Severity**: LOW
- **Category**: Missed opportunities (spatial consistency)
- **Estimated scope**: one class string in one component

## Problem

Below `xl` (1280px) the public menu toggles `hidden` → `flex` with no bridge:

```tsx
// src/components/niuva/public-navigation.tsx:52 — current
<nav id="public-navigation" aria-label="Navigasi utama"
  className={`${open ? "flex" : "hidden"} order-last w-full flex-col gap-1 border-t border-border pt-3 pb-2 xl:order-none xl:ml-8 xl:flex xl:w-auto xl:flex-1 xl:flex-row xl:items-center xl:gap-1 xl:border-0 xl:p-0`}>
```

At `xl` and above the same `<nav>` is always shown, so an unscoped entrance would fade the desktop navigation on every page load.

## Target

```txt
max-xl:transition-[opacity,translate] max-xl:starting:-translate-y-1 max-xl:starting:opacity-0
```

- Enter: opacity 0 → 1 and translate `0 -4px` → `0 0` over the default 150ms (`--default-transition-duration` → `--duration-fast-token`) on the standard curve. 150ms and the short path match the approved Admin menu timing.
- `@starting-style` applies because the element leaves `display: none`. No JS.
- Close stays instant; every link also closes the menu before navigating.
- Scoped with `max-xl:` so nothing moves at desktop widths, on load, or on resize.
- Reduced motion: collapsed by the global rule.

## Repo conventions to follow

- Fast feedback uses the default transition duration (exemplar: `navigationLinkClassName` at `src/components/niuva/public-navigation.tsx:29`, `transition-colors` without a duration).

## Steps

1. Append the three classes above to the `<nav>` class string.

## Boundaries

- Do NOT change the toggle, Escape handling, focus return, or link behaviour.
- Do NOT animate the header height.

## Verification

- **Mechanical**: lint, typecheck, unit tests; E2E `home`, `redesign-journeys` and `public-pages` menu tests pass.
- **Feel check**: at 390 and 1024 wide, open the menu; the links slide 4px down while fading in. At 1440 wide, reload: the navigation does not fade.
- **Done when**: on open below 1280px the `<nav>` reports `CSSTransition`s for `opacity` and `translate` (150ms), and at 1440px after load it reports none.
