import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  distDir: process.env.NIUVA_NEXT_DIST_DIR ?? ".next",
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
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
        source: "/account/:path*",
      },
    ];
  },
};

export default nextConfig;
