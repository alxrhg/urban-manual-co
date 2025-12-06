/**
 * Production-ready logging utility
 *
 * Features:
 * - Environment-aware: Only logs in development unless explicitly enabled
 * - Structured logging with consistent prefixes
 * - Sentry integration for error reporting in production
 * - Type-safe log levels
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Failed to fetch', error);
 *   logger.warn('Deprecated API used');
 *   logger.debug('Debug info'); // Only in development
 */

import * as Sentry from '@sentry/nextjs'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Enable verbose logging in production with this env var
const enableProductionLogs = process.env.ENABLE_PRODUCTION_LOGS === 'true'

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${level.toUpperCase()}]`
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `${prefix} ${timestamp} ${message}${contextStr}`
}

function shouldLog(level: LogLevel): boolean {
  // Always log errors
  if (level === 'error') return true

  // In development, log everything
  if (isDevelopment) return true

  // In production, only log if explicitly enabled
  if (isProduction && enableProductionLogs) return level !== 'debug'

  // In production without explicit logging, only log warnings and above
  if (isProduction) return level === 'warn' || level === 'error'

  return false
}

export const logger = {
  /**
   * Debug-level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context))
    }
  },

  /**
   * Info-level logging
   */
  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context))
    }
  },

  /**
   * Warning-level logging
   */
  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context))
    }
    // Add breadcrumb in Sentry for production
    if (isProduction) {
      Sentry.addBreadcrumb({
        category: 'warning',
        message,
        level: 'warning',
        data: context,
      })
    }
  },

  /**
   * Error-level logging with Sentry integration
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const formattedMessage = formatMessage('error', message, context)
    console.error(formattedMessage, error)

    // Report to Sentry in production
    if (isProduction && error instanceof Error) {
      Sentry.captureException(error, {
        extra: {
          message,
          ...context,
        },
      })
    } else if (isProduction) {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: {
          error,
          ...context,
        },
      })
    }
  },

  /**
   * API request logging helper
   */
  api(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, context)
  },

  /**
   * Performance timing helper
   */
  time(label: string): () => void {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.debug(`${label} completed`, { duration: `${duration.toFixed(2)}ms` })
    }
  },
}

/**
 * Console override for gradual migration
 * Wraps console.log to respect production settings
 *
 * Note: This is optional and can be used during migration
 * to reduce logging in production without changing all call sites.
 */
export function createProductionConsole() {
  if (typeof window === 'undefined') return

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }

  if (isProduction && !enableProductionLogs) {
    console.log = () => {}
    console.debug = () => {}
    // Keep warn and error active
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  }

  return originalConsole
}
