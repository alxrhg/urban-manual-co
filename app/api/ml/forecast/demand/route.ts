/**
 * ML Service Proxy - Demand Forecast
 *
 * Proxies requests to the Python ML microservice for demand forecasting.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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
      console.debug('[ML Forecast Demand] ML service not configured or using localhost, returning empty results');
      return NextResponse.json(
        {
          error: 'ML forecast service is not configured',
          fallback: true,
        },
        { status: 200 }
      );
    }
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const destinationId = searchParams.get('destination_id');
    const periods = searchParams.get('periods') || '30';

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    // Call ML service
    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/forecast/demand/${destinationId}?periods=${periods}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      console.warn('[ML Forecast Demand] Service error:', mlResponse.status, mlResponse.statusText);
      // Return 200 with empty results instead of 503 to prevent breaking the UI
      return NextResponse.json(
        {
          error: 'ML forecast service unavailable',
          fallback: true
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
      console.warn('[ML Forecast Demand] Connection error (ML service unavailable):', error?.message || error?.cause?.message);
    } else {
      console.error('[ML Forecast Demand] Error:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Return 200 with empty results instead of 500 to prevent breaking the UI
    return NextResponse.json(
      {
        error: 'Failed to fetch demand forecast',
        fallback: true
      },
      { status: 200 }
    );
  }
}
