import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaDatabaseBindingRepository } from "../src/modules/database-binding/repository";
import {
  assertStagingOwnerBootstrapEnvironment,
  bootstrapStagingOwner,
  parseStagingOwnerBootstrapInput,
  StagingOwnerBootstrapError,
} from "../src/modules/admin/staging-owner-bootstrap";

// Uses only the explicitly supplied process environment (see
// scripts/bootstrap-staging-owner.ps1); never loads private env files.
let prisma: PrismaClient | undefined;
try {
  const expected = assertStagingOwnerBootstrapEnvironment(process.env);
  const input = parseStagingOwnerBootstrapInput(process.env);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "", max: 1 }) });
  const result = await bootstrapStagingOwner(new PrismaDatabaseBindingRepository(prisma), expected, input);
  console.log(`Owner staging dibuat: id=${result.profileId} role=${result.role}. Langkah berikut: masuk di /admin/sign-in, verifikasi email, lalu pasang authenticator.`);
} catch (error) {
  const reason = error instanceof StagingOwnerBootstrapError ? error.reason : "DATABASE_OR_BINDING_REJECTED";
  console.error(`Bootstrap Owner staging gagal (${reason}). Kredensial tidak ditampilkan.`);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
