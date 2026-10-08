import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
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
test.beforeEach(async ({ context }, info) => { await context.setExtraHTTPHeaders(isolatedActorHeaders(info, "admin-customers")); });

test("Admin reads a customer and returns from its legitimate order", async ({ page }) => {
  await createAdminBrowserSession(page, prisma, "ADMIN");
  const email = `customer-browser-${randomUUID()}@example.test`;
  const customer = await prisma.customer.create({ data: { email, normalizedEmail: email, displayName: "Customer Browser Fixture" } });
  const order = await prisma.order.create({ data: { customerId: customer.id, customerEmail: email, customerName: "Customer Browser Fixture", customerPhone: "+628000000000", orderNumber: `DIR-BROWSER-${randomUUID()}`, orderType: "RETAIL", grandTotalRp: "1000", itemsSubtotalRp: "1000", shippingTotalRp: "0", publicTokenHash: randomUUID() } });
  const list = `/admin/customers?q=${encodeURIComponent(email)}&page=1`;
  await page.goto(list);
  await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Customer Browser Fixture", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Riwayat pekerjaan" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kembali ke Customers" })).toHaveAttribute("href", list);
  await page.getByRole("link", { name: order.orderNumber, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Detail order", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke Riwayat customer", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/customers/${customer.id}\\?tab=orders&page=1$`));
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole("link", { name: "Custom Print", exact: true }).last().click();
  await expect(page.getByText("Belum ada riwayat pada bagian ini.")).toBeVisible();
  await page.goto("/admin/admins");
  await expect(page.getByRole("heading", { name: "Akun ini tidak memiliki akses Admin" })).toBeVisible();
});
