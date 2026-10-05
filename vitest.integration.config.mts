import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    environment: "node",
    fileParallelism: false,
    include: ["tests/integration/**/*.{test,spec}.ts"],
    name: "integration",
    restoreMocks: true,
    setupFiles: ["tests/integration/setup.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [...coverageConfigDefaults.exclude, "src/generated/**"],
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: ".local/coverage/integration",
    },
  },
});
