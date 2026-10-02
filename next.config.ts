import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  distDir: process.env.NIUVA_NEXT_DIST_DIR ?? ".next",
  outputFileTracingIncludes: { "/admin/privacy/policy": ["./docs/legal/customer-terms-draft.md", "./docs/legal/customer-privacy-draft.md"] },
  logging: { incomingRequests: { ignore: [/\/account\/privacy\/confirm(?:\?|$)/, /\/(?:verify-email|reset-password)(?:\?|$)/, /\/api\/auth\/google\/callback(?:\?|$)/] } },
  // Allow the current LAN origin for real-device development checks.
  allowedDevOrigins: ["192.168.1.11"],
  async headers() {
    return [
      {
        headers: getSecurityHeaders(),
        source: "/:path*",
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
