import { expect, test } from "@playwright/test";

const previewUrl = "/auis/proofs/frontend/admin?preview=examples";

test("admin preview makes unavailable authentication explicit without a fake sign-in", async ({ page }) => {
  const mutationRequests: string[] = [];

  page.on("request", (request) => {
    if (request.method() !== "GET") mutationRequests.push(request.url());
  });

  await page.goto(previewUrl);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akses operasi belum terhubung.");
  await expect(page.getByText("Route /admin tetap dijaga oleh Proxy dan requireAdmin.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign-in Clerk belum tersedia" })).toBeDisabled();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByText("Tidak membuat login, session, atau profil admin.")).toBeVisible();

  await page.goto(`${previewUrl}&state=ready&state=forbidden`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akses operasi belum terhubung.");

  expect(mutationRequests).toEqual([]);
});

test("forbidden state describes active profile requirements without revealing an account", async ({ page }) => {
  await page.goto(`${previewUrl}&state=forbidden`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Akses admin tidak diizinkan.");
  await expect(page.getByRole("alert")).toContainText("Profil admin aktif diperlukan");
  await expect(page.getByText("Preview ini tidak menunjukkan identitas akun.")).toBeVisible();
  await expect(page.getByText("Role OWNER atau ADMIN dibatasi lagi per tindakan operasional.")).toBeVisible();
  await expect(page.getByText(/clerk_user_id|@/i)).toHaveCount(0);
});

test("verified queue scenario remains a presentation fixture", async ({ page }) => {
  await page.goto(`${previewUrl}&state=ready`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tindakan yang perlu ditinjau.");
  await expect(page.getByText("Development-only preview")).toBeVisible();
  await expect(page.getByText("Referensi, status, dan usia di halaman ini hanya fixture development.")).toBeVisible();
  await expect(page.getByText("Tidak ada status, audit, atau data server yang diubah.")).toHaveCount(0);
  await expect(page.getByText("Tindakan operasional berikutnya")).toBeVisible();
});

test("mobile navigation opens, closes with Escape, and returns focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(previewUrl);

  const openNavigation = page.getByRole("button", { name: "Buka navigasi admin" });
  await openNavigation.click();
  await expect(page.getByRole("button", { name: "Tutup navigasi admin" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Modul administrasi" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(openNavigation).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Modul administrasi" })).toBeHidden();
});

test("admin preview is readable across supported viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${previewUrl}&state=ready`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `admin preview at ${width}px`,
    ).toBe(true);
  }
});
