import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { createAdminBrowserSession } from "./helpers/session";
test.use({ trace: "off", screenshot: "off", video: "off" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }) }) });
test.afterAll(() => prisma.$disconnect());
test("Owner can inspect rates in the isolated test database; ordinary Admin is denied", async ({ page, browser }) => {
  await createAdminBrowserSession(page, prisma);
  await page.goto("/admin/pricing"); await expect(page).toHaveURL(/\/admin\/settings\/custom-print-rates$/);
  await expect(page.getByLabel("PLA · 200 gram pertama (Rp)", { exact: true })).toBeVisible();
  // Pricing activation is restricted to an explicit development loopback DB;
  // an isolated E2E database must never be treated as that environment.
  await expect(page.getByRole("button", { name: "Tinjau perubahan", exact: true })).toBeDisabled();
  await expect(page.getByText("Penerapan tarif tersedia setelah lingkungan operasional diizinkan. Saat ini hanya development lokal yang diizinkan.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await mkdir(".local/admin-redesign/captures", { recursive: true }); await page.screenshot({ path: ".local/admin-redesign/captures/tariffs-review-390.png", fullPage: true, caret: "initial" });
  const context = await browser.newContext({ baseURL: "http://localhost:3107" }); const adminPage = await context.newPage();
  await createAdminBrowserSession(adminPage, prisma, "ADMIN"); await adminPage.goto("/admin/settings/custom-print-rates");
  await expect(adminPage.locator('[data-system-state="admin-access-forbidden"]')).toBeVisible(); await context.close();
});
