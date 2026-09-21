import { expect, test, type Page } from "@playwright/test";

const proofWidths = [320, 390, 768, 1280] as const;

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
    "pending-owner-review",
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

async function assertHomepageMedia(page: Page) {
  const media = page.locator("[data-home-section='project-proof'] img");
  await expect(media).toHaveCount(3);

  for (const image of await media.all()) {
    await image.scrollIntoViewIfNeeded();
  }

  await expect.poll(
    () => media.evaluateAll((images) => images.every((image) =>
      image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
    )),
    { message: "homepage proof media should load with usable dimensions" },
  ).toBe(true);
  const altTexts = await media.evaluateAll((images) => images.map((image) =>
    image instanceof HTMLImageElement ? image.alt.trim() : "",
  ));
  expect(altTexts.every((altText) => altText.length > 0)).toBe(true);
}

async function fillRequiredBriefFields(page: Page) {
  const form = page.getByRole("form", { name: "Form project brief" });
  await form.getByLabel("Nama kontak").fill("Route proof contact");
  await form.getByLabel("Email").fill("route-proof@example.test");
  await form.getByLabel("Nomor WhatsApp").fill("+628000000001");
  await form.getByLabel("Apa yang ingin dicapai?").fill("Memeriksa alur proof route.");
  await form.getByLabel("Tahap saat ini").selectOption("CAD");
  await form.getByLabel("Ceritakan kebutuhan dan batasannya").fill("Bukti teknis untuk route homepage dan project brief.");
  await form.getByLabel("Target jumlah").fill("1 proof");
  await form.getByLabel("Target waktu").fill("2026-10-01");
  await form.getByLabel("Link referensi").fill("https://example.test/route-proof");
  await form.getByLabel("Persetujuan kerahasiaan").check();
}

test("authorized product routes have named responsive and semantic proof", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const width of proofWidths) {
    await page.setViewportSize({ width, height: 900 });

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
  }

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    await assertHomepageMedia(page);
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
});
