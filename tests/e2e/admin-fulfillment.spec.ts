import { expect, test, type Page } from "@playwright/test";

const ordersPreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=orders";

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) {
      mutationRequests.push(request.url());
    }
  });

  return mutationRequests;
}

test("Order drawer shows a safe fulfillment projection and keeps operator action local", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto(`${ordersPreviewUrl}&order=ORD-EX-4072`);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Detail fulfillment order" })).toBeVisible();
  await expect(dialog.getByText("Tidak dimuat di preview")).toBeVisible();
  await expect(dialog.getByText("Riwayat dan audit preview")).toBeVisible();

  await dialog.getByRole("button", { name: "Mulai fulfillment preview" }).click();
  await expect(dialog.getByText("Sedang diproses", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("Transition preview dicatat")).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("Custom shipping preview rejects missing measurement then permits the valid local edge", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto(`${ordersPreviewUrl}&order=ORD-EX-4265`);

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Lanjutkan QC preview" }).click();
  await dialog.getByRole("button", { name: "Validasi pengukuran preview" }).click();
  await expect(dialog.getByText("Pengukuran paket belum lengkap")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Siapkan pembayaran pengiriman preview" })).toBeDisabled();

  await dialog.getByLabel("Panjang akhir (cm)").fill("12.5");
  await dialog.getByLabel("Lebar akhir (cm)").fill("8");
  await dialog.getByLabel("Tinggi akhir (cm)").fill("4");
  await dialog.getByLabel("Berat akhir (g)").fill("235");
  await dialog.getByRole("button", { name: "Validasi pengukuran preview" }).click();
  await expect(dialog.getByText("Pengukuran preview valid")).toBeVisible();
  await dialog.getByRole("button", { name: "Siapkan pembayaran pengiriman preview" }).click();
  await expect(dialog.getByText("Menunggu pembayaran pengiriman", { exact: true }).first()).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("Full refund review is visible only in the Owner preview role", async ({ page }) => {
  await page.goto(`${ordersPreviewUrl}&order=ORD-EX-4072&role=ADMIN`);
  const adminDialog = page.getByRole("dialog");
  await expect(adminDialog.getByText("Tindakan ini hanya dapat diminta oleh Owner")).toBeVisible();
  await expect(adminDialog.getByRole("button", { name: "Tinjau refund penuh preview" })).toHaveCount(0);

  await page.goto(`${ordersPreviewUrl}&order=ORD-EX-4072&role=OWNER`);
  const ownerDialog = page.getByRole("dialog");
  await ownerDialog.getByRole("button", { name: "Tinjau refund penuh preview" }).click();
  await expect(ownerDialog.getByText("Workflow refund penuh belum terhubung")).toBeVisible();
});

test("Fulfillment drawer remains readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${ordersPreviewUrl}&order=ORD-EX-4265`);
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin fulfillment at ${width}px`,
    ).toBe(true);
  }
});
