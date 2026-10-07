import { describe, expect, it } from "vitest";
import { isPrivacyResponseUrl, parseOwnerPrivacyListQuery } from "@/modules/customer-privacy/validation";
describe("Privacy internal response destinations", () => {
  it.each(["/account/privacy?status=received", "/admin/privacy?status=updated", "/admin/privacy/7614b2eb-6e0c-4a27-9162-e94fb377ebd4?status=updated&returnTo=%2Fadmin%2Fprivacy"])("accepts the existing roots and exact UUID detail: %s", value => {
    expect(isPrivacyResponseUrl(value)).toBe(true);
  });
  it.each([undefined, ["/admin/privacy?status=updated"], "https://evil.test/admin/privacy?status=updated", "//evil.test/admin/privacy?status=updated", "/admin/orders?status=updated", "/admin/privacy/not-a-uuid?status=updated", "/admin/privacy/%2e%2e/orders?status=updated", "/admin\\privacy?status=updated", "/admin/privacy?status=updated\n"])("rejects foreign and wrong response paths: %s", value => {
    expect(isPrivacyResponseUrl(value)).toBe(false);
  });
  it("validates list status and pagination independently", () => {
    expect(parseOwnerPrivacyListQuery({ status: "IN_REVIEW", page: "3" })).toEqual({ page: 3, status: "IN_REVIEW" });
    expect(parseOwnerPrivacyListQuery({ status: ["OPEN"], page: "bad" })).toEqual({ page: 1 });
  });
});
