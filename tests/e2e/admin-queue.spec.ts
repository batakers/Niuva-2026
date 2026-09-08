import { expect, test, type Page } from "@playwright/test";

const previewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready";

function queueRows(page: Page) {
  return page.locator("[data-action-queue]").getByRole("listitem");
}

test("Action Queue prioritizes all six synthetic work types without dashboard metrics", async ({ page }) => {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET") mutationRequests.push(request.url());
  });

  await page.goto(previewUrl);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tindakan yang perlu ditinjau.");
  await expect(queueRows(page)).toHaveCount(6);
  await expect(page.getByText("BRF-EX-1049")).toBeVisible();
  await expect(page.getByText("QTE-EX-3028")).toBeVisible();
  await expect(page.getByText("ORD-EX-4072")).toBeVisible();
  await expect(page.getByText("PKG-EX-5081")).toBeVisible();
  await expect(page.getByText("STK-EX-6024")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Exception Action Queue" })).toContainText("Exception perlu dilihat");

  expect(mutationRequests).toEqual([]);
});

test("Action Queue filters work locally and keep the priority count visible", async ({ page }) => {
  await page.goto(previewUrl);

  const quoteFilter = page.getByRole("button", { exact: true, name: "Quote" });
  await expect(quoteFilter).toBeEnabled();
  await quoteFilter.click();
  await expect(quoteFilter).toHaveAttribute("aria-pressed", "true");
  await expect(queueRows(page)).toHaveCount(1);
  await expect(page.getByText("QTE-EX-3028")).toBeVisible();
  await expect(page.getByText("6 tindakan contoh · 5 perlu perhatian segera")).toBeVisible();

  await page.getByRole("button", { name: "Semua" }).click();
  await expect(queueRows(page)).toHaveCount(6);
});

test("a quote queue action opens only the isolated local detail-preview handoff", async ({ page }) => {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET") mutationRequests.push(request.url());
  });

  await page.goto(previewUrl);
  await page.getByRole("button", { name: "Buka quote preview" }).click();

  await expect(page).toHaveURL(/module=quotes.*quote=QTE-EX-3028/);
  await expect(page.getByRole("heading", { name: "Draft dari review yang sudah lengkap." })).toBeVisible();
  await expect(page.getByText("QTE-EX-3028", { exact: true })).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("empty, stale, and loading queue states explain their local boundary", async ({ page }) => {
  await page.goto(`${previewUrl}&queue=empty`);
  await expect(page.getByText("Action Queue contoh sedang kosong.")).toBeVisible();
  await expect(queueRows(page)).toHaveCount(0);

  await page.goto(`${previewUrl}&queue=stale`);
  await expect(page.getByText("Action Queue contoh perlu disegarkan.")).toBeVisible();
  await page.getByRole("button", { name: "Segarkan preview" }).click();
  await expect(page.locator("[data-action-queue]")).toHaveAttribute("data-queue-scenario", "populated");

  await page.goto(`${previewUrl}&queue=loading`);
  await expect(page.locator("[data-queue-loading]")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "Semua" })).toBeDisabled();
  await expect(queueRows(page)).toHaveCount(0);
});

test("Action Queue remains readable on supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(previewUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Action Queue at ${width}px`,
    ).toBe(true);
  }
});
