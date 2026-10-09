import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
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

async function waitForAdminAction(page: Page) {
  await expect(page.getByRole("button", { name: "Memproses…", exact: true })).toHaveCount(0, { timeout: 15_000 });
}

async function testCustomer() {
  const email = `rehearsal-${randomUUID()}@example.test`;
  return prisma.customer.create({ data: { email, normalizedEmail: email, displayName: "Rehearsal Customer Fixture" } });
}

async function inspectAdminSurface(page: Page, name: string) {
  if (process.env.NIUVA_ADMIN_EVIDENCE !== "1") return;
  const directory = resolve(".local/admin-operations-architecture/captures");
  await mkdir(directory, { recursive: true });
  const original = page.viewportSize();
  const widths = ["overview", "orders-list", "inquiries-list", "custom-print-list", "custom-print-review", "privacy-detail"].includes(name)
    ? [1440, 1024, 768, 390, 320] : [1440, 390, 320];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("main[data-admin-surface]")).toBeVisible();
    await expect(page.locator('main#main-content[aria-live="polite"]')).toHaveCount(0);
    if (width < 1024) await expect(page.getByText("Menu Admin", { exact: true })).toBeVisible();
    else await expect(page.getByRole("navigation", { name: "Operasional", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: resolve(directory, `${name}-${width}.png`), fullPage: true, caret: "initial" });
  }
  if (original) await page.setViewportSize(original);
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
  const listOrigin = `/admin/orders?q=${order.orderNumber}&status=PAID&type=RETAIL&page=1`;
  await page.goto(listOrigin);
  await inspectAdminSurface(page, "orders-list");
  await page.getByRole("link", { name: order.orderNumber, exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Kembali ke Orders", exact: true })).toHaveAttribute("href", listOrigin);
  await page.getByRole("link", { name: "Kembali ke Orders", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(listOrigin);
  await page.goto("/admin?group=orders");
  await inspectAdminSurface(page, "overview");
  await page.goto("/admin/orders?view=needs-action&page=1");
  await expect(page).toHaveURL(/\/admin\/orders\?view=needs-action&page=1$/);
  await inspectAdminSurface(page, "orders-list");
  await page.getByRole("link", { name: order.orderNumber, exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Kembali ke Orders", exact: true })).toHaveAttribute("href", "/admin/orders?view=needs-action&page=1");
  await inspectAdminSurface(page, "order-detail");
  await page.getByRole("button", { name: "Ubah ke Processing", exact: true }).click();
  await expect.poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PROCESSING");
  await waitForAdminAction(page);
  await expect(page.getByRole("button", { name: "Ubah ke Ready To Ship", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ubah ke Ready To Ship", exact: true }).click();
  await expect.poll(async () => (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("READY_TO_SHIP");
  await waitForAdminAction(page);
  await page.getByLabel("Kode kurir").fill("test");
  await page.getByLabel("Nomor resi").fill("TEST-TRACKING-001");
  await page.getByRole("button", { name: "Simpan kurir & resi", exact: true }).click();
  await expect.poll(async () => (await prisma.shipment.findFirstOrThrow({ where: { orderId: order.id } })).trackingNumber).toBe("TEST-TRACKING-001");
  await waitForAdminAction(page);
  await prisma.paymentEvent.create({ data: { provider: "TEST", providerOrderId: order.paymentAttempts[0].providerOrderId,
    paymentAttemptId: order.paymentAttempts[0].id, eventFingerprint: randomUUID(), processingResult: "PARTIAL_REFUND_REQUIRES_EXCEPTION" } });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pembayaran perlu diperiksa", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ubah ke Shipped", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Kembali ke Orders", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/orders\?view=needs-action&page=1$/);
  await expect(page.getByText(order.orderNumber, { exact: true }).first()).toBeVisible();
});

test("DEVELOP operator qualifies an inquiry and publishes an account proposal", async ({ page }) => {
  await enterOwner(page);
  const customer = await testCustomer();
  const searchReference = `TEST-DEVELOP-${randomUUID()}`;
  const inquiryData = {
    name: "Rehearsal Customer Fixture", email: customer.email, phone: "+628000000000",
    projectGoal: "Synthetic operator rehearsal", currentStage: "IDEA" as const,
    description: "Synthetic development brief for operator browser verification.", targetQuantity: "1 prototype",
    confidentialityAck: true, customerId: customer.id,
  };
  const inquiry = await prisma.b2BInquiry.create({ data: {
    ...inquiryData, referenceNumber: `${searchReference}-TARGET`, publicTokenHash: randomUUID(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  } });
  await prisma.b2BInquiry.createMany({ data: Array.from({ length: 50 }, (_, index) => ({
    ...inquiryData, referenceNumber: `${searchReference}-PAGE1-${index}`, publicTokenHash: randomUUID(),
  })) });
  const origin = `/admin/inquiries?q=${encodeURIComponent(searchReference)}&status=NEW&page=2`;
  await page.goto(origin);
  await inspectAdminSurface(page, "inquiries-list");
  await page.getByRole("link", { name: inquiry.referenceNumber, exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Kembali ke B2B Inquiries", exact: true })).toHaveAttribute("href", origin);
  await inspectAdminSurface(page, "inquiry-detail");
  for (const status of ["Contacted", "Qualified"] as const) {
    await page.getByRole("button", { name: `Ubah ke ${status}`, exact: true }).click();
    await expect.poll(async () => (await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).status).toBe(status.toUpperCase());
    await waitForAdminAction(page);
  }
  await page.getByRole("link", { name: "Buka workspace proposal", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Proposal B2B", exact: true })).toBeVisible();
  await inspectAdminSurface(page, "b2b-proposal");
  await page.getByLabel("Scope pekerjaan").fill("Synthetic scope for operator rehearsal only.");
  await page.getByLabel("Asumsi proposal").fill("Synthetic assumptions for test verification.");
  await page.getByLabel("Pos biaya IDR").fill("Test design | 10000");
  await page.getByLabel("Berlaku sampai tanggal").fill(new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10));
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Kirim versi proposal", exact: true }).click();
  await expect.poll(async () => prisma.b2BQuote.count({ where: { inquiryId: inquiry.id, status: "SENT" } })).toBe(1);
  await waitForAdminAction(page);
  const quote = await prisma.b2BQuote.findFirstOrThrow({ where: { inquiryId: inquiry.id } });
  expect(quote.totalRp.toString()).toBe("10000");
  expect((await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).status).toBe("QUALIFIED");
  await page.getByRole("link", { name: "Kembali ke detail inquiry", exact: true }).click();
  await expect(page.getByText("Versi 1 · SENT", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke B2B Inquiries", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(origin);
  await page.reload();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(origin);
  expect(await prisma.order.count({ where: { customerId: customer.id } })).toBe(0);
});

test("management editors and stock history retain their filtered list context", async ({ page }) => {
  await enterOwner(page);
  const slug = `fixture-${randomUUID()}`;
  const product = await prisma.product.create({ data: {
    slug, name: "Synthetic draft product", description: "Synthetic product for operator browser verification.",
    variants: { create: { sku: `TEST-${randomUUID()}`, name: "Fixture variant", priceRp: "10000", weightGrams: "100", stockOnHand: 10 } },
  }, include: { variants: true } });
  const origin = `/admin/products?q=${slug}&publication=draft&page=1`;
  await page.goto(origin);
  await inspectAdminSurface(page, "products-list");
  await page.getByRole("link", { name: product.name, exact: true }).first().click();
  await expect(page.getByRole("link", { name: "Kembali ke Products & Stock", exact: true })).toHaveAttribute("href", origin);
  await inspectAdminSurface(page, "product-editor");
  await page.getByLabel("Nama produk", { exact: true }).fill("Synthetic updated product");
  await page.getByRole("button", { name: "Simpan produk", exact: true }).click();
  await expect.poll(async () => (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).name).toBe("Synthetic updated product");
  await waitForAdminAction(page);
  await page.getByLabel("Stok fisik baru", { exact: true }).fill("12");
  await page.getByLabel("Alasan penyesuaian", { exact: true }).fill("Synthetic stock adjustment for browser verification.");
  await page.getByRole("button", { name: "Simpan penyesuaian stok", exact: true }).click();
  await expect.poll(async () => (await prisma.productVariant.findUniqueOrThrow({ where: { id: product.variants[0].id } })).stockOnHand).toBe(12);
  await waitForAdminAction(page);
  await page.getByRole("link", { name: "Lihat riwayat stok varian", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Riwayat stok varian", exact: true })).toBeVisible();
  await expect(page.getByText("Alasan: Synthetic stock adjustment for browser verification.", { exact: true }).first()).toBeVisible();
  await inspectAdminSurface(page, "stock-history");
  await page.getByRole("link", { name: "Kembali ke Synthetic updated product", exact: true }).click();
  await page.getByRole("link", { name: "Kembali ke Products & Stock", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(origin);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).isPublished).toBe(false);

  const project = await prisma.portfolioProject.create({ data: {
    slug: `fixture-${randomUUID()}`, title: "Synthetic draft portfolio", serviceLabel: "Fixture service",
    summary: "Synthetic portfolio summary.", challenge: "Synthetic challenge.", process: "Synthetic process.", result: "Synthetic result.",
  } });
  const portfolioOrigin = `/admin/portfolio?q=${project.slug}&publication=draft&page=1`;
  await page.goto(portfolioOrigin);
  await inspectAdminSurface(page, "portfolio-list");
  await page.getByRole("link", { name: project.title, exact: true }).first().click();
  await inspectAdminSurface(page, "portfolio-editor");
  await page.getByLabel("Judul", { exact: true }).fill("Synthetic updated portfolio");
  await page.getByRole("button", { name: "Simpan proyek", exact: true }).click();
  await expect.poll(async () => (await prisma.portfolioProject.findUniqueOrThrow({ where: { id: project.id } })).title).toBe("Synthetic updated portfolio");
  await waitForAdminAction(page);
  await page.getByRole("link", { name: "Kembali ke Portfolio", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(portfolioOrigin);
  expect((await prisma.portfolioProject.findUniqueOrThrow({ where: { id: project.id } })).isPublished).toBe(false);
});

for (const enhanced of [true, false]) {
  test(`Owner handles Privacy detail and returns to the filtered list (enhanced=${enhanced})`, async ({ page, browser }, testInfo) => {
    await enterOwner(page);
    const customer = await testCustomer();
    const request = await prisma.customerPrivacyRequest.create({ data: {
      referenceNumber: `PRV-FIXTURE-${randomUUID()}`, submissionKey: randomUUID(), customerId: customer.id,
      contactEmail: customer.email, kind: "ADDITIONAL", details: "Synthetic privacy request for browser verification.",
      dueAt: new Date(Date.now() + 3 * 86400_000),
    } });
    const nativeContext = enhanced ? null : await browser.newContext({
      baseURL: "http://localhost:3107", javaScriptEnabled: false,
      storageState: await page.context().storageState(), extraHTTPHeaders: isolatedActorHeaders(testInfo, "admin-privacy-native"),
    });
    const operator = nativeContext ? await nativeContext.newPage() : page;
    try {
      const origin = "/admin/privacy?status=OPEN&page=1";
      await operator.goto(origin);
      await expect(operator.getByText(customer.email, { exact: true })).toHaveCount(0);
      await inspectAdminSurface(operator, enhanced ? "privacy-list" : "privacy-list-native");
      await operator.getByRole("link", { name: request.referenceNumber, exact: true }).first().click();
      await expect(operator.getByRole("heading", { name: "Detail permintaan privasi", exact: true })).toBeVisible();
      await expect(operator.getByRole("link", { name: "Kembali ke Privasi Customer", exact: true })).toHaveAttribute("href", origin);
      await expect(operator.locator('form[action="/api/admin/privacy"]')).toHaveAttribute("data-enhanced", enhanced ? "true" : "false");
      await inspectAdminSurface(operator, enhanced ? "privacy-detail" : "privacy-detail-native");
      await operator.getByLabel("Tanggapan untuk Customer", { exact: true }).fill("Synthetic privacy response for test verification.");
      const saving = operator.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/privacy" && response.request().method() === "POST");
      await operator.getByRole("button", { name: "Simpan penanganan", exact: true }).click();
      expect((await saving).status()).toBe(enhanced ? 200 : 303);
      await expect(operator.getByText("Tanggapan dan hasil tersimpan.", { exact: true })).toBeVisible();
      const destination = new URL(operator.url());
      expect(destination.pathname).toBe(`/admin/privacy/${request.id}`);
      expect(destination.searchParams.get("returnTo")).toBe(origin);
      expect(await prisma.customerPrivacyRequest.findUniqueOrThrow({ where: { id: request.id } })).toMatchObject({
        status: "IN_REVIEW", response: "Synthetic privacy response for test verification.", dueAt: request.dueAt,
      });
      await operator.getByRole("link", { name: "Kembali ke Privasi Customer", exact: true }).click();
      await expect.poll(() => new URL(operator.url()).pathname + new URL(operator.url()).search).toBe(origin);
      await expect(operator.getByRole("link", { name: request.referenceNumber, exact: true })).toHaveCount(0);
    } finally { await nativeContext?.close(); }
  });
}

test("MAKE operator records slicer review, publishes estimate, and sends immutable quote", async ({ page }) => {
  const adminId = await enterOwner(page);
  const customer = await testCustomer();
  // This synthetic journey fixes its own v1 inputs; other suites may leave a
  // later ACTIVE policy. Published quote snapshots remain unchanged.
  await prisma.pricingRuleVersion.updateMany({ where: { code: CUSTOM_PRINT_V1_PER_UNIT_POLICY.code, status: "ACTIVE" }, data: { status: "RETIRED" } });
  const rule = await prisma.pricingRuleVersion.upsert({
    where: { code_version: { code: CUSTOM_PRINT_V1_PER_UNIT_POLICY.code, version: CUSTOM_PRINT_V1_PER_UNIT_POLICY.version } },
    create: { code: CUSTOM_PRINT_V1_PER_UNIT_POLICY.code, version: CUSTOM_PRINT_V1_PER_UNIT_POLICY.version,
      definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY, status: "ACTIVE", approvedAt: new Date(), approvedByAdminId: adminId },
    update: { status: "ACTIVE", definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY },
  });
  const request = await prisma.customPrintRequest.create({ data: {
    referenceNumber: `TEST-MAKE-${randomUUID()}`, customerName: "Rehearsal Customer Fixture", customerEmail: customer.email,
    customerPhone: "+628000000000", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID(), customerId: customer.id,
    files: { create: { file: { create: { storageKey: `test/${randomUUID()}`, bucketScope: "PRIVATE_CUSTOMER",
      originalName: "synthetic-test.stl", extension: "stl", mimeType: "model/stl", sizeBytes: BigInt(84), uploadStatus: "VERIFIED",
      uploadedAt: new Date(), verifiedAt: new Date(), uploadedByCustomerId: customer.id } } } },
  } });
  const listOrigin = `/admin/custom-print?q=${request.referenceNumber}&status=SUBMITTED&page=1`;
  await page.goto(listOrigin);
  await inspectAdminSurface(page, "custom-print-list");
  await expect(page.locator('[data-admin-list-position-ready="true"]')).toHaveCount(1);
  await page.getByRole("link", { name: request.referenceNumber, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/custom-print/${request.id}\\?returnTo=`), { timeout: 15_000 });
  await expect(page.getByRole("link", { name: "Kembali ke Custom Print", exact: true })).toHaveAttribute("href", listOrigin, { timeout: 15_000 });
  await page.getByRole("link", { name: "Kembali ke Custom Print", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(listOrigin);
  await expect(page.getByRole("link", { name: request.referenceNumber, exact: true }).first()).toBeFocused();
  await page.goto("/admin/custom-print?view=needs-action&page=1");
  await page.getByRole("link", { name: request.referenceNumber, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/custom-print/${request.id}\\?returnTo=`));
  await page.getByRole("link", { name: "Buka Review & Quote", exact: true }).click();
  await expect(page).toHaveURL(/\/review\?step=review&returnTo=/);
  await expect(page.getByRole("link", { name: "Kembali ke detail request", exact: true })).toBeVisible();
  await inspectAdminSurface(page, "custom-print-review");
  await page.getByLabel("Berat terverifikasi (g)").fill("12.5");
  await page.getByLabel("Durasi print (detik)").fill("900");
  await page.getByRole("button", { name: "Simpan review slicer", exact: true }).click();
  await expect(page.getByText("Review slicer berhasil disimpan.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe("QUOTE_READY");
  await waitForAdminAction(page);
  await page.getByRole("link", { name: "2. Estimasi", exact: true }).click();
  await inspectAdminSurface(page, "custom-print-estimate");
  await page.getByLabel("Saya sudah menilai pekerjaan ini dan menyatakan tidak ada pos biaya tambahan.").check();
  await page.getByRole("button", { name: "Terbitkan estimasi", exact: true }).click();
  await expect.poll(async () => prisma.customPrintEstimate.count({ where: { requestId: request.id } })).toBe(1);
  await waitForAdminAction(page);
  await page.getByRole("link", { name: "3. Quote", exact: true }).click();
  await inspectAdminSurface(page, "custom-print-quote");
  await page.getByRole("button", { name: "Buat draft quote", exact: true }).click();
  await expect.poll(async () => prisma.customPrintQuote.count({ where: { requestId: request.id, status: "DRAFT" } })).toBe(1);
  await waitForAdminAction(page);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Terbitkan quote", exact: true }).click();
  await expect.poll(async () => prisma.customPrintQuote.count({ where: { requestId: request.id, status: "SENT" } })).toBe(1);
  await waitForAdminAction(page);
  const quote = await prisma.customPrintQuote.findFirstOrThrow({ where: { requestId: request.id } });
  expect(quote.pricingRuleVersionId).toBe(rule.id);
  await expect(prisma.customPrintQuote.update({ where: { id: quote.id }, data: { finalTotalRp: "1" } })).rejects.toThrow(/sent quote snapshots are immutable/);
  expect((await prisma.customPrintQuote.findUniqueOrThrow({ where: { id: quote.id } })).finalTotalRp.toString()).toBe(quote.finalTotalRp.toString());
  await page.getByRole("link", { name: "Kembali ke detail request", exact: true }).click();
  await expect(page.getByRole("link", { name: "Kembali ke Custom Print", exact: true })).toHaveAttribute("href", "/admin/custom-print?view=needs-action&page=1");
  await inspectAdminSurface(page, "custom-print-detail");
  await page.getByRole("link", { name: "Kembali ke Custom Print", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/custom-print\?view=needs-action&page=1$/);
  expect(await prisma.order.count({ where: { customerId: customer.id } })).toBe(0);

  // Synthetic accepted-order fixture verifies the two-way UI relation only.
  // Valid acceptance and immutable snapshot gates are exercised through QuoteService
  // in customer-work-slice.test.ts; fixture setup never changes a quote snapshot.
  const accepted = await prisma.$transaction(async transaction => {
    await transaction.customPrintQuote.update({ where: { id: quote.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await transaction.customPrintRequest.update({ where: { id: request.id }, data: { status: "APPROVED" } });
    return transaction.order.create({ data: {
      orderNumber: `TEST-MAKE-ORDER-${randomUUID()}`, orderType: "CUSTOM_PRINT", status: "WAITING_PAYMENT",
      customerId: customer.id, customerName: request.customerName, customerEmail: customer.email,
      customerPhone: request.customerPhone, publicTokenHash: randomUUID(),
      itemsSubtotalRp: quote.finalTotalRp, shippingTotalRp: "0", grandTotalRp: quote.finalTotalRp,
      items: { create: { customQuoteId: quote.id, itemType: "CUSTOM_PRINT", nameSnapshot: `Custom print ${quote.quoteNumber}`,
        quantity: 1, unitPriceRp: quote.finalTotalRp, lineTotalRp: quote.finalTotalRp } },
    } });
  });
  await page.goto(`/admin/custom-print/${request.id}?returnTo=${encodeURIComponent("/admin/custom-print?view=needs-action&page=1")}`);
  await page.getByRole("link", { name: new RegExp(accepted.orderNumber), exact: false }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${accepted.id}\\?returnTo=`));
  await expect(page.getByRole("link", { name: "Kembali ke Custom Print", exact: true })).toHaveAttribute("href", "/admin/custom-print?view=needs-action&page=1");
  await expect(page.getByRole("button", { name: "Ubah ke Paid", exact: true })).toHaveCount(0);
  await inspectAdminSurface(page, "custom-order-detail");
  await page.getByRole("link", { name: new RegExp(request.referenceNumber), exact: false }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/custom-print/${request.id}\\?returnTo=`));
  await page.getByRole("link", { name: "Kembali ke Custom Print", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/custom-print\?view=needs-action&page=1$/);
});
