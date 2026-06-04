import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/application/services/__tests__/rag.service.test.ts",
      "src/infrastructure/vector/__tests__/chroma.repository.test.ts",
      "src/application/services/__tests__/knowledge-base-ingestion.service.test.ts",
      "src/application/prompts/__tests__/prompt-field-sanitizer.test.ts",
      "src/application/services/__tests__/chat.service.test.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      all: false,
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/server.ts",
        "src/config/database.ts"
      ],
    },
  },
});
