/**
 * ML Service Proxy - Trending Destinations
 *
 * Proxies requests to the Python ML microservice for trending destinations
 * based on demand forecasting.
 */

import { NextRequest, NextResponse } from 'next/server';

function resolveMlServiceUrl() {
  const mlServiceUrl = process.env.ML_SERVICE_URL;

  if (!mlServiceUrl) {
    // In local development, a missing URL is a configuration error.
    // In production, it means the service is intentionally not configured.
    if (process.env.NODE_ENV === 'development') {
      console.warn('Warning: ML_SERVICE_URL is not set. ML forecast API will be disabled.');
    }
    return null;
  }

  // Basic validation to catch common errors
  try {
    const url = new URL(mlServiceUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.error(`Invalid protocol for ML_SERVICE_URL: ${url.protocol}`);
      return null;
    }
  } catch (e) {
    console.error(`Invalid ML_SERVICE_URL: ${mlServiceUrl}`);
    return null;
  }

  return mlServiceUrl;
}

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export async function GET(request: NextRequest) {
  const mlTimeout = process.env.ML_SERVICE_TIMEOUT_MS ? parseInt(process.env.ML_SERVICE_TIMEOUT_MS, 10) : 5000;

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const topN = searchParams.get('top_n') || '20';
    const forecastDays = searchParams.get('forecast_days') || '7';

    const baseUrl = resolveMlServiceUrl();

    if (!baseUrl) {
      console.info('[ML Forecast API] ML service URL is not configured - returning fallback response');
      return NextResponse.json(
        {
          error: 'ML service is not configured',
          fallback: true,
          trending: [],
        },
        { status: 503 }
      );
    }

    // Call ML service
    const targetUrl = `${normalizeBaseUrl(baseUrl)}/api/forecast/trending?top_n=${topN}&forecast_days=${forecastDays}`;
    const mlResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(mlTimeout),
    });

    if (!mlResponse.ok) {
      const errorBody = await mlResponse.text();
      console.error(`ML forecast service error (${mlResponse.status}): ${errorBody}`);

      return NextResponse.json(
        {
          error: `ML forecast service error: ${mlResponse.statusText}`,
          fallback: true,
          trending: [],
          details: errorBody,
        },
        { status: mlResponse.status }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('ML forecast request timed out');
      return NextResponse.json(
        {
          error: 'Request to ML service timed out',
          fallback: true,
          trending: [],
        },
        { status: 504 } // Gateway Timeout
      );
    }
    
    console.error('ML forecast error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch trending destinations',
        fallback: true,
        trending: [],
      },
      { status: 500 }
    );
  }
}
