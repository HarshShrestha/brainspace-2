import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/environment.ts"],
    // Integration suites share one MongoDB server per file; keep files isolated.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 120_000,
    coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/server.ts"] },
  },
});
