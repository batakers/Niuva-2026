import { validateStartupEnvironment } from "@/lib/env/server";
import { classifyUnknownError } from "@/lib/observability/classify";
import type { FailureLogger } from "@/lib/observability/logger";
import { createPersistentFailureLogger } from "@/lib/observability/persistent-logger";
import { recordAudit, type AuditRecorder } from "@/modules/shared/audit";
import { appError, isAppError } from "@/modules/shared/errors";

import {
  assertMidtransPaymentAllowed,
  createMidtransEventFingerprint,
  type MidtransSnapGatewayConfig,
  parseMidtransNotification,
  pickCapabilityEnv,
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
  /**
   * Caller-owned capability inputs. When present, requireAllowed("payment")
   * runs before signature verification. Omitted with an injected serverKey:
   * no capability check (unchanged behaviour).
   */
  capability?: Omit<MidtransSnapGatewayConfig, "serverKey">;
  /**
   * Caller-provided environment used to resolve the server key and capability
   * when no serverKey is injected. Never read from process.env implicitly.
   */
  environment?: Readonly<Record<string, string | undefined>>;
  failureLogger?: FailureLogger;
  now?: () => Date;
  repository?: PaymentWebhookRepositoryPort;
  serverKey?: string;
}>;

export const MIDTRANS_WEBHOOK_BOUNDARY = "webhook:midtrans";

/** Tahap tempat kegagalan terjadi. Enum pendek, bukan data dari pihak luar. */
type WebhookFailureStage = "parse" | "verify" | "process" | "audit" | "amount";

function describeOutcome(
  stage: WebhookFailureStage,
  code: string,
): "AMOUNT_MISMATCH" | "SIGNATURE_INVALID" | "REJECTED" | "ERROR" {
  if (stage === "amount") return "AMOUNT_MISMATCH";
  if (stage === "verify" && code === "PAYMENT_VERIFICATION_FAILED") {
    return "SIGNATURE_INVALID";
  }
  return code === "INTERNAL_ERROR" ? "ERROR" : "REJECTED";
}

export class PaymentWebhookService {
  private readonly audit?: AuditRecorder;
  private readonly failureLogger: FailureLogger;
  private readonly clock: () => Date;
  private readonly repositoryFactory: () => PaymentWebhookRepositoryPort;
  private readonly serverKey?: string;
  private readonly capability?: Omit<MidtransSnapGatewayConfig, "serverKey">;
  private readonly environment?: Readonly<Record<string, string | undefined>>;

  constructor(dependencies: PaymentWebhookServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.failureLogger =
      dependencies.failureLogger ?? createPersistentFailureLogger();
    this.clock = dependencies.now ?? (() => new Date());
    this.repositoryFactory = () =>
      dependencies.repository ?? new PaymentWebhookRepository();
    this.serverKey = dependencies.serverKey;
    this.capability = dependencies.capability;
    this.environment = dependencies.environment;
  }

  async handleMidtransNotification(input: unknown): Promise<MidtransWebhookResult> {
    let stage: WebhookFailureStage = "parse";

    try {
      const notification = parseMidtransNotification(input);
      stage = "verify";
      verifyMidtransNotificationSignature(notification, this.getServerKey());
      stage = "process";
      const result = await this.repositoryFactory().processMidtransWebhook({
        eventFingerprint: createMidtransEventFingerprint(notification),
        notification,
        now: this.clock(),
      });

      if (result.kind !== "DUPLICATE" && result.orderId !== undefined) {
        stage = "audit";
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
        stage = "amount";
        throw appError("PAYMENT_VERIFICATION_FAILED", {
          message: "Notifikasi pembayaran tidak cocok dengan data pembayaran.",
        });
      }

      return result;
    } catch (error) {
      this.recordFailure(error, stage);
      throw error;
    }
  }

  /**
   * Mencatat kegagalan tanpa pernah mengubah hasilnya: error asli tetap
   * dilempar ulang oleh pemanggil. Konteks hanya memuat enum pendek; payload,
   * signature_key, gross_amount, order_id, server key, dan isi pesan error
   * tidak pernah masuk ke log.
   */
  private recordFailure(error: unknown, stage: WebhookFailureStage): void {
    try {
      const code = isAppError(error) ? error.code : "INTERNAL_ERROR";
      this.failureLogger.record({
        boundary: MIDTRANS_WEBHOOK_BOUNDARY,
        correlationId: crypto.randomUUID(),
        errorCode: code,
        kind: classifyUnknownError(error),
        occurredAt: this.clock(),
        safeContext: { outcome: describeOutcome(stage, code), stage },
      });
    } catch {
      // Logger yang gagal tidak boleh mengubah respons webhook.
    }
  }

  private getServerKey(): string {
    if (this.serverKey !== undefined) {
      if (this.capability !== undefined) {
        assertMidtransPaymentAllowed({
          ...this.capability,
          serverKey: this.serverKey,
        });
      }

      return this.serverKey;
    }

    if (this.environment === undefined) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Midtrans belum dikonfigurasi.",
      });
    }

    const environment = validateStartupEnvironment(this.environment);

    if (
      environment.MIDTRANS_IS_PRODUCTION === undefined ||
      environment.MIDTRANS_SERVER_KEY === undefined ||
      environment.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY === undefined
    ) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Midtrans belum dikonfigurasi.",
      });
    }

    // Legacy production/live rejection is kept inside the shared helper, then
    // the capability resolver can only tighten it further.
    assertMidtransPaymentAllowed({
      ...(this.capability ?? {}),
      capabilityEnv: pickCapabilityEnv(this.environment),
      isProduction: environment.MIDTRANS_IS_PRODUCTION,
      nodeEnv: environment.NODE_ENV,
      serverKey: environment.MIDTRANS_SERVER_KEY,
    });

    return environment.MIDTRANS_SERVER_KEY;
  }
}
