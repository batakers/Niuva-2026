import { describe, expect, it } from "vitest";
import { adminListQueryParams, parseAdminListQuery } from "@/modules/admin/list-query";

describe("Admin list query", () => {
  it("validates filters independently and trims reference search", () => {
    expect(parseAdminListQuery("orders", { page: "2", q: "  ORD-42 ", status: "PAID", type: "RETAIL", publication: "draft" }))
      .toEqual({ page: 2, q: "ORD-42", status: "PAID", type: "RETAIL" });
  });
  it("ignores arrays, invalid enums and fields from another domain", () => {
    expect(parseAdminListQuery("inquiries", { page: ["3"], q: ["private"], status: "PAID", type: "RETAIL", extra: "x" }))
      .toEqual({ page: 1 });
    expect(parseAdminListQuery("custom-print", { status: "UNDER_REVIEW", page: "-1", q: "x".repeat(101) }))
      .toEqual({ page: 1, status: "UNDER_REVIEW" });
  });
  it("caps pagination and serializes only active filters", () => {
    expect(parseAdminListQuery("orders", { page: "999999" }).page).toBe(100_000);
    expect(adminListQueryParams({ page: 3, q: "ORD", status: "PAID" })).toEqual({ q: "ORD", status: "PAID" });
  });
  it("accepts publication only on management lists", () => {
    expect(parseAdminListQuery("products", { publication: "published", status: "NEW", q: " Print " })).toEqual({ page: 1, q: "Print", publication: "published" });
    expect(parseAdminListQuery("portfolio", { publication: ["draft"], type: "RETAIL" })).toEqual({ page: 1 });
  });
});
