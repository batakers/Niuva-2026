import { expect, test } from "@playwright/test";

/**
 * Task 5.23 (Req 12.5). A Server Action is a POST to the route that renders it.
 * Action ids are opaque, so a valid one cannot be forged; these requests use a
 * bogus id and prove that an unauthenticated POST to admin routes reaches no
 * action and leaves no data change. The real protection for a valid id is the
 * service-layer authorization (tests/unit/server-actions-authorization.test.ts
 * and tests/integration/server-actions-direct-post.test.ts).
 *
 * The e2e server has no Clerk credentials, so the proxy fails closed with 503.
 */
const ROUTES = [
  "/admin",
  "/admin/pricing",
  "/admin/orders/11111111-1111-4111-8111-111111111111",
  "/admin/products/11111111-1111-4111-8111-111111111111",
  "/admin/inquiries/11111111-1111-4111-8111-111111111111",
];

for (const route of ROUTES) {
  test(`unauthenticated Next-Action POST to ${route} is denied`, async ({ request }) => {
    const response = await request.post(route, {
      headers: {
        Accept: "text/x-component",
        "Content-Type": "application/x-www-form-urlencoded",
        "Next-Action": "0000000000000000000000000000000000000000ff",
      },
      data: "1_orderId=11111111-1111-4111-8111-111111111111&1_nextStatus=CANCELLED",
      maxRedirects: 0,
    });

    expect(response.status()).toBe(503);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(await response.json()).toMatchObject({ error: { code: "AUTH_UNAVAILABLE" } });
  });
}

test("a plain POST without Next-Action to an admin route is denied", async ({ request }) => {
  const response = await request.post("/admin/pricing", {
    form: { confirmation: "I_UNDERSTAND_NON_PRODUCTION" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(503);
  expect(response.status()).not.toBe(200);
});
