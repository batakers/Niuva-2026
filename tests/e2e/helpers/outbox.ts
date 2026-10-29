import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../../src/lib/db/test-safety";
import { createOutboxBinding } from "../../../src/modules/outbox/runtime";
import { OutboxPayloadCipher, readOutboxCipherConfig } from "../../../src/modules/outbox/cipher";
import { DurableOutboxWorker } from "../../../src/modules/outbox/worker";
import { PrismaOutboxWorkerRepository } from "../../../src/modules/outbox/worker-repository";
import { CustomerOutboxSender } from "../../../src/modules/outbox/customer-sender";
import { createCustomerAuthMailer } from "../../../src/modules/customer-auth/email-mailer";
import { createPrivacyMailer } from "../../../src/modules/customer-privacy/mailer";

export const E2E_OUTBOX_ENV = Object.freeze({
  NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock", NIUVA_DATABASE_BINDING_ID: "baf01014-0000-4000-8000-000000000002",
  NIUVA_OUTBOX_ENCRYPTION_KEY_ID: "e2e-fixture", NIUVA_OUTBOX_ENCRYPTION_KEY: Buffer.alloc(32, 13).toString("base64"),
  RESEND_API_KEY: "synthetic-e2e-only", EMAIL_FROM: "fixture@example.test", NIUVA_CUSTOMER_AUTH_MOCK: "true", NODE_ENV: "test",
});
export async function drainCustomerOutbox(): Promise<void> {
  const connectionString = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : undefined) });
  const source = { ...E2E_OUTBOX_ENV, DATABASE_URL: connectionString, APP_URL: `http://localhost:${process.env.NIUVA_E2E_PORT ?? 3000}` };
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 2 }) });
  try {
    const worker = new DurableOutboxWorker({ bound: createOutboxBinding(prisma, source), repository: new PrismaOutboxWorkerRepository(), cipherFactory: () => new OutboxPayloadCipher(readOutboxCipherConfig(source)), senderFactory: () => new CustomerOutboxSender({ auth: createCustomerAuthMailer(source), privacy: createPrivacyMailer(source) }), policy: { leaseMs: 60000, sendTimeoutMs: 1000, retryDelaysMs: [], runBudgetMs: 60000 } });
    await worker.run({ mode: "execute", limit: 100 });
  } finally { await prisma.$disconnect(); }
}
