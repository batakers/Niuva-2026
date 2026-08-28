import { expect, test } from "@playwright/test";

test("AUiS styleguide exposes the Niuva Visual Proof", async ({ page }) => {
  await page.goto("/auis/styleguide");

  await expect(page).toHaveTitle("Foundation styleguide · Niuva");
  await expect(
    page.getByRole("heading", { name: "Visual foundation Niuva" }),
  ).toBeVisible();
  await expect(page.getByText("Status: UI Foundation disetujui — P0/P1 contracts approved")).toBeVisible();
  await expect(page.locator("[data-component-showcase='p0']")).toBeVisible();
  await expect(page.locator("[data-component-showcase='p1']")).toBeVisible();
  await expect(page.getByText("--brand-500")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satu identitas, tiga kebutuhan kerja" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gerak singkat untuk memberi feedback" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Status menjelaskan keadaan dan tindakan berikutnya" })).toBeVisible();
  await expect(page.locator("[data-proof-surface='public']")).toBeVisible();
  await expect(page.locator("[data-proof-surface='checkout']")).toBeVisible();
  await expect(page.locator("[data-proof-surface='admin']")).toBeVisible();
  await expect(page.locator("[data-proof-motion='standard']").getByRole("button", { name: "Hover atau fokus" })).toBeVisible();
  await expect(page.locator("[data-proof-state='error']")).toContainText("Pesanan belum dapat dilanjutkan");
  await expect(page.getByRole("heading", { name: "Primitif operasional" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MoneySummary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FileUploadField" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OrderStatusTimeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "VariantSelector" })).toBeVisible();
  await expect(page.locator("[data-contract-status='approved']")).toBeVisible();
  await expect(page.getByText("Propagation blocked")).toBeVisible();
  await expect(page.locator("[data-proof-surface='public']").getByRole("button", { name: "Diskusikan proyek" })).toBeVisible();
});
