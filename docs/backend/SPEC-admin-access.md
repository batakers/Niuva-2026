# Spec: Admin Access

Status: owner-approved on 2026-09-10. Module ID: `admin-access`.

## Objective

Reintroduce `/admin` as a real server-protected entry point for an Owner or
Admin who already has an active Niuva `AdminProfile`. The page must never rely
on fixture data, client-side role values, or a development bypass. It prepares
the route boundary required by the later read-only `action-queue` module.

## Tech Stack

- Next.js 16 App Router and TypeScript strict mode.
- `@clerk/nextjs` for the authenticated session only.
- PostgreSQL/Prisma `AdminProfile` for the active Niuva role.
- Existing `requireAdmin()`, `requireAdminPermission()`, and `/admin` proxy
  matcher as defense in depth.

## Commands

- Focused backend authorization: `corepack pnpm test:backend -- tests/backend/admin-auth.test.ts`
- Focused route/browser check: `corepack pnpm exec playwright test tests/e2e/admin-access.spec.ts --workers=1`
- Typecheck: `corepack pnpm typecheck`
- Lint: `corepack pnpm lint`
- Production build: `corepack pnpm build`

## Project Structure

```text
src/app/admin/                 -> server-protected admin route and local UI
src/lib/auth/clerk.ts          -> session and active-profile access boundary
src/modules/admin/             -> role/permission contracts and later queue projection
tests/backend/admin-auth.test.ts -> authorization boundary tests
tests/e2e/admin-access.spec.ts -> fail-closed browser/route behavior
```

## Code Style

Server reads authenticate before requesting any operational data. A page may
pass a minimal, server-derived view model to a client child only when interaction
is introduced later.

```ts
export default async function AdminPage() {
  const access = await requireAdmin();

  return <AdminAccessShell role={access.profile.role} />;
}
```

## Testing Strategy

- Unit/backend tests cover missing Clerk session, unprovisioned identity,
  inactive profile, and active Owner/Admin access.
- Route/browser tests prove `/admin` stays unavailable when Clerk credentials
  are absent and do not expose fixture content.
- A configured Clerk tenant plus a manually provisioned active profile requires
  a separate Owner manual smoke check; automated tests never use a production
  credential.

## Boundaries

- Always: authenticate and re-authorize on the server before a protected read;
  render only minimal profile data; preserve `AUTH_UNAVAILABLE`, `UNAUTHORIZED`,
  and `FORBIDDEN` as fail-closed outcomes.
- Ask first: any Prisma migration, package addition, Clerk dashboard change,
  credential/configuration change, or role/provisioning workflow.
- Never: fake login, client-side role authorization, fixture fallback, secret
  inspection, automatic profile creation, or a mutation in this module.

## Success Criteria

- `/admin` is matched by the existing Clerk proxy and independently calls the
  server-side authorization boundary before rendering protected content.
- An anonymous Clerk session is rejected; an identity without an active Niuva
  profile is forbidden; active `OWNER` and `ADMIN` profiles can enter.
- Missing Clerk configuration fails closed and reveals no admin data.
- The route contains no preview fixture or mutation control.
- Focused tests, typecheck, lint, build, and the applicable browser check pass.

## Open Questions

- `BLOCKED_DECISION`: how an Owner provisions and activates the first
  `AdminProfile`. This module assumes the profile already exists and does not
  add an implicit bootstrap mechanism.
