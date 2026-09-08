import { expect, test, type Page } from "@playwright/test";

const productsPreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=products";
const editorPreviewUrl = `${productsPreviewUrl}&view=editor&sku=STK-EX-6024`;

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) {
      mutationRequests.push(request.url());
    }
  });

  return mutationRequests;
}

test("product list opens a selected variant in the isolated editor preview", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);

  await page.goto(`${productsPreviewUrl}&sku=STK-EX-6024`);
  await page.getByRole("button", { name: "Edit varian" }).click();

  await expect(page).toHaveURL(/module=products.*view=editor.*sku=STK-EX-6024/);
  await expect(page.getByRole("heading", { name: "Ubah katalog tanpa mengabaikan konteks." })).toBeVisible();
  await expect(page.getByLabel(/^SKU/)).toHaveValue("STK-EX-6024");
  expect(mutationRequests).toEqual([]);
});

test("product editor makes unsaved, invalid stock, required reason, and local save states recoverable", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto(editorPreviewUrl);

  await page.getByLabel(/^Stok fisik/).fill("-1");
  await page.getByRole("button", { name: "Simpan perubahan preview" }).click();
  await expect(page.getByText("Stok memakai bilangan bulat nonnegatif.")).toBeVisible();
  await expect(page.getByLabel(/^Stok fisik/)).toBeFocused();

  await page.getByLabel(/^Stok fisik/).fill("3");
  await page.getByRole("button", { name: "Simpan perubahan preview" }).click();
  await expect(page.getByText("Pilih alasan saat jumlah stok berubah.")).toBeVisible();
  await expect(page.getByText("Perubahan belum disimpan")).toBeVisible();

  await page.getByLabel(/^Alasan penyesuaian stok/).selectOption("physical-count");
  await page.getByRole("button", { name: "Simpan perubahan preview" }).click();
  await expect(page.getByText("Perubahan preview tersimpan secara lokal")).toBeVisible();
  await expect(page.getByText("Perubahan belum disimpan")).toHaveCount(0);
  expect(mutationRequests).toEqual([]);
});

test("product editor offers loading, empty, error, conflict, and missing-fixture recovery states", async ({ page }) => {
  await page.goto(`${editorPreviewUrl}&editor=loading`);
  await expect(page.locator("[data-admin-product-editor-loading]")).toHaveAttribute("aria-busy", "true");

  await page.goto(`${editorPreviewUrl}&editor=empty`);
  await expect(page.getByText("Tidak ada produk contoh untuk diedit")).toBeVisible();

  await page.goto(`${editorPreviewUrl}&editor=error`);
  await expect(page.getByText("Editor produk preview belum dapat dimuat")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("heading", { name: "Identitas produk" })).toBeVisible();

  await page.goto(`${editorPreviewUrl}&editor=conflict`);
  await expect(page.getByText("Perubahan preview berbenturan")).toBeVisible();
  await page.getByRole("button", { name: "Muat ulang fixture" }).click();
  await expect(page.getByRole("heading", { name: "Varian terpilih" })).toBeVisible();

  await page.goto(`${productsPreviewUrl}&view=editor&sku=SKU-DOES-NOT-EXIST`);
  await expect(page.getByText("Produk preview tidak tersedia")).toBeVisible();
});

test("product editor remains readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(editorPreviewUrl);
    await expect(page.getByRole("heading", { name: "Ubah katalog tanpa mengabaikan konteks." })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin product editor at ${width}px`,
    ).toBe(true);
  }
});
