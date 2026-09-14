import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  createUploadUrl: vi.fn(),
  deleteObject: vi.fn(),
  headObject: vi.fn(),
  lastKey: undefined as string | undefined,
}));

vi.mock("@/modules/files/r2", () => ({
  createR2PrivateObjectStorageFromEnvironment: () => ({
    createUploadUrl: storageMock.createUploadUrl,
    deleteObject: storageMock.deleteObject,
    headObject: storageMock.headObject,
  }),
}));

import { getPrismaClient } from "@/lib/db/prisma";
import { POST as postCustomPrint } from "@/app/api/custom-print/requests/route";
import { POST as postUploadConfirmation } from "@/app/api/uploads/confirm/route";
import { POST as postUploadIntent } from "@/app/api/uploads/intents/route";

const prisma = getPrismaClient();

async function cleanIntegrationDatabase(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "audit_logs",
      "idempotency_records",
      "payment_events",
      "payment_attempts",
      "shipments",
      "shipment_rate_snapshots",
      "stock_reservations",
      "order_addresses",
      "order_items",
      "orders",
      "custom_print_quotes",
      "custom_print_reviews",
      "custom_print_request_files",
      "custom_print_requests",
      "b2b_inquiry_files",
      "b2b_inquiries",
      "stored_files",
      "product_media",
      "product_variants",
      "products",
      "categories",
      "portfolio_media",
      "portfolio_projects",
      "services",
      "pricing_rule_versions",
      "admin_profiles"
    RESTART IDENTITY CASCADE
  `;
}

function publicRequest(path: string, payload: unknown): Request {
  return new Request(`http://127.0.0.1:3000${path}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      origin: "http://127.0.0.1:3000",
    },
    method: "POST",
  });
}

beforeEach(async () => {
  await cleanIntegrationDatabase();
  storageMock.createUploadUrl.mockReset();
  storageMock.deleteObject.mockReset();
  storageMock.headObject.mockReset();
  storageMock.lastKey = undefined;
  storageMock.createUploadUrl.mockImplementation(
    async (input: Readonly<{ key: string }>) => {
      storageMock.lastKey = input.key;
      return "https://storage.example.test/private-upload";
    },
  );
});

afterAll(cleanIntegrationDatabase);

describe("Private upload route integration", () => {
  it("confirms a private object then binds it to a custom request", async () => {
    const intentResponse = await postUploadIntent(
      publicRequest("/api/uploads/intents", {
        mimeType: "model/stl",
        originalName: "prototype.stl",
        sizeBytes: 3,
      }),
    );

    expect(intentResponse.status).toBe(201);
    const intent = (await intentResponse.json()) as Record<string, unknown>;
    expect(intent.uploadUrl).toBe("https://storage.example.test/private-upload");
    expect(typeof intent.fileId).toBe("string");
    expect(typeof intent.uploadToken).toBe("string");

    const fileId = intent.fileId;
    const uploadToken = intent.uploadToken;
    if (typeof fileId !== "string" || typeof uploadToken !== "string") {
      throw new Error("Upload intent tidak mengembalikan identitas yang valid.");
    }

    const pending = await prisma.storedFile.findUnique({
      select: {
        storageKey: true,
        uploadStatus: true,
      },
      where: { id: fileId },
    });
    expect(pending).toMatchObject({ uploadStatus: "PENDING" });
    expect(pending?.storageKey).toMatch(/^private\/customer\//);
    expect(storageMock.lastKey).toBe(pending?.storageKey);

    storageMock.headObject.mockResolvedValue({
      contentLength: 3,
      contentType: "model/stl",
    });
    const confirmationResponse = await postUploadConfirmation(
      publicRequest("/api/uploads/confirm", { fileId, uploadToken }),
    );

    expect(confirmationResponse.status).toBe(200);
    await expect(confirmationResponse.json()).resolves.toEqual({
      fileId,
      status: "UPLOADED",
    });
    await expect(
      prisma.storedFile.findUnique({
        select: {
          storageKey: true,
          uploadExpiresAt: true,
          uploadStatus: true,
          uploadTokenHash: true,
        },
        where: { id: fileId },
      }),
    ).resolves.toMatchObject({
      storageKey: pending?.storageKey,
      uploadExpiresAt: null,
      uploadStatus: "UPLOADED",
      uploadTokenHash: null,
    });

    const requestResponse = await postCustomPrint(
      publicRequest("/api/custom-print/requests", {
        customerEmail: "upload@example.test",
        customerName: "Upload Integration",
        customerPhone: "+628000000000",
        fileIds: [fileId],
        materialRequested: "PLA",
        quantity: 1,
      }),
    );

    expect(requestResponse.status).toBe(201);
    const requestBody = (await requestResponse.json()) as Record<string, unknown>;
    expect(requestBody.referenceNumber).toMatch(/^CPR-[0-9]{8}-[A-Z0-9]{8}$/);

    await expect(
      prisma.storedFile.findUnique({
        select: { uploadStatus: true, storageKey: true },
        where: { id: fileId },
      }),
    ).resolves.toMatchObject({
      storageKey: pending?.storageKey,
      uploadStatus: "VERIFIED",
    });
    await expect(prisma.customPrintRequestFile.count({ where: { fileId } })).resolves.toBe(1);
    expect(storageMock.headObject).toHaveBeenCalledWith(pending?.storageKey);
    expect(storageMock.deleteObject).not.toHaveBeenCalled();
  });
});
