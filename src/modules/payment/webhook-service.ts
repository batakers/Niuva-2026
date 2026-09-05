import { validateStartupEnvironment } from "@/lib/env/server";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { recordAudit, type AuditRecorder } from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";

import {
  createMidtransEventFingerprint,
  parseMidtransNotification,
  verifyMidtransNotificationSignature,
} from "./midtrans";
import {
  PaymentWebhookRepository,
  type MidtransWebhookResult,
} from "./webhook-repository";

export interface PaymentWebhookRepositoryPort {
  processMidtransWebhook(input: Readonly<{
    eventFingerprint: string;
    notification: ReturnType<typeof parseMidtransNotification>;
    now: Date;
  }>): Promise<MidtransWebhookResult>;
}

export type PaymentWebhookServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  now?: () => Date;
  repository?: PaymentWebhookRepositoryPort;
  serverKey?: string;
}>;

export class PaymentWebhookService {
  private readonly audit?: AuditRecorder;
  private readonly clock: () => Date;
  private readonly repositoryFactory: () => PaymentWebhookRepositoryPort;
  private readonly serverKey?: string;

  constructor(dependencies: PaymentWebhookServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.clock = dependencies.now ?? (() => new Date());
    this.repositoryFactory = () =>
      dependencies.repository ?? new PaymentWebhookRepository();
    this.serverKey = dependencies.serverKey;
  }

  async handleMidtransNotification(input: unknown): Promise<MidtransWebhookResult> {
    const notification = parseMidtransNotification(input);
    verifyMidtransNotificationSignature(notification, this.getServerKey());
    const result = await this.repositoryFactory().processMidtransWebhook({
      eventFingerprint: createMidtransEventFingerprint(notification),
      notification,
      now: this.clock(),
    });

    if (result.kind !== "DUPLICATE" && result.orderId !== undefined) {
      await recordAudit(this.audit, {
        action: "payment.webhook.processed",
        actorType: "SYSTEM",
        afterJson: { processingResult: result.processingResult },
        entityId: result.orderId,
        entityType: "PaymentEvent",
        metadata: {
          outcome: result.kind,
          provider: "MIDTRANS",
        },
      });
    }

    if (result.kind === "AMOUNT_MISMATCH") {
      throw appError("PAYMENT_VERIFICATION_FAILED", {
        message: "Notifikasi pembayaran tidak cocok dengan data pembayaran.",
      });
    }

    return result;
  }

  private getServerKey(): string {
    if (this.serverKey !== undefined) {
      return this.serverKey;
    }

    const environment = validateStartupEnvironment(process.env);

    if (
      environment.MIDTRANS_IS_PRODUCTION === undefined ||
      environment.MIDTRANS_SERVER_KEY === undefined ||
      environment.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY === undefined
    ) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Midtrans belum dikonfigurasi.",
      });
    }

    assertNonProductionProvider({
      isLiveProvider: environment.MIDTRANS_IS_PRODUCTION,
      nodeEnv: environment.NODE_ENV,
      provider: "Midtrans",
    });

    return environment.MIDTRANS_SERVER_KEY;
  }
}
