import { expect, test, type Page } from "@playwright/test";
import { loginCustomer } from "./helpers/customer";
import { expectDecodedImage } from "./helpers/readiness";

const proofWidths = [320, 390, 768, 1280] as const;

type MediaDiagnostic = { phase: string; elapsedMs: number; width: number; height: number; imageIndex?: number; alt?: string; sourcePath?: string; complete?: boolean; naturalWidth?: number; naturalHeight?: number; status?: number | "failed" };
function publicImagePath(raw: string): string | undefined {
  try {
    const url = new URL(raw);
    const source = url.pathname === "/_next/image" ? new URL(url.searchParams.get("url") ?? "", url.origin).pathname : url.pathname;
    return /^\/(?:media\/|_next\/static\/media\/)/.test(source) ? source : undefined;
  } catch { return undefined; }
}

async function assertNoHorizontalOverflow(page: Page, route: string, width: number) {
  const dimensions = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.documentScrollWidth, `${route} document overflow at ${width}px`).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
  expect(dimensions.bodyScrollWidth, `${route} body overflow at ${width}px`).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
}

// The Owner accepted Beranda visually on 31 Oct 2026; other routes still await review.
async function assertRouteShell(page: Page, route: string, width: number) {
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("[data-product-screen-proof-status]")).toHaveAttribute(
    "data-product-screen-proof-status",
    route === "/" ? "approved-owner" : "pending-owner-review",
  );
  await assertNoHorizontalOverflow(page, route, width);
}

async function assertAccessibleSections(page: Page) {
  const missingSectionLabels = await page.locator("main section").evaluateAll((sections) =>
    sections
      .filter((section) => {
        const labelledBy = section.getAttribute("aria-labelledby");
        return labelledBy !== null && !document.getElementById(labelledBy)?.textContent?.trim();
      })
      .map((section) => section.id || section.outerHTML.slice(0, 80)),
  );

  expect(missingSectionLabels).toEqual([]);
}

async function assertHomepageMedia(page: Page, record: (value: Omit<MediaDiagnostic, "elapsedMs" | "width" | "height">) => void) {
  // The homepage carries mascot renders only; project photos stay on /projects (Owner, 31 Oct 2026).
  await expect(page.locator("[data-home-section='project-proof'] img")).toHaveCount(0);
  const media = page.locator("[data-home-section='hero'] img, [data-home-section='starting-points'] img");
  await expect(media).toHaveCount(4);

  for (const [imageIndex, image] of (await media.all()).entries()) {
    const before = await image.evaluate(element => element instanceof HTMLImageElement ? { alt: element.alt, source: element.currentSrc || element.src, complete: element.complete, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight } : null);
    if (before) record({ phase: "decode-start", imageIndex, alt: before.alt.slice(0, 160), sourcePath: publicImagePath(before.source), complete: before.complete, naturalWidth: before.naturalWidth, naturalHeight: before.naturalHeight });
    await expectDecodedImage(image);
    record({ phase: "decode-complete", imageIndex });
  }

  const altTexts = await media.evaluateAll((images) => images.map((image) =>
    image instanceof HTMLImageElement ? image.alt.trim() : "",
  ));
  expect(altTexts.every((altText) => altText.length > 0)).toBe(true);
}


test("authorized product routes have named responsive and semantic proof", async ({ page }, testInfo) => {
  const started = Date.now();
  const diagnostics: MediaDiagnostic[] = [];
  const record = (value: Omit<MediaDiagnostic, "elapsedMs" | "width" | "height">) => {
    const viewport = page.viewportSize();
    diagnostics.push({ ...value, elapsedMs: Date.now() - started, width: viewport?.width ?? 0, height: viewport?.height ?? 0 });
  };
  page.on("request", request => {
    if (request.resourceType() !== "image") return;
    const sourcePath = publicImagePath(request.url());
    if (sourcePath) record({ phase: "image-request", sourcePath });
  });
  page.on("response", response => {
    if (response.request().resourceType() !== "image") return;
    const sourcePath = publicImagePath(response.url());
    if (sourcePath) record({ phase: "image-response", sourcePath, status: response.status() });
  });
  page.on("requestfailed", request => {
    if (request.resourceType() !== "image") return;
    const sourcePath = publicImagePath(request.url());
    if (sourcePath) record({ phase: "image-request-failed", sourcePath, status: "failed" });
  });
  page.on("requestfinished", request => {
    if (request.resourceType() !== "image") return;
    const sourcePath = publicImagePath(request.url());
    if (sourcePath) record({ phase: "image-request-finished", sourcePath });
  });
  try {
  record({ phase: "login-start" });
  await loginCustomer(page);
  record({ phase: "login-complete" });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const width of proofWidths) {
    await page.setViewportSize({ width, height: 900 });
    record({ phase: "layout-start" });

    await page.goto("/");
    await assertRouteShell(page, "/", width);
    await assertAccessibleSections(page);
    await expect(page.getByRole("link", { name: "Hubungi Kami" }).first()).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\//,
    );

    await page.goto("/project-brief");
    await expect(page).toHaveURL(/\/services$/);
    await assertRouteShell(page, "/services", width);
    await assertAccessibleSections(page);
    await expect(page.getByRole("form", { name: "Form project brief" })).toHaveCount(0);
    record({ phase: "layout-complete" });
  }

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    record({ phase: "media-navigation-start" });
    await page.goto("/");
    record({ phase: "media-navigation-complete" });
    await assertHomepageMedia(page, record);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Lewati ke konten utama" })).toBeFocused();
  const menuToggle = page.getByRole("button", { name: "Buka menu" });
  await menuToggle.click();
  await page.keyboard.press("Escape");
  await expect(menuToggle).toBeFocused();
  await expect(menuToggle).toHaveAttribute("aria-expanded", "false");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/project-brief");
  await expect(page).toHaveURL(/\/services$/);
  const contact = page.getByRole("main").getByRole("link", { name: "Hubungi Kami" }).first();
  await contact.focus();
  await expect(contact).toBeFocused();
  await expect(contact).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(page.getByRole("form", { name: "Form project brief" })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  record({ phase: "proof-complete" });
  } catch (error) {
    record({ phase: "proof-failed" });
    throw error;
  } finally {
    // The CI list reporter does not print JSON attachments and the workflow
    // does not upload traces. Log the bounded public projection for both failed
    // and passing comparisons: no error payload, query, cookies, storage or
    // private URLs. Write before the asynchronous attachment can be interrupted.
    process.stdout.write(`NIUVA_PUBLIC_MEDIA_DIAGNOSTICS ${JSON.stringify(diagnostics.slice(-200))}\n`);
    await testInfo.attach("public-homepage-media-diagnostics", { body: Buffer.from(JSON.stringify(diagnostics, null, 2)), contentType: "application/json" });
  }
});
