import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { FailureEvent, FailureLogger } from "@/lib/observability/logger";
import type { MidtransWebhookResult } from "@/modules/payment/webhook-repository";
import {
  PaymentWebhookService,
  type PaymentWebhookRepositoryPort,
} from "@/modules/payment/webhook-service";

const NOW = new Date("2026-09-05T08:00:00.000Z");
const SERVER_KEY = "midtrans-server-key-for-logging-test";
const EXTERNAL_ORDER_ID = "PAY-20260905-ABCDEFGH";
const GROSS_AMOUNT = "12500.00";
const TRANSACTION_ID = "transaction-logging-1";
const SECRET_ERROR_TEXT = "connection string postgres://user:hunter2@db";

const FORBIDDEN_KEYS = [
  "payload",
  "signature_key",
  "signature",
  "gross_amount",
  "order_id",
  "serverKey",
  "body",
  "message",
];

function signedPayload(): Record<string, string> {
  const base = {
    gross_amount: GROSS_AMOUNT,
    order_id: EXTERNAL_ORDER_ID,
    status_code: "200",
    transaction_id: TRANSACTION_ID,
    transaction_status: "settlement",
  };

  return {
    ...base,
    signature_key: createHash("sha512")
      .update(
        `${base.order_id}${base.status_code}${base.gross_amount}${SERVER_KEY}`,
        "utf8",
      )
      .digest("hex"),
  };
}

function createRecorder() {
  const events: FailureEvent[] = [];
  const logger: FailureLogger = { record: (event) => void events.push(event) };
  return { events, logger };
}

function serviceWith(
  logger: FailureLogger,
  repository: PaymentWebhookRepositoryPort,
) {
  return new PaymentWebhookService({
    audit: async () => undefined,
    failureLogger: logger,
    now: () => NOW,
    repository,
    serverKey: SERVER_KEY,
  });
}

const processed: MidtransWebhookResult = {
  kind: "PROCESSED",
  orderId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
  paymentAttemptId: "c4b0b03a-5dad-49b4-b9cc-d2c4ca0c8e31",
  processingResult: "SETTLED",
};

function expectNoForbiddenData(events: readonly FailureEvent[], payload: Record<string, string>) {
  const serialized = JSON.stringify(events);

  for (const value of [
    payload.signature_key,
    EXTERNAL_ORDER_ID,
    GROSS_AMOUNT,
    TRANSACTION_ID,
    SERVER_KEY,
    SECRET_ERROR_TEXT,
  ]) {
    expect(serialized).not.toContain(value);
  }

  for (const event of events) {
    for (const key of Object.keys(event.safeContext ?? {})) {
      expect(FORBIDDEN_KEYS).not.toContain(key);
    }
  }
}

describe("Midtrans webhook failure logging", () => {
  it("records a signature failure without payload, signature, or secrets", async () => {
    const { events, logger } = createRecorder();
    const repository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: vi.fn(async () => processed),
    };
    const payload = { ...signedPayload(), signature_key: "0".repeat(128) };

    await expect(
      serviceWith(logger, repository).handleMidtransNotification(payload),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(repository.processMidtransWebhook).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      boundary: "webhook:midtrans",
      errorCode: "PAYMENT_VERIFICATION_FAILED",
      kind: "PROVIDER_REJECTED",
      safeContext: { outcome: "SIGNATURE_INVALID", stage: "verify" },
    });
    expect(events[0]?.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expectNoForbiddenData(events, payload);
  });

  it("records an amount mismatch and still rejects with the same error code", async () => {
    const { events, logger } = createRecorder();
    const repository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: async () => ({
        ...processed,
        kind: "AMOUNT_MISMATCH",
        processingResult: "AMOUNT_MISMATCH",
      }),
    };
    const payload = signedPayload();

    await expect(
      serviceWith(logger, repository).handleMidtransNotification(payload),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      errorCode: "PAYMENT_VERIFICATION_FAILED",
      safeContext: { outcome: "AMOUNT_MISMATCH", stage: "amount" },
    });
    expectNoForbiddenData(events, payload);
  });

  it("records an unexpected repository failure as an internal error and rethrows it unchanged", async () => {
    const { events, logger } = createRecorder();
    const failure = new Error(SECRET_ERROR_TEXT);
    const repository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: async () => {
        throw failure;
      },
    };
    const payload = signedPayload();

    await expect(
      serviceWith(logger, repository).handleMidtransNotification(payload),
    ).rejects.toBe(failure);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      errorCode: "INTERNAL_ERROR",
      kind: "CODE_DEFECT",
      safeContext: { outcome: "ERROR", stage: "process" },
    });
    expect(Object.keys(events[0]?.safeContext ?? {}).sort()).toEqual([
      "outcome",
      "stage",
    ]);
    expectNoForbiddenData(events, payload);
  });

  it("records a malformed payload at the parse stage", async () => {
    const { events, logger } = createRecorder();
    const repository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: vi.fn(async () => processed),
    };

    await expect(
      serviceWith(logger, repository).handleMidtransNotification({
        order_id: EXTERNAL_ORDER_ID,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(events).toHaveLength(1);
    expect(events[0]?.safeContext).toEqual({ outcome: "REJECTED", stage: "parse" });
    expect(JSON.stringify(events)).not.toContain(EXTERNAL_ORDER_ID);
  });

  it("does not record anything for a processed or duplicate notification", async () => {
    const { events, logger } = createRecorder();

    await expect(
      serviceWith(logger, {
        processMidtransWebhook: async () => processed,
      }).handleMidtransNotification(signedPayload()),
    ).resolves.toEqual(processed);
    await expect(
      serviceWith(logger, {
        processMidtransWebhook: async () => ({ kind: "DUPLICATE", processingResult: "DUPLICATE" }),
      }).handleMidtransNotification(signedPayload()),
    ).resolves.toMatchObject({ kind: "DUPLICATE" });

    expect(events).toEqual([]);
  });

  it("keeps the original rejection when the logger itself throws", async () => {
    const throwingLogger: FailureLogger = {
      record: () => {
        throw new Error("log sink down");
      },
    };
    const repository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: vi.fn(async () => processed),
    };

    await expect(
      serviceWith(throwingLogger, repository).handleMidtransNotification({
        ...signedPayload(),
        signature_key: "0".repeat(128),
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });

    await expect(
      serviceWith(throwingLogger, repository).handleMidtransNotification(
        signedPayload(),
      ),
    ).resolves.toEqual(processed);
  });

  it("uses the console logger by default without leaking the payload", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const payload = { ...signedPayload(), signature_key: "0".repeat(128) };
      const service = new PaymentWebhookService({
        audit: async () => undefined,
        now: () => NOW,
        repository: { processMidtransWebhook: async () => processed },
        serverKey: SERVER_KEY,
      });

      await expect(service.handleMidtransNotification(payload)).rejects.toMatchObject({
        code: "PAYMENT_VERIFICATION_FAILED",
      });

      expect(spy).toHaveBeenCalledOnce();
      const line = String(spy.mock.calls[0]?.[0]);
      expect(line).toContain("webhook:midtrans");
      for (const value of [EXTERNAL_ORDER_ID, GROSS_AMOUNT, SERVER_KEY, payload.signature_key]) {
        expect(line).not.toContain(value);
      }
    } finally {
      spy.mockRestore();
    }
  });
});
