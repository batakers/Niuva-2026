import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmUpload: vi.fn(),
  createIntent: vi.fn(),
  customSubmit: vi.fn(),
  inquirySubmit: vi.fn(),
  webhookHandle: vi.fn(),
}));

vi.mock("@/modules/files/upload-service", () => ({
  UploadService: class {
    confirmUpload = mocks.confirmUpload;
    createIntent = mocks.createIntent;
  },
}));

vi.mock("@/modules/inquiry/service", () => ({
  InquiryService: class {
    submit = mocks.inquirySubmit;
  },
}));

vi.mock("@/modules/custom-print/service", () => ({
  CustomPrintService: class {
    submit = mocks.customSubmit;
  },
}));

vi.mock("@/modules/notifications/resend", () => ({
  createCustomPrintAdminNotificationFromEnvironment: () => undefined,
  createInquiryAdminNotificationFromEnvironment: () => undefined,
}));

vi.mock("@/modules/payment/webhook-service", () => ({
  PaymentWebhookService: class {
    handleMidtransNotification = mocks.webhookHandle;
  },
}));

import { POST as postCustomPrint } from "@/app/api/custom-print/requests/route";
import { POST as postProjectBrief } from "@/app/api/project-brief/route";
import { POST as postUploadConfirmation } from "@/app/api/uploads/confirm/route";
import { POST as postUploadIntent } from "@/app/api/uploads/intents/route";
import { POST as postMidtransWebhook } from "@/app/api/webhooks/midtrans/route";

function publicRequest(path: string, payload: unknown, includeOrigin = true): Request {
  const url = `https://app.example.test${path}`;

  return new Request(url, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      ...(includeOrigin ? { origin: "https://app.example.test" } : {}),
    },
    method: "POST",
  });
}

beforeEach(() => {
  mocks.confirmUpload.mockReset();
  mocks.createIntent.mockReset();
  mocks.customSubmit.mockReset();
  mocks.inquirySubmit.mockReset();
  mocks.webhookHandle.mockReset();
});

describe("Phase 3 public HTTP boundaries", () => {
  it("rejects cross-origin upload intent before reaching a service", async () => {
    const response = await postUploadIntent(
      publicRequest(
        "/api/uploads/intents",
        { mimeType: "model/stl", originalName: "model.stl", sizeBytes: 3 },
        false,
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "ORIGIN_NOT_ALLOWED",
    });
    expect(mocks.createIntent).not.toHaveBeenCalled();
  });

  it("keeps public routes thin while returning only public-safe service values", async () => {
    mocks.inquirySubmit.mockResolvedValue({
      accessToken: { token: "inquiry-token" },
      inquiry: { referenceNumber: "INQ-20260905-ABCDEFGH" },
    });
    mocks.customSubmit.mockResolvedValue({
      accessToken: { token: "custom-token" },
      request: { referenceNumber: "CPR-20260905-ABCDEFGH" },
    });
    mocks.createIntent.mockResolvedValue({
      expiresAt: new Date("2026-09-05T08:10:00.000Z"),
      fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      requiredHeaders: { "content-type": "model/stl" },
      uploadToken: "upload-token",
      uploadUrl: "https://storage.example.test/upload?signature=opaque",
    });
    mocks.confirmUpload.mockResolvedValue({
      fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      status: "UPLOADED",
    });

    const projectBrief = await postProjectBrief(
      publicRequest("/api/project-brief", { name: "Client" }),
    );
    const customPrint = await postCustomPrint(
      publicRequest("/api/custom-print/requests", { customerName: "Client" }),
    );
    const intent = await postUploadIntent(
      publicRequest("/api/uploads/intents", {
        mimeType: "model/stl",
        originalName: "model.stl",
        sizeBytes: 3,
      }),
    );
    const confirmation = await postUploadConfirmation(
      publicRequest("/api/uploads/confirm", {
        fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
        uploadToken: "upload-token",
      }),
    );

    expect(projectBrief.status).toBe(201);
    await expect(projectBrief.json()).resolves.toEqual({
      accessToken: "inquiry-token",
      referenceNumber: "INQ-20260905-ABCDEFGH",
    });
    expect(customPrint.status).toBe(201);
    await expect(customPrint.json()).resolves.toEqual({
      accessToken: "custom-token",
      referenceNumber: "CPR-20260905-ABCDEFGH",
    });
    expect(intent.status).toBe(201);
    await expect(intent.json()).resolves.toMatchObject({
      fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      uploadToken: "upload-token",
    });
    expect(confirmation.status).toBe(200);
    await expect(confirmation.json()).resolves.toEqual({
      fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      status: "UPLOADED",
    });
  });
});

describe("Phase 3 Midtrans webhook boundary", () => {
  it("does not require browser origin and delegates only bounded JSON to the verified service", async () => {
    mocks.webhookHandle.mockResolvedValue({ kind: "DUPLICATE" });

    const response = await postMidtransWebhook(
      publicRequest(
        "/api/webhooks/midtrans",
        { order_id: "PAY-20260905-ABCDEFGH" },
        false,
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      outcome: "DUPLICATE",
    });
    expect(mocks.webhookHandle).toHaveBeenCalledWith({
      order_id: "PAY-20260905-ABCDEFGH",
    });
  });
});
