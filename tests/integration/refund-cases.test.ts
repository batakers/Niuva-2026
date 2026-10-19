import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { closureIdentityHash } from "@/modules/customer-privacy/core";
import { exportCustomerData, serializePrivacyExport } from "@/modules/customer-privacy/repository";
import { RefundRepository } from "@/modules/refund/repository";
import { RefundService } from "@/modules/refund/service";

const prisma = getPrismaClient(), repository = new RefundRepository(prisma);
const customers: string[] = [], orders: string[] = [], admins: string[] = [], emails: string[] = [], products: string[] = [];
const reason = "Barang tidak sesuai dengan pesanan yang diterima.";
const service = (access?: AdminAccess) => new RefundService({ repository, authorizeAdmin: async () => { if (!access) throw new Error("Unexpected Admin access"); return access; } });
async function customer() {
  const email = `refund-${randomUUID()}@example.test`;
  const row = await prisma.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date() } });
  customers.push(row.id); emails.push(email); return row;
}
async function actor(role: "OWNER" | "ADMIN" = "OWNER"): Promise<AdminAccess> {
  const row = await prisma.adminProfile.create({ data: { role, isActive: true } }); admins.push(row.id);
  return { authUserId: randomUUID(), profile: { id: row.id, role, isActive: true } };
}
async function order(customerId?: string, type: "RETAIL" | "CUSTOM_PRINT" = "RETAIL") {
  const row = await prisma.order.create({ data: { customerId, orderNumber: `REFUND-${randomUUID()}`, orderType: type,
    status: "COMPLETED", customerName: "Refund Fixture", customerEmail: "refund@example.test", customerPhone: "+62800000000",
    grandTotalRp: "100000", itemsSubtotalRp: "100000", shippingTotalRp: "0", publicTokenHash: randomUUID(), paidAt: new Date(), completedAt: new Date() } });
  orders.push(row.id); return row;
}
async function payment(orderId: string, purpose: "ORDER_TOTAL" | "CUSTOM_SHIPPING" = "ORDER_TOTAL", amountRp = "100000") {
  return prisma.paymentAttempt.create({ data: { orderId, purpose, providerOrderId: randomUUID(), providerTransactionId: randomUUID(),
    amountRp, status: "SETTLED", settledAt: new Date(), expiresAt: new Date(Date.now() + 60000) } });
}
async function fixture(type: "RETAIL" | "CUSTOM_PRINT" = "RETAIL") {
  const c = await customer(), o = await order(c.id, type), p = await payment(o.id);
  return { customer: c, order: o, payment: p, input: { orderId: o.id, submissionKey: randomUUID(), category: "ITEM_ISSUE" as const, reason } };
}
async function approval(orderId: string, version = 1, returnState = "NOT_REQUIRED") {
  return { orderId, expectedVersion: version, submissionKey: randomUUID(), reason: "Owner sudah memeriksa pembayaran dan alasan pengajuan.", returnState };
}
afterEach(async () => {
  const cases = await prisma.refundCase.findMany({ where: { orderId: { in: orders } }, select: { id: true } });
  const caseIds = cases.map(row => row.id);
  await prisma.$transaction(async tx => {
    await tx.refundReturnReceipt.deleteMany({ where: { approval: { caseId: { in: caseIds } } } });
    await tx.refundApproval.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.refundCaseRevision.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.refundAllocation.deleteMany({ where: { caseId: { in: caseIds } } });
    await tx.refundCase.deleteMany({ where: { id: { in: caseIds } } });
    await tx.auditLog.deleteMany({ where: { entityType: "RefundCase", entityId: { in: caseIds } } });
    await tx.paymentEvent.deleteMany({ where: { paymentAttempt: { orderId: { in: orders } } } });
    await tx.paymentAttempt.deleteMany({ where: { orderId: { in: orders } } });
    await tx.stockMovement.deleteMany({ where: { orderId: { in: orders } } });
    await tx.orderItem.deleteMany({ where: { orderId: { in: orders } } });
    await tx.order.deleteMany({ where: { id: { in: orders } } });
    await tx.productVariant.deleteMany({ where: { productId: { in: products } } });
    await tx.product.deleteMany({ where: { id: { in: products } } });
    await tx.customer.deleteMany({ where: { id: { in: customers } } });
    await tx.customerClosureFence.deleteMany({ where: { identityHash: { in: emails.map(closureIdentityHash) } } });
    await tx.adminProfile.deleteMany({ where: { id: { in: admins } } });
  });
  customers.length = 0; orders.length = 0; admins.length = 0; emails.length = 0; products.length = 0;
});
describe("T21 persisted full-refund request", () => {
  it("uses all verified server charges for MAKE and excludes pending retries", async () => {
    const f = await fixture("CUSTOM_PRINT"); await payment(f.order.id, "CUSTOM_SHIPPING", "16003");
    await prisma.paymentAttempt.create({ data: { orderId: f.order.id, purpose: "ORDER_TOTAL", providerOrderId: randomUUID(), amountRp: "100000", expiresAt: new Date(Date.now() + 60000) } });
    const row = await service().request(f.customer.id, f.input);
    expect(row).toMatchObject({ status: "REQUESTED", amountRp: "116003", version: 1 });
    expect(row.allocations).toHaveLength(2);
    expect(await prisma.auditLog.count({ where: { entityId: row.id, action: "refund.requested" } })).toBe(1);
    await expect(service().request(f.customer.id, { ...f.input, amountRp: "1" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("denies another Customer, an expired account and a missing session identity", async () => {
    const f = await fixture(), other = await customer();
    await expect(service().request(other.id, f.input)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service().customerOrder(other.id, f.order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await prisma.customer.update({ where: { id: f.customer.id }, data: { internalTestExpiresAt: new Date(Date.now() - 1000) } });
    await expect(service().request(f.customer.id, f.input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service().request(randomUUID(), f.input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("deduplicates concurrent requests and rejects key reuse with changed content", async () => {
    const f = await fixture();
    const results = await Promise.all([service().request(f.customer.id, f.input), service().request(f.customer.id, f.input)]);
    expect(results[0].id).toBe(results[1].id);
    expect(await prisma.refundAllocation.count({ where: { caseId: results[0].id } })).toBe(1);
    await expect(service().request(f.customer.id, { ...f.input, reason: "Alasan berbeda setelah pengajuan pertama." })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service().request(f.customer.id, { ...f.input, submissionKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("accepts verified late-settlement money without reopening a cancelled order", async () => {
    const f = await fixture();
    await prisma.order.update({ where: { id: f.order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await prisma.paymentAttempt.update({ where: { id: f.payment.id }, data: { status: "EXPIRED", settledAt: null } });
    await prisma.paymentEvent.create({ data: { paymentAttemptId: f.payment.id, provider: "MIDTRANS", eventFingerprint: randomUUID(), providerOrderId: f.payment.providerOrderId, processingResult: "LATE_SETTLEMENT_REFUND_REQUIRED" } });
    expect((await service().request(f.customer.id, f.input)).amountRp).toBe("100000");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("CANCELLED");
  });
  it("does not request a second refund or guess an unpaid amount", async () => {
    const f = await fixture();
    await prisma.paymentAttempt.update({ where: { id: f.payment.id }, data: { status: "PENDING", settledAt: null } });
    await expect(service().request(f.customer.id, f.input)).rejects.toMatchObject({ code: "CONFLICT" });
    await prisma.paymentAttempt.update({ where: { id: f.payment.id }, data: { status: "REFUNDED" } });
    await expect(service().request(f.customer.id, f.input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.refundCase.count({ where: { orderId: f.order.id } })).toBe(0);
  });
});

describe("T22 Owner approval and return evidence", () => {
  it("denies Admin and revoked/forged Owner profiles before an approval is written", async () => {
    const f = await fixture(), admin = await actor("ADMIN"), owner = await actor();
    await service().request(f.customer.id, f.input); const input = await approval(f.order.id);
    await expect(service(admin).approve(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await prisma.adminProfile.update({ where: { id: owner.profile.id }, data: { isActive: false } });
    await expect(service(owner).approve(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service({ ...admin, profile: { ...admin.profile, role: "OWNER" } }).approve(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await prisma.refundApproval.count({ where: { caseId: (await prisma.refundCase.findUniqueOrThrow({ where: { orderId: f.order.id } })).id } })).toBe(0);
  });
  it("persists one immutable approval across overlap and same-key retry", async () => {
    const f = await fixture(), owner = await actor(), input = await approval(f.order.id);
    const requested = await service().request(f.customer.id, f.input);
    const results = await Promise.all([service(owner).approve(input), service(owner).approve(input)]);
    expect(results[0]).toMatchObject({ id: requested.id, status: "APPROVED", version: 2 });
    expect(results[0].readyAt).not.toBeNull(); expect(results[1].version).toBe(2);
    expect(await prisma.refundApproval.count({ where: { caseId: requested.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: requested.id, action: "refund.approved" } })).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("COMPLETED");
    expect(await prisma.stockMovement.count({ where: { orderId: f.order.id } })).toBe(0);
    await expect(service(owner).approve({ ...input, reason: "Persetujuan berbeda dengan submission key lama." })).rejects.toMatchObject({ code: "CONFLICT" });
    const customerView = await service().customerOrder(f.customer.id, f.order.id);
    expect(customerView).not.toHaveProperty("approvals"); expect(customerView).not.toHaveProperty("contactVerificationReference");
  });
  it("keeps a conditional approval unready until explicit Owner return evidence arrives", async () => {
    const f = await fixture(), owner = await actor(); await service().request(f.customer.id, f.input);
    const approved = await service(owner).approve(await approval(f.order.id, 1, "PENDING"));
    expect(approved.readyAt).toBeNull(); expect(approved.returnState).toBe("PENDING");
    const input = { orderId: f.order.id, expectedVersion: 2, submissionKey: randomUUID(), reason: "Barang sudah diterima dan diperiksa oleh Owner.", returnEvidenceReference: "RETUR-FIXTURE-001" };
    const received = await service(owner).receiveReturn(input);
    expect(received.returnState).toBe("RECEIVED"); expect(received.readyAt).not.toBeNull(); expect(received.version).toBe(3);
    expect((await service(owner).receiveReturn(input)).version).toBe(3);
    const approvalRow = await prisma.refundApproval.findFirstOrThrow({ where: { caseId: approved.id } });
    expect(approvalRow.returnState).toBe("PENDING"); expect(approvalRow.returnSatisfiedAt).toBeNull();
    expect(await prisma.refundReturnReceipt.count({ where: { approvalId: approvalRow.id } })).toBe(1);
  });
  it("accepts exactly one of two overlapping Owner decisions with different keys", async () => {
    const f = await fixture(), left = await actor(), right = await actor(); const requested = await service().request(f.customer.id, f.input);
    const results = await Promise.allSettled([service(left).approve(await approval(f.order.id)), service(right).approve(await approval(f.order.id))]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toMatchObject([{ status: "rejected", reason: { code: "CONFLICT" } }]);
    expect(await prisma.refundApproval.count({ where: { caseId: requested.id } })).toBe(1);
  });
  it("preserves a fulfilled retail variant's physical balance and stock ledger", async () => {
    const f = await fixture(), owner = await actor();
    const product = await prisma.product.create({ data: { slug: `refund-stock-${randomUUID()}`, name: "Synthetic Refund Stock Fixture", description: "Synthetic automated test record", variants: { create: { sku: randomUUID(), name: "Fixture", priceRp: "100000", weightGrams: "100", stockOnHand: 7 } } }, include: { variants: true } }); products.push(product.id);
    const variant = product.variants[0]!;
    await prisma.orderItem.create({ data: { orderId: f.order.id, variantId: variant.id, itemType: "PRODUCT", nameSnapshot: product.name, unitPriceRp: "100000", lineTotalRp: "100000", quantity: 1 } });
    await service().request(f.customer.id, f.input); await service(owner).approve(await approval(f.order.id));
    expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockOnHand).toBe(7);
    expect(await prisma.stockMovement.count({ where: { variantId: variant.id } })).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status).toBe("COMPLETED");
  });
  it("requires evidence and a reason, with no permanent private URL", async () => {
    const f = await fixture(), owner = await actor(); await service().request(f.customer.id, f.input);
    const input = await approval(f.order.id, 1, "RECEIVED");
    await expect(service(owner).approve(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service(owner).approve({ ...input, returnEvidenceReference: "https://private.example.test/object?token=secret" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service(owner).approve({ ...input, returnEvidenceReference: "RETUR-001", reason: "" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((await service(owner).approve({ ...input, returnEvidenceReference: "RETUR-001" })).readyAt).not.toBeNull();
  });
  it("rejects a changed payment snapshot until refreshed and preserves the original receipt time", async () => {
    const f = await fixture("CUSTOM_PRINT"), owner = await actor(); const requested = await service().request(f.customer.id, f.input);
    await payment(f.order.id, "CUSTOM_SHIPPING", "17000");
    await expect(service(owner).approve(await approval(f.order.id))).rejects.toMatchObject({ code: "CONFLICT" });
    const input = { orderId: f.order.id, expectedVersion: 1, submissionKey: randomUUID(), reason: "Pembayaran ongkir final baru sudah diverifikasi." };
    const refreshed = await service(owner).refresh(input);
    expect(refreshed).toMatchObject({ amountRp: "117000", version: 2, receivedAt: requested.receivedAt, status: "REQUESTED" });
    expect((await service(owner).refresh(input)).version).toBe(2);
    expect((await service(owner).approve(await approval(f.order.id, 2))).amountRp).toBe("117000");
  });
  it("revokes the current approval on refresh and retains its immutable history", async () => {
    const f = await fixture(), owner = await actor(); const requested = await service().request(f.customer.id, f.input);
    await service(owner).approve(await approval(f.order.id));
    const refreshed = await service(owner).refresh({ orderId: f.order.id, expectedVersion: 2, submissionKey: randomUUID(), reason: "Owner perlu memeriksa kembali syarat retur kasus." });
    expect(refreshed).toMatchObject({ status: "REQUESTED", readyAt: null, version: 3 });
    expect(await prisma.refundApproval.count({ where: { caseId: requested.id } })).toBe(1);
    await service(owner).approve(await approval(f.order.id, 3));
    expect(await prisma.refundApproval.count({ where: { caseId: requested.id } })).toBe(2);
  });
});

describe("refund lifecycle and persisted constraints", () => {
  it("exports only the Customer's refund fields and omits Owner decisions, operation keys and evidence references", async () => {
    const f = await fixture(), other = await fixture(), owner = await actor();
    const row = await service().request(f.customer.id, f.input); await service().request(other.customer.id, other.input);
    await service(owner).approve({ ...await approval(f.order.id), reason: "Internal Owner decision must not leak in the account export." });
    const exported = await prisma.$transaction(tx => exportCustomerData(tx, f.customer.id, new Date()));
    expect(exported.refunds).toHaveLength(1); expect(exported.refunds[0]).toMatchObject({ id: row.id, amountRp: expect.anything() });
    const encoded = serializePrivacyExport(exported);
    for (const field of ["Internal Owner decision", "submissionKey", "snapshotHash", "providerTransactionId", "contactVerificationReference"]) expect(encoded).not.toContain(field);
  });
  it("continues Owner review after closure without attaching the old case to a new same-email account", async () => {
    const f = await fixture(), owner = await actor(); const row = await service().request(f.customer.id, f.input);
    await prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); await eraseCustomerAccount(tx, f.customer.id, new Date()); });
    expect((await prisma.refundCase.findUniqueOrThrow({ where: { id: row.id } })).requestedByCustomerId).toBeNull();
    expect((await service(owner).approve(await approval(f.order.id))).status).toBe("APPROVED");
    const replacement = await prisma.customer.create({ data: { email: f.customer.email, normalizedEmail: f.customer.normalizedEmail, emailVerifiedAt: new Date() } }); customers.push(replacement.id);
    await expect(service().customerOrder(replacement.id, f.order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const o = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
    expect(o.customerId).toBeNull(); expect(o.accountClosedAt).not.toBeNull();
  });
  it("does not create a case when permanent closure wins the lifecycle lock", async () => {
    const f = await fixture(); let release: () => void = () => {}, acquired: () => void = () => {};
    const ready = new Promise<void>(resolve => { acquired = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    const closure = prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); acquired(); await gate; await eraseCustomerAccount(tx, f.customer.id, new Date()); }, { timeout: 15000 });
    await ready;
    const results = Promise.allSettled([closure, service().request(f.customer.id, f.input)]); release();
    const settled = await results;
    expect(settled[0].status).toBe("fulfilled"); expect(settled[1]).toMatchObject({ status: "rejected", reason: { code: "UNAUTHORIZED" } });
    expect(await prisma.refundCase.count({ where: { orderId: f.order.id } })).toBe(0);
  });
  it("records contact verification for staff intake on a detached order", async () => {
    const o = await order(), admin = await actor("ADMIN"); await payment(o.id);
    await prisma.order.update({ where: { id: o.id }, data: { accountClosedAt: new Date() } });
    const input = { orderId: o.id, submissionKey: randomUUID(), category: "OTHER", reason, contactVerificationReference: "SERVICE-CONTACT-001" };
    const row = await service(admin).intake(input);
    expect(row.status).toBe("REQUESTED");
    expect((await service(admin).adminOrder(o.id)).contactVerificationReference).toBe("SERVICE-CONTACT-001");
    await expect(service(admin).intake({ ...input, contactVerificationReference: undefined })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejects negative money and duplicate payment allocation at the database boundary", async () => {
    const f = await fixture(); const row = await service().request(f.customer.id, f.input);
    await expect(prisma.refundCase.update({ where: { id: row.id }, data: { amountRp: "-1" } })).rejects.toThrow();
    const allocation = await prisma.refundAllocation.findUniqueOrThrow({ where: { paymentAttemptId: f.payment.id } });
    await expect(prisma.refundAllocation.create({ data: { ...allocation, id: randomUUID() } })).rejects.toThrow();
  });
});
