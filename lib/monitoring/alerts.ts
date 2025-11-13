import { NextRequest } from 'next/server';
import { getLogger } from '@/lib/logger';
import { captureException, captureMessage, type SentryLevel, serializeError } from './sentry';

export type MonitoredService = 'auth' | 'ai' | 'search';
export type AlertSeverity = 'info' | 'warning' | 'error';

const serviceWebhookMap: Record<MonitoredService, string | undefined> = {
  auth: process.env.VERCEL_ALERT_WEBHOOK_AUTH,
  ai: process.env.VERCEL_ALERT_WEBHOOK_AI,
  search: process.env.VERCEL_ALERT_WEBHOOK_SEARCH,
};

const fallbackWebhook = process.env.VERCEL_ALERT_WEBHOOK_URL;

interface AnomalyOptions {
  service: MonitoredService;
  message: string;
  severity?: AlertSeverity;
  error?: unknown;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export async function notifyAnomaly(options: AnomalyOptions): Promise<void> {
  const severity = options.severity || 'error';
  const metadata = options.metadata || {};
  const logger = getLogger(`monitoring:${options.service}`);
  const tags = { service: options.service, severity, ...options.tags };

  if (options.error) {
    logger.error(options.message, { ...metadata, error: serializeError(options.error) });
    await captureException(options.error, {
      level: mapSeverityToSentryLevel(severity),
      tags,
      extra: metadata,
    });
  } else if (severity === 'warning') {
    logger.warn(options.message, metadata);
    await captureMessage(options.message, {
      level: mapSeverityToSentryLevel(severity),
      tags,
      extra: metadata,
    });
  } else {
    logger.info(options.message, metadata);
    await captureMessage(options.message, {
      level: mapSeverityToSentryLevel(severity),
      tags,
      extra: metadata,
    });
  }

  const webhookUrl = serviceWebhookMap[options.service] || fallbackWebhook;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: options.service,
        severity,
        message: options.message,
        metadata,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    logger.warn('Failed to dispatch Vercel webhook alert', { error: serializeError(error) });
  }
}

export function withMonitoredRoute<Context = unknown>(
  handler: (req: NextRequest, context?: Context) => Promise<Response>,
  options: { service: MonitoredService; name: string }
) {
  const logger = getLogger(options.name);
  return async (req: NextRequest, context?: Context): Promise<Response> => {
    const start = Date.now();
    try {
      const response = await handler(req, context);
      if (response.status >= 500) {
        await notifyAnomaly({
          service: options.service,
          message: `${options.name} returned ${response.status}`,
          severity: 'error',
          metadata: buildMetadata(req, response.status, start),
        });
      } else if (response.status >= 400) {
        logger.warn(`${options.name} returned ${response.status}`, buildMetadata(req, response.status, start));
      }
      return response;
    } catch (error) {
      await notifyAnomaly({
        service: options.service,
        message: `${options.name} crashed`,
        severity: 'error',
        error,
        metadata: buildMetadata(req, undefined, start),
      });
      throw error;
    }
  };
}

function buildMetadata(req: NextRequest, status?: number, start?: number) {
  return {
    method: req.method,
    path: req.nextUrl?.pathname,
    status,
    durationMs: typeof start === 'number' ? Date.now() - start : undefined,
  };
}

function mapSeverityToSentryLevel(severity: AlertSeverity): SentryLevel {
  switch (severity) {
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'error';
  }
}
