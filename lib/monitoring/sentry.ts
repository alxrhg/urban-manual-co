import { getLogger } from '@/lib/logger';

const logger = getLogger('monitoring:sentry');
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '';
const parsedDsn = parseSentryDsn(sentryDsn);
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface CaptureOptions {
  level?: SentryLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
}

export async function captureException(error: unknown, options: CaptureOptions = {}): Promise<void> {
  if (!parsedDsn) {
    return;
  }

  const message = error instanceof Error ? error.message : 'Unknown exception';
  const extra = {
    ...options.extra,
    error: serializeError(error),
  };

  await sendEvent({
    message,
    level: options.level || 'error',
    tags: options.tags,
    extra,
    fingerprint: options.fingerprint,
  });
}

export async function captureMessage(message: string, options: CaptureOptions = {}): Promise<void> {
  if (!parsedDsn) {
    return;
  }

  await sendEvent({
    message,
    level: options.level || 'info',
    tags: options.tags,
    extra: options.extra,
    fingerprint: options.fingerprint,
  });
}

async function sendEvent(event: {
  message: string;
  level: SentryLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
}): Promise<void> {
  if (!parsedDsn) {
    return;
  }

  const payload = {
    event_id: generateEventId(),
    message: event.message,
    level: event.level,
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    environment: sentryEnvironment,
    tags: event.tags,
    extra: event.extra,
    fingerprint: event.fingerprint,
  };

  try {
    await fetch(parsedDsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': buildAuthHeader(parsedDsn.publicKey),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.debug('Failed to send event to Sentry', { error: serializeError(error) });
  }
}

function buildAuthHeader(publicKey: string): string {
  const client = 'urban-manual-monitor/1.0';
  return `Sentry sentry_version=7, sentry_client=${client}, sentry_key=${publicKey}`;
}

function parseSentryDsn(dsn: string | undefined) {
  if (!dsn) {
    logger.debug('Sentry DSN not configured; monitoring is disabled');
    return null;
  }

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace('/', '');
    if (!projectId) {
      throw new Error('Missing project id');
    }

    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      publicKey: url.username,
    };
  } catch (error) {
    logger.warn('Invalid Sentry DSN configured', { error: serializeError(error) });
    return null;
  }
}

function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error && typeof error === 'object') {
    return Object.fromEntries(Object.entries(error as Record<string, unknown>));
  }

  return { message: String(error) };
}
