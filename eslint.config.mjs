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
    },
  },
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/modules/*/view/*"],
              message: "Routes must consume module public APIs instead of internal view files.",
            },
            {
              group: [
                "@/components/DestinationCard",
                "@/components/IntentConfirmationChips",
                "@/components/POIDrawer",
                "@/components/Header",
                "@/components/Footer",
              ],
              message: "Routes should import feature components via their module public-api entry point.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/src/modules/*/view/*",
                "@/src/modules/*/hooks/*",
                "@/src/modules/*/api/*",
              ],
              message: "Modules must reference other modules via their public API to preserve layering.",
            },
          ],
        },
      ],
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
