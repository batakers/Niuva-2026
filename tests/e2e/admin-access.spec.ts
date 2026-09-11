import { expect, test } from "@playwright/test";

test("admin route fails closed without Clerk credentials", async ({ page }) => {
  const response = await page.goto("/admin");

  expect(response).not.toBeNull();
  expect(response?.status()).toBe(503);
  await expect(page.locator("body")).toContainText("AUTH_UNAVAILABLE");
  await expect(page.locator("body")).not.toContainText("Development-only preview");
  await expect(page.locator("body")).not.toContainText("Tindakan yang perlu ditinjau.");
  await expect(page.locator("body")).not.toContainText("Area operasional Niuva");
});
