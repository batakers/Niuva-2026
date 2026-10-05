import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    environment: "node",
    exclude: ["node_modules", ".next", "tests/e2e/**", "tests/unit/**"],
    include: ["tests/backend/**/*.{test,spec}.ts"],
    name: "backend",
    restoreMocks: true,
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...coverageConfigDefaults.exclude, "src/generated/**"],
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: ".local/coverage/backend",
    },
  },
});
