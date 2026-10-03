import { expect, test } from "@playwright/test";

test("admin routes fail closed without Clerk credentials", async ({ page }) => {
  for (const path of [
    "/admin",
    "/admin/sign-in",
    "/admin/products/11111111-1111-4111-8111-111111111111/stock/22222222-2222-4222-8222-222222222222",
  ]) {
    // Browser navigation sends `Accept: text/html`, so the proxy answers with
    // the static Indonesian HTML 503 instead of the JSON error.
    const response = await page.goto(path);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(503);
    expect(response?.headers()["content-type"]).toContain("text/html");
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Layanan autentikasi admin belum tersedia",
    );
    await expect(page.locator('main a[href="/"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Kembali ke beranda" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("AUTH_UNAVAILABLE");
    await expect(page.locator("body")).not.toContainText("CLERK");
    await expect(page.locator("body")).not.toContainText("Clerk");
    await expect(page.locator("body")).not.toContainText("Development-only preview");
    await expect(page.locator("body")).not.toContainText("Tindakan yang perlu ditinjau.");
    await expect(page.locator("body")).not.toContainText("Area operasional Niuva");
  }
});

test("admin API requests keep the JSON 503 without Clerk credentials", async ({
  request,
}) => {
  // `/api` paths are always API traffic, even when the client asks for HTML.
  const response = await request.get("/api/admin/privacy", {
    headers: { Accept: "text/html" },
  });

  expect(response.status()).toBe(503);
  expect(response.headers()["content-type"]).toContain("application/json");

  const body: unknown = await response.json();

  expect(body).toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
});
