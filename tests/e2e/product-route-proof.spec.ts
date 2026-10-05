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

async function assertRouteShell(page: Page, route: string, width: number) {
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("[data-product-screen-proof-status]")).toHaveAttribute(
    "data-product-screen-proof-status",
    route === "/" ? "pending-owner-review" : "approved-owner",
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
  const media = page.locator("[data-home-section='project-proof'] img");
  await expect(media).toHaveCount(3);

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

async function fillRequiredBriefFields(page: Page) {
  const form = page.getByRole("form", { name: "Form project brief" });
  await form.getByLabel("Nama kontak").fill("Route proof contact");
  await expect(form.locator('[name="email"]')).toHaveValue("demo-customer@example.test");
  await form.getByLabel("Nomor WhatsApp").fill("+628000000001");
  await form.getByLabel("Apa yang ingin dicapai?").fill("Memeriksa alur proof route.");
  await form.getByLabel("Tahap saat ini").selectOption("CAD");
  await form.getByLabel("Ceritakan kebutuhan dan batasannya").fill("Bukti teknis untuk route homepage dan project brief.");
  await form.getByLabel("Target jumlah").fill("1 proof");
  await form.getByLabel("Target waktu").fill("2026-10-01");
  await form.getByLabel("Link referensi").fill("https://example.test/route-proof");
  await form.getByLabel("Persetujuan kerahasiaan").check();
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
    await expect(page.getByRole("link", { name: "Diskusikan Proyek" }).first()).toHaveAttribute(
      "href",
      "/project-brief",
    );

    await page.goto("/project-brief");
    await assertRouteShell(page, "/project-brief", width);
    await assertAccessibleSections(page);
    await expect(page.getByRole("form", { name: "Form project brief" })).toBeVisible();
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
  const form = page.getByRole("form", { name: "Form project brief" });
  const controlsWithoutLabels = await form.locator("input:not([type='hidden']), select, textarea").evaluateAll((controls) =>
    controls
      .filter((control) => {
        const labelled = control.getAttribute("aria-label") || control.getAttribute("aria-labelledby") ||
          (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement
            ? control.labels?.length
            : undefined);
        return !labelled;
      })
      .map((control) => control.outerHTML.slice(0, 120)),
  );
  expect(controlsWithoutLabels).toEqual([]);

  await page.getByRole("button", { name: "Kirim project brief" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Periksa kembali brief Anda." })).toBeVisible();
  await expect(form.locator("div[tabindex='-1']").first()).toBeFocused();
  await form.getByRole("link", { name: /Nama kontak/ }).click();
  await expect(form.getByLabel("Nama kontak")).toBeFocused();

  await page.reload();
  await page.route("**/api/project-brief", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "proof failure" }),
    });
  });
  await fillRequiredBriefFields(page);
  await page.getByRole("button", { name: "Kirim project brief" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Project brief belum terkirim." })).toBeVisible();
  await expect(page.getByLabel("Nama kontak")).toHaveValue("Route proof contact");
  await page.getByRole("button", { name: "Coba lagi" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Project brief belum terkirim." })).toHaveCount(0);

  await expect(page.getByText("Lampiran referensi — belum tersedia")).toBeVisible();
  await expect(page.locator("input[type='file']")).toBeDisabled();
  expect(consoleErrors.filter((message) => !message.includes("status of 503"))).toEqual([]);
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
