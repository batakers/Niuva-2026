import { expect, test, type Page } from "@playwright/test";

const queuePreviewUrl = "/auis/proofs/frontend/admin?preview=examples&state=ready";
const ordersPreviewUrl = `${queuePreviewUrl}&module=orders`;

function desktopRows(page: Page) {
  return page.locator("[data-orders-table] tbody tr");
}

test("Queue handoff opens the Orders preview with a stable selected reference", async ({ page }) => {
  const mutationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) mutationRequests.push(request.url());
  });

  await page.goto(queuePreviewUrl);
  await page.getByRole("button", { name: "Buka order preview" }).click();

  await expect(page).toHaveURL(/module=orders.*order=ORD-EX-4072/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order yang perlu dikelola.");
  await expect(page.getByText("Order preview dipilih: ORD-EX-4072")).toBeVisible();
  await expect(page.locator("[data-admin-shell] [aria-current=page]")).toContainText("Orders");
  expect(mutationRequests).toEqual([]);
});

test("Orders filters and selection remain local to the development fixture", async ({ page }) => {
  const mutationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("__nextjs")) mutationRequests.push(request.url());
  });

  await page.goto(ordersPreviewUrl);
  await expect(desktopRows(page)).toHaveCount(5);

  await page.getByRole("button", { name: "Custom print", exact: true }).click();
  await expect(desktopRows(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Hanya exception" }).click();
  await expect(desktopRows(page)).toHaveCount(1);
  await expect(page.getByText("ORD-EX-4351").first()).toBeVisible();

  await page.getByRole("button", { name: "Pilih ORD-EX-4351" }).first().click();
  await expect(page).toHaveURL(/module=orders.*order=ORD-EX-4351/);
  await expect(page.getByText("Order preview dipilih: ORD-EX-4351")).toBeVisible();
  expect(mutationRequests).toEqual([]);
});

test("Orders preview explains loading, empty, no-match, and recovery states", async ({ page }) => {
  await page.goto(`${ordersPreviewUrl}&orders=loading`);
  await expect(page.locator("[data-orders-loading]")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("searchbox", { name: "Cari nomor order" })).toBeDisabled();

  await page.goto(`${ordersPreviewUrl}&orders=empty`);
  await expect(page.getByText("Daftar order contoh sedang kosong")).toBeVisible();

  await page.goto(`${ordersPreviewUrl}&orders=error`);
  await expect(page.getByText("Daftar order preview belum dapat dimuat")).toBeVisible();
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.locator("[data-admin-orders]")).toHaveAttribute("data-orders-scenario", "populated");

  await page.goto(ordersPreviewUrl);
  await page.getByRole("searchbox", { name: "Cari nomor order" }).fill("tidak-ada");
  await expect(page.getByText("Filter tidak menemukan order")).toBeVisible();
  await page.getByRole("button", { name: "Tampilkan semua order" }).click();
  await expect(desktopRows(page)).toHaveCount(5);
});

test("Orders preview remains readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(ordersPreviewUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("[data-admin-orders]")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `Admin orders at ${width}px`,
    ).toBe(true);
  }
});
