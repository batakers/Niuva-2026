import { expect, test, type Page } from "@playwright/test";

const portfolioPreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=portfolio";

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) {
      mutationRequests.push(request.url());
    }
  });

  return mutationRequests;
}

function portfolioRows(page: Page) {
  return page.locator("[data-admin-portfolio-table] tbody tr");
}

test("portfolio list keeps publication, content readiness, and local edit selection distinct", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto(portfolioPreviewUrl);

  await expect(portfolioRows(page)).toHaveCount(3);
  const table = page.locator("[data-admin-portfolio-table]");
  await expect(table.getByText("Published preview", { exact: true })).toBeVisible();
  await expect(table.getByText("Media belum ada", { exact: true })).toBeVisible();
  await expect(table.getByText("Izin belum dikonfirmasi", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Draft" }).click();
  await expect(portfolioRows(page)).toHaveCount(2);
  await page.getByRole("button", { name: /Pilih untuk edit Fixture internal: enclosure elektronik/ }).click();
  await expect(page.getByRole("heading", { name: "Pilihan untuk diedit" })).toBeVisible();
  await expect(page.getByLabel("Pilihan portofolio preview").getByText("Fixture internal: enclosure elektronik", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Buat portofolio preview" }).click();
  await expect(page.getByRole("heading", { name: "Draft baru preview" })).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("portfolio list recovers loading, empty, error, and filter-empty preview states", async ({ page }) => {
  await page.goto(`${portfolioPreviewUrl}&portfolio=loading`);
  await expect(page.locator("[data-admin-portfolio-loading]")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Buat portofolio preview" })).toBeDisabled();

  await page.goto(`${portfolioPreviewUrl}&portfolio=empty`);
  await expect(page.getByText("Tidak ada portofolio contoh")).toBeVisible();

  await page.goto(`${portfolioPreviewUrl}&portfolio=error`);
  await expect(page.getByText("Daftar portofolio preview belum dapat dimuat")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(portfolioRows(page)).toHaveCount(3);

  await page.getByRole("button", { name: "Published preview" }).click();
  await page.getByRole("button", { name: "Media belum ada" }).click();
  await expect(page.getByText("Filter tidak menemukan portofolio contoh")).toBeVisible();
  await page.getByLabel("Daftar portofolio").getByRole("button", { name: "Reset filter" }).click();
  await expect(portfolioRows(page)).toHaveCount(3);
});

test("portfolio status and missing content remain legible across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(portfolioPreviewUrl);
    await expect(page.getByRole("heading", { name: "Publikasi perlu bukti yang lengkap." })).toBeVisible();
    if (width < 1024) {
      await expect(page.locator("[data-admin-portfolio-cards]").getByText("Media belum ada", { exact: true })).toBeVisible();
      await expect(page.locator("[data-admin-portfolio-cards]").getByText("Izin belum dikonfirmasi", { exact: true })).toBeVisible();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin portfolio at ${width}px`,
    ).toBe(true);
  }
});
