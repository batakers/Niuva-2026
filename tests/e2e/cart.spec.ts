import { expect, test } from "@playwright/test";

const storageKey = "niuva.cart.v1";

test("product selection adds only variant ID and quantity to the local cart", async ({ page }) => {
  await page.goto("/shop/contoh-dock-modular-meja?preview=examples");
  await page.getByRole("radio", { name: /Abu-abu/ }).click();
  await page.getByRole("button", { name: "Tambah jumlah" }).click();
  await page.getByRole("button", { name: "Tambah ke cart" }).click();

  expect(await page.evaluate(key => window.localStorage.getItem(key), storageKey)).toBe(
    '{"version":1,"items":[{"variantId":"example-dock-grey","quantity":2}]}',
  );
  await page.getByRole("link", { name: "Lihat cart" }).click();
  await expect(page).toHaveURL(/\/cart\?preview=examples$/);
  await expect(page.getByRole("heading", { level: 3, name: "Dock modular meja" })).toBeVisible();
  await expect(page.getByText(/Rp\s?390\.000/)).toBeVisible();
});

test("cart quantity updates locally and remove returns to the empty state", async ({ page }) => {
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 1, items: [{ variantId: "example-tray-single", quantity: 1 }] }));
  }, { key: storageKey });
  await page.goto("/cart?preview=examples");

  await page.getByRole("button", { name: /Tambah jumlah Tray komponen/ }).click();
  await expect(page.getByRole("spinbutton", { name: /Jumlah Tray komponen/ })).toHaveValue("2");
  expect(await page.evaluate(key => window.localStorage.getItem(key), storageKey)).toContain('"quantity":2');

  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByText("Cart Anda masih kosong.")).toBeVisible();
  expect(await page.evaluate(key => window.localStorage.getItem(key), storageKey)).toBe('{"version":1,"items":[]}');
});

test("cart clears corrupt browser storage and provides recovery", async ({ page }) => {
  await page.addInitScript(({ key }) => window.localStorage.setItem(key, "{broken"), { key: storageKey });
  await page.goto("/cart?preview=examples");

  await expect(page.getByText("Cart lokal dipulihkan.")).toBeVisible();
  await expect(page.getByText("Cart Anda masih kosong.")).toBeVisible();
  expect(await page.evaluate(key => window.localStorage.getItem(key), storageKey)).toBeNull();
});

test("cart keeps unknown items removable when product data is unavailable", async ({ page }) => {
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 1, items: [{ variantId: "example-dock-blue", quantity: 1 }] }));
  }, { key: storageKey });
  await page.goto("/cart?preview=error");

  await expect(page.getByText("Data produk belum dapat diperiksa.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Varian belum dapat dikenali" })).toBeVisible();
  await page.getByRole("button", { name: "Hapus item" }).click();
  await expect(page.getByText("Cart Anda masih kosong.")).toBeVisible();
});

test("cart stays readable without horizontal overflow", async ({ page }) => {
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify({ version: 1, items: [{ variantId: "example-dock-blue", quantity: 2 }] }));
  }, { key: storageKey });
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/cart?preview=examples");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `cart at ${width}px`).toBe(true);
  }
});
