const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogContext = Record<string, unknown>;

const levelWeights: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const resolvedLevel = normalizeLevel(process.env.LOG_LEVEL as LogLevel | undefined);
const isDevelopment = process.env.NODE_ENV === 'development';
const loggerCache = new Map<string, Logger>();

type ConsoleMethod = (...data: unknown[]) => void;

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (scope: string) => Logger;
}

export function getLogger(namespace: string = 'app'): Logger {
  if (loggerCache.has(namespace)) {
    return loggerCache.get(namespace)!;
  }

  const logger: Logger = {
    debug: (message, context) => logMessage('debug', namespace, message, context),
    info: (message, context) => logMessage('info', namespace, message, context),
    warn: (message, context) => logMessage('warn', namespace, message, context),
    error: (message, context) => logMessage('error', namespace, message, context),
    child: (scope: string) => getLogger(`${namespace}:${scope}`),
  };

  loggerCache.set(namespace, logger);
  return logger;
}

function logMessage(level: LogLevel, namespace: string, message: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const method = getConsoleMethod(level);
  const timestamp = new Date().toISOString();
  const payload = buildPayload(namespace, message, context);

  if (Object.keys(payload).length > 0) {
    method(`[${timestamp}] [${namespace}] ${message}`, payload);
  } else {
    method(`[${timestamp}] [${namespace}] ${message}`);
  }
}

function getConsoleMethod(level: LogLevel): ConsoleMethod {
  switch (level) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    case 'info':
      return console.info;
    default:
      return console.debug;
  }
}

function shouldLog(level: LogLevel): boolean {
  if (level === 'debug' && !isDevelopment && process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS !== 'true') {
    return false;
  }
  return levelWeights[level] <= levelWeights[resolvedLevel];
}

function normalizeLevel(level?: LogLevel): LogLevel {
  if (!level || !LOG_LEVELS.includes(level)) {
    return isDevelopment ? 'debug' : 'info';
  }
  return level;
}

function buildPayload(namespace: string, message: string, context?: LogContext): Record<string, unknown> {
  if (!context) {
    return {};
  }

  const entries = Object.entries(context)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => [key, serializeValue(value)]);

  return entries.length > 0 ? Object.fromEntries(entries) : {};
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(item => serializeValue(item));
  }

  if (value && typeof value === 'object') {
    const plainObject: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      plainObject[key] = serializeValue(val);
    }
    return plainObject;
  }

  return value;
}
