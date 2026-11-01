# Animation plans

Plans written with `improve-animations`. Each plan is self-contained; implementation happens in the existing checkout.

| Plan | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-admin-interaction-motion.md) | Quiet Admin interaction motion | MEDIUM | Implemented; checks passed; visual review pending |
| [002](002-smooth-in-page-anchors.md) | Smooth in-page anchors and the Services anchor offset | MEDIUM | Implemented (T54); checks passed; visual review pending |
| [003](003-quote-confirmation-entrance.md) | Quote confirmation panel entrance | MEDIUM | Implemented (T54); checks passed; visual review pending |
| [004](004-action-result-notice-entrance.md) | Action-result notice entrance | LOW | Implemented (T54); checks passed; visual review pending |
| [005](005-mobile-menu-entrance.md) | Public mobile menu entrance | LOW | Implemented (T54); checks passed; visual review pending |

001 was approved by the Owner in chat (quiet direction A, four Admin interaction seams). 002–005 come from the 2 November 2026 motion-opportunity sweep, which the Owner asked to implement in full.

## Order and dependencies

- 002 and 005 are independent.
- 003 creates `src/design/motion.ts`; 004 imports it, so run 003 before 004.
- Recommended order: 002, 003, 004, 005.

Preserve the current Niuva tokens and the rejected decorative motion recorded in `DESIGN.md` Motion and `docs/design/admin.md`.
