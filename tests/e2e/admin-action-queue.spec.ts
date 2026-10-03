import { expect, test } from "@playwright/test";

test("admin overview and queue remain fail-closed without Clerk credentials", async ({
  page,
}) => {
  for (const path of ["/admin", "/admin/queue?group=orders"]) {
    // Browser navigation sends `Accept: text/html`, so the proxy answers with
    // the static Indonesian HTML 503 instead of the JSON error.
    const response = await page.goto(path);
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(503);
    expect(response?.headers()["content-type"]).toContain("text/html");
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");

    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Layanan autentikasi admin belum tersedia",
    );
    await expect(page.locator('main a[href="/"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Kembali ke beranda" })).toBeVisible();

    const body = page.locator("body");
    await expect(body).not.toContainText("AUTH_UNAVAILABLE");
    await expect(body).not.toContainText("CLERK");
    await expect(body).not.toContainText("Clerk");
    await expect(body).not.toContainText("Action Queue");
    await expect(body).not.toContainText("Development-only preview");
    await expect(body).not.toContainText("Tinjau brief proyek baru");
    await expect(body).not.toContainText("Periksa permintaan custom print");
    await expect(body).not.toContainText("Owner");
    await expect(body).not.toContainText("ADMIN");
  }
});

test("admin overview keeps the JSON 503 for non-HTML clients without Clerk credentials", async ({
  request,
}) => {
  const response = await request.get("/admin", {
    headers: { Accept: "application/json" },
  });

  expect(response.status()).toBe(503);
  expect(response.headers()["content-type"]).toContain("application/json");

  const body: unknown = await response.json();

  expect(body).toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
});
