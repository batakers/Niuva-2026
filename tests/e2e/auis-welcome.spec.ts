import { expect, test } from "@playwright/test";

test("AUiS brand welcome exposes the confirmed Niuva intake", async ({ page }) => {
  await page.goto("/auis/welcome");

  await expect(page).toHaveTitle("Pengaturan brand · Niuva");
  await expect(
    page.getByRole("heading", { name: "Tinjau identitas brand Niuva" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nama produk")).toHaveValue("Niuva");
  await expect(page.getByText("configured: true")).toBeVisible();
});
