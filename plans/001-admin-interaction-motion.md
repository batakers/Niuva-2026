# 001 — Add the approved quiet Admin interaction motion

- **Status**: IMPLEMENTED — mechanical verification passed; actual-route motion feel and Owner visual review pending.
- **Base commit**: dbbdaaf
- **Severity**: MEDIUM
- **Category**: Missed opportunities, interruptibility, accessibility
- **Estimated scope**: four existing Admin components, one shared motion helper, one CSS module, focused lifecycle tests, and the owning design contract.

## Problem

The Owner approved direction A in chat: quiet, quick feedback at four existing Admin seams. The dropdown body and notification surfaces currently appear/disappear without a transition. Adding an exit requires retaining its contents briefly without leaving dismissed actions usable.

Source examples before implementation:

```tsx
// C:/Portfolio/NIUVA 2026/src/components/niuva/admin-account-menu.tsx:49
{open ? <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-floating">
```

```tsx
// C:/Portfolio/NIUVA 2026/src/components/niuva/admin-notification-toast.tsx:22
{items.length ? <>
```

`C:/Portfolio/NIUVA 2026/src/components/niuva/admin-notification-center.tsx:82` already uses Base UI Popover. Extend its documented starting/ending transition states. `C:/Portfolio/NIUVA 2026/src/components/niuva/admin-sidebar.tsx:80` has a custom icon trigger without press motion.

## Target

Use the approved Niuva curve `cubic-bezier(0.2, 0, 0, 1)` through `--ease-standard-token`, the existing `--duration-fast-token: 150ms`, and `--duration-normal-token: 220ms` from `src/app/globals.css:101`.

| Surface | Enter | Exit | Origin |
| --- | --- | --- | --- |
| Attention toast group | opacity 0 to 1; translateY(8px) to translateY(0); 220ms | reverse the same path; 150ms | bottom-right placement remains unchanged |
| Bell popover | opacity 0 to 1; scale(0.98) to scale(1); 220ms | reverse; 150ms | Base UI `var(--transform-origin)` |
| Account dropdown body | opacity 0 to 1; scale(0.98) to scale(1); 150ms | reverse; 150ms | top right |
| Custom icon press | translateY(0) to translateY(1px); 100ms | return to translateY(0); 100ms | pointer/touch presses only |

Only transform and opacity animate. Use transitions, never entrance keyframes. Keyboard-originated menu/panel changes and focus feedback are immediate. Reduced motion stops nonessential movement and exit retention, following the current `DESIGN.md:120` rather than introducing the skill's generic alternative.

## Repo conventions to follow

- Keep Admin components in `src/components/niuva`. Use a colocated CSS module for the scoped motion; installed Next CSS documentation recommends CSS modules for nonglobal rules.
- Existing Button press feedback is already present in `src/components/ui/button.tsx:7`; add it only to the selected custom icon controls.
- Keep notification bootstrap, attention filtering, 12-second expiry, pause on focus/hover, read status, polling, links, and permissions intact.
- Keep the native account markup and its existing outside/Escape handling. Add only the state necessary for entrance/exit presence and immediate keyboard handling.

## Steps

1. Add failing consumer tests for toast/account exit retention, inert dismissed contents, reopening before exit finishes, and immediate reduced-motion/keyboard closing. Keep real components; stub only network and media-query boundaries.
2. Add a small client helper for reduced-motion preference, pointer interaction detection, pointer press feedback, and a cancellable 150ms exit retention. Preserve the latest toast contents only until the exit ends. Handle preference changes while closing.
3. Add scoped CSS transitions and starting styles in `src/components/niuva/admin-interaction-motion.module.css` using the exact values above.
4. Apply them to `admin-notification-toast.tsx`, `admin-notification-center.tsx`, `admin-account-menu.tsx`, and `admin-sidebar.tsx`. Dismissed retained contents are inert and excluded from accessibility navigation. Opening again cancels the pending removal.
5. Record the agreed cross-Admin motion contract in `DESIGN.md`. Run focused tests and existing Admin regression tests, then the required lint/typecheck/unit/build gates.

## Boundaries

- No additional worktree, dependency, commit, push, migration, credential, provider, or auth-domain change.
- No animation of Overview cards/figures, graphs, search shortcuts, table/filter navigation, or sidebar width.
- Do not restyle public routes or globally change the existing Button/Popover primitives.
- Retain untracked scratch files and duplicate files from earlier work.

## Verification

- `corepack pnpm exec vitest run tests/unit/admin-interaction-motion.test.tsx tests/unit/admin-notification-center.test.tsx` must pass after demonstrating the new lifecycle test failure before implementation.
- `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`, and `git diff --check` must pass.
- Verify the actual Admin route at desktop and mobile when browser access is available. Check pointer/touch origins, rapid toggle reversal, keyboard Escape/focus, no stale clickable exit content, and reduced motion. At 10% playback, the popover originates at the bell, the account panel at top right, and the toast exits along its entrance path.
- Browser inspection was blocked by the browser policy in the previous discussion. Do not circumvent that restriction. Report runtime feel/visual acceptance as pending if it remains unavailable; provide the server URL for the Owner's actual-route review.
- Done when the four approved seams are implemented and mechanically verified, with the remaining visual evidence stated honestly.

## Execution evidence — 8 October 2026

- Executed natively and sequentially in the existing checkout on `codex/admin-interaction-motion`; one worktree remains.
- TDD: the original consumer tests demonstrated four missing exit-lifecycle failures. Additional keyboard-toast dismissal and outside-click focus tests failed before their fixes. The final focused run passed 11 tests across two files.
- `corepack pnpm lint` and `corepack pnpm typecheck`: exit 0.
- `corepack pnpm test`: 119 files / 1,400 tests passed.
- `corepack pnpm build`: exit 0, 91/91 static pages generated.
- `git diff --check`: passed.
- Browser motion/viewport inspection remains pending because the browser access policy rejected the previous inspection. No alternative browser surface or indirect browser execution was used. Unit checks cover focus/Escape/keyboard closing, reduced-motion changes, retained inert exits, replacement toast data, and interruption cancellation; they are not visual evidence.
