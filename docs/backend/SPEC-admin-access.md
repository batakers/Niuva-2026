# Spec: Admin Access

Status: owner-approved on 2026-09-10; Owner/Admin auth migration approved on
2026-10-06. Module ID: `admin-access`. The 6 October PRD and Tech Design addenda
and `admin-auth-migration.md` own the current authentication contract.

## Objective

Reintroduce `/admin` as a real server-protected entry point for an Owner or
Admin who already has an active Niuva `AdminProfile`. The page must never rely
on fixture data, client-side role values, or a development bypass. It prepares
the route boundary required by the later read-only `action-queue` module.

## Tech Stack

- Next.js 16 App Router and TypeScript strict mode.
- Self-hosted Better Auth for email/password sessions, verified email,
  mandatory TOTP, and recovery codes. Public Admin registration is disabled.
- PostgreSQL/Prisma `AdminProfile` for the active Niuva role.
- Existing `requireAdmin()`, `requireAdminPermission()`, and `/admin` proxy
  matcher as defense in depth.

## Commands

- Focused backend authorization: `corepack pnpm test:backend -- tests/backend/admin-auth.test.ts`
- Focused route/browser check: `corepack pnpm exec playwright test tests/e2e/admin-access.spec.ts --workers=1`
- Native login/MFA browser check: `corepack pnpm test:e2e:admin-auth`
- Typecheck: `corepack pnpm typecheck`
- Lint: `corepack pnpm lint`
- Production build: `corepack pnpm build`

## Project Structure

```text
src/app/admin/                 -> server-protected admin route and local UI
src/lib/auth/admin.ts          -> verified MFA and active-profile access boundary
src/lib/auth/admin-engine.ts   -> Better Auth configuration and session hooks
src/modules/admin-auth/        -> allowlisted HTTP surface, SMTP, and explicit provisioning
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

- Unit/backend tests cover missing or password-only sessions, unprovisioned
  identity, inactive profiles, and verified MFA with an active Owner/Admin role.
- PostgreSQL integration tests exercise the installed Better Auth engine,
  first enrollment, recovery, password reset, and preservation of profile IDs.
- Route/browser tests prove missing auth configuration fails closed. The native
  browser gate exercises enrollment, Dashboard access, logout, and fresh MFA.
- Automated tests use isolated loopback fixtures. Real accounts, SMTP delivery,
  deployment, physical devices, and Owner visual acceptance need their own evidence.

## Boundaries

- Always: authenticate and re-authorize on the server before a protected read;
  render only minimal profile data; preserve `AUTH_UNAVAILABLE`, `UNAUTHORIZED`,
  and `FORBIDDEN` as fail-closed outcomes.
- Follow the root `AGENTS.md` authorization contract for schema, dependencies,
  credentials, provisioning, deployment, and Git delivery. The approved auth
  migration includes its additive schema and library changes; production actions
  and real account identities require explicit instructions.
- Never: fake login, client-side role authorization, fixture fallback, secret
  inspection, automatic role promotion, or implicit linking to Customer data.

## Success Criteria

- `/admin` is matched by the native auth proxy and independently calls the
  server-side authorization boundary before rendering protected content.
- Anonymous and password-only sessions cannot read operational data; an identity
  without an active Niuva profile is forbidden. Existing role permissions apply
  only after email verification and MFA.
- Missing Better Auth configuration fails closed and reveals no admin data.
- The operational route contains no preview fixture. Account security controls
  are limited to the authenticated user's password and recovery codes.
- Focused tests, typecheck, lint, build, and the applicable browser check pass.

## Open Questions

- Owner provisioning is a guarded, explicit development procedure via
  `corepack pnpm db:provision:admin`. It requires email, password, explicit role,
  display name, and non-production confirmation on a loopback development DB.
  Migrating historical business data additionally requires the exact existing
  profile UUID. Login never creates or promotes an Admin profile implicitly.
- The ten real identities, SMTP configuration, and reviewed production
  provisioning/deployment remain operational inputs. See
  [the migration runbook](admin-auth-migration.md) for preparation and rollback.
