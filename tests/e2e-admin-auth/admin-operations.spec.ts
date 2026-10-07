import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "../../src/modules/pricing/policy";
import { generateTestAdminTotp } from "../helpers/admin-totp";
import { isolatedActorHeaders } from "../e2e/helpers/actor";

// Synthetic records live only in the explicitly selected loopback test database.
// This suite proves operator actions, not email deliverability or provider activation.
test.describe.configure({ mode: "serial", timeout: 180_000 });
test.use({ trace: "off", screenshot: "off", video: "off", actionTimeout: 15_000 });

let prisma: PrismaClient;
test.beforeAll(() => {
  const url = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) });
});
test.afterAll(async () => { await prisma?.$disconnect(); });
test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders(isolatedActorHeaders(testInfo, "admin-operator"));
});

async function enterOwner(page: Page): Promise<string> {
  const id = randomUUID();
  const email = `operator-${id}@example.test`;
  const password = `Test-only-${randomUUID()}!`;
  const user = await prisma.adminAuthUser.create({ data: {
    id, email, name: "Rehearsal Owner Fixture", emailVerified: true,
    accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    profile: { create: { role: "OWNER", isActive: true } },
  }, include: { profile: true } });
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email Admin").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aktifkan authenticator", exact: true })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Siapkan authenticator" }).click();
  await page.getByText("Tidak bisa memindai QR?", { exact: true }).click();
  const secret = (await page.locator("details p").textContent())?.split(": ").at(-1);
  if (!secret || !user.profile) throw new Error("Fixture enrollment was not available.");
  await page.getByLabel("Saya sudah menyimpan kode pemulihan").check();
  await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  return user.profile.id;
}

async function testCustomer() {
  const email = `rehearsal-${randomUUID()}@example.test`;
  return prisma.customer.create({ data: { email, normalizedEmail: email, displayName: "Rehearsal Customer Fixture" } });
}

test("BUY operator prepares a paid order for shipping and holds a payment exception", async ({ page }) => {
  await enterOwner(page);
  const order = await prisma.order.create({ data: {
    orderNumber: `TEST-BUY-${randomUUID()}`, orderType: "RETAIL", status: "PAID", paidAt: new Date(),
    customerName: "Rehearsal Customer Fixture", customerEmail: "fixture@example.test", customerPhone: "+628000000000",
    itemsSubtotalRp: "10000", shippingTotalRp: "1000", grandTotalRp: "11000", publicTokenHash: randomUUID(),
    shipments: { create: { courierCode: "test", serviceCode: "test", shippingAmountRp: "1000" } },
    paymentAttempts: { create: { provider: "TEST", providerOrderId: `TEST-${randomUUID()}`, purpose: "ORDER_TOTAL", amountRp: "11000", status: "SETTLED", settledAt: new Date(), expiresAt: new Date(Date.now() + 3600_000) } },
  }, include: { paymentAttempts: true } });
  await page.goto(`/admin/orders/${order.id}`);
  await page.getByRole("button", { name: "Ubah ke Processing", exact: true }).click();
  await expect.poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROCESSING");
  await expect(page.getByRole("button", { name: "Ubah ke Ready To Ship", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ubah ke Ready To Ship", exact: true }).click();
  await expect.poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("READY_TO_SHIP");
  await page.getByLabel("Kode kurir").fill("test");
  await page.getByLabel("Nomor resi").fill("TEST-TRACKING-001");
  await page.getByRole("button", { name: "Simpan kurir & resi", exact: true }).click();
  await expect.poll(async () => (await prisma.shipment.findFirstOrThrow({ where: { orderId: order.id } })).trackingNumber).toBe("TEST-TRACKING-001");
  await prisma.paymentEvent.create({ data: { provider: "TEST", providerOrderId: order.paymentAttempts[0].providerOrderId,
    paymentAttemptId: order.paymentAttempts[0].id, eventFingerprint: randomUUID(), processingResult: "PARTIAL_REFUND_REQUIRES_EXCEPTION" } });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pembayaran perlu diperiksa", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ubah ke Shipped", exact: true })).toHaveCount(0);
  await page.goto("/admin/queue?group=orders");
  await expect(page.getByText(order.orderNumber, { exact: true }).first()).toBeVisible();
});

test("DEVELOP operator qualifies an inquiry and publishes an account proposal", async ({ page }) => {
  await enterOwner(page);
  const customer = await testCustomer();
  const inquiry = await prisma.b2BInquiry.create({ data: {
    referenceNumber: `TEST-DEVELOP-${randomUUID()}`, name: "Rehearsal Customer Fixture", email: customer.email,
    phone: "+628000000000", projectGoal: "Synthetic operator rehearsal", currentStage: "IDEA",
    description: "Synthetic development brief for operator browser verification.", targetQuantity: "1 prototype",
    confidentialityAck: true, publicTokenHash: randomUUID(), customerId: customer.id,
  } });
  await page.goto(`/admin/inquiries/${inquiry.id}`);
  for (const status of ["Contacted", "Qualified"] as const) {
    await page.getByRole("button", { name: `Ubah ke ${status}`, exact: true }).click();
    await expect.poll(async () => (await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).status).toBe(status.toUpperCase());
  }
  await page.getByLabel("Scope pekerjaan").fill("Synthetic scope for operator rehearsal only.");
  await page.getByLabel("Asumsi proposal").fill("Synthetic assumptions for test verification.");
  await page.getByLabel("Pos biaya IDR").fill("Test design | 10000");
  await page.getByLabel("Berlaku sampai tanggal").fill(new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10));
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Kirim versi proposal", exact: true }).click();
  await expect.poll(async () => prisma.b2BQuote.count({ where: { inquiryId: inquiry.id, status: "SENT" } })).toBe(1);
  const quote = await prisma.b2BQuote.findFirstOrThrow({ where: { inquiryId: inquiry.id } });
  expect(quote.totalRp.toString()).toBe("10000");
  expect(await prisma.order.count({ where: { customerId: customer.id } })).toBe(0);
});

test("MAKE operator records slicer review, publishes estimate, and sends immutable quote", async ({ page }) => {
  const adminId = await enterOwner(page);
  const customer = await testCustomer();
  const rule = await prisma.pricingRuleVersion.upsert({
    where: { code_version: { code: CUSTOM_PRINT_V1_PER_UNIT_POLICY.code, version: CUSTOM_PRINT_V1_PER_UNIT_POLICY.version } },
    create: { code: CUSTOM_PRINT_V1_PER_UNIT_POLICY.code, version: CUSTOM_PRINT_V1_PER_UNIT_POLICY.version,
      definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY, status: "ACTIVE", approvedAt: new Date(), approvedByAdminId: adminId },
    update: {},
  });
  const request = await prisma.customPrintRequest.create({ data: {
    referenceNumber: `TEST-MAKE-${randomUUID()}`, customerName: "Rehearsal Customer Fixture", customerEmail: customer.email,
    customerPhone: "+628000000000", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID(), customerId: customer.id,
    files: { create: { file: { create: { storageKey: `test/${randomUUID()}`, bucketScope: "PRIVATE_CUSTOMER",
      originalName: "synthetic-test.stl", extension: "stl", mimeType: "model/stl", sizeBytes: BigInt(84), uploadStatus: "VERIFIED",
      uploadedAt: new Date(), verifiedAt: new Date(), uploadedByCustomerId: customer.id } } } },
  } });
  await page.goto(`/admin/custom-print/${request.id}`);
  await page.getByLabel("Berat terverifikasi (g)").fill("12.5");
  await page.getByLabel("Durasi print (detik)").fill("900");
  await page.getByRole("button", { name: "Simpan review slicer", exact: true }).click();
  await expect(page.getByText("Review slicer berhasil disimpan.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("QUOTE_READY");
  await page.getByLabel("Saya sudah menilai pekerjaan ini dan menyatakan tidak ada pos biaya tambahan.").check();
  await page.getByRole("button", { name: "Terbitkan estimasi", exact: true }).click();
  await expect.poll(async () => prisma.customPrintEstimate.count({ where: { requestId: request.id } })).toBe(1);
  await page.getByRole("button", { name: "Buat draft quote", exact: true }).click();
  await expect.poll(async () => prisma.customPrintQuote.count({ where: { requestId: request.id, status: "DRAFT" } })).toBe(1);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Terbitkan quote", exact: true }).click();
  await expect.poll(async () => prisma.customPrintQuote.count({ where: { requestId: request.id, status: "SENT" } })).toBe(1);
  const quote = await prisma.customPrintQuote.findFirstOrThrow({ where: { requestId: request.id } });
  expect(quote.pricingRuleVersionId).toBe(rule.id);
  await expect(prisma.customPrintQuote.update({ where: { id: quote.id }, data: { finalTotalRp: "1" } })).rejects.toThrow(/sent quote snapshots are immutable/);
  expect((await prisma.customPrintQuote.findUniqueOrThrow({ where: { id: quote.id } })).finalTotalRp.toString()).toBe(quote.finalTotalRp.toString());
  expect(await prisma.order.count({ where: { customerId: customer.id } })).toBe(0);
});
