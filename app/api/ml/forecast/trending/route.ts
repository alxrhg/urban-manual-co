/**
 * ML Service Proxy - Trending Destinations
 *
 * Proxies requests to the Python ML microservice for trending destinations
 * based on demand forecasting.
 */

import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Check if ML service is configured
    if (!ML_SERVICE_URL || ML_SERVICE_URL === 'http://localhost:8000') {
      // ML service not configured - return empty results (expected behavior)
      console.debug('[ML Forecast] ML service not configured, returning empty results');
      return NextResponse.json(
        {
          trending: [],
          total: 0,
          fallback: true,
          message: 'ML forecast service is not configured',
        },
        { status: 200 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const topN = searchParams.get('top_n') || '20';
    const forecastDays = searchParams.get('forecast_days') || '7';

    // Call ML service
    const mlResponse = await fetch(
      `${ML_SERVICE_URL}/api/forecast/trending?top_n=${topN}&forecast_days=${forecastDays}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!mlResponse.ok) {
      console.warn('[ML Forecast] Service error:', mlResponse.status, mlResponse.statusText);
      // Return 200 with empty results instead of 503 to prevent breaking the UI
      return NextResponse.json(
        {
          trending: [],
          total: 0,
          fallback: true,
          message: 'ML forecast service unavailable',
        },
        { status: 200 }
      );
    }

    const data = await mlResponse.json();

    return NextResponse.json(data);

  } catch (error) {
    console.warn('[ML Forecast] Error:', error instanceof Error ? error.message : 'Unknown error');
    // Return 200 with empty results instead of 500 to prevent breaking the UI
    return NextResponse.json(
      {
        trending: [],
        total: 0,
        fallback: true,
        message: 'Failed to fetch trending destinations',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      },
      { status: 200 }
    );
  }
}
