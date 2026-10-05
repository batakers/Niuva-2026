import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmUpload: vi.fn(),
  createIntent: vi.fn(),
  customSubmit: vi.fn(),
  customerAuth: vi.fn(),
  customerPreview: vi.fn(),
  inquirySubmit: vi.fn(),
  webhookHandle: vi.fn(),
}));

vi.mock("@/modules/files/upload-service", () => ({
  UploadService: class {
    confirmUpload = mocks.confirmUpload;
    createIntent = mocks.createIntent;
  },
}));

vi.mock("@/lib/auth/customer", () => ({
  getCurrentCustomer: async () => ({ id: "80c93342-dc64-4426-b5bd-f1bda83f1720", email: "client@example.test" }),
  requireCustomer: () => mocks.customerAuth(),
}));

vi.mock("@/modules/custom-print/customer-preview-service", () => ({
  CustomerPreviewService: class { preview = mocks.customerPreview; },
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
import { POST as postCustomerPreview } from "@/app/api/custom-print/preview-estimate/route";
import { POST as postProjectBrief } from "@/app/api/project-brief/route";
import { POST as postUploadConfirmation } from "@/app/api/uploads/confirm/route";
import { POST as postUploadIntent } from "@/app/api/uploads/intents/route";
import { POST as postMidtransWebhook } from "@/app/api/webhooks/midtrans/route";
import { appError } from "@/modules/shared/errors";

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
  mocks.customerAuth.mockReset().mockResolvedValue({ id: "80c93342-dc64-4426-b5bd-f1bda83f1720", email: "client@example.test" });
  mocks.customerPreview.mockReset();
  mocks.inquirySubmit.mockReset();
  mocks.webhookHandle.mockReset();
});

describe("Phase 3 public HTTP boundaries", () => {
  it("requires a Customer session and never caches the preview response", async () => {
    const payload = { fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4", materialRequested: "PLA", quantity: 1,
      customerPreviewInput: { source: "CUSTOMER_DECLARED_SLICER", weightGramsPerUnit: "1",
        printDurationSecondsPerUnit: 3_600 } };
    mocks.customerAuth.mockRejectedValueOnce(appError("UNAUTHORIZED"));
    const denied = await postCustomerPreview(publicRequest("/api/custom-print/preview-estimate", payload));
    expect(denied.status).toBe(401);
    expect(denied.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.customerPreview).not.toHaveBeenCalled();
    mocks.customerPreview.mockResolvedValue({ status: "REVIEW_REQUIRED" });
    const allowed = await postCustomerPreview(publicRequest("/api/custom-print/preview-estimate", payload));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.customerPreview).toHaveBeenCalledWith(payload, "80c93342-dc64-4426-b5bd-f1bda83f1720");
  });

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

  it("rejects an anonymous upload intent with 401 and no upload URL", async () => {
    mocks.createIntent.mockRejectedValueOnce(appError("UNAUTHORIZED"));

    const response = await postUploadIntent(
      publicRequest("/api/uploads/intents", { mimeType: "model/stl", originalName: "model.stl", sizeBytes: 3 }),
    );

    expect(response.status).toBe(401);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain("uploadUrl");
  });

  it("keeps public routes thin while returning only public-safe service values", async () => {
    mocks.inquirySubmit.mockResolvedValue({
      accessToken: { token: "inquiry-token" },
      inquiry: { id: "51194c92-0b89-420e-88df-73ed2deeeab4", referenceNumber: "INQ-20260905-ABCDEFGH" },
    });
    mocks.customSubmit.mockResolvedValue({
      accessToken: { token: "custom-token" },
      request: { id: "f60e715e-c94e-489d-bc69-b28ab2f6ed33", referenceNumber: "CPR-20260905-ABCDEFGH" },
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
      inquiryId: "51194c92-0b89-420e-88df-73ed2deeeab4",
      referenceNumber: "INQ-20260905-ABCDEFGH",
    });
    expect(customPrint.status).toBe(201);
    await expect(customPrint.json()).resolves.toEqual({
      requestId: "f60e715e-c94e-489d-bc69-b28ab2f6ed33",
      referenceNumber: "CPR-20260905-ABCDEFGH",
    });
    expect(intent.status).toBe(201);
    expect(mocks.createIntent).toHaveBeenCalledWith({
      mimeType: "model/stl", originalName: "model.stl", sizeBytes: 3,
    });
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
