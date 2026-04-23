import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: [],
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"]
  }
});
