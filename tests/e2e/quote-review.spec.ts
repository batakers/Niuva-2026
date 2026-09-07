import { expect, test } from "@playwright/test";

const previewUrl = "/quote/preview-quote?preview=examples";

test("quote review presents immutable scope, assumptions, expiry, and breakdown", async ({ page }) => {
  await page.goto(previewUrl);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tinjau yang dikunci sebelum menyetujui.");
  await expect(page.getByText("QUO-260907-K7M4")).toBeVisible();
  await expect(page.getByText("14 September 2026, 16.00 WIB")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scope yang ditawarkan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asumsi yang diverifikasi" })).toBeVisible();
  await expect(page.getByText("Rp115.360")).toBeVisible();
  await expect(page.getByText("Ongkir dihitung setelah paket final selesai diukur.")).toBeVisible();
  await expect(page.getByText("preview-quote", { exact: true })).toHaveCount(0);
});

test("accept and decline require confirmation and remain local", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => {
    if (request.method() === "POST" && /\/api\/(quote|custom-print|checkout|payments)/.test(request.url())) {
      mutations.push(request.url());
    }
  });

  await page.goto(previewUrl);
  await page.getByRole("button", { name: "Terima quote" }).click();
  await expect(page.getByRole("alertdialog", { name: "Konfirmasi penerimaan quote" })).toBeFocused();
  await page.getByRole("button", { name: "Kembali" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Tolak quote" }).click();
  await expect(page.getByRole("alertdialog", { name: "Konfirmasi penolakan quote" })).toBeVisible();
  await page.getByRole("button", { name: "Konfirmasi tolak" }).click();
  await expect(page.locator("main[data-quote-state]")).toHaveAttribute("data-quote-state", "declined");
  await expect(page.getByText("Quote ditandai ditolak dalam preview.")).toBeVisible();
  expect(mutations).toEqual([]);
});

for (const scenario of [
  ["expired", "Quote sudah kedaluwarsa."],
  ["superseded", "Versi quote yang lebih baru tersedia."],
  ["accepted", "Quote ditandai diterima dalam preview."],
  ["declined", "Quote ditandai ditolak dalam preview."],
] as const) {
  test(`quote review exposes ${scenario[0]} as a read-only state`, async ({ page }) => {
    await page.goto(`${previewUrl}&state=${scenario[0]}`);
    await expect(page.getByText(scenario[1])).toBeVisible();
    await expect(page.getByRole("button", { name: "Terima quote" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tolak quote" })).toHaveCount(0);
  });
}

test("quote loading and invalid access fail safely", async ({ page }) => {
  await page.goto(`${previewUrl}&state=loading`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rincian quote sedang disiapkan.");
  await expect(page.getByRole("button", { name: "Terima quote" })).toHaveCount(0);

  const response = await page.goto("/quote/token-tidak-valid?preview=examples");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quote tidak dapat ditampilkan.");
  await expect(page.getByText("QUO-260907-K7M4")).toHaveCount(0);
});

test("quote review stays readable across supported viewports", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(previewUrl);

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `quote review at ${width}px`,
    ).toBe(true);
  }
});
