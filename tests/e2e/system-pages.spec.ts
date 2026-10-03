import { expect, test, type Page } from "@playwright/test";

const ROOT_NOT_FOUND_TITLE = "Halaman ini tidak tersedia.";
const STOCK_DETAIL_PATH =
  "/admin/products/11111111-1111-4111-8111-111111111111/stock/22222222-2222-4222-8222-222222222222";

/** `v1.<base64url(uuid)>.<secret>`: well-formed, but no record exists for it. */
function absentButWellFormedToken(uuid: string, secret: string): string {
  return `v1.${Buffer.from(uuid, "utf8").toString("base64url")}.${secret}`;
}

/** Serialized DOM without <script> payloads (framework flight data is not page content). */
async function visibleDomSnapshot(page: Page): Promise<string> {
  return page.evaluate(() => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script").forEach((node) => node.remove());
    return clone.outerHTML;
  });
}

async function expectRootNotFound(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ROOT_NOT_FOUND_TITLE);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Kembali ke beranda" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lihat Shop" })).toBeVisible();
}

test.describe("Root_Not_Found", () => {
  test("unmatched URL returns 404 with the branded page and echoes nothing", async ({ page }) => {
    const randomSegment = "rute-acak-7f3a9c41";
    const response = await page.goto(`/${randomSegment}/lainnya?token=rahasia-12345`);

    expect(response?.status()).toBe(404);
    await expectRootNotFound(page);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );

    const dom = await visibleDomSnapshot(page);
    expect(dom).not.toContain(randomSegment);
    expect(dom).not.toContain("rahasia-12345");
    expect(await page.title()).not.toContain(randomSegment);
  });

  test("one Tab from load lands on the home recovery action", async ({ page }) => {
    await page.goto("/rute-acak-tab-5d2e");

    // The focus target moves focus to the heading on mount; wait for hydration.
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Kembali ke beranda" })).toBeFocused();
  });

  test("/services/tidak-ada returns 404 with Root_Not_Found", async ({ page }) => {
    const response = await page.goto("/services/tidak-ada");

    expect(response?.status()).toBe(404);
    await expectRootNotFound(page);
  });

  test("/custom-print/requests/<invalid token> returns 404 with Root_Not_Found", async ({
    page,
  }) => {
    const token = "token-tidak-valid-c81b";
    const response = await page.goto(`/custom-print/requests/${token}`);

    expect(response?.status()).toBe(404);
    await expectRootNotFound(page);
    expect(await visibleDomSnapshot(page)).not.toContain(token);
    expect(await page.title()).not.toContain(token);
  });
});

test.describe("token pages do not reveal whether a token exists", () => {
  for (const base of ["/quote", "/orders"] as const) {
    test(`${base}/<invalid token> returns 404 with identical main content`, async ({ page }) => {
      const tokens = ["token-salah-satu-a1f3", "v1.bukan-base64.rahasia-b7d2"];
      const mains: string[] = [];

      for (const token of tokens) {
        const response = await page.goto(`${base}/${token}`);

        expect(response?.status(), token).toBe(404);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("main#main-content")).toHaveCount(1);
        await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
          "content",
          /noindex/,
        );

        const dom = await visibleDomSnapshot(page);
        expect(dom, token).not.toContain(token);
        expect(await page.title(), token).not.toContain(token);
        mains.push(await page.locator("main#main-content").innerHTML());
      }

      expect(mains[0]).toBe(mains[1]);
    });
  }

  test("well-formed but absent tokens also end in a non-revealing 404", async ({ page }) => {
    const uuid = "33333333-3333-4333-8333-333333333333";
    const secret = "rahasia-tidak-ada-e94c";
    const token = absentButWellFormedToken(uuid, secret);

    for (const path of [`/quote/${token}`, `/orders/${token}`, `/custom-print/requests/${token}`]) {
      const response = await page.goto(path);

      // Reaching a 404 here needs the test database; without it the page shows
      // its "service unavailable" state instead, which is not the contract under test.
      test.skip(
        response?.status() !== 404,
        `Test database unavailable: ${path} did not reach the repository lookup.`,
      );

      const dom = await visibleDomSnapshot(page);
      expect(dom, path).not.toContain(secret);
      expect(dom, path).not.toContain(uuid);
      expect(await page.title(), path).not.toContain(secret);
    }
  });
});

test.describe("Admin proxy HTML 503 for browser navigation", () => {
  for (const path of ["/admin", "/admin/queue?group=orders", STOCK_DETAIL_PATH]) {
    test(`${path} returns the static HTML 503`, async ({ request }, testInfo) => {
      const response = await request.get(path, { headers: { Accept: "text/html" } });
      const headers = response.headers();

      expect(response.status()).toBe(503);
      expect(headers["content-type"]).toContain("text/html");
      expect(headers["content-type"]).toContain("charset=utf-8");
      expect(headers["cache-control"]).toContain("no-store");
      expect(headers["x-robots-tag"]).toBe("noindex, nofollow");

      const body = await response.text();
      expect(body).toContain("Layanan autentikasi admin belum tersedia");
      expect(body).not.toContain("AUTH_UNAVAILABLE");
      expect(body).not.toContain("Clerk");
      expect(body).not.toContain("CLERK");

      // Information only (design "Risiko" 3): whether next.config.ts headers
      // also reach proxy-generated responses in this environment.
      testInfo.annotations.push({
        type: "info",
        description: `next.config headers on proxy response: content-security-policy=${
          headers["content-security-policy"] === undefined ? "absent" : "present"
        }, x-content-type-options=${headers["x-content-type-options"] ?? "absent"}`,
      });
    });
  }
});
