import { defineConfig } from "vitest/config";
import path from "path";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname),
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    // Only run tests in these directories
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "components/**/*.test.tsx",
      "components/**/*.spec.tsx",
      "lib/**/*.test.ts"
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
});
