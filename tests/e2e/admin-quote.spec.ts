import { expect, test, type Page } from "@playwright/test";

const quotePreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=quotes&quote=QTE-EX-3028";

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) {
      mutationRequests.push(request.url());
    }
  });

  return mutationRequests;
}

test("Action Queue hands a quote item to the isolated quote preview", async ({ page }) => {
  await page.goto("/auis/proofs/frontend/admin?preview=examples&state=ready");
  await page.getByRole("button", { name: "Buka quote preview" }).click();

  await expect(page).toHaveURL(/module=quotes.*quote=QTE-EX-3028/);
  await expect(page.getByRole("heading", { name: "Draft dari review yang sudah lengkap." })).toBeVisible();
  await expect(page.getByText("QTE-EX-3028", { exact: true })).toBeVisible();
});

test("quote editor blocks calculation and sending when an active rule is missing", async ({ page }) => {
  await page.goto(`${quotePreviewUrl}&quoteState=rule-missing`);

  await expect(page.getByText("Pricing rule aktif tidak tersedia")).toBeVisible();
  await expect(page.getByText("Rincian belum tersedia")).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim quote preview" })).toBeDisabled();
});

test("quote editor sends and locks only a local preview snapshot", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto(quotePreviewUrl);

  await page.getByLabel(/Sumber filament untuk quote/).selectOption("COMMUNAL");
  await page.getByLabel("Catatan scope quote").fill("Finishing mengikuti fixture review.");
  await page.getByRole("button", { name: "Kirim quote preview" }).click();

  await expect(page.getByText("Snapshot preview sudah terkirim dan tidak dapat diubah")).toBeVisible();
  await expect(page.getByText("15 September 2026, 10.30 WIB")).toBeVisible();
  await expect(page.getByLabel(/Sumber filament untuk quote/)).toBeDisabled();
  await expect(page.getByLabel("Catatan scope quote")).toBeDisabled();
  expect(mutationRequests).toEqual([]);
});

test("quote editor exposes loading, empty, error recovery, and invalid fixture states", async ({ page }) => {
  await page.goto(`${quotePreviewUrl}&quoteState=loading`);
  await expect(page.locator("[data-admin-quote-loading]")).toBeVisible();

  await page.goto(`${quotePreviewUrl}&quoteState=empty`);
  await expect(page.getByText("Tidak ada draft quote contoh")).toBeVisible();

  await page.goto(`${quotePreviewUrl}&quoteState=error`);
  await expect(page.getByText("Draft quote preview belum dapat dimuat")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("button", { name: "Kirim quote preview" })).toBeVisible();

  await page.goto("/auis/proofs/frontend/admin?preview=examples&state=ready&module=quotes&quote=QTE-EX-MISSING");
  await expect(page.getByText("Quote preview tidak tersedia")).toBeVisible();
});

test("quote editor remains readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(quotePreviewUrl);
    await expect(page.getByRole("heading", { name: "Draft dari review yang sudah lengkap." })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin quote editor at ${width}px`,
    ).toBe(true);
  }
});
