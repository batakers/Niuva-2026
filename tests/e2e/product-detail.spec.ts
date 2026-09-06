import { expect, test } from "@playwright/test";

test("product detail changes price and quantity from an available variant", async ({ page }) => {
  await page.goto("/shop/contoh-dock-modular-meja?preview=examples");
  await expect(page.getByRole("heading", { level: 1, name: "Dock modular meja" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah ke cart (preview)" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Hitam/ })).toBeDisabled();

  await page.getByRole("radio", { name: /Abu-abu/ }).click();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/Rp\s?195\.000/);
  await page.getByRole("button", { name: "Tambah jumlah" }).click();
  await expect(page.getByRole("spinbutton", { name: "Jumlah" })).toHaveValue("2");
  await page.getByRole("button", { name: "Tambah ke cart (preview)" }).click();
  await expect(page.getByText("Pilihan siap untuk cart.")).toBeVisible();
  await expect(page.getByText(/Belum ada cart, reservasi stok, atau transaksi/)).toBeVisible();
});

test("out-of-stock product cannot prepare a cart intent", async ({ page }) => {
  await page.goto("/shop/contoh-stand-display-ringkas?preview=examples");
  await expect(page.getByText("Semua varian sedang habis.")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(2);
  for (const radio of await page.getByRole("radio").all()) await expect(radio).toBeDisabled();
  await expect(page.getByRole("button", { name: "Tambah ke cart (preview)" })).toBeDisabled();
});

test("invalid product slug has a clear recovery path", async ({ page }) => {
  const response = await page.goto("/shop/produk-tidak-ada?preview=examples");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Produk tidak ditemukan." })).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke Shop" }).click();
  await expect(page).toHaveURL(/\/shop$/);
});

test("product detail exposes loading and error recovery states", async ({ page }) => {
  await page.goto("/shop/contoh-dock-modular-meja?preview=loading");
  await expect(page.getByRole("status", { name: "Memuat detail produk" })).toBeVisible();
  await page.goto("/shop/contoh-dock-modular-meja?preview=error");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Terjadi gangguan pada preview.");
  await page.getByRole("link", { name: "Coba lagi" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dock modular meja" })).toBeVisible();
});

test("product detail stays readable without overflow", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop/contoh-dock-modular-meja?preview=examples");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `product detail at ${width}px`).toBe(true);
  }
  expect(errors).toEqual([]);
});
