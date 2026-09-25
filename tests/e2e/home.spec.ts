import { expect, test } from "@playwright/test";

test("public homepage exposes the Niuva narrative and entry paths", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Niuva");
  await expect(page.getByRole("heading", { level: 1, name: "Mitra pengembangan produk dari riset hingga prototipe." })).toBeVisible();
  await expect(page.locator("[data-home-section='entry-paths']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kompetensi yang menghubungkan ide dengan bentuk." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satu alur kerja untuk keputusan yang lebih jelas." })).toBeVisible();
  await expect(page.locator("[data-home-section='next-step']")).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Diskusikan Proyek" })).toHaveAttribute(
    "href",
    "/project-brief",
  );
  await expect(page.locator("[data-homepage] .font-mono")).toHaveCount(0);
  await expect(page.locator("[data-homepage] .font-technical")).toHaveCount(0);
  await expect(page.locator("[data-homepage] .uppercase")).toHaveCount(0);

  await page.getByRole("link", { name: "Lihat cara kerja" }).click();
  await expect(page).toHaveURL(/#process$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Mitra pengembangan produk dari riset hingga prototipe." })).toBeVisible();
  await page.getByRole("button", { name: "Buka menu" }).click();
  const navigation = page.locator("#public-navigation");
  await expect(navigation.getByRole("link", { name: "Layanan", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Cart", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Akun", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Diskusikan Proyek", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Pilih jalur", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Cara kerja", exact: true })).toHaveCount(0);
});

test("authorized Foundation proof records scoped owner visual acceptance", async ({ page }) => {
  await page.goto("/");

  const homepage = page.locator("[data-homepage]");
  await expect(homepage).toHaveAttribute("data-foundation-propagation", "approved");
  await expect(homepage).toHaveAttribute("data-foundation-scope", "homepage");
  await expect(homepage).toHaveAttribute("data-product-screen-proof-status", "approved-owner");
  await expect(homepage).toHaveAttribute("data-typography-version", "1.0");
  const homepageFont = await homepage.evaluate(
    (element) => window.getComputedStyle(element).fontFamily,
  );
  expect(homepageFont).toContain("Space Grotesk");

  await page.goto("/project-brief");

  const projectBrief = page.locator("[data-project-brief]");
  await expect(projectBrief).toHaveAttribute("data-foundation-propagation", "approved");
  await expect(projectBrief).toHaveAttribute("data-foundation-scope", "project-brief");
  await expect(projectBrief).toHaveAttribute("data-product-screen-functional", "server-backed");
  await expect(projectBrief).toHaveAttribute("data-product-screen-proof-status", "approved-owner");
  await expect(page.getByRole("heading", { level: 1, name: "Buat langkah awal proyek jadi jelas." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kirim project brief" })).toBeVisible();
  await expect(page.locator("[data-project-brief-form]")).toBeVisible();

  const projectBriefFont = await projectBrief.evaluate(
    (element) => window.getComputedStyle(element).fontFamily,
  );
  expect(projectBriefFont).toContain("Space Grotesk");
  await expect(projectBrief.locator("[data-font-family='fraunces']")).toHaveCSS(
    "font-family",
    /Fraunces/,
  );
  await expect(page.getByLabel(/Perusahaan atau tim/)).not.toHaveAttribute("required");
  await expect(page.getByLabel(/Nomor WhatsApp/)).toHaveAttribute("required");
  await expect(page.getByLabel(/Target waktu/)).toHaveAttribute("required");
  await expect(page.locator("[data-motion-system]")).toHaveCount(0);
  await expect(page.locator("[data-pattern-showcase]")).toHaveCount(0);
});
