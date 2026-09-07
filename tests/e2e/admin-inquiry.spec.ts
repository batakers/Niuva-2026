import { expect, test } from "@playwright/test";

const previewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready";

test("inquiry drawer keeps the Queue context and displays only its safe preview projection", async ({ page }) => {
  await page.goto(previewUrl);

  const trigger = page.getByRole("button", { name: "Buka brief preview" });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Detail project brief" })).toBeVisible();
  await expect(dialog.getByText("BRF-EX-1049")).toBeVisible();
  await expect(dialog.getByText("Tidak dicantumkan")).toBeVisible();
  await expect(dialog.getByText("Disembunyikan di preview")).toBeVisible();
  await expect(dialog.getByText("Tidak tersedia di preview", { exact: true })).toBeVisible();
  await expect(page.locator("#queue-list-heading")).toBeVisible();
});

test("inquiry status and follow-up stay local, then close returns focus to Queue", async ({ page }) => {
  const mutationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") mutationRequests.push(request.url());
  });

  await page.goto(previewUrl);
  const trigger = page.getByRole("button", { name: "Buka brief preview" });
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Tandai sudah dihubungi" }).click();
  await expect(dialog.getByText("Sudah dihubungi", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Status preview berubah dari NEW ke CONTACTED. Tidak ada audit atau mutasi server dibuat.")).toBeVisible();
  await dialog.getByRole("button", { name: "Siapkan follow-up preview" }).click();
  await expect(dialog.getByText("Follow-up preview siap ditinjau")).toBeVisible();
  await expect(dialog.getByText("Tidak ada email, WhatsApp, API, atau data pelanggan yang dikirim atau disimpan.")).toBeVisible();

  await dialog.getByRole("button", { name: "Tutup detail" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(mutationRequests).toEqual([]);
});

test("inquiry drawer remains within the supported responsive widths", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(previewUrl);
    await page.getByRole("button", { name: "Buka brief preview" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin inquiry detail at ${width}px`,
    ).toBe(true);
  }
});
