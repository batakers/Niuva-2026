import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { generateTestAdminTotp } from "../helpers/admin-totp";
import { isolatedActorHeaders } from "../e2e/helpers/actor";

test.beforeEach(async ({ context }, testInfo) => {
  await context.setExtraHTTPHeaders(isolatedActorHeaders(testInfo, "admin"));
});

test("Admin login works at mobile width with keyboard and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/admin/sign-in");
  await expect(page.getByRole("heading", { name: "Masuk Admin", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("Email Admin").focus();
  await expect(page.getByLabel("Email Admin")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Lupa password?" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Pulihkan password" })).toBeVisible();
  expect((await page.request.get("/api/admin/orders")).status()).toBe(401);
});

test("Admin enrolls TOTP, signs in again with a second factor and revokes the session on logout", async ({ page }) => {
  const url = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? (process.env.CI ? "postgresql://niuva_test@127.0.0.1:5432/niuva_test?schema=public" : undefined) });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
  const id = randomUUID(), email = `e2e-admin-${id}@example.test`, password = "E2E-only-admin-password-572!";
  await prisma.adminAuthUser.create({ data: { id, name: "Admin Fixture", email, emailVerified: true, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } }, profile: { create: { role: "OWNER", isActive: true } } } });
  try {
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email Admin").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aktifkan authenticator", exact: true })).toBeVisible();
    expect((await page.request.get("/api/admin/orders")).status()).toBe(401);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Siapkan authenticator" }).click();
    await page.getByText("Tidak bisa memindai QR?", { exact: true }).click();
    const text = await page.locator("details p").textContent();
    const secret = text!.split(": ").at(-1)!;
    await page.getByLabel("Saya sudah menyimpan kode pemulihan").check();
    await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
    await page.getByRole("button", { name: "Verifikasi kode" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Keamanan akun", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Keamanan akun Admin" })).toBeVisible();
    await page.goto("/admin");
    const logoutResponse = page.waitForResponse(response => response.url().endsWith("/api/admin/auth/sign-out"), { timeout: 15_000 });
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    expect((await logoutResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/admin\/sign-in$/);
    expect((await page.request.get("/api/admin/orders")).status()).toBe(401);
    await page.getByLabel("Email Admin").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByLabel("Kode authenticator", { exact: true })).toBeVisible();
    expect((await page.request.get("/api/admin/orders")).status()).toBe(401);
    await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
    await page.getByRole("button", { name: "Verifikasi kode" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("link", { name: "Keamanan akun", exact: true }).click();
    const newPassword = "E2E-new-693!";
    await expect(page.getByRole("button", { name: "Ubah password", exact: true })).toBeEnabled();
    await page.getByLabel("Password saat ini").fill(password);
    await page.getByLabel("Password baru", { exact: true }).fill(newPassword);
    await page.getByLabel("Konfirmasi password baru").fill(newPassword);
    await page.getByRole("button", { name: "Ubah password", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/sign-in\?flow=password-updated$/);
    await expect(page.getByText("Password sudah diubah. Masuk kembali dengan password baru dan authenticator.")).toBeVisible();
    expect((await page.request.get("/api/admin/orders")).status()).toBe(401);
    await page.getByLabel("Email Admin").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.getByLabel("Kode authenticator", { exact: true })).toBeVisible();
    await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
    await page.getByRole("button", { name: "Verifikasi kode" }).click();
    await expect(page).toHaveURL(/\/admin$/);
  } finally {
    await prisma.adminProfile.deleteMany({ where: { authUserId: id } });
    await prisma.adminAuthUser.deleteMany({ where: { id } });
    await prisma.$disconnect();
  }
});
