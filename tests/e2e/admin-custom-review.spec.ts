import { expect, test, type Page } from "@playwright/test";

const customReviewPreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=custom-print";

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) {
      mutationRequests.push(request.url());
    }
  });

  return mutationRequests;
}

test("Custom review list selects a safe fixture and keeps private file access unavailable", async ({ page }) => {
  await page.goto(customReviewPreviewUrl);

  await page.getByLabel("Cari referensi custom print").fill("CPR-EX-2093");
  await expect(page.getByRole("button", { name: "Tinjau request" })).toHaveCount(1);
  await page.getByRole("button", { name: "Tinjau request" }).click();

  await expect(page).toHaveURL(/request=CPR-EX-2093/);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Review custom print" })).toBeVisible();
  await expect(dialog.getByText("File privat tidak tersedia di preview")).toBeVisible();
  await expect(dialog.locator("[data-private-file-access=unavailable] a")).toHaveCount(0);
});

test("Action Queue hands a custom-review fixture to the isolated review preview", async ({ page }) => {
  await page.goto("/auis/proofs/frontend/admin?preview=examples&state=ready");
  await page.getByRole("button", { name: "Tinjau custom preview" }).click();

  await expect(page).toHaveURL(/module=custom-print.*request=CPR-EX-2093/);
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Review custom print" })).toBeVisible();
});

test("Custom review requires verified slicer inputs before its local-only handoff", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto(`${customReviewPreviewUrl}&request=CPR-EX-2093`);

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Simpan review preview" }).click();
  await expect(dialog.getByText("Input review belum valid")).toBeVisible();

  await dialog.getByLabel(/Kode material/).fill("PLA-NATURAL");
  await dialog.getByLabel(/Berat slicer \(g\)/).fill("42.125");
  await dialog.getByLabel(/Durasi cetak \(detik\)/).fill("10800");
  await dialog.getByLabel("Konfigurasi slicer").fill("Layer 0.2 mm, infill disimpan pada preview.");
  await dialog.getByRole("button", { name: "Simpan review preview" }).click();

  await expect(dialog.getByText("Review preview siap untuk handoff draft quote")).toBeVisible();
  await expect(dialog.getByText("Siap untuk draft quote", { exact: true }).first()).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("Custom review exposes error recovery without reading a production request", async ({ page }) => {
  await page.goto(`${customReviewPreviewUrl}&custom=error`);

  await expect(page.getByText("Daftar review preview belum dapat dimuat")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("heading", { name: "Daftar review custom print" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "CPR-EX-2093" })).toBeVisible();
});

test("Custom review drawer remains readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${customReviewPreviewUrl}&request=CPR-EX-2093`);
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin custom review at ${width}px`,
    ).toBe(true);
  }
});
