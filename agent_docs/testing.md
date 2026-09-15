# Testing

## Required Before Completion

- [ ] Relevant tests pass.
- [ ] Typecheck/build passes.
- [ ] User-visible changes are checked in a browser or device when applicable.
- [ ] No tests were skipped or weakened without human approval.
- [ ] Evidence is reported in the final response.

## Commands

- All unit/integration tests: `corepack pnpm test`
- Single test: `corepack pnpm exec vitest run tests/unit/<name>.test.tsx`
- E2E: `corepack pnpm test:e2e`
- Local demo E2E: `corepack pnpm test:e2e:demo`
- Typecheck: `corepack pnpm typecheck`
- Lint: `corepack pnpm lint`
- Build: `corepack pnpm build`
- First-time browser setup: `corepack pnpm exec playwright install chromium`
- Browser/device check: Playwright plus manual desktop/mobile, keyboard, focus, reduced-motion, and Visual Proof review

The scripts and test configurations now exist. The browser smoke test starts the
local Next dev server through Playwright's `webServer` configuration.

## Local demo mode

The provider-neutral demo is an explicit, local-only runtime. Start its
loopback database, apply migrations, and seed the deterministic catalog with:

```text
corepack pnpm db:demo:start
corepack pnpm db:demo:migrate
corepack pnpm db:demo:seed
corepack pnpm test:e2e:demo
```

The demo browser flow exercises the real server boundaries from Project Brief
submission and database persistence, through the read-only Action Queue demo,
then the seeded catalog, cart, server shipping rates, idempotent checkout, and
the `PENDING_PAYMENT` order state. Its shipping/payment adapters never call an
external provider and label persisted snapshots `DEMO`. This evidence does not
prove Clerk sign-in, private R2 access, WhatsApp delivery, Biteship/Midtrans
sandbox behavior, or production readiness.

The standard Playwright config intentionally excludes `local-demo.spec.ts` and
overrides database/demo environment variables with blank values, keeping the
57-test preview suite deterministic even when the local demo database has been
seeded.

## What To Test

| Change type | Minimum check |
|-------------|---------------|
| Pure logic | Unit test |
| API/data flow | Integration test |
| UI behavior | Browser/device check |
| Auth, billing, migrations, deployment | Human review plus focused test |
| Pricing/state/payment/storage | Boundary, negative, idempotency, and authorization tests |

## Mandatory coverage

- Pricing: PLA/ABS boundaries at 0, 1, 199, 200, 201, 499, 500, and 501 g; decimal grams; partial-hour duration; own filament; quantity semantics; HALF_UP only at the end.
- State machines: reject invalid transitions; stale webhooks cannot revert `PAID`; cancelled/completed orders cannot silently re-enter processing.
- Integration: order transaction, stock reservation, duplicate checkout, Midtrans signature/amount/idempotency, Biteship normalization/timeout, R2 upload/expiry, admin authorization, and quote immutability.
- Security/failure: spoofed MIME, wrong extension, oversized upload, expired URL, unauthorized admin, out-of-stock, failed/expired payment, wrong webhook signature, provider timeout, email failure, DB failure, and missing env.

## Required end-to-end flows

1. Ready-made retail normal flow.
2. Ready-made retail with a different variant and destination.
3. Custom print request → operator review → quote → payment → production/QC → shipping payment.
4. Separate B2B project brief → admin visibility.

Before public launch, record at least three successful end-to-end test
transactions, complete the B2B flow test, and run an Owner/Admin usability
session without a critical blocker.

## Visual verification

- Use `Generate → Render → Inspect → Refine → Test` for user-visible work.
- Check token compliance, component reuse, real Niuva content, desktop, mobile, keyboard, focus, loading, empty, validation, error, success, and reduced motion.
- UI Foundation / Visual Proof requires explicit user acceptance before patterns are propagated across all screens.
- A green build or test suite is technical evidence, not visual approval.
