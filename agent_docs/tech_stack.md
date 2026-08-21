# Tech Stack

Last verified against project authority: 2026-08-21. Vendor versions, quotas,
pricing, and compatibility must be checked against official sources before
installation and again before launch.

## Stack

| Area | Choice | Notes |
|------|--------|-------|
| Language | TypeScript strict mode | No `any`; validate runtime input |
| Frontend | Next.js 16.3 App Router | Server Components by default; Client Components only for interaction |
| Backend | Next.js server runtime on Node.js 24 LTS | Modular monolith; Route Handlers and authenticated Server Actions call domain services |
| Database | Neon PostgreSQL + Prisma | Separate local/staging/production data; Decimal money; reviewed migrations |
| Auth | Clerk for Owner/Admin only | Guest checkout and tokenized customer status/quote access |
| Styling | Tailwind CSS + shadcn/ui + Base UI | Semantic tokens, Niuva component layer, Visual Proof gate |
| UI support | Motion, Lucide, Embla, TanStack Table, React Hook Form + Zod | Add only where the documented use case exists |
| Storage | Cloudflare R2 | Separate private customer files and public media; direct presigned uploads |
| Payments | Midtrans Snap | Server-created attempts; verified and idempotent webhook is authoritative |
| Shipping | Biteship Rates API | Ready-made rate snapshot at checkout; custom rate after final measurement |
| Email | Resend | Send after DB commit; email failure must not corrupt order/payment state |
| Observability | Sentry + Vercel logs + DB audit logs | Redact PII, secrets, payloads, and signed URLs |
| Deployment | Vercel Pro | Preview/staging separated from production; activation and DNS need approval |
| Package manager | pnpm | Commit the future lockfile |
| Product AI | None | AI is development assistance only |

## Commands

These are expected post-scaffold scripts from the Tech Design. They are not
runnable until the application and `package.json` exist.

- Setup: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- E2E: `pnpm test:e2e`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Build: `pnpm build`
- Prisma generate: `pnpm prisma generate`
- Development migration: `pnpm prisma migrate dev`
- Deployment migration: `pnpm prisma migrate deploy`
- Browser/device check: `pnpm test:e2e` plus manual desktop/mobile, keyboard, focus, reduced-motion, and Visual Proof review

The Tech Design's bootstrap command (`pnpm create next-app@latest niuva`)
assumes a parent directory. This workspace is already the intended project
root, so the bootstrap location/options must be approved before running it.

## Important Patterns

- Rendering/data fetching: Server Components for initial reads; keep `'use client'` at the smallest interactive boundary.
- Domain boundary: `src/modules/<domain>/schema.ts|service.ts|repository.ts|types.ts|errors.ts`.
- State management: No global client-state library is selected. Choose the smallest pattern during the approved feature plan.
- Forms/validation: React Hook Form where client complexity warrants it; Zod and server validation remain authoritative.
- Money/pricing: Prisma/PostgreSQL Decimal plus `decimal.js`; persist rule version, input snapshots, unrounded subtotal, and final HALF_UP total.
- Orders/state: Explicit transition maps, idempotency keys/events, immutable product/shipping/quote snapshots, and audit logs.
- Uploads: Private R2, random keys, short-lived presigned URLs, metadata verification, and configurable maximum size.
- Errors: Stable typed error codes for UI; correlation IDs in technical logs; never expose stack traces or secrets.
- Logging/monitoring: Sentry, Vercel logs, and DB audit records with PII and credential minimization.

## Environment boundaries

- Local: development/staging Neon, provider sandboxes, R2 dev scope, and Resend test domain.
- Preview: staging database and sandbox credentials only.
- Production: separate production services and `niuva.id` only after explicit approval.
- Never point preview deployments at production data or expose server keys to the browser.

## Cost constraints

- First-month budget: approximately Rp1.000.000.
- Recurring target: at most Rp500.000/month.
- Provider costs in the Tech Design are estimates; set spend alerts and verify current official pricing before commitment.
