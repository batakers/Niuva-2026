import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PaymentWebhookRepository, WEBHOOK_TRANSACTION_OPTIONS } from "@/modules/payment/webhook-repository";

describe("Midtrans webhook transaction budget", () => {
  it("processes a notification with the bound 10 s wait and 20 s timeout, not Prisma's 5 s default", async () => {
    const transaction = vi.fn(async () => ({ outcome: "captured" }));
    const repository = new PaymentWebhookRepository({ $transaction: transaction } as unknown as PrismaClient);
    await repository.processMidtransWebhook({} as Parameters<PaymentWebhookRepository["processMidtransWebhook"]>[0]);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), WEBHOOK_TRANSACTION_OPTIONS);
    expect(WEBHOOK_TRANSACTION_OPTIONS).toEqual({ maxWait: 10_000, timeout: 20_000 });
  });
});
