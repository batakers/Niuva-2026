import { expect, test } from "@playwright/test";

test("shop preview filters products and communicates stock without purchase actions", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByText("Katalog ready-made belum dipublikasikan.")).toBeVisible();
  await page.getByRole("link", { name: "Contoh", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(4);
  await expect(page.getByText("Tersedia", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Stok habis", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Workspace" }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Cari produk" }).fill("tidak ada");
  await expect(page.getByRole("heading", { name: "Tidak ada produk yang cocok." })).toBeVisible();
  await page.getByRole("button", { name: "Hapus filter" }).click();
  await expect(page.locator("article")).toHaveCount(4);
  await expect(page.locator("article a, article button")).toHaveCount(0);
});

test("shop preview exposes loading and error recovery", async ({ page }) => {
  await page.goto("/shop?preview=error");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Katalog belum dapat dimuat.");
  await page.getByRole("link", { name: "Coba lagi" }).click();
  await expect(page.locator("article")).toHaveCount(4);
  await page.getByRole("link", { name: "Memuat", exact: true }).click();
  await expect(page.getByRole("status", { name: "Memuat katalog" })).toBeVisible();
});

test("homepage and public navigation expose the available Shop route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Mau produk siap beli/ }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Produk ready-made, dengan status yang jelas.");
  await expect(page.getByRole("navigation", { name: "Navigasi footer" }).getByRole("link", { name: "Shop" })).toBeVisible();
});

test("shop stays readable without overflow across supported viewports", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop?preview=examples");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `shop at ${width}px`).toBe(true);
  }
  expect(errors).toEqual([]);
});
