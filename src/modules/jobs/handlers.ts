import type { PrismaClient } from "../../generated/prisma/client";
import type { BoundDatabaseService } from "../database-binding/service";
import { InternalAuthCleanupRepository } from "../customer-auth/internal-cleanup";
import { CustomerPrivacyCleanupRepository } from "../customer-privacy/cleanup";
import { createCustomerAuthMailer } from "../customer-auth/email-mailer";
import { createPrivacyMailer } from "../customer-privacy/mailer";
import { createBusinessMailer } from "../outbox/business-mailer";
import { createBusinessOutboxHandler } from "../outbox/business-job";
import { OutboxPayloadCipher, readOutboxCipherConfig } from "../outbox/cipher";
import { CustomerOutboxSender } from "../outbox/customer-sender";
import { DurableOutboxService } from "../outbox/service";
import { PrismaOutboxRepository } from "../outbox/repository";
import { PrismaOutboxWorkerRepository } from "../outbox/worker-repository";
import { DurableOutboxWorker } from "../outbox/worker";
import { parseWorkerPolicy, type OutboxSender } from "../outbox/worker-core";
import type { JobHandler, JobName } from "./core";
import { expiredReservationBacklog } from "../inventory/repository";
import { expireRetailReservationsIn } from "../inventory/expiry-service";
import { createPaymentReconciliationHandler } from "../payment/reconciliation-job";
import { PaymentReconciliationRepository } from "../payment/reconciliation-repository";
import { createMidtransStatusGateway, type PaymentStatusGateway } from "../payment/status-gateway";

export function createJobHandlers(options: { prisma: PrismaClient; bound: Pick<BoundDatabaseService, "run">; source: Readonly<Record<string, string | undefined>>; workerPolicy?: unknown; businessPolicy?: unknown; senderFactory?: () => OutboxSender; paymentStatusFactory?: () => PaymentStatusGateway }): Readonly<Record<JobName, JobHandler>> {
  const source = Object.freeze({ ...options.source }), bound = options.bound;
  const workerPolicy = options.workerPolicy === undefined ? undefined : parseWorkerPolicy(options.workerPolicy);
  const cipherFactory = () => new OutboxPayloadCipher(readOutboxCipherConfig(source));
  const senderFactory = options.senderFactory ?? (() => new CustomerOutboxSender({ auth: createCustomerAuthMailer(source), privacy: createPrivacyMailer(source), business: createBusinessMailer(source) }));
  const outbox = new DurableOutboxService({ bound, repository: new PrismaOutboxRepository(), cipherFactory });
  const authCleanup = new InternalAuthCleanupRepository(options.prisma), privacyCleanup = new CustomerPrivacyCleanupRepository(options.prisma);
  return Object.freeze({
    OUTBOX_BUSINESS: createBusinessOutboxHandler(outbox, options.businessPolicy),
    PAYMENT_RECONCILIATION: createPaymentReconciliationHandler(options.paymentStatusFactory ?? (() => createMidtransStatusGateway(source)), new PaymentReconciliationRepository(options.prisma)),
    INVENTORY_RESERVATIONS: context => context.withLease(async (tx, now) => {
      const before = await expiredReservationBacklog(tx, now);
      const released = context.request.mode === "dry-run" ? 0 : await expireRetailReservationsIn(tx, now, context.request.limit);
      const after = context.request.mode === "dry-run" ? before : await expiredReservationBacklog(tx, now);
      if (context.lease) await context.verifyLease(tx);
      return { counts: { scanned: Math.min(before.remainingDue, context.request.limit), released, ...after } };
    }),
    OUTBOX_DELIVERY: async context => {
      const worker = new DurableOutboxWorker({ bound, repository: new PrismaOutboxWorkerRepository(), cipherFactory, senderFactory, policy: workerPolicy,
        coordination: { beforeClaim: tx => context.verifyLease(tx), recordCooldown: (tx, until) => context.recordCooldown(tx, until) } });
      const result = await worker.run({ mode: context.request.mode, limit: context.request.limit });
      const { mode: _mode, limit: _limit, cooldownMs, ...counts } = result;
      return { counts, cooldownMs, ...(result.unknown > 0 ? { failure: "OUTCOME_UNKNOWN" as const } : result.failed > 0 || result.lostLease > 0 ? { failure: "DELIVERY_FAILED" as const } : {}) };
    },
    OUTBOX_EXPIRY: async context => ({ counts: { expired: await context.withLease((tx, now) => outbox.expireIn(tx, now, context.request.limit, context.request.mode === "dry-run")) } }),
    CUSTOMER_AUTH_CLEANUP: async context => {
      const { dryRun: _dryRun, ...counts } = await context.withLease((tx, now) => authCleanup.cleanupIn(tx, now, context.request.mode === "dry-run", context.request.limit)); return { counts };
    },
    CUSTOMER_PRIVACY_CLEANUP: async context => {
      const { dryRun: _dryRun, ...counts } = await context.withLease((tx, now) => privacyCleanup.cleanupIn(tx, now, context.request.mode === "dry-run", context.request.limit)); return { counts };
    },
  });
}
