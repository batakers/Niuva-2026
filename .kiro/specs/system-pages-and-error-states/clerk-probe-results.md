# Clerk sign-in probe results (task 13.2)

Local, non-production evidence. Clerk **Development instance** (keys from `.env.local`, values not recorded).

## Method

- Next.js 16.3.2 (Turbopack) `next dev -p 3137` with `NIUVA_NEXT_DIST_DIR=.next-probe-13-2` (separate dist dir).
- Chromium via Playwright (temporary script), new browser context per path, **no login session**.
- Each path: `goto` (domcontentloaded), wait 8 s plus network idle (max 15 s) so Clerk JS can render or redirect, then read the final URL, HTTP status of the first response, page title, headings, Clerk root presence and visible sign-up links (computed style `display`/`visibility`, bounding box).
- State under test: proxy fix in `src/proxy.ts` (`isAdminSignInPath`) and task 13.1 (`footerAction` hidden) both applied; route file is still `src/app/admin/sign-in/page.tsx` (no catch-all).

## Results

| Requested path | First response | Final URL (path) | Classification | Visible sign-up link |
| --- | --- | --- | --- | --- |
| `/admin/sign-in` | 200 | `/admin/sign-in` | `sign-in-rendered` (Clerk "Sign in to NIUVA" with Google + email/password) | No |
| `/admin/sign-in/factor-one` | 404 | `/admin/sign-in/factor-one` | `not-found-404` (root not-found page "Halaman ini tidak tersedia.") | No (page has no Clerk UI) |
| `/admin/sign-in/factor-two` | 404 | `/admin/sign-in/factor-two` | `not-found-404` | No |
| `/admin/sign-in/sso-callback` | 404 | `/admin/sign-in/sso-callback` | `not-found-404` | No |
| `/admin/sign-in-other` | 200 | `/admin/sign-in` | `redirected-to-sign-in` (expected: still protected, R10.5/R10.6) | No |

Notes:

- Sub-steps are no longer redirected by the proxy (proxy fix confirmed working), but the route tree has no file for them, so Next.js answers 404. This confirms the open question 2 in design.md Keputusan E.
- `/admin/sign-in-other` remains protected and redirects to `/admin/sign-in`, so the proxy fix does not over-match (R10.5, R10.6).
- Sign-up link: on `/admin/sign-in` and the redirected `/admin/sign-in-other` one "Sign up" anchor exists in the DOM but its computed style is hidden (zero visible sign-up links), consistent with `elements.footerAction: { display: "none" }` from 13.1. No sign-up route exists.

## Still unverified (R10.10)

- Whether Clerk renders a genuine in-progress step (for example `factor-one` after a real identifier submission) at its sub-step URL. That needs a test Clerk account with a second factor, which is not available. A direct unauthenticated visit to a sub-step URL is not equivalent.

## Input for task 13.3

Three probed sub-steps (`factor-one`, `factor-two`, `sso-callback`) return 404 on the requested URL instead of rendering Clerk. Per the 13.3 condition ("any probed sub-step returns 404 or does not render the Clerk sign-in on the requested URL"), the catch-all move to `src/app/admin/sign-in/[[...sign-in]]/page.tsx` is triggered. 13.2 performed no route change.

## Cleanup

Dev server stopped, temporary script and dist dir `.next-probe-13-2` removed, `tsconfig.json` restored to its pre-probe content.

---

# Post-move re-probe (task 13.3)

Local, non-production evidence. Clerk **Development instance** (keys from `.env.local`, values not recorded).

## Change applied

- `src/app/admin/sign-in/page.tsx` moved (plain file move, not staged) to `src/app/admin/sign-in/[[...sign-in]]/page.tsx`. Only one route file now serves that URL tree; the old location holds no other file.
- Kept unchanged: `routing="path"`, `path="/admin/sign-in"`, `forceRedirectUrl="/admin"`, `withSignUp={false}`, `elements.footerAction: { display: "none" }`, `metadata.robots` (`index: false`, `follow: false`).
- `tests/unit/admin-sign-in.test.tsx` import updated to `@/app/admin/sign-in/[[...sign-in]]/page`. No other test or source file imported the old path.
- `tests/unit/admin-sign-in.test.tsx` and `tests/unit/admin-proxy.test.ts`: 20 of 20 tests pass after the move.

## Method

Same as 13.2: `next dev -p 3137` with `NIUVA_NEXT_DIST_DIR=.next-probe-13-3`, Chromium via Playwright (temporary script), new browser context per path, no login session, `domcontentloaded` + 8 s wait + network idle (max 15 s).

## Results

| Requested path | First response | Final URL (path) | Classification | Clerk sign-in rendered | Visible sign-up link |
| --- | --- | --- | --- | --- | --- |
| `/admin/sign-in` | 200 | `/admin/sign-in` | `sign-in-rendered` (title "Admin sign-in · Niuva", heading "Sign in to NIUVA") | Yes, on the requested URL | No |
| `/admin/sign-in/factor-one` | 200 | `/admin/sign-in` | `sign-in-rendered-after-redirect-to-start` | Yes, but on `/admin/sign-in`, not on the requested URL | No |
| `/admin/sign-in/factor-two` | 200 | `/admin/sign-in` | `sign-in-rendered-after-redirect-to-start` | Yes, but on `/admin/sign-in`, not on the requested URL | No |
| `/admin/sign-in/sso-callback` | 200 | `/admin/sign-in` | `sign-in-rendered-after-redirect-to-start` | Yes, but on `/admin/sign-in`, not on the requested URL | No |
| `/admin/sign-in-other` | 200 | `/admin/sign-in` | `redirected-to-sign-in` (expected: still protected, R10.5/R10.6) | Yes, after proxy redirect | No |

## Interpretation

- The three sub-steps changed from `not-found-404` (13.2) to a 200 response that renders the Clerk sign-in. The catch-all route resolves them, so the 404 defect is fixed (R10.2, R10.7).
- The final URL for the sub-steps is `/admin/sign-in`. The route no longer 404s and the proxy does not redirect them (fixed in 13.1/proxy work), so this is consistent with Clerk's client-side router sending an unauthenticated visit with no in-progress sign-in attempt back to the start step. The redirect source was not isolated with a separate network trace.
- So "rendered on the requested URL" holds only for `/admin/sign-in`. The three sub-steps render the Clerk sign-in after Clerk's own redirect to the start step. This is the expected behavior for a direct visit without an active attempt and is not a 404 or a blank page.
- `/admin/sign-in-other` still redirects to `/admin/sign-in`, so the proxy does not over-match (R10.5, R10.6). `/admin/sign-in` behaves as before: Clerk renders, zero visible sign-up links, no sign-up route (R10.8, R10.9).

## Still unverified (R10.10)

- Whether Clerk keeps a genuine in-progress step on its own sub-step URL (for example `factor-one` after a real identifier submission) is not verified. It needs a test Clerk account with a second factor, which is not available here.
- No physical-device, assistive-technology, or production evidence.

## Cleanup

Dev server stopped (port 3137 free), temporary probe script and `.next-probe-13-3` removed, `tsconfig.json` restored to its pre-probe content (the dev server had appended `.next-probe-13-3` include entries). Nothing staged or committed.
