import { expect, test } from "@playwright/test";

function contrastRatio(foreground: string, background: string): number {
  function luminance(color: string): number {
    const channels = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!channels) throw new Error(`Expected an opaque RGB color, received ${color}`);
    const linear = channels.slice(1, 4).map(channel => {
      const value = Number(channel) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("account redirects an unauthenticated Customer to Google login", async ({ page }) => {
  const prematureOAuthStarts: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/auth/google/start")) prematureOAuthStarts.push(request.url());
  });
  await page.goto("/account");

  await expect(page).toHaveURL(/\/login\?returnTo=(?:%2F|\/)account$/);
  await expect(page.getByRole("link", { name: "Lanjutkan dengan Google" })).toBeVisible();
  await page.waitForTimeout(250);
  expect(prematureOAuthStarts).toEqual([]);
});

test("register uses the Google boundary, opens Account, and logout revokes access", async ({ page }) => {
  await page.goto("/register?returnTo=/account");
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pekerjaan dan order Anda." })).toBeVisible();
  await expect(page.getByText("demo-customer@example.test")).toBeVisible();

  const [logoutResponse] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith("/api/auth/logout") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Logout" }).click(),
  ]);
  expect(logoutResponse.status()).toBe(204);
  await expect(page).toHaveURL(/\/login\?loggedOut=1$/);
  await expect(page.getByText("Anda sudah keluar.")).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?returnTo=(?:%2F|\/)account$/);
});

test("unsafe returnTo falls back to Account after Customer login", async ({ page }) => {
  await page.goto("/login?returnTo=https%3A%2F%2Fevil.example%2Fsteal");
  await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();

  await expect(page).toHaveURL(/\/account$/);
});

test("auth route switching retains context, query, and fragment", async ({ page }) => {
  for (const [returnTo, context] of [
    ["/checkout?preview=examples#summary", "Masuk atau buat akun untuk melanjutkan checkout Anda."],
    ["/custom-print/request?type=model", "Masuk atau buat akun untuk melanjutkan permintaan Custom Print Anda."],
    ["/project-brief", "Masuk atau buat akun untuk melanjutkan Project Brief Anda."],
  ]) {
    await page.goto(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    await expect(page.getByText(context, { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Daftar", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Buat akun Niuva");
    await expect(page.getByText(context, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Masuk", exact: true })).toHaveAttribute("href", `/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
});

test("auth layout fits the responsive matrix and respects reduced motion", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const mode of ["login", "register", "verify-email"]) {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${mode}`);
      await page.evaluate(() => document.fonts.ready);
      const content = await page.locator("[data-customer-auth-content]").boundingBox();
      expect(content?.width).toBeLessThanOrEqual(448);
      expect(Math.abs(content!.x + content!.width / 2 - width / 2)).toBeLessThan(1);
      await expect(page.locator("aside")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const action = mode === "verify-email" ? page.locator("summary") : page.getByRole("link", { name: "Lanjutkan dengan Google" });
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.scrollHeight));
      // The shared reduced-motion rule caps every transition at 0.01ms.
      const durations = await action.evaluate(element => getComputedStyle(element).transitionDuration.split(",").map(value => Number.parseFloat(value) * 1000));
      expect(durations.every(durationMs => durationMs <= 0.01)).toBe(true);
      await page.screenshot({ path: `test-results/customer-auth-${mode}-${width}.png`, fullPage: true });
    }
  }
  expect(pageErrors).toEqual([]);
});

test("auth keyboard order exposes the skip link and a visible Google focus ring", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  const google = page.getByRole("link", { name: "Lanjutkan dengan Google" });
  for (let i = 0; i < 7 && !(await google.evaluate(element => element === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(google).toBeFocused();
  expect(await google.evaluate(element => getComputedStyle(element).outlineWidth)).toBe("3px");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Daftar", exact: true })).toBeFocused();
});

test("auth text has accessible contrast and header targets are at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ["/login", "/register", "/login?error=auth_failed", "/login?error=rate_limited", "/login?error=unavailable", "/login?loggedOut=1"]) {
    await page.goto(route);
    const pairs = await page.evaluate(() => {
      const elements = document.querySelectorAll("#customer-auth-title, #customer-auth-title + p, #customer-auth-helper, header a, a[href^='/api/auth/google/start'], a[href^='/login?'], a[href^='/register?'], aside p, aside h2, aside li, [data-component='status-notice'] p, [data-component='status-notice'] [data-slot='alert-description']");
      return [...elements].map(element => {
        let ancestor: Element | null = element;
        let background = "rgba(0, 0, 0, 0)";
        while (ancestor && background === "rgba(0, 0, 0, 0)") {
          background = getComputedStyle(ancestor).backgroundColor;
          ancestor = ancestor.parentElement;
        }
        return { text: element.textContent?.trim(), foreground: getComputedStyle(element).color, background };
      });
    });
    for (const pair of pairs) expect(contrastRatio(pair.foreground, pair.background), pair.text).toBeGreaterThanOrEqual(4.5);
    for (const name of ["Niuva, kembali ke halaman utama", "Kembali ke situs"]) {
      const box = await page.getByRole("link", { name }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    const alternateBox = await page.getByRole("link", { name: /^(Daftar|Masuk)$/ }).boundingBox();
    expect(alternateBox?.height).toBeGreaterThanOrEqual(44);
    expect(alternateBox?.width).toBeGreaterThanOrEqual(44);
  }
});

test("OAuth remains a native navigation when JavaScript is unavailable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/register?returnTo=/account");
    await page.getByRole("link", { name: "Lanjutkan dengan Google" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { level: 1, name: "Pekerjaan dan order Anda." })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("auth failure and logout notices offer readable recovery", async ({ page }) => {
  for (const [query, message] of [
    ["error=auth_failed", "Proses masuk belum selesai atau dibatalkan."],
    ["error=rate_limited", "Terlalu banyak percobaan."],
    ["error=unavailable", "Layanan Google sedang tidak tersedia."],
    ["loggedOut=1", "Anda sudah keluar."],
  ]) {
    await page.goto(`/login?${query}`);
    await expect(page.getByText(message, { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lanjutkan dengan Google" })).toBeVisible();
  }
});

test("Google pending preserves layout, prevents double activation, and recovers on pageshow", async ({ page }) => {
  let starts = 0;
  await page.route("**/api/auth/google/start?**", async route => {
    starts += 1;
    // A no-content response keeps the current document visible after a native
    // navigation, allowing the pending state to be inspected without a redirect.
    await route.fulfill({ status: 204 });
  });
  try {
    await page.goto("/login");
    const google = page.getByRole("link", { name: "Lanjutkan dengan Google" });
    const helper = page.locator("#customer-auth-helper");
    const before = await helper.evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; });
    await google.click({ noWaitAfter: true });
    const status = page.getByRole("status").filter({ hasText: "Menghubungkan ke Google…" });
    await expect(status).toHaveText("Menghubungkan ke Google…");
    await expect(google).toHaveAttribute("aria-disabled", "true");
    await expect(google).toHaveAttribute("aria-busy", "true");
    expect(await helper.evaluate(element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; })).toEqual(before);
    // Force a second activation attempt so the anchor's guard is exercised.
    await google.click({ noWaitAfter: true, force: true });
    expect(starts).toBe(1);
    // Simulate the lifecycle event delivered when a browser restores this page.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    await expect(google).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("Menghubungkan ke Google…")).toHaveCount(0);
  } finally {
    await page.unrouteAll({ behavior: "wait" });
  }
});
