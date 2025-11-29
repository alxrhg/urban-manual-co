/**
 * Logging Utilities
 *
 * Standardized logging with Sentry integration for error tracking.
 * Provides consistent logging patterns across the application.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Log levels for categorizing messages
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Fatal = 'fatal',
}

/**
 * Log context for additional metadata
 */
interface LogContext {
  /** Component or module name */
  module?: string;
  /** User ID if available */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional custom data */
  extra?: Record<string, unknown>;
  /** Tags for filtering */
  tags?: Record<string, string>;
}

/**
 * Check if we're in development mode
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Check if Sentry is configured
 */
const isSentryConfigured = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Format log message with context
 */
function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const module = context?.module ? `[${context.module}]` : '';
  const requestId = context?.requestId ? `(${context.requestId})` : '';

  return `${timestamp} ${level.toUpperCase()} ${module}${requestId} ${message}`;
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
) {
  const formattedMessage = formatMessage(level, message, context);

  // Console output in development
  if (isDevelopment) {
    switch (level) {
      case LogLevel.Debug:
        console.debug(formattedMessage, context?.extra);
        break;
      case LogLevel.Info:
        console.info(formattedMessage, context?.extra);
        break;
      case LogLevel.Warn:
        console.warn(formattedMessage, context?.extra);
        break;
      case LogLevel.Error:
      case LogLevel.Fatal:
        console.error(formattedMessage, error || context?.extra);
        break;
    }
  }

  // Sentry integration for production
  if (isSentryConfigured && level !== LogLevel.Debug) {
    // Set user context if available
    if (context?.userId) {
      Sentry.setUser({ id: context.userId });
    }

    // Set tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        Sentry.setTag(key, value);
      });
    }

    // Set extra context
    if (context?.extra) {
      Sentry.setContext('extra', context.extra);
    }

    if (level === LogLevel.Error || level === LogLevel.Fatal) {
      if (error) {
        Sentry.captureException(error, {
          level: level === LogLevel.Fatal ? 'fatal' : 'error',
          extra: context?.extra,
        });
      } else {
        Sentry.captureMessage(message, {
          level: level === LogLevel.Fatal ? 'fatal' : 'error',
          extra: context?.extra,
        });
      }
    } else {
      // Log breadcrumb for non-error messages
      Sentry.addBreadcrumb({
        category: context?.module || 'app',
        message,
        level: level as Sentry.SeverityLevel,
        data: context?.extra,
      });
    }
  }
}

/**
 * Logger object with convenience methods
 */
export const logger = {
  /**
   * Debug level logging (development only)
   */
  debug: (message: string, context?: LogContext) => {
    log(LogLevel.Debug, message, context);
  },

  /**
   * Info level logging
   */
  info: (message: string, context?: LogContext) => {
    log(LogLevel.Info, message, context);
  },

  /**
   * Warning level logging
   */
  warn: (message: string, context?: LogContext) => {
    log(LogLevel.Warn, message, context);
  },

  /**
   * Error level logging
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const err = error instanceof Error ? error : undefined;
    const ctx = error instanceof Error ? context : (error as LogContext);
    log(LogLevel.Error, message, ctx, err);
  },

  /**
   * Fatal level logging (critical errors)
   */
  fatal: (message: string, error?: Error, context?: LogContext) => {
    log(LogLevel.Fatal, message, context, error);
  },

  /**
   * Create a child logger with preset context
   */
  child: (defaultContext: LogContext) => ({
    debug: (message: string, context?: LogContext) => {
      log(LogLevel.Debug, message, { ...defaultContext, ...context });
    },
    info: (message: string, context?: LogContext) => {
      log(LogLevel.Info, message, { ...defaultContext, ...context });
    },
    warn: (message: string, context?: LogContext) => {
      log(LogLevel.Warn, message, { ...defaultContext, ...context });
    },
    error: (message: string, error?: Error, context?: LogContext) => {
      log(LogLevel.Error, message, { ...defaultContext, ...context }, error);
    },
    fatal: (message: string, error?: Error, context?: LogContext) => {
      log(LogLevel.Fatal, message, { ...defaultContext, ...context }, error);
    },
  }),

  /**
   * Start a performance measurement
   */
  startTimer: (name: string, context?: LogContext) => {
    const start = performance.now();
    return {
      end: (additionalContext?: LogContext) => {
        const duration = performance.now() - start;
        log(LogLevel.Info, `${name} completed in ${duration.toFixed(2)}ms`, {
          ...context,
          ...additionalContext,
          extra: {
            ...context?.extra,
            ...additionalContext?.extra,
            duration,
          },
        });
        return duration;
      },
    };
  },

  /**
   * Log API request
   */
  apiRequest: (
    method: string,
    path: string,
    context?: LogContext
  ) => {
    log(LogLevel.Info, `${method} ${path}`, {
      ...context,
      tags: { ...context?.tags, type: 'api_request' },
    });
  },

  /**
   * Log API response
   */
  apiResponse: (
    method: string,
    path: string,
    status: number,
    duration?: number,
    context?: LogContext
  ) => {
    const level = status >= 500 ? LogLevel.Error : status >= 400 ? LogLevel.Warn : LogLevel.Info;
    log(level, `${method} ${path} ${status}${duration ? ` (${duration.toFixed(2)}ms)` : ''}`, {
      ...context,
      tags: { ...context?.tags, type: 'api_response', status: String(status) },
    });
  },
};

/**
 * Request ID generator for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Wrap async function with error logging
 */
export function withLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: LogContext
): T {
  return (async (...args: Parameters<T>) => {
    const timer = logger.startTimer(context.module || 'operation', context);
    try {
      const result = await fn(...args);
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      logger.error(
        `Error in ${context.module || 'operation'}`,
        error as Error,
        context
      );
      throw error;
    }
  }) as T;
}
