import { expect, test, type Page } from "@playwright/test";

const storageKey = "niuva.cart.v1";

async function seedCheckout(page: Page) {
  await page.addInitScript(({ key }) => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      items: [{ variantId: "example-dock-grey", quantity: 2 }],
    }));
  }, { key: storageKey });
}

async function fillCheckout(page: Page) {
  await page.getByLabel("Nama pemesan").fill("Pemesan Contoh");
  await page.getByLabel(/Email/).fill("pemesan@example.test");
  await page.getByLabel("Nomor WhatsApp pemesan").fill("+6281234567890");
  await page.getByLabel("Nama penerima").fill("Penerima Contoh");
  await page.getByLabel("Nomor WhatsApp penerima").fill("+6281234567890");
  await page.getByLabel("Alamat lengkap").fill("Jalan Contoh Nomor 12, RT 01 RW 02");
  await page.getByLabel("Kecamatan").fill("Coblong");
  await page.getByLabel("Kota atau kabupaten").fill("Bandung");
  await page.getByLabel("Provinsi").fill("Jawa Barat");
  await page.getByLabel("Kode pos").fill("40132");
}

test.beforeEach(async ({ page }) => {
  await seedCheckout(page);
});

test("cart hands a valid development preview to guest checkout", async ({ page }) => {
  await page.goto("/cart?preview=examples");
  await page.getByRole("link", { name: "Lanjut ke checkout" }).click();
  await expect(page).toHaveURL(/\/checkout\?preview=examples&state=ready$/);
  await expect(page.getByRole("heading", { level: 1, name: "Satu pemeriksaan lagi sebelum transaksi dimulai." })).toBeVisible();
  await expect(page.getByText("Dock modular meja")).toBeVisible();
});

test("checkout validates required fields and never calls provider boundaries", async ({ page }) => {
  const boundaryRequests: string[] = [];
  page.on("request", request => {
    if (/\/api\/(shipping\/rates|checkout)/.test(new URL(request.url()).pathname)) boundaryRequests.push(request.url());
  });
  await page.goto("/checkout?preview=examples&state=ready");
  await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
  const errorSummary = page.getByText("Periksa kembali data checkout.").locator("xpath=../..");
  await expect(errorSummary).toBeFocused();

  await fillCheckout(page);
  await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
  await page.getByRole("radio", { name: /Regular/ }).click();
  await page.getByRole("button", { name: "Tinjau checkout" }).click();
  await expect(page.getByText("Preview checkout siap ditinjau.")).toBeVisible();
  expect(boundaryRequests).toEqual([]);
});

test("unavailable and stale rates keep input and require recovery", async ({ page }) => {
  await page.goto("/checkout?preview=examples&state=rates-unavailable");
  await fillCheckout(page);
  await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
  await expect(page.getByText("Opsi pengiriman belum tersedia.")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByLabel("Alamat lengkap")).toHaveValue("Jalan Contoh Nomor 12, RT 01 RW 02");
  await expect(page.getByRole("radio", { name: /Regular/ })).toBeVisible();

  await page.getByLabel("Skenario checkout").selectOption("rate-stale");
  await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
  await page.getByRole("radio", { name: /Regular/ }).click();
  await page.getByRole("button", { name: "Tinjau checkout" }).click();
  await expect(page.getByText("Pilihan pengiriman sudah kedaluwarsa.")).toBeVisible();
  await page.getByRole("button", { name: "Muat opsi terbaru" }).click();
  await expect(page.getByRole("radio", { name: /Regular/ })).not.toBeChecked();
});

for (const [state, message] of [
  ["payment-pending", "Simulasi pembayaran masih menunggu."],
  ["payment-error", "Simulasi pembayaran gagal."],
] as const) {
  test(`checkout exposes ${state} with preserved input`, async ({ page }) => {
    await page.goto(`/checkout?preview=examples&state=${state}`);
    await fillCheckout(page);
    await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
    await page.getByRole("radio", { name: /Regular/ }).click();
    await page.getByRole("button", { name: "Tinjau checkout" }).click();
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByLabel("Nama pemesan")).toHaveValue("Pemesan Contoh");
  });
}

test("checkout remains readable across the responsive matrix", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/checkout?preview=examples&state=ready");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `checkout at ${width}px`).toBe(true);
  }
  expect(errors).toEqual([]);
});
