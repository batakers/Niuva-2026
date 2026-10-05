import { describe, expect, it } from "vitest";

import { resolveCustomerAvatar } from "../../src/lib/images/customer-avatar";

describe("resolveCustomerAvatar", () => {
  it("optimizes URLs that match the /a/** remote pattern", () => {
    const src = "https://lh3.googleusercontent.com/a/ACg8ocExample=s96-c";
    expect(resolveCustomerAvatar(src)).toEqual({ mode: "optimized", src });
  });

  it("skips the optimizer for Google hosts outside the pattern", () => {
    for (const src of [
      "https://lh3.googleusercontent.com/avatar.png",
      "https://lh3.googleusercontent.com/-abc/photo.jpg",
      "https://lh3.googleusercontent.com/a/ACg8oc=s96-c?sz=50",
      "https://lh3.googleusercontent.com:8443/a/ACg8oc",
      "https://a.b.googleusercontent.com/a/ACg8oc",
      "https://lh3.googleusercontent.com/a/",
    ]) {
      expect(resolveCustomerAvatar(src)).toEqual({ mode: "unoptimized", src });
    }
  });

  it("falls back to the initial avatar for unsafe or foreign URLs", () => {
    for (const src of [
      null,
      undefined,
      "",
      "not a url",
      "http://lh3.googleusercontent.com/a/x",
      "https://googleusercontent.com/a/x",
      "https://evil-googleusercontent.com/a/x",
      "https://lh3.googleusercontent.com.evil.test/a/x",
      "https://user:pw@lh3.googleusercontent.com/a/x",
      "https://example.com/a/x",
    ]) {
      expect(resolveCustomerAvatar(src)).toEqual({ mode: "none" });
    }
  });
});
