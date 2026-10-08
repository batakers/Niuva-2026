import type { NextConfig } from "next";
import { getDevAllowedOrigins } from "./src/lib/env/dev-origins";
import {
  getServerActionsAllowedOrigins,
  getServerActionsOriginsWarning,
} from "./src/lib/env/server-actions-origins";
import {
  getNonCspSecurityHeaders,
  getStaticContentSecurityPolicyHeader,
  STATIC_CSP_SOURCE,
} from "./src/lib/security/headers";

// Empty (same-origin only) when APP_URL is unusable; never throws at config load.
const serverActionsOriginsWarning = getServerActionsOriginsWarning();

if (serverActionsOriginsWarning !== null) {
  console.warn(serverActionsOriginsWarning);
}

const nextConfig: NextConfig = {
  distDir: process.env.NIUVA_NEXT_DIST_DIR ?? ".next",
  outputFileTracingIncludes: { "/admin/privacy/policy": ["./docs/legal/customer-terms-draft.md", "./docs/legal/customer-privacy-draft.md"], "/api/admin/invoices/*/pdf": ["./src/modules/finance/pdf-assets/SpaceGrotesk.ttf", "./src/modules/finance/pdf-assets/OFL.txt"] },
  logging: { incomingRequests: { ignore: [/\/account\/privacy\/confirm(?:\?|$)/, /\/(?:verify-email|reset-password)(?:\?|$)/, /\/api\/auth\/google\/callback(?:\?|$)/] } },
  // Dev-server only (`next dev`); empty unless NIUVA_DEV_ALLOWED_ORIGINS lists
  // hosts for real-device checks. Relative import: "@/" is not available here.
  allowedDevOrigins: getDevAllowedOrigins(),
  // Customer avatars from Google sign-in only. `*` matches a single subdomain
  // (e.g. lh3), never `**`; https only; no port or query string; path limited to
  // the `/a/` avatar namespace so the optimizer cannot proxy arbitrary images.
  // Must stay aligned with img-src in src/lib/security (CSP).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/a/**",
        search: "",
      },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: getServerActionsAllowedOrigins() },
  },
  // `?preview=` scenarios are served by internal dynamic routes so the public
  // `/projects*` and `/shop*` routes never read `searchParams` and can be cached (Req 16.1,
  // render-strategy.md note A). Only requests that carry the parameter are
  // rewritten; the browser URL does not change.
  async rewrites() {
    return {
      beforeFiles: [
        {
          has: [{ type: "query", key: "preview" }],
          destination: "/preview/projects",
          source: "/projects",
        },
        {
          has: [{ type: "query", key: "preview" }],
          destination: "/preview/projects/:slug",
          source: "/projects/:slug",
        },
        {
          has: [{ type: "query", key: "preview" }],
          destination: "/preview/shop",
          source: "/shop",
        },
        {
          has: [{ type: "query", key: "preview" }],
          destination: "/preview/shop/:slug",
          source: "/shop/:slug",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        // Every security header except the CSP, on all routes.
        headers: getNonCspSecurityHeaders(),
        source: "/:path*",
      },
      {
        // Static CSP for routes the nonce proxy does not own. /checkout and
        // /account get their CSP only from src/proxy.ts.
        headers: [getStaticContentSecurityPolicyHeader()],
        source: STATIC_CSP_SOURCE,
      },
      {
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
        source: "/custom-print/requests/:token",
      },
      {
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          // Native POST must retain its same-origin Origin header; no-referrer
          // makes browsers send Origin:null. External sites receive no referrer.
          { key: "Referrer-Policy", value: "same-origin" },
        ],
        source: "/account/:path*",
      },
    ];
  },
};

export default nextConfig;
