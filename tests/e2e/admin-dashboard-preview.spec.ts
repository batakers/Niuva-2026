import { expect, test } from "@playwright/test";

test("Admin dashboard preview stays usable at the approved viewport widths", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/auis/styleguide#admin-dashboard-preview");

    const preview = page.locator("[data-admin-dashboard-preview]");
    await expect(preview).toContainText("Preview · data sintetis");
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

    if (width < 768) {
      await preview.getByRole("button", { name: "Buka menu" }).click();
      await preview
        .getByRole("navigation", { name: "Navigasi mobile prototype Admin" })
        .getByRole("button", { name: "Action Queue" })
        .click();
      await expect(preview.getByRole("button", { name: "Buka menu" })).toBeVisible();
    } else {
      await preview
        .getByRole("navigation", { name: "Navigasi prototype Admin" })
        .getByRole("button", { name: "Action Queue" })
        .click();
    }

    await expect(preview.getByRole("heading", { level: 3, name: "Action Queue" })).toBeVisible();
  }

  expect(pageErrors).toEqual([]);
});

test("Admin dashboard preview exposes recovery and no-result states", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/auis/styleguide#admin-dashboard-preview");
  const preview = page.locator("[data-admin-dashboard-preview]");

  await expect(async () => {
    await preview.getByLabel("Kondisi demo").selectOption("ready");
    await preview.getByLabel("Kondisi demo").selectOption("error");
    await expect(preview).toHaveAttribute("data-demo-mode", "error", { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await expect(preview.getByRole("alert")).toContainText("belum dapat dimuat");
  await preview.getByRole("button", { name: "Coba lagi" }).click();

  await preview.getByRole("searchbox", { name: "Cari pekerjaan contoh" }).fill("tidak-ada-record-ini");
  await expect(preview.getByRole("status").filter({ hasText: "Tidak ada hasil yang cocok." })).toBeVisible();
  await preview.getByRole("button", { name: "Bersihkan filter" }).click();
  await expect(preview.getByRole("searchbox", { name: "Cari pekerjaan contoh" })).toHaveValue("");
});
