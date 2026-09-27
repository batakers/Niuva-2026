import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const customerAuthMocks = vi.hoisted(() => ({ requireCustomer: vi.fn() }));
vi.mock("@/lib/auth/customer", () => ({
  getCurrentCustomer: async () => null,
  requireCustomer: customerAuthMocks.requireCustomer,
}));

import { POST as postCustomPrint } from "@/app/api/custom-print/requests/route";
import { POST as postAppendModel } from "@/app/api/custom-print/requests/[token]/files/route";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/clerk";
import { CustomPrintAccessService } from "@/modules/custom-print/access-service";
import { CustomPrintService } from "@/modules/custom-print/service";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";
import { QuoteService } from "@/modules/quote/service";
import { appError } from "@/modules/shared/errors";

const prisma = getPrismaClient();
const baseInput = {
  customerEmail: "reference@example.test",
  customerName: "Reference Customer",
  customerPhone: "+628000000000",
  materialRequested: "NEEDS_RECOMMENDATION",
  quantity: 2,
};

async function clean(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE
      "audit_logs", "custom_print_quotes", "custom_print_reviews",
      "custom_print_request_files", "custom_print_requests", "b2b_inquiry_files",
      "b2b_inquiries", "stored_files", "admin_profiles", "customers", "customer_sessions",
      "pricing_rule_versions"
    RESTART IDENTITY CASCADE
  `;
}

async function uploadedFile(extension: "stl" | "jpg" | "png") {
  const id = randomUUID();
  return prisma.storedFile.create({
    data: {
      bucketScope: "PRIVATE_CUSTOMER",
      extension,
      id,
      mimeType: extension === "stl" ? "model/stl" : extension === "jpg" ? "image/jpeg" : "image/png",
      originalName: `reference.${extension}`,
      sizeBytes: BigInt(3),
      storageKey: `private/customer/${id}`,
      uploadStatus: "UPLOADED",
    },
  });
}

async function adminAccess(): Promise<AdminAccess> {
  const profile = await prisma.adminProfile.create({ data: { clerkUserId: `owner_${randomUUID()}`, isActive: true, role: "OWNER" } });
  return { clerkUserId: profile.clerkUserId, profile };
}

function reviewInput(requestId: string) {
  return {
    materialCode: "PLA",
    printDurationSeconds: 900,
    quantity: 2,
    requestId,
    verifiedWeightG: "12.5",
  };
}

let routeCustomerId: string;
beforeEach(async () => {
  await clean();
  const customer = await prisma.customer.create({ data: {
    email: "reference-account@example.test", normalizedEmail: "reference-account@example.test",
    googleSubject: `reference-${randomUUID()}`,
  } });
  routeCustomerId = customer.id;
  customerAuthMocks.requireCustomer.mockReset();
  customerAuthMocks.requireCustomer.mockResolvedValue({ id: customer.id, email: customer.email,
    normalizedEmail: customer.normalizedEmail, displayName: null, avatarUrl: null });
});
afterAll(clean);

describe("reference-only custom request persistence", () => {
  it("rejects text-only MAKE without a Customer session", async () => {
    customerAuthMocks.requireCustomer.mockRejectedValueOnce(appError("UNAUTHORIZED"));
    const response = await postCustomPrint(new Request("http://127.0.0.1:3000/api/custom-print/requests", {
      body: JSON.stringify({ ...baseInput, intakeMode: "REFERENCE_ONLY", notes: "Deskripsi awal" }),
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
      method: "POST",
    }));
    expect(response.status).toBe(401);
    await expect(prisma.customPrintRequest.count()).resolves.toBe(0);
  });

  it("accepts a text-only request through the public route without invoking upload", async () => {
    const response = await postCustomPrint(new Request("http://127.0.0.1:3000/api/custom-print/requests", {
      body: JSON.stringify({
        ...baseInput,
        intakeMode: "REFERENCE_ONLY",
        notes: "Butuh casing dari sketsa yang belum dibuat menjadi CAD.",
        referenceLink: "https://example.test/sketch",
      }),
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
      method: "POST",
    }));
    expect(response.status).toBe(201);
    const body = (await response.json()) as { requestId: string; referenceNumber: string };
    const request = await prisma.customPrintRequest.findUniqueOrThrow({
      include: { files: true },
      where: { referenceNumber: body.referenceNumber },
    });
    expect(request).toMatchObject({
      intakeMode: "REFERENCE_ONLY",
      referenceLink: "https://example.test/sketch",
      status: "SUBMITTED",
      customerId: routeCustomerId,
      customerEmail: "reference-account@example.test",
    });
    expect(request.files).toHaveLength(0);
    const status = await new CustomerWorkRepository().request(routeCustomerId, body.requestId);
    expect(status).toMatchObject({ referenceNumber: body.referenceNumber, intakeMode: "REFERENCE_ONLY" });
    expect(body).not.toHaveProperty("accessToken");
    await expect(new CustomPrintAccessService().getStatus(body.referenceNumber)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("preserves the legacy model mode and never treats a private photo as sliceable", async () => {
    const model = await uploadedFile("stl");
    const legacy = await new CustomPrintService().submit({ ...baseInput, fileIds: [model.id], materialRequested: "PLA" });
    await expect(prisma.customPrintRequest.findUniqueOrThrow({
      select: { intakeMode: true }, where: { id: legacy.request.id },
    })).resolves.toEqual({ intakeMode: "MODEL_READY" });

    const photo = await uploadedFile("jpg");
    const reference = await new CustomPrintService().submit({
      ...baseInput,
      fileIds: [photo.id],
      intakeMode: "REFERENCE_ONLY",
      notes: "Foto benda yang perlu direplikasi.",
    });
    expect((await new CustomPrintAccessService().getStatus(reference.accessToken.token)).modelReady).toBe(false);
    const admin = await adminAccess();
    await expect(new CustomPrintService({ authorizeAdmin: async () => admin }).recordReview(
      reviewInput(reference.request.id),
    )).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(prisma.customPrintReview.count({ where: { requestId: reference.request.id } })).resolves.toBe(0);
  });

  it("does not create a quote from a reference request before a verified model and review", async () => {
    const request = await new CustomPrintService().submit({
      ...baseInput, intakeMode: "REFERENCE_ONLY", notes: "Deskripsi awal",
    });
    const admin = await adminAccess();
    const rule = await prisma.pricingRuleVersion.create({
      data: {
        approvedAt: new Date(),
        approvedByAdminId: admin.profile.id,
        code: "CUSTOM_PRINT_V1",
        definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
        status: "ACTIVE",
        version: 1,
      },
    });
    await expect(new QuoteService({ authorizeAdmin: async () => admin }).createDraft({
      filamentSource: "NIUVA_STOCK",
      materialCode: "PLA",
      pricingRuleVersionId: rule.id,
      requestId: request.request.id,
    })).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    await expect(prisma.customPrintQuote.count({ where: { requestId: request.request.id } })).resolves.toBe(0);
  });

  it("attaches a verified STL to the same request and revokes the old token on reissue", async () => {
    const request = await new CustomPrintService().submit({
      ...baseInput,
      intakeMode: "REFERENCE_ONLY",
      notes: "Perlu model sesuai referensi.",
    });
    const model = await uploadedFile("stl");
    const access = new CustomPrintAccessService();
    const wrongToken = `${request.accessToken.token.slice(0, -1)}${request.accessToken.token.endsWith("a") ? "b" : "a"}`;
    await expect(access.appendModel({ token: wrongToken, fileId: model.id })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(access.appendModel({ token: request.accessToken.token, fileId: model.id })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const appendResponse = await postAppendModel(new Request(
      `http://127.0.0.1:3000/api/custom-print/requests/${request.accessToken.token}/files`,
      {
        body: JSON.stringify({ fileId: model.id, unitConfirmation: "MILLIMETER_CONFIRMED" }),
        headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
        method: "POST",
      },
    ), { params: Promise.resolve({ token: request.accessToken.token }) });
    expect(appendResponse.status).toBe(201);
    await expect(appendResponse.json()).resolves.toEqual({ referenceNumber: request.request.referenceNumber });
    const saved = await prisma.customPrintRequest.findUniqueOrThrow({
      include: { files: true }, where: { id: request.request.id },
    });
    expect(saved).toMatchObject({ unitConfirmation: "MILLIMETER_CONFIRMED", status: "SUBMITTED" });
    expect(saved.files).toEqual([expect.objectContaining({ fileId: model.id })]);
    expect((await access.getStatus(request.accessToken.token)).modelReady).toBe(true);

    const admin = await adminAccess();
    const scopedAccess = new CustomPrintAccessService({ authorizeAdmin: async () => admin });
    const fresh = await scopedAccess.reissuePublicToken(request.request.id);
    await expect(access.getStatus(request.accessToken.token)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await access.getStatus(fresh.token)).referenceNumber).toBe(request.request.referenceNumber);

    await new CustomPrintService({ authorizeAdmin: async () => admin }).recordReview(reviewInput(request.request.id));
    expect((await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: request.request.id } })).status).toBe("QUOTE_READY");
    const anotherModel = await uploadedFile("stl");
    await expect(access.appendModel({ token: fresh.token, fileId: anotherModel.id, unitConfirmation: "MILLIMETER_CONFIRMED" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects a photo, an already claimed file, and a stale token while attaching", async () => {
    const request = await new CustomPrintService().submit({
      ...baseInput, intakeMode: "REFERENCE_ONLY", notes: "Deskripsi awal",
    });
    const access = new CustomPrintAccessService();
    const photo = await uploadedFile("png");
    await expect(access.appendModel({ token: request.accessToken.token, fileId: photo.id })).rejects.toMatchObject({ code: "CONFLICT" });

    const model = await uploadedFile("stl");
    await new CustomPrintService().submit({ ...baseInput, fileIds: [model.id], materialRequested: "PLA" });
    await expect(access.appendModel({
      token: request.accessToken.token, fileId: model.id, unitConfirmation: "MILLIMETER_CONFIRMED",
    })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await access.getStatus(request.accessToken.token)).modelReady).toBe(false);
  });

  it("serializes model attachment and slicer review without accepting a model after review", async () => {
    const request = await new CustomPrintService().submit({
      ...baseInput, intakeMode: "REFERENCE_ONLY", notes: "Deskripsi awal",
    });
    const first = await uploadedFile("stl");
    const access = new CustomPrintAccessService();
    await access.appendModel({ token: request.accessToken.token, fileId: first.id, unitConfirmation: "MILLIMETER_CONFIRMED" });
    const second = await uploadedFile("stl");
    const admin = await adminAccess();
    const reviewService = new CustomPrintService({ authorizeAdmin: async () => admin });
    const results = await Promise.allSettled([
      access.appendModel({ token: request.accessToken.token, fileId: second.id, unitConfirmation: "MILLIMETER_CONFIRMED" }),
      reviewService.recordReview(reviewInput(request.request.id)),
    ]);
    expect(results[1].status).toBe("fulfilled");
    const review = await prisma.customPrintReview.findUnique({ where: { requestId: request.request.id } });
    expect(review).not.toBeNull();
    const attached = await prisma.customPrintRequestFile.findUnique({ where: { fileId: second.id } });
    const file = await prisma.storedFile.findUniqueOrThrow({ where: { id: second.id } });
    expect(file.uploadStatus).toBe(attached === null ? "UPLOADED" : "VERIFIED");
    if (results[0].status === "rejected") {
      expect(attached).toBeNull();
    } else {
      expect(attached?.requestId).toBe(request.request.id);
    }
  });
});
