import { expect, test } from "@playwright/test";

const previewUrl = "/orders/preview-order?preview=examples";

test("retail status exposes a safe public timeline and next expectation", async ({ page }) => {
  await page.goto(previewUrl);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pembayaran diterima");
  await expect(page.getByRole("heading", { name: "ORD-260907-R4K8" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tahapan Retail order" })).toBeVisible();
  await expect(page.getByText("Alamat lengkap, kontak customer, file privat, dan catatan operator tidak ditampilkan.")).toBeVisible();
  await expect(page.getByText("Query browser hanya memilih skenario tampilan dan tidak menentukan status order nyata.")).toBeVisible();
  await expect(page.getByText("NVA-DEMO-4821")).toHaveCount(0);
  await expect(page.getByText(/preview-order/)).toHaveCount(0);
});

test("custom states follow quote, production, and final shipping payment order", async ({ page }) => {
  await page.goto(`${previewUrl}&state=custom-quote-pending`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quote menunggu keputusan");
  await expect(page.getByRole("link", { name: "Tinjau quote contoh" })).toHaveAttribute("href", "/quote/preview-quote?preview=examples");

  await page.goto(`${previewUrl}&state=custom-production`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Custom print dalam produksi");
  await expect(page.getByText("Finishing dan QC")).toBeVisible();

  await page.goto(`${previewUrl}&state=custom-awaiting-shipping-payment`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Menunggu pembayaran pengiriman");
  await expect(page.getByRole("button", { name: "Pembayaran pengiriman belum aktif" })).toBeDisabled();
});

test("shipping and completed scenarios reveal only safe shipment details", async ({ page }) => {
  await page.goto(`${previewUrl}&state=retail-shipped`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order dalam pengiriman");
  await expect(page.getByText("NVA-DEMO-4821")).toBeVisible();
  await expect(page.getByText("Nomor lacak ini sintetis dan tidak membuka situs provider.")).toBeVisible();

  await page.goto(`${previewUrl}&state=retail-completed`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order selesai");
  await expect(page.getByText("Tidak ada tindakan lanjutan", { exact: true })).toBeVisible();
});

test("late payment stays cancelled and requires full refund reconciliation", async ({ page }) => {
  await page.goto(`${previewUrl}&state=late-payment`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Refund penuh sedang direkonsiliasi");
  await expect(page.getByText("Order tetap dibatalkan", { exact: false })).toBeVisible();
  await expect(page.getByText("Jangan melakukan pembayaran ulang. Siapkan nomor order saat menghubungi Niuva melalui kanal konfirmasi Anda.")).toBeVisible();
  await expect(page.getByText("Stok atau pemenuhan tidak dilanjutkan.")).toBeVisible();
});

test("token and service failures reveal no order projection", async ({ page }) => {
  await page.goto(`${previewUrl}&state=expired-token`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tautan status tidak dapat digunakan.");
  await expect(page.getByText("ORD-260907-R4K8")).toHaveCount(0);

  await page.goto(`${previewUrl}&state=revoked-token`);
  await expect(page.getByText("Tautan sudah dicabut")).toBeVisible();
  await expect(page.getByText("CUS-260907-N2Q8")).toHaveCount(0);

  await page.goto(`${previewUrl}&state=service-error`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Status belum dapat dimuat.");
  await expect(page.getByRole("link", { name: "Coba lagi" })).toBeVisible();

  const response = await page.goto("/orders/token-tidak-valid?preview=examples");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Status order tidak dapat ditampilkan.");
  await expect(page.getByText("ORD-260907-R4K8")).toHaveCount(0);
});

test("loading remains non-authoritative", async ({ page }) => {
  await page.goto(`${previewUrl}&state=loading`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Status order sedang diperiksa.");
  await expect(page.getByText("ORD-260907-R4K8")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
});

test("order status stays readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${previewUrl}&state=custom-production`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `order status at ${width}px`,
    ).toBe(true);
  }
});
