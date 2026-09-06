import { expect, test } from "@playwright/test";

test("custom print landing explains the operator-reviewed path without instant-price claims", async ({ page }) => {
  await page.goto("/custom-print");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Review dulu. Baru produksi.",
  );
  await expect(page.getByRole("list").filter({ hasText: "Review dan slicing operator" })).toContainText(
    "Quote dan persetujuan",
  );
  await expect(page.getByText("STL · 3MF · OBJ")).toBeVisible();
  await expect(page.getByText("STEP · STP")).toBeVisible();
  await expect(page.getByText("Tidak ada harga final instan dari geometri.", { exact: false })).toBeVisible();
  await expect(page.getByRole("img", { name: /ilustrasi konseptual model 3D/i })).toBeVisible();
  await expect(page.getByText("Bukan hasil produksi Niuva.", { exact: false })).toBeVisible();

  const requestButton = page.getByRole("button", { name: "Mulai request" });
  await expect(requestButton).toBeDisabled();
  await page.getByRole("link", { name: "Diskusikan kebutuhan khusus" }).click();
  await expect(page).toHaveURL(/\/project-brief$/);
});

test("custom print landing stays usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/custom-print");

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `custom print at ${width}px`,
    ).toBe(true);
  }
});
