# Capability Map: Admin Rebuild

Status: scope map approved by owner on 2026-09-10. This is an implementation
map, not evidence that any live Clerk credential or admin profile has been
provisioned.

| Module ID | Responsibility | Depends on |
| --- | --- | --- |
| `admin-access` | Protect `/admin` with Clerk session validation plus an active, server-owned `AdminProfile` role check. | Existing Clerk boundary, `AdminProfile`, Prisma |
| `action-queue` | Read-only, server-owned projection of operational work that needs attention. | `admin-access`, domain repositories |
| `admin-operations` | Authenticated, authorized mutations for individual order, inquiry, custom-print, catalog, portfolio, and pricing workflows. | `action-queue`, per-domain service and audit contracts |
| `admin-provisioning` | Owner-controlled creation, activation, deactivation, and role changes for `AdminProfile`. | Explicit owner provisioning policy |

Build order: `admin-access` → `action-queue` → `admin-operations`.
`admin-provisioning` remains blocked until its owner policy is explicitly
approved; it is not a fallback path for missing Clerk configuration.
