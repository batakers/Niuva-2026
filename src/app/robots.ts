import type { MetadataRoute } from "next";

import { resolveCustomerAppOrigin } from "@/modules/customer-auth/app-origin";

// Internal, private, and test-only prefixes (Req 16.7). Mirrors the routes the
// sitemap omits. Token pages (`/orders/[token]`, `/quote/[token]`) are listed
// by prefix only; no token value or route detail is disclosed. `robots.txt` is
// advisory, so these routes also carry their own `noindex`/auth protection.
const DISALLOWED_PATHS = [
  "/admin",
  "/api",
  "/account",
  "/checkout",
  "/cart",
  "/preview",
  "/internal-testing",
  "/auth-test-policy",
  "/demo",
  "/orders",
  "/quote",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = {
    userAgent: "*",
    allow: "/",
    disallow: [...DISALLOWED_PATHS],
  };

  // Never guess an origin: without a valid canonical origin the sitemap URL
  // is omitted rather than invented, and the build must still succeed.
  const resolved = resolveCustomerAppOrigin(process.env);

  if (!resolved.ok) {
    return { rules };
  }

  return {
    rules,
    sitemap: new URL("/sitemap.xml", resolved.origin).toString(),
  };
}
