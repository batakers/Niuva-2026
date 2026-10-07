import { describe, expect, it } from "vitest";
import { buildAdminPageHref, normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";

describe("Admin return context", () => {
  it("preserves the originating root and its navigation query", () => {
    expect(normalizeAdminReturnTo("/admin/inquiries?status=NEW&page=3", "/admin/inquiries"))
      .toBe("/admin/inquiries?status=NEW&page=3");
  });
  it.each([undefined, ["/admin/orders"], "https://example.test/admin", "//example.test/admin", "/admin\\orders", "/admin\n", "/admin/%2e%2e/orders", "/admin/../admin/orders", "/admin/orders/record"])("rejects unsafe or non-root return targets: %s", (value) => {
    expect(normalizeAdminReturnTo(value, "/admin/orders")).toBe("/admin/orders");
  });
  it("strips nested context, unrelated query and fragment", () => {
    expect(normalizeAdminReturnTo("/admin/queue?group=orders&range=30d&returnTo=%2Fadmin&token=private#row", "/admin"))
      .toBe("/admin/queue?group=orders&range=30d");
    expect(normalizeAdminReturnTo("/admin/inquiries?type=RETAIL&status=wrong&page=bad", "/admin"))
      .toBe("/admin/inquiries");
  });
  it("keeps one root context through workspace and related links", () => {
    const href = withAdminReturnTo("/admin/custom-print/request/review?step=quote&returnTo=%2Fadmin", "/admin/queue?group=custom-print");
    const query = new URL(href, "https://niuva.test").searchParams;
    expect(query.get("step")).toBe("quote");
    expect(query.getAll("returnTo")).toEqual(["/admin/queue?group=custom-print"]);
  });
  it("preserves filters when paginating", () => {
    expect(buildAdminPageHref("/admin/orders", { status: "PAID", type: "RETAIL" }, 2))
      .toBe("/admin/orders?status=PAID&type=RETAIL&page=2");
  });
});
