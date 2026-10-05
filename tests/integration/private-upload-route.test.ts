import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  createDownloadUrl: vi.fn(),
  createUploadUrl: vi.fn(),
  deleteObject: vi.fn(),
  computeSha256: vi.fn(),
  inspectObject: vi.fn(),
  headObject: vi.fn(),
  lastKey: undefined as string | undefined,
}));
const customerAuthMock = vi.hoisted(() => ({ id: "" }));

vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: async () => ({ id: customerAuthMock.id, email: "upload@example.test" }),
  getCurrentCustomer: async () => ({ id: customerAuthMock.id, email: "upload@example.test" }),
}));

vi.mock("@/modules/files/r2", () => ({
  createR2PrivateObjectStorageFromEnvironment: () => ({
    createDownloadUrl: storageMock.createDownloadUrl,
    createUploadUrl: storageMock.createUploadUrl,
    deleteObject: storageMock.deleteObject,
    headObject: storageMock.headObject,
    computeSha256: storageMock.computeSha256,
    inspectObject: storageMock.inspectObject,
  }),
}));

import { getPrismaClient } from "@/lib/db/prisma";
import { POST as postCustomPrint } from "@/app/api/custom-print/requests/route";
import { POST as postProjectBrief } from "@/app/api/project-brief/route";
import { POST as postUploadConfirmation } from "@/app/api/uploads/confirm/route";
import { POST as postUploadIntent } from "@/app/api/uploads/intents/route";

const prisma = getPrismaClient();
const CAD_CONTENT = Buffer.from("solid fixture\nfacet normal 0 0 1\nendsolid fixture\n");

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
      "admin_profiles",
      "customer_sessions",
      "customers"
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
  const customer = await prisma.customer.create({
    data: {
      email: "upload@example.test",
      googleSubject: "private-upload-route-customer",
      normalizedEmail: "upload@example.test",
    },
  });
  customerAuthMock.id = customer.id;
  storageMock.createUploadUrl.mockReset();
  storageMock.deleteObject.mockReset();
  storageMock.headObject.mockReset();
  storageMock.computeSha256.mockReset().mockResolvedValue("a".repeat(64));
  storageMock.inspectObject.mockReset().mockResolvedValue({ prefix: CAD_CONTENT, sizeBytes: CAD_CONTENT.length, sha256: "a".repeat(64) });
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
  it("rejects matching metadata with incorrect CAD content before any uploaded state", async () => {
    const response = await postUploadIntent(publicRequest("/api/uploads/intents", { mimeType: "model/stl", originalName: "prototype.stl", sizeBytes: CAD_CONTENT.length }));
    const intent = await response.json() as { fileId: string; uploadToken: string };
    expect(response.status).toBe(201);
    storageMock.headObject.mockResolvedValue({ contentLength: CAD_CONTENT.length, contentType: "model/stl" });
    storageMock.inspectObject.mockResolvedValue({ prefix: Buffer.from("incorrect file content"), sizeBytes: CAD_CONTENT.length, sha256: "a".repeat(64) });
    const confirmation = await postUploadConfirmation(publicRequest("/api/uploads/confirm", intent));
    expect(confirmation.status).toBe(422);
    const body = await confirmation.text();
    const file = await prisma.storedFile.findUniqueOrThrow({ where: { id: intent.fileId } });
    expect(file.uploadStatus).toBe("REJECTED"); expect(file.sha256).toBeNull(); expect(file.uploadTokenHash).toBeNull();
    expect(body).not.toContain(file.storageKey); expect(body).not.toContain(intent.uploadToken);
    expect(storageMock.deleteObject).toHaveBeenCalledWith(file.storageKey);
  });
  it("confirms a private object then binds it to a custom request", async () => {
    const intentResponse = await postUploadIntent(
      publicRequest("/api/uploads/intents", {
        mimeType: "model/stl",
        originalName: "prototype.stl",
        sizeBytes: CAD_CONTENT.length,
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
        uploadedByCustomerId: true,
      },
      where: { id: fileId },
    });
    expect(pending).toMatchObject({ uploadStatus: "PENDING", uploadedByCustomerId: customerAuthMock.id });
    expect(pending?.storageKey).toMatch(/^private\/customer\//);
    expect(storageMock.lastKey).toBe(pending?.storageKey);

    storageMock.headObject.mockResolvedValue({
      contentLength: CAD_CONTENT.length,
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
    const checked = await prisma.storedFile.findUnique({
      select: { sha256: true, verifiedAt: true },
      where: { id: fileId },
    });
    expect(checked?.sha256).toBe("a".repeat(64));
    expect(checked?.verifiedAt).not.toBeNull();

    const uploaderId = customerAuthMock.id;
    const other = await prisma.customer.create({
      data: { email: "other-upload@example.test", normalizedEmail: "other-upload@example.test",
        googleSubject: "other-private-upload-route-customer" },
    });
    customerAuthMock.id = other.id;
    const foreignResponse = await postCustomPrint(
      publicRequest("/api/custom-print/requests", {
        customerEmail: "other-upload@example.test", customerName: "Other Customer",
        customerPhone: "+628000000000", fileIds: [fileId], materialRequested: "PLA", quantity: 1,
      }),
    );
    expect(foreignResponse.status).toBe(409);
    expect(await prisma.customPrintRequest.count()).toBe(0);
    customerAuthMock.id = uploaderId;

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

  it("binds a confirmed private object to a Project Brief and verifies ownership", async () => {
    const intentResponse = await postUploadIntent(
      publicRequest("/api/uploads/intents", {
        mimeType: "model/stl",
        originalName: "brief-reference.stl",
        sizeBytes: CAD_CONTENT.length,
      }),
    );
    expect(intentResponse.status).toBe(201);

    const intent = (await intentResponse.json()) as Record<string, unknown>;
    const fileId = intent.fileId;
    const uploadToken = intent.uploadToken;
    if (typeof fileId !== "string" || typeof uploadToken !== "string") {
      throw new Error("Upload intent brief tidak mengembalikan identitas yang valid.");
    }

    const pending = await prisma.storedFile.findUnique({
      select: { storageKey: true, uploadStatus: true },
      where: { id: fileId },
    });
    expect(pending).toMatchObject({ uploadStatus: "PENDING" });
    storageMock.headObject.mockResolvedValue({
      contentLength: CAD_CONTENT.length,
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

    const briefResponse = await postProjectBrief(
      publicRequest("/api/project-brief", {
        attachmentFileIds: [fileId],
        confidentialityAck: true,
        currentStage: "CAD",
        description: "Brief dengan attachment privat untuk integration smoke.",
        email: "brief-upload@example.test",
        name: "Brief Upload",
        phone: "+628000000000",
        projectGoal: "Verify private file ownership binding",
        targetDeadline: "2026-10-01",
        targetQuantity: "1 prototype",
      }),
    );

    expect(briefResponse.status).toBe(201);
    const briefBody = (await briefResponse.json()) as Record<string, unknown>;
    const referenceNumber = briefBody.referenceNumber;
    expect(referenceNumber).toMatch(/^INQ-[0-9]{8}-[A-Z0-9]{8}$/);
    if (typeof referenceNumber !== "string") {
      throw new Error("Project Brief tidak mengembalikan reference number.");
    }

    await expect(
      prisma.b2BInquiry.findUnique({
        select: {
          files: { select: { fileId: true } },
          referenceNumber: true,
          status: true,
        },
        where: { referenceNumber },
      }),
    ).resolves.toMatchObject({
      files: [{ fileId }],
      referenceNumber,
      status: "NEW",
    });
    await expect(
      prisma.storedFile.findUnique({
        select: { storageKey: true, uploadStatus: true },
        where: { id: fileId },
      }),
    ).resolves.toMatchObject({
      storageKey: pending?.storageKey,
      uploadStatus: "VERIFIED",
    });
    expect(storageMock.deleteObject).not.toHaveBeenCalled();
  });

  it("rejects mismatched object metadata and tombstones the pending row", async () => {
    const intentResponse = await postUploadIntent(
      publicRequest("/api/uploads/intents", {
        mimeType: "model/stl",
        originalName: "mismatch.stl",
        sizeBytes: CAD_CONTENT.length,
      }),
    );
    expect(intentResponse.status).toBe(201);

    const intent = (await intentResponse.json()) as Record<string, unknown>;
    const fileId = intent.fileId;
    const uploadToken = intent.uploadToken;
    if (typeof fileId !== "string" || typeof uploadToken !== "string") {
      throw new Error("Upload intent mismatch tidak mengembalikan identitas yang valid.");
    }

    const pending = await prisma.storedFile.findUnique({
      select: { storageKey: true, uploadStatus: true },
      where: { id: fileId },
    });
    expect(pending).toMatchObject({ uploadStatus: "PENDING" });
    storageMock.headObject.mockResolvedValue({
      contentLength: 4,
      contentType: "model/stl",
    });

    const confirmationResponse = await postUploadConfirmation(
      publicRequest("/api/uploads/confirm", { fileId, uploadToken }),
    );

    expect(confirmationResponse.status).toBe(422);
    await expect(confirmationResponse.json()).resolves.toMatchObject({
      code: "UPLOAD_REJECTED",
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
      uploadStatus: "REJECTED",
      uploadTokenHash: null,
    });
    expect(storageMock.deleteObject).toHaveBeenCalledWith(pending?.storageKey);
  });
});
