import { z } from "zod";

const adminProvisioningInputSchema = z.object({
  clerkUserId: z.string().trim().regex(/^user_[A-Za-z0-9_-]+$/),
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
    clerkUserId: source.ADMIN_PROFILE_CLERK_USER_ID,
    confirmation: source.ADMIN_PROFILE_CONFIRMATION,
    displayName: source.ADMIN_PROFILE_DISPLAY_NAME,
    role: source.ADMIN_PROFILE_ROLE,
  });

  if (!result.success) {
    throw new Error(
      "Provisioning AdminProfile memerlukan ADMIN_PROFILE_CLERK_USER_ID, ADMIN_PROFILE_ROLE, ADMIN_PROFILE_DISPLAY_NAME, dan konfirmasi non-production yang valid.",
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
