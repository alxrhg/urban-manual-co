/**
 * API route error handling wrapper
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, handleSupabaseError } from './handlers';
import { CustomError } from './types';
import { getLogger } from '@/lib/logger';
import { notifyAnomaly, type MonitoredService } from '@/lib/monitoring/alerts';

type ErrorHandlingOptions = {
  service?: MonitoredService;
  operation?: string;
};

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: ErrorHandlingOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const logger = getLogger(options.operation ? `api:${options.operation}` : 'api:error-handler');
    try {
      return await handler(req, context);
    } catch (error) {
      logger.error('API route error', {
        error,
        path: req.nextUrl?.pathname,
        method: req.method,
      });

      if (options.service) {
        await notifyAnomaly({
          service: options.service,
          message: options.operation ? `${options.operation} failed` : 'API route failure',
          severity: 'error',
          error,
          metadata: {
            path: req.nextUrl?.pathname,
            method: req.method,
          },
        });
      }

      // Handle Supabase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = handleSupabaseError(error);
        return createErrorResponse(supabaseError);
      }

      // Handle CustomError
      if (error instanceof CustomError) {
        return createErrorResponse(error);
      }

      // Handle other errors
      return createErrorResponse(error);
    }
  };
}

/**
 * Handle async errors in API routes
 */
export async function handleApiError(
  fn: () => Promise<NextResponse>,
  options: ErrorHandlingOptions = {}
): Promise<NextResponse> {
  const logger = getLogger(options.operation ? `api:${options.operation}` : 'api:error-handler');
  try {
    return await fn();
  } catch (error) {
    logger.error('API helper error', { error });
    if (options.service) {
      await notifyAnomaly({
        service: options.service,
        message: options.operation ? `${options.operation} failed` : 'API helper error',
        severity: 'error',
        error,
        metadata: options.operation ? { operation: options.operation } : undefined,
      });
    }
    return createErrorResponse(error);
  }
}

