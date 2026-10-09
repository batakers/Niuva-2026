import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../src/generated/prisma/client";
import { generateTestAdminTotp } from "../../helpers/admin-totp";
import { isolatedActorHeaders } from "../../e2e/helpers/actor";

export async function createAdminBrowserSession(page: Page, prisma: PrismaClient, role: "OWNER" | "ADMIN" = "OWNER") {
  await page.context().setExtraHTTPHeaders(isolatedActorHeaders(test.info(), `admin-session-${role.toLowerCase()}`));
  const id = randomUUID(), password = `Test-${randomUUID()}!`;
  const email = `redesign-${id}@example.test`;
  const user = await prisma.adminAuthUser.create({ data: { id, email, name: `${role} Redesign Fixture`, emailVerified: true,
    accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    profile: { create: { displayName: `${role} Redesign Fixture`, role, isActive: true } } }, include: { profile: true } });
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email Admin").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aktifkan authenticator", exact: true })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Siapkan authenticator" }).click();
  await page.getByText("Tidak bisa memindai QR?", { exact: true }).click();
  const secret = (await page.locator("details p").textContent())?.split(": ").at(-1);
  if (!secret || !user.profile) throw new Error("Synthetic Admin enrollment unavailable.");
  await page.getByLabel("Saya sudah menyimpan kode pemulihan").check();
  await page.getByLabel("Kode authenticator", { exact: true }).fill(generateTestAdminTotp(secret));
  await page.getByRole("button", { name: "Verifikasi kode" }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  if (!user.profile) throw new Error("Synthetic Admin profile missing.");
  return user.profile;
}
