/**
 * Global Error Handler Component
 *
 * ZERO JANK POLICY: This component catches unhandled errors and promise
 * rejections that would otherwise crash the app or show raw error messages.
 *
 * Mount this component once at the root of your app (in layout.tsx) to ensure
 * all unhandled errors are logged to Sentry without exposing details to users.
 */

'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logging';
import { toast } from '@/lib/toast';

interface GlobalErrorHandlerProps {
  /** Show a toast when an unhandled error occurs */
  showToast?: boolean;
  /** Custom toast message */
  toastMessage?: string;
}

export function GlobalErrorHandler({
  showToast = false,
  toastMessage = 'Something went wrong. Please try again.',
}: GlobalErrorHandlerProps) {
  useEffect(() => {
    /**
     * Handle unhandled promise rejections
     * These occur when a Promise rejects without a .catch() handler
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent the default browser console error
      event.preventDefault();

      // Log to Sentry
      logger.error(
        'Unhandled promise rejection',
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          module: 'GlobalErrorHandler',
          tags: {
            type: 'unhandled_rejection',
          },
          extra: {
            reason: event.reason,
          },
        }
      );

      // Optionally show a toast
      if (showToast) {
        toast.safeError(event.reason, { fallback: toastMessage });
      }
    };

    /**
     * Handle uncaught errors
     * These are synchronous errors that bubble up to the window
     */
    const handleError = (event: ErrorEvent) => {
      // Don't handle errors that are already being handled by React Error Boundaries
      // React sets event.error.name to 'ChunkLoadError' for dynamic import failures
      if (event.error?.name === 'ChunkLoadError') {
        logger.warn('Chunk load error - user may need to refresh', {
          module: 'GlobalErrorHandler',
          extra: {
            filename: event.filename,
            message: event.message,
          },
        });

        if (showToast) {
          toast.error('A new version is available. Please refresh the page.');
        }
        return;
      }

      // Log to Sentry
      logger.error(
        'Uncaught error',
        event.error instanceof Error ? event.error : new Error(event.message),
        {
          module: 'GlobalErrorHandler',
          tags: {
            type: 'uncaught_error',
          },
          extra: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            message: event.message,
          },
        }
      );

      // Note: We don't show a toast for these because React Error Boundaries
      // should handle the UI feedback. This is just for logging.
    };

    /**
     * Handle resource load errors (images, scripts, etc.)
     * These don't trigger the error event, so we use a capture listener
     */
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;

      // Only handle certain element types
      if (
        target instanceof HTMLImageElement ||
        target instanceof HTMLScriptElement ||
        target instanceof HTMLLinkElement
      ) {
        const url =
          target instanceof HTMLImageElement
            ? target.src
            : target instanceof HTMLScriptElement
            ? target.src
            : (target as HTMLLinkElement).href;

        // Don't log errors for placeholder images or common CDN failures
        if (url && !url.includes('placeholder') && !url.includes('data:')) {
          logger.warn('Resource load error', {
            module: 'GlobalErrorHandler',
            tags: {
              type: 'resource_error',
              element: target.tagName.toLowerCase(),
            },
            extra: {
              url,
            },
          });
        }
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    window.addEventListener('error', handleResourceError, true); // Capture phase for resources

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('error', handleResourceError, true);
    };
  }, [showToast, toastMessage]);

  // This component doesn't render anything
  return null;
}

/**
 * Higher-order component to wrap a component with global error handling
 */
export function withGlobalErrorHandler<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: GlobalErrorHandlerProps
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithGlobalErrorHandler = (props: P) => (
    <>
      <GlobalErrorHandler {...options} />
      <WrappedComponent {...props} />
    </>
  );

  ComponentWithGlobalErrorHandler.displayName = `withGlobalErrorHandler(${displayName})`;

  return ComponentWithGlobalErrorHandler;
}
