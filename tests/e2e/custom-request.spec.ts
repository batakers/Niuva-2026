import { expect, test } from "@playwright/test";

test("custom request previews file progress and validates without API mutations", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/(uploads|custom-print)/.test(request.url())) {
      mutations.push(request.url());
    }
  });

  await page.goto("/custom-print/request");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Siapkan file untuk review operator.");
  const fileInput = page.getByLabel("File model 3D *");
  await expect(fileInput).toBeEnabled();
  await fileInput.setInputFiles({
    buffer: Buffer.from("solid preview"),
    mimeType: "application/octet-stream",
    name: "contoh-part.stl",
  });
  await expect(page.locator("[data-component='file-upload-field']")).toHaveAttribute("data-status", "accepted");
  await expect(page.getByRole("progressbar", { name: "Progress preview berkas" })).toHaveAttribute("value", "100");

  await page.getByLabel("Material").selectOption("PLA");
  await page.getByLabel("Jumlah").fill("2");
  await page.getByLabel("Unit atau skala").selectOption("MILLIMETER_CONFIRMED");
  await page.getByLabel("Nama").fill("Kontak contoh");
  await page.getByLabel("Email").fill("example@example.test");
  await page.getByLabel("Nomor WhatsApp").fill("+628000000000");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Uji request tanpa mengirim" }).click();

  await expect(page.getByText("Preview request siap ditinjau.")).toBeVisible();
  await expect(page.getByLabel("Nama")).toHaveValue("Kontak contoh");
  expect(mutations).toEqual([]);
});

test("custom request recovers from a simulated file failure", async ({ page }) => {
  await page.goto("/custom-print/request");
  const scenario = page.getByLabel("Hasil simulasi file");
  await scenario.selectOption("failed");
  await expect(scenario).toHaveValue("failed");
  const fileInput = page.getByLabel("File model 3D *");
  await expect(fileInput).toBeEnabled();
  await fileInput.setInputFiles({
    buffer: Buffer.from("solid preview"),
    mimeType: "application/octet-stream",
    name: "contoh-part.3mf",
  });
  await expect(page.locator("[data-component='file-upload-field']")).toHaveAttribute("data-status", "failed");
  await page.getByLabel("Hasil simulasi file").selectOption("accepted");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator("[data-component='file-upload-field']")).toHaveAttribute("data-status", "accepted");
  await expect(page.getByText("Berkas belum diunggah atau disimpan.", { exact: false }).first()).toBeVisible();
});

test("custom request stays readable across supported viewports", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/custom-print/request");
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `custom request at ${width}px`,
    ).toBe(true);
  }
});
