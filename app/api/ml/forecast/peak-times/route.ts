/**
 * ML Service Proxy - Peak Times
 *
 * Proxies requests to the Python ML microservice for peak time analysis.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Track if we've already warned about ML service configuration
let hasWarnedAboutMLService = false;

/**
 * Check if ML service URL is a localhost/development URL
 * These won't work in production
 */
function isLocalhostUrl(url: string): boolean {
  if (!url) return true;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('localhost') ||
    lowerUrl.includes('127.0.0.1') ||
    lowerUrl.includes('0.0.0.0') ||
    lowerUrl.startsWith('http://localhost') ||
    lowerUrl.startsWith('http://127.0.0.1')
  );
}

export async function GET(request: NextRequest) {
  try {
    // Check if ML service is configured and not localhost
    if (!ML_SERVICE_URL || isLocalhostUrl(ML_SERVICE_URL)) {
      // Only log once per process and only in development
      if (!hasWarnedAboutMLService && process.env.NODE_ENV === 'development') {
        console.info('[ML Forecast Peak Times] ML service not configured, using fallback (expected behavior)');
        hasWarnedAboutMLService = true;
      }
      return NextResponse.json(
        {
          error: 'ML forecast service is not configured',
          fallback: true,
          peak_date: null,
          low_date: null,
          recommendation: null,
        },
        { status: 200 }
      );
    }
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const forecastDays = searchParams.get('forecast_days') || '30';

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    // Call ML service
    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/forecast/peak-times/${destinationId}?forecast_days=${forecastDays}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      console.warn('[ML Forecast Peak Times] Service error:', mlResponse.status, mlResponse.statusText);
      // Return 200 with empty results instead of 503 to prevent breaking the UI
      return NextResponse.json(
        {
          error: 'ML peak times service unavailable',
          fallback: true,
          peak_date: null,
          low_date: null,
          recommendation: null,
        },
        { status: 200 }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error: any) {
    // Handle connection errors gracefully (especially localhost in production)
    const isConnectionError = 
      error?.message?.includes('fetch failed') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.cause?.code === 'ECONNREFUSED';
    
    if (isConnectionError) {
      console.warn('[ML Forecast Peak Times] Connection error (ML service unavailable):', error?.message || error?.cause?.message);
    } else {
      console.error('[ML Forecast Peak Times] Error:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Return 200 with empty results instead of 500 to prevent breaking the UI
    return NextResponse.json(
      {
        error: 'Failed to fetch peak times',
        fallback: true,
        peak_date: null,
        low_date: null,
        recommendation: null,
      },
      { status: 200 }
    );
  }
}
