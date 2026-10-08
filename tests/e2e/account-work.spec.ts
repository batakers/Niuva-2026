import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient } from "../../src/generated/prisma/client";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "../../src/modules/pricing/policy";
import { loginCustomer } from "./helpers/customer";

function localTestDatabase(): PrismaClient {
  const connectionString = process.env.TEST_DATABASE_URL ??
    (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : "");
  if (!connectionString) throw new Error("TEST_DATABASE_URL wajib untuk E2E pekerjaan akun.");
  const parsed = new URL(connectionString);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !/(^|[-_])test([-_]|$)/i.test(parsed.pathname)) {
    throw new Error("E2E pekerjaan akun hanya boleh memakai database test loopback.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

test("Google login returns to a selected Project Brief and stores an IDEA brief without date or reference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/project-brief?service=research-development");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fproject-brief%3Fservice%3Dresearch-development$/);
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/project-brief\?service=research-development$/);
  const form = page.getByRole("form", { name: "Form project brief" });
  await expect(form.getByLabel("Dukungan yang dicari (opsional)")).toHaveValue("research-development");
  await form.getByLabel("Nama kontak").fill("E2E Account Client");
  await form.getByLabel("Nomor WhatsApp").fill("+628000000000");
  await form.getByLabel("Apa yang ingin dicapai?").fill("Memvalidasi konsep prototipe awal.");
  await form.getByLabel("Tahap saat ini").selectOption("IDEA");
  await form.getByLabel("Ceritakan kebutuhan dan batasannya").fill("Butuh diskusi fungsi dan bentuk awal produk.");
  await form.getByLabel("Target jumlah").fill("Sekitar dua unit");
  await form.getByLabel("Persetujuan kerahasiaan").check();
  await form.getByRole("button", { name: "Kirim project brief" }).click();
  await expect(page.getByText("Brief tersimpan.")).toBeVisible();
  await page.getByRole("link", { name: "Pantau di akun" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Memvalidasi konsep prototipe awal." })).toBeVisible();
  await expect(page.getByText("Belum diketahui")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const response = await page.reload();
  const cacheControl = response?.headers()["cache-control"] ?? "";
  // Next's development server forces no-cache; production uses the private no-store account rule.
  expect(cacheControl).toMatch(/(?:no-store|no-cache)/);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("link", { name: "Kembali ke akun" }).focus();
  await expect(page.getByRole("link", { name: "Kembali ke akun" })).toBeFocused();
});

test("Google login preserves the reference intake mode", async ({ page }) => {
  await page.goto("/custom-print/request?mode=reference");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcustom-print%2Frequest%3Fmode%3Dreference$/);
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/custom-print\/request\?mode=reference$/);
  await expect(page.getByRole("link", { name: "Saya baru punya referensi" })).toHaveAttribute("aria-current", "page");
});

test("account shows and decides an operator B2B proposal without creating an order", async ({ page }) => {
  await loginCustomer(page);
  const prisma = localTestDatabase();
  try {
    const owner = await prisma.customer.findUniqueOrThrow({ where: { googleSubject: "local-demo-google-subject" } });
    const admin = await prisma.adminProfile.create({ data: { clerkUserId: `e2e_${randomUUID()}`, isActive: true, role: "OWNER" } });
    const inquiry = await prisma.b2BInquiry.create({ data: {
      referenceNumber: `INQ-20260927-${randomUUID().slice(0, 8).toUpperCase()}`,
      name: "E2E B2B", email: owner.email, phone: "+628000000000", projectGoal: "Proposal browser",
      currentStage: "IDEA", description: "Proposal untuk uji keputusan Customer.", targetQuantity: "1",
      confidentialityAck: true, publicTokenHash: randomUUID(), customerId: owner.id,
    } });
    const quote = await prisma.b2BQuote.create({ data: { inquiryId: inquiry.id, version: 1, status: "SENT",
      scope: "Rancang prototipe browser untuk validasi.", assumptions: "Spesifikasi final menyusul.",
      lineItems: [{ name: "Desain", amountRp: "1250000" }], totalRp: "1250000",
      validUntil: new Date(Date.now() + 24 * 60 * 60_000), createdByAdminId: admin.id, sentAt: new Date() } });
    const ordersBefore = await prisma.order.count();
    await page.goto(`/account/inquiries/${inquiry.id}`);
    await expect(page.getByText("Rancang prototipe browser untuk validasi.")).toBeVisible();
    await expect(page.getByText("Total Rp 1250000")).toBeVisible();
    const decisionResponse = page.waitForResponse(
      (response) => response.request().method() === "POST" &&
        new URL(response.url()).pathname === `/api/account/inquiries/${inquiry.id}/quotes/${quote.id}/decision`,
      { timeout: 15_000 },
    );
    await page.getByRole("button", { name: "Setujui proposal" }).click();
    expect((await decisionResponse).status()).toBe(200);
    await expect(page.getByText("Proposal disetujui untuk tindak lanjut manual.", { exact: false })).toBeVisible();
    await expect.poll(async () => (await prisma.b2BQuote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("ACCEPTED");
    expect((await prisma.b2BQuote.findUniqueOrThrow({ where: { id: quote.id } })).decidedByCustomerId).toBe(owner.id);
    expect(await prisma.order.count()).toBe(ordersBefore);
  } finally {
    await prisma.$disconnect();
  }
});

test("account displays reviewed MAKE components and declines the latest quote", async ({ page }) => {
  await loginCustomer(page);
  const prisma = localTestDatabase();
  try {
    const owner = await prisma.customer.findUniqueOrThrow({ where: { googleSubject: "local-demo-google-subject" } });
    const admin = await prisma.adminProfile.create({ data: { clerkUserId: `e2e_${randomUUID()}`, isActive: true, role: "OWNER" } });
    const rule = await prisma.pricingRuleVersion.upsert({
      where: { code_version: { code: "CUSTOM_PRINT_V1", version: 1 } },
      create: { code: "CUSTOM_PRINT_V1", version: 1, definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
        status: "RETIRED", approvedAt: new Date(), approvedByAdminId: admin.id },
      update: { definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY, status: "RETIRED",
        approvedAt: new Date(), approvedByAdminId: admin.id },
    });
    const fileId = randomUUID();
    await prisma.storedFile.create({ data: { id: fileId, bucketScope: "PRIVATE_CUSTOMER", extension: "stl",
      mimeType: "model/stl", originalName: "account-e2e.stl", sizeBytes: BigInt(16),
      storageKey: `private/customer/${fileId}`, uploadStatus: "UPLOADED" } });
    const request = await prisma.customPrintRequest.create({ data: {
      referenceNumber: `CPR-20260927-${randomUUID().slice(0, 8).toUpperCase()}`,
      customerName: "E2E MAKE", customerEmail: owner.email, customerPhone: "+628000000000",
      materialRequested: "PLA", quantity: 2, unitConfirmation: "MILLIMETER_CONFIRMED",
      customerId: owner.id, intakeMode: "MODEL_READY", status: "QUOTE_SENT", publicTokenHash: randomUUID(),
    } });
    await prisma.customPrintRequestFile.create({ data: { requestId: request.id, fileId } });
    await prisma.storedFile.update({ where: { id: fileId }, data: { uploadStatus: "VERIFIED", verifiedAt: new Date() } });
    const review = await prisma.customPrintReview.create({ data: { requestId: request.id,
      reviewedByAdminId: admin.id, verifiedWeightG: "12.5", printDurationSeconds: 900,
      materialCode: "PLA", quantity: 2, reviewedAt: new Date() } });
    const estimate = await prisma.customPrintEstimate.create({ data: { requestId: request.id, version: 1,
      pricingRuleVersionId: rule.id, publishedByAdminId: admin.id, baselineRp: "27500",
      additionalSubtotalRp: "50000", lowerRp: "77500", upperRp: "100750", snapshot: {
        factorLower: "1.00", factorUpper: "1.30", calibrated: false,
        reviewId: review.id, reviewUpdatedAt: review.updatedAt.toISOString(),
        materialSubtotalRp: "25000", machineSubtotalRp: "2500",
        pricingInputs: { filamentSource: "NIUVA_STOCK", material: "PLA",
          printDurationSeconds: 900, quantity: 2, weightGrams: "12.5" },
        additionalCosts: [{ name: "Setup", amountRp: "50000" }], noAdditionalCosts: false,
      } } });
    const quote = await prisma.customPrintQuote.create({ data: { requestId: request.id,
      quoteNumber: `QUO-20260927-${randomUUID().slice(0, 8).toUpperCase()}`,
      version: 1, pricingRuleVersionId: rule.id, verifiedWeightG: "12.5", printDurationSeconds: 900,
      materialCode: "PLA", quantity: 2, materialSubtotalRp: "25000", machineSubtotalRp: "2500",
      additionalSubtotalRp: "50000", unroundedTotalRp: "77500", finalTotalRp: "77500",
      estimateId: estimate.id, status: "SENT", publicTokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000), sentAt: new Date(), createdByAdminId: admin.id,
      calculationSnapshot: { material: "PLA", filamentSource: "NIUVA_STOCK", weightGrams: "12.5",
        printDurationSeconds: 900, quantity: 2, policy: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
        pricingRule: { code: "CUSTOM_PRINT_V1", version: 1 },
        estimate: { estimateId: estimate.id, estimateVersion: 1, additionalCosts: [{ name: "Setup", amountRp: "50000" }],
          additionalSubtotalRp: "50000", lowerRp: "77500", upperRp: "100750", finalTotalRp: "77500" } },
    } });
    await page.goto(`/account/make/${request.id}`);
    await expect(page.getByText("Kisaran setelah review operator, bukan harga final.", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Komponen yang tercakup" })).toBeVisible();
    await expect(page.getByText("Setup")).toHaveCount(2);
    await page.getByRole("button", { name: "Tolak quote" }).click();
    await expect.poll(async () => (await prisma.customPrintQuote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("DECLINED");
    expect(await prisma.order.count({ where: { items: { some: { customQuoteId: quote.id } } } })).toBe(0);
  } finally {
    await prisma.$disconnect();
  }
});
