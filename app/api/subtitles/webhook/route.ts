/**
 * Supabase Webhook Receiver for Subtitle Generation
 *
 * POST /api/subtitles/webhook
 *
 * Receives webhooks from Supabase when new destinations are inserted.
 * Automatically triggers subtitle generation for new destinations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createSuccessResponse } from '@/lib/errors';
import type { SubtitleWebhookPayload } from '@/types/subtitle';

/**
 * Verify Supabase webhook signature
 * In production, you should implement proper HMAC verification
 */
function verifyWebhookSignature(request: NextRequest): boolean {
  const signature = request.headers.get('x-supabase-signature');
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;

  // If no secret configured, check for signature presence only
  if (!secret) {
    console.warn('[Webhook] SUPABASE_WEBHOOK_SECRET not configured - using basic verification');
    return !!signature;
  }

  // TODO: Implement proper HMAC verification for production
  // For now, we check if the signature matches the secret
  return signature === secret;
}

/**
 * Get the base URL for internal API calls
 */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  return 'http://localhost:3000';
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Verify webhook signature
  if (!verifyWebhookSignature(request)) {
    console.error('[Webhook] Invalid or missing signature');
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const payload: SubtitleWebhookPayload = await request.json();

  console.log(`[Webhook] Received: ${payload.type} on ${payload.table}`);

  // Only process INSERT events for destinations table
  if (payload.table !== 'destinations') {
    return createSuccessResponse({
      message: `Ignoring event on table: ${payload.table}`,
      processed: false,
    });
  }

  if (payload.type !== 'INSERT') {
    return createSuccessResponse({
      message: `Ignoring ${payload.type} event`,
      processed: false,
    });
  }

  const destination = payload.record;

  // Skip if already has subtitle
  if (destination.subtitle) {
    return createSuccessResponse({
      message: 'Destination already has subtitle',
      processed: false,
      subtitle: destination.subtitle,
    });
  }

  console.log(`[Webhook] New destination detected: ${destination.name} (${destination.slug || destination.id})`);

  // Call the subtitle generator API
  const baseUrl = getBaseUrl();
  const apiSecret = process.env.SUBTITLE_API_SECRET;

  if (!apiSecret) {
    console.error('[Webhook] SUBTITLE_API_SECRET not configured');
    return NextResponse.json(
      { success: false, error: 'API secret not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${baseUrl}/api/subtitles/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiSecret}`,
      },
      body: JSON.stringify({
        destinationId: destination.slug || destination.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Webhook] Error from subtitle generator:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to generate subtitle: ${errorData.error || response.statusText}`,
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`[Webhook] Subtitle generated for ${destination.name}: "${result.data?.subtitle}"`);

    return createSuccessResponse({
      message: `Subtitle generated: "${result.data?.subtitle}"`,
      processed: true,
      destinationId: destination.slug || destination.id,
      subtitle: result.data?.subtitle,
    });
  } catch (error) {
    console.error('[Webhook] Failed to call subtitle generator:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
