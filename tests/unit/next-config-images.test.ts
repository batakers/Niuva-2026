import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config images.remotePatterns", () => {
  const patterns = nextConfig.images?.remotePatterns ?? [];

  it("allows only one narrow https googleusercontent avatar pattern", () => {
    expect(patterns).toEqual([
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/a/**",
        search: "",
      },
    ]);
  });

  it("never uses a multi-level or implied wildcard", () => {
    for (const pattern of patterns) {
      if (pattern instanceof URL) throw new Error("Unexpected URL pattern");
      expect(pattern.hostname).not.toContain("**");
      expect(pattern.protocol).toBe("https");
      expect(pattern.pathname).not.toBe("/**");
    }
  });

  it("keeps the CSP img-src aligned with the image host", async () => {
    const { getSecurityHeaders } = await import("../../src/lib/security/headers");
    const csp = getSecurityHeaders().find(
      (header) => header.key === "Content-Security-Policy",
    )?.value;
    expect(csp).toContain("https://*.googleusercontent.com");
  });
});
