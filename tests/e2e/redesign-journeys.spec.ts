import { expect, test } from "@playwright/test";
import { loginCustomer } from "./helpers/customer";

test("public navigation keeps the four paths, separate utilities, and contextual actions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(navigation.locator('[data-navigation-group="primary"] a')).toHaveText([
    "Layanan", "Projects", "Custom Print", "Shop",
  ]);
  await expect(navigation.locator('[data-navigation-group="utility"] a')).toHaveText(["Cart", "Akun"]);
  await expect(page.locator("header").getByRole("link", { name: "Diskusikan Proyek" })).toHaveAttribute("href", "/project-brief");

  for (const [route, label, href] of [
    ["/services/design-prototyping", "Buat Project Brief", "/project-brief?service=design-prototyping"],
    ["/custom-print", "Pilih titik mulai", "#start-custom"],
    ["/shop?preview=examples", "Lihat Produk", "#catalog"],
    ["/shop/contoh-dock-modular-meja?preview=examples", "Pilih Varian", "#purchase-options"],
  ]) {
    await page.goto(route);
    await expect(page.locator("header").getByRole("link", { name: label })).toHaveAttribute("href", href);
  }

  await page.goto("/cart?preview=examples");
  await expect(page.locator("header").getByRole("link", { name: "Diskusikan Proyek" })).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Buka menu" });
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(navigation.getByRole("link", { name: "Custom Print" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("Home primary action stays above the fold and DEVELOP paths keep service context", async ({ page }) => {
  await loginCustomer(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [[390, 844], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const action = page.getByRole("main").getByRole("link", { name: "Diskusikan Proyek" }).first();
    const bounds = await action.boundingBox();
    expect(bounds, `Home CTA at ${width}px`).not.toBeNull();
    expect((bounds?.y ?? height) + (bounds?.height ?? 0), `Home CTA at ${width}px`).toBeLessThanOrEqual(height);
  }

  await page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Layanan" }).click();
  await page.getByRole("link", { name: "Lihat detail layanan" }).nth(2).click();
  await expect(page).toHaveURL(/\/services\/design-prototyping$/);
  await page.getByRole("link", { name: "Diskusikan layanan ini" }).click();
  await expect(page.locator('[name="preferredService"]')).toHaveValue("design-prototyping");

  await page.goto("/");
  await page.locator("#project-proof article a").first().click();
  const serviceHref = await page.getByRole("link", { name: "Lihat layanan terkait" }).getAttribute("href");
  expect(serviceHref).toMatch(/^\/services\//);
  const briefHref = await page.getByRole("link", { name: "Buat project brief" }).getAttribute("href");
  expect(briefHref).toMatch(/^\/project-brief\?service=/);
  await page.getByRole("link", { name: "Buat project brief" }).click();
  await expect(page.locator('[name="preferredService"]')).not.toHaveValue("");
});

test("MAKE offers the available intake and BUY continues from catalog to cart", async ({ page }) => {
  await loginCustomer(page);
  await page.goto("/custom-print");
  const sections = await page.locator("main > section").evaluateAll((elements) => elements.map((element) => element.id));
  expect(sections.indexOf("start-custom")).toBeLessThan(sections.indexOf("workflow"));
  await expect(page.getByText("Estimasi awal, bukan harga final.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Ajukan referensi untuk review" }).click();
  await expect(page).toHaveURL(/\/custom-print\/request\?mode=reference$/);

  await page.goto("/shop?preview=examples");
  await page.getByRole("link", { name: /Dock modular meja/ }).click();
  await page.getByRole("radio", { name: /Abu-abu/ }).click();
  await page.getByRole("button", { name: "Tambah ke cart" }).click();
  await page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Cart" }).click();
  await expect(page.getByRole("heading", { name: "Dock modular meja" })).toBeVisible();
});
