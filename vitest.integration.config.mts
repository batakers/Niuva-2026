import { defineConfig } from "vitest/config";

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
  },
});
