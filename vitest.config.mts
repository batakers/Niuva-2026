import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // The jsdom coverage transform also visits mocked server modules. Resolve
    // Next's server-only marker to its server entry so they remain measurable.
    alias: {
      "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    name: "unit",
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...coverageConfigDefaults.exclude, "src/generated/**"],
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: ".local/coverage/unit",
    },
    // p01-next-action-live-isolation, p03-proxy-classification and
    // p12-surface-structure exceeded the 5s default under full-suite load.
    // Timeout only; test content and numRuns are unchanged.
    testTimeout: 30_000,
  },
});
