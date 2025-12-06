// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production or when explicitly enabled
  enabled: isProduction || process.env.SENTRY_DEBUG === 'true',

  // Environment tag for filtering in Sentry dashboard
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring
  // Sample 10% of transactions in production
  // Use 100% in development for easier debugging
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Debug mode - only when explicitly enabled
  debug: process.env.SENTRY_DEBUG === 'true',
});

