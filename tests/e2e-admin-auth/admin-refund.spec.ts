import { randomUUID } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { createOpaqueToken, hashOpaqueToken, CUSTOMER_SESSION_COOKIE } from "../../src/modules/customer-auth/core";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { isolatedActorHeaders } from "../e2e/helpers/actor";
import { createAdminBrowserSession } from "./helpers/session";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }) }) });
const baseURL = "http://localhost:3107";
test.afterAll(async () => { await prisma.$disconnect(); });
async function customerOrder(context: BrowserContext) {
  const email = `refund-browser-${randomUUID()}@example.test`, token = createOpaqueToken();
  const customer = await prisma.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date(), displayName: "Synthetic Refund Customer",
    sessions: { create: { tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 3600000) } } } });
  await context.addCookies([{ name: CUSTOMER_SESSION_COOKIE, value: token, url: baseURL, httpOnly: true, sameSite: "Lax" }]);
  const order = await prisma.order.create({ data: { customerId: customer.id, orderNumber: `TEST-REFUND-${randomUUID()}`, orderType: "RETAIL", status: "COMPLETED",
    customerName: "Synthetic Refund Customer", customerEmail: email, customerPhone: "+628000000000", itemsSubtotalRp: "100000", shippingTotalRp: "0", grandTotalRp: "100000", publicTokenHash: randomUUID(), paidAt: new Date(), completedAt: new Date() } });
  await prisma.paymentAttempt.create({ data: { orderId: order.id, purpose: "ORDER_TOTAL", amountRp: "100000", status: "SETTLED", settledAt: new Date(), providerOrderId: `TEST-REFUND-PAY-${randomUUID()}`, expiresAt: new Date(Date.now() + 60000) } });
  return order;
}
async function capture(page: Page, name: string) {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo(0, 0);
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll<HTMLElement>("main *")].flatMap(element => {
      const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.right > window.innerWidth + 0.5 ? [{ tag: element.tagName, className: element.className, width: rect.width, right: rect.right }] : [];
    }).slice(0, 12) }));
    if (dimensions.scrollWidth > width) await page.screenshot({ path: `.local/refund/captures/overflow-${name}-${width}.png`, fullPage: true });
    expect(dimensions.scrollWidth, JSON.stringify(dimensions.offenders)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `.local/refund/captures/${name}-${width}.png`, fullPage: true });
  }
}
test("Customer requests a refund; Owner approves conditionally and records return evidence; Admin cannot approve", async ({ page, browser }) => {
  test.setTimeout(180000);
  await page.context().setExtraHTTPHeaders(isolatedActorHeaders(test.info(), "refund-customer"));
  const order = await customerOrder(page.context());
  await page.goto(`/account/orders/${order.id}`);
  await page.getByRole("link", { name: "Pengajuan dan status refund" }).click();
  await expect(page.getByRole("heading", { name: "Pengajuan refund", exact: true })).toBeVisible();
  await page.getByLabel("Jenis pengajuan", { exact: true }).selectOption("ITEM_ISSUE");
  await page.getByLabel("Alasan pengajuan", { exact: true }).fill("Barang yang diterima tidak sesuai dengan pesanan fixture.");
  await page.getByLabel("Alasan pengajuan", { exact: true }).press("Tab");
  await expect(page.getByRole("button", { name: "Ajukan refund penuh" })).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" }); await capture(page, "customer-request");
  await page.getByRole("button", { name: "Ajukan refund penuh" }).click();
  await expect(page.getByRole("heading", { name: "Kasus refund Anda" })).toBeVisible();
  const refund = await prisma.refundCase.findUniqueOrThrow({ where: { orderId: order.id } }); expect(refund.amountRp.toFixed(0)).toBe("100000");
  await createAdminBrowserSession(page, prisma, "OWNER");
  await page.goto(`/admin/orders/${order.id}`); await page.getByRole("link", { name: "Pengajuan dan persetujuan refund" }).click();
  await expect(page.getByRole("heading", { name: "Kasus refund", exact: true })).toBeVisible();
  await page.getByLabel("Dasar persetujuan Owner").fill("Pembayaran dan kondisi barang sudah diperiksa oleh Owner.");
  await page.getByLabel("Syarat retur", { exact: true }).selectOption("PENDING");
  const approvalForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Simpan persetujuan Owner" }) });
  const submissionKey = await approvalForm.locator('input[name="submissionKey"]').inputValue();
  await capture(page, "owner-review");
  await page.getByRole("button", { name: "Simpan persetujuan Owner" }).click();
  await expect(page.getByRole("heading", { name: "Pemeriksaan retur" })).toBeVisible();
  expect((await prisma.refundCase.findUniqueOrThrow({ where: { id: refund.id } })).readyAt).toBeNull();
  await page.getByLabel("Hasil pemeriksaan retur").fill("Retur fixture diterima lengkap dan sudah diperiksa.");
  await page.getByLabel("Referensi bukti retur", { exact: true }).fill("TEST-RETURN-RECEIPT-001");
  await page.getByRole("button", { name: "Catat retur diterima" }).click();
  await expect(page.getByRole("heading", { name: "Pemeriksaan retur" })).toHaveCount(0);
  await expect.poll(async () => (await prisma.refundCase.findUniqueOrThrow({ where: { id: refund.id } })).readyAt !== null).toBe(true);
  const duplicate = await page.request.post(`/api/admin/orders/${order.id}/refund`, { headers: { origin: baseURL }, data: { operation: "approve", input: { expectedVersion: 1, submissionKey, reason: "Pembayaran dan kondisi barang sudah diperiksa oleh Owner.", returnState: "PENDING" } } });
  expect(duplicate.status()).toBe(200); expect(await prisma.refundApproval.count({ where: { caseId: refund.id } })).toBe(1);
  expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("COMPLETED");
  const adminContext = await browser.newContext({ baseURL }); const adminPage = await adminContext.newPage();
  try {
    await createAdminBrowserSession(adminPage, prisma, "ADMIN"); await adminPage.goto(`/admin/orders/${order.id}/refund`);
    await expect(adminPage.getByRole("button", { name: "Simpan persetujuan Owner" })).toHaveCount(0);
    const denied = await adminPage.request.post(`/api/admin/orders/${order.id}/refund`, { headers: { origin: baseURL }, data: { operation: "approve", input: { expectedVersion: 3, submissionKey: randomUUID(), reason: "Admin tidak memiliki kewenangan persetujuan refund.", returnState: "NOT_REQUIRED" } } });
    expect(denied.status()).toBe(403);
  } finally { await adminContext.close(); }
});

test("Customer refund form supports native submission and recovery without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await context.setExtraHTTPHeaders(isolatedActorHeaders(test.info(), "refund-native"));
  try {
    const order = await customerOrder(context), page = await context.newPage();
    await page.goto(`/account/orders/${order.id}/refund`);
    await page.getByLabel("Jenis pengajuan", { exact: true }).selectOption("OTHER");
    await page.getByLabel("Alasan pengajuan", { exact: true }).fill("          ");
    await page.getByRole("button", { name: "Ajukan refund penuh" }).click();
    await expect(page.getByRole("alert")).toContainText("Data permintaan tidak valid");
    expect(await prisma.refundCase.count({ where: { orderId: order.id } })).toBe(0);
    await page.getByLabel("Alasan pengajuan", { exact: true }).fill("Pengajuan fixture melalui form native tanpa JavaScript.");
    await page.getByRole("button", { name: "Ajukan refund penuh" }).click();
    await expect(page.getByRole("heading", { name: "Kasus refund Anda" })).toBeVisible();
    expect(await prisma.refundCase.count({ where: { orderId: order.id } })).toBe(1);
    await page.screenshot({ path: ".local/refund/captures/customer-native-390.png", fullPage: true });
  } finally { await context.close(); }
});

test("Admin intake preserves the first receipt from a service channel in WIB", async ({ page }) => {
  const order = await customerOrder(page.context());
  await createAdminBrowserSession(page, prisma, "ADMIN");
  await page.goto(`/admin/orders/${order.id}/refund`);
  await page.getByLabel("Jenis pengajuan", { exact: true }).selectOption("OTHER");
  await page.getByLabel("Alasan pengajuan", { exact: true }).fill("Pengajuan fixture diterima melalui kanal layanan sebelumnya.");
  await page.getByLabel("Referensi verifikasi pihak yang menghubungi", { exact: true }).fill("SERVICE-REFUND-BROWSER-001");
  const receivedAt = new Date(Date.now() - 86400000);
  const receivedLocal = new Date(receivedAt.getTime() + 7 * 3600000).toISOString().slice(0, 16);
  await page.getByLabel("Waktu pertama diterima (WIB)", { exact: true }).fill(receivedLocal);
  await capture(page, "staff-intake");
  await page.getByRole("button", { name: "Catat pengajuan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pengajuan dan pembayaran", exact: true })).toBeVisible();
  const refund = await prisma.refundCase.findUniqueOrThrow({ where: { orderId: order.id } });
  expect(refund.receivedAt.toISOString()).toBe(new Date(`${receivedLocal}:00+07:00`).toISOString());
});
