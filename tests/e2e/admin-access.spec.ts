import { expect, test } from "@playwright/test";

test("admin routes fail closed without Clerk credentials", async ({ page }) => {
  for (const path of [
    "/admin",
    "/admin/sign-in",
    "/admin/products/11111111-1111-4111-8111-111111111111/stock/22222222-2222-4222-8222-222222222222",
  ]) {
    const response = await page.goto(path);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(503);
    await expect(page.locator("body")).toContainText("AUTH_UNAVAILABLE");
    await expect(page.locator("body")).not.toContainText("Development-only preview");
    await expect(page.locator("body")).not.toContainText("Tindakan yang perlu ditinjau.");
    await expect(page.locator("body")).not.toContainText("Area operasional Niuva");
  }
});
