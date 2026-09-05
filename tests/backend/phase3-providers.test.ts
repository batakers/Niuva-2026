import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  createR2PrivateObjectStorageFromEnvironment,
  type PrivateObjectStorage,
} from "@/modules/files/r2";
import {
  UploadService,
  type UploadFileRepository,
} from "@/modules/files/upload-service";
import type {
  CreatePendingFileInput,
  PendingFileForConfirmation,
} from "@/modules/files/repository";
import {
  createInquiryAdminNotificationFromEnvironment,
  ResendEmailGateway,
} from "@/modules/notifications/resend";
import {
  createMidtransEventFingerprint,
  getMidtransPaymentStatus,
  MidtransSnapGateway,
  parseMidtransNotification,
  verifyMidtransNotificationSignature,
} from "@/modules/payment/midtrans";
import {
  PaymentWebhookService,
  type PaymentWebhookRepositoryPort,
} from "@/modules/payment/webhook-service";
import type { MidtransWebhookResult } from "@/modules/payment/webhook-repository";

const NOW = new Date("2026-09-05T08:00:00.000Z");

type MutableUploadRecord = {
  bucketScope: "PRIVATE_CUSTOMER";
  id: string;
  mimeType: string;
  sizeBytes: bigint;
  storageKey: string;
  uploadExpiresAt: Date | null;
  uploadStatus: PendingFileForConfirmation["uploadStatus"];
  uploadTokenHash: string | null;
};

class InMemoryUploadRepository implements UploadFileRepository {
  readonly records = new Map<string, MutableUploadRecord>();

  async createPending(input: CreatePendingFileInput) {
    const record: MutableUploadRecord = {
      bucketScope: "PRIVATE_CUSTOMER",
      id: input.id,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: `private/customer/${input.id}`,
      uploadExpiresAt: input.uploadExpiresAt,
      uploadStatus: "PENDING",
      uploadTokenHash: input.uploadTokenHash,
    };
    this.records.set(record.id, record);

    return { id: record.id, storageKey: record.storageKey };
  }

  async findForUploadConfirmation(fileId: string) {
    return this.records.get(fileId) ?? null;
  }

  async markUploadedIfPending(input: Readonly<{
    fileId: string;
    now: Date;
    uploadTokenHash: string;
  }>) {
    const record = this.records.get(input.fileId);

    if (
      record === undefined ||
      record.uploadStatus !== "PENDING" ||
      record.uploadTokenHash !== input.uploadTokenHash ||
      record.uploadExpiresAt === null ||
      record.uploadExpiresAt <= input.now
    ) {
      return false;
    }

    record.uploadExpiresAt = null;
    record.uploadStatus = "UPLOADED";
    record.uploadTokenHash = null;

    return true;
  }

  async rejectPendingUpload(fileId: string) {
    const record = this.records.get(fileId);

    if (record !== undefined && record.uploadStatus === "PENDING") {
      record.uploadExpiresAt = null;
      record.uploadStatus = "REJECTED";
      record.uploadTokenHash = null;
    }
  }
}

class FakePrivateObjectStorage implements PrivateObjectStorage {
  createCalls: Array<{ contentType: string; expiresInSeconds: number; key: string }> = [];
  deletedKeys: string[] = [];
  headCalls: string[] = [];
  metadata: Readonly<{ contentLength?: number; contentType?: string }> = {
    contentLength: 3,
    contentType: "model/stl",
  };

  async createUploadUrl(input: Readonly<{
    contentType: string;
    expiresInSeconds: number;
    key: string;
  }>) {
    this.createCalls.push(input);
    return `https://storage.example.test/${input.key}?signature=opaque`;
  }

  async deleteObject(key: string) {
    this.deletedKeys.push(key);
  }

  async headObject(key: string) {
    this.headCalls.push(key);
    return this.metadata;
  }
}

function createUploadService(
  repository = new InMemoryUploadRepository(),
  storage = new FakePrivateObjectStorage(),
  now: () => Date = () => NOW,
) {
  return {
    repository,
    service: new UploadService({
      audit: async () => undefined,
      now,
      randomBytes: (size) => new Uint8Array(size).fill(7),
      repository,
      storage,
    }),
    storage,
  };
}

describe("Phase 3 private upload boundary", () => {
  it("requires the reviewed upload-size capability before creating an R2 client", () => {
    const r2Environment = {
      CUSTOM_FILE_MAX_BYTES: "104857600",
      NODE_ENV: "test",
      R2_ACCESS_KEY_ID: "access-key",
      R2_ACCOUNT_ID: "account-id",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_PRIVATE_BUCKET: "niuva-private",
      R2_PUBLIC_BUCKET: "niuva-public",
      R2_SECRET_ACCESS_KEY: "secret-key",
    };

    expect(() =>
      createR2PrivateObjectStorageFromEnvironment(r2Environment),
    ).not.toThrow();
    expect(
      getThrownError(() =>
        createR2PrivateObjectStorageFromEnvironment({
          ...r2Environment,
          CUSTOM_FILE_MAX_BYTES: undefined,
        }),
      ),
    ).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });

  it("issues a short-lived URL while persisting only a bound token hash", async () => {
    const { repository, service, storage } = createUploadService();

    const intent = await service.createIntent({
      mimeType: "model/stl",
      originalName: "client-housing.stl",
      sizeBytes: 3,
    });
    const record = repository.records.get(intent.fileId);

    expect(intent.expiresAt).toEqual(new Date(NOW.getTime() + 10 * 60 * 1_000));
    expect(intent.requiredHeaders).toEqual({ "content-type": "model/stl" });
    expect(intent.uploadUrl).toContain("signature=opaque");
    expect(record).toMatchObject({
      mimeType: "model/stl",
      storageKey: `private/customer/${intent.fileId}`,
      uploadStatus: "PENDING",
    });
    expect(record?.uploadTokenHash).not.toBe(intent.uploadToken);
    expect(record?.uploadTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(storage.createCalls).toEqual([
      {
        contentType: "model/stl",
        expiresInSeconds: 600,
        key: `private/customer/${intent.fileId}`,
      },
    ]);
  });

  it("accepts only matching object metadata and consumes the confirmation token", async () => {
    const { repository, service, storage } = createUploadService();
    const intent = await service.createIntent({
      mimeType: "model/stl",
      originalName: "client-housing.stl",
      sizeBytes: 3,
    });

    await expect(
      service.confirmUpload({
        fileId: intent.fileId,
        uploadToken: intent.uploadToken,
      }),
    ).resolves.toEqual({ fileId: intent.fileId, status: "UPLOADED" });

    expect(repository.records.get(intent.fileId)).toMatchObject({
      uploadExpiresAt: null,
      uploadStatus: "UPLOADED",
      uploadTokenHash: null,
    });
    expect(storage.deletedKeys).toEqual([]);
  });

  it("rejects and schedules object deletion for spoofed metadata or expired capability", async () => {
    const mismatchedStorage = new FakePrivateObjectStorage();
    mismatchedStorage.metadata = { contentLength: 4, contentType: "model/stl" };
    const mismatch = createUploadService(undefined, mismatchedStorage);
    const mismatchIntent = await mismatch.service.createIntent({
      mimeType: "model/stl",
      originalName: "client-housing.stl",
      sizeBytes: 3,
    });

    await expect(
      mismatch.service.confirmUpload({
        fileId: mismatchIntent.fileId,
        uploadToken: mismatchIntent.uploadToken,
      }),
    ).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(mismatch.repository.records.get(mismatchIntent.fileId)).toMatchObject({
      uploadStatus: "REJECTED",
    });
    expect(mismatchedStorage.deletedKeys).toEqual([
      `private/customer/${mismatchIntent.fileId}`,
    ]);

    let currentTime = NOW;
    const expired = createUploadService(
      undefined,
      new FakePrivateObjectStorage(),
      () => currentTime,
    );
    const expiredIntent = await expired.service.createIntent({
      mimeType: "model/stl",
      originalName: "client-housing.stl",
      sizeBytes: 3,
    });
    currentTime = new Date(expiredIntent.expiresAt.getTime());

    await expect(
      expired.service.confirmUpload({
        fileId: expiredIntent.fileId,
        uploadToken: expiredIntent.uploadToken,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(expired.repository.records.get(expiredIntent.fileId)).toMatchObject({
      uploadStatus: "REJECTED",
    });
  });

  it("rejects unsupported extensions and MIME mismatches before creating an intent", async () => {
    const { repository, service } = createUploadService();

    await expect(
      service.createIntent({
        mimeType: "application/octet-stream",
        originalName: "payload.exe",
        sizeBytes: 3,
      }),
    ).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    await expect(
      service.createIntent({
        mimeType: "image/png",
        originalName: "client-housing.stl",
        sizeBytes: 3,
      }),
    ).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(repository.records).toHaveLength(0);
  });
});

function signedMidtransPayload(
  overrides: Partial<Record<string, string>> = {},
): Record<string, string> {
  const serverKey = "midtrans-server-key";
  const base = {
    gross_amount: "12500.00",
    order_id: "PAY-20260905-ABCDEFGH",
    status_code: "200",
    transaction_id: "transaction-1",
    transaction_status: "settlement",
    ...overrides,
  };

  return {
    ...base,
    signature_key: createHash("sha512")
      .update(
        `${base.order_id}${base.status_code}${base.gross_amount}${serverKey}`,
        "utf8",
      )
      .digest("hex"),
  };
}

describe("Phase 3 Midtrans sandbox adapter", () => {
  it("sends a sandbox Snap request with server-owned, non-extending expiry", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImplementation: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return new Response(
        JSON.stringify({
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/redirect",
          token: "snap-token",
        }),
        { status: 201 },
      );
    };
    const gateway = new MidtransSnapGateway({
      fetch: fetchImplementation,
      isProduction: false,
      nodeEnv: "test",
      now: () => NOW,
      serverKey: "midtrans-server-key",
    });

    await expect(
      gateway.createPayment({
        amountRp: "12500",
        expiresAt: new Date(NOW.getTime() + 30 * 60 * 1_000),
        orderId: "order-id-not-sent",
        orderNumber: "ORD-NOT-SENT",
        providerOrderId: "PAY-20260905-ABCDEFGH",
      }),
    ).resolves.toEqual({
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/redirect",
      token: "snap-token",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
    );
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      expiry: { duration: number; unit: string };
      transaction_details: { gross_amount: number; order_id: string };
    };
    expect(body).toMatchObject({
      expiry: { duration: 30, unit: "minutes" },
      transaction_details: {
        gross_amount: 12500,
        order_id: "PAY-20260905-ABCDEFGH",
      },
    });
    expect(JSON.stringify(body)).not.toContain("ORD-NOT-SENT");
  });

  it("refuses live or production mode before an outbound provider call", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const gateway = new MidtransSnapGateway({
      fetch: fetchImplementation,
      isProduction: true,
      nodeEnv: "test",
      serverKey: "midtrans-server-key",
    });

    await expect(
      gateway.createPayment({
        amountRp: "12500",
        expiresAt: new Date(NOW.getTime() + 30 * 60 * 1_000),
        orderId: "order-1",
        orderNumber: "ORD-1",
        providerOrderId: "PAY-20260905-ABCDEFGH",
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("verifies classic signatures and fingerprints each state notification", () => {
    const payload = signedMidtransPayload();
    const notification = parseMidtransNotification(payload);

    expect(() =>
      verifyMidtransNotificationSignature(notification, "midtrans-server-key"),
    ).not.toThrow();
    expect(createMidtransEventFingerprint(notification)).toMatch(/^[0-9a-f]{64}$/);
    expect(getMidtransPaymentStatus(notification)).toBe("SETTLED");
    expect(
      getThrownError(() =>
        verifyMidtransNotificationSignature(
          parseMidtransNotification({ ...payload, signature_key: "0".repeat(128) }),
          "midtrans-server-key",
        ),
      ),
    ).toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
    expect(
      getMidtransPaymentStatus(
        parseMidtransNotification(
          signedMidtransPayload({ transaction_status: "expire" }),
        ),
      ),
    ).toBe("EXPIRED");
  });
});

describe("Phase 3 payment webhook and email boundaries", () => {
  it("verifies before delegating a webhook and treats amount mismatch as a typed failure", async () => {
    const processed: MidtransWebhookResult = {
      kind: "PROCESSED",
      orderId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      paymentAttemptId: "c4b0b03a-5dad-49b4-b9cc-d2c4ca0c8e31",
      processingResult: "SETTLED",
    };
    const repository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: vi.fn(async () => processed),
    };
    const audit = vi.fn(async () => undefined);
    const service = new PaymentWebhookService({
      audit,
      now: () => NOW,
      repository,
      serverKey: "midtrans-server-key",
    });

    await expect(service.handleMidtransNotification(signedMidtransPayload())).resolves.toEqual(
      processed,
    );
    expect(repository.processMidtransWebhook).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payment.webhook.processed",
        entityId: processed.orderId,
      }),
    );

    const wrongSignatureRepository: PaymentWebhookRepositoryPort = {
      processMidtransWebhook: vi.fn(async () => processed),
    };
    const wrongSignatureService = new PaymentWebhookService({
      audit: async () => undefined,
      repository: wrongSignatureRepository,
      serverKey: "midtrans-server-key",
    });
    await expect(
      wrongSignatureService.handleMidtransNotification({
        ...signedMidtransPayload(),
        signature_key: "0".repeat(128),
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
    expect(wrongSignatureRepository.processMidtransWebhook).not.toHaveBeenCalled();

    const mismatchService = new PaymentWebhookService({
      audit: async () => undefined,
      repository: {
        async processMidtransWebhook() {
          return {
            ...processed,
            kind: "AMOUNT_MISMATCH",
            processingResult: "AMOUNT_MISMATCH",
          };
        },
      },
      serverKey: "midtrans-server-key",
    });
    await expect(
      mismatchService.handleMidtransNotification(signedMidtransPayload()),
    ).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
  });

  it("sends Resend idempotently and rejects production provider activation", async () => {
    let request: RequestInit | undefined;
    const fetchImplementation: typeof fetch = async (_input, init) => {
      request = init;
      return new Response(JSON.stringify({ id: "email-id" }), { status: 200 });
    };
    const gateway = new ResendEmailGateway({
      apiKey: "resend-test-key",
      fetch: fetchImplementation,
      from: "Niuva <no-reply@example.test>",
    });

    await expect(
      gateway.send({
        idempotencyKey: "admin-inquiry:inquiry-id",
        subject: "Brief baru",
        text: "Ada brief baru.",
        to: "admin@example.test",
      }),
    ).resolves.toEqual({ id: "email-id" });
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe(
      "admin-inquiry:inquiry-id",
    );
    expect(new Headers(request?.headers).get("Authorization")).toBe(
      "Bearer resend-test-key",
    );
    expect(
      getThrownError(() =>
        createInquiryAdminNotificationFromEnvironment({
          ADMIN_NOTIFICATION_EMAIL: "admin@example.test",
          EMAIL_FROM: "Niuva <no-reply@example.test>",
          NODE_ENV: "production",
          RESEND_API_KEY: "resend-test-key",
        }),
      ),
    ).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});

function getThrownError(callback: () => unknown): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error("Expected callback to throw.");
}
