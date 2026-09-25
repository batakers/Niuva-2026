import { expect, test } from "@playwright/test";

test("account redirects an unauthenticated Customer to Google login", async ({ page }) => {
  await page.goto("/account");

  await expect(page).toHaveURL(/\/login\?returnTo=(?:%2F|\/)account$/);
  await expect(page.getByRole("link", { name: "Lanjutkan dengan Google" })).toBeVisible();
});

test("register uses the Google boundary, opens Account, and logout revokes access", async ({ page }) => {
  await page.goto("/register?returnTo=/account");
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1, name: "Profil dan order Anda." })).toBeVisible();
  await expect(page.getByText("demo-customer@example.test")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login\?loggedOut=1$/);
  await expect(page.getByText("Anda sudah logout.")).toBeVisible();
});

test("unsafe returnTo falls back to Account after Customer login", async ({ page }) => {
  await page.goto("/login?returnTo=https%3A%2F%2Fevil.example%2Fsteal");
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();

  await expect(page).toHaveURL(/\/account$/);
});
