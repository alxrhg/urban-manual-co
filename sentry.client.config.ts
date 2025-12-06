// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production or when explicitly enabled
  enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',

  // Environment tag for filtering in Sentry dashboard
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring
  // Sample 10% of transactions in production for performance monitoring
  // Use 100% in development for easier debugging
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Debug mode - only in development
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',

  // Session Replay Configuration
  // Capture 100% of sessions with errors
  replaysOnErrorSampleRate: 1.0,

  // Sample 5% of all sessions in production (balance cost vs insight)
  // Use 100% in development
  replaysSessionSampleRate: isProduction ? 0.05 : 1.0,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text for privacy
      maskAllText: true,
      // Block all media for privacy and performance
      blockAllMedia: true,
      // Mask all inputs for privacy
      maskAllInputs: true,
    }),
  ],

  // Filter out noisy errors
  beforeSend(event) {
    // Ignore chunk loading errors (handled by Next.js retry)
    if (event.exception?.values?.[0]?.value?.includes('Loading chunk')) {
      return null;
    }
    // Ignore ResizeObserver errors (browser quirk, not actionable)
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null;
    }
    return event;
  },

  // Ignore specific URLs
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    // Safari extensions
    /^safari-extension:\/\//i,
    // Firefox extensions
    /^moz-extension:\/\//i,
  ],
});

