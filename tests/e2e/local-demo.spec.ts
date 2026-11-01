import { expect, test, type Page } from "@playwright/test";

async function fillCheckout(page: Page): Promise<void> {
  await page.getByLabel("Nama pemesan").fill("Demo Client");
  await page.getByLabel("Email").fill("demo-client@example.test");
  await page.getByLabel("Nomor WhatsApp pemesan").fill("+628000000001");
  await page.getByLabel("Nama penerima").fill("Demo Recipient");
  await page.getByLabel("Nomor WhatsApp penerima").fill("+628000000001");
  await page.getByLabel("Alamat lengkap").fill("Jalan Demo Nomor 12, RT 01 RW 02");
  await page.getByLabel("Kecamatan").fill("Coblong");
  await page.getByLabel("Kota atau kabupaten").fill("Bandung");
  await page.getByLabel("Provinsi").fill("Jawa Barat");
  await page.getByLabel("Kode pos").fill("40132");
}

test("B2B uses WhatsApp while local demo checkout remains available", async ({ page }) => {
  test.slow();
  const externalProviderRequests: string[] = [];
  page.on("request", (request) => {
    if (/biteship|midtrans|sandbox/i.test(request.url())) {
      externalProviderRequests.push(request.url());
    }
  });

  await page.goto("/project-brief");
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole("main").getByRole("link", { name: "Hubungi Kami" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await page.goto("/demo/action-queue");
  await expect(page.getByRole("heading", { level: 1, name: "Action Queue demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka Custom Print" })).toHaveAttribute("href", "/custom-print");

  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Desk Organizer Demo" })).toBeVisible();
  await page.getByRole("link", { name: /Desk Organizer Demo/ }).first().click();
  await page.getByRole("radio", { name: /Abu-abu/ }).check();
  await page.getByRole("button", { name: "Tambah ke keranjang" }).click();
  await page.getByRole("link", { name: "Lihat keranjang" }).click();
  await page.getByRole("link", { name: "Lanjut ke checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("Checkout demo lokal aktif")).toBeVisible();

  await fillCheckout(page);
  await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
  await expect(page.getByRole("radio", { name: /Regular Demo/ })).toBeVisible();
  await page.getByRole("radio", { name: /Regular Demo/ }).check();
  await page.getByRole("button", { name: "Buat pesanan demo" }).click();
  await expect(page.getByText("Pesanan demo tersimpan.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/tersimpan di database lokal/)).toBeVisible();
  await page.getByRole("link", { name: "Lihat status pesanan" }).click();
  await expect(page).toHaveURL(/\/orders\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Menunggu pembayaran" })).toBeVisible();
  await expect(page.locator("main#main-content")).toHaveAttribute("data-order-source", "live");

  expect(externalProviderRequests).toEqual([]);
});
