import type { NextConfig } from "next";
import { getSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Allow the current LAN origin for real-device development checks.
  allowedDevOrigins: ["192.168.1.11"],
  async headers() {
    return [
      {
        headers: getSecurityHeaders(),
        source: "/:path*",
      },
    ];
  },
};

export default nextConfig;
