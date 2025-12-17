/**
 * Base URL utility for ChatGPT Apps SDK integration.
 * Detects the correct URL based on deployment environment.
 */
export const baseURL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://" +
      (process.env.VERCEL_ENV === "production"
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL || "www.urbanmanual.co"
        : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL || "www.urbanmanual.co");
