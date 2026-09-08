import { expect, test, type Page } from "@playwright/test";

const editorPreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=portfolio&view=editor&project=PORTFOLIO-EX-MODULAR";

function observeApplicationMutations(page: Page) {
  const mutationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) mutationRequests.push(request.url());
  });
  return mutationRequests;
}

test("portfolio selection opens the isolated editor and publication stays blocked until every fixture permission is confirmed", async ({ page }) => {
  const mutationRequests = observeApplicationMutations(page);
  await page.goto("/auis/proofs/frontend/admin?preview=examples&state=ready&module=portfolio");
  await page.getByRole("button", { name: "Buka editor preview" }).click();
  await expect(page).toHaveURL(/module=portfolio.*view=editor.*PORTFOLIO-EX-MODULAR/);
  await expect(page.getByRole("heading", { name: "Bukti portofolio sebelum publikasi." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Uji intent publikasi" })).toBeDisabled();
  await page.getByRole("switch", { name: "Izin penggunaan nama client telah diverifikasi" }).click();
  await page.getByRole("switch", { name: "Izin penggunaan logo client telah diverifikasi" }).click();
  await page.getByRole("switch", { name: "Bukti hasil faktual telah diverifikasi" }).click();
  await expect(page.getByRole("button", { name: "Uji intent publikasi" })).toBeEnabled();
  await page.getByRole("button", { name: "Uji intent publikasi" }).click();
  await expect(page.getByText("Intent publikasi preview dicatat lokal")).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("portfolio editor validates local narrative/media data and recovers its preview states", async ({ page }) => {
  await page.goto(editorPreviewUrl);
  await page.getByLabel("Judul").fill("x");
  await page.getByRole("button", { name: "Simpan draft preview" }).click();
  await expect(page.getByText("Judul minimal tiga karakter.")).toBeVisible();
  await page.getByLabel("Alt text contoh").first().fill("x");
  await page.getByRole("button", { name: "Simpan draft preview" }).click();
  await expect(page.getByText("Setiap media fixture memerlukan alt text minimal delapan karakter.")).toBeVisible();

  await page.goto(`${editorPreviewUrl}&portfolioEditor=loading`);
  await expect(page.locator("[data-admin-portfolio-editor-loading]")).toHaveAttribute("aria-busy", "true");
  await page.goto(`${editorPreviewUrl}&portfolioEditor=empty`);
  await expect(page.getByText("Tidak ada portofolio contoh untuk diedit")).toBeVisible();
  await page.goto(`${editorPreviewUrl}&portfolioEditor=error`);
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("heading", { name: "Narasi project" })).toBeVisible();
});

test("portfolio editor has no horizontal overflow across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(editorPreviewUrl);
    await expect(page.getByRole("heading", { name: "Bukti portofolio sebelum publikasi." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Portfolio editor at ${width}px`).toBe(true);
  }
});
