import { z } from "zod";
import { adminNewPasswordSchema } from "../admin-auth/password-policy";

const adminProvisioningInputSchema = z.object({
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password: adminNewPasswordSchema,
  profileId: z.uuid().optional(),
  confirmation: z.literal("I_UNDERSTAND_NON_PRODUCTION"),
  displayName: z.string().trim().min(1).max(120),
  role: z.enum(["OWNER", "ADMIN"]),
});

export type AdminProvisioningInput = z.infer<
  typeof adminProvisioningInputSchema
>;

export function parseAdminProvisioningInput(
  source: Readonly<Record<string, string | undefined>>,
): AdminProvisioningInput {
  const result = adminProvisioningInputSchema.safeParse({
    email: source.ADMIN_AUTH_EMAIL,
    password: source.ADMIN_AUTH_PASSWORD,
    profileId: source.ADMIN_PROFILE_ID?.trim() || undefined,
    confirmation: source.ADMIN_PROFILE_CONFIRMATION,
    displayName: source.ADMIN_PROFILE_DISPLAY_NAME,
    role: source.ADMIN_PROFILE_ROLE,
  });

  if (!result.success) {
    throw new Error(
      "Provisioning Admin memerlukan ADMIN_AUTH_EMAIL, ADMIN_AUTH_PASSWORD (8–15 karakter), ADMIN_PROFILE_ROLE, ADMIN_PROFILE_DISPLAY_NAME, dan konfirmasi non-production yang valid.",
    );
  }

  return result.data;
}

export function assertDevelopmentDatabaseUrl(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error("DATABASE_URL development wajib tersedia.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL development tidak valid.");
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  ) {
    throw new Error(
      "Provisioning AdminProfile hanya boleh memakai PostgreSQL development loopback.",
    );
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (!/(^|[_-])(dev|development)([_-]|$)/i.test(databaseName)) {
    throw new Error(
      "Nama database provisioning harus memuat marker dev atau development.",
    );
  }

  return url.toString();
}

export function requiresAdminProfileUpdate(
  existing: Readonly<{
    displayName: string | null;
    isActive: boolean;
    role: "OWNER" | "ADMIN";
  }> | null,
  desired: AdminProvisioningInput,
): boolean {
  return existing !== null && (
    existing.displayName !== desired.displayName ||
    !existing.isActive ||
    existing.role !== desired.role
  );
}
