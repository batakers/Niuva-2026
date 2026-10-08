import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { generateTestAdminTotp } from "../helpers/admin-totp";
import { isolatedActorHeaders } from "../e2e/helpers/actor";

test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({ trace: "off", screenshot: "off", video: "off", actionTimeout: 15_000 });
let prisma: PrismaClient;
test.beforeAll(() => {
  const url = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 2 }) });
});
test.afterAll(async () => { await prisma?.$disconnect(); });
test.beforeEach(async ({ context }, info) => { await context.setExtraHTTPHeaders(isolatedActorHeaders(info, "admin-dashboard-ux")); });

async function ownerSession(page: Page) {
  const id = randomUUID(), email = `dashboard-owner-${id}@example.test`, password = `Test-${randomUUID()}!`;
  const user = await prisma.adminAuthUser.create({ data: { id, email, name: "Owner Dashboard Fixture", emailVerified: true, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } }, profile: { create: { displayName: "Owner Dashboard Fixture", role: "OWNER", isActive: true } } }, include: { profile: true } });
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email Admin").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aktifkan authenticator", exact: true })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Siapkan authenticator" }).click();
  await page.getByText("Tidak bisa memindai QR?", { exact: true }).click();
  const secret = (await page.locator("details p").textContent())?.split(": ").at(-1);
  if (!secret || !user.profile) throw new Error("Synthetic Owner enrollment unavailable.");
  await page.getByLabel("Saya sudah menyimpan kode pemulihan").check();
  await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
}

test("Owner navigates search, activity, account and deactivates an Admin", async ({ page }) => {
  await ownerSession(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("navigation", { name: "Owner", exact: true }).getByRole("link", { name: "Admin & Akses" })).toBeVisible();
  await expect(page.locator('header form[action="/admin/search"]')).toHaveAttribute("data-shortcut-ready", "true");
  await expect(page.locator("header button strong")).toHaveText("Owner Dashboard Fixture");
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") {
    const directory = resolve(".local/admin-dashboard-ux/captures");
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: resolve(directory, "overview-1440.png"), fullPage: true });
  }
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("searchbox", { name: "Cari di Admin" })).toBeFocused();
  await page.getByRole("searchbox", { name: "Cari di Admin" }).fill("Orders");
  await page.getByRole("searchbox", { name: "Cari di Admin" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Pencarian global" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Orders.*Halaman Admin/ })).toBeVisible();
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") await page.screenshot({ path: resolve(".local/admin-dashboard-ux/captures/search-1440.png"), fullPage: true });
  await page.getByRole("button", { name: /Buka notifikasi/ }).click();
  await page.getByRole("link", { name: "Lihat semua aktivitas" }).click();
  await expect(page.getByRole("heading", { name: "Linimasa aktivitas" })).toBeVisible();
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") await page.screenshot({ path: resolve(".local/admin-dashboard-ux/captures/activity-1440.png"), fullPage: true });
  await page.getByRole("button", { name: /Buka menu akun/ }).click();
  await expect(page.getByRole("link", { name: "Akun saya" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: "Akun saya" })).toHaveCount(0);
  await page.getByRole("button", { name: /Buka menu akun/ }).click();
  await page.getByRole("link", { name: "Akun saya" }).click();
  await expect(page.getByRole("heading", { name: "Akun saya" })).toBeVisible();
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") await page.screenshot({ path: resolve(".local/admin-dashboard-ux/captures/account-1440.png"), fullPage: true });

  const adminId = randomUUID();
  const targetEmail = `dashboard-admin-${adminId}@example.test`;
  const target = await prisma.adminAuthUser.create({ data: { id: adminId, email: targetEmail, name: "Admin Target Fixture", emailVerified: true, twoFactorEnabled: true, profile: { create: { displayName: "Admin Target Fixture", role: "ADMIN", isActive: true } } }, include: { profile: true } });
  await prisma.adminAuthSession.create({ data: { id: randomUUID(), token: `target-${randomUUID()}`, userId: adminId, expiresAt: new Date(Date.now() + 60_000), mfaVerified: true } });
  await page.goto("/admin/admins");
  await expect(page.getByRole("heading", { name: "Admin & Akses" })).toBeVisible();
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") await page.screenshot({ path: resolve(".local/admin-dashboard-ux/captures/admins-1440.png"), fullPage: true });
  const row = page.locator("li").filter({ hasText: targetEmail }).first();
  await row.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
  await row.getByRole("button", { name: "Ya, nonaktifkan" }).click();
  await expect(row).toContainText("Nonaktif");
  await expect(row.getByRole("button", { name: "Nonaktifkan", exact: true })).toHaveCount(0);
  expect(await prisma.adminProfile.findUnique({ where: { id: target.profile!.id }, select: { isActive: true } })).toMatchObject({ isActive: false });
  expect(await prisma.adminAuthSession.count({ where: { userId: adminId } })).toBe(0);
  await page.getByRole("button", { name: /Buka notifikasi/ }).click();
  await page.getByRole("link", { name: "Lihat semua aktivitas" }).click();
  await expect(page.getByText("Akun Admin dinonaktifkan").first()).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/admins");
  await expect(page.getByRole("heading", { name: "Admin & Akses" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") await page.screenshot({ path: resolve(".local/admin-dashboard-ux/captures/admins-390.png"), fullPage: true });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  if (process.env.NIUVA_ADMIN_UX_EVIDENCE === "1") await page.screenshot({ path: resolve(".local/admin-dashboard-ux/captures/overview-390.png"), fullPage: true });
});
