import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      all: false,
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/infrastructure/database/entities/**",
        "src/server.ts",
        "src/config/database.ts",
      ],
    },
  },
});
