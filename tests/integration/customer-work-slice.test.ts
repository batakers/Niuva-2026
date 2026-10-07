import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { AdminOperationsService } from "@/modules/admin/operations";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { CustomPrintAccessService } from "@/modules/custom-print/access-service";
import { CustomerPreviewService } from "@/modules/custom-print/customer-preview-service";
import { readCustomerPreviewSnapshot } from "@/modules/custom-print/customer-preview";
import { CustomPrintEstimateService } from "@/modules/custom-print/estimate";
import { CustomPrintService } from "@/modules/custom-print/service";
import { B2BQuoteService } from "@/modules/inquiry/b2b-quote";
import { InquiryService } from "@/modules/inquiry/service";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";
import { QuoteService } from "@/modules/quote/service";
import { RoughCustomShippingService } from "@/modules/shipping/rough-custom";

const prisma = getPrismaClient();
const email = "owner@example.test";
const inquiryInput = { confidentialityAck: true, currentStage: "IDEA", description: "Perlu rancangan perangkat untuk pengujian awal.",
  email: "spoof@example.test", name: "Owner", phone: "+628000000000", projectGoal: "Prototipe awal", targetQuantity: "2 unit" };
const makeInput = { customerName: "Owner", customerEmail: "spoof@example.test", customerPhone: "+628000000000",
  intakeMode: "REFERENCE_ONLY", materialRequested: "NEEDS_RECOMMENDATION", quantity: 2,
  notes: "Perlu casing baru dari referensi deskripsi saja." };

async function clean() {
  await prisma.$executeRaw`TRUNCATE TABLE "audit_logs", "order_items", "orders", "custom_print_quotes",
    "custom_print_estimates", "custom_print_reviews", "custom_print_request_files", "custom_print_requests",
    "b2b_quotes", "b2b_inquiries", "stored_files", "pricing_rule_versions", "admin_profiles",
    "customer_sessions", "customers" RESTART IDENTITY CASCADE`;
}
async function customer(address: string) {
  return prisma.customer.create({ data: { email: address, normalizedEmail: address, googleSubject: randomUUID() } });
}
async function admin(): Promise<AdminAccess> {
  const profile = await prisma.adminProfile.create({ data: { clerkUserId: `admin_${randomUUID()}`, isActive: true, role: "OWNER" } });
  return { authUserId: profile.id, profile };
}
async function uploaded(extension: "stl" | "obj" | "3mf" | "step" | "stp" | "jpg" | "png", uploadedByCustomerId?: string) {
  const id = randomUUID();
  return prisma.storedFile.create({ data: { id, bucketScope: "PRIVATE_CUSTOMER", extension,
    mimeType: extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : `model/${extension}`,
    originalName: `input.${extension}`,
    sizeBytes: BigInt(16), storageKey: `private/customer/${id}`, uploadStatus: "UPLOADED",
    uploadedByCustomerId } });
}
async function activeRule(adminId: string) {
  return prisma.pricingRuleVersion.create({ data: { code: "CUSTOM_PRINT_V1", version: 1,
    definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY, status: "ACTIVE", approvedAt: new Date(), approvedByAdminId: adminId } });
}

beforeEach(clean);
afterAll(clean);

describe("Customer ownership and commercial slice", () => {
  it("permits simulation only for the authenticated owner's unclaimed uploaded mesh and exactly one active rule", async () => {
    const owner = await customer(email);
    const other = await customer("other@example.test");
    const access = await admin();
    const service = new CustomerPreviewService(undefined, () => true);
    const model = await uploaded("stl", owner.id);
    const input = { fileId: model.id, materialRequested: "PLA", quantity: 2,
      customerPreviewInput: { source: "CUSTOMER_DECLARED_SLICER", weightGramsPerUnit: "1.5",
        printDurationSecondsPerUnit: 3_600 } };
    await expect(service.preview(input, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.preview(input, owner.id)).status).toBe("REVIEW_REQUIRED");
    await activeRule(access.profile.id);
    expect(await service.preview(input, owner.id)).toMatchObject({ status: "READY", finalTotalRp: "13000" });
    for (const extension of ["obj", "3mf", "step", "stp", "jpg", "png"] as const) {
      const file = await uploaded(extension, owner.id);
      expect((await service.preview({ ...input, fileId: file.id }, owner.id)).status,
        extension).toBe(["obj", "3mf"].includes(extension) ? "READY" : "REVIEW_REQUIRED");
    }
    const pending = await uploaded("stl", owner.id);
    await prisma.storedFile.update({ where: { id: pending.id }, data: { uploadStatus: "PENDING" } });
    await expect(service.preview({ ...input, fileId: pending.id }, owner.id)).rejects.toMatchObject({ code: "CONFLICT" });
    const deleted = await uploaded("stl", owner.id);
    await prisma.storedFile.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });
    await expect(service.preview({ ...input, fileId: deleted.id }, owner.id)).rejects.toMatchObject({ code: "CONFLICT" });
    await prisma.pricingRuleVersion.create({ data: { code: "CUSTOM_PRINT_V1", version: 2,
      definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY, status: "ACTIVE", approvedAt: new Date(),
      approvedByAdminId: access.profile.id } });
    expect((await service.preview(input, owner.id)).status).toBe("REVIEW_REQUIRED");
    expect((await new CustomerPreviewService(undefined, () => false).preview(input, owner.id)).status).toBe("REVIEW_REQUIRED");
  });

  it("recalculates the saved snapshot at submit, preserves text intake without R2, and excludes claimed files", async () => {
    const owner = await customer(email);
    const access = await admin();
    await activeRule(access.profile.id);
    const model = await uploaded("stl", owner.id);
    const previewInput = { source: "CUSTOMER_DECLARED_SLICER" as const,
      weightGramsPerUnit: "1", printDurationSecondsPerUnit: 3_600 };
    const service = new CustomerPreviewService(undefined, () => true);
    const preview = await service.preview({ fileId: model.id, materialRequested: "PLA", quantity: 1,
      customerPreviewInput: previewInput }, owner.id);
    expect(preview).toMatchObject({ status: "READY", finalTotalRp: "6000" });
    const submitted = await new CustomPrintService().submit({ ...makeInput, intakeMode: "MODEL_READY",
      fileIds: [model.id], materialRequested: "PLA", unitConfirmation: "MILLIMETER_CONFIRMED",
      customerPreviewInput: previewInput }, { id: owner.id, email: owner.email });
    const saved = readCustomerPreviewSnapshot((await prisma.customPrintRequest.findUniqueOrThrow({
      where: { id: submitted.request.id },
    })).customerPreviewSnapshot);
    expect(saved).toMatchObject({ kind: "CUSTOMER_PRE_REVIEW_V1", fileId: model.id,
      input: { quantity: 2, filamentSource: "NIUVA_STOCK" },
      result: { finalTotalRp: "12000" } });
    expect(saved?.pricingRule.definition).toEqual(CUSTOM_PRINT_V1_PER_UNIT_POLICY);
    expect((await prisma.auditLog.findFirstOrThrow({ where: { entityId: submitted.request.id,
      action: "custom-print.request.submitted" } })).afterJson).toMatchObject({
      customerPreviewStored: true, customerPreviewRuleVersion: 1,
    });
    expect((await new CustomerWorkRepository().request(owner.id, submitted.request.id))?.customerPreviewSnapshot).toEqual(saved);
    await expect(service.preview({ fileId: model.id, materialRequested: "PLA", quantity: 1,
      customerPreviewInput: previewInput }, owner.id)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.customPrintEstimate.count()).toBe(0);
    const textOnly = await new CustomPrintService().submit(makeInput, { id: owner.id, email: owner.email });
    expect((await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: textOnly.request.id } })).customerPreviewSnapshot).toBeNull();
  });

  it("fails closed when the active rule changes after preview but still accepts the MAKE request", async () => {
    const owner = await customer(email);
    const access = await admin();
    const rule = await activeRule(access.profile.id);
    const model = await uploaded("stl", owner.id);
    const slicer = { source: "CUSTOMER_DECLARED_SLICER" as const, weightGramsPerUnit: "1",
      printDurationSecondsPerUnit: 3_600 };
    expect((await new CustomerPreviewService(undefined, () => true).preview({ fileId: model.id,
      materialRequested: "PLA", quantity: 2, customerPreviewInput: slicer }, owner.id)).status).toBe("READY");
    await prisma.pricingRuleVersion.update({ where: { id: rule.id }, data: { status: "RETIRED" } });
    const submitted = await new CustomPrintService().submit({ ...makeInput, intakeMode: "MODEL_READY",
      fileIds: [model.id], materialRequested: "PLA", unitConfirmation: "MILLIMETER_CONFIRMED",
      customerPreviewInput: slicer }, { id: owner.id, email: owner.email });
    expect((await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: submitted.request.id } })).customerPreviewSnapshot).toBeNull();
    expect(await prisma.customPrintEstimate.count()).toBe(0);
  });

  it("claims an old inquiry once under contention, rotates its token, and never infers ownership from email", async () => {
    const owner = await customer(email);
    const other = await customer("other@example.test");
    const submitted = await new InquiryService().submit(inquiryInput);
    const repository = new CustomerWorkRepository();
    const wrong = `${submitted.accessToken.token.slice(0, -1)}x`;
    await expect(repository.claim({ customerId: owner.id, kind: "B2B_INQUIRY", token: wrong })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await repository.inquiry(owner.id, submitted.inquiry.id)).toBeNull();
    const competing = await Promise.allSettled([
      repository.claim({ customerId: owner.id, kind: "B2B_INQUIRY", token: submitted.accessToken.token }),
      repository.claim({ customerId: other.id, kind: "B2B_INQUIRY", token: submitted.accessToken.token }),
    ]);
    expect(competing.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const saved = await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: submitted.inquiry.id } });
    expect([owner.id, other.id]).toContain(saved.customerId);
    expect(saved.publicTokenHash).not.toBe(submitted.accessToken.tokenHash);
    await expect(repository.claim({ customerId: owner.id, kind: "B2B_INQUIRY", token: submitted.accessToken.token })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await repository.inquiry(saved.customerId!, submitted.inquiry.id)).not.toBeNull();
    expect(await repository.inquiry(saved.customerId === owner.id ? other.id : owner.id, submitted.inquiry.id)).toBeNull();
  });

  it("claims a historical MAKE request once while an operator changes its status", async () => {
    const owner = await customer(email);
    const other = await customer("other@example.test");
    const oldRequest = await new CustomPrintService().submit(makeInput);
    const repository = new CustomerWorkRepository();
    const outcomes = await Promise.allSettled([
      repository.claim({ customerId: owner.id, kind: "CUSTOM_PRINT_REQUEST", token: oldRequest.accessToken.token }),
      prisma.customPrintRequest.update({ where: { id: oldRequest.request.id }, data: { status: "UNDER_REVIEW" } }),
    ]);
    expect(outcomes.every((result) => result.status === "fulfilled")).toBe(true);
    const saved = await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: oldRequest.request.id } });
    expect(saved).toMatchObject({ customerId: owner.id, status: "UNDER_REVIEW" });
    expect(saved.publicTokenHash).not.toBe(oldRequest.accessToken.tokenHash);
    await expect(new CustomPrintAccessService().getStatus(oldRequest.accessToken.token)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(repository.claim({ customerId: other.id, kind: "CUSTOM_PRINT_REQUEST", token: oldRequest.accessToken.token })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await repository.request(owner.id, oldRequest.request.id)).not.toBeNull();
    expect(await repository.request(other.id, oldRequest.request.id)).toBeNull();
  });

  it("links an unowned historical custom order when its request token is claimed", async () => {
    const owner = await customer(email);
    const access = await admin();
    const rule = await activeRule(access.profile.id);
    const model = await uploaded("stl");
    const request = await new CustomPrintService().submit({ ...makeInput, intakeMode: "MODEL_READY",
      fileIds: [model.id], materialRequested: "PLA", unitConfirmation: "MILLIMETER_CONFIRMED" });
    await new CustomPrintService({ authorizeAdmin: async () => access }).recordReview({ requestId: request.request.id,
      materialCode: "PLA", quantity: 2, verifiedWeightG: "12.5", printDurationSeconds: 900 });
    const quotes = new QuoteService({ authorizeAdmin: async () => access });
    const draft = await quotes.createDraft({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      materialCode: "PLA", filamentSource: "NIUVA_STOCK" });
    const sent = await quotes.send(draft.quote.id);
    const accepted = await quotes.accept({ quoteId: draft.quote.id, token: sent.accessToken.token });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: accepted.orderId } })).customerId).toBeNull();
    await new CustomerWorkRepository().claim({ customerId: owner.id, kind: "CUSTOM_PRINT_REQUEST",
      token: request.accessToken.token });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: accepted.orderId } })).customerId).toBe(owner.id);
  });

  it("keeps text-only MAKE account-owned, rejects foreign/invalid model files, and publishes a reviewed Decimal range", async () => {
    const owner = await customer(email);
    const other = await customer("other@example.test");
    const access = await admin();
    const rule = await activeRule(access.profile.id);
    const request = await new CustomPrintService().submit(makeInput, { id: owner.id, email: owner.email });
    const work = new CustomerWorkRepository();
    expect((await work.request(owner.id, request.request.id))?.notes).toContain("referensi");
    expect(await work.request(other.id, request.request.id)).toBeNull();
    await expect(new CustomPrintAccessService().getStatus(request.accessToken.token)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const custom = new CustomPrintService({ authorizeAdmin: async () => access });
    await expect(custom.recordReview({ requestId: request.request.id, materialCode: "PLA", quantity: 2,
      verifiedWeightG: "12.5", printDurationSeconds: 900 })).rejects.toMatchObject({ code: "CONFLICT" });
    const jpg = await uploaded("jpg", owner.id);
    const foreignModel = await uploaded("stl", other.id);
    const model = await uploaded("stl", owner.id);
    const append = new CustomPrintAccessService();
    await expect(append.appendAccountModel({ requestId: request.request.id, fileId: jpg.id }, owner.id)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(append.appendAccountModel({ requestId: request.request.id, fileId: foreignModel.id,
      unitConfirmation: "MILLIMETER_CONFIRMED" }, owner.id)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(append.appendAccountModel({ requestId: request.request.id, fileId: model.id,
      unitConfirmation: "MILLIMETER_CONFIRMED" }, other.id)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await append.appendAccountModel({ requestId: request.request.id, fileId: model.id,
      unitConfirmation: "MILLIMETER_CONFIRMED" }, owner.id);
    await expect(append.appendAccountModel({ requestId: request.request.id, fileId: model.id,
      unitConfirmation: "MILLIMETER_CONFIRMED" }, owner.id)).rejects.toMatchObject({ code: "CONFLICT" });
    await custom.recordReview({ requestId: request.request.id, materialCode: "PLA", quantity: 2,
      verifiedWeightG: "12.5", printDurationSeconds: 900 });
    const estimateService = new CustomPrintEstimateService({ authorizeAdmin: async () => access });
    const estimate = await estimateService.publish({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      filamentSource: "NIUVA_STOCK", additionalCosts: [{ name: "Setup", amountRp: "50000" }], noAdditionalCosts: false });
    expect(estimate.lowerRp.toString()).toBe("77500");
    expect(estimate.upperRp.toString()).toBe("100750");
    const snapshot = await prisma.customPrintEstimate.findUniqueOrThrow({ where: { id: estimate.id } });
    expect(snapshot.publishedByAdminId).toBe(access.profile.id);
    expect(snapshot.additionalSubtotalRp.toString()).toBe("50000");
    await expect(estimateService.publish({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      filamentSource: "NIUVA_STOCK", additionalCosts: [{ name: "Bad", amountRp: "0" }], noAdditionalCosts: false })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("freezes MAKE extras in quote, checks range and latest estimate, and creates an account-owned order", async () => {
    const owner = await customer(email);
    const access = await admin();
    const rule = await activeRule(access.profile.id);
    const model = await uploaded("stl", owner.id);
    const request = await new CustomPrintService().submit({ ...makeInput, intakeMode: "MODEL_READY", fileIds: [model.id],
      materialRequested: "PLA", notes: "Model tersedia", unitConfirmation: "MILLIMETER_CONFIRMED",
      customerPreviewInput: { source: "CUSTOMER_DECLARED_SLICER", weightGramsPerUnit: "1",
        printDurationSecondsPerUnit: 3_600 } }, { id: owner.id, email: owner.email });
    expect(readCustomerPreviewSnapshot((await prisma.customPrintRequest.findUniqueOrThrow({
      where: { id: request.request.id },
    })).customerPreviewSnapshot)?.result.finalTotalRp).toBe("12000");
    await new CustomPrintService({ authorizeAdmin: async () => access }).recordReview({ requestId: request.request.id,
      materialCode: "PLA", quantity: 2, verifiedWeightG: "12.5", printDurationSeconds: 900 });
    const createPayment = vi.fn().mockResolvedValue({ token: "local-test-payment-token" });
    const quoteService = new QuoteService({ authorizeAdmin: async () => access,
      paymentProvider: { provider: "TEST", createPayment } });
    await expect(quoteService.createDraft({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      materialCode: "PLA", filamentSource: "NIUVA_STOCK" })).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    const estimates = new CustomPrintEstimateService({ authorizeAdmin: async () => access });
    await estimates.publish({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      filamentSource: "NIUVA_STOCK", additionalCosts: [{ name: "Setup", amountRp: "50000" }], noAdditionalCosts: false });
    await expect(quoteService.createDraft({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      materialCode: "PLA", filamentSource: "NIUVA_STOCK", finalTotalRp: "100751" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const draft = await quoteService.createDraft({ requestId: request.request.id, pricingRuleVersionId: rule.id,
      materialCode: "PLA", filamentSource: "NIUVA_STOCK" });
    const quote = await prisma.customPrintQuote.findUniqueOrThrow({ where: { id: draft.quote.id } });
    expect(quote.additionalSubtotalRp.toString()).toBe("50000");
    expect(quote.finalTotalRp.toString()).toBe("77500");
    expect(quote.materialSubtotalRp.toString()).not.toBe("2000");
    expect(quote.finalTotalRp.toString()).not.toBe("12000");
    await quoteService.send(quote.id);
    const operations = new AdminOperationsService({ authorize: async () => access });
    expect(await operations.getCustomPrintLinkedOrders(request.request.id)).toEqual([]);
    await expect(quoteService.accept({ quoteId: quote.id, token: "wrong" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(quoteService.accept({ quoteId: quote.id }, randomUUID())).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const accepted = await quoteService.accept({ quoteId: quote.id }, owner.id);
    expect(accepted.kind).toBe("CREATED");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: accepted.orderId } });
    expect(await operations.getCustomPrintLinkedOrders(request.request.id)).toEqual([{ id: order.id, orderNumber: order.orderNumber, status: order.status }]);
    expect(await operations.getOrderSourceRequests(order.id)).toEqual([{ id: request.request.id, referenceNumber: request.request.referenceNumber, status: "APPROVED" }]);
    expect(order.customerId).toBe(owner.id);
    expect(order.shippingTotalRp.toString()).toBe("0");
    expect(order.grandTotalRp.toString()).toBe("77500");
    expect(order.grandTotalRp.toString()).not.toBe("12000");
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ amountRp: "77500" }));
    const attempt = await prisma.paymentAttempt.findFirstOrThrow({ where: { orderId: order.id } });
    expect(attempt.amountRp.toString()).toBe("77500");
    expect((await quoteService.accept({ quoteId: quote.id }, owner.id)).kind).toBe("ALREADY_ACCEPTED");
    expect(await operations.getCustomPrintLinkedOrders(request.request.id)).toHaveLength(1);
    expect(await operations.getOrderSourceRequests(order.id)).toHaveLength(1);
  });

  it("requires a new estimate after slicer revision and expires stale drafts", async () => {
    const owner = await customer(email);
    const access = await admin();
    const rule = await activeRule(access.profile.id);
    const model = await uploaded("stl", owner.id);
    const request = await new CustomPrintService().submit({ ...makeInput, intakeMode: "MODEL_READY",
      fileIds: [model.id], materialRequested: "PLA", unitConfirmation: "MILLIMETER_CONFIRMED" },
    { id: owner.id, email: owner.email });
    const review = new CustomPrintService({ authorizeAdmin: async () => access });
    const reviewInput = { requestId: request.request.id, materialCode: "PLA", quantity: 2,
      verifiedWeightG: "12.5", printDurationSeconds: 900 };
    await review.recordReview(reviewInput);
    const estimates = new CustomPrintEstimateService({ authorizeAdmin: async () => access });
    const estimateInput = { requestId: request.request.id, pricingRuleVersionId: rule.id,
      filamentSource: "NIUVA_STOCK", additionalCosts: [], noAdditionalCosts: true };
    await estimates.publish(estimateInput);
    const quotes = new QuoteService({ authorizeAdmin: async () => access });
    const quoteInput = { requestId: request.request.id, pricingRuleVersionId: rule.id,
      materialCode: "PLA", filamentSource: "NIUVA_STOCK" };
    const oldDraft = await quotes.createDraft(quoteInput);

    await review.recordReview({ ...reviewInput, verifiedWeightG: "13.5" });
    expect((await new CustomerWorkRepository().list(owner.id)).requests[0].estimates).toHaveLength(0);
    await expect(quotes.send(oldDraft.quote.id)).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    const revisedEstimate = await estimates.publish(estimateInput);
    expect(revisedEstimate.version).toBe(2);
    expect((await prisma.customPrintQuote.findUniqueOrThrow({ where: { id: oldDraft.quote.id } })).status).toBe("EXPIRED");

    const sentDraft = await quotes.createDraft(quoteInput);
    await quotes.send(sentDraft.quote.id);
    await review.recordReview({ ...reviewInput, verifiedWeightG: "14.5" });
    await expect(quotes.accept({ quoteId: sentDraft.quote.id }, owner.id)).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    expect((await new CustomerWorkRepository().list(owner.id)).requests[0].estimates).toHaveLength(0);
    expect((await estimates.publish(estimateInput)).version).toBe(3);
  });

  it("versions B2B proposals and records only the owning account decision", async () => {
    const owner = await customer(email);
    const other = await customer("other@example.test");
    const access = await admin();
    const inquiry = await new InquiryService().submit(inquiryInput, { id: owner.id, email: owner.email });
    const service = new B2BQuoteService({ authorizeAdmin: async () => access });
    const input = { inquiryId: inquiry.inquiry.id, scope: "Rancang prototipe mekanis awal.",
      assumptions: "Spesifikasi akhir disetujui setelah diskusi.",
      lineItems: [{ name: "Desain", amountRp: "1500000" }, { name: "Prototype", amountRp: "750000" }],
      validUntil: "2030-12-31" };
    await expect(service.send({ ...input, lineItems: [{ name: "Biaya nol", amountRp: "0" }] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.send({ ...input, lineItems: [{ name: "Biaya negatif", amountRp: "-100" }] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const first = await service.send(input);
    expect(first.totalRp.toString()).toBe("2250000");
    await expect(service.decide({ inquiryId: input.inquiryId, quoteId: first.id, decision: "ACCEPTED" }, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const second = await service.send({ ...input, scope: "Rancang prototipe revisi untuk pengujian." });
    await expect(service.decide({ inquiryId: input.inquiryId, quoteId: first.id, decision: "ACCEPTED" }, owner.id)).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    const decisions = await Promise.allSettled([
      service.decide({ inquiryId: input.inquiryId, quoteId: second.id, decision: "ACCEPTED" }, owner.id),
      service.decide({ inquiryId: input.inquiryId, quoteId: second.id, decision: "DECLINED" }, owner.id),
    ]);
    expect(decisions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const third = await service.send({ ...input, scope: "Rancang prototipe versi ketiga." });
    await expect(new B2BQuoteService({ now: () => new Date("2031-01-01T00:00:00.000Z") }).decide({
      inquiryId: input.inquiryId, quoteId: third.id, decision: "ACCEPTED",
    }, owner.id)).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiry.inquiry.id } })).status).toBe("NEW");
  });

  it("checks rough shipping only on explicit action, caches mock rates, and never changes payable totals", async () => {
    const owner = await customer(email);
    const access = await admin();
    const request = await new CustomPrintService().submit(makeInput, { id: owner.id, email: owner.email });
    const getRates = vi.fn().mockResolvedValue([
      { courierCode: "jne", courierName: "JNE", serviceName: "REG", serviceCode: "reg", priceRp: new Decimal(18000) },
      { courierCode: "other", courierName: "Other", serviceName: "X", serviceCode: "x", priceRp: new Decimal(1000) },
    ]);
    const shipping = new RoughCustomShippingService({ authorizeAdmin: async () => access,
      provider: { getRates }, allowedCouriers: ["jne"] });
    expect((await shipping.checkRates(owner.id, request.request.id, { postalCode: "12345" })).status).toBe("PENDING");
    await shipping.saveEstimatedPackage(request.request.id, { weightGrams: 500, lengthCm: 10, widthCm: 8,
      heightCm: 5, declaredValueRp: 100000 });
    const [first, repeat] = await Promise.all([
      shipping.checkRates(owner.id, request.request.id, { postalCode: "12345" }),
      shipping.checkRates(owner.id, request.request.id, { postalCode: "12345" }),
    ]);
    expect(first).toMatchObject({ status: "AVAILABLE", lowerRp: "18000", upperRp: "18000" });
    expect(repeat).toEqual(first);
    expect(getRates).toHaveBeenCalledTimes(1);
    getRates.mockRejectedValueOnce(new Error("testing provider unavailable"));
    expect((await shipping.checkRates(owner.id, request.request.id, { postalCode: "54321" })).status).toBe("PENDING");
    await expect(shipping.checkRates(randomUUID(), request.request.id, { postalCode: "12345" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.customPrintQuote.count()).toBe(0);
    expect(await prisma.order.count()).toBe(0);
  });
});
