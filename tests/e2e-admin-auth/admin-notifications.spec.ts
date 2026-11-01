import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { isolatedActorHeaders } from "../e2e/helpers/actor";
import { createAdminBrowserSession } from "./helpers/session";

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({ trace: "off", screenshot: "off", video: "off" });
let prisma: PrismaClient;
test.beforeAll(() => { prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }), max: 2 }) }); });
test.afterAll(async () => { await prisma?.$disconnect(); });
test.beforeEach(async ({ context }, info) => { await context.setExtraHTTPHeaders(isolatedActorHeaders(info, "admin-notifications")); });

async function confirmRead(page: Page, button: Locator) {
  const acknowledgment = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/notifications/read" && response.request().method() === "POST");
  await button.click();
  const response = await acknowledgment;
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
}

test("bell history, focus, live attention, read persistence and no replay", async ({ page }) => {
  const profile = await createAdminBrowserSession(page, prisma);
  const bell = page.getByRole("button", { name: /Buka notifikasi/ });
  await expect(bell).toBeVisible();
  await expect(bell).toHaveAttribute("data-feed-ready", "true");
  await bell.focus(); await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Notifikasi" });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape"); await expect(bell).toBeFocused();
  const request = await prisma.customPrintRequest.create({ data: { referenceNumber: `CP-NOTIF-${randomUUID()}`, publicTokenHash: randomUUID(), customerName: "Notification Customer", customerEmail: "notification@example.test", customerPhone: "+628000000000", materialRequested: "PLA", quantity: 1 } });
  const attention = await prisma.auditLog.create({ data: { actorType: "SYSTEM", entityType: "CustomPrintRequest", entityId: request.id, action: "custom-print.request.submitted" } });
  await expect(page.getByTestId("notification-toasts").getByText("Permintaan Custom Print diterima")).toBeVisible({ timeout: 30_000 });
  await bell.click();
  const row = panel.locator("li").filter({ has: page.locator(`a[href="/admin/custom-print/${request.id}"]`) });
  await page.route("**/api/admin/notifications/read", async route => {
    await new Promise(resolve => setTimeout(resolve, 6000));
    await route.continue();
  }, { times: 1 });
  await confirmRead(page, row.getByRole("button", { name: "Tandai dibaca" }));
  await expect.poll(async () => Boolean((await prisma.adminNotificationReceipt.findUnique({ where: { profileId_auditLogId: { profileId: profile.id, auditLogId: attention.id } } }))?.readAt)).toBe(true);
  const routine = await prisma.auditLog.create({ data: { actorType: "SYSTEM", entityType: "CustomPrintRequest", entityId: request.id, action: "custom-print.request.status.transition" } });
  await expect.poll(() => prisma.adminNotificationReceipt.count({ where: { profileId: profile.id, auditLogId: routine.id } }), { timeout: 30_000 }).toBe(1);
  await expect(page.getByTestId("notification-toasts").getByText("Status Custom Print diperbarui")).toHaveCount(0);
  await row.getByRole("link", { name: "Permintaan Custom Print diterima", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/custom-print/${request.id}$`));
  await page.reload(); await expect(bell).toHaveAttribute("data-feed-ready", "true");
  await expect(page.getByTestId("notification-toasts").getByText("Permintaan Custom Print diterima")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await bell.click(); await expect(panel).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("business email failure remains readable and links to its persisted order", async ({ page }) => {
  const profile = await createAdminBrowserSession(page, prisma);
  const bell = page.getByRole("button", { name: /Buka notifikasi/ });
  await expect(bell).toHaveAttribute("data-feed-ready", "true");
  const suffix = randomUUID(), email = `email-failure-${suffix}@example.test`;
  const customer = await prisma.customer.create({ data: { email, normalizedEmail: email, emailVerifiedAt: new Date() } });
  const order = await prisma.order.create({ data: { orderNumber: `TEST-EMAIL-${suffix}`, orderType: "RETAIL", customerId: customer.id,
    customerName: "Synthetic Customer", customerEmail: email, customerPhone: "+628000000000", itemsSubtotalRp: "100000", shippingTotalRp: "0", grandTotalRp: "100000", publicTokenHash: randomUUID() } });
  const event = await prisma.auditLog.create({ data: { entityType: "Order", entityId: order.id, actorType: "SYSTEM", action: "outbox.business.failed", afterJson: { purpose: "ORDER_RECEIVED", state: "FAILED", failureCategory: "OUTCOME_UNKNOWN" } } });
  await expect(page.getByTestId("notification-toasts").getByText("Email Customer perlu diperiksa")).toBeVisible({ timeout: 30_000 });
  await bell.click();
  const panel = page.getByRole("dialog", { name: "Notifikasi" });
  const row = panel.locator("li").filter({ has: page.locator(`a[href="/admin/orders/${order.id}"]`) });
  await expect(row.getByRole("link", { name: "Email Customer perlu diperiksa", exact: true })).toHaveAttribute("href", `/admin/orders/${order.id}`);
  await expect(row).not.toContainText(email); await expect(row).not.toContainText("OUTCOME_UNKNOWN");
  await page.route("**/api/admin/notifications/read", async route => {
    await new Promise(resolve => setTimeout(resolve, 6000));
    await route.continue();
  }, { times: 1 });
  await confirmRead(page, row.getByRole("button", { name: "Tandai dibaca" }));
  await expect.poll(async () => Boolean((await prisma.adminNotificationReceipt.findUnique({ where: { profileId_auditLogId: { profileId: profile.id, auditLogId: event.id } } }))?.readAt)).toBe(true);
  await page.reload(); await expect(bell).toHaveAttribute("data-feed-ready", "true");
  await expect(page.getByTestId("notification-toasts").getByText("Email Customer perlu diperiksa")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.setViewportSize({ width: 320, height: 760 });
  await bell.click(); await expect(panel).toBeVisible();
  await expect(row.getByRole("button", { name: "Tandai dibaca" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await row.getByRole("link", { name: "Email Customer perlu diperiksa", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${order.id}$`));
  await expect(page.getByRole("heading", { name: "Detail pesanan", exact: true })).toBeVisible();
  await expect(page.getByRole("main")).toContainText(order.orderNumber);
  expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
});
