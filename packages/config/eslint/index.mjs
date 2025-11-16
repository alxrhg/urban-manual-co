import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: ["apps/web/"],
      },
    },
  },
  {
    files: ["services/**", "tests/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^ignored" }],
    },
  },
  globalIgnores([
    ".next/**",
    "apps/web/.next/**",
    "out/**",
    "build/**",
    "**/next-env.d.ts",
    "public/assets/**",
    "dist/**",
    "*.dist",
    "migrations/**",
    "supabase/migrations/**",
    "ml-service/**",
    "**/*.js",
  ]),
]);

export default config;
