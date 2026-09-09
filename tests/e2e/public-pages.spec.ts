import { expect, test } from "@playwright/test";

test("public navigation supports mobile menu, escape, skip link and real routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
  const toggle = page.getByRole("button", { name: "Buka menu" });
  await toggle.click();
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(nav.getByRole("link", { name: "Layanan", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await nav.getByRole("link", { name: "Layanan", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dukungan yang mengikuti tahap proyek Anda.");
  await expect(page.locator("section[id]")).toHaveCount(4);
  await page.getByRole("link", { name: "Diskusikan kebutuhan", exact: true }).click();
  await expect(page).toHaveURL(/\/project-brief$/);
});

test("project examples filter and navigate, with empty, retry and missing-slug recovery", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByText("Cerita di balik proyek sedang disiapkan.")).toBeVisible();
  await page.getByRole("link", { name: "Contoh", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByLabel("Layanan", { exact: true }).selectOption("Desain dan prototyping");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByLabel("Cari project").fill("tidak ada");
  await expect(page.getByText("Tidak ada project yang cocok.")).toBeVisible();
  await page.getByRole("button", { name: "Hapus filter" }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByRole("link", { name: /Dari sketsa ke enclosure/ }).click();
  await expect(page.getByRole("heading", { name: "Konteks dan tantangan" })).toBeVisible();
  await page.goto("/projects/slug-tidak-ada?preview=examples");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cerita ini belum dapat ditampilkan.");
  await page.getByRole("link", { name: "Kembali ke Projects" }).click();
  await page.getByRole("link", { name: "Gagal", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Daftar project belum dapat dimuat.");
  await page.getByRole("link", { name: "Coba lagi" }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByRole("link", { name: "Memuat", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Memuat daftar project");
});

test("curated project preview keeps real content and proof media development-only", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/projects?preview=curated");
  await expect(page.getByText("17 project terkurasi")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enam cerita utama untuk ditinjau." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dokumentasi lain yang menunjukkan keluasan karya." })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(17);
  await expect(page.locator('img[src*="/api/frontend-preview/media/"]')).toHaveCount(6);

  await page.getByLabel("Layanan", { exact: true }).selectOption("Apparel & Merchandise");
  await expect(page.getByRole("article")).toHaveCount(3);
  await page.getByLabel("Cari project").fill("Bagit");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByLabel("Layanan", { exact: true }).selectOption("");
  await page.getByLabel("Cari project").fill("");

  await page.getByRole("link", { name: /Smart Drop Box/ }).click();
  await expect(page).toHaveURL(/smart-drop-box-pg\?preview=curated$/);
  await expect(page.getByRole("heading", { name: "Konteks dan tantangan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proses dan keputusan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Output yang terdokumentasi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Batas bukti" })).toBeVisible();

  await page.goto("/projects/bagit-arei-smart-bag-v2?preview=curated");
  await expect(page.getByRole("heading", { name: "Konteks dan tantangan" })).toHaveCount(0);
  await expect(page.getByText("Challenge dan process rinci sengaja tidak ditampilkan")).toBeVisible();

  const proof = await request.get("/api/frontend-preview/media/cs-01");
  expect(proof.status()).toBe(200);
  expect(proof.headers()["content-type"]).toBe("image/png");
  expect((await proof.body()).byteLength).toBeGreaterThan(100_000);
  expect((await request.get("/api/frontend-preview/media/unknown")).status()).toBe(404);
  expect((await request.get("/api/frontend-preview/media/..%2F..%2F.env")).status()).toBe(404);
  expect(errors).toEqual([]);
});

test("brief preview validates, recovers and never posts an inquiry", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/")) mutations.push(request.url()); });
  await page.goto("/project-brief");
  await page.getByRole("button", { name: "Uji brief (simulasi)" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Periksa kembali brief Anda." })).toBeVisible();
  for (const [name,value] of Object.entries({ name: "Kontak contoh", email: "example@example.test", phone: "+628000000000", projectGoal: "Meninjau prototype", description: "Skenario pengujian frontend.", targetQuantity: "1 prototype", targetDeadline: "2026-10-01", referenceLink: "https://example.test/reference" })) await page.getByRole("form", { name: "Form project brief" }).locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="currentStage"]').selectOption("CAD");
  await page.getByRole("checkbox").check();
  await page.getByLabel("Hasil simulasi").selectOption("error");
  await page.getByRole("button", { name: "Uji brief (simulasi)" }).click();
  await expect(page.getByText("Simulasi pengiriman gagal.")).toBeVisible();
  await page.getByLabel("Hasil simulasi").selectOption("success");
  await page.getByRole("button", { name: "Uji brief (simulasi)" }).click();
  await expect(page.getByText("Simulasi brief berhasil.")).toBeVisible();
  await expect(page.locator('[name="projectGoal"]')).toHaveValue("Meninjau prototype");
  expect(mutations).toEqual([]);
});

test("public pages keep one main heading and no horizontal overflow across viewports", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services", "/projects?preview=examples", "/projects/contoh-enclosure?preview=examples", "/project-brief"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${width}px`).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
