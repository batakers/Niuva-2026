import { expect, test } from "@playwright/test";

test("AUiS styleguide exposes the Niuva Visual Proof", async ({ page }) => {
  await page.goto("/auis/styleguide");

  await expect(page).toHaveTitle("Design System styleguide · Niuva");
  await expect(
    page.getByRole("heading", { name: "Visual foundation Niuva" }),
  ).toBeVisible();
  await expect(
    page.getByText("Status: Foundation, Typography System v1.0, Motion, Patterns, dan P0/P1 disetujui"),
  ).toBeVisible();
  await expect(page.locator("[data-design-system-architecture]")).toBeVisible();
  await expect(page.locator("[data-design-system-architecture]")).toHaveAttribute(
    "data-design-system-version",
    "1.0",
  );
  await expect(page.locator("[data-design-system-architecture]")).toHaveAttribute(
    "data-design-system-scope",
    "styleguide-only",
  );
  await expect(page.locator("[data-design-system-layer]")).toHaveCount(8);
  await expect(page.locator("[data-design-system-layer='foundation']")).toHaveAttribute(
    "data-design-system-layer-status",
    "approved",
  );
  await expect(page.locator("[data-design-system-layer='primitives']")).toContainText("Base UI");
  await expect(page.locator("[data-design-system-source='lucide']")).toContainText("Approved");
  await expect(page.locator("[data-design-system-source='creative-catalog']")).toContainText("Reference only");
  await expect(page.locator("[data-design-system-registry='promotion']")).toContainText("Official");
  const motionSystem = page.locator("[data-motion-system]");
  await expect(motionSystem).toBeVisible();
  await expect(motionSystem).toHaveAttribute("data-motion-system-version", "1.0");
  await expect(motionSystem).toHaveAttribute("data-motion-system-scope", "styleguide-only");
  await expect(motionSystem).toHaveAttribute("data-motion-system-status", "approved-styleguide-only");
  await expect(motionSystem).toHaveAttribute("data-motion-system-visual-review", "approved");
  await expect(motionSystem.locator("[data-motion-token]")).toHaveCount(6);
  await expect(motionSystem.locator("[data-motion-recipe]")).toHaveCount(6);
  await expect(motionSystem.locator("[data-motion-safety='reduced-motion']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gerak yang menjelaskan, bukan menghibur" })).toBeVisible();
  const patternShowcase = page.locator("[data-pattern-showcase]");
  await expect(patternShowcase).toBeVisible();
  await expect(patternShowcase).toHaveAttribute("data-pattern-showcase-scope", "styleguide-only");
  await expect(patternShowcase).toHaveAttribute("data-pattern-showcase-status", "approved-styleguide-only");
  await expect(patternShowcase).toHaveAttribute("data-pattern-showcase-visual-review", "approved");
  await expect(patternShowcase.locator("[data-pattern]")).toHaveCount(4);
  await expect(patternShowcase.locator("[data-pattern-status='approved']")).toHaveCount(4);
  await expect(patternShowcase.locator("[data-pattern-scope='styleguide-only']")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Patterns yang lahir dari flow nyata" })).toBeVisible();
  await expect(page.locator("[data-component-showcase='p0']")).toBeVisible();
  await expect(page.locator("[data-component-showcase='p1']")).toBeVisible();
  await expect(page.locator("[data-component-showcase='p0']")).toHaveAttribute(
    "data-visual-review",
    "approved",
  );
  await expect(page.locator("[data-component-showcase='p1']")).toHaveAttribute(
    "data-visual-review",
    "approved",
  );
  await expect(page.getByText("--brand-500")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Satu identitas, tiga kebutuhan kerja" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gerak singkat untuk memberi feedback" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Status menjelaskan keadaan dan tindakan berikutnya" })).toBeVisible();
  await expect(page.locator("[data-proof-surface='public']")).toBeVisible();
  await expect(page.locator("[data-proof-surface='checkout']")).toBeVisible();
  await expect(page.locator("[data-proof-surface='admin']")).toBeVisible();
  await expect(page.locator("[data-proof-motion='standard']").getByRole("button", { name: "Hover atau fokus" })).toBeVisible();
  await expect(page.locator("[data-proof-state='error']")).toContainText("Pesanan belum dapat dilanjutkan");
  await expect(page.getByRole("heading", { name: "Primitif operasional" })).toBeVisible();
  await expect(page.getByText("--primary-foreground")).toBeVisible();
  await expect(page.locator("[data-core-primitive-showcase]")).toBeVisible();
  const primaryAction = page
    .locator("#components")
    .getByRole("button", { name: "Diskusikan proyek" });
  await expect(primaryAction).toHaveCSS("background-color", "rgb(63, 96, 127)");
  await expect(primaryAction).toHaveCSS("color", "rgb(255, 255, 255)");
  await primaryAction.hover();
  await expect(primaryAction).toHaveCSS("background-color", "rgb(52, 79, 103)");
  for (const component of ["Dialog", "Dropdown menu", "Radio group", "Select", "Switch", "Tabs", "Tooltip"]) {
    await expect(page.getByRole("heading", { name: component, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "MoneySummary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FileUploadField" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "OrderStatusTimeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "VariantSelector" })).toBeVisible();
  const compactSummaries = page.locator(
    '[data-component="money-summary"][data-variant="compact"]',
  );
  await expect(compactSummaries).toHaveCount(3);
  const noticeBottomGaps = await compactSummaries.evaluateAll((cards) =>
    cards.map((card) => {
      const notice = card.querySelector('[data-component="status-notice"]');
      if (!notice) {
        return Number.POSITIVE_INFINITY;
      }

      return card.getBoundingClientRect().bottom - notice.getBoundingClientRect().bottom;
    }),
  );
  expect(Math.max(...noticeBottomGaps) - Math.min(...noticeBottomGaps)).toBeLessThanOrEqual(1);
  const secondQueueRowFooterTops = await page
    .locator("#p0-components [data-component='action-queue-item']")
    .evaluateAll((cards) =>
      cards.slice(3, 6).map((card) =>
        card.querySelector("[data-slot='card-footer']")?.getBoundingClientRect().top ?? Number.NaN,
      ),
    );
  expect(Math.max(...secondQueueRowFooterTops) - Math.min(...secondQueueRowFooterTops)).toBeLessThanOrEqual(1);
  await expect(page.locator("[data-contract-status='approved']")).toBeVisible();
  await expect(page.locator("[data-contract-scope='styleguide-only']")).toBeVisible();
  await expect(page.getByText("Product propagation · paused")).toBeVisible();
  await expect(page.locator("[data-proof-surface='public']").getByRole("button", { name: "Diskusikan proyek" })).toBeVisible();
});

test("AUiS styleguide keeps the mobile proof within the viewport and exposes upload focus", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/auis/styleguide");

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);

  const input = page.locator("#p1-upload-idle");
  const uploadTarget = page.locator('label[for="p1-upload-idle"]');

  await expect(uploadTarget).toHaveCount(1);
  await input.focus();
  await expect(input).toBeFocused();

  const focusShadow = await uploadTarget.evaluate(
    (element) => window.getComputedStyle(element).boxShadow,
  );
  expect(focusShadow).not.toBe("none");
});

test("typography proof records styleguide approval and explicit public propagation", async ({ page }) => {
  await page.goto("/auis/styleguide");

  const typographyProof = page.locator("[data-typography-proof]");
  await expect(typographyProof).toBeVisible();
  await expect(page.locator("[data-typography-scope='styleguide-only']")).toBeVisible();
  await expect(typographyProof).toHaveAttribute("data-typography-status", "approved");
  await expect(typographyProof).toHaveAttribute("data-typography-version", "1.0");
  await expect(typographyProof.locator("[data-responsive-step]")).toHaveCount(3);
  await expect(typographyProof.locator("[data-fraunces-axis-policy]")).toContainText(
    "default · tidak dimuat",
  );
  await expect(
    typographyProof.locator("[data-typography-approval='approved-no-propagation']"),
  ).toBeVisible();

  for (const context of ["homepage", "case-study", "checkout", "dashboard"]) {
    await expect(
      typographyProof.locator(`[data-proof-context='${context}']`),
    ).toBeVisible();
  }

  await expect(
    typographyProof.locator("[data-font-family='space-grotesk']").first(),
  ).toHaveCSS("font-family", /Space Grotesk/);
  await expect(
    typographyProof.locator("[data-font-family='fraunces']").first(),
  ).toHaveCSS("font-family", /Fraunces/);

  await page.goto("/");
  const productFontFamily = await page.locator("[data-homepage]").evaluate(
    (element) => window.getComputedStyle(element).fontFamily,
  );
  expect(productFontFamily).toContain("Space Grotesk");
  expect(productFontFamily).not.toContain("Fraunces");
  await expect(page.locator("[data-motion-system]")).toHaveCount(0);
  await expect(page.locator("[data-pattern-showcase]")).toHaveCount(0);
});

test("Typography System v1.0 keeps its compact, standard, and wide contract", async ({ page }) => {
  await page.goto("/auis/styleguide");

  const proof = page.locator("[data-typography-proof]");
  const display = proof.locator("[data-type-role='display']").first();
  const heading = proof.locator("[data-type-role='heading']").first();
  const editorialAccent = proof.locator("[data-type-role='editorial-accent']").first();

  const viewportExpectations = [
    {
      accentSize: "28px",
      displayLeading: "43px",
      displaySize: "40px",
      displayTracking: "-1.2px",
      headingSize: "30px",
      width: 390,
    },
    {
      accentSize: "32px",
      displayLeading: "51px",
      displaySize: "48px",
      displayTracking: "-1.68px",
      headingSize: "36px",
      width: 900,
    },
    {
      accentSize: "36px",
      displayLeading: "63px",
      displaySize: "60px",
      displayTracking: "-2.4px",
      headingSize: "40px",
      width: 1440,
    },
  ] as const;

  for (const expectation of viewportExpectations) {
    await page.setViewportSize({ height: 900, width: expectation.width });
    await expect(display).toHaveCSS("font-size", expectation.displaySize);
    await expect(display).toHaveCSS("line-height", expectation.displayLeading);
    await expect(display).toHaveCSS("letter-spacing", expectation.displayTracking);
    await expect(display).toHaveCSS("font-weight", "600");
    await expect(heading).toHaveCSS("font-size", expectation.headingSize);
    await expect(editorialAccent).toHaveCSS("font-size", expectation.accentSize);
    await expect(editorialAccent).toHaveCSS("font-weight", "500");
  }

  const body = proof.locator("[data-type-role='body']");
  const uiData = proof.locator("[data-type-role='ui-data']");
  await expect(body).toHaveCSS("font-size", "16px");
  await expect(body).toHaveCSS("line-height", "24px");
  await expect(body).toHaveCSS("font-weight", "400");
  await expect(uiData).toHaveCSS("font-size", "14px");
  await expect(uiData).toHaveCSS("line-height", "20px");
  await expect(uiData).toHaveCSS("font-weight", "500");
  await expect(editorialAccent).toHaveCSS("font-optical-sizing", "auto");
  await expect(editorialAccent).toHaveCSS("font-synthesis", "none");
});

test("primitive bridge keeps popup, focus, and selection contracts", async ({ page }) => {
  await page.goto("/auis/styleguide");

  const dialogTrigger = page.getByRole("button", { name: "Buka dialog" });
  await dialogTrigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/shadow-floating/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(dialogTrigger).toBeFocused();

  const menuTrigger = page.getByRole("button", { name: "Aksi brief" });
  await menuTrigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu).toHaveClass(/shadow-floating/);
  await page.keyboard.press("Escape");

  const selectTrigger = page.getByRole("combobox", { name: "Status project" });
  await selectTrigger.click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await expect(page.locator("[data-slot='select-content']")).toHaveClass(/shadow-floating/);
  await page.getByRole("option", { name: "Terblokir" }).click();
  await expect(selectTrigger).toContainText("Terblokir");

  const evidenceTab = page.getByRole("tab", { name: "Bukti" });
  await evidenceTab.click();
  await expect(evidenceTab).toHaveAttribute("aria-selected", "true");

  const tooltipTrigger = page.getByRole("button", { name: "Bantuan status" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(tooltipTrigger).toBeFocused();
  await expect(page.locator("[data-slot='tooltip-content'][data-open]")).toBeVisible();
});
