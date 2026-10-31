import { expect, test } from "@playwright/test";
import { loginCustomer } from "./helpers/customer";
import { gotoRenderedPage } from "./helpers/readiness";

test.beforeEach(async ({ page }) => {
  await loginCustomer(page);
});

test("public navigation supports mobile menu, escape, skip link and real routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
  const toggle = page.getByRole("button", { name: "Buka menu" });
  await toggle.click();
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(nav.getByRole("link", { name: "Layanan", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Brief Proyek", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await nav.getByRole("link", { name: "Layanan", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dukungan yang mengikuti tahap proyek Anda.");
  await expect(page.locator("section[id]")).toHaveCount(4);
  await expect(page.getByRole("main").getByRole("link", { name: "Hubungi Kami" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\//);
});

test("public navigation exposes active cues on exact, dynamic, and mobile routes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  const routeCases = [
    { label: "Layanan", path: "/services" },
    { label: "Proyek", path: "/projects/smart-drop-box-pg" },
    { label: "Toko", path: "/shop/contoh-dock-modular-meja?preview=examples" },
    { label: "Custom 3D Print", path: "/custom-print/request" },
    { label: "Keranjang", path: "/cart?preview=examples" },
  ] as const;

  for (const routeCase of routeCases) {
    await page.goto(routeCase.path);
    const nav = page.getByRole("navigation", { name: "Navigasi utama" });
    const active = nav.locator('a[aria-current="page"]');
    await expect(active, routeCase.path).toHaveCount(1);
    await expect(active, routeCase.path).toHaveText(routeCase.label);
    await expect.poll(
      () => active.evaluate((element) => getComputedStyle(element, "::after").height),
      { message: `active cue height for ${routeCase.path}` },
    ).toBe("2px");
    await expect.poll(
      () => active.evaluate((element) => getComputedStyle(element, "::after").opacity),
      { message: `active cue opacity for ${routeCase.path}` },
    ).toBe("1");
  }

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Navigasi utama" }).locator('a[aria-current="page"]')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop/contoh-dock-modular-meja?preview=examples");
  const toggle = page.getByRole("button", { name: "Buka menu" });
  await toggle.click();
  const mobileActive = page
    .getByRole("navigation", { name: "Navigasi utama" })
    .locator('a[aria-current="page"]');
  await expect(mobileActive).toHaveText("Toko");
  await expect(mobileActive).toBeVisible();
  await expect(mobileActive).toHaveCSS("min-height", "44px");
  expect(await mobileActive.evaluate((element) => getComputedStyle(element, "::after").height)).toBe("2px");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("published projects filter and navigate, while local examples retain their preview recovery states", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("status")).toContainText("17 project");
  await expect(page.locator("article")).toHaveCount(17);
  await page.getByLabel("Layanan", { exact: true }).selectOption("Riset & Pengembangan");
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByLabel("Cari project").fill("tidak ada");
  await expect(page.getByText("Tidak ada project yang cocok.")).toBeVisible();
  await page.getByRole("button", { name: "Hapus filter" }).click();
  await expect(page.locator("article")).toHaveCount(17);
  await page.getByRole("link", { name: /Smart Drop Box/ }).click();
  await expect(page.getByRole("heading", { name: "Konteks dan tantangan" })).toBeVisible();
  await page.goto("/projects/slug-tidak-ada");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cerita ini belum dapat ditampilkan.");
  await page.getByRole("link", { name: "Kembali ke Projects" }).click();
  if (process.env.NIUVA_E2E_PREVIEW_DISABLED === "true") return;
  await page.getByRole("link", { name: "Contoh sintetis", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByLabel("Layanan", { exact: true }).selectOption("Desain dan prototyping");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("link", { name: "Gagal", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Daftar project belum dapat dimuat.");
  await page.getByRole("link", { name: "Coba lagi" }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await page.getByRole("link", { name: "Memuat", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Memuat daftar project");
});

test("published project reference keeps evidence boundaries and proof media available for development checks", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/projects");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
  await expect(page.getByText("17 project")).toBeVisible();
  // One gallery: every project shows its approved cover; only story-ready ones link to a detail page.
  await expect(page.getByRole("heading", { name: "Semua proyek." })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(17);
  await expect(page.locator("article img")).toHaveCount(17);
  await expect(page.locator("article a[href^='/projects/']")).toHaveCount(17);

  await page.getByLabel("Layanan", { exact: true }).selectOption("Desain & Rekayasa");
  await expect(page.getByRole("article")).toHaveCount(11);
  await page.getByLabel("Cari project").fill("Bagit");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByLabel("Layanan", { exact: true }).selectOption("");
  await page.getByLabel("Cari project").fill("");

  await page.getByRole("link", { name: /Smart Drop Box/ }).click();
  await expect(page).toHaveURL(/smart-drop-box-pg$/);
  await expect(page.getByRole("heading", { name: "Konteks dan tantangan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proses dan keputusan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Output yang terdokumentasi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Batas bukti" })).toBeVisible();

  await page.goto("/projects/bagit-arei-smart-bag-v2");
  await expect(page.getByRole("heading", { name: "Konteks dan tantangan" })).toHaveCount(0);
  await expect(page.getByText("Challenge dan process rinci sengaja tidak ditampilkan")).toBeVisible();

  if (process.env.NIUVA_E2E_PREVIEW_DISABLED === "true") {
    expect(errors).toEqual([]);
    return;
  }
  const proof = await request.get("/api/frontend-preview/media/cs-01");
  expect(proof.status()).toBe(200);
  expect(proof.headers()["content-type"]).toBe("image/png");
  expect((await proof.body()).byteLength).toBeGreaterThan(100_000);
  expect((await request.get("/api/frontend-preview/media/unknown")).status()).toBe(404);
  expect((await request.get("/api/frontend-preview/media/..%2F..%2F.env")).status()).toBe(404);
  expect(errors).toEqual([]);
});

test("public company and service routes render approved content", async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/");
  const homepageShell = page.locator("[data-homepage]");
  await expect(homepageShell).toHaveAttribute("data-foundation-propagation", "approved");
  await expect(homepageShell).toHaveAttribute("data-typography-propagation", "approved");
  await expect(homepageShell).toHaveAttribute("data-typography-version", "2.0");
  await expect(homepageShell).toHaveCSS("font-family", /Manrope/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
  // The hero repeats the headline in an aria-hidden copy whose last word cycles; assert what assistive tech reads.
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Mitra pengembangan produk dari riset hingga prototipe.",
  );
  const main = page.getByRole("main");
  await expect(main.getByText("Melalui riset, konsultasi, desain, dan prototyping")).toBeVisible();
  // Foundation v2 keeps the contact details on every public page in the footer's "Bantuan" column.
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("niuvamakerspace@gmail.com")).toBeVisible();
  await expect(footer.getByText("+62 851-1767-8901")).toBeVisible();
  await expect(footer.getByText(/Bandung Techno Park/)).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "Lihat layanan", exact: true }).first().click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.locator("section[id]")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Riset & Pengembangan" })).toBeVisible();
  await expect(page.getByText("Mengembangkan solusi melalui riset, eksplorasi teknologi")).toBeVisible();
  await expect(page.getByText("Arah pembahasan")).toHaveCount(4);
  await page.getByRole("link", { name: "Lihat proyek" }).click();
  await expect(page).toHaveURL(/\/projects$/);

  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  }

  expect(errors).toEqual([]);
});

test("four service details offer contextual WhatsApp and only approved project details", async ({ page, request }) => {
  const slugs = ["riset-pengembangan", "desain-rekayasa", "prototipe-manufaktur-digital", "konsultansi-workshop"];
  for (const slug of slugs) {
    const response = await request.get(`/services/${slug}`);
    expect(response.status(), slug).toBe(200);
  }
  expect((await request.get("/services/layanan-tidak-ada")).status()).toBe(404);
  // Service URLs from before the Owner's 31 Oct 2026 change redirect permanently to their successor.
  const legacy = await request.get("/services/design-prototyping", { maxRedirects: 0 });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toMatch(/\/services\/desain-rekayasa$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services/desain-rekayasa");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Desain & Rekayasa");
  // Related projects are whole-card links named by the project title.
  await expect(page.getByRole("main").getByRole("link", { name: /Smart Drop Box/ })).toBeVisible();
  await expect(page.locator('a[href="/projects/smart-drop-box-pg"]')).toHaveCount(1);
  await expect(page.locator('a[href="/projects/elips-tandem-bike"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const cta = page.getByRole("main").getByRole("link", { name: "Hubungi Kami" }).first();
  await expect(cta).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  expect(new URL((await cta.getAttribute("href"))!).searchParams.get("text")).toContain("Desain & Rekayasa");
  await cta.focus();
  await expect(cta).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("form", { name: "Form project brief" })).toHaveCount(0);
});

test("Foundation/Typography authorization is present on product PublicShell routes", async ({ page }) => {
  test.slow();
  const paths = [
    "/",
    "/services",
    "/projects",
    "/shop?preview=examples",
    "/shop/contoh-dock-modular-meja?preview=examples",
    "/cart?preview=examples",
    "/checkout?preview=examples&state=ready",
    "/custom-print",
    "/custom-print/request",
    ...(process.env.NIUVA_E2E_PREVIEW_DISABLED === "true" ? [] : [
      "/quote/preview-quote?preview=examples",
      "/orders/preview-order?preview=examples",
    ]),
  ];

  for (const path of paths) {
    await page.goto(path);
    const shell = page.locator("[data-foundation-propagation='approved']").first();
    await expect(shell, path).toHaveAttribute("data-typography-propagation", "approved");
    await expect(shell, path).toHaveAttribute("data-typography-version", "2.0");
    await expect(shell, path).toHaveCSS("font-family", /Manrope/);
  }
});



for (const width of [320, 390, 768, 1024, 1280, 1440]) {
  test(`public pages keep one main heading and no horizontal overflow at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/services", "/projects", "/projects/smart-drop-box-pg", "/projects?preview=examples", "/projects/contoh-enclosure?preview=examples", "/project-brief"]) {
      await gotoRenderedPage(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${width}px`).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
