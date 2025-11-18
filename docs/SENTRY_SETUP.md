# Sentry Setup

This guide explains how Sentry error tracking and monitoring is configured in Urban Manual.

## Overview

Sentry is integrated to track errors, monitor performance, and provide session replay for debugging issues in production.

## Environment Variables

The following environment variables are required (automatically set by Vercel Sentry integration):

- `NEXT_PUBLIC_SENTRY_DSN` - Your Sentry DSN (Data Source Name)
- `SENTRY_ORG` - Your Sentry organization slug (for source maps)
- `SENTRY_PROJECT` - Your Sentry project name (for source maps)
- `SENTRY_AUTH_TOKEN` - Sentry auth token (for uploading source maps during build)

## Features Enabled

### 1. Error Tracking
- Automatic error capture from:
  - Unhandled exceptions
  - React error boundaries
  - API route errors
  - Edge runtime errors

### 2. Performance Monitoring
- Transaction tracing (10% sample rate in production)
- API route performance
- Page load performance
- Database query performance

### 3. Session Replay
- Session replay for errors (100% of error sessions)
- Session replay sampling (10% of all sessions)
- Text and media masking enabled for privacy

### 4. Source Maps
- Automatic source map upload during build
- Prettier stack traces in production
- Hidden from client bundles for security

## Configuration Files

- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration
- `instrumentation.ts` - Next.js instrumentation hook

## Error Filtering

Sentry is configured to ignore:
- Browser extension errors
- Network errors that are expected (ECONNREFUSED, ETIMEDOUT, etc.)
- Chrome/Safari extension URLs
- Known non-critical errors

## Vercel Integration

If you installed the Vercel Sentry integration:

1. Environment variables are automatically configured
2. Source maps are uploaded during build
3. Vercel Cron Monitors are automatically instrumented
4. Error tracking is enabled for all environments

## Manual Setup

If you need to set up manually:

1. Create a Sentry project at https://sentry.io
2. Get your DSN from Project Settings → Client Keys (DSN)
3. Add environment variables in Vercel:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG` (optional, for source maps)
   - `SENTRY_PROJECT` (optional, for source maps)
   - `SENTRY_AUTH_TOKEN` (optional, for source maps)
4. Deploy to Vercel

## Using Sentry in Code

### Capture Exceptions

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Add Context

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: user.id,
  email: user.email,
});

Sentry.setContext('destination', {
  slug: destination.slug,
  city: destination.city,
});
```

### Custom Transactions

```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  name: 'Process Destination',
  op: 'task',
});

// Your code

transaction.finish();
```

## Monitoring Tunnel

Sentry uses a monitoring tunnel route (`/monitoring`) to circumvent ad-blockers. This route is automatically configured and doesn't require any additional setup.

## Troubleshooting

### Errors Not Appearing in Sentry

- Check that `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- Verify the DSN is valid in Sentry dashboard
- Check browser console for Sentry initialization errors
- Ensure CSP headers allow Sentry domains

### Source Maps Not Working

- Verify `SENTRY_ORG` and `SENTRY_PROJECT` are set
- Check that `SENTRY_AUTH_TOKEN` has correct permissions
- Review build logs for source map upload errors
- Ensure source maps are enabled in Sentry project settings

### High Volume of Events

- Adjust `tracesSampleRate` in config files (currently 10% in production)
- Adjust `replaysSessionSampleRate` (currently 10%)
- Review and update `ignoreErrors` list
- Add more specific error filtering

## Best Practices

1. **Don't log sensitive data**: Sentry automatically filters common sensitive fields
2. **Use appropriate sample rates**: Lower sample rates in production to reduce costs
3. **Filter known errors**: Add expected errors to `ignoreErrors` list
4. **Set user context**: Always set user context when available for better debugging
5. **Review alerts**: Set up alerts for critical errors in Sentry dashboard

