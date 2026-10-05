import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { FailureEvent, FailureLogger } from "@/lib/observability/logger";
import type { MidtransWebhookResult } from "@/modules/payment/webhook-repository";
import {
  PaymentWebhookService,
  type PaymentWebhookRepositoryPort,
  type PaymentWebhookServiceDependencies,
} from "@/modules/payment/webhook-service";

const NOW = new Date("2026-09-05T08:00:00.000Z");
const SERVER_KEY = "midtrans-webhook-capability-secret-key";
const CLOSED_GATES = { getStatus: () => ({ closed: true }) };

const base = {
  gross_amount: "12500.00",
  order_id: "PAY-20260905-ABCDEFGH",
  status_code: "200",
  transaction_id: "trx-capability-1",
  transaction_status: "settlement",
};

function sign(key: string): string {
  return createHash("sha512")
    .update(`${base.order_id}${base.status_code}${base.gross_amount}${key}`, "utf8")
    .digest("hex");
}

const payload = { ...base, signature_key: sign(SERVER_KEY) };

const processed: MidtransWebhookResult = {
  kind: "PROCESSED",
  orderId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
  paymentAttemptId: "c4b0b03a-5dad-49b4-b9cc-d2c4ca0c8e31",
  processingResult: "SETTLED",
};

const capabilityBase = { isProduction: false, nodeEnv: "test" } as const;

function build(
  overrides: PaymentWebhookServiceDependencies,
  result: MidtransWebhookResult = processed,
) {
  const events: FailureEvent[] = [];
  const failureLogger: FailureLogger = { record: (event) => void events.push(event) };
  const repository: PaymentWebhookRepositoryPort = {
    processMidtransWebhook: vi.fn(async () => result),
  };
  const audit = vi.fn(async () => undefined);
  const service = new PaymentWebhookService({
    audit,
    failureLogger,
    now: () => NOW,
    repository,
    serverKey: SERVER_KEY,
    ...overrides,
  });

  return { audit, events, repository, service };
}

async function expectDenied(
  capability: NonNullable<PaymentWebhookServiceDependencies["capability"]>,
  reason: string,
) {
  const { audit, events, repository, service } = build({ capability });
  const error = await service.handleMidtransNotification(payload).then(
    () => undefined,
    (thrown: unknown) => thrown as { code: string; message: string },
  );

  expect(error?.code).toBe("PROVIDER_UNAVAILABLE");
  expect(error?.message).toContain(reason);
  expect(error?.message).not.toContain(SERVER_KEY);
  expect(repository.processMidtransWebhook).not.toHaveBeenCalled();
  expect(audit).not.toHaveBeenCalled();
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    boundary: "webhook:midtrans",
    errorCode: "PROVIDER_UNAVAILABLE",
  });
  expect(JSON.stringify(events)).not.toContain(SERVER_KEY);
  expect(JSON.stringify(events)).not.toContain(payload.signature_key);
}

describe("Midtrans webhook capability resolution", () => {
  it("processes a valid webhook for an allowed tier", async () => {
    const { repository, service } = build({
      capability: { ...capabilityBase, capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" } },
    });

    await expect(service.handleMidtransNotification(payload)).resolves.toEqual(processed);
    expect(repository.processMidtransWebhook).toHaveBeenCalledTimes(1);
  });

  it("denies TIER_NOT_ALLOWED for the production tier", async () => {
    await expectDenied(
      { ...capabilityBase, capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "production" } },
      "TIER_NOT_ALLOWED",
    );
  });

  it("denies TIER_NOT_ALLOWED for live provider mode", async () => {
    await expectDenied(
      { ...capabilityBase, capabilityEnv: { NIUVA_PROVIDER_MODE: "live" } },
      "TIER_NOT_ALLOWED",
    );
  });

  it("keeps the legacy production and live rejections", async () => {
    await expectDenied({ ...capabilityBase, nodeEnv: "production" }, "belum diaktifkan");
    await expectDenied({ ...capabilityBase, isProduction: true }, "belum diaktifkan");
  });

  it("denies RESOURCE_NOT_BOUND when the database is declared unbound", async () => {
    await expectDenied({ ...capabilityBase, databaseBound: false }, "RESOURCE_NOT_BOUND");
  });

  it("denies CONFIG_INCOMPLETE for an unreadable caller environment", async () => {
    await expectDenied(
      { ...capabilityBase, capabilityEnv: { NIUVA_PROVIDER_MODE: "bogus" } },
      "CONFIG_INCOMPLETE",
    );
  });

  it("denies ACTIVATION_NOT_GRANTED in staging without a grant", async () => {
    await expectDenied(
      {
        ...capabilityBase,
        capabilityEnv: { NIUVA_DEPLOYMENT_TIER: "staging" },
        gates: CLOSED_GATES,
      },
      "ACTIVATION_NOT_GRANTED",
    );
  });

  it("rejects a partially configured injected environment without processing", async () => {
    const { repository, service } = build({
      environment: {
        DATABASE_URL: "postgresql://u:p@localhost:5432/niuva_test",
        MIDTRANS_IS_PRODUCTION: "false",
        NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client-key",
        NODE_ENV: "test",
      },
      serverKey: undefined,
    });

    await expect(service.handleMidtransNotification(payload)).rejects.toMatchObject({
      name: "EnvironmentValidationError",
    });
    expect(repository.processMidtransWebhook).not.toHaveBeenCalled();
  });

  it("allows and denies through the environment path using only the injected env", async () => {
    const env = {
      DATABASE_URL: "postgresql://u:p@localhost:5432/niuva_test",
      MIDTRANS_IS_PRODUCTION: "false",
      MIDTRANS_SERVER_KEY: SERVER_KEY,
      NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client-key",
      NODE_ENV: "test",
    };
    const allowed = build({ environment: env, serverKey: undefined });

    await expect(allowed.service.handleMidtransNotification(payload)).resolves.toEqual(
      processed,
    );

    const denied = build({
      environment: { ...env, NIUVA_DEPLOYMENT_TIER: "production" },
      serverKey: undefined,
    });

    await expect(denied.service.handleMidtransNotification(payload)).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
    });
    expect(denied.repository.processMidtransWebhook).not.toHaveBeenCalled();
    expect(denied.events).toHaveLength(1);
  });

  it("does not read process.env when no environment is injected", async () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", SERVER_KEY);
    try {
      const { repository, service } = build({ serverKey: undefined });

      await expect(service.handleMidtransNotification(payload)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
      });
      expect(repository.processMidtransWebhook).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("Midtrans webhook invariants in the allowed path", () => {
  const capability = {
    ...capabilityBase,
    capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" },
  } as const;

  it("still rejects a wrong signature before processing", async () => {
    const { repository, service } = build({ capability });

    await expect(
      service.handleMidtransNotification({ ...payload, signature_key: "0".repeat(128) }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
    expect(repository.processMidtransWebhook).not.toHaveBeenCalled();
  });

  it("still passes a stable event fingerprint and returns duplicates idempotently", async () => {
    const { audit, repository, service } = build(
      { capability },
      { kind: "DUPLICATE" } as MidtransWebhookResult,
    );

    await expect(service.handleMidtransNotification(payload)).resolves.toEqual({
      kind: "DUPLICATE",
    });
    await service.handleMidtransNotification(payload);

    const calls = vi.mocked(repository.processMidtransWebhook).mock.calls;

    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0].eventFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(calls[0]?.[0].eventFingerprint).toBe(calls[1]?.[0].eventFingerprint);
    expect(audit).not.toHaveBeenCalled();
  });

  it("still fails an amount mismatch and logs it", async () => {
    const { events, service } = build(
      { capability },
      { kind: "AMOUNT_MISMATCH", orderId: processed.orderId } as MidtransWebhookResult,
    );

    await expect(service.handleMidtransNotification(payload)).rejects.toMatchObject({
      code: "PAYMENT_VERIFICATION_FAILED",
    });
    expect(events[0]?.safeContext).toMatchObject({ outcome: "AMOUNT_MISMATCH" });
  });
});
