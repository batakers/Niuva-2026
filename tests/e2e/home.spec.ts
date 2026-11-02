import { expect, test } from "@playwright/test";

test("public homepage exposes the Niuva narrative and entry paths", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Niuva");
  await expect(page.getByRole("heading", { level: 1, name: "Mitra pengembangan produk dari riset hingga prototipe." })).toBeVisible();
  await expect(page.locator("[data-home-section='entry-paths']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Empat layanan untuk setiap tahap proyek." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dari ide menjadi produk nyata." })).toBeVisible();
  await expect(page.locator("[data-home-section='next-step']")).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Hubungi Kami" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/6281321407815\?text=/,
  );
  await expect(page.locator("[data-homepage] .font-mono")).toHaveCount(0);
  await expect(page.locator("[data-homepage] .font-technical")).toHaveCount(0);
  await expect(page.locator("[data-homepage] .uppercase")).toHaveCount(0);

  await expect(page.locator("[data-home-section='project-proof']")).toBeVisible();
  const sectionOrder = await page.locator("main > [data-home-section]").evaluateAll((sections) =>
    sections.map((section) => section.getAttribute("data-home-section")),
  );
  expect(sectionOrder).toEqual(["hero", "entry-paths", "starting-points", "process", "capabilities", "project-proof", "next-step"]);
  await expect(page.locator("[data-home-section='hero'] a[href^='/projects/']")).toHaveCount(0);
  await page.getByRole("link", { name: "Lihat semua proyek" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.goto("/");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Mitra pengembangan produk dari riset hingga prototipe." })).toBeVisible();
  await page.getByRole("button", { name: "Buka menu" }).click();
  const navigation = page.locator("#public-navigation");
  await expect(navigation.getByRole("link", { name: "Layanan", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Keranjang", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Akun", exact: true })).toBeVisible();
  // The B2B action stays in the mobile header next to the menu instead of inside it.
  await expect(page.locator("header").getByRole("link", { name: "Hubungi Kami", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Pilih jalur", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Cara kerja", exact: true })).toHaveCount(0);
});

test("Foundation proof marks Home as Owner-accepted and keeps the services destination pending visual review", async ({ page }) => {
  await page.goto("/");
  const homepage = page.locator("[data-homepage]");
  await expect(homepage).toHaveAttribute("data-foundation-propagation", "approved");
  await expect(homepage).toHaveAttribute("data-foundation-scope", "homepage");
  await expect(homepage).toHaveAttribute("data-product-screen-proof-status", "approved-owner");
  await expect(homepage).toHaveAttribute("data-typography-version", "2.0");
  await expect(homepage).toHaveCSS("font-family", /Manrope/);
  await page.goto("/project-brief");
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator("[data-foundation-scope='services']")).toHaveAttribute("data-product-screen-proof-status", "pending-owner-review");
  await expect(page.getByRole("form", { name: "Form project brief" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Hubungi Kami" }).first()).toBeVisible();
});
