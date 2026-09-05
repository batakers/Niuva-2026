import { expect, test } from "@playwright/test";

test("wireframe board exposes all twenty scoped surfaces", async ({ page }) => {
  await page.goto("/auis/wireframes");

  const board = page.locator("[data-wireframe-board]");
  await expect(page.getByRole("heading", { level: 1, name: "Niuva MVP Wireframe Board" })).toBeVisible();
  await expect(board).toHaveAttribute("data-wireframe-status", "approved-mvp-architecture");
  await expect(board).toHaveAttribute("data-wireframe-approved-at", "2026-09-03");
  await expect(board).toHaveAttribute("data-wireframe-count", "20");
  await expect(board).toHaveAttribute("data-wireframe-grayscale", "true");
  await expect(board.locator("[data-wireframe-screen]")).toHaveCount(20);

  await expect(board.locator("[data-wireframe-screen='admin-sign-in']")).toContainText("MVP");
  await expect(board.locator("[data-wireframe-screen='customer-account']")).toContainText("Deferred");
  await expect(board).toContainText("Guest checkout");
  await expect(board).toContainText("Admin Sign-in");
  await expect(board).toContainText("Custom Print Request");
  await expect(board.locator("[data-wireframe-screen='project-brief']")).toContainText("WhatsApp");
  await expect(board.locator("[data-wireframe-screen='checkout']")).toContainText("Biteship");
  await expect(board.locator("[data-wireframe-screen='admin-custom-print']")).toContainText("private");

  await expect(page.locator("[data-foundation-propagation]")).toHaveCount(0);
  await expect(page.locator("[data-product-screen-proof-status]")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(board.locator("[data-wireframe-screen]")).toHaveCount(20);
  await expect(page.getByRole("heading", { level: 2, name: "20 annotated surfaces" })).toBeVisible();
});
