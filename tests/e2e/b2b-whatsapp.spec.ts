import { expect, test } from "@playwright/test";

test("B2B contact works without login on mobile and desktop", async ({ page }, testInfo) => {
  const authOrBriefRequests: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/auth/") || (path === "/api/project-brief" && request.method() === "POST")) {
      authOrBriefRequests.push(path);
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/services/design-prototyping");
    await expect(page).toHaveURL(/\/services\/design-prototyping$/);
    const contact = page.getByRole("main").getByRole("link", { name: "Hubungi Kami", exact: true }).first();
    const url = new URL((await contact.getAttribute("href"))!);
    expect(url.origin).toBe("https://wa.me");
    expect(url.pathname).toBe("/6285117678901");
    expect(url.searchParams.get("text")).toBe("Halo Niuva, saya ingin membahas kebutuhan Design & Prototyping.");
    await expect(page.getByRole("main").getByText("Melalui WhatsApp", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("form", { name: "Form project brief" })).toHaveCount(0);
    await expect(page.locator('a[href^="/project-brief"]')).toHaveCount(0);
    await page.keyboard.press("Tab");
    await contact.focus();
    await expect(contact).toBeFocused();
    const focus = await contact.evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, shadow: getComputedStyle(element).boxShadow }));
    expect(focus.outline !== "none" || focus.shadow !== "none").toBe(true);
    expect((await contact.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`services-${width}.png`), fullPage: true });
  }
  expect(authOrBriefRequests).toEqual([]);
});

test("legacy brief and proposal endpoints cannot start a B2B workflow", async ({ page, request }) => {
  await page.goto("/project-brief?service=research-development");
  await expect(page).toHaveURL(/\/services\/research-development$/);
  await page.goto("/project-brief?service=unknown");
  await expect(page).toHaveURL(/\/services$/);
  for (const path of ["/api/project-brief", "/api/account/inquiries/legacy/quotes/legacy/decision"]) {
    const response = await request.post(path, { data: "invalid payload" });
    expect(response.status()).toBe(410);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: { code: "B2B_RETIRED" } });
  }
});

test("WhatsApp contact and legacy redirect work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/project-brief?service=design-prototyping");
    await expect(page).toHaveURL(/\/services\/design-prototyping$/);
    await expect(page.getByRole("main").getByRole("link", { name: "Hubungi Kami" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\/6285117678901\?text=/);
    await expect(page.getByRole("form")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
