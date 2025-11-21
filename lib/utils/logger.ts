/**
 * Centralized logging utility
 * 
 * Replaces console.log/warn/error with environment-aware logging
 * - Development: All logs shown
 * - Production: Only errors shown, warnings/errors sent to monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true;
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return context ? `${prefix} ${message} ${JSON.stringify(context)}` : `${prefix} ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
      // In production, could send to monitoring service
      if (this.isProduction && typeof window !== 'undefined') {
        // Could integrate with Sentry or other monitoring
      }
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
      console.error(this.formatMessage('error', message, errorContext));
      // In production, send to monitoring service
      if (this.isProduction && typeof window !== 'undefined') {
        // Could integrate with Sentry or other monitoring
      }
    }
  }

  // Silent logging for expected fallbacks (e.g., ML service not configured)
  silent(message: string, context?: LogContext): void {
    // Only log in development
    if (this.isDevelopment) {
      this.debug(message, context);
    }
  }
}

export const logger = new Logger();

// Convenience exports
export const log = logger.info.bind(logger);
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const logSilent = logger.silent.bind(logger);

