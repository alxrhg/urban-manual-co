import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  createValidationError,
  createNotFoundError,
} from '@/lib/errors';
import {
  proxyRatelimit,
  memoryProxyRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting for external API proxy
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many photo requests. Please try again later.',
    limiter: proxyRatelimit,
    memoryLimiter: memoryProxyRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const searchParams = request.nextUrl.searchParams;
  const photoName = searchParams.get('name');
  const maxWidth = searchParams.get('maxWidth') || '800';

  if (!photoName) {
    throw createValidationError('Photo name is required');
  }

  if (!GOOGLE_API_KEY) {
    throw createValidationError('Google API key not configured');
  }

  // Fetch photo from Google Places API (New)
  const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}`;

  const response = await fetch(photoUrl, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
    },
  });

  if (!response.ok) {
    console.error('[Google Places Photo] API error:', response.status);
    throw createNotFoundError('Photo');
  }

  // Get the image data
  const imageBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  // Return the image with proper headers (binary response, not JSON)
  return new NextResponse(imageBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
})
