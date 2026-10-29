import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaDatabaseBindingRepository } from "../src/modules/database-binding/repository";
import { activateStagingPricingRule, assertStagingPricingActivationEnvironment, StagingPricingActivationError } from "../src/modules/pricing/staging-activation";
import { AppError } from "../src/modules/shared/errors";

// Uses only the explicitly supplied process environment (see
// scripts/activate-staging-pricing.ps1); never loads private env files.
let prisma: PrismaClient | undefined;
try {
  const { expected, quantitySemantics } = assertStagingPricingActivationEnvironment(process.env);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "", max: 1 }) });
  const result = await activateStagingPricingRule(new PrismaDatabaseBindingRepository(prisma), expected, quantitySemantics);
  console.log(result.idempotent
    ? `Pricing staging sudah aktif: ${result.code} v${result.version} ${result.quantitySemantics}; tidak ada perubahan.`
    : `Pricing staging diaktifkan: ${result.code} v${result.version} ${result.quantitySemantics}.`);
} catch (error) {
  const reason = error instanceof StagingPricingActivationError ? error.reason
    : error instanceof AppError && error.code === "CONFLICT" ? "ACTIVE_RULE_CONFLICT"
      : "DATABASE_OR_BINDING_REJECTED";
  console.error(`Aktivasi pricing staging gagal (${reason}). Kredensial tidak ditampilkan.`);
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
