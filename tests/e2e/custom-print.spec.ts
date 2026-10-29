import { expect, test } from "@playwright/test";
import { loginCustomer } from "./helpers/customer";

test("custom print landing explains the operator-reviewed path without instant-price claims", async ({ page }) => {
  await loginCustomer(page);
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

  const referenceStart = page.getByRole("link", { name: "Mulai dari referensi" });
  if (await referenceStart.count() > 0) {
    await referenceStart.click();
    await expect(page).toHaveURL(/\/custom-print\/request\?mode=reference$/);
  } else {
    await page.getByRole("link", { name: "Saya punya model" }).click();
    await expect(page).toHaveURL(/\/custom-print\/request$/);
  }
  await page.goBack();
  await expect(page.getByRole("link", { name: "Hubungi Kami" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\//);
});

test("Custom Print offers no catalog references; intake takes the customer's own design", async ({ page }) => {
  // Owner decision 28 October 2026: the former custom-flow listings are sold
  // in the Shop, so Custom Print shows no product cards or product picker.
  await loginCustomer(page);
  await page.goto("/custom-print");

  await expect(page.getByRole("heading", { name: "Pilih referensi, lalu biarkan operator mengunci detailnya." })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ajukan untuk Review" })).toHaveCount(0);

  await page.goto("/custom-print/request?product=103726333343");
  await expect(page.getByLabel("Produk yang diminati")).toHaveCount(0);
  await expect(page.locator('input[type="hidden"][name="productInterest"]')).toHaveValue("CUSTOM_UNSPECIFIED");
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
