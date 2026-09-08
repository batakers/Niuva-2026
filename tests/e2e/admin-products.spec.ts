import { expect, test, type Page } from "@playwright/test";

const productsPreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=products";

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) {
      mutationRequests.push(request.url());
    }
  });

  return mutationRequests;
}

function productRows(page: Page) {
  return page.locator("[data-admin-products-table] tbody tr");
}

function productTable(page: Page) {
  return page.locator("[data-admin-products-table]");
}

test("Action Queue hands a stock item to the isolated product-list preview", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);

  await page.goto("/auis/proofs/frontend/admin?preview=examples&state=ready");
  await page.getByRole("button", { name: "Buka stok preview" }).click();

  await expect(page).toHaveURL(/module=products.*sku=STK-EX-6024/);
  await expect(page.getByRole("heading", { name: "Katalog yang perlu dijaga." })).toBeVisible();
  await expect(page.getByLabel("Cari SKU atau nama produk")).toHaveValue("STK-EX-6024");
  await expect(productRows(page)).toHaveCount(1);
  await expect(productTable(page).getByText("Dudukan display", { exact: true })).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("product filters separate publication, inactive variants, and active-stock availability locally", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);

  await page.goto(productsPreviewUrl);

  await expect(productRows(page)).toHaveCount(4);
  await expect(productTable(page).getByText("1 varian inactive")).toBeVisible();
  await expect(productTable(page).getByText("Belum dipublikasikan")).toBeVisible();
  await expect(productTable(page).getByText("Stok habis")).toBeVisible();

  const unpublished = page.getByRole("button", { name: "Belum dipublikasikan" });
  await unpublished.click();
  await expect(unpublished).toHaveAttribute("aria-pressed", "true");
  await expect(productRows(page)).toHaveCount(1);
  await expect(productTable(page).getByText("Tray komponen", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reset filter" }).click();
  await page.getByRole("button", { name: "Stok habis" }).click();
  await expect(productRows(page)).toHaveCount(1);
  await expect(productTable(page).getByText("Dudukan display", { exact: true })).toBeVisible();

  await page.getByLabel("Cari SKU atau nama produk").fill("EX-DOCK-BLACK");
  await expect(productRows(page)).toHaveCount(0);
  await expect(page.getByText("Filter tidak menemukan produk contoh")).toBeVisible();
  await page.getByRole("button", { name: "Reset filter" }).click();
  await page.getByLabel("Cari SKU atau nama produk").fill("EX-DOCK-BLACK");
  await expect(productRows(page)).toHaveCount(1);
  await expect(productTable(page).getByText("1 varian inactive")).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("product list exposes loading, empty, and error recovery as local preview states", async ({ page }) => {
  await page.goto(`${productsPreviewUrl}&products=loading`);
  await expect(page.locator("[data-admin-products-loading]")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByLabel("Cari SKU atau nama produk")).toBeDisabled();

  await page.goto(`${productsPreviewUrl}&products=empty`);
  await expect(page.getByText("Tidak ada produk contoh")).toBeVisible();

  await page.goto(`${productsPreviewUrl}&products=error`);
  await expect(page.getByText("Daftar produk preview belum dapat dimuat")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(productRows(page)).toHaveCount(4);
});

test("product list remains readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(productsPreviewUrl);
    await expect(page.getByRole("heading", { name: "Katalog yang perlu dijaga." })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin product list at ${width}px`,
    ).toBe(true);
  }
});
