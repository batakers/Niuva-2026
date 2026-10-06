import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDevelopmentDatabaseUrl, parseAdminProvisioningInput } from "../src/modules/admin/provisioning";
import { provisionAdminIdentity } from "../src/modules/admin-auth/provision";

if (process.env.NODE_ENV === "production") throw new Error("Provisioning lokal tidak boleh berjalan pada NODE_ENV production.");
// Use explicitly supplied process environment; never load or overwrite private env files.
const input = parseAdminProvisioningInput(process.env);
const databaseUrl = assertDevelopmentDatabaseUrl(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }) });
try {
  const result = await provisionAdminIdentity(prisma, input, process.env.ADMIN_PROFILE_ALLOW_UPDATE === "YES");
  console.log(`Profil Admin siap: id=${result.profileId} role=${result.role}. Verifikasi email dan enrollment authenticator masih wajib.`);
} catch {
  console.error("Provisioning gagal. Periksa input, mapping profil, dan flag perubahan eksplisit. Kredensial tidak ditampilkan.");
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
