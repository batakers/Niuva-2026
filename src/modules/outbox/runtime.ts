import { resolveDeployment } from "@/lib/env/server";
import { createRuntimeBoundDatabase } from "@/modules/database-binding/runtime";
import { appError } from "@/modules/shared/errors";
import { createCustomerAuthMailer } from "@/modules/customer-auth/email-mailer";
import { createPrivacyMailer } from "@/modules/customer-privacy/mailer";

import { readOutboxCipherConfig, OutboxPayloadCipher } from "./cipher";
import { PrismaOutboxRepository } from "./repository";
import { DurableOutboxService } from "./service";
import { DurableOutboxWorker } from "./worker";
import { PrismaOutboxWorkerRepository } from "./worker-repository";
import { parseWorkerPolicy } from "./worker-core";
import { CustomerOutboxSender } from "./customer-sender";

const OUTBOX_CONFIGURATION_KEYS = [
  "NIUVA_DATABASE_BINDING_ID",
  "NIUVA_OUTBOX_ENCRYPTION_KEY_ID",
  "NIUVA_OUTBOX_ENCRYPTION_KEY",
] as const;

/**
 * Local internal/test flows retain their explicitly guarded inline mail path
 * until a complete database binding and encryption configuration is supplied.
 * Staging/production always receive the durable path, whose capability and
 * database-binding checks still decide whether any work is allowed.
 */
export function createRuntimeCustomerOutbox(
  source: Readonly<Record<string, string | undefined>> = process.env,
): DurableOutboxService | null {
  const env = Object.freeze({ ...source });
  const hasOutboxConfiguration = OUTBOX_CONFIGURATION_KEYS.some((key) => Boolean(env[key]?.trim()));
  let localTest = false;
  try {
    localTest = resolveDeployment(env).tier === "local-test";
  } catch {
    // Invalid deployment settings must take the fail-closed durable path.
  }
  if (localTest && !hasOutboxConfiguration) return null;

  const { bound } = createRuntimeBoundDatabase(env);
  return new DurableOutboxService({
    bound,
    repository: new PrismaOutboxRepository(),
    cipherFactory: () => new OutboxPayloadCipher(readOutboxCipherConfig(env)),
  });
}

export function readRuntimeOutboxWorkerPolicy(source: Readonly<Record<string, string | undefined>>) {
  const integer = (key: string) => {
    const raw = source[key];
    if (raw === undefined || !/^\d+$/.test(raw)) throw appError("PROVIDER_UNAVAILABLE");
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) throw appError("PROVIDER_UNAVAILABLE");
    return value;
  };
  const delays = source.NIUVA_OUTBOX_RETRY_DELAYS_MS;
  if (delays === undefined) throw appError("PROVIDER_UNAVAILABLE");
  const retryDelaysMs = delays.trim() === "" ? [] : delays.split(",").map(value => {
    if (!/^\d+$/.test(value.trim())) throw appError("PROVIDER_UNAVAILABLE");
    return Number(value.trim());
  });
  try {
    return parseWorkerPolicy({
      leaseMs: integer("NIUVA_OUTBOX_LEASE_MS"),
      sendTimeoutMs: integer("NIUVA_OUTBOX_SEND_TIMEOUT_MS"),
      retryDelaysMs,
    });
  } catch {
    throw appError("PROVIDER_UNAVAILABLE");
  }
}

export function createRuntimeCustomerOutboxWorker(source: Readonly<Record<string, string | undefined>> = process.env) {
  const env = Object.freeze({ ...source });
  const policy = readRuntimeOutboxWorkerPolicy(env);
  const { prisma, bound } = createRuntimeBoundDatabase(env);
  const repository = new PrismaOutboxWorkerRepository();
  const worker = new DurableOutboxWorker({
    bound,
    repository,
    cipherFactory: () => new OutboxPayloadCipher(readOutboxCipherConfig(env)),
    senderFactory: () => new CustomerOutboxSender({
      auth: createCustomerAuthMailer(env),
      privacy: createPrivacyMailer(env),
    }),
    policy,
  });
  return { env, prisma, bound, policy, repository, worker };
}
