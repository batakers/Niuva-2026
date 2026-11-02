import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { createOpaqueToken, hashOpaqueToken, CUSTOMER_SESSION_COOKIE } from "../../src/modules/customer-auth/core";
import { isolatedActorHeaders } from "../e2e/helpers/actor";
import { createAdminBrowserSession } from "./helpers/session";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }) }) });
const baseURL = "http://localhost:3107";
test.afterAll(async () => { await prisma.$disconnect(); });
async function approvedOrder(page: Page) {
  const email = `refund-manual-browser-${randomUUID()}@example.test`, token = createOpaqueToken();
  const customer = await prisma.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date(), sessions: { create: { tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 3600000) } } } });
  const order = await prisma.order.create({ data: { customerId: customer.id, orderNumber: `MANUAL-${randomUUID()}`, orderType: "CUSTOM_PRINT", status: "COMPLETED", customerName: "Synthetic Refund", customerEmail: email, customerPhone: "+628000000000", publicTokenHash: randomUUID(), grandTotalRp: "117006", itemsSubtotalRp: "100003", shippingTotalRp: "17003" } });
  for (const [purpose, amountRp] of [["ORDER_TOTAL", "100003"], ["CUSTOM_SHIPPING", "17003"]] as const) await prisma.paymentAttempt.create({ data: { orderId: order.id, purpose, amountRp, providerOrderId: randomUUID(), providerTransactionId: randomUUID(), status: "SETTLED", settledAt: new Date(), expiresAt: new Date(Date.now() + 60000) } });
  const post = (operation: string, input: unknown) => page.request.post(`/api/admin/orders/${order.id}/refund`, { headers: { origin: baseURL }, data: { operation, input } });
  expect((await post("intake", { submissionKey: randomUUID(), category: "ITEM_ISSUE", reason: "Pengajuan fixture setelah pemeriksaan order dan ongkir.", contactVerificationReference: "TEST-PAYER-VERIFIED", receivedAt: new Date().toISOString() })).status()).toBe(200);
  expect((await post("approve", { submissionKey: randomUUID(), expectedVersion: 1, reason: "Owner fixture menyetujui pengembalian seluruh pembayaran.", returnState: "NOT_REQUIRED" })).status()).toBe(200);
  return { order, token };
}
async function capture(page: Page, name: string) {
  await mkdir(".local/refund-execution/captures", { recursive: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: `.local/refund-execution/captures/${name}-${width}.png`, fullPage: true });
  }
}
for (const enhanced of [true, false]) test(`Owner verifies and records one full MAKE/manual transfer; Customer sees finality (JavaScript=${enhanced})`, async ({ page, browser }) => {
  test.setTimeout(180000);
  await page.context().setExtraHTTPHeaders(isolatedActorHeaders(test.info(), `manual-${enhanced}`));
  await createAdminBrowserSession(page, prisma);
  const fixture = await approvedOrder(page);
  const context = enhanced ? page.context() : await browser.newContext({ baseURL, javaScriptEnabled: false, storageState: await page.context().storageState(), extraHTTPHeaders: isolatedActorHeaders(test.info(), "manual-no-javascript"), viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const current = enhanced ? page : await context.newPage();
  try {
    await current.goto(`/admin/orders/${fixture.order.id}/refund`);
    await current.getByText("Tindak lanjut manual setelah verifikasi provider", { exact: true }).click();
    await current.getByLabel("Dasar penanganan manual", { exact: true }).fill("Owner fixture memastikan metode tidak mendukung API dan memeriksa penerima.");
    await current.getByLabel("Referensi konfirmasi provider: tidak ada refund tertunda atau berhasil", { exact: true }).fill("TEST-SUPPORT-NO-PENDING-REVIEW");
    await current.getByLabel("Referensi verifikasi nominal dan penerima", { exact: true }).fill("TEST-PAYER-RECIPIENT-VERIFIED");
    await current.getByRole("checkbox").check();
    await capture(current, `manual-authorize-${enhanced}`);
    await current.getByRole("button", { name: "Simpan persetujuan manual", exact: true }).click();
    await expect(current.getByRole("heading", { name: /Catat hasil transfer manual/ })).toBeVisible({ timeout: 30000 });
    const form = current.getByRole("group", { name: "Bukti pengembalian manual" });
    const transferReference = `TEST-BANK-${randomUUID()}`;
    await form.getByLabel("Referensi transfer bank yang unik").fill(transferReference);
    await form.getByLabel("Referensi bukti transfer yang sudah diperiksa").fill("TEST-BANK-RECEIPT-VERIFIED");
    // datetime-local drops ":00" seconds, and fill() rejects a value the input rewrites.
    const local = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19).replace(/:00$/, "");
    await form.getByLabel("Waktu transfer selesai (WIB)").fill(local);
    await form.getByRole("button", { name: "Catat transfer terkonfirmasi", exact: true }).click();
    await expect(current.getByText("Penyelesaian terkonfirmasi", { exact: true })).toBeVisible({ timeout: 30000 });
    const refund = await prisma.refundCase.findUniqueOrThrow({ where: { orderId: fixture.order.id }, include: { manualAuthorizations: { include: { payout: { include: { completions: true } } } } } });
    expect(refund.status).toBe("COMPLETED"); expect(refund.amountRp.toFixed(0)).toBe("117006");
    expect(refund.manualAuthorizations[0].payout?.transferReference).toBe(transferReference); expect(refund.manualAuthorizations[0].payout?.completions).toHaveLength(2);
    await capture(current, `manual-completed-${enhanced}`);
    const customerContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
    try {
      await customerContext.addCookies([{ name: CUSTOMER_SESSION_COOKIE, value: fixture.token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
      const customerPage = await customerContext.newPage(); await customerPage.goto(`/account/orders/${fixture.order.id}/refund`);
      await expect(customerPage.getByText("Penyelesaian terkonfirmasi", { exact: true })).toBeVisible();
      await expect(customerPage.locator("main")).not.toContainText("TEST-SUPPORT"); await expect(customerPage.locator("main")).not.toContainText(transferReference);
      await expect(customerPage.getByRole("button", { name: "Simpan persetujuan manual" })).toHaveCount(0);
      await capture(customerPage, `customer-completed-${enhanced}`);
    } finally { await customerContext.close(); }
  } finally { if (!enhanced) await context.close(); }
});

test("Owner revokes unused manual approval without losing history or recording a transfer", async ({ page }) => {
  await page.context().setExtraHTTPHeaders(isolatedActorHeaders(test.info(), "manual-revocation"));
  await createAdminBrowserSession(page, prisma);
  const fixture = await approvedOrder(page);
  const refund = await prisma.refundCase.findUniqueOrThrow({ where: { orderId: fixture.order.id } });
  const response = await page.request.post(`/api/admin/orders/${fixture.order.id}/refund/execution`, { headers: { origin: baseURL }, data: {
    operation: "authorize-manual", input: { expectedVersion: refund.version, submissionKey: randomUUID(), reason: "Persetujuan fixture untuk diperiksa lalu dicabut Owner.",
      providerConfirmedNoPending: true, providerResolutionReference: "TEST-SUPPORT-NO-PENDING-REVOKE", recipientVerificationReference: "TEST-PAYER-VERIFIED-REVOKE" },
  } });
  expect(response.status()).toBe(200);
  await page.goto(`/admin/orders/${fixture.order.id}/refund`);
  const revocation = page.getByRole("group", { name: "Pencabutan persetujuan manual" });
  await revocation.getByLabel("Alasan mencabut persetujuan manual").fill("Owner mencabut persetujuan untuk pemeriksaan bukti yang diperbarui.");
  const revokeButton = revocation.getByRole("button", { name: "Cabut persetujuan manual", exact: true });
  await revokeButton.focus();
  await expect(revokeButton).toBeFocused();
  await revokeButton.press("Enter");
  await expect(page.getByRole("heading", { name: /Catat hasil transfer manual/ })).toHaveCount(0);
  await expect(page.getByText("Tindak lanjut manual setelah verifikasi provider", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/ · Persetujuan tidak aktif$/)).toBeVisible();
  const saved = await prisma.refundCase.findUniqueOrThrow({ where: { id: refund.id }, include: { manualAuthorizations: { include: { payout: true } }, revisions: true } });
  expect(saved.status).toBe("RECONCILING"); expect(saved.completedAt).toBeNull();
  expect(saved.manualAuthorizations).toHaveLength(1); expect(saved.manualAuthorizations[0].payout).toBeNull();
  expect(saved.revisions).toHaveLength(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await capture(page, "manual-revoked");
});
