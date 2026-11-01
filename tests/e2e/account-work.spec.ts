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



test("Google login preserves the reference intake mode", async ({ page }) => {
  await page.goto("/custom-print/request?mode=reference");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcustom-print%2Frequest%3Fmode%3Dreference$/);
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/custom-print\/request\?mode=reference$/);
  await expect(page.getByRole("link", { name: "Saya baru punya referensi" })).toHaveAttribute("aria-current", "page");
});

test("account excludes historical B2B work and leaves its records intact", async ({ page, request }) => {
  await loginCustomer(page);
  const prisma = localTestDatabase();
  try {
    const owner = await prisma.customer.findUniqueOrThrow({ where: { googleSubject: "local-demo-google-subject" } });
    const admin = await prisma.adminProfile.create({ data: { clerkUserId: `e2e_${randomUUID()}`, isActive: true, role: "OWNER" } });
    const inquiry = await prisma.b2BInquiry.create({ data: {
      referenceNumber: `INQ-20261011-${randomUUID().slice(0, 8).toUpperCase()}`,
      name: "E2E B2B", email: owner.email, phone: "+628000000000", projectGoal: "Historical B2B fixture",
      currentStage: "IDEA", description: "Historical record retained outside the active experience.", targetQuantity: "1",
      confidentialityAck: true, publicTokenHash: randomUUID(), customerId: owner.id,
    } });
    const quote = await prisma.b2BQuote.create({ data: { inquiryId: inquiry.id, version: 1, status: "SENT",
      scope: "Historical proposal fixture.", assumptions: "No active website workflow.",
      lineItems: [{ name: "Desain", amountRp: "1250000" }], totalRp: "1250000",
      validUntil: new Date(Date.now() + 24 * 60 * 60_000), createdByAdminId: admin.id, sentAt: new Date() } });
    const ordersBefore = await prisma.order.count();
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Project Brief", exact: true })).toHaveCount(0);
    await expect(page.locator('a[href^="/account/inquiries/"]')).toHaveCount(0);
    expect((await page.goto(`/account/inquiries/${inquiry.id}`))?.status()).toBe(404);
    const response = await request.post(`/api/account/inquiries/${inquiry.id}/quotes/${quote.id}/decision`, {
      data: { decision: "ACCEPTED" },
    });
    expect(response.status()).toBe(410);
    expect((await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiry.id } })).projectGoal).toBe("Historical B2B fixture");
    expect((await prisma.b2BQuote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("SENT");
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
    await expect(page.getByRole("alertdialog", { name: "Konfirmasi penolakan quote" })).toBeFocused();
    await page.getByRole("button", { name: "Konfirmasi tolak" }).click();
    await expect.poll(async () => (await prisma.customPrintQuote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("DECLINED");
    await expect(page.getByRole("status").filter({ hasText: "Quote ditolak." })).toBeVisible();
    expect(await prisma.order.count({ where: { items: { some: { customQuoteId: quote.id } } } })).toBe(0);
  } finally {
    await prisma.$disconnect();
  }
});
