import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "unit",
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    clearMocks: true,
    restoreMocks: true,
    // p01-next-action-live-isolation, p03-proxy-classification and
    // p12-surface-structure exceeded the 5s default under full-suite load.
    // Timeout only; test content and numRuns are unchanged.
    testTimeout: 30_000,
  },
});
