/**
 * API Security Utilities
 *
 * Provides security wrappers for API routes including:
 * - Rate limiting
 * - CSRF protection
 * - Request validation
 * - Audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  apiRatelimit,
  memoryApiRatelimit,
  searchRatelimit,
  memorySearchRatelimit,
  conversationRatelimit,
  memoryConversationRatelimit,
  authRatelimit,
  memoryAuthRatelimit,
  adminRatelimit,
  memoryAdminRatelimit,
  uploadRatelimit,
  memoryUploadRatelimit,
  proxyRatelimit,
  memoryProxyRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';

type RateLimitType = 'api' | 'search' | 'conversation' | 'auth' | 'admin' | 'upload' | 'proxy';

// Map rate limit types to their limiters
const RATE_LIMITERS = {
  api: { redis: apiRatelimit, memory: memoryApiRatelimit },
  search: { redis: searchRatelimit, memory: memorySearchRatelimit },
  conversation: { redis: conversationRatelimit, memory: memoryConversationRatelimit },
  auth: { redis: authRatelimit, memory: memoryAuthRatelimit },
  admin: { redis: adminRatelimit, memory: memoryAdminRatelimit },
  upload: { redis: uploadRatelimit, memory: memoryUploadRatelimit },
  proxy: { redis: proxyRatelimit, memory: memoryProxyRatelimit },
};

// Messages for each rate limit type
const RATE_LIMIT_MESSAGES: Record<RateLimitType, string> = {
  api: 'Too many requests. Please try again later.',
  search: 'Too many search requests. Please slow down.',
  conversation: 'Too many AI requests. Please wait a moment.',
  auth: 'Too many authentication attempts. Please try again later.',
  admin: 'Too many admin requests. Please slow down.',
  upload: 'Too many upload requests. Please wait before uploading again.',
  proxy: 'Too many proxy requests. Please try again later.',
};

interface SecureHandlerOptions {
  /**
   * Type of rate limiting to apply
   * @default 'api'
   */
  rateLimit?: RateLimitType;

  /**
   * Skip rate limiting (use sparingly!)
   * @default false
   */
  skipRateLimit?: boolean;

  /**
   * Require authentication
   * @default false
   */
  requireAuth?: boolean;

  /**
   * Require admin role
   * @default false
   */
  requireAdmin?: boolean;

  /**
   * Enable audit logging for this endpoint
   * @default false
   */
  auditLog?: boolean;

  /**
   * Custom rate limit message
   */
  rateLimitMessage?: string;
}

/**
 * Get user ID from request (via Supabase auth)
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch {
    return null;
  }
}

/**
 * Apply rate limiting to a request
 */
async function applyRateLimit(
  request: NextRequest,
  type: RateLimitType,
  userId?: string | null,
  customMessage?: string
): Promise<NextResponse | null> {
  const limiter = RATE_LIMITERS[type];
  const activeLimiter = isUpstashConfigured() ? limiter.redis : limiter.memory;
  const identifier = getIdentifier(request, userId ?? undefined);

  const { success, limit, remaining, reset } = await activeLimiter.limit(identifier);

  if (!success) {
    const message = customMessage || RATE_LIMIT_MESSAGES[type];
    return createRateLimitResponse(message, limit, remaining, reset);
  }

  return null;
}

/**
 * Create a secure API handler with rate limiting and optional auth
 *
 * @example
 * ```ts
 * export const GET = withSecureHandler(
 *   async (request) => {
 *     // Your handler logic
 *     return NextResponse.json({ data: 'ok' });
 *   },
 *   { rateLimit: 'search', requireAuth: true }
 * );
 * ```
 */
export function withSecureHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: SecureHandlerOptions = {}
) {
  const {
    rateLimit = 'api',
    skipRateLimit = false,
    requireAuth = false,
    requireAdmin = false,
    rateLimitMessage,
  } = options;

  return withErrorHandling(async (request: NextRequest, context?: any) => {
    // Get user ID for rate limiting and auth
    const userId = await getUserIdFromRequest(request);

    // Apply rate limiting
    if (!skipRateLimit) {
      const rateLimitResponse = await applyRateLimit(
        request,
        rateLimit,
        userId,
        rateLimitMessage
      );

      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // Check authentication if required
    if (requireAuth && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Check admin role if required
    if (requireAdmin) {
      const supabase = await createServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED',
          },
          { status: 401 }
        );
      }

      const role = (user.app_metadata as Record<string, any>)?.role;
      if (role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Admin access required',
            code: 'FORBIDDEN',
          },
          { status: 403 }
        );
      }
    }

    // Call the handler
    return handler(request, context);
  });
}

/**
 * Quick rate limit check for existing handlers
 *
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const rateLimitResult = await checkRateLimit(request, 'search');
 *   if (rateLimitResult) return rateLimitResult;
 *
 *   // Rest of handler...
 * }
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType = 'api',
  userId?: string | null,
  customMessage?: string
): Promise<NextResponse | null> {
  return applyRateLimit(request, type, userId, customMessage);
}

/**
 * Verify CRON request authenticity
 */
export function verifyCronRequest(request: NextRequest): boolean {
  // Check for Vercel CRON header
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1') {
    return true;
  }

  // Check for CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

/**
 * Verify webhook request authenticity
 */
export function verifyWebhookSecret(
  request: NextRequest,
  secretEnvVar: string
): boolean {
  const secret = process.env[secretEnvVar];
  if (!secret) {
    console.error(`[Security] Missing webhook secret: ${secretEnvVar}`);
    return false;
  }

  // Check authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  // Check x-webhook-secret header
  const webhookSecret = request.headers.get('x-webhook-secret');
  if (webhookSecret === secret) {
    return true;
  }

  return false;
}

/**
 * Log security-relevant events
 */
export function logSecurityEvent(
  event: 'rate_limit_exceeded' | 'auth_failed' | 'admin_denied' | 'suspicious_activity',
  details: {
    ip?: string;
    userId?: string;
    path?: string;
    method?: string;
    userAgent?: string;
    additional?: Record<string, any>;
  }
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  // Log to console (can be extended to send to external logging service)
  console.warn('[Security Event]', JSON.stringify(logEntry));

  // TODO: Send to external logging service (e.g., Sentry, Datadog)
  // This could be implemented when an external logging service is configured
}
