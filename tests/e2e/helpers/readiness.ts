import { expect, type Locator, type Page } from "@playwright/test";

export async function expectDecodedImage(image: Locator): Promise<void> {
  await image.scrollIntoViewIfNeeded();
  // Native lazy loading and on-demand image optimization may finish after the
  // default assertion deadline. Decode waits for this image and rejects errors;
  // the enclosing test still bounds the wait.
  const dimensions = await image.evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement)) throw new Error("Expected an image element.");
    await element.decode();
    return { width: element.naturalWidth, height: element.naturalHeight };
  });
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
}

export async function gotoRenderedPage(page: Page, path: string): Promise<void> {
  // Layout checks need parsed content and settled fonts. The load event also
  // waits for eager images, whose completion is checked by separate media tests.
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}
