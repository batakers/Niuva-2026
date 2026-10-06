import { describe, expect, it } from "vitest";
import AdminLayout, { metadata } from "@/app/admin/layout";
describe("AdminLayout", () => {
  it("emits noindex/nofollow metadata for every admin page", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
  it("renders Admin content without a hosted identity provider", () => {
    expect(AdminLayout({ children: "admin-content" })).toBe("admin-content");
  });
});
