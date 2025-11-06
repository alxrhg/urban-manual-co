/**
 * Database Logger Transport
 *
 * Writes important logs to Supabase database for viewing in admin panel
 * Only logs warn, error, and fatal levels to avoid database bloat
 */

import { createServiceRoleClient } from './supabase-server';

interface LogEntry {
  level: string;
  type?: string;
  message: string;
  user_id?: string;
  context?: any;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

// Only store these log levels in database (to save space)
const LEVELS_TO_STORE = ['warn', 'error', 'fatal'];

// Only store these log types (to reduce noise)
const TYPES_TO_STORE = [
  'security',
  'rate_limit',
  'error',
  'upload',
  'authentication',
  'authorization'
];

/**
 * Write log entry to database
 * Called by the logger for important events
 */
export async function writeLogToDatabase(logEntry: LogEntry): Promise<void> {
  try {
    // Only store important logs (warn, error, fatal)
    if (!LEVELS_TO_STORE.includes(logEntry.level)) {
      return;
    }

    // Only store relevant types (if type is specified)
    if (logEntry.type && !TYPES_TO_STORE.includes(logEntry.type)) {
      return;
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      console.error('[Database Logger] Service role client not available');
      return;
    }

    // Sanitize context to prevent storing sensitive data
    const sanitizedContext = sanitizeContext(logEntry.context);

    const { error } = await supabase
      .from('logs')
      .insert({
        level: logEntry.level,
        type: logEntry.type || 'general',
        message: logEntry.message,
        user_id: logEntry.user_id || null,
        context: sanitizedContext,
        error: logEntry.error || null,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      // Don't throw - logging should never break the app
      console.error('[Database Logger] Failed to write log:', error);
    }
  } catch (err) {
    // Silent fail - logging should never break the app
    console.error('[Database Logger] Exception:', err);
  }
}

/**
 * Sanitize context to remove sensitive data before storing
 */
function sanitizeContext(context: any): any {
  if (!context) return null;

  // Create a copy
  const sanitized = JSON.parse(JSON.stringify(context));

  // Remove sensitive fields
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'cookie',
    'accessToken',
    'refreshToken',
    'privateKey',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_AI_API_KEY',
  ];

  function removeSensitive(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        removeSensitive(obj[key]);
      }
    }
  }

  removeSensitive(sanitized);
  return sanitized;
}

/**
 * Batch write logs (for better performance)
 * Collects logs in memory and writes them in batches
 */
class LogBatcher {
  private batch: LogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Start flush timer
    this.startTimer();
  }

  add(logEntry: LogEntry): void {
    this.batch.push(logEntry);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const logsToWrite = [...this.batch];
    this.batch = [];

    try {
      const supabase = createServiceRoleClient();
      if (!supabase) return;

      const entries = logsToWrite.map(log => ({
        level: log.level,
        type: log.type || 'general',
        message: log.message,
        user_id: log.user_id || null,
        context: sanitizeContext(log.context),
        error: log.error || null,
        timestamp: new Date().toISOString(),
      }));

      await supabase.from('logs').insert(entries);
    } catch (err) {
      console.error('[Log Batcher] Flush failed:', err);
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush(); // Flush remaining logs
  }
}

// Singleton batcher instance
export const logBatcher = new LogBatcher();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    logBatcher.destroy();
  });
}
