import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { createOutboxBinding } from "@/modules/outbox/runtime";

export async function operationalJobFixture(database?: { prisma: PrismaClient; url: string }) {
  const admin = database?.prisma ?? getPrismaClient(), bindingId = randomUUID(), role = `niuva_job_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(getSafeTestDatabaseUrl({ TEST_DATABASE_URL: database?.url ?? process.env.TEST_DATABASE_URL }));
  if (await admin.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })) throw new Error("Foreign test marker");
  await admin.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "local-test" } });
  if (!/^niuva_job_[a-f0-9]{32}$/.test(role)) throw new Error("Invalid fixture role");
  await admin.$executeRawUnsafe(`CREATE ROLE "${role}" LOGIN NOINHERIT`);
  await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${role}"`);
  await admin.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${role}"`);
  await admin.$executeRawUnsafe(`REVOKE ALL ON deployment_database_bindings FROM "${role}"`);
  await admin.$executeRawUnsafe(`GRANT SELECT, UPDATE(id) ON deployment_database_bindings TO "${role}"`);
  url.username = role; url.password = "";
  const source = { DATABASE_URL: url.href, NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock", NIUVA_CUSTOMER_AUTH_MOCK: "true", APP_URL: "http://127.0.0.1:3000", NIUVA_DATABASE_BINDING_ID: bindingId, NIUVA_JOB_DATABASE_ROLE: role, RESEND_API_KEY: "synthetic-only", EMAIL_FROM: "fixture@example.test", NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "fixture", NIUVA_OUTBOX_ENCRYPTION_KEY: Buffer.alloc(32, 12).toString("base64") };
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href, max: 4 }) });
  return { admin, client, source, role, bound: createOutboxBinding(client, source), async dispose() {
    await client.$disconnect(); await admin.operationalJobState.deleteMany();
    await admin.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } });
    await admin.$executeRawUnsafe(`DROP OWNED BY "${role}"`); await admin.$executeRawUnsafe(`DROP ROLE "${role}"`);
  } };
}
