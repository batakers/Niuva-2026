import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import type { DatabaseBindingExpectation } from "../database-binding/core";
import type { DatabaseBindingRepository } from "../database-binding/repository";
import { checkStagingOperatorEnvironment } from "../database-binding/staging-operator";
import { adminNewPasswordSchema } from "../admin-auth/password-policy";
import { provisionAdminIdentityInTransaction } from "../admin-auth/provision";

// One-time creation of the first Owner on the staging database. Admins are
// invited afterwards by that Owner through the existing invitation flow, so
// this path never creates an ADMIN and refuses once any Owner exists.

export const STAGING_OWNER_CONFIRMATION = "I_UNDERSTAND_STAGING_OWNER_BOOTSTRAP";

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: adminNewPasswordSchema,
  displayName: z.string().trim().min(1).max(120),
  confirmation: z.literal(STAGING_OWNER_CONFIRMATION),
});

export type StagingOwnerBootstrapInput = z.infer<typeof inputSchema>;

export class StagingOwnerBootstrapError extends Error {
  constructor(readonly reason: "INPUT_INVALID" | "NOT_STAGING" | "DATABASE_TLS_REQUIRED" | "BINDING_CONFIG_INVALID" | "OWNER_EXISTS") {
    super(`Bootstrap Owner staging ditolak (${reason}).`);
    this.name = "StagingOwnerBootstrapError";
  }
}

export function parseStagingOwnerBootstrapInput(source: Readonly<Record<string, string | undefined>>): StagingOwnerBootstrapInput {
  const parsed = inputSchema.safeParse({
    email: source.ADMIN_AUTH_EMAIL,
    password: source.ADMIN_AUTH_PASSWORD,
    displayName: source.ADMIN_PROFILE_DISPLAY_NAME,
    confirmation: source.ADMIN_PROFILE_CONFIRMATION,
  });
  if (!parsed.success) throw new StagingOwnerBootstrapError("INPUT_INVALID");
  return parsed.data;
}

/** Explicit staging tier, verify-full TLS and a binding ID; never production or local. */
export function assertStagingOwnerBootstrapEnvironment(source: Readonly<Record<string, string | undefined>>): DatabaseBindingExpectation {
  const checked = checkStagingOperatorEnvironment(source);
  if (!checked.ok) throw new StagingOwnerBootstrapError(checked.reason);
  return checked.expected;
}

export async function bootstrapStagingOwner(bindings: DatabaseBindingRepository, expected: DatabaseBindingExpectation, input: StagingOwnerBootstrapInput) {
  const passwordHash = await hashPassword(input.password);
  return bindings.withVerifiedBinding(expected, async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-staging-owner-bootstrap'))`;
    if (await tx.adminProfile.count({ where: { role: "OWNER" } }) > 0) throw new StagingOwnerBootstrapError("OWNER_EXISTS");
    return provisionAdminIdentityInTransaction(tx, { email: input.email, displayName: input.displayName, role: "OWNER" }, passwordHash);
  });
}
