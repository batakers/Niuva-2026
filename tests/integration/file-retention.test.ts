import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { AdminAccess } from "@/lib/auth/admin";
import type { Prisma } from "@/generated/prisma/client";
import { operationalJobFixture } from "../helpers/operational-job-fixture";
import { FileRetentionHoldService } from "@/modules/files/retention-hold-service";
import { StoredFileRepository } from "@/modules/files/repository";
import { createJobHandlers } from "@/modules/jobs/handlers";
import { JobRunner } from "@/modules/jobs/runner";
import { PrismaJobRepository } from "@/modules/jobs/repository";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import type { JobLease } from "@/modules/jobs/core";
import { CustomPrintQuoteRepository } from "@/modules/custom-print/repository";
import type { BoundDatabaseService } from "@/modules/database-binding/service";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { privacyOwnerSchema } from "@/modules/customer-privacy/validation";

let f: Awaited<ReturnType<typeof operationalJobFixture>>;
const files: string[] = [], admins: string[] = [], requests: string[] = [], rules: string[] = [], orders: string[] = [];
const customers: string[] = [];
const privacyCases: string[] = [];
const day = 86400000, ago = (days: number) => new Date(Date.now() - days * day);
const job = "CUSTOMER_FILE_RETENTION" as const;
const policy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1 };
beforeAll(async () => { f = await operationalJobFixture(); });
afterEach(async () => {
  await f.admin.$transaction(async tx => {
    await tx.auditLog.deleteMany({ where: { entityId: { in: [...files, ...admins, ...privacyCases] } } });
    await tx.refundCase.deleteMany({ where: { orderId: { in: orders } } });
    await tx.paymentAttempt.deleteMany({ where: { orderId: { in: orders } } });
    await tx.orderItem.deleteMany({ where: { orderId: { in: orders } } });
    await tx.order.deleteMany({ where: { id: { in: orders } } });
    await tx.customPrintRequestFile.deleteMany({ where: { fileId: { in: files } } });
    await tx.customPrintQuote.deleteMany({ where: { requestId: { in: requests } } });
    await tx.customPrintRequest.deleteMany({ where: { id: { in: requests } } });
    await tx.pricingRuleVersion.deleteMany({ where: { id: { in: rules } } });
    await tx.storedFile.deleteMany({ where: { id: { in: files } } });
    await tx.customerPrivacyRequest.deleteMany({ where: { OR: [{ customerId: { in: customers } }, { id: { in: privacyCases } }] } });
    await tx.customer.deleteMany({ where: { id: { in: customers } } });
    await tx.adminProfile.deleteMany({ where: { id: { in: admins } } });
    await tx.operationalJobState.deleteMany();
  });
  files.length = 0; admins.length = 0; requests.length = 0; rules.length = 0; orders.length = 0;
  customers.length = 0;
  privacyCases.length = 0;
});
afterAll(async () => { await f?.dispose(); });
async function owner(): Promise<AdminAccess> {
  const profile = await f.admin.adminProfile.create({ data: { role: "OWNER", isActive: true } });
  admins.push(profile.id); return { authUserId: profile.id, profile };
}
async function upload(changes: Partial<Prisma.StoredFileUncheckedCreateInput> = {}) {
  const id = randomUUID(); files.push(id);
  return f.admin.storedFile.create({ data: { id, bucketScope: "PRIVATE_CUSTOMER", purpose: "CUSTOMER_UPLOAD", uploadStatus: "UPLOADED",
    originalName: "private-model.stl", extension: "stl", mimeType: "model/stl", storageKey: `private/customer/${id}`, sizeBytes: BigInt(16),
    createdAt: ago(200), uploadedAt: ago(200), ...changes } });
}
const holdService = (access: AdminAccess) => new FileRetentionHoldService({ prisma: f.admin, authorizeAdmin: async () => access });
function runner(deleteObject: (key: string, options?: Readonly<{ signal?: AbortSignal }>) => Promise<void>, repository = new PrismaJobRepository()) {
  return new JobRunner({ bound: f.bound, expectedRole: f.role, repository, policy,
    handlers: createJobHandlers({ prisma: f.client, bound: f.bound, source: f.source, fileStorageFactory: () => ({ deleteObject }) }) });
}
const run = (mode: "execute" | "dry-run" = "execute", limit = 10) => ({ job, mode, limit });

async function linked(state: "unpaid" | "completed" | "active" | "cancelled" = "unpaid") {
  const file = await upload(), access = await owner(), suffix = randomUUID();
  const rule = await f.admin.pricingRuleVersion.create({ data: { code: `RETENTION-${suffix}`, version: 1, definitionJson: {}, status: "DRAFT" } }); rules.push(rule.id);
  const request = await f.admin.customPrintRequest.create({ data: { referenceNumber: `REQ-${suffix}`, publicTokenHash: randomUUID(),
    customerName: "Fixture", customerEmail: "fixture@example.test", customerPhone: "+628000000000", materialRequested: "PLA", quantity: 1,
    status: state === "unpaid" ? "QUOTE_SENT" : state === "cancelled" ? "CANCELLED" : "APPROVED", createdAt: ago(200), updatedAt: ago(200) } }); requests.push(request.id);
  await f.admin.$transaction(async tx => {
    await tx.customPrintRequestFile.create({ data: { requestId: request.id, fileId: file.id } });
    await tx.storedFile.update({ where: { id: file.id }, data: { uploadStatus: "VERIFIED", verifiedAt: ago(200) } });
  });
  const quote = await f.admin.customPrintQuote.create({ data: {
    requestId: request.id, quoteNumber: `QUO-${suffix}`, pricingRuleVersionId: rule.id, createdByAdminId: access.profile.id,
    publicTokenHash: randomUUID(), verifiedWeightG: "1", printDurationSeconds: 1, materialCode: "PLA", quantity: 1,
    materialSubtotalRp: "1", machineSubtotalRp: "0", unroundedTotalRp: "1", finalTotalRp: "1", calculationSnapshot: {},
    status: state === "unpaid" ? "SENT" : "ACCEPTED", createdAt: ago(200), sentAt: ago(200), expiresAt: ago(61),
    acceptedAt: state === "unpaid" ? null : ago(190),
  } });
  if (state !== "unpaid") {
    const order = await f.admin.order.create({ data: { orderNumber: `ORD-${suffix}`, publicTokenHash: randomUUID(), orderType: "CUSTOM_PRINT",
      customerName: "Fixture", customerEmail: "fixture@example.test", customerPhone: "+628000000000", itemsSubtotalRp: "1", shippingTotalRp: "0", grandTotalRp: "1",
      status: state === "completed" ? "COMPLETED" : state === "cancelled" ? "CANCELLED" : "IN_PRODUCTION",
      createdAt: ago(190), updatedAt: ago(100), completedAt: state === "completed" ? ago(91) : null, cancelledAt: state === "cancelled" ? ago(61) : null,
      items: { create: { itemType: "CUSTOM_PRINT", customQuoteId: quote.id, nameSnapshot: "Fixture", unitPriceRp: "1", quantity: 1, lineTotalRp: "1" } },
    } }); orders.push(order.id);
  }
  return { file, quote, request, access };
}

async function refundDispute(orderId: string, access: AdminAccess, status: "REQUESTED" | "APPROVED" | "RECONCILING" = "REQUESTED") {
  return f.admin.refundCase.create({ data: {
    orderId, status, version: status === "REQUESTED" ? 1 : 2, approvedVersion: status === "REQUESTED" ? null : 2,
    category: "ITEM_ISSUE", reason: "Fixture unresolved model dispute", requesterType: "ADMIN", requestedByAdminId: access.profile.id,
    contactVerificationReference: "SERVICE-REFUND-RETENTION", submissionKey: randomUUID(), requestHash: "a".repeat(64), snapshotHash: "b".repeat(64), amountRp: "1",
  } });
}

describe("lease-bound Customer file retention", () => {
  it("uses canonical S3 configuration and confirms a persisted claim before completing deletion", async () => {
    const file = await upload();
    const observed: { method: string; path: string; status: string | undefined }[] = [];
    const server = createServer(async (request, response) => {
      const current = await f.admin.storedFile.findUnique({ where: { id: file.id } });
      observed.push({ method: request.method ?? "", path: new URL(request.url ?? "/", "http://fixture.invalid").pathname, status: current?.uploadStatus });
      response.writeHead(204).end();
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const source = {
        ...f.source, NIUVA_PROVIDER_MODE: "sandbox",
        S3_ENDPOINT: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        S3_REGION: "retention-fixture-1", S3_ACCESS_KEY_ID: "TEST-ONLY", S3_SECRET_ACCESS_KEY: "TEST-ONLY",
        S3_PRIVATE_BUCKET: "retention-private", S3_PUBLIC_BUCKET: "retention-public",
        S3_FORCE_PATH_STYLE: "true", CUSTOM_FILE_MAX_BYTES: "104857600",
      };
      const runtime = new JobRunner({ bound: f.bound, expectedRole: f.role, repository: new PrismaJobRepository(), policy,
        handlers: createJobHandlers({ prisma: f.client, bound: f.bound, source }) });

      expect(await runtime.run(run())).toMatchObject({ state: "completed", counts: { claimed: 1, deleted: 1, failed: 0 } });
      expect(observed).toEqual([{ method: "DELETE", path: `/retention-private/${file.storageKey}`, status: "DELETE_PENDING" }]);
      expect(await f.admin.storedFile.findUnique({ where: { id: file.id } })).toMatchObject({ uploadStatus: "DELETED", deletedAt: expect.any(Date) });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });

  it("dry-runs due files without storage, audit, cursor or business writes", async () => {
    await upload(); await upload({ createdAt: ago(1), uploadedAt: ago(1) });
    const access = await owner();
    await upload({ purpose: "FINANCIAL_EVIDENCE", uploadedByAdminId: access.profile.id, uploadStatus: "PENDING" });
    await upload({ bucketScope: "PUBLIC_MEDIA" });
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    const result = await runner(deletes).run(run("dry-run"));
    expect(result).toMatchObject({ state: "completed", counts: { scanned: 2, eligible: 1, claimed: 0, deleted: 0 } });
    expect(deletes).not.toHaveBeenCalled();
    expect(await f.admin.operationalJobState.count()).toBe(0);
    expect(await f.admin.auditLog.count({ where: { entityId: { in: files } } })).toBe(0);
    expect(await f.admin.storedFile.count({ where: { id: { in: files }, uploadStatus: "DELETE_PENDING" } })).toBe(0);
  });
  it("persists a claim before storage removal and tombstones only after confirmation", async () => {
    const file = await upload();
    const objects = new Set([file.storageKey]);
    const deletes = vi.fn(async (key: string) => {
      expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).uploadStatus).toBe("DELETE_PENDING");
      objects.delete(key);
    });
    expect(await runner(deletes).run(run())).toMatchObject({ state: "completed", counts: { claimed: 1, deleted: 1 } });
    expect(objects.size).toBe(0);
    expect(await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({ uploadStatus: "DELETED", retentionAttempts: 1, deletedAt: expect.any(Date) });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { deleted: 0 } });
    expect(deletes).toHaveBeenCalledTimes(1);
    expect(await f.admin.auditLog.count({ where: { entityId: file.id, action: "file.retention.deleted" } })).toBe(1);
  });
  it("keeps overdue holds until Owner releases them and exposes only safe monitoring", async () => {
    const file = await upload(), access = await owner();
    await holdService(access).change({ operation: "hold", fileId: file.id, reason: "private legal case reference", reviewAt: new Date(Date.now() + day).toISOString() });
    await f.admin.storedFile.update({ where: { id: file.id }, data: { retentionHoldReviewAt: ago(1) } });
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { activeHolds: 1, deleted: 0 } });
    const inspection = await createOperationalJobRuntime({ prisma: f.client, source: f.source }).inspect({ maxLagMs: 1000 });
    expect(inspection.files).toMatchObject({ held: 1, overdueHolds: 1 });
    expect(inspection.alarms).toContainEqual({ code: "FILE_HOLD_OVERDUE" });
    expect(JSON.stringify(inspection)).not.toContain("private legal case reference");
    expect(deletes).not.toHaveBeenCalled();
    await holdService(access).change({ operation: "release", fileId: file.id });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { deleted: 1 } });
  });
  it("rejects ordinary Admin, inactive Owner and invalid hold input", async () => {
    const file = await upload(), access = await owner();
    await expect(holdService({ ...access, profile: { ...access.profile, role: "ADMIN" } }).change({ operation: "release", fileId: file.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await f.admin.adminProfile.update({ where: { id: access.profile.id }, data: { isActive: false } });
    await expect(holdService(access).change({ operation: "release", fileId: file.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(holdService(access).change({ operation: "hold", fileId: file.id, reason: "x", reviewAt: "invalid" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(holdService(access).change({ operation: "hold", fileId: file.id, reason: "😀😀😀😀😀", reviewAt: new Date(Date.now() + day).toISOString() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("honors a linked Customer privacy dispute even when its review date is overdue", async () => {
    const email = `file-${randomUUID()}@example.test`;
    const customer = await f.admin.customer.create({ data: { email, normalizedEmail: email } }); customers.push(customer.id);
    const file = await upload({ uploadedByCustomerId: customer.id });
    const privacy = await f.admin.customerPrivacyRequest.create({ data: { customerId: customer.id, referenceNumber: `PRV-FILE-${randomUUID()}`, submissionKey: randomUUID(),
      kind: "ADDITIONAL", dueAt: ago(1), holdCategory: "DISPUTE", holdReason: "Fixture active dispute", holdReviewAt: ago(1) } });
    privacyCases.push(privacy.id);
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { activeHolds: 1, deleted: 0 } });
    expect(deletes).not.toHaveBeenCalled();
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).uploadStatus).toBe("UPLOADED");
  });
  it("preserves binary holds across permanent account removal and detached privacy cases", async () => {
    const email = `closed-file-${randomUUID()}@example.test`;
    const customer = await f.admin.customer.create({ data: { email, normalizedEmail: email } }); customers.push(customer.id);
    const file = await upload({ uploadedByCustomerId: customer.id });
    const privacy = await f.admin.customerPrivacyRequest.create({ data: { customerId: customer.id, referenceNumber: `PRV-CLOSED-${randomUUID()}`, submissionKey: randomUUID(),
      kind: "ADDITIONAL", dueAt: ago(1), holdCategory: "DISPUTE", holdReason: "Fixture active dispute", holdReviewAt: ago(1) } });
    privacyCases.push(privacy.id);
    await f.admin.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, customer.id, new Date()); });
    expect((await f.admin.customerPrivacyRequest.findUniqueOrThrow({ where: { id: privacy.id } })).customerId).toBeNull();
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { activeHolds: 1, deleted: 0 } });
    expect(deletes).not.toHaveBeenCalled();
    await f.admin.customerPrivacyRequest.delete({ where: { id: privacy.id } });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { activeHolds: 1, deleted: 0 } });
    const inspection = await createOperationalJobRuntime({ prisma: f.client, source: f.source }).inspect({ maxLagMs: 1000 });
    expect(inspection.alarms).toContainEqual({ code: "FILE_HOLD_OVERDUE" });
    const access = await owner();
    await holdService(access).change({ operation: "release", fileId: file.id });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { deleted: 1 } });
    expect(await f.admin.customer.findUnique({ where: { id: customer.id } })).toBeNull();
  });
  it("releases only the Owner-selected privacy hold after account closure", async () => {
    const access = await owner(), email = `multi-hold-${randomUUID()}@example.test`;
    const customer = await f.admin.customer.create({ data: { email, normalizedEmail: email } }); customers.push(customer.id);
    const file = await upload({ uploadedByCustomerId: customer.id }), repository = new CustomerPrivacyRepository(f.admin);
    const caseIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const row = await f.admin.customerPrivacyRequest.create({ data: { customerId: customer.id, referenceNumber: `PRV-MULTI-${randomUUID()}`, submissionKey: randomUUID(), kind: "ADDITIONAL", dueAt: new Date(Date.now() + day) } });
      caseIds.push(row.id); privacyCases.push(row.id);
      await repository.handle(privacyOwnerSchema.parse({ id: row.id, status: "IN_REVIEW", response: "Fixture case under review", holdCategory: "DISPUTE", holdReason: "Fixture active dispute", holdReviewAt: new Date(Date.now() + day).toISOString().slice(0, 10) }), access.profile.id, new Date());
    }
    await f.admin.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, customer.id, new Date()); });
    await expect(holdService(access).change({ operation: "release", fileId: file.id })).rejects.toMatchObject({ code: "CONFLICT" });
    await repository.handle(privacyOwnerSchema.parse({ id: caseIds[0], status: "IN_REVIEW", response: "Fixture case review complete" }), access.profile.id, new Date());
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).retentionPrivacyHoldCaseIds).toEqual([caseIds[1]]);
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { activeHolds: 1, deleted: 0 } });
    await repository.handle(privacyOwnerSchema.parse({ id: caseIds[1], status: "IN_REVIEW", response: "Fixture case review complete" }), access.profile.id, new Date());
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { deleted: 1 } });
  });
  it("rechecks a hold committed after the claim before touching storage", async () => {
    const file = await upload(), access = await owner(); let applied = false;
    const bound: Pick<BoundDatabaseService, "run"> = {
      async run<T>(operation: "outbox" | "job", work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        const result = await f.bound.run(operation, work);
        if (!applied && await f.admin.storedFile.count({ where: { id: file.id, uploadStatus: "DELETE_PENDING" } }) === 1) {
          applied = true;
          await holdService(access).change({ operation: "hold", fileId: file.id, reason: "Fixture hold during cleanup", reviewAt: new Date(Date.now() + day).toISOString() });
        }
        return result;
      },
    };
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    const guarded = new JobRunner({ bound, expectedRole: f.role, repository: new PrismaJobRepository(), policy,
      handlers: createJobHandlers({ prisma: f.client, bound, source: f.source, fileStorageFactory: () => ({ deleteObject: deletes }) }) });
    expect(await guarded.run(run())).toMatchObject({ counts: { claimed: 1, activeHolds: 1, deleted: 0 } });
    expect(deletes).not.toHaveBeenCalled();
    await holdService(access).change({ operation: "release", fileId: file.id });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { deleted: 1 } });
  });
  it("retains failed storage work durably, blocks reuse and retries the same immutable key", async () => {
    const file = await upload();
    const failed = vi.fn(async () => { throw new Error("private provider response"); });
    expect(await runner(failed).run(run())).toMatchObject({ state: "failed", counts: { failed: 1, deleted: 0 } });
    const row = await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } });
    expect(row).toMatchObject({ uploadStatus: "DELETE_PENDING", deletedAt: null, retentionLastFailure: "STORAGE_OUTCOME_UNKNOWN" });
    await expect(new StoredFileRepository(f.admin).transition(file.id, "VERIFIED")).rejects.toMatchObject({ code: "FORBIDDEN" });
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ state: "completed", counts: { claimed: 0, deleted: 1 } });
    expect(deletes.mock.calls[0][0]).toBe(file.storageKey);
    expect(await f.admin.auditLog.count({ where: { entityId: file.id, action: "file.retention.requested" } })).toBe(1);
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).retentionAttempts).toBe(2);
  });
  it("leaves a recoverable claim when the lease expires after the storage side effect", async () => {
    const file = await upload(); let removed = false;
    class ExpiringRepository extends PrismaJobRepository {
      override async verifyLease(tx: Prisma.TransactionClient, lease: JobLease) {
        if (removed) await tx.operationalJobState.update({ where: { name: job }, data: { leaseExpiresAt: new Date(0) } });
        return super.verifyLease(tx, lease);
      }
    }
    expect(await runner(async () => { removed = true; }, new ExpiringRepository()).run(run())).toMatchObject({ state: "failed" });
    expect(await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({ uploadStatus: "DELETE_PENDING", deletedAt: null });
    expect(await f.admin.auditLog.count({ where: { entityId: file.id, action: "file.retention.deleted" } })).toBe(0);
    expect(await runner(async () => undefined).run(run())).toMatchObject({ state: "completed", counts: { deleted: 1 } });
  });
  it("applies the 60/90-day classes while preserving active orders and every business record", async () => {
    const unpaid = await linked(), completed = await linked("completed"), active = await linked("active"), cancelled = await linked("cancelled");
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ state: "completed", counts: { deleted: 3 } });
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: active.file.id } })).uploadStatus).toBe("VERIFIED");
    for (const id of [unpaid.file.id, cancelled.file.id]) expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id } })).retentionClass).toBe("CANCELLED_OR_UNPAID_REQUEST");
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: completed.file.id } })).retentionClass).toBe("COMPLETED_CUSTOM_ORDER");
    expect(await f.admin.customPrintRequest.count({ where: { id: { in: requests } } })).toBe(4);
    expect(await f.admin.customPrintQuote.count({ where: { requestId: { in: requests } } })).toBe(4);
    expect(await f.admin.order.count({ where: { id: { in: orders } } })).toBe(3);
  });
  it.each(["REQUESTED", "APPROVED", "RECONCILING"] as const)("holds overdue completed models while a refund is %s, including after Customer closure", async status => {
    const { file, request, access } = await linked("completed");
    const order = await f.admin.order.findFirstOrThrow({ where: { id: { in: orders } } });
    const email = `refund-retention-${randomUUID()}@example.test`;
    const customer = await f.admin.customer.create({ data: { email, normalizedEmail: email } }); customers.push(customer.id);
    await f.admin.order.update({ where: { id: order.id }, data: { customerId: customer.id } });
    await f.admin.customPrintRequest.update({ where: { id: request.id }, data: { customerId: customer.id } });
    await f.admin.storedFile.update({ where: { id: file.id }, data: { uploadedByCustomerId: customer.id } });
    const refund = await refundDispute(order.id, access, status);
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run())).toMatchObject({ state: "completed", counts: { activeHolds: 1, deleted: 0 } });
    await f.admin.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, customer.id, new Date()); });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { activeHolds: 1, deleted: 0 } });
    expect(deletes).not.toHaveBeenCalled();
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).uploadStatus).toBe("VERIFIED");
    await f.admin.refundCase.update({ where: { id: refund.id }, data: { status: "COMPLETED", version: 2, approvedVersion: 2 } });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { deleted: 1 } });
    expect(deletes).toHaveBeenCalledTimes(1);
  });
  it("rechecks a refund dispute opened after the deletion claim before touching storage", async () => {
    const { file, access } = await linked("completed");
    const order = await f.admin.order.findFirstOrThrow({ where: { id: { in: orders } } });
    let opened = false;
    const bound: Pick<BoundDatabaseService, "run"> = {
      async run<T>(operation: "outbox" | "job", work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        const result = await f.bound.run(operation, work);
        if (!opened && await f.admin.storedFile.count({ where: { id: file.id, uploadStatus: "DELETE_PENDING" } }) === 1) {
          opened = true;
          await refundDispute(order.id, access);
        }
        return result;
      },
    };
    const deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    const guarded = new JobRunner({ bound, expectedRole: f.role, repository: new PrismaJobRepository(), policy,
      handlers: createJobHandlers({ prisma: f.client, bound, source: f.source, fileStorageFactory: () => ({ deleteObject: deletes }) }) });
    expect(await guarded.run(run())).toMatchObject({ state: "completed", counts: { claimed: 1, activeHolds: 1, deleted: 0 } });
    expect(deletes).not.toHaveBeenCalled();
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).uploadStatus).toBe("DELETE_PENDING");
    await f.admin.refundCase.update({ where: { orderId: order.id }, data: { status: "COMPLETED", version: 2, approvedVersion: 2 } });
    expect(await runner(deletes).run(run())).toMatchObject({ counts: { claimed: 0, deleted: 1 } });
  });
  it("blocks a new payable order after an irreversible deletion claim", async () => {
    const { file, quote } = await linked();
    await runner(async () => { throw new Error("storage unavailable"); }).run(run());
    await expect(new CustomPrintQuoteRepository(f.admin).acceptAndCreatePayableOrder({ quoteId: quote.id, orderId: randomUUID(), orderNumber: `ORD-${randomUUID()}`,
      orderPublicTokenHash: randomUUID(), now: new Date(), version: quote.version })).rejects.toMatchObject({ code: "QUOTE_NOT_READY" });
    expect(await f.admin.orderItem.count({ where: { customQuoteId: quote.id } })).toBe(0);
    expect((await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).uploadStatus).toBe("DELETE_PENDING");
  });
  it("records timeout as unknown and safely retries when storage removed an object without replying", async () => {
    const file = await upload(); const objects = new Set([file.storageKey]); let signal: AbortSignal | undefined;
    const result = await runner(async (key, options) => { objects.delete(key); signal = options?.signal; return new Promise<void>(() => {}); }).run(run());
    expect(result).toMatchObject({ state: "failed", counts: { unknown: 1, deleted: 0 } });
    expect(signal?.aborted).toBe(true); expect(objects.size).toBe(0);
    expect(await f.admin.storedFile.findUniqueOrThrow({ where: { id: file.id } })).toMatchObject({ uploadStatus: "DELETE_PENDING", deletedAt: null, retentionLastFailure: "STORAGE_OUTCOME_UNKNOWN" });
    expect(await runner(async key => { objects.delete(key); }).run(run())).toMatchObject({ state: "completed", counts: { deleted: 1 } });
  });
  it("advances a durable bounded scan past a page of held files", async () => {
    const access = await owner();
    const ids = Array.from({ length: 100 }, () => randomUUID()); files.push(...ids);
    await f.admin.storedFile.createMany({ data: ids.map(id => ({ id, storageKey: `private/customer/${id}`, originalName: "held.stl", extension: "stl", mimeType: "model/stl",
      sizeBytes: BigInt(1), bucketScope: "PRIVATE_CUSTOMER", uploadStatus: "UPLOADED", createdAt: ago(201), uploadedAt: ago(201),
      retentionHoldOwnerId: access.profile.id, retentionHoldReason: "Fixture legal hold", retentionHoldReviewAt: new Date(Date.now() + day) })) });
    const due = await upload(), deletes = vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
    expect(await runner(deletes).run(run("execute", 1))).toMatchObject({ counts: { scanned: 100, activeHolds: 100, deleted: 0 } });
    expect(await runner(deletes).run(run("execute", 1))).toMatchObject({ counts: { scanned: 1, deleted: 1 } });
    expect(deletes.mock.calls[0][0]).toBe(due.storageKey);
  });
});
