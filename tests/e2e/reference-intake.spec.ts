import { expect, test } from "@playwright/test";

test("DEVELOP service selection stays editable and ignores unknown slugs", async ({ page }) => {
  await page.goto("/services");
  const serviceLink = page.locator('a[href="/project-brief?service=research-development"]').first();
  await expect(serviceLink).toBeVisible();
  await serviceLink.click();
  const selectedService = page.getByLabel("Dukungan yang dicari (opsional)");
  await expect(selectedService).toHaveValue("research-development");
  await selectedService.selectOption("design-prototyping");
  await expect(selectedService).toHaveValue("design-prototyping");
  await page.goto("/project-brief?service=unknown-service");
  await expect(page.getByLabel("Dukungan yang dicari (opsional)")).toHaveValue("");
  await expect(page.getByLabel("Target waktu (jika sudah tahu)")).not.toHaveAttribute("required");
});

test("MAKE reference intake works without private storage when database is available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/custom-print/request?mode=reference");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mulai dari referensi, lanjutkan sampai model siap.");
  await expect(page.getByRole("link", { name: "Saya baru punya referensi" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Lampiran privat belum aktif")).toBeVisible();
  await expect(page.getByLabel("Foto atau sketsa (opsional)")).toHaveCount(0);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

  const status = await page.locator("[data-product-screen-functional]").getAttribute("data-product-screen-functional");
  if (status !== "server-backed") {
    await expect(page.getByRole("button", { name: "Ajukan referensi untuk review" })).toBeDisabled();
    return;
  }

  await page.getByRole("button", { name: "Ajukan referensi untuk review" }).click();
  await expect(page.getByText("Periksa field yang ditandai sebelum mengirim.")).toBeVisible();
  await page.getByLabel("Apa yang ingin dibuat?").fill("Casing kecil untuk alat lab dari sketsa awal.");
  await page.getByLabel("Perkiraan jumlah").fill("2");
  await page.getByLabel("Material awal").selectOption("NEEDS_RECOMMENDATION");
  await page.locator('input[name="customerName"]').fill("Pelanggan Referensi");
  await page.locator('input[name="customerEmail"]').fill("reference@example.test");
  await page.getByLabel("Nomor WhatsApp").fill("+628000000000");
  await page.locator('input[name="rightsAck"]').check();
  await page.getByRole("button", { name: "Ajukan referensi untuk review" }).click();
  await expect(page.getByText("Referensi masuk ke Niuva")).toBeVisible();
  const statusLink = page.getByRole("link", { name: "Lihat status privat dan tambah model nanti" });
  const href = await statusLink.getAttribute("href");
  expect(href).toMatch(/^\/custom-print\/requests\/.+/);
  const response = await page.goto(href!);
  expect(response?.status()).toBe(200);
  const cacheControl = response?.headers()["cache-control"] ?? "";
  // Next's development server forces no-cache; production uses the private no-store route rule.
  expect(cacheControl).toMatch(/(?:no-store|no-cache)/);
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Belum ada file model 3D/CAD")).toBeVisible();
  await expect(page.getByText("Belum tersedia", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("reference@example.test")).toHaveCount(0);

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `status at ${width}px`).toBe(true);
  }
  await page.goto("/custom-print/request?mode=reference");
  const modeLink = page.getByRole("link", { name: "Saya baru punya referensi" });
  await modeLink.focus();
  await expect(modeLink).toBeFocused();
  const description = page.getByLabel("Apa yang ingin dibuat?");
  await description.focus();
  await expect(description).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Perkiraan jumlah")).toBeFocused();
});
