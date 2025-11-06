/**
 * Structured Logging Utility using Pino
 *
 * Features:
 * - Automatic sensitive data redaction
 * - JSON output in production, pretty print in development
 * - Request/response correlation
 * - Performance timing
 * - Type-safe logging
 */

import pino from 'pino';

// Sensitive field patterns to redact
const SENSITIVE_PATHS = [
  // Authentication
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',

  // Secrets and tokens
  '*.password',
  '*.token',
  '*.apiKey',
  '*.api_key',
  '*.secret',
  '*.accessToken',
  '*.refreshToken',
  '*.access_token',
  '*.refresh_token',

  // Personal information
  '*.ssn',
  '*.creditCard',
  '*.credit_card',
  '*.cvv',
  '*.pin',

  // Supabase
  '*.SUPABASE_SERVICE_ROLE_KEY',
  '*.supabaseServiceRoleKey',

  // API keys
  '*.OPENAI_API_KEY',
  '*.GOOGLE_AI_API_KEY',
  '*.MAPKIT_PRIVATE_KEY',
];

/**
 * Create Pino logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Redact sensitive fields
  redact: {
    paths: SENSITIVE_PATHS,
    censor: '[REDACTED]',
  },

  // Base context (always included)
  base: {
    env: process.env.NODE_ENV,
    service: 'urban-manual',
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development (only if not in browser)
  ...(process.env.NODE_ENV !== 'production' && typeof window === 'undefined'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }
    : {}),
});

/**
 * Log levels for type safety
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Create child logger with context
 * Useful for tracking requests across operations
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * API request logger
 * Logs incoming requests with important metadata
 */
export function logRequest(req: {
  method?: string;
  url?: string;
  headers?: any;
  userId?: string;
  ip?: string;
}) {
  logger.info({
    type: 'request',
    method: req.method,
    url: req.url,
    userId: req.userId,
    ip: req.ip || req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'],
    userAgent: req.headers?.['user-agent'],
  }, 'Incoming request');
}

/**
 * API response logger
 */
export function logResponse(
  req: { method?: string; url?: string },
  res: { statusCode?: number },
  duration: number
) {
  const level = res.statusCode && res.statusCode >= 500 ? 'error' :
                res.statusCode && res.statusCode >= 400 ? 'warn' : 'info';

  logger[level]({
    type: 'response',
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration,
  }, `Request completed in ${duration}ms`);
}

/**
 * Error logger with stack trace
 */
export function logError(
  error: Error | unknown,
  context?: Record<string, any>
) {
  if (error instanceof Error) {
    logger.error({
      type: 'error',
      err: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    }, error.message);
  } else {
    logger.error({
      type: 'error',
      error: String(error),
      ...context,
    }, 'Unknown error occurred');
  }
}

/**
 * Database query logger
 */
export function logQuery(
  query: string,
  duration: number,
  rowCount?: number,
  error?: Error
) {
  if (error) {
    logger.error({
      type: 'database',
      query,
      duration,
      error: error.message,
    }, 'Database query failed');
  } else {
    logger.debug({
      type: 'database',
      query,
      duration,
      rowCount,
    }, `Query executed in ${duration}ms`);
  }
}

/**
 * Security event logger
 * For tracking authentication, authorization, and suspicious activity
 */
export function logSecurityEvent(
  event: string,
  details: {
    userId?: string;
    ip?: string;
    action?: string;
    resource?: string;
    success?: boolean;
    reason?: string;
  }
) {
  const level = details.success === false ? 'warn' : 'info';

  logger[level]({
    type: 'security',
    event,
    ...details,
  }, `Security event: ${event}`);
}

/**
 * Rate limit logger
 */
export function logRateLimit(
  identifier: string,
  endpoint: string,
  exceeded: boolean
) {
  if (exceeded) {
    logger.warn({
      type: 'rate_limit',
      identifier,
      endpoint,
      exceeded,
    }, `Rate limit exceeded: ${identifier} on ${endpoint}`);
  } else {
    logger.debug({
      type: 'rate_limit',
      identifier,
      endpoint,
      exceeded,
    }, 'Rate limit check passed');
  }
}

/**
 * Performance timer
 * Usage:
 * ```
 * const timer = startTimer();
 * // ... do work
 * timer.done('Operation completed');
 * ```
 */
export function startTimer() {
  const start = Date.now();

  return {
    done: (message: string, context?: Record<string, any>) => {
      const duration = Date.now() - start;
      logger.debug({
        type: 'performance',
        duration,
        ...context,
      }, `${message} (${duration}ms)`);
      return duration;
    },
  };
}

/**
 * External API call logger
 */
export function logExternalAPI(
  service: string,
  method: string,
  endpoint: string,
  duration: number,
  statusCode?: number,
  error?: Error
) {
  if (error) {
    logger.error({
      type: 'external_api',
      service,
      method,
      endpoint,
      duration,
      error: error.message,
    }, `External API call failed: ${service}`);
  } else {
    logger.info({
      type: 'external_api',
      service,
      method,
      endpoint,
      duration,
      statusCode,
    }, `External API call: ${service} ${method} ${endpoint}`);
  }
}

/**
 * User action logger
 * For tracking important user actions
 */
export function logUserAction(
  userId: string,
  action: string,
  details?: Record<string, any>
) {
  logger.info({
    type: 'user_action',
    userId,
    action,
    ...details,
  }, `User action: ${action}`);
}

/**
 * Sanitize data before logging
 * Additional layer of protection
 */
export function sanitizeForLog(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    // Remove potential PII patterns
    return data
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
      .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CARD]') // Credit card
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]'); // Email (optional)
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForLog);
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys entirely
      if (/password|token|secret|key|apikey/i.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLog(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Development-only logger
 * Completely disabled in production
 */
export const devLogger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(args, 'DEV');
    }
  },
  error: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      logger.error(args, 'DEV ERROR');
    }
  },
};

export default logger;
