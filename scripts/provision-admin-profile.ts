import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  assertDevelopmentDatabaseUrl,
  parseAdminProvisioningInput,
  requiresAdminProfileUpdate,
} from "../src/modules/admin/provisioning";

process.loadEnvFile(".env.local");

if (process.env.NODE_ENV === "production") {
  throw new Error("Provisioning AdminProfile tidak boleh berjalan pada NODE_ENV production.");
}

const input = parseAdminProvisioningInput(process.env);
const databaseUrl = assertDevelopmentDatabaseUrl(process.env.DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
    max: 1,
  }),
});

try {
  const existing = await prisma.adminProfile.findUnique({
    where: { clerkUserId: input.clerkUserId },
    select: { displayName: true, id: true, isActive: true, role: true },
  });

  if (requiresAdminProfileUpdate(existing, input) && process.env.ADMIN_PROFILE_ALLOW_UPDATE !== "YES") {
    throw new Error(
      "AdminProfile sudah ada tetapi berbeda atau nonaktif. Set ADMIN_PROFILE_ALLOW_UPDATE=YES untuk perubahan Owner yang disengaja.",
    );
  }

  const profile = existing === null
    ? await prisma.adminProfile.create({
      data: {
        clerkUserId: input.clerkUserId,
        displayName: input.displayName,
        isActive: true,
        role: input.role,
      },
      select: { clerkUserId: true, id: true, isActive: true, role: true },
    })
    : await prisma.adminProfile.update({
      where: { id: existing.id },
      data: {
        displayName: input.displayName,
        isActive: true,
        role: input.role,
      },
      select: { clerkUserId: true, id: true, isActive: true, role: true },
    });

  console.log(
    `AdminProfile aktif: id=${profile.id} clerkUserId=${profile.clerkUserId} role=${profile.role} active=${profile.isActive}`,
  );
} finally {
  await prisma.$disconnect();
}
