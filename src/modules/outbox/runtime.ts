import type { PrismaClient } from "../../generated/prisma/client";
import { requireAllowed, type CapabilityContext } from "../capabilities/resolver";
import { resolveCustomerAppOrigin } from "../customer-auth/app-origin";
import { CustomerEmailRepository } from "../customer-auth/email-repository";
import { createCustomerAuthMailer } from "../customer-auth/email-mailer";
import { CustomerPrivacyRepository } from "../customer-privacy/repository";
import { createPrivacyMailer } from "../customer-privacy/mailer";
import { readDatabaseBindingExpectation } from "../database-binding/core";
import { PrismaDatabaseBindingRepository } from "../database-binding/repository";
import { BoundDatabaseService } from "../database-binding/service";
import { OutboxPayloadCipher, readOutboxCipherConfig } from "./cipher";
import { PrismaOutboxRepository } from "./repository";
import { DurableOutboxService } from "./service";
import { CustomerOutboxProducer, type CustomerAuthProofDelivery, type CustomerPrivacyProofDelivery } from "./producer";

export function createOutboxBinding(prisma: PrismaClient, source: Readonly<Record<string, string | undefined>>, context: Omit<CapabilityContext, "env"> = {}) {
  return new BoundDatabaseService({ context: { ...context, env: Object.freeze({ ...source }) }, repositoryFactory: () => new PrismaDatabaseBindingRepository(prisma) });
}
function producer(prisma: PrismaClient, rawSource: Readonly<Record<string, string | undefined>>) {
  const source = Object.freeze({ ...rawSource });
  const decision = requireAllowed("emailDelivery", { env: source });
  readDatabaseBindingExpectation(source, decision.tier);
  if (!resolveCustomerAppOrigin(source).ok) throw new Error("Customer origin unavailable");
  const cipher = new OutboxPayloadCipher(readOutboxCipherConfig(source));
  const outbox = new DurableOutboxService({ bound: createOutboxBinding(prisma, source), repository: new PrismaOutboxRepository(), cipherFactory: () => cipher });
  return new CustomerOutboxProducer({ outbox, authRepository: new CustomerEmailRepository(prisma), privacyRepository: new CustomerPrivacyRepository(prisma) });
}
export function createCustomerAuthProofDelivery(repository: CustomerEmailRepository, source: Readonly<Record<string, string | undefined>> = process.env): CustomerAuthProofDelivery | null {
  try {
    if (!createCustomerAuthMailer(source)) return null;
    const queue = producer(repository.prisma, source);
    return { issue: input => queue.auth(input) };
  } catch { return null; }
}
export function createCustomerPrivacyProofDelivery(repository: CustomerPrivacyRepository, source: Readonly<Record<string, string | undefined>> = process.env): CustomerPrivacyProofDelivery | null {
  try {
    if (!createPrivacyMailer(source)) return null;
    const queue = producer(repository.prisma, source);
    return { issue: (actor, purpose, token) => queue.privacy(actor, purpose, token) };
  } catch { return null; }
}
