# Spec: R2 Private Upload Smoke

Status: `IMPLEMENTED_CODE_VERIFIED_OWNER_R2_SMOKE_OPEN` on 2026-09-16.
Module ID: `r2-private-upload-smoke`.

## Objective

Complete one non-production code-and-test vertical slice for the existing
private custom-print upload flow. The source already implements intent → direct
signed PUT → server-side HEAD/confirm → verified custom request. This Goal adds
the narrow browser policy needed for a future real-development-bucket smoke and
records automated evidence without activating a provider.

The customer outcome is unchanged: a customer can submit a supported 3D/CAD
file for operator review without exposing the object through a public URL.
The future operational smoke remains a development-only check showing
`PENDING → UPLOADED → VERIFIED` for a small synthetic file, followed by object
cleanup. It is not claimed as completed until an Owner performs the external
R2 setup and that real object evidence exists.

## Confirmed facts and assumptions

- The current implementation accepts the reviewed 100 MiB limit and explicit
  STL, 3MF, OBJ, STEP, and STP extension/MIME pairs.
- `StoredFile` uses a random private storage key; raw signed URLs and capability
  tokens are not persisted or rendered after upload.
- The local R2 capability group is currently absent. `CUSTOM_FILE_MAX_BYTES`
  and `APP_URL` are present, but no R2 secret or endpoint value was read.
- CSP now adds only the canonical HTTPS R2 origin to `connect-src` when the
  complete approved capability group is present in a non-production runtime.
  Missing, unsafe, incomplete, and production configurations keep the
  fail-closed baseline.
- The smoke uses a tiny synthetic fixture, a non-production private bucket, and
  an Owner-configured local environment. It never uses production resources or
  a customer file.

## Tech stack

- Next.js 16 App Router, TypeScript strict mode, and Node runtime route
  handlers.
- PostgreSQL/Prisma `StoredFile` lifecycle.
- Existing `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` R2 adapter.
- Existing client upload orchestration in `/custom-print/request`.

## Commands

```text
corepack pnpm test:backend -- tests/backend/security.test.ts
corepack pnpm exec vitest run tests/unit/custom-request-form.test.tsx
corepack pnpm test:integration
corepack pnpm exec playwright test tests/e2e/security-headers.spec.ts --workers=1
corepack pnpm test:e2e
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

The live smoke runs only after the Owner configures a complete development R2
capability group and exact-origin CORS outside source control. Its evidence is
non-secret status/transition data only.

## Project structure

```text
src/lib/security/headers.ts                 -> CSP construction
src/app/custom-print/request/request-form.tsx -> intent/PUT/confirm client flow
src/app/api/uploads/{intents,confirm}/route.ts -> server boundaries
src/modules/files/{r2,upload-service}.ts    -> signed URL and metadata verification
tests/backend/security.test.ts               -> CSP allowlist behavior
tests/unit/custom-request-form.test.tsx      -> browser orchestration
tests/integration/private-upload-route.test.ts -> database lifecycle with storage boundary
docs/backend/sandbox-local-setup.md          -> Owner-only R2 setup and smoke runbook
```

## Code style

The CSP allowlist derives a canonical HTTPS origin only from a complete
non-production R2 capability group, rejects malformed or credential-bearing
values, and preserves the exact existing policy when R2 is not configured.

```ts
const r2Origin = hasCompleteR2UploadCapability(environment)
  ? getSafeHttpsOrigin(environment.R2_ENDPOINT)
  : undefined;
const connectSources = [
  "'self'",
  ...(r2Origin === undefined ? [] : [r2Origin]),
].join(" ");
```

No broad wildcard, bucket public URL, raw signed URL, or secret may enter the
CSP, browser state, logs, audits, tests, or documentation.

## Testing strategy

- RED/GREEN unit test: a complete HTTPS R2 endpoint adds only its canonical
  origin to `connect-src`; absent, malformed, credential-bearing, or non-HTTPS
  values do not weaken the baseline CSP.
- Existing unit/backend/integration coverage continues to verify supported
  metadata, capability expiry, rejected cleanup, and ownership transition.
- Browser verification confirms the custom request retains a recoverable state;
  the real development smoke confirms intent → PUT → confirm without exposing a
  public object URL.
- After a real smoke, inspect only non-secret outcomes: HTTP statuses, stored
  lifecycle state, absence of public URL, and explicit fixture cleanup.

## Boundaries

- Always: preserve private bucket scope, random keys, metadata confirmation,
  100 MiB limit, and server-owned lifecycle transitions.
- Ask first: R2 dashboard/bucket/CORS changes, adding dependencies, migrations,
  changing the approved upload limit or retention policy, using a non-local
  database, or retaining a smoke object.
- Never: read/print/commit R2 secrets, use a production bucket, enable public
  access, upload a customer file for smoke, weaken CSP with wildcards, proxy
  binaries through the app server, or claim provider verification without a
  real R2 object smoke.

## Success criteria

1. [x] The existing client can connect only to the configured canonical R2
   HTTPS origin when the complete capability is enabled; without it, CSP stays
   at the current fail-closed baseline.
2. [x] Existing unit and integration coverage verifies that a synthetic upload
   reaches `UPLOADED` only after HEAD metadata matches and becomes `VERIFIED`
   only after ownership binding, without rendering a public URL.
3. [x] A real development-bucket smoke completed on 2026-09-18 with a
   synthetic 4-byte fixture. Intent `201`, exact-origin CORS preflight `204`,
   direct PUT `200`, confirm `200`, and custom request `201` were observed;
   the stored-file lifecycle reached `VERIFIED`, then the object and synthetic
   database rows were cleaned up. No public URL was enabled.
4. [x] Relevant focused unit/backend/integration/browser gates, typecheck,
   lint, build, and `git diff --check` are recorded below.

## Verification evidence

- `corepack pnpm test:backend -- tests/backend/security.test.ts`: 22 files,
  116 tests passed.
- `corepack pnpm exec vitest run tests/unit/custom-request-form.test.tsx`: 7
  tests passed.
- `corepack pnpm test:integration`: 6 files, 17 tests passed against the
  isolated loopback test database.
- `corepack pnpm exec playwright test tests/e2e/security-headers.spec.ts
  --workers=1`: passed. A controlled `NODE_ENV=test` server also returned 200
  for `/` and the expected fail-closed 503 for `/admin`, with no R2 origin in
  its CSP when the R2 capability was absent.
- `corepack pnpm test:e2e`: 55/57 passed. The two remaining failures concern
  the untouched public “Smart Drop Box” case-study navigation, not the upload
  or security-header paths; they remain a separate public-pages baseline item.
- `corepack pnpm typecheck` and `corepack pnpm build`: passed. `corepack pnpm
  lint` exited successfully with existing warnings outside this slice.
- Real non-production smoke on the Owner-configured development R2 bucket:
  HTTP `201/204/200/200/201` for intent/CORS/PUT/confirm/request, lifecycle
  `PENDING → UPLOADED → VERIFIED`, and post-cleanup HEAD `NOT_FOUND`. The
  private bucket remained non-public; no secret, signed URL, or customer file
  was recorded.

## Open questions

- `BLOCKED_DECISION`: legal/accounting retention outside the approved binary
  14/60/90-day lifecycle remains unchanged and is not part of this Goal.
