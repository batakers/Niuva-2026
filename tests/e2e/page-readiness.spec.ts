import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { expectDecodedImage, gotoRenderedPage } from "./helpers/readiness";

test("media readiness waits for delayed lazy images and rejects broken images", async ({ page }) => {
  const cover = await readFile("public/media/portfolio/cs-01-smart-drop-box.png");
  await page.route("**/readiness-image.png", async (route) => {
    // Exceed the old five-second polling deadline with a valid image response.
    await new Promise<void>((resolve) => setTimeout(resolve, 6_000));
    await route.fulfill({ contentType: "image/png", body: cover });
  });
  await page.route("**/readiness-broken.png", (route) => route.fulfill({ status: 404 }));
  await page.route("**/readiness-fixture", (route) => route.fulfill({
    contentType: "text/html",
    body: '<div style="height:5000px"></div><img alt="Delayed cover" loading="lazy" width="200" height="200" src="/readiness-image.png">',
  }));
  await page.goto("/readiness-fixture", { waitUntil: "domcontentloaded" });
  await expectDecodedImage(page.getByRole("img", { name: "Delayed cover" }));

  await page.setContent('<img alt="Broken cover" loading="lazy" width="200" height="200" src="/readiness-broken.png">');
  await expect(expectDecodedImage(page.getByRole("img", { name: "Broken cover" }))).rejects.toThrow(/cannot be decoded/);
});

test("layout readiness does not wait for a pending project cover", async ({ page }) => {
  let releaseCover: () => void = () => {};
  const coverReleased = new Promise<void>((resolve) => { releaseCover = resolve; });
  let markCoverRequested: () => void = () => {};
  const coverRequested = new Promise<void>((resolve) => { markCoverRequested = resolve; });
  await page.route("**/_next/image?*", async (route) => {
    markCoverRequested();
    await coverReleased;
    await route.continue();
  });

  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoRenderedPage(page, "/projects/smart-drop-box-pg");
    await coverRequested;
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Smart Drop Box/);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(await page.evaluate(() => document.readyState)).toBe("interactive");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    releaseCover();
    await page.waitForLoadState("load");
  }
});
