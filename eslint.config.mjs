import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
      // Downgrade no-explicit-any from error to warning to allow gradual TypeScript migration
      // TODO: Systematically replace 'any' types with proper TypeScript types
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts and generated files:
    "public/assets/**",
    "dist/**",
    "*.dist",
    // Migration and script files:
    "migrations/**",
    "supabase/migrations/**",
    // Legacy/deprecated code:
    "ml-service/**",
    // Node.js scripts (not TypeScript):
    "**/*.js",
  ]),
]);

export default eslintConfig;
