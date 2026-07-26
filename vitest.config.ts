import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [".repos/**", "node_modules/**"],
    include: ["test/**/*.test.ts"],
  },
});
