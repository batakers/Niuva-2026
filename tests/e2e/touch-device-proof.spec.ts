import { expect, test } from "@playwright/test";

test("OptionChip responds to emulated touch with safe target geometry", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();

  try {
    await page.goto("/auis/styleguide#option-chip-proof");
    const proof = page.locator("[data-component-showcase='option-chip']");
    await proof.scrollIntoViewIfNeeded();

    const buttons = proof.getByRole("button");
    const buttonSizes = await buttons.evaluateAll((elements) =>
      elements.map((element) => {
        const { height, width } = element.getBoundingClientRect();
        return { height, width };
      }),
    );
    expect(buttonSizes.length).toBeGreaterThan(0);
    expect(buttonSizes.every(({ height, width }) => height >= 44 && width >= 44)).toBe(true);

    const pla = proof.getByRole("button", { name: "PLA" }).first();
    await pla.tap();
    await expect(pla).toHaveAttribute("aria-pressed", "true");
    await expect(proof.getByRole("status")).toContainText("PLA");

    const viewport = await proof.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  } finally {
    await context.close();
  }
});
