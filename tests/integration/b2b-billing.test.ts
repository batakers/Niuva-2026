import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { B2BBillingService } from "@/modules/finance/b2b-billing-service";
import { ManualPaymentService } from "@/modules/finance/manual-payment-service";
import { InvoiceService } from "@/modules/finance/invoice-service";
import { BillingSettingsService } from "@/modules/finance/billing-settings-service";
import { financeActor, financePrisma as prisma, testBillingInstructions } from "./helpers/finance";
async function project(ownerId: string) {
  const email = `b2b-fin-${randomUUID()}@example.test`, customer = await prisma.customer.create({ data: { email, normalizedEmail: email } });
  const inquiry = await prisma.b2BInquiry.create({ data: { customerId: customer.id, name: "Synthetic B2B Fixture", email, phone: "+628000000000", referenceNumber: randomUUID(), projectGoal: "Synthetic goal", currentStage: "IDEA", description: "Synthetic approved proposal fixture", targetQuantity: "1", confidentialityAck: true, publicTokenHash: randomUUID(), quotes: { create: { version: 1, status: "ACCEPTED", scope: "Synthetic accepted project scope", assumptions: "Synthetic project assumption", lineItems: [{ name: "Synthetic project", amountRp: "1000000" }], totalRp: "1000000", validUntil: new Date(Date.now() + 86400000), createdByAdminId: ownerId, decidedByCustomerId: customer.id, decidedAt: new Date() } } }, include: { quotes: true } });
  return { inquiry, quote: inquiry.quotes[0]! };
}
describe("one B2B invoice with DP and balance", () => {
  it("enforces Owner terms, confirms DP/balance once, and keeps invoice total through correction", async () => {
    const owner = await financeActor(), admin = await financeActor("ADMIN"), fixture = await project(owner.profile.id), terms = new B2BBillingService(), payments = new ManualPaymentService(), invoices = new InvoiceService();
    const input = { inquiryId: fixture.inquiry.id, acceptedQuoteId: fixture.quote.id, expectedVersion: 0, mode: "DEPOSIT_BALANCE", depositRp: "300000" };
    await expect(terms.setTerms(admin, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(terms.setTerms(owner, { ...input, depositRp: "1000000" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const billing = await terms.setTerms(owner, input);
    const settingsService = new BillingSettingsService(), current = await settingsService.load(owner), settings = await settingsService.save(owner, { expectedVersion: current.version, values: testBillingInstructions });
    const draft = await invoices.createDraft(admin, { source: { kind: "B2B", inquiryId: fixture.inquiry.id }, idempotencyKey: randomUUID() });
    const invoice = await invoices.issue(admin, { invoiceId: draft.id, expectedVersion: draft.version, settingsVersion: settings.version, idempotencyKey: randomUUID() });
    const date = new Date().toISOString().slice(0, 10);
    const paymentInput = { billingCaseId: billing.id, expectedVersion: billing.version, amountRp: "300000", receivedDate: date, reference: randomUUID(), confirmed: true, idempotencyKey: randomUUID() };
    const dp = await payments.record(admin, paymentInput); expect((await payments.record(admin, paymentInput)).id).toBe(dp.id);
    const afterDp = await terms.workspace(admin, fixture.inquiry.id); expect(afterDp?.billingCase).toMatchObject({ totalRp: "1000000", paidRp: "300000", remainingRp: "700000", paymentState: "PARTIAL" });
    const balance = await payments.record(admin, { ...paymentInput, expectedVersion: afterDp!.billingCase!.version, amountRp: "700000", reference: randomUUID(), idempotencyKey: randomUUID() });
    const paid = (await terms.workspace(admin, fixture.inquiry.id))!.billingCase!; expect(paid).toMatchObject({ paidRp: "1000000", remainingRp: "0", paymentState: "PAID" });
    const corrected = await payments.correct(admin, { paymentId: balance.id, expectedVersion: paid.version, amountRp: "600000", receivedDate: date, reference: randomUUID(), confirmed: true, reason: "Jumlah catatan fixture salah.", idempotencyKey: randomUUID() });
    const after = (await terms.workspace(admin, fixture.inquiry.id))!.billingCase!; expect(after.remainingRp).toBe("100000"); expect((await invoices.document(admin, invoice.id)).financial.totalRp).toBe("1000000");
    await payments.reverse(admin, { paymentId: corrected.id, expectedVersion: after.version, reason: "Pembatalan catatan fixture.", idempotencyKey: randomUUID() });
    expect((await terms.workspace(admin, fixture.inquiry.id))?.billingCase?.paidRp).toBe("300000");
    await expect(payments.reverse(admin, { paymentId: corrected.id, expectedVersion: after.version, reason: "Pembatalan kedua fixture.", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await prisma.b2BInquiry.findUnique({ where: { id: fixture.inquiry.id } }))?.status).toBe("NEW");
    const revisedCase = (await terms.workspace(owner, fixture.inquiry.id))!.billingCase!;
    const updatedTerms = await terms.setTerms(owner, { ...input, expectedVersion: revisedCase.version, mode: "FULL", depositRp: null, reason: "Kesepakatan pembayaran fixture berubah.", settingsVersion: settings.version, idempotencyKey: randomUUID() });
    expect(updatedTerms.paidRp).toBe("300000");
    expect((await prisma.invoice.findUnique({ where: { id: invoice.id } }))?.state).toBe("SUPERSEDED");
    expect((await invoices.document(owner, updatedTerms.currentInvoiceId!)).financial.mode).toBe("FULL");
  });
  it("serializes two operators and rejects duplicated bank reference or future date", async () => {
    const owner = await financeActor(), admin = await financeActor("ADMIN"), fixture = await project(owner.profile.id), service = new B2BBillingService(), payments = new ManualPaymentService();
    const billing = await service.setTerms(owner, { inquiryId: fixture.inquiry.id, acceptedQuoteId: fixture.quote.id, expectedVersion: 0, mode: "FULL", depositRp: null });
    const input = { billingCaseId: billing.id, expectedVersion: billing.version, amountRp: "700000", receivedDate: new Date().toISOString().slice(0, 10), reference: randomUUID(), confirmed: true, idempotencyKey: randomUUID() };
    const result = await Promise.allSettled([payments.record(owner, input), payments.record(admin, { ...input, reference: randomUUID(), idempotencyKey: randomUUID() })]); expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1);
    const current = (await service.workspace(owner, fixture.inquiry.id))!.billingCase!;
    const existing = await prisma.manualB2BPaymentEntry.findFirstOrThrow({ where: { billingCaseId: billing.id } });
    await expect(payments.record(admin, { ...input, expectedVersion: current.version, reference: existing.reference, amountRp: "1", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(payments.record(admin, { ...input, expectedVersion: current.version, receivedDate: "2099-01-01", idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
