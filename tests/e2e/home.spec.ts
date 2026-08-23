import { expect, test } from "@playwright/test";

test("baseline homepage exposes the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Create Next App");
  await expect(
    page.getByRole("heading", { name: /to get started/i }),
  ).toBeVisible();
});
