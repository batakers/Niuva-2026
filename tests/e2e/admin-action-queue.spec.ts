import { expect, test } from "@playwright/test";

test("admin Action Queue remains fail-closed without Clerk credentials", async ({
  page,
}) => {
  const response = await page.goto("/admin");

  expect(response).not.toBeNull();
  expect(response?.status()).toBe(503);

  const body = page.locator("body");
  await expect(body).toContainText("AUTH_UNAVAILABLE");
  await expect(body).not.toContainText("Action Queue");
  await expect(body).not.toContainText("Development-only preview");
  await expect(body).not.toContainText("Tinjau brief proyek baru");
  await expect(body).not.toContainText("Periksa permintaan custom print");
  await expect(body).not.toContainText("Owner");
  await expect(body).not.toContainText("ADMIN");
});
