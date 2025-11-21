/**
 * ML Service Proxy - Trending Destinations
 *
 * Proxies requests to the Python ML microservice for trending destinations
 * based on demand forecasting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSilent, logWarn, logError } from '@/lib/utils/logger';

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
      // Silent - this is expected behavior when ML service is not configured
      logSilent('[ML Forecast] ML service not configured, returning empty results');
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
      logWarn('[ML Forecast] Service error', { status: mlResponse.status, statusText: mlResponse.statusText });
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

  } catch (error: any) {
    // Handle connection errors gracefully (especially localhost in production)
    const isConnectionError = 
      error?.message?.includes('fetch failed') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.cause?.code === 'ECONNREFUSED';
    
    if (isConnectionError) {
      // Silent - expected when ML service is not available
      logSilent('[ML Forecast] Connection error (ML service unavailable)');
    } else {
      logWarn('[ML Forecast] Error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
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
