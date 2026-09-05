import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

import { minimizePaymentEventPayload } from "./payload";

export type CreatePaymentAttemptInput = Readonly<{
  amountRp: Prisma.Decimal;
  expiresAt: Date;
  orderId: string;
  providerOrderId: string;
  purpose: "ORDER_TOTAL" | "CUSTOM_SHIPPING";
}>;

export class PaymentRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async createPendingAttempt(input: CreatePaymentAttemptInput) {
    return this.prisma.paymentAttempt.create({
      data: {
        amountRp: input.amountRp,
        expiresAt: input.expiresAt,
        orderId: input.orderId,
        providerOrderId: input.providerOrderId,
        purpose: input.purpose,
      },
    });
  }

  async findEventByFingerprint(eventFingerprint: string) {
    return this.prisma.paymentEvent.findUnique({
      where: { eventFingerprint },
    });
  }

  async recordEvent(
    input: Readonly<{
      eventFingerprint: string;
      paymentAttemptId?: string;
      payload?: Readonly<Record<string, unknown>>;
      processingResult?: string;
      provider: string;
      providerOrderId: string;
      providerTransactionId?: string;
    }>,
  ) {
    return this.prisma.paymentEvent.create({
      data: {
        eventFingerprint: input.eventFingerprint,
        paymentAttemptId: input.paymentAttemptId,
        payloadJson: input.payload
          ? minimizePaymentEventPayload(input.payload)
          : undefined,
        processingResult: input.processingResult,
        provider: input.provider,
        providerOrderId: input.providerOrderId,
        providerTransactionId: input.providerTransactionId,
      },
    });
  }
}
