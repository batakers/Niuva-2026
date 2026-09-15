import { expect, test, type Page } from "@playwright/test";

const DEMO_REFERENCE_PATTERN = /INQ-[0-9]{8}-[A-Z0-9]{8}/;

async function fillProjectBrief(page: Page): Promise<void> {
  const form = page.getByRole("form", { name: "Form project brief" });
  for (const [name, value] of Object.entries({
    name: "Demo Client",
    email: "demo-client@example.test",
    phone: "+628000000001",
    projectGoal: "Memeriksa alur demo lokal",
    description: "Brief sintetis untuk verifikasi Project Brief sampai Action Queue.",
    targetQuantity: "1 prototype",
    targetDeadline: "2026-10-01",
    referenceLink: "https://example.test/local-demo",
  })) {
    await form.locator(`[name="${name}"]`).fill(value);
  }

  await form.locator('[name="currentStage"]').selectOption("CAD");
  await form.getByRole("checkbox", { name: /Persetujuan kerahasiaan/ }).check();
}

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

test("Project Brief persists to Action Queue and continues to local demo checkout", async ({ page }) => {
  test.slow();
  const externalProviderRequests: string[] = [];
  page.on("request", (request) => {
    if (/biteship|midtrans|sandbox/i.test(request.url())) {
      externalProviderRequests.push(request.url());
    }
  });

  await page.goto("/project-brief");
  await expect(page.locator("[data-demo-badge]")).toHaveText("Demo lokal");
  await fillProjectBrief(page);
  await page.getByRole("button", { name: "Kirim project brief" }).click();
  await expect(page.getByText("Brief tersimpan.")).toBeVisible({ timeout: 30_000 });

  const successText = await page.getByRole("status").filter({ hasText: "INQ-" }).textContent();
  const referenceNumber = successText?.match(DEMO_REFERENCE_PATTERN)?.[0];
  expect(referenceNumber).toMatch(DEMO_REFERENCE_PATTERN);
  if (referenceNumber === undefined) {
    throw new Error("Reference demo tidak ditemukan pada konfirmasi Project Brief.");
  }

  await page.getByRole("link", { name: "Lihat Action Queue demo" }).click();
  await expect(page).toHaveURL(/\/demo\/action-queue$/);
  await expect(page.getByRole("heading", { level: 1, name: "Action Queue demo" })).toBeVisible();
  await expect(page.locator(`[data-demo-queue-item][data-reference="${referenceNumber}"]`)).toBeVisible();

  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Desk Organizer Demo" })).toBeVisible();
  await page.getByRole("link", { name: /Desk Organizer Demo/ }).first().click();
  await page.getByRole("radio", { name: /Abu-abu/ }).check();
  await page.getByRole("button", { name: "Tambah ke cart" }).click();
  await page.getByRole("link", { name: "Lihat cart" }).click();
  await page.getByRole("link", { name: "Lanjut ke checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("Checkout demo lokal aktif")).toBeVisible();

  await fillCheckout(page);
  await page.getByRole("button", { name: "Tinjau opsi pengiriman" }).click();
  await expect(page.getByRole("radio", { name: /Regular Demo/ })).toBeVisible();
  await page.getByRole("radio", { name: /Regular Demo/ }).check();
  await page.getByRole("button", { name: "Buat order demo" }).click();
  await expect(page.getByText("Order demo tersimpan.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/tersimpan di database lokal/)).toBeVisible();

  expect(externalProviderRequests).toEqual([]);
});
