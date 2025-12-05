'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logging';
import { sanitizeError } from '@/lib/errors/sanitize';

interface Props {
  children: ReactNode;
  /** Custom fallback UI to display on error */
  fallback?: ReactNode;
  /** Name of the feature/component for error tracking */
  featureName?: string;
  /** Whether to show a compact inline error instead of full-page */
  inline?: boolean;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom recovery action instead of reload */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  eventId?: string;
}

/**
 * Error Boundary Component
 *
 * ZERO JANK POLICY: This component ensures users never see raw error messages.
 * All errors are sanitized and logged to Sentry for debugging.
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With feature name for better error tracking
 * <ErrorBoundary featureName="TripPlanner">
 *   <TripPlannerComponent />
 * </ErrorBoundary>
 *
 * @example
 * // Inline variant for smaller sections
 * <ErrorBoundary inline featureName="RecommendationsWidget">
 *   <RecommendationsWidget />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { featureName, onError } = this.props;

    // Log to Sentry via our logging utility
    logger.error(
      `React Error Boundary caught error${featureName ? ` in ${featureName}` : ''}`,
      error,
      {
        module: 'ErrorBoundary',
        extra: {
          componentStack: errorInfo.componentStack,
          featureName,
        },
        tags: {
          type: 'react_error_boundary',
          feature: featureName || 'unknown',
        },
      }
    );

    // Call optional error callback
    onError?.(error, errorInfo);
  }

  handleReset = () => {
    const { onReset } = this.props;

    if (onReset) {
      // Use custom reset function
      this.setState({ hasError: false, error: undefined });
      onReset();
    } else {
      // Default: reload the page
      this.setState({ hasError: false, error: undefined });
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { featureName, inline } = this.props;

      // Inline variant for smaller sections
      if (inline) {
        return (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {featureName ? `${featureName} couldn't load` : 'Something went wrong'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Please try again or refresh the page.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleReset}
              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        );
      }

      // Full-page error state (default)
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          {/* Icon */}
          <div className="mb-6 p-6 rounded-full bg-red-100 dark:bg-red-950/30">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {featureName ? `${featureName} ran into a problem` : 'Something went wrong'}
          </h1>

          {/* Description - NEVER show raw error messages */}
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-2">
            We've been notified and are working on a fix. Please try again or return to the homepage.
          </p>

          {/* Show sanitized error in development only */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-2 mb-4 text-left w-full max-w-md">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Developer info (hidden in production)
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-32">
                {sanitizeError(this.state.error)}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button onClick={this.handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            <Button variant="outline" onClick={this.handleGoHome}>
              <Home className="w-4 h-4 mr-2" />
              Go to homepage
            </Button>
          </div>

          {/* Help link */}
          <a
            href="mailto:hello@urbanmanual.co?subject=Error Report"
            className="mt-6 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            Need help? Contact support
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to wrap a component in an error boundary
 * Useful for functional components that need error boundary behavior
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary featureName={displayName} {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

