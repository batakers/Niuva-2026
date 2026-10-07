import { randomBytes, randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../../src/generated/prisma/client";
import { getSafeTestDatabaseUrl } from "../../src/lib/db/test-safety";
import { invitationTokenHash } from "../../src/modules/admin-auth/invitation-service";
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
test.beforeEach(async ({ context }, info) => { await context.setExtraHTTPHeaders(isolatedActorHeaders(info, "admin-invitation")); });

async function enroll(page: Page, password: string) {
  await expect(page.getByRole("heading", { name: "Aktifkan authenticator", exact: true })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Siapkan authenticator" }).click();
  await page.getByText("Tidak bisa memindai QR?", { exact: true }).click();
  const secret = (await page.locator("details p").textContent())?.split(": ").at(-1);
  if (!secret) throw new Error("Synthetic enrollment fixture unavailable.");
  await page.getByLabel("Saya sudah menyimpan kode pemulihan").check();
  await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await page.waitForURL("**/admin", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
}
async function ownerFixture() {
  const id = randomUUID();
  const email = `invite-owner-${id}@example.test`;
  const password = `Synthetic-only-${randomUUID()}!`;
  const user = await prisma.adminAuthUser.create({ data: { id, email, name: "Synthetic invitation Owner", emailVerified: true, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } }, profile: { create: { role: "OWNER", isActive: true } } }, include: { profile: true } });
  return { user, email, password };
}

test("Owner sees Add Admin, SMTP availability, responsive layout and keyboard focus", async ({ page }) => {
  const owner = await ownerFixture();
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email Admin").fill(owner.email);
  await page.getByLabel("Password", { exact: true }).fill(owner.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await enroll(page, owner.password);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Tambah Admin", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tambah Admin", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Email undangan belum tersedia");
  await expect(page.getByLabel("Nama Admin")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Kirim undangan", exact: true })).toBeDisabled();
  await mkdir(".impeccable/review", { recursive: true });
  await page.screenshot({ path: ".impeccable/review/add-admin-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 1612, height: 828 });
  await page.screenshot({ path: ".impeccable/review/add-admin-user-1612.png", fullPage: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: ".impeccable/review/add-admin-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Kembali ke Dashboard", exact: true }).focus();
  await expect(page.getByRole("link", { name: "Kembali ke Dashboard", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  // Disabled invitation controls leave keyboard navigation available.
  await expect(page.getByRole("link", { name: "Kembali ke Dashboard", exact: true })).not.toBeFocused();
  await page.getByText("Menu Admin", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Kelola mobile" }).getByRole("link", { name: "Tambah Admin", exact: true })).toBeVisible();
});

test("recipient creates a password, still needs real MFA, and cannot add other Admins", async ({ page }) => {
  const owner = await ownerFixture();
  const email = `invite-recipient-${randomUUID()}@example.test`;
  const password = `Test-${randomUUID().slice(0, 8)}!`;
  const token = randomBytes(32).toString("base64url");
  await prisma.adminInvitation.create({ data: { email, displayName: "Synthetic invited Admin", tokenHash: invitationTokenHash(token), status: "SENT", expiresAt: new Date(Date.now() + 30 * 60_000), invitedByAdminId: owner.user.profile!.id } });
  await page.goto(`/admin/sign-in?flow=invite#token=${token}`);
  await expect(page.getByRole("heading", { name: "Aktifkan akun Admin", exact: true })).toBeVisible();
  await expect.poll(() => page.url()).toBe("http://localhost:3107/admin/sign-in?flow=invite");
  await page.getByLabel("Password baru", { exact: true }).fill(password);
  await page.getByLabel("Konfirmasi password baru", { exact: true }).fill(password);
  const activation = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/auth/accept-invitation", { timeout: 30_000 });
  await page.getByRole("button", { name: "Aktifkan akun", exact: true }).click();
  expect((await activation).status()).toBe(200);
  await expect(page.getByRole("status")).toContainText("Akun Admin sudah aktif");
  const user = await prisma.adminAuthUser.findUniqueOrThrow({ where: { email }, include: { profile: true, sessions: true } });
  expect(user.profile?.role).toBe("ADMIN");
  expect(user.twoFactorEnabled).toBe(false);
  expect(user.sessions).toHaveLength(0);
  const replay = await page.request.post("/api/admin/auth/accept-invitation", { headers: { origin: "http://localhost:3107" }, data: { token, password } });
  expect(replay.status()).toBe(409);
  await page.getByLabel("Email Admin").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await enroll(page, password);
  await expect(page.getByRole("link", { name: "Tambah Admin", exact: true })).toHaveCount(0);
  await page.goto("/admin/admins/new");
  await expect(page.getByRole("heading", { name: "Tambah Admin", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kirim undangan", exact: true })).toHaveCount(0);
});

test("anonymous visitors cannot open the Owner form or use public signup", async ({ page }) => {
  await page.goto("/admin/admins/new");
  await expect(page.getByLabel("Email Admin")).toBeVisible();
  const signup = await page.request.post("/api/admin/auth/sign-up/email", { headers: { origin: "http://localhost:3107" }, data: { email: "unused@example.test", password: "Test-only-password-318!", name: "Fixture" } });
  expect(signup.status()).toBe(404);
});
