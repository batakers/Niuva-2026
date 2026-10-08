import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { createAdminBrowserSession } from "./helpers/session";
test.use({ trace: "off", screenshot: "off", video: "off" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }) }) });
test.afterAll(() => prisma.$disconnect());
for (const role of ["OWNER", "ADMIN"] as const) test(`${role} reads bento Overview and report sections on desktop and mobile`, async ({ page }) => {
  await createAdminBrowserSession(page, prisma, role);
  await mkdir(".local/admin-redesign/captures", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `.local/admin-redesign/captures/overview-${role.toLowerCase()}-${width}.png`, fullPage: true });
  }
  await page.getByRole("link", { name: "13 bulan", exact: true }).click(); await expect(page).toHaveURL(/range=13m/);
  await page.getByRole("link", { name: "Lihat laporan", exact: true }).click(); await expect(page).toHaveURL(/tab=finance&range=13m/);
  await expect(page.getByRole("heading", { name: "Keuangan", exact: true })).toBeVisible();
  await page.getByText("Lihat tabel data · Penerimaan terkonfirmasi", { exact: true }).click();
  await expect(page.getByRole("table", { name: "Penerimaan terkonfirmasi", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Bagian laporan" }).getByRole("link", { name: "Trafik Situs" }).click();
  await expect(page.getByRole("heading", { name: "Trafik Situs", exact: true })).toBeVisible();
  await expect(page.getByText(/bukan pengunjung unik atau atribusi order/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: `.local/admin-redesign/captures/reports-${role.toLowerCase()}-320.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/admin/reports?tab=summary&range=30d");
  await page.screenshot({ path: `.local/admin-redesign/captures/reports-${role.toLowerCase()}-1440.png`, fullPage: true });
  // Increased text and tablet reflow complement the 320 CSS pixel layout check.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
  const ordersTab = page.getByRole("navigation", { name: "Bagian laporan" }).getByRole("link", { name: "Orders", exact: true });
  await ordersTab.focus(); await expect(ordersTab).toBeFocused(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/tab=orders&range=30d/);
  await expect(page.getByRole("heading", { name: "Operasional", exact: true })).toBeVisible();
  await page.screenshot({ path: `.local/admin-redesign/captures/reports-${role.toLowerCase()}-text-200.png`, fullPage: true });
});
