import { defineConfig } from "vitest/config";

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
  },
});
